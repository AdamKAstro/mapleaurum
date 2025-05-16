// populate_derived_metrics.cjs
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
const LOCK_FILE_TIMEOUT = 2 * 60 * 60 * 1000; // 2 hours, as this might run longer if data is large
const LOG_PROGRESS_INTERVAL = 50;
const BATCH_UPDATE_SIZE = 50; // How many records to update in a single Supabase call

let isShuttingDown = false;
let exchangeRatesCache = {};

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

// --- Utility Functions ---
function isValidFiniteNumber(value) {
    return typeof value === 'number' && !isNaN(value) && isFinite(value);
}
function sanitizeFiniteNumber(value, allowZero = true) { // Re-include sanitizeFiniteNumber
    if (value === null || value === undefined) return null;
    let num;
    if (typeof value === 'number') { num = value; }
    else if (typeof value === 'string') {
        const cleaned = value.replace(/[, ]/g, '');
        if (cleaned === '' || cleaned === '-' || cleaned === '.') return null;
        num = parseFloat(cleaned);
    } else if (typeof value === 'object' && value !== null && 'raw' in value && value.raw !== undefined) {
        return sanitizeFiniteNumber(value.raw, allowZero);
    } else { return null; }
    if (!Number.isFinite(num)) return null;
    if (!allowZero && num === 0) return null;
    return num;
}


// --- Exchange Rate Functions (copied, ensure it's robust for this script's needs) ---
async function loadExchangeRates() { /* ... (Same as in previous yahoo updater script) ... */
    logger.info('Loading exchange rates from Supabase `exchange_rates` table...', { step: 'LOAD_EXCHANGE_RATES' });
    try {
        const { data: rates, error } = await supabase.from('exchange_rates').select('from_currency, to_currency, rate');
        if (error) throw error;
        exchangeRatesCache = rates.reduce((acc, row) => {
            if (row.from_currency && row.to_currency) {
                if (!acc[row.from_currency]) acc[row.from_currency] = {};
                acc[row.from_currency][row.to_currency] = row.rate;
            }
            return acc;
        }, {});
        logger.info(`Loaded ${rates.length} exchange rates into cache.`);
        if (!getExchangeRate('CAD','USD')){ logger.warn('CAD->USD rate missing from DB, using fallback 0.73'); if(!exchangeRatesCache.CAD)exchangeRatesCache.CAD={}; exchangeRatesCache.CAD.USD=0.73; }
        if (!getExchangeRate('AUD','USD')){ logger.warn('AUD->USD rate missing from DB, using fallback 0.66'); if(!exchangeRatesCache.AUD)exchangeRatesCache.AUD={}; exchangeRatesCache.AUD.USD=0.66; }
    } catch (err) {
        logger.error(`Failed to load exchange rates from Supabase: ${err.message}`, { stack: err.stack });
        logger.warn('Using hardcoded fallback exchange rates. Currency conversions might be inaccurate.');
        exchangeRatesCache = { CAD: { USD: 0.73 }, AUD: { USD: 0.66 }, USD: { CAD: 1.37 } };
    }
}
function getExchangeRate(fromCurrency, toCurrency) { /* ... (Same as in previous yahoo updater script) ... */
    if (!fromCurrency || !toCurrency) return null;
    const from = String(fromCurrency).toUpperCase();
    const to = String(toCurrency).toUpperCase();
    if (from === to) return 1.0;
    return exchangeRatesCache[from]?.[to] || null;
}
function convertToUSD(value, currency, operationContext = 'Conversion', localLogger = logger) { /* ... (Same as in previous yahoo updater script) ... */
    const numericValue = sanitizeFiniteNumber(value); // Use our own sanitizeFiniteNumber
    if (numericValue === null) {
        localLogger.debug(`Cannot convert to USD for ${operationContext}: invalid input value ("${value}").`);
        return null;
    }
    if (!currency) {
        localLogger.warn(`No currency provided for value ${numericValue} in ${operationContext}. Assuming USD.`);
        return numericValue; 
    }
    const upperCurrency = String(currency).toUpperCase();
    if (upperCurrency === 'USD') return numericValue;
    const rate = getExchangeRate(upperCurrency, 'USD');
    if (rate === null) {
        localLogger.error(`Cannot convert ${upperCurrency} to USD for ${operationContext}: Exchange rate (to USD) not found in cache. Value: ${numericValue}`);
        return null;
    }
    return numericValue * rate;
}


// --- Ratio Calculation Definitions ---

const financialRatioCalculators = {
    price_to_sales: (fin) => {
        if (fin.price_to_sales === null && isValidFiniteNumber(fin.market_cap_value) && isValidFiniteNumber(fin.revenue_value) && fin.revenue_value !== 0) {
            return fin.market_cap_value / fin.revenue_value;
        } return null;
    },
    enterprise_to_revenue: (fin) => {
        if (fin.enterprise_to_revenue === null && isValidFiniteNumber(fin.enterprise_value_value) && isValidFiniteNumber(fin.revenue_value) && fin.revenue_value !== 0) {
            return fin.enterprise_value_value / fin.revenue_value;
        } return null;
    },
    enterprise_to_ebitda: (fin) => {
        if (fin.enterprise_to_ebitda === null && isValidFiniteNumber(fin.enterprise_value_value) && isValidFiniteNumber(fin.ebitda) && fin.ebitda !== 0) {
            return fin.enterprise_value_value / fin.ebitda;
        } return null;
    },
    // Add more calculators for financials table here if needed e.g.
    // net_profit_margin, gross_profit_margin, operating_margin (if columns exist)
};

const valuationMetricCalculators = {
    // EV based metrics (ensure EV and Market Cap are in USD)
    ev_per_resource_oz_all: (finUSD, est) => {
        if (est.ev_per_resource_oz_all === null && isValidFiniteNumber(finUSD.enterprise_value_value) && isValidFiniteNumber(est.resources_total_aueq_moz) && est.resources_total_aueq_moz > 0) {
            return finUSD.enterprise_value_value / (est.resources_total_aueq_moz * 1000000);
        } return null;
    },
    ev_per_reserve_oz_all: (finUSD, est) => {
        if (est.ev_per_reserve_oz_all === null && isValidFiniteNumber(finUSD.enterprise_value_value) && isValidFiniteNumber(est.reserves_total_aueq_moz) && est.reserves_total_aueq_moz > 0) {
            return finUSD.enterprise_value_value / (est.reserves_total_aueq_moz * 1000000);
        } return null;
    },
    // ... Add for _precious resources/reserves similarly ...
    ev_per_resource_oz_precious: (finUSD, est) => {
        if (est.ev_per_resource_oz_precious === null && isValidFiniteNumber(finUSD.enterprise_value_value) && isValidFiniteNumber(est.resources_precious_aueq_moz) && est.resources_precious_aueq_moz > 0) {
            return finUSD.enterprise_value_value / (est.resources_precious_aueq_moz * 1000000);
        } return null;
    },
    ev_per_reserve_oz_precious: (finUSD, est) => {
        if (est.ev_per_reserve_oz_precious === null && isValidFiniteNumber(finUSD.enterprise_value_value) && isValidFiniteNumber(est.reserves_precious_aueq_moz) && est.reserves_precious_aueq_moz > 0) {
            return finUSD.enterprise_value_value / (est.reserves_precious_aueq_moz * 1000000);
        } return null;
    },

    // Market Cap based metrics
    mkt_cap_per_resource_oz_all: (finUSD, est) => {
        if (est.mkt_cap_per_resource_oz_all === null && isValidFiniteNumber(finUSD.market_cap_value) && isValidFiniteNumber(est.resources_total_aueq_moz) && est.resources_total_aueq_moz > 0) {
            return finUSD.market_cap_value / (est.resources_total_aueq_moz * 1000000);
        } return null;
    },
    mkt_cap_per_reserve_oz_all: (finUSD, est) => {
        if (est.mkt_cap_per_reserve_oz_all === null && isValidFiniteNumber(finUSD.market_cap_value) && isValidFiniteNumber(est.reserves_total_aueq_moz) && est.reserves_total_aueq_moz > 0) {
            return finUSD.market_cap_value / (est.reserves_total_aueq_moz * 1000000);
        } return null;
    },
    // ... Add for _precious resources/reserves similarly ...
    mkt_cap_per_resource_oz_precious: (finUSD, est) => {
        if (est.mkt_cap_per_resource_oz_precious === null && isValidFiniteNumber(finUSD.market_cap_value) && isValidFiniteNumber(est.resources_precious_aueq_moz) && est.resources_precious_aueq_moz > 0) {
            return finUSD.market_cap_value / (est.resources_precious_aueq_moz * 1000000);
        } return null;
    },
    mkt_cap_per_reserve_oz_precious: (finUSD, est) => {
        if (est.mkt_cap_per_reserve_oz_precious === null && isValidFiniteNumber(finUSD.market_cap_value) && isValidFiniteNumber(est.reserves_precious_aueq_moz) && est.reserves_precious_aueq_moz > 0) {
            return finUSD.market_cap_value / (est.reserves_precious_aueq_moz * 1000000);
        } return null;
    },

    // Production based metrics (koz to oz conversion needed)
    ev_per_production_oz: (finUSD, prod) => {
        if (prod.ev_per_production_oz === null && isValidFiniteNumber(finUSD.enterprise_value_value) && isValidFiniteNumber(prod.current_production_total_aueq_koz) && prod.current_production_total_aueq_koz > 0) {
            return finUSD.enterprise_value_value / (prod.current_production_total_aueq_koz * 1000);
        } return null;
    },
    mkt_cap_per_production_oz: (finUSD, prod) => {
        if (prod.mkt_cap_per_production_oz === null && isValidFiniteNumber(finUSD.market_cap_value) && isValidFiniteNumber(prod.current_production_total_aueq_koz) && prod.current_production_total_aueq_koz > 0) {
            return finUSD.market_cap_value / (prod.current_production_total_aueq_koz * 1000);
        } return null;
    },
    // Add other valuation metrics from your schema like _per_mi_oz_all, _per_mineable_oz_all etc.
    // Make sure the fields like `est.measured_indicated_total_aueq_moz`, `est.mineable_total_aueq_moz` are correct column names.
};


async function calculateAndPopulateMetrics() {
    logger.info("Starting process to calculate and populate NULL financial and valuation metrics...", { step: 'INIT_METRIC_CALCULATION' });

    await loadExchangeRates(); // Ensure rates are fresh

    // 1. Fetch all necessary data
    logger.info("Fetching data from Supabase tables (companies, financials, mineral_estimates, production, valuation_metrics)...", { step: 'FETCH_ALL_DATA' });
    const [
        { data: companiesData, error: companiesError },
        { data: financialsData, error: financialsError },
        { data: mineralEstimatesData, error: estimatesError },
        { data: productionData, error: productionError },
        { data: valuationMetricsData, error: valuationsError }
    ] = await Promise.all([
        supabase.from('companies').select('company_id'), // We only need company_id list to iterate
        supabase.from('financials').select('*'),
        supabase.from('mineral_estimates').select('*'),
        supabase.from('production').select('*'),
        supabase.from('valuation_metrics').select('*')
    ]);

    if (companiesError || financialsError || estimatesError || productionError || valuationsError) {
        logger.error("CRITICAL: Failed to fetch one or more required tables from Supabase.", {
            companiesError: companiesError?.message,
            financialsError: financialsError?.message,
            estimatesError: estimatesError?.message,
            productionError: productionError?.message,
            valuationsError: valuationsError?.message
        });
        return;
    }

    if (!companiesData || companiesData.length === 0) {
        logger.info("No companies found. Exiting metric calculation.");
        return;
    }

    // Create maps for easier lookup
    const financialsMap = new Map(financialsData.map(f => [f.company_id, f]));
    const mineralEstimatesMap = new Map(mineralEstimatesData.map(e => [e.company_id, e]));
    const productionDataMap = new Map(productionData.map(p => [p.company_id, p]));
    const existingValuationMetricsMap = new Map(valuationMetricsData.map(v => [v.company_id, v]));
    
    logger.info(`Data fetched: ${companiesData.length} companies, ${financialsData.length} financials, ${mineralEstimatesData.length} mineral estimates, ${productionData.length} production records, ${valuationMetricsData.length} existing valuation metrics.`);

    const financialsUpdates = [];
    const valuationMetricsUpdates = [];
    let financialsCalculatedCount = 0;
    let valuationsCalculatedCount = 0;

    for (const company of companiesData) {
        if (isShuttingDown) break;
        const company_id = company.company_id;
        const localLogger = logger.child({ company_id, step: 'PROCESS_COMPANY_METRICS' });

        const finRecord = financialsMap.get(company_id);
        const estRecord = mineralEstimatesMap.get(company_id);
        const prodRecord = productionDataMap.get(company_id);
        const existingValuationRecord = existingValuationMetricsMap.get(company_id) || {}; // Default to empty object if no existing record

        // --- Calculate Financial Ratios ---
        if (finRecord) {
            const financialUpdatePayload = { company_id }; // Use company_id as the conflict target for financials table (assuming it's unique/PK)
            let hasNewFinancialRatios = false;
            for (const ratioKey in financialRatioCalculators) {
                if (finRecord[ratioKey] === null || finRecord[ratioKey] === undefined) {
                    const calculatedValue = financialRatioCalculators[ratioKey](finRecord);
                    if (isValidFiniteNumber(calculatedValue)) {
                        financialUpdatePayload[ratioKey] = calculatedValue;
                        hasNewFinancialRatios = true;
                        localLogger.debug(`Financials: Calculated ${ratioKey} = ${calculatedValue}`);
                    }
                }
            }
            if (hasNewFinancialRatios) {
                financialUpdatePayload.last_updated = new Date().toISOString(); // Update timestamp
                financialsUpdates.push(financialUpdatePayload);
                financialsCalculatedCount++;
            }
        } else {
            localLogger.warn("No financials record found for this company. Skipping financial ratio calculations.");
        }

        // --- Calculate Valuation Metrics ---
        if (finRecord && (estRecord || prodRecord)) { // Need financials, and either estimates or production
            const valuationUpdatePayload = { company_id }; // Use company_id as conflict target
            let hasNewValuationMetrics = false;

            // Convert financials to USD for valuation metric calculations
            const finRecordUSD = {
                market_cap_value: convertToUSD(finRecord.market_cap_value, finRecord.market_cap_currency, `ValuationCalc_MCap_C${company_id}`, localLogger),
                enterprise_value_value: convertToUSD(finRecord.enterprise_value_value, finRecord.enterprise_value_currency, `ValuationCalc_EV_C${company_id}`, localLogger)
            };

            if (isValidFiniteNumber(finRecordUSD.market_cap_value) || isValidFiniteNumber(finRecordUSD.enterprise_value_value)) {
                for (const metricKey in valuationMetricCalculators) {
                    if (existingValuationRecord[metricKey] === null || existingValuationRecord[metricKey] === undefined) {
                        // Pass relevant records to the calculator
                        const calculatedValue = valuationMetricCalculators[metricKey](
                            finRecordUSD, // Pass financials potentially converted to USD
                            estRecord || {},  // Pass empty object if no estimate record
                            prodRecord || {}  // Pass empty object if no production record
                        );
                        if (isValidFiniteNumber(calculatedValue)) {
                            valuationUpdatePayload[metricKey] = calculatedValue;
                            hasNewValuationMetrics = true;
                            localLogger.debug(`ValuationMetrics: Calculated ${metricKey} = ${calculatedValue}`);
                        }
                    }
                }
            } else {
                localLogger.warn(`MarketCapUSD or EV_USD is not valid for company_id ${company_id}. Skipping valuation metrics. MCapUSD: ${finRecordUSD.market_cap_value}, EV_USD: ${finRecordUSD.enterprise_value_value}`);
            }


            if (hasNewValuationMetrics) {
                valuationUpdatePayload.last_updated = new Date().toISOString();
                valuationMetricsUpdates.push(valuationUpdatePayload);
                valuationsCalculatedCount++;
            }
        } else {
            localLogger.debug("Missing financials, mineral_estimates, or production data. Skipping valuation metric calculations.");
        }
    }

    // Batch update Supabase
    if (financialsUpdates.length > 0) {
        logger.info(`Attempting to batch update ${financialsUpdates.length} financials records...`, { step: 'BATCH_UPDATE_FINANCIALS' });
        const { error } = await supabase.from('financials').upsert(financialsUpdates, { onConflict: 'company_id' }); // Assumes company_id is unique/PK
        if (error) {
            logger.error("Error batch updating financials:", { message: error.message, details: error.details });
            if (error.message.includes('no unique or exclusion constraint matching the ON CONFLICT')) {
                 logger.error("CRITICAL: The 'financials' table is missing a UNIQUE constraint on 'company_id' for upsert.");
            }
        } else {
            logger.info(`Successfully batch updated/inserted ${financialsCalculatedCount} financials records with new ratios.`);
        }
    } else {
        logger.info("No new financial ratios were calculated to update.");
    }

    if (valuationMetricsUpdates.length > 0) {
        logger.info(`Attempting to batch update ${valuationMetricsUpdates.length} valuation_metrics records...`, { step: 'BATCH_UPDATE_VALUATIONS' });
        const { error } = await supabase.from('valuation_metrics').upsert(valuationMetricsUpdates, { onConflict: 'company_id' }); // Assumes company_id is unique/PK
        if (error) {
            logger.error("Error batch updating valuation_metrics:", { message: error.message, details: error.details });
            if (error.message.includes('no unique or exclusion constraint matching the ON CONFLICT')) {
                 logger.error("CRITICAL: The 'valuation_metrics' table is missing a UNIQUE constraint on 'company_id' for upsert.");
            }
        } else {
            logger.info(`Successfully batch updated/inserted ${valuationsCalculatedCount} valuation_metrics records.`);
        }
    } else {
        logger.info("No new valuation metrics were calculated to update.");
    }

    logger.info("Derived metrics calculation and population script finished.");
}

// --- Main Execution Logic ---
async function main() {
    logger.info(`Derived Metrics Calculator Script Started. PID: ${process.pid}`);
    const lockFilePath = path.join(__dirname, 'populate_derived_metrics.lock');

    if (fs.existsSync(lockFilePath)) { /* ... (Lock file check as before) ... */ }

    try {
        fs.writeFileSync(lockFilePath, `Running since: ${new Date().toISOString()} PID: ${process.pid}`);
        logger.info('Lock file created.');
        await calculateAndPopulateMetrics();
    } catch (error) {
        logger.error(`Unhandled error in main execution: ${error.message}`, { stack: error.stack });
        process.exitCode = 1;
    } finally {
        if (fs.existsSync(lockFilePath)) {
            try { fs.unlinkSync(lockFilePath); logger.info('Lock file removed.'); } 
            catch (e) { logger.error('Error removing lock file on exit:', e); }
        }
        logger.info('Derived Metrics Calculator script run complete.');
    }
}

// This script is intended for manual or less frequent runs, so no cron scheduling by default.
// You can add it if needed, similar to the other scripts.
if (require.main === module) {
    main().catch(e => {
        logger.error(`Error in main execution: ${e.message}`, {stack: e.stack});
        if (fs.existsSync(LOCK_FILE)) { try { fs.unlinkSync(LOCK_FILE); } catch (err) { /* ignore */ } }
        process.exit(1);
    });
}

process.on('SIGINT', () => { isShuttingDown = true; logger.warn("SIGINT received. Attempting to stop processing..."); });
process.on('SIGTERM', () => { isShuttingDown = true; logger.warn("SIGTERM received. Attempting to stop processing..."); });
// Basic unhandled rejection/exception loggers
process.on('uncaughtException', (err, origin) => { 
    logger.error(`UNCAUGHT EXCEPTION: Origin: ${origin}, Error: ${err.message}`, { stack: err.stack });
    process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => { 
    const reasonMessage = reason instanceof Error ? reason.message : String(reason);
    logger.error('UNHANDLED PROMISE REJECTION:', { reason: reasonMessage });
    process.exit(1);
});