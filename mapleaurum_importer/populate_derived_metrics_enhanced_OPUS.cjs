// populate_derived_metrics_enhanced.cjs
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const winston = require('winston');
const path = require('path');
const fs = require('fs');

// --- Configuration ---
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const LOG_DIR = path.resolve(__dirname, 'logs_derived_metrics_calculator');
const LOCK_FILE = path.join(__dirname, 'populate_derived_metrics.lock');
const LOCK_FILE_TIMEOUT = 2 * 60 * 60 * 1000; // 2 hours
const LOG_PROGRESS_INTERVAL = 50;
const BATCH_UPDATE_SIZE = 50;

// Data quality thresholds
const MAX_REASONABLE_PE_RATIO = 1000; // P/E ratios above this are likely errors
const MAX_REASONABLE_EV_MULTIPLE = 100; // EV/Revenue or EV/EBITDA above this are suspicious
const MIN_REASONABLE_RATIO = -1000; // Negative ratios below this are likely errors

let isShuttingDown = false;
let exchangeRatesCache = {};
let supportedCurrencies = new Set();

// Track all updates for reporting
const updateTracker = {
    financials: [],
    valuationMetrics: [],
    errors: [],
    warnings: []
};

try {
    if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
} catch (err) { console.error(`FATAL: Error creating log directory ${LOG_DIR}:`, err); process.exit(1); }

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
        winston.format.errors({ stack: true }),
        winston.format.printf(({ timestamp, level, message, company_id, table, step, ...rest }) => {
            let log = `${timestamp} [${level.toUpperCase()}]`;
            if (company_id) log += ` [CompID: ${company_id}]`;
            if (table) log += ` [Table: ${table}]`;
            if (step) log += ` [Step: ${step}]`;
            log += `: ${message}`;
            const filteredRest = { ...rest };
            delete filteredRest.level; delete filteredRest.message; delete filteredRest.timestamp; delete filteredRest.service;
            if (Object.keys(filteredRest).length > 0 && Object.values(filteredRest).some(v => v !== undefined)) {
                try { log += ` ${JSON.stringify(filteredRest)}`; } catch (e) { /* ignore */ }
            }
            return log;
        })
    ),
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(winston.format.colorize(), winston.format.printf(({ timestamp, level, message, company_id, table, step }) => {
                let log = `${timestamp} [${level}]`;
                if (company_id) log += ` [CompID: ${company_id}]`;
                if (table) log += ` [Table: ${table}]`;
                if (step) log += ` [Step: ${step}]`;
                log += `: ${message}`;
                return log;
            }))
        }),
        new winston.transports.File({ filename: path.join(LOG_DIR, 'derived_metrics_calculator.log'), maxsize: 10485760, maxFiles: 3, tailable: true, level: 'debug' }),
        new winston.transports.File({ filename: path.join(LOG_DIR, 'derived_metrics_calculator_errors.log'), level: 'error', maxsize: 10485760, maxFiles: 3 })
    ],
    exceptionHandlers: [new winston.transports.File({ filename: path.join(LOG_DIR, 'derived_metrics_exceptions.log') })],
    rejectionHandlers: [new winston.transports.File({ filename: path.join(LOG_DIR, 'derived_metrics_rejections.log') })]
});

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    logger.error("Supabase URL or Service Key is missing. Check .env file. Exiting.");
    process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
logger.info("Supabase client initialized for derived metrics calculator.");

// --- Enhanced Utility Functions ---
function isValidFiniteNumber(value) {
    return typeof value === 'number' && !isNaN(value) && isFinite(value);
}

function sanitizeFiniteNumber(value, allowZero = true) {
    if (value === null || value === undefined) return null;
    let num;
    if (typeof value === 'number') { 
        num = value; 
    } else if (typeof value === 'string') {
        const cleaned = value.replace(/[, ]/g, '');
        if (cleaned === '' || cleaned === '-' || cleaned === '.') return null;
        num = parseFloat(cleaned);
    } else if (typeof value === 'object' && value !== null && 'raw' in value && value.raw !== undefined) {
        return sanitizeFiniteNumber(value.raw, allowZero);
    } else { 
        return null; 
    }
    if (!Number.isFinite(num)) return null;
    if (!allowZero && num === 0) return null;
    return num;
}

// Currency normalization (similar to previous script)
const CURRENCY_NORMALIZATIONS = {
    '': 'USD',
    'null': 'USD',
    'undefined': 'USD',
    'NONE': 'USD',
    'N/A': 'USD'
};

function normalizeCurrency(currency, context = '', localLogger = logger) {
    if (!currency) {
        localLogger.debug(`No currency provided in context: ${context}, defaulting to USD`);
        return 'USD';
    }
    
    const currencyStr = String(currency).trim().toUpperCase();
    
    if (CURRENCY_NORMALIZATIONS[currencyStr]) {
        localLogger.debug(`Normalizing currency '${currency}' to '${CURRENCY_NORMALIZATIONS[currencyStr]}' in context: ${context}`);
        return CURRENCY_NORMALIZATIONS[currencyStr];
    }
    
    if (supportedCurrencies.size > 0 && !supportedCurrencies.has(currencyStr)) {
        localLogger.warn(`Unknown currency '${currencyStr}' in context: ${context}, defaulting to USD`);
        return 'USD';
    }
    
    return currencyStr;
}

// Validate calculated ratios are within reasonable ranges
function isReasonableRatio(value, ratioName, localLogger) {
    if (!isValidFiniteNumber(value)) return false;
    
    // Special handling for different ratio types
    if (ratioName.includes('_pe') || ratioName.includes('price_to_')) {
        if (value > MAX_REASONABLE_PE_RATIO || value < MIN_REASONABLE_RATIO) {
            localLogger.warn(`${ratioName} value ${value} is outside reasonable range [${MIN_REASONABLE_RATIO}, ${MAX_REASONABLE_PE_RATIO}]`);
            return false;
        }
    } else if (ratioName.includes('enterprise_to_')) {
        if (value > MAX_REASONABLE_EV_MULTIPLE || value < MIN_REASONABLE_RATIO) {
            localLogger.warn(`${ratioName} value ${value} is outside reasonable range [${MIN_REASONABLE_RATIO}, ${MAX_REASONABLE_EV_MULTIPLE}]`);
            return false;
        }
    }
    
    return true;
}

// --- Exchange Rate Functions ---
async function loadExchangeRates() {
    logger.info('Loading exchange rates from Supabase `exchange_rates` table...', { step: 'LOAD_EXCHANGE_RATES' });
    try {
        const { data: rates, error } = await supabase.from('exchange_rates').select('from_currency, to_currency, rate');
        if (error) throw error;
        
        exchangeRatesCache = {};
        supportedCurrencies.clear();
        
        rates.forEach(row => {
            if (row.from_currency && row.to_currency && isValidFiniteNumber(row.rate)) {
                const from = row.from_currency.toUpperCase();
                const to = row.to_currency.toUpperCase();
                
                if (!exchangeRatesCache[from]) exchangeRatesCache[from] = {};
                exchangeRatesCache[from][to] = row.rate;
                
                supportedCurrencies.add(from);
                supportedCurrencies.add(to);
            }
        });
        
        logger.info(`Loaded ${rates.length} exchange rates. Supported currencies: ${Array.from(supportedCurrencies).join(', ')}`);
        
        // Enhanced fallback rates
        const fallbackRates = {
            'CAD': { 'USD': 0.73, 'EUR': 0.68, 'GBP': 0.58 },
            'AUD': { 'USD': 0.66, 'EUR': 0.61, 'GBP': 0.52 },
            'USD': { 'CAD': 1.37, 'AUD': 1.52, 'EUR': 0.93, 'GBP': 0.79 },
            'GBP': { 'USD': 1.27, 'CAD': 1.74, 'AUD': 1.93, 'EUR': 1.18 },
            'EUR': { 'USD': 1.08, 'CAD': 1.48, 'AUD': 1.64, 'GBP': 0.85 }
        };
        
        let fallbacksAdded = 0;
        for (const [from, toRates] of Object.entries(fallbackRates)) {
            for (const [to, rate] of Object.entries(toRates)) {
                if (!getExchangeRate(from, to)) {
                    logger.warn(`${from}->${to} rate missing from DB, using fallback ${rate}`);
                    if (!exchangeRatesCache[from]) exchangeRatesCache[from] = {};
                    exchangeRatesCache[from][to] = rate;
                    supportedCurrencies.add(from);
                    supportedCurrencies.add(to);
                    fallbacksAdded++;
                }
            }
        }
        
        if (fallbacksAdded > 0) {
            logger.warn(`Added ${fallbacksAdded} fallback exchange rates.`);
        }
    } catch (err) {
        logger.error(`Failed to load exchange rates: ${err.message}`, { stack: err.stack });
        logger.warn('Using comprehensive fallback exchange rates.');
        exchangeRatesCache = {
            'CAD': { 'USD': 0.73, 'EUR': 0.68, 'GBP': 0.58 },
            'AUD': { 'USD': 0.66, 'EUR': 0.61, 'GBP': 0.52 },
            'USD': { 'CAD': 1.37, 'AUD': 1.52, 'EUR': 0.93, 'GBP': 0.79 },
            'EUR': { 'USD': 1.08, 'CAD': 1.48, 'AUD': 1.64, 'GBP': 0.85 },
            'GBP': { 'USD': 1.27, 'CAD': 1.74, 'AUD': 1.93, 'EUR': 1.18 }
        };
        supportedCurrencies = new Set(['CAD', 'AUD', 'USD', 'EUR', 'GBP']);
    }
}

function getExchangeRate(fromCurrency, toCurrency) {
    if (!fromCurrency || !toCurrency) return null;
    const from = String(fromCurrency).toUpperCase();
    const to = String(toCurrency).toUpperCase();
    if (from === to) return 1.0;
    return exchangeRatesCache[from]?.[to] || null;
}

function convertToUSD(value, currency, operationContext = 'Conversion', localLogger = logger) {
    const numericValue = sanitizeFiniteNumber(value);
    if (numericValue === null) {
        localLogger.debug(`${operationContext}: Cannot convert to USD - invalid numeric value: "${value}"`);
        return null;
    }
    
    const normalizedCurrency = normalizeCurrency(currency, operationContext, localLogger);
    
    if (normalizedCurrency === 'USD') return numericValue;
    
    const rate = getExchangeRate(normalizedCurrency, 'USD');
    if (rate === null) {
        localLogger.error(`${operationContext}: Cannot convert ${normalizedCurrency} to USD - Rate not found. Value: ${numericValue}`);
        updateTracker.errors.push({
            company_id: operationContext.match(/C(\d+)/)?.[1],
            error: `Exchange rate ${normalizedCurrency}->USD not found`,
            context: operationContext
        });
        return null;
    }
    
    const convertedValue = numericValue * rate;
    localLogger.debug(`${operationContext}: Converted ${numericValue} ${normalizedCurrency} to ${convertedValue.toFixed(2)} USD (rate: ${rate})`);
    return convertedValue;
}

// --- Enhanced Ratio Calculation Definitions ---
const financialRatioCalculators = {
    // Basic valuation ratios
    price_to_sales: (fin, localLogger) => {
        if (fin.price_to_sales !== null && fin.price_to_sales !== undefined) return null;
        if (isValidFiniteNumber(fin.market_cap_value) && isValidFiniteNumber(fin.revenue_value) && fin.revenue_value > 0) {
            const ratio = fin.market_cap_value / fin.revenue_value;
            localLogger.debug(`Calculated price_to_sales: ${fin.market_cap_value} / ${fin.revenue_value} = ${ratio.toFixed(2)}`);
            return ratio;
        }
        return null;
    },
    
    enterprise_to_revenue: (fin, localLogger) => {
        if (fin.enterprise_to_revenue !== null && fin.enterprise_to_revenue !== undefined) return null;
        if (isValidFiniteNumber(fin.enterprise_value_value) && isValidFiniteNumber(fin.revenue_value) && fin.revenue_value > 0) {
            const ratio = fin.enterprise_value_value / fin.revenue_value;
            localLogger.debug(`Calculated enterprise_to_revenue: ${fin.enterprise_value_value} / ${fin.revenue_value} = ${ratio.toFixed(2)}`);
            return ratio;
        }
        return null;
    },
    
    enterprise_to_ebitda: (fin, localLogger) => {
        if (fin.enterprise_to_ebitda !== null && fin.enterprise_to_ebitda !== undefined) return null;
        if (isValidFiniteNumber(fin.enterprise_value_value) && isValidFiniteNumber(fin.ebitda) && fin.ebitda > 0) {
            const ratio = fin.enterprise_value_value / fin.ebitda;
            localLogger.debug(`Calculated enterprise_to_ebitda: ${fin.enterprise_value_value} / ${fin.ebitda} = ${ratio.toFixed(2)}`);
            return ratio;
        }
        return null;
    },
    
    // Additional financial ratios
    trailing_pe: (fin, localLogger) => {
        if (fin.trailing_pe !== null && fin.trailing_pe !== undefined) return null;
        if (isValidFiniteNumber(fin.market_cap_value) && isValidFiniteNumber(fin.net_income_value) && fin.net_income_value > 0) {
            const ratio = fin.market_cap_value / fin.net_income_value;
            localLogger.debug(`Calculated trailing_pe: ${fin.market_cap_value} / ${fin.net_income_value} = ${ratio.toFixed(2)}`);
            return ratio;
        }
        return null;
    },
    
    price_to_book: (fin, localLogger) => {
        if (fin.price_to_book !== null && fin.price_to_book !== undefined) return null;
        // Calculate book value: total assets - total liabilities
        if (isValidFiniteNumber(fin.market_cap_value) && isValidFiniteNumber(fin.cash_value) && 
            isValidFiniteNumber(fin.debt_value) && isValidFiniteNumber(fin.shares_outstanding) && fin.shares_outstanding > 0) {
            const bookValue = (fin.cash_value + (fin.other_financial_assets || 0)) - (fin.debt_value + (fin.liabilities || 0));
            if (bookValue > 0) {
                const ratio = fin.market_cap_value / bookValue;
                localLogger.debug(`Calculated price_to_book: ${fin.market_cap_value} / ${bookValue} = ${ratio.toFixed(2)}`);
                return ratio;
            }
        }
        return null;
    },
    
    // Derive missing financial values where possible
    net_financial_assets: (fin, localLogger) => {
        if (fin.net_financial_assets !== null && fin.net_financial_assets !== undefined) return null;
        if (isValidFiniteNumber(fin.cash_value) && isValidFiniteNumber(fin.debt_value)) {
            const nfa = fin.cash_value - fin.debt_value;
            localLogger.debug(`Calculated net_financial_assets: ${fin.cash_value} - ${fin.debt_value} = ${nfa}`);
            return nfa;
        }
        return null;
    },
    
    enterprise_value_value: (fin, localLogger) => {
        if (fin.enterprise_value_value !== null && fin.enterprise_value_value !== undefined) return null;
        if (isValidFiniteNumber(fin.market_cap_value) && isValidFiniteNumber(fin.cash_value) && isValidFiniteNumber(fin.debt_value)) {
            const ev = fin.market_cap_value - fin.cash_value + fin.debt_value;
            localLogger.debug(`Calculated enterprise_value_value: ${fin.market_cap_value} - ${fin.cash_value} + ${fin.debt_value} = ${ev}`);
            return ev;
        }
        return null;
    }
};

const valuationMetricCalculators = {
    // EV per resource/reserve metrics (all metals)
    ev_per_resource_oz_all: (finUSD, est, prod, localLogger) => {
        if (est.ev_per_resource_oz_all !== null && est.ev_per_resource_oz_all !== undefined) return null;
        if (isValidFiniteNumber(finUSD.enterprise_value_value) && isValidFiniteNumber(est.resources_total_aueq_moz) && est.resources_total_aueq_moz > 0) {
            const value = finUSD.enterprise_value_value / (est.resources_total_aueq_moz * 1000000);
            localLogger.debug(`Calculated ev_per_resource_oz_all: ${finUSD.enterprise_value_value} / ${est.resources_total_aueq_moz}M oz = $${value.toFixed(2)}/oz`);
            return value;
        }
        return null;
    },
    
    ev_per_reserve_oz_all: (finUSD, est, prod, localLogger) => {
        if (est.ev_per_reserve_oz_all !== null && est.ev_per_reserve_oz_all !== undefined) return null;
        if (isValidFiniteNumber(finUSD.enterprise_value_value) && isValidFiniteNumber(est.reserves_total_aueq_moz) && est.reserves_total_aueq_moz > 0) {
            const value = finUSD.enterprise_value_value / (est.reserves_total_aueq_moz * 1000000);
            localLogger.debug(`Calculated ev_per_reserve_oz_all: ${finUSD.enterprise_value_value} / ${est.reserves_total_aueq_moz}M oz = $${value.toFixed(2)}/oz`);
            return value;
        }
        return null;
    },
    
    // EV per resource/reserve metrics (precious metals only)
    ev_per_resource_oz_precious: (finUSD, est, prod, localLogger) => {
        if (est.ev_per_resource_oz_precious !== null && est.ev_per_resource_oz_precious !== undefined) return null;
        if (isValidFiniteNumber(finUSD.enterprise_value_value) && isValidFiniteNumber(est.resources_precious_aueq_moz) && est.resources_precious_aueq_moz > 0) {
            const value = finUSD.enterprise_value_value / (est.resources_precious_aueq_moz * 1000000);
            localLogger.debug(`Calculated ev_per_resource_oz_precious: ${finUSD.enterprise_value_value} / ${est.resources_precious_aueq_moz}M oz = $${value.toFixed(2)}/oz`);
            return value;
        }
        return null;
    },
    
    ev_per_reserve_oz_precious: (finUSD, est, prod, localLogger) => {
        if (est.ev_per_reserve_oz_precious !== null && est.ev_per_reserve_oz_precious !== undefined) return null;
        if (isValidFiniteNumber(finUSD.enterprise_value_value) && isValidFiniteNumber(est.reserves_precious_aueq_moz) && est.reserves_precious_aueq_moz > 0) {
            const value = finUSD.enterprise_value_value / (est.reserves_precious_aueq_moz * 1000000);
            localLogger.debug(`Calculated ev_per_reserve_oz_precious: ${finUSD.enterprise_value_value} / ${est.reserves_precious_aueq_moz}M oz = $${value.toFixed(2)}/oz`);
            return value;
        }
        return null;
    },
    
    // Market cap per resource/reserve metrics (all metals)
    mkt_cap_per_resource_oz_all: (finUSD, est, prod, localLogger) => {
        if (est.mkt_cap_per_resource_oz_all !== null && est.mkt_cap_per_resource_oz_all !== undefined) return null;
        if (isValidFiniteNumber(finUSD.market_cap_value) && isValidFiniteNumber(est.resources_total_aueq_moz) && est.resources_total_aueq_moz > 0) {
            const value = finUSD.market_cap_value / (est.resources_total_aueq_moz * 1000000);
            localLogger.debug(`Calculated mkt_cap_per_resource_oz_all: ${finUSD.market_cap_value} / ${est.resources_total_aueq_moz}M oz = $${value.toFixed(2)}/oz`);
            return value;
        }
        return null;
    },
    
    mkt_cap_per_reserve_oz_all: (finUSD, est, prod, localLogger) => {
        if (est.mkt_cap_per_reserve_oz_all !== null && est.mkt_cap_per_reserve_oz_all !== undefined) return null;
        if (isValidFiniteNumber(finUSD.market_cap_value) && isValidFiniteNumber(est.reserves_total_aueq_moz) && est.reserves_total_aueq_moz > 0) {
            const value = finUSD.market_cap_value / (est.reserves_total_aueq_moz * 1000000);
            localLogger.debug(`Calculated mkt_cap_per_reserve_oz_all: ${finUSD.market_cap_value} / ${est.reserves_total_aueq_moz}M oz = $${value.toFixed(2)}/oz`);
            return value;
        }
        return null;
    },
    
    // Market cap per resource/reserve metrics (precious metals only)
    mkt_cap_per_resource_oz_precious: (finUSD, est, prod, localLogger) => {
        if (est.mkt_cap_per_resource_oz_precious !== null && est.mkt_cap_per_resource_oz_precious !== undefined) return null;
        if (isValidFiniteNumber(finUSD.market_cap_value) && isValidFiniteNumber(est.resources_precious_aueq_moz) && est.resources_precious_aueq_moz > 0) {
            const value = finUSD.market_cap_value / (est.resources_precious_aueq_moz * 1000000);
            localLogger.debug(`Calculated mkt_cap_per_resource_oz_precious: ${finUSD.market_cap_value} / ${est.resources_precious_aueq_moz}M oz = $${value.toFixed(2)}/oz`);
            return value;
        }
        return null;
    },
    
    mkt_cap_per_reserve_oz_precious: (finUSD, est, prod, localLogger) => {
        if (est.mkt_cap_per_reserve_oz_precious !== null && est.mkt_cap_per_reserve_oz_precious !== undefined) return null;
        if (isValidFiniteNumber(finUSD.market_cap_value) && isValidFiniteNumber(est.reserves_precious_aueq_moz) && est.reserves_precious_aueq_moz > 0) {
            const value = finUSD.market_cap_value / (est.reserves_precious_aueq_moz * 1000000);
            localLogger.debug(`Calculated mkt_cap_per_reserve_oz_precious: ${finUSD.market_cap_value} / ${est.reserves_precious_aueq_moz}M oz = $${value.toFixed(2)}/oz`);
            return value;
        }
        return null;
    },
    
    // Production-based metrics
    ev_per_production_oz: (finUSD, est, prod, localLogger) => {
        if (prod.ev_per_production_oz !== null && prod.ev_per_production_oz !== undefined) return null;
        if (isValidFiniteNumber(finUSD.enterprise_value_value) && isValidFiniteNumber(prod.current_production_total_aueq_koz) && prod.current_production_total_aueq_koz > 0) {
            const value = finUSD.enterprise_value_value / (prod.current_production_total_aueq_koz * 1000);
            localLogger.debug(`Calculated ev_per_production_oz: ${finUSD.enterprise_value_value} / ${prod.current_production_total_aueq_koz}k oz = $${value.toFixed(2)}/oz`);
            return value;
        }
        return null;
    },
    
    mkt_cap_per_production_oz: (finUSD, est, prod, localLogger) => {
        if (prod.mkt_cap_per_production_oz !== null && prod.mkt_cap_per_production_oz !== undefined) return null;
        if (isValidFiniteNumber(finUSD.market_cap_value) && isValidFiniteNumber(prod.current_production_total_aueq_koz) && prod.current_production_total_aueq_koz > 0) {
            const value = finUSD.market_cap_value / (prod.current_production_total_aueq_koz * 1000);
            localLogger.debug(`Calculated mkt_cap_per_production_oz: ${finUSD.market_cap_value} / ${prod.current_production_total_aueq_koz}k oz = $${value.toFixed(2)}/oz`);
            return value;
        }
        return null;
    },
    
    // Additional metrics for Measured & Indicated resources
    ev_per_mi_oz_all: (finUSD, est, prod, localLogger) => {
        if (est.ev_per_mi_oz_all !== null && est.ev_per_mi_oz_all !== undefined) return null;
        if (isValidFiniteNumber(finUSD.enterprise_value_value) && isValidFiniteNumber(est.measured_indicated_total_aueq_moz) && est.measured_indicated_total_aueq_moz > 0) {
            const value = finUSD.enterprise_value_value / (est.measured_indicated_total_aueq_moz * 1000000);
            localLogger.debug(`Calculated ev_per_mi_oz_all: ${finUSD.enterprise_value_value} / ${est.measured_indicated_total_aueq_moz}M oz = $${value.toFixed(2)}/oz`);
            return value;
        }
        return null;
    },
    
    mkt_cap_per_mi_oz_all: (finUSD, est, prod, localLogger) => {
        if (est.mkt_cap_per_mi_oz_all !== null && est.mkt_cap_per_mi_oz_all !== undefined) return null;
        if (isValidFiniteNumber(finUSD.market_cap_value) && isValidFiniteNumber(est.measured_indicated_total_aueq_moz) && est.measured_indicated_total_aueq_moz > 0) {
            const value = finUSD.market_cap_value / (est.measured_indicated_total_aueq_moz * 1000000);
            localLogger.debug(`Calculated mkt_cap_per_mi_oz_all: ${finUSD.market_cap_value} / ${est.measured_indicated_total_aueq_moz}M oz = $${value.toFixed(2)}/oz`);
            return value;
        }
        return null;
    },
    
    // Potential resources metrics
    ev_per_potential_oz_all: (finUSD, est, prod, localLogger) => {
        if (est.ev_per_potential_oz_all !== null && est.ev_per_potential_oz_all !== undefined) return null;
        if (isValidFiniteNumber(finUSD.enterprise_value_value) && isValidFiniteNumber(est.potential_total_aueq_moz) && est.potential_total_aueq_moz > 0) {
            const value = finUSD.enterprise_value_value / (est.potential_total_aueq_moz * 1000000);
            localLogger.debug(`Calculated ev_per_potential_oz_all: ${finUSD.enterprise_value_value} / ${est.potential_total_aueq_moz}M oz = $${value.toFixed(2)}/oz`);
            return value;
        }
        return null;
    },
    
    mkt_cap_per_potential_oz_all: (finUSD, est, prod, localLogger) => {
        if (est.mkt_cap_per_potential_oz_all !== null && est.mkt_cap_per_potential_oz_all !== undefined) return null;
        if (isValidFiniteNumber(finUSD.market_cap_value) && isValidFiniteNumber(est.potential_total_aueq_moz) && est.potential_total_aueq_moz > 0) {
            const value = finUSD.market_cap_value / (est.potential_total_aueq_moz * 1000000);
            localLogger.debug(`Calculated mkt_cap_per_potential_oz_all: ${finUSD.market_cap_value} / ${est.potential_total_aueq_moz}M oz = $${value.toFixed(2)}/oz`);
            return value;
        }
        return null;
    }
};

// Main calculation function
async function calculateAndPopulateMetrics() {
    logger.info("Starting enhanced derived metrics calculation process...", { step: 'INIT_METRIC_CALCULATION' });

    await loadExchangeRates();

    // Fetch all necessary data
    logger.info("Fetching data from all required tables...", { step: 'FETCH_ALL_DATA' });
    const [
        { data: companiesData, error: companiesError },
        { data: financialsData, error: financialsError },
        { data: mineralEstimatesData, error: estimatesError },
        { data: productionData, error: productionError },
        { data: valuationMetricsData, error: valuationsError }
    ] = await Promise.all([
        supabase.from('companies').select('company_id, company_name, tsx_code'),
        supabase.from('financials').select('*'),
        supabase.from('mineral_estimates').select('*'),
        supabase.from('production').select('*'),
        supabase.from('valuation_metrics').select('*')
    ]);

    if (companiesError || financialsError || estimatesError || productionError || valuationsError) {
        logger.error("CRITICAL: Failed to fetch required tables", {
            companiesError: companiesError?.message,
            financialsError: financialsError?.message,
            estimatesError: estimatesError?.message,
            productionError: productionError?.message,
            valuationsError: valuationsError?.message
        });
        return;
    }

    if (!companiesData || companiesData.length === 0) {
        logger.info("No companies found. Exiting.");
        return;
    }

    // Create maps for efficient lookup
    const companiesMap = new Map(companiesData.map(c => [c.company_id, c]));
    const financialsMap = new Map(financialsData.map(f => [f.company_id, f]));
    const mineralEstimatesMap = new Map(mineralEstimatesData.map(e => [e.company_id, e]));
    const productionDataMap = new Map(productionData.map(p => [p.company_id, p]));
    const existingValuationMetricsMap = new Map(valuationMetricsData.map(v => [v.company_id, v]));
    
    logger.info(`Data loaded: ${companiesData.length} companies, ${financialsData.length} financials, ${mineralEstimatesData.length} mineral estimates, ${productionData.length} production records, ${valuationMetricsData.length} existing valuation metrics`);

    const financialsUpdates = [];
    const valuationMetricsUpdates = [];
    let processedCount = 0;
    
    // Process each company
    for (const company of companiesData) {
        if (isShuttingDown) break;
        
        const { company_id, company_name, tsx_code } = company;
        const localLogger = logger.child({ company_id, ticker: tsx_code, step: 'PROCESS_COMPANY_METRICS' });
        
        processedCount++;
        if (processedCount % LOG_PROGRESS_INTERVAL === 0) {
            logger.info(`Progress: ${processedCount}/${companiesData.length} companies processed`);
        }

        const finRecord = financialsMap.get(company_id);
        const estRecord = mineralEstimatesMap.get(company_id);
        const prodRecord = productionDataMap.get(company_id);
        const existingValuationRecord = existingValuationMetricsMap.get(company_id) || {};

        // Process financial ratios
        if (finRecord) {
            const financialUpdatePayload = { company_id };
            let hasNewFinancialRatios = false;
            const calculatedRatios = [];
            
            for (const [ratioKey, calculator] of Object.entries(financialRatioCalculators)) {
                const calculatedValue = calculator(finRecord, localLogger);
                if (isValidFiniteNumber(calculatedValue) && isReasonableRatio(calculatedValue, ratioKey, localLogger)) {
                    financialUpdatePayload[ratioKey] = calculatedValue;
                    hasNewFinancialRatios = true;
                    calculatedRatios.push(`${ratioKey}=${calculatedValue.toFixed(2)}`);
                }
            }
            
            if (hasNewFinancialRatios) {
                financialUpdatePayload.last_updated = new Date().toISOString();
                financialsUpdates.push(financialUpdatePayload);
                
                updateTracker.financials.push({
                    company_id,
                    company_name,
                    ticker: tsx_code,
                    ratios_calculated: calculatedRatios,
                    count: calculatedRatios.length
                });
                
                localLogger.info(`Calculated ${calculatedRatios.length} financial ratios: ${calculatedRatios.join(', ')}`);
            } else {
                localLogger.debug("No new financial ratios to calculate");
            }
        } else {
            localLogger.debug("No financials record found");
        }

        // Process valuation metrics
        if (finRecord && (estRecord || prodRecord)) {
            const valuationUpdatePayload = { company_id };
            let hasNewValuationMetrics = false;
            const calculatedMetrics = [];

            // Convert financials to USD
            const finRecordUSD = {
                market_cap_value: convertToUSD(
                    finRecord.market_cap_value, 
                    finRecord.market_cap_currency, 
                    `MarketCap_C${company_id}`, 
                    localLogger
                ),
                enterprise_value_value: convertToUSD(
                    finRecord.enterprise_value_value, 
                    finRecord.enterprise_value_currency, 
                    `EV_C${company_id}`, 
                    localLogger
                )
            };

            if (isValidFiniteNumber(finRecordUSD.market_cap_value) || isValidFiniteNumber(finRecordUSD.enterprise_value_value)) {
                for (const [metricKey, calculator] of Object.entries(valuationMetricCalculators)) {
                    const calculatedValue = calculator(
                        finRecordUSD,
                        estRecord || {},
                        prodRecord || {},
                        localLogger
                    );
                    
                    if (isValidFiniteNumber(calculatedValue)) {
                        valuationUpdatePayload[metricKey] = calculatedValue;
                        hasNewValuationMetrics = true;
                        calculatedMetrics.push(`${metricKey}=$${calculatedValue.toFixed(2)}`);
                    }
                }
            } else {
                localLogger.warn(`Invalid USD values: MarketCap=${finRecordUSD.market_cap_value}, EV=${finRecordUSD.enterprise_value_value}`);
                updateTracker.warnings.push({
                    company_id,
                    warning: 'Could not convert financials to USD for valuation metrics'
                });
            }

            if (hasNewValuationMetrics) {
                valuationUpdatePayload.last_updated = new Date().toISOString();
                valuationMetricsUpdates.push(valuationUpdatePayload);
                
                updateTracker.valuationMetrics.push({
                    company_id,
                    company_name,
                    ticker: tsx_code,
                    metrics_calculated: calculatedMetrics,
                    count: calculatedMetrics.length
                });
                
                localLogger.info(`Calculated ${calculatedMetrics.length} valuation metrics: ${calculatedMetrics.join(', ')}`);
            } else {
                localLogger.debug("No new valuation metrics to calculate");
            }
        } else {
            localLogger.debug("Missing required data for valuation metrics");
        }
    }

    // Batch update financials
    if (financialsUpdates.length > 0) {
        logger.info(`Updating ${financialsUpdates.length} financial records...`, { step: 'BATCH_UPDATE_FINANCIALS' });
        
        // Process in batches to avoid timeout
        for (let i = 0; i < financialsUpdates.length; i += BATCH_UPDATE_SIZE) {
            const batch = financialsUpdates.slice(i, i + BATCH_UPDATE_SIZE);
            const { error } = await supabase.from('financials').upsert(batch, { onConflict: 'company_id' });
            
            if (error) {
                logger.error(`Error updating financials batch ${i / BATCH_UPDATE_SIZE + 1}:`, { 
                    message: error.message, 
                    details: error.details 
                });
                updateTracker.errors.push({
                    batch: `financials_${i / BATCH_UPDATE_SIZE + 1}`,
                    error: error.message
                });
            } else {
                logger.info(`Successfully updated financials batch ${i / BATCH_UPDATE_SIZE + 1} (${batch.length} records)`);
            }
        }
    } else {
        logger.info("No financial ratios were calculated");
    }

    // Batch update valuation metrics
    if (valuationMetricsUpdates.length > 0) {
        logger.info(`Updating ${valuationMetricsUpdates.length} valuation metric records...`, { step: 'BATCH_UPDATE_VALUATIONS' });
        
        for (let i = 0; i < valuationMetricsUpdates.length; i += BATCH_UPDATE_SIZE) {
            const batch = valuationMetricsUpdates.slice(i, i + BATCH_UPDATE_SIZE);
            const { error } = await supabase.from('valuation_metrics').upsert(batch, { onConflict: 'company_id' });
            
            if (error) {
                logger.error(`Error updating valuation metrics batch ${i / BATCH_UPDATE_SIZE + 1}:`, { 
                    message: error.message, 
                    details: error.details 
                });
                updateTracker.errors.push({
                    batch: `valuations_${i / BATCH_UPDATE_SIZE + 1}`,
                    error: error.message
                });
            } else {
                logger.info(`Successfully updated valuation metrics batch ${i / BATCH_UPDATE_SIZE + 1} (${batch.length} records)`);
            }
        }
    } else {
        logger.info("No valuation metrics were calculated");
    }

    // Generate detailed report
    generateDetailedReport();
}

// Generate comprehensive report of all changes
function generateDetailedReport() {
    logger.info("=== DERIVED METRICS CALCULATION REPORT ===", { step: 'FINAL_REPORT' });
    
    // Financial ratios summary
    logger.info(`Financial Ratios Updated: ${updateTracker.financials.length} companies`);
    if (updateTracker.financials.length > 0) {
        const totalRatios = updateTracker.financials.reduce((sum, f) => sum + f.count, 0);
        logger.info(`Total Financial Ratios Calculated: ${totalRatios}`);
        
        // Top companies by ratios calculated
        const topFinancials = updateTracker.financials
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
        logger.info("Top 5 companies by financial ratios calculated:");
        topFinancials.forEach(f => {
            logger.info(`  ${f.ticker} (${f.company_name}): ${f.count} ratios`);
        });
    }
    
    // Valuation metrics summary
    logger.info(`Valuation Metrics Updated: ${updateTracker.valuationMetrics.length} companies`);
    if (updateTracker.valuationMetrics.length > 0) {
        const totalMetrics = updateTracker.valuationMetrics.reduce((sum, v) => sum + v.count, 0);
        logger.info(`Total Valuation Metrics Calculated: ${totalMetrics}`);
        
        // Top companies by metrics calculated
        const topValuations = updateTracker.valuationMetrics
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
        logger.info("Top 5 companies by valuation metrics calculated:");
        topValuations.forEach(v => {
            logger.info(`  ${v.ticker} (${v.company_name}): ${v.count} metrics`);
        });
    }
    
    // Warnings and errors
    if (updateTracker.warnings.length > 0) {
        logger.warn(`Total Warnings: ${updateTracker.warnings.length}`);
        const warningTypes = updateTracker.warnings.reduce((acc, w) => {
            acc[w.warning] = (acc[w.warning] || 0) + 1;
            return acc;
        }, {});
        Object.entries(warningTypes).forEach(([type, count]) => {
            logger.warn(`  ${type}: ${count} occurrences`);
        });
    }
    
    if (updateTracker.errors.length > 0) {
        logger.error(`Total Errors: ${updateTracker.errors.length}`);
        updateTracker.errors.forEach(e => {
            logger.error(`  ${e.context || e.batch}: ${e.error}`);
        });
    }
    
    // Write detailed report to file
    const reportPath = path.join(LOG_DIR, `derived_metrics_report_${new Date().toISOString().split('T')[0]}.json`);
    try {
        fs.writeFileSync(reportPath, JSON.stringify(updateTracker, null, 2));
        logger.info(`Detailed report written to: ${reportPath}`);
    } catch (e) {
        logger.error(`Failed to write report file: ${e.message}`);
    }
    
    logger.info("=== END OF REPORT ===");
}

// Main execution
async function main() {
    logger.info(`Enhanced Derived Metrics Calculator Started. PID: ${process.pid}`);
    const lockFilePath = path.join(__dirname, 'populate_derived_metrics.lock');

    // Lock file handling
    if (fs.existsSync(lockFilePath)) {
        const lockFileContent = fs.readFileSync(lockFilePath, 'utf8');
        const lockTime = new Date(lockFileContent.split('PID:')[0].replace('Running since: ', '').trim()).getTime();
        if (Date.now() - lockTime < LOCK_FILE_TIMEOUT) {
            logger.warn(`Lock file exists and is recent: ${lockFileContent}. Exiting.`);
            return;
        } else {
            logger.warn(`Stale lock file found: ${lockFileContent}. Removing.`);
            try { fs.unlinkSync(lockFilePath); } catch(e) { logger.error(`Could not remove stale lock file: ${e.message}`); }
        }
    }

    try {
        fs.writeFileSync(lockFilePath, `Running since: ${new Date().toISOString()} PID: ${process.pid}`);
        logger.info('Lock file created.');
        
        await calculateAndPopulateMetrics();
        
    } catch (error) {
        logger.error(`Unhandled error in main execution: ${error.message}`, { stack: error.stack });
        process.exitCode = 1;
    } finally {
        if (fs.existsSync(lockFilePath)) {
            try { 
                fs.unlinkSync(lockFilePath); 
                logger.info('Lock file removed.'); 
            } catch (e) { 
                logger.error('Error removing lock file:', e); 
            }
        }
        logger.info('Enhanced Derived Metrics Calculator completed.');
    }
}

// Execute if run directly
if (require.main === module) {
    main().catch(e => {
        logger.error(`Fatal error: ${e.message}`, { stack: e.stack });
        if (fs.existsSync(LOCK_FILE)) { 
            try { fs.unlinkSync(LOCK_FILE); } catch (err) { /* ignore */ } 
        }
        process.exit(1);
    });
}

// Signal handlers
process.on('SIGINT', () => { 
    isShuttingDown = true; 
    logger.warn("SIGINT received. Gracefully shutting down..."); 
});

process.on('SIGTERM', () => { 
    isShuttingDown = true; 
    logger.warn("SIGTERM received. Gracefully shutting down..."); 
});

process.on('uncaughtException', (err, origin) => { 
    logger.error(`UNCAUGHT EXCEPTION: Origin: ${origin}, Error: ${err.message}`, { stack: err.stack });
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => { 
    const reasonMessage = reason instanceof Error ? reason.message : String(reason);
    const reasonStack = reason instanceof Error ? reason.stack : undefined;
    logger.error('UNHANDLED PROMISE REJECTION:', { reason: reasonMessage, stack: reasonStack });
    process.exit(1);
});