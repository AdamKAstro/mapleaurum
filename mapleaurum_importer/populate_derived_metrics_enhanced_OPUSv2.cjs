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
const MAX_REASONABLE_PER_OZ_VALUE = 10000; // $10,000 per oz is very high
const MIN_REASONABLE_PER_OZ_VALUE = 1; // Less than $1/oz is suspiciously low

let isShuttingDown = false;
let exchangeRatesCache = {};
let supportedCurrencies = new Set();

// Track all updates for reporting
const updateTracker = {
    financials: [],
    valuationMetrics: [],
    errors: [],
    warnings: [],
    skippedMetrics: []
};

// Schema cache to store actual column names
const schemaCache = {
    financials: new Set(),
    valuation_metrics: new Set(),
    mineral_estimates: new Set(),
    production: new Set()
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

// Currency normalization
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
    } else if (ratioName.includes('_per_') && ratioName.includes('_oz')) {
        if (value > MAX_REASONABLE_PER_OZ_VALUE || value < MIN_REASONABLE_PER_OZ_VALUE) {
            localLogger.warn(`${ratioName} value $${value}/oz is outside reasonable range [$${MIN_REASONABLE_PER_OZ_VALUE}, $${MAX_REASONABLE_PER_OZ_VALUE}]`);
            return false;
        }
    }
    
    return true;
}

// Dynamic schema discovery
async function discoverTableSchema(tableName) {
    const localLogger = logger.child({ step: 'SCHEMA_DISCOVERY', table: tableName });
    
    try {
        // Get one row to discover columns
        const { data, error } = await supabase
            .from(tableName)
            .select('*')
            .limit(1);
            
        if (error) {
            localLogger.error(`Failed to discover schema: ${error.message}`);
            return new Set();
        }
        
        if (data && data.length > 0) {
            const columns = Object.keys(data[0]);
            localLogger.info(`Discovered ${columns.length} columns in ${tableName}`);
            localLogger.debug(`Columns: ${columns.join(', ')}`);
            return new Set(columns);
        } else {
            localLogger.warn(`No data found in ${tableName} for schema discovery`);
            return new Set();
        }
    } catch (e) {
        localLogger.error(`Exception during schema discovery: ${e.message}`);
        return new Set();
    }
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

// --- Dynamic Ratio Calculation Definitions ---
function getFinancialRatioCalculators(availableColumns) {
    const calculators = {};
    
    // Basic valuation ratios with proper column names
    if (availableColumns.has('f_price_to_sales')) {
        calculators['f_price_to_sales'] = (fin, localLogger) => {
            if (fin.f_price_to_sales !== null && fin.f_price_to_sales !== undefined) return null;
            if (isValidFiniteNumber(fin.f_market_cap_value) && isValidFiniteNumber(fin.f_revenue_value) && fin.f_revenue_value > 0) {
                const ratio = fin.f_market_cap_value / fin.f_revenue_value;
                localLogger.debug(`Calculated f_price_to_sales: ${fin.f_market_cap_value} / ${fin.f_revenue_value} = ${ratio.toFixed(2)}`);
                return ratio;
            }
            return null;
        };
    }
    
    if (availableColumns.has('f_enterprise_to_revenue')) {
        calculators['f_enterprise_to_revenue'] = (fin, localLogger) => {
            if (fin.f_enterprise_to_revenue !== null && fin.f_enterprise_to_revenue !== undefined) return null;
            if (isValidFiniteNumber(fin.f_enterprise_value_value) && isValidFiniteNumber(fin.f_revenue_value) && fin.f_revenue_value > 0) {
                const ratio = fin.f_enterprise_value_value / fin.f_revenue_value;
                localLogger.debug(`Calculated f_enterprise_to_revenue: ${fin.f_enterprise_value_value} / ${fin.f_revenue_value} = ${ratio.toFixed(2)}`);
                return ratio;
            }
            return null;
        };
    }
    
    if (availableColumns.has('f_enterprise_to_ebitda')) {
        calculators['f_enterprise_to_ebitda'] = (fin, localLogger) => {
            if (fin.f_enterprise_to_ebitda !== null && fin.f_enterprise_to_ebitda !== undefined) return null;
            if (isValidFiniteNumber(fin.f_enterprise_value_value) && isValidFiniteNumber(fin.f_ebitda) && fin.f_ebitda > 0) {
                const ratio = fin.f_enterprise_value_value / fin.f_ebitda;
                localLogger.debug(`Calculated f_enterprise_to_ebitda: ${fin.f_enterprise_value_value} / ${fin.f_ebitda} = ${ratio.toFixed(2)}`);
                return ratio;
            }
            return null;
        };
    }
    
    if (availableColumns.has('f_trailing_pe')) {
        calculators['f_trailing_pe'] = (fin, localLogger) => {
            if (fin.f_trailing_pe !== null && fin.f_trailing_pe !== undefined) return null;
            if (isValidFiniteNumber(fin.f_market_cap_value) && isValidFiniteNumber(fin.f_net_income_value) && fin.f_net_income_value > 0) {
                const ratio = fin.f_market_cap_value / fin.f_net_income_value;
                localLogger.debug(`Calculated f_trailing_pe: ${fin.f_market_cap_value} / ${fin.f_net_income_value} = ${ratio.toFixed(2)}`);
                return ratio;
            }
            return null;
        };
    }
    
    if (availableColumns.has('f_price_to_book')) {
        calculators['f_price_to_book'] = (fin, localLogger) => {
            if (fin.f_price_to_book !== null && fin.f_price_to_book !== undefined) return null;
            // Calculate book value: assets - liabilities
            if (isValidFiniteNumber(fin.f_market_cap_value) && isValidFiniteNumber(fin.f_shares_outstanding) && fin.f_shares_outstanding > 0) {
                // Try to calculate book value from available data
                const totalAssets = (fin.f_cash_value || 0) + (fin.f_other_financial_assets || 0);
                const totalLiabilities = (fin.f_debt_value || 0) + (fin.f_liabilities || 0);
                const bookValue = totalAssets - totalLiabilities;
                
                if (bookValue > 0) {
                    const bookPerShare = bookValue / fin.f_shares_outstanding;
                    const sharePrice = fin.f_market_cap_value / fin.f_shares_outstanding;
                    const ratio = sharePrice / bookPerShare;
                    localLogger.debug(`Calculated f_price_to_book: Share price ${sharePrice.toFixed(2)} / Book per share ${bookPerShare.toFixed(2)} = ${ratio.toFixed(2)}`);
                    return ratio;
                }
            }
            return null;
        };
    }
    
    if (availableColumns.has('f_net_financial_assets')) {
        calculators['f_net_financial_assets'] = (fin, localLogger) => {
            if (fin.f_net_financial_assets !== null && fin.f_net_financial_assets !== undefined) return null;
            if (isValidFiniteNumber(fin.f_cash_value) && isValidFiniteNumber(fin.f_debt_value)) {
                const nfa = fin.f_cash_value - fin.f_debt_value;
                localLogger.debug(`Calculated f_net_financial_assets: ${fin.f_cash_value} - ${fin.f_debt_value} = ${nfa}`);
                return nfa;
            }
            return null;
        };
    }
    
    if (availableColumns.has('f_enterprise_value_value')) {
        calculators['f_enterprise_value_value'] = (fin, localLogger) => {
            if (fin.f_enterprise_value_value !== null && fin.f_enterprise_value_value !== undefined) return null;
            if (isValidFiniteNumber(fin.f_market_cap_value) && isValidFiniteNumber(fin.f_cash_value) && isValidFiniteNumber(fin.f_debt_value)) {
                const ev = fin.f_market_cap_value - fin.f_cash_value + fin.f_debt_value;
                localLogger.debug(`Calculated f_enterprise_value_value: ${fin.f_market_cap_value} - ${fin.f_cash_value} + ${fin.f_debt_value} = ${ev}`);
                return ev;
            }
            return null;
        };
    }
    
    // Additional margin calculations if columns exist
    if (availableColumns.has('f_gross_margin') && availableColumns.has('f_gross_profit') && availableColumns.has('f_revenue_value')) {
        calculators['f_gross_margin'] = (fin, localLogger) => {
            if (fin.f_gross_margin !== null && fin.f_gross_margin !== undefined) return null;
            if (isValidFiniteNumber(fin.f_gross_profit) && isValidFiniteNumber(fin.f_revenue_value) && fin.f_revenue_value > 0) {
                const margin = (fin.f_gross_profit / fin.f_revenue_value) * 100;
                localLogger.debug(`Calculated f_gross_margin: (${fin.f_gross_profit} / ${fin.f_revenue_value}) * 100 = ${margin.toFixed(2)}%`);
                return margin;
            }
            return null;
        };
    } else if (availableColumns.has('f_gross_margin')) {
        updateTracker.skippedMetrics.push({
            metric: 'f_gross_margin',
            reason: 'Missing required columns: f_gross_profit or f_revenue_value'
        });
    }
    
    if (availableColumns.has('f_operating_margin') && availableColumns.has('f_operating_income') && availableColumns.has('f_revenue_value')) {
        calculators['f_operating_margin'] = (fin, localLogger) => {
            if (fin.f_operating_margin !== null && fin.f_operating_margin !== undefined) return null;
            if (isValidFiniteNumber(fin.f_operating_income) && isValidFiniteNumber(fin.f_revenue_value) && fin.f_revenue_value > 0) {
                const margin = (fin.f_operating_income / fin.f_revenue_value) * 100;
                localLogger.debug(`Calculated f_operating_margin: (${fin.f_operating_income} / ${fin.f_revenue_value}) * 100 = ${margin.toFixed(2)}%`);
                return margin;
            }
            return null;
        };
    } else if (availableColumns.has('f_operating_margin')) {
        updateTracker.skippedMetrics.push({
            metric: 'f_operating_margin',
            reason: 'Missing required columns: f_operating_income or f_revenue_value'
        });
    }
    
    if (availableColumns.has('f_net_margin') && availableColumns.has('f_net_income_value') && availableColumns.has('f_revenue_value')) {
        calculators['f_net_margin'] = (fin, localLogger) => {
            if (fin.f_net_margin !== null && fin.f_net_margin !== undefined) return null;
            if (isValidFiniteNumber(fin.f_net_income_value) && isValidFiniteNumber(fin.f_revenue_value) && fin.f_revenue_value > 0) {
                const margin = (fin.f_net_income_value / fin.f_revenue_value) * 100;
                localLogger.debug(`Calculated f_net_margin: (${fin.f_net_income_value} / ${fin.f_revenue_value}) * 100 = ${margin.toFixed(2)}%`);
                return margin;
            }
            return null;
        };
    } else if (availableColumns.has('f_net_margin')) {
        updateTracker.skippedMetrics.push({
            metric: 'f_net_margin',
            reason: 'Missing required columns: f_net_income_value or f_revenue_value'
        });
    }
    
    // Additional useful ratios
    if (availableColumns.has('f_debt_to_equity') && availableColumns.has('f_debt_value') && availableColumns.has('f_market_cap_value')) {
        calculators['f_debt_to_equity'] = (fin, localLogger) => {
            if (fin.f_debt_to_equity !== null && fin.f_debt_to_equity !== undefined) return null;
            // Calculate shareholder equity from market cap - debt + cash
            const equity = fin.f_market_cap_value - (fin.f_debt_value || 0) + (fin.f_cash_value || 0);
            if (isValidFiniteNumber(fin.f_debt_value) && isValidFiniteNumber(equity) && equity > 0) {
                const ratio = fin.f_debt_value / equity;
                localLogger.debug(`Calculated f_debt_to_equity: ${fin.f_debt_value} / ${equity} = ${ratio.toFixed(2)}`);
                return ratio;
            }
            return null;
        };
    }
    
    if (availableColumns.has('f_current_ratio') && availableColumns.has('f_cash_value') && availableColumns.has('f_liabilities')) {
        calculators['f_current_ratio'] = (fin, localLogger) => {
            if (fin.f_current_ratio !== null && fin.f_current_ratio !== undefined) return null;
            const currentAssets = (fin.f_cash_value || 0) + (fin.f_other_financial_assets || 0);
            const currentLiabilities = fin.f_liabilities || fin.f_debt_value || 0;
            if (isValidFiniteNumber(currentAssets) && isValidFiniteNumber(currentLiabilities) && currentLiabilities > 0) {
                const ratio = currentAssets / currentLiabilities;
                localLogger.debug(`Calculated f_current_ratio: ${currentAssets} / ${currentLiabilities} = ${ratio.toFixed(2)}`);
                return ratio;
            }
            return null;
        };
    }
    
    return calculators;
}

function getValuationMetricCalculators(availableColumns, mineralEstimateColumns, productionColumns) {
    const calculators = {};
    
    // Check which valuation columns exist and create appropriate calculators
    // EV per resource/reserve metrics (all metals)
    if (availableColumns.has('ev_per_resource_oz_all') && mineralEstimateColumns.has('me_resources_total_aueq_moz')) {
        calculators['ev_per_resource_oz_all'] = (finUSD, est, prod, existingVal, localLogger) => {
            if (existingVal.ev_per_resource_oz_all !== null && existingVal.ev_per_resource_oz_all !== undefined) return null;
            if (isValidFiniteNumber(finUSD.enterprise_value_value) && isValidFiniteNumber(est.me_resources_total_aueq_moz) && est.me_resources_total_aueq_moz > 0) {
                const value = finUSD.enterprise_value_value / (est.me_resources_total_aueq_moz * 1000000);
                localLogger.debug(`Calculated ev_per_resource_oz_all: ${finUSD.enterprise_value_value} / ${est.me_resources_total_aueq_moz}M oz = ${value.toFixed(2)}/oz`);
                return value;
            }
            return null;
        };
    }
    
    if (availableColumns.has('ev_per_reserve_oz_all') && mineralEstimateColumns.has('me_reserves_total_aueq_moz')) {
        calculators['ev_per_reserve_oz_all'] = (finUSD, est, prod, existingVal, localLogger) => {
            if (existingVal.ev_per_reserve_oz_all !== null && existingVal.ev_per_reserve_oz_all !== undefined) return null;
            if (isValidFiniteNumber(finUSD.enterprise_value_value) && isValidFiniteNumber(est.me_reserves_total_aueq_moz) && est.me_reserves_total_aueq_moz > 0) {
                const value = finUSD.enterprise_value_value / (est.me_reserves_total_aueq_moz * 1000000);
                localLogger.debug(`Calculated ev_per_reserve_oz_all: ${finUSD.enterprise_value_value} / ${est.me_reserves_total_aueq_moz}M oz = ${value.toFixed(2)}/oz`);
                return value;
            }
            return null;
        };
    }
    
    // EV per resource/reserve metrics (precious metals only)
    if (availableColumns.has('ev_per_resource_oz_precious') && mineralEstimateColumns.has('me_resources_precious_aueq_moz')) {
        calculators['ev_per_resource_oz_precious'] = (finUSD, est, prod, existingVal, localLogger) => {
            if (existingVal.ev_per_resource_oz_precious !== null && existingVal.ev_per_resource_oz_precious !== undefined) return null;
            if (isValidFiniteNumber(finUSD.enterprise_value_value) && isValidFiniteNumber(est.me_resources_precious_aueq_moz) && est.me_resources_precious_aueq_moz > 0) {
                const value = finUSD.enterprise_value_value / (est.me_resources_precious_aueq_moz * 1000000);
                localLogger.debug(`Calculated ev_per_resource_oz_precious: ${finUSD.enterprise_value_value} / ${est.me_resources_precious_aueq_moz}M oz = ${value.toFixed(2)}/oz`);
                return value;
            }
            return null;
        };
    }
    
    if (availableColumns.has('ev_per_reserve_oz_precious') && mineralEstimateColumns.has('me_reserves_precious_aueq_moz')) {
        calculators['ev_per_reserve_oz_precious'] = (finUSD, est, prod, existingVal, localLogger) => {
            if (existingVal.ev_per_reserve_oz_precious !== null && existingVal.ev_per_reserve_oz_precious !== undefined) return null;
            if (isValidFiniteNumber(finUSD.enterprise_value_value) && isValidFiniteNumber(est.me_reserves_precious_aueq_moz) && est.me_reserves_precious_aueq_moz > 0) {
                const value = finUSD.enterprise_value_value / (est.me_reserves_precious_aueq_moz * 1000000);
                localLogger.debug(`Calculated ev_per_reserve_oz_precious: ${finUSD.enterprise_value_value} / ${est.me_reserves_precious_aueq_moz}M oz = ${value.toFixed(2)}/oz`);
                return value;
            }
            return null;
        };
    }
    
    // Market cap per resource/reserve metrics (all metals)
    if (availableColumns.has('mkt_cap_per_resource_oz_all') && mineralEstimateColumns.has('me_resources_total_aueq_moz')) {
        calculators['mkt_cap_per_resource_oz_all'] = (finUSD, est, prod, existingVal, localLogger) => {
            if (existingVal.mkt_cap_per_resource_oz_all !== null && existingVal.mkt_cap_per_resource_oz_all !== undefined) return null;
            if (isValidFiniteNumber(finUSD.market_cap_value) && isValidFiniteNumber(est.me_resources_total_aueq_moz) && est.me_resources_total_aueq_moz > 0) {
                const value = finUSD.market_cap_value / (est.me_resources_total_aueq_moz * 1000000);
                localLogger.debug(`Calculated mkt_cap_per_resource_oz_all: ${finUSD.market_cap_value} / ${est.me_resources_total_aueq_moz}M oz = ${value.toFixed(2)}/oz`);
                return value;
            }
            return null;
        };
    }
    
    if (availableColumns.has('mkt_cap_per_reserve_oz_all') && mineralEstimateColumns.has('me_reserves_total_aueq_moz')) {
        calculators['mkt_cap_per_reserve_oz_all'] = (finUSD, est, prod, existingVal, localLogger) => {
            if (existingVal.mkt_cap_per_reserve_oz_all !== null && existingVal.mkt_cap_per_reserve_oz_all !== undefined) return null;
            if (isValidFiniteNumber(finUSD.market_cap_value) && isValidFiniteNumber(est.me_reserves_total_aueq_moz) && est.me_reserves_total_aueq_moz > 0) {
                const value = finUSD.market_cap_value / (est.me_reserves_total_aueq_moz * 1000000);
                localLogger.debug(`Calculated mkt_cap_per_reserve_oz_all: ${finUSD.market_cap_value} / ${est.me_reserves_total_aueq_moz}M oz = ${value.toFixed(2)}/oz`);
                return value;
            }
            return null;
        };
    }
    
    // Market cap per resource/reserve metrics (precious metals only)
    if (availableColumns.has('mkt_cap_per_resource_oz_precious') && mineralEstimateColumns.has('me_resources_precious_aueq_moz')) {
        calculators['mkt_cap_per_resource_oz_precious'] = (finUSD, est, prod, existingVal, localLogger) => {
            if (existingVal.mkt_cap_per_resource_oz_precious !== null && existingVal.mkt_cap_per_resource_oz_precious !== undefined) return null;
            if (isValidFiniteNumber(finUSD.market_cap_value) && isValidFiniteNumber(est.me_resources_precious_aueq_moz) && est.me_resources_precious_aueq_moz > 0) {
                const value = finUSD.market_cap_value / (est.me_resources_precious_aueq_moz * 1000000);
                localLogger.debug(`Calculated mkt_cap_per_resource_oz_precious: ${finUSD.market_cap_value} / ${est.me_resources_precious_aueq_moz}M oz = ${value.toFixed(2)}/oz`);
                return value;
            }
            return null;
        };
    }
    
    if (availableColumns.has('mkt_cap_per_reserve_oz_precious') && mineralEstimateColumns.has('me_reserves_precious_aueq_moz')) {
        calculators['mkt_cap_per_reserve_oz_precious'] = (finUSD, est, prod, existingVal, localLogger) => {
            if (existingVal.mkt_cap_per_reserve_oz_precious !== null && existingVal.mkt_cap_per_reserve_oz_precious !== undefined) return null;
            if (isValidFiniteNumber(finUSD.market_cap_value) && isValidFiniteNumber(est.me_reserves_precious_aueq_moz) && est.me_reserves_precious_aueq_moz > 0) {
                const value = finUSD.market_cap_value / (est.me_reserves_precious_aueq_moz * 1000000);
                localLogger.debug(`Calculated mkt_cap_per_reserve_oz_precious: ${finUSD.market_cap_value} / ${est.me_reserves_precious_aueq_moz}M oz = ${value.toFixed(2)}/oz`);
                return value;
            }
            return null;
        };
    }
    
    // Production-based metrics
    if (availableColumns.has('ev_per_production_oz') && productionColumns.has('p_current_production_total_aueq_koz')) {
        calculators['ev_per_production_oz'] = (finUSD, est, prod, existingVal, localLogger) => {
            if (existingVal.ev_per_production_oz !== null && existingVal.ev_per_production_oz !== undefined) return null;
            if (isValidFiniteNumber(finUSD.enterprise_value_value) && isValidFiniteNumber(prod.p_current_production_total_aueq_koz) && prod.p_current_production_total_aueq_koz > 0) {
                const value = finUSD.enterprise_value_value / (prod.p_current_production_total_aueq_koz * 1000);
                localLogger.debug(`Calculated ev_per_production_oz: ${finUSD.enterprise_value_value} / ${prod.p_current_production_total_aueq_koz}k oz = ${value.toFixed(2)}/oz`);
                return value;
            }
            return null;
        };
    }
    
    if (availableColumns.has('mkt_cap_per_production_oz') && productionColumns.has('p_current_production_total_aueq_koz')) {
        calculators['mkt_cap_per_production_oz'] = (finUSD, est, prod, existingVal, localLogger) => {
            if (existingVal.mkt_cap_per_production_oz !== null && existingVal.mkt_cap_per_production_oz !== undefined) return null;
            if (isValidFiniteNumber(finUSD.market_cap_value) && isValidFiniteNumber(prod.p_current_production_total_aueq_koz) && prod.p_current_production_total_aueq_koz > 0) {
                const value = finUSD.market_cap_value / (prod.p_current_production_total_aueq_koz * 1000);
                localLogger.debug(`Calculated mkt_cap_per_production_oz: ${finUSD.market_cap_value} / ${prod.p_current_production_total_aueq_koz}k oz = ${value.toFixed(2)}/oz`);
                return value;
            }
            return null;
        };
    }
    
    // Measured & Indicated metrics
    if (availableColumns.has('ev_per_mi_oz_all') && mineralEstimateColumns.has('me_measured_indicated_total_aueq_moz')) {
        calculators['ev_per_mi_oz_all'] = (finUSD, est, prod, existingVal, localLogger) => {
            if (existingVal.ev_per_mi_oz_all !== null && existingVal.ev_per_mi_oz_all !== undefined) return null;
            if (isValidFiniteNumber(finUSD.enterprise_value_value) && isValidFiniteNumber(est.me_measured_indicated_total_aueq_moz) && est.me_measured_indicated_total_aueq_moz > 0) {
                const value = finUSD.enterprise_value_value / (est.me_measured_indicated_total_aueq_moz * 1000000);
                localLogger.debug(`Calculated ev_per_mi_oz_all: ${finUSD.enterprise_value_value} / ${est.me_measured_indicated_total_aueq_moz}M oz = ${value.toFixed(2)}/oz`);
                return value;
            }
            return null;
        };
    }
    
    if (availableColumns.has('mkt_cap_per_mi_oz_all') && mineralEstimateColumns.has('me_measured_indicated_total_aueq_moz')) {
        calculators['mkt_cap_per_mi_oz_all'] = (finUSD, est, prod, existingVal, localLogger) => {
            if (existingVal.mkt_cap_per_mi_oz_all !== null && existingVal.mkt_cap_per_mi_oz_all !== undefined) return null;
            if (isValidFiniteNumber(finUSD.market_cap_value) && isValidFiniteNumber(est.me_measured_indicated_total_aueq_moz) && est.me_measured_indicated_total_aueq_moz > 0) {
                const value = finUSD.market_cap_value / (est.me_measured_indicated_total_aueq_moz * 1000000);
                localLogger.debug(`Calculated mkt_cap_per_mi_oz_all: ${finUSD.market_cap_value} / ${est.me_measured_indicated_total_aueq_moz}M oz = ${value.toFixed(2)}/oz`);
                return value;
            }
            return null;
        };
    }
    
    // MI metrics for precious metals
    if (availableColumns.has('ev_per_mi_oz_precious') && mineralEstimateColumns.has('me_measured_indicated_precious_aueq_moz')) {
        calculators['ev_per_mi_oz_precious'] = (finUSD, est, prod, existingVal, localLogger) => {
            if (existingVal.ev_per_mi_oz_precious !== null && existingVal.ev_per_mi_oz_precious !== undefined) return null;
            if (isValidFiniteNumber(finUSD.enterprise_value_value) && isValidFiniteNumber(est.me_measured_indicated_precious_aueq_moz) && est.me_measured_indicated_precious_aueq_moz > 0) {
                const value = finUSD.enterprise_value_value / (est.me_measured_indicated_precious_aueq_moz * 1000000);
                localLogger.debug(`Calculated ev_per_mi_oz_precious: ${finUSD.enterprise_value_value} / ${est.me_measured_indicated_precious_aueq_moz}M oz = ${value.toFixed(2)}/oz`);
                return value;
            }
            return null;
        };
    }
    
    if (availableColumns.has('mkt_cap_per_mi_oz_precious') && mineralEstimateColumns.has('me_measured_indicated_precious_aueq_moz')) {
        calculators['mkt_cap_per_mi_oz_precious'] = (finUSD, est, prod, existingVal, localLogger) => {
            if (existingVal.mkt_cap_per_mi_oz_precious !== null && existingVal.mkt_cap_per_mi_oz_precious !== undefined) return null;
            if (isValidFiniteNumber(finUSD.market_cap_value) && isValidFiniteNumber(est.me_measured_indicated_precious_aueq_moz) && est.me_measured_indicated_precious_aueq_moz > 0) {
                const value = finUSD.market_cap_value / (est.me_measured_indicated_precious_aueq_moz * 1000000);
                localLogger.debug(`Calculated mkt_cap_per_mi_oz_precious: ${finUSD.market_cap_value} / ${est.me_measured_indicated_precious_aueq_moz}M oz = ${value.toFixed(2)}/oz`);
                return value;
            }
            return null;
        };
    }
    
    // Mineable ounces metrics
    if (availableColumns.has('ev_per_mineable_oz_all') && mineralEstimateColumns.has('me_mineable_total_aueq_moz')) {
        calculators['ev_per_mineable_oz_all'] = (finUSD, est, prod, existingVal, localLogger) => {
            if (existingVal.ev_per_mineable_oz_all !== null && existingVal.ev_per_mineable_oz_all !== undefined) return null;
            if (isValidFiniteNumber(finUSD.enterprise_value_value) && isValidFiniteNumber(est.me_mineable_total_aueq_moz) && est.me_mineable_total_aueq_moz > 0) {
                const value = finUSD.enterprise_value_value / (est.me_mineable_total_aueq_moz * 1000000);
                localLogger.debug(`Calculated ev_per_mineable_oz_all: ${finUSD.enterprise_value_value} / ${est.me_mineable_total_aueq_moz}M oz = ${value.toFixed(2)}/oz`);
                return value;
            }
            return null;
        };
    }
    
    if (availableColumns.has('mkt_cap_per_mineable_oz_all') && mineralEstimateColumns.has('me_mineable_total_aueq_moz')) {
        calculators['mkt_cap_per_mineable_oz_all'] = (finUSD, est, prod, existingVal, localLogger) => {
            if (existingVal.mkt_cap_per_mineable_oz_all !== null && existingVal.mkt_cap_per_mineable_oz_all !== undefined) return null;
            if (isValidFiniteNumber(finUSD.market_cap_value) && isValidFiniteNumber(est.me_mineable_total_aueq_moz) && est.me_mineable_total_aueq_moz > 0) {
                const value = finUSD.market_cap_value / (est.me_mineable_total_aueq_moz * 1000000);
                localLogger.debug(`Calculated mkt_cap_per_mineable_oz_all: ${finUSD.market_cap_value} / ${est.me_mineable_total_aueq_moz}M oz = ${value.toFixed(2)}/oz`);
                return value;
            }
            return null;
        };
    }
    
    // Mineable precious metals
    if (availableColumns.has('ev_per_mineable_oz_precious') && mineralEstimateColumns.has('me_mineable_precious_aueq_moz')) {
        calculators['ev_per_mineable_oz_precious'] = (finUSD, est, prod, existingVal, localLogger) => {
            if (existingVal.ev_per_mineable_oz_precious !== null && existingVal.ev_per_mineable_oz_precious !== undefined) return null;
            if (isValidFiniteNumber(finUSD.enterprise_value_value) && isValidFiniteNumber(est.me_mineable_precious_aueq_moz) && est.me_mineable_precious_aueq_moz > 0) {
                const value = finUSD.enterprise_value_value / (est.me_mineable_precious_aueq_moz * 1000000);
                localLogger.debug(`Calculated ev_per_mineable_oz_precious: ${finUSD.enterprise_value_value} / ${est.me_mineable_precious_aueq_moz}M oz = ${value.toFixed(2)}/oz`);
                return value;
            }
            return null;
        };
    }
    
    if (availableColumns.has('mkt_cap_per_mineable_oz_precious') && mineralEstimateColumns.has('me_mineable_precious_aueq_moz')) {
        calculators['mkt_cap_per_mineable_oz_precious'] = (finUSD, est, prod, existingVal, localLogger) => {
            if (existingVal.mkt_cap_per_mineable_oz_precious !== null && existingVal.mkt_cap_per_mineable_oz_precious !== undefined) return null;
            if (isValidFiniteNumber(finUSD.market_cap_value) && isValidFiniteNumber(est.me_mineable_precious_aueq_moz) && est.me_mineable_precious_aueq_moz > 0) {
                const value = finUSD.market_cap_value / (est.me_mineable_precious_aueq_moz * 1000000);
                localLogger.debug(`Calculated mkt_cap_per_mineable_oz_precious: ${finUSD.market_cap_value} / ${est.me_mineable_precious_aueq_moz}M oz = ${value.toFixed(2)}/oz`);
                return value;
            }
            return null;
        };
    }
    
    return calculators;
}

// Enhanced helper to log missing required columns
function logMissingColumns(table, requiredColumns, availableColumns) {
    const missing = requiredColumns.filter(col => !availableColumns.has(col));
    if (missing.length > 0) {
        logger.warn(`Table ${table} is missing columns: ${missing.join(', ')}`);
        updateTracker.skippedMetrics.push({
            metric: `${table}_calculations`,
            reason: `Missing columns: ${missing.join(', ')}`
        });
    }
}

// Helper to validate financial data consistency
function validateFinancialConsistency(finRecord, localLogger) {
    const warnings = [];
    
    // Check if market cap makes sense given shares outstanding
    if (isValidFiniteNumber(finRecord.f_market_cap_value) && isValidFiniteNumber(finRecord.f_shares_outstanding)) {
        const impliedSharePrice = finRecord.f_market_cap_value / finRecord.f_shares_outstanding;
        if (impliedSharePrice < 0.001 || impliedSharePrice > 100000) {
            warnings.push(`Suspicious implied share price: ${impliedSharePrice.toFixed(4)}`);
        }
    }
    
    // Check if enterprise value makes sense
    if (isValidFiniteNumber(finRecord.f_enterprise_value_value) && isValidFiniteNumber(finRecord.f_market_cap_value)) {
        const evToMcap = finRecord.f_enterprise_value_value / finRecord.f_market_cap_value;
        if (evToMcap < 0.1 || evToMcap > 10) {
            warnings.push(`Unusual EV/Market Cap ratio: ${evToMcap.toFixed(2)}`);
        }
    }
    
    // Check for negative revenues or other impossible values
    if (isValidFiniteNumber(finRecord.f_revenue_value) && finRecord.f_revenue_value < 0) {
        warnings.push('Negative revenue detected');
    }
    
    if (warnings.length > 0) {
        localLogger.warn(`Data quality concerns: ${warnings.join(', ')}`);
        updateTracker.warnings.push({
            company_id: finRecord.company_id,
            warning: `Data quality: ${warnings.join(', ')}`
        });
    }
    
    return warnings.length === 0;
}

// Main calculation function
async function calculateAndPopulateMetrics() {
    logger.info("Starting enhanced derived metrics calculation process...", { step: 'INIT_METRIC_CALCULATION' });
    logger.info(`Script configuration: BATCH_SIZE=${BATCH_UPDATE_SIZE}, MAX_PE=${MAX_REASONABLE_PE_RATIO}, MAX_EV_MULTIPLE=${MAX_REASONABLE_EV_MULTIPLE}`);

    await loadExchangeRates();

    // Discover schemas first
    logger.info("Discovering table schemas...", { step: 'SCHEMA_DISCOVERY' });
    schemaCache.financials = await discoverTableSchema('financials');
    schemaCache.valuation_metrics = await discoverTableSchema('valuation_metrics');
    schemaCache.mineral_estimates = await discoverTableSchema('mineral_estimates');
    schemaCache.production = await discoverTableSchema('production');

    // Get dynamic calculators based on available columns
    const financialRatioCalculators = getFinancialRatioCalculators(schemaCache.financials);
    const valuationMetricCalculators = getValuationMetricCalculators(
        schemaCache.valuation_metrics, 
        schemaCache.mineral_estimates,
        schemaCache.production
    );
    
    logger.info(`Configured ${Object.keys(financialRatioCalculators).length} financial ratio calculators`);
    logger.info(`Configured ${Object.keys(valuationMetricCalculators).length} valuation metric calculators`);
    
    // Log available columns for debugging
    logger.debug(`Financial columns available: ${Array.from(schemaCache.financials).join(', ')}`);
    logger.debug(`Valuation metrics columns available: ${Array.from(schemaCache.valuation_metrics).join(', ')}`);
    logger.debug(`Mineral estimates columns available: ${Array.from(schemaCache.mineral_estimates).join(', ')}`);
    logger.debug(`Production columns available: ${Array.from(schemaCache.production).join(', ')}`);

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
            // Validate financial data consistency
            validateFinancialConsistency(finRecord, localLogger);
            
            const financialUpdatePayload = { company_id };
            let hasNewFinancialRatios = false;
            const calculatedRatios = [];
            
            for (const [ratioKey, calculator] of Object.entries(financialRatioCalculators)) {
                const calculatedValue = calculator(finRecord, localLogger);
                if (calculatedValue !== null) {
                    if (isValidFiniteNumber(calculatedValue) && isReasonableRatio(calculatedValue, ratioKey, localLogger)) {
                        financialUpdatePayload[ratioKey] = calculatedValue;
                        hasNewFinancialRatios = true;
                        calculatedRatios.push(`${ratioKey}=${calculatedValue.toFixed(2)}`);
                    } else if (isValidFiniteNumber(calculatedValue)) {
                        localLogger.warn(`Calculated ${ratioKey}=${calculatedValue} but value failed reasonableness check`);
                        updateTracker.warnings.push({
                            company_id,
                            warning: `${ratioKey} value ${calculatedValue} outside reasonable range`
                        });
                    }
                }
            }
            
            if (hasNewFinancialRatios) {
                financialUpdatePayload.f_last_updated = new Date().toISOString();
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
                    finRecord.f_market_cap_value, 
                    finRecord.f_market_cap_currency, 
                    `MarketCap_C${company_id}`, 
                    localLogger
                ),
                enterprise_value_value: convertToUSD(
                    finRecord.f_enterprise_value_value, 
                    finRecord.f_enterprise_value_currency, 
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
                        existingValuationRecord,
                        localLogger
                    );
                    
                    if (isValidFiniteNumber(calculatedValue) && isReasonableRatio(calculatedValue, metricKey, localLogger)) {
                        valuationUpdatePayload[metricKey] = calculatedValue;
                        hasNewValuationMetrics = true;
                        calculatedMetrics.push(`${metricKey}=${calculatedValue.toFixed(2)}`);
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
                logger.error(`Error updating financials batch ${Math.floor(i / BATCH_UPDATE_SIZE) + 1}:`, { 
                    message: error.message, 
                    details: error.details,
                    code: error.code,
                    hint: error.hint
                });
                updateTracker.errors.push({
                    batch: `financials_${Math.floor(i / BATCH_UPDATE_SIZE) + 1}`,
                    error: error.message
                });
            } else {
                logger.info(`Successfully updated financials batch ${Math.floor(i / BATCH_UPDATE_SIZE) + 1} (${batch.length} records)`);
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
                logger.error(`Error updating valuation metrics batch ${Math.floor(i / BATCH_UPDATE_SIZE) + 1}:`, { 
                    message: error.message, 
                    details: error.details,
                    code: error.code,
                    hint: error.hint
                });
                updateTracker.errors.push({
                    batch: `valuations_${Math.floor(i / BATCH_UPDATE_SIZE) + 1}`,
                    error: error.message
                });
            } else {
                logger.info(`Successfully updated valuation metrics batch ${Math.floor(i / BATCH_UPDATE_SIZE) + 1} (${batch.length} records)`);
            }
        }
    } else {
        logger.info("No valuation metrics were calculated");
    }

    // Generate detailed report
    generateDetailedReport();
}