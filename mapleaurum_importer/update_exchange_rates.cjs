// update_exchange_rates.cjs
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios'); // For fetching from exchange rate API
const winston = require('winston');
const path = require('path');
const fs = require('fs');

// --- Configuration ---
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const LOG_DIR = path.resolve(__dirname, 'logs_exchange_rate_updater');
const LOCK_FILE = path.join(__dirname, 'update_exchange_rates.lock');
const LOCK_FILE_TIMEOUT = 1 * 60 * 60 * 1000; // 1 hour timeout for this script

// Define target currencies for which rates against USD and CAD are desired.
const TARGET_CURRENCIES = ['CAD', 'AUD', 'EUR', 'GBP', 'ARS', 'BRL', 'CLP', 'MXN', 'ZAR', 'JPY', 'CNY'];
const BASE_CURRENCY_FOR_API_FETCH = 'USD'; // We will fetch rates against USD from the API
const KEY_COMPARISON_CURRENCIES = ['USD', 'CAD']; // We want to ensure all TARGET_CURRENCIES have rates to/from these

let isShuttingDown = false; // Global flag for graceful shutdown

// Ensure log directory exists
try {
    if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
} catch (err) { console.error(`FATAL: Error creating log directory ${LOG_DIR}:`, err); process.exit(1); }

// --- Logger Setup (Winston) ---
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
        winston.format.errors({ stack: true }), // Log stack trace for errors
        winston.format.printf(({ timestamp, level, message, step, ...rest }) => {
            let log = `${timestamp} [${level.toUpperCase()}]`;
            if (step) log += ` [Step: ${step}]`;
            log += `: ${message}`;
            // Append additional metadata if present
            const filteredRest = { ...rest };
            delete filteredRest.level; delete filteredRest.message; delete filteredRest.timestamp; delete filteredRest.service;
            if (Object.keys(filteredRest).length > 0 && Object.values(filteredRest).some(v => v !== undefined)) {
                try { log += ` ${JSON.stringify(filteredRest)}`; } catch (e) { /* ignore serialization errors */ }
            }
            return log;
        })
    ),
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.printf(({ timestamp, level, message, step }) => {
                    let log = `${timestamp} [${level}]`;
                    if (step) log += ` [Step: ${step}]`;
                    log += `: ${message}`;
                    return log;
                })
            )
        }),
        new winston.transports.File({ filename: path.join(LOG_DIR, 'exchange_rate_updater.log'), maxsize: 5242880, maxFiles: 3, tailable: true, level: 'debug' }),
        new winston.transports.File({ filename: path.join(LOG_DIR, 'exchange_rate_updater_errors.log'), level: 'error', maxsize: 5242880, maxFiles: 3 })
    ],
    exceptionHandlers: [new winston.transports.File({ filename: path.join(LOG_DIR, 'exchange_rate_exceptions.log') })],
    rejectionHandlers: [new winston.transports.File({ filename: path.join(LOG_DIR, 'exchange_rate_rejections.log') })]
});

// --- Supabase Client Initialization ---
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    logger.error("Supabase URL or Service Key is missing in .env file. Script cannot proceed.");
    process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
logger.info("Supabase client initialized for exchange rate updater.");

/**
 * Checks if a value is a valid, finite number and optionally greater than zero.
 * @param {*} value - The value to check.
 * @param {boolean} [mustBePositive=true] - Whether the number must be greater than 0.
 * @returns {boolean}
 */
function isValidNumericRate(value, mustBePositive = true) {
    if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) {
        return false;
    }
    if (mustBePositive && value <= 0) {
        return false;
    }
    return true;
}

/**
 * Fetches latest exchange rates from Frankfurter.app API.
 * @returns {Promise<object|null>} API response data or null on failure.
 */
async function fetchRatesFromFrankfurter() {
    const localLogger = logger.child({ step: 'FETCH_FRANKFURTER_RATES' });
    
    // Ensure TARGET_CURRENCIES and KEY_COMPARISON_CURRENCIES are combined and unique for the API call
    const allUniqueTargetCurrencies = Array.from(new Set([...TARGET_CURRENCIES, ...KEY_COMPARISON_CURRENCIES]));
    const toCurrenciesForApi = allUniqueTargetCurrencies
                                 .filter(tc => tc !== BASE_CURRENCY_FOR_API_FETCH) // Exclude the base currency itself from 'to'
                                 .join(',');
    
    if (!toCurrenciesForApi) {
        localLogger.warn("No target currencies specified for API fetch (after excluding base). This might happen if TARGET_CURRENCIES only contains BASE_CURRENCY.");
        return null;
    }

    const apiUrl = `https://api.frankfurter.app/latest?from=${BASE_CURRENCY_FOR_API_FETCH}&to=${toCurrenciesForApi}`;
    
    localLogger.info(`Workspaceing exchange rates from Frankfurter API: ${apiUrl}`);
    try {
        const response = await axios.get(apiUrl, { timeout: 15000 }); // 15-second timeout
        if (response.data && response.data.rates && response.data.base && response.data.date) {
            localLogger.info(`Successfully fetched rates from Frankfurter. API Base: ${response.data.base}, API Effective Date: ${response.data.date}, Number of rates: ${Object.keys(response.data.rates).length}`);
            return response.data; // Contains {amount, base, date, rates: {CODE: rate_vs_base}}
        } else {
            localLogger.error("Failed to fetch valid data from Frankfurter API. Response missing key fields (base, date, or rates).", { responseData: response.data });
            return null;
        }
    } catch (error) {
        localLogger.error(`Error fetching exchange rates from Frankfurter API: ${error.message}`, {
            url: apiUrl,
            responseData: error.response?.data,
            status: error.response?.status
        });
        return null;
    }
}

/**
 * Main function to update exchange rates in the Supabase database.
 * Fetches rates from API, calculates necessary cross-rates, and upserts them.
 */
async function updateExchangeRatesInSupabase() {
    logger.info("Starting exchange rate update process in Supabase...", { step: 'UPDATE_DB_INIT' });

    const fetchedApiData = await fetchRatesFromFrankfurter();

    if (!fetchedApiData || !fetchedApiData.rates || !fetchedApiData.base || !fetchedApiData.date) {
        logger.error("No valid exchange rate data received from API. Aborting database update.");
        return { success: false, upsertedCount: 0, errorCount: 0, errorMessage: "Failed to fetch data from API" };
    }

    const ratesToUpsert = [];
    // The date the rates are *for*, as reported by the API. This should be 'YYYY-MM-DD'.
    const rateEffectiveDate = fetchedApiData.date; 
    // The timestamp of when this script is running and fetching/inserting the data.
    const currentDbFetchTimestamp = new Date().toISOString(); 

    const apiBase = fetchedApiData.base; // This should be 'USD' as per our API call
    const apiRates = fetchedApiData.rates; // Example: { "CAD": 1.35, "EUR": 0.92, ... } (rates are how much of target currency for 1 unit of base)

    logger.debug(`API reported rates for date: ${rateEffectiveDate} with base ${apiBase}. Raw rates from API:`, apiRates);

    // 1. Store direct rates from API Base (USD) to Target Currencies, and their inverses
    for (const targetCurrency in apiRates) {
        if (Object.prototype.hasOwnProperty.call(apiRates, targetCurrency)) {
            const rateUsdToTarget = apiRates[targetCurrency];
            if (isValidNumericRate(rateUsdToTarget)) {
                // USD -> TargetCurrency
                ratesToUpsert.push({
                    from_currency: apiBase, // e.g., USD
                    to_currency: targetCurrency,
                    rate: rateUsdToTarget,
                    rate_date: rateEffectiveDate,   // Effective date of the rate
                    fetch_date: currentDbFetchTimestamp // When this script got it
                });
                // TargetCurrency -> USD
                ratesToUpsert.push({
                    from_currency: targetCurrency,
                    to_currency: apiBase,
                    rate: 1 / rateUsdToTarget,
                    rate_date: rateEffectiveDate,
                    fetch_date: currentDbFetchTimestamp
                });
            } else {
                logger.warn(`Invalid rate value received from API for ${apiBase}->${targetCurrency}: ${rateUsdToTarget}`);
            }
        }
    }

    // 2. Calculate and store cross-rates involving other KEY_COMPARISON_CURRENCIES (e.g., CAD)
    for (const keyIntermediateCurrency of KEY_COMPARISON_CURRENCIES) {
        if (keyIntermediateCurrency === apiBase) continue; // USD based rates already handled

        const rateApiBaseToIntermediate = apiRates[keyIntermediateCurrency]; // e.g., USD to CAD
        if (!isValidNumericRate(rateApiBaseToIntermediate)) {
            logger.warn(`Rate for ${apiBase}->${keyIntermediateCurrency} is invalid or missing (${rateApiBaseToIntermediate}). Cannot calculate cross-rates via ${keyIntermediateCurrency}.`);
            continue;
        }

        // For every other currency 'X' (that was fetched against USD), calculate rates to/from 'keyIntermediateCurrency'
        for (const finalTargetCurrency in apiRates) {
            if (Object.prototype.hasOwnProperty.call(apiRates, finalTargetCurrency) && 
                finalTargetCurrency !== keyIntermediateCurrency && // Don't calculate CAD->CAD via USD
                finalTargetCurrency !== apiBase) {                // Don't recalculate CAD->USD via USD

                const rateApiBaseToFinalTarget = apiRates[finalTargetCurrency]; // e.g., USD to AUD
                if (isValidNumericRate(rateApiBaseToFinalTarget)) {
                    // Calculate KeyIntermediateCurrency -> FinalTargetCurrency (e.g., CAD -> AUD)
                    // Formula: (KeyIntermediate/FinalTarget) = (KeyIntermediate/apiBase) * (apiBase/FinalTarget)
                    // rate_CAD_AUD = rate_CAD_USD * rate_USD_AUD
                    // rate_CAD_USD = 1 / rate_USD_CAD = 1 / rateApiBaseToIntermediate
                    // rate_USD_AUD = rateApiBaseToFinalTarget
                    const crossRate1 = (1 / rateApiBaseToIntermediate) * rateApiBaseToFinalTarget;
                    if (isValidNumericRate(crossRate1)) {
                        ratesToUpsert.push({
                            from_currency: keyIntermediateCurrency,
                            to_currency: finalTargetCurrency,
                            rate: crossRate1,
                            rate_date: rateEffectiveDate,
                            fetch_date: currentDbFetchTimestamp
                        });
                    }

                    // Calculate FinalTargetCurrency -> KeyIntermediateCurrency (e.g., AUD -> CAD)
                    // rate_AUD_CAD = rate_AUD_USD * rate_USD_CAD
                    // rate_AUD_USD = 1 / rate_USD_AUD = 1 / rateApiBaseToFinalTarget
                    // rate_USD_CAD = rateApiBaseToIntermediate
                    const crossRate2 = (1 / rateApiBaseToFinalTarget) * rateApiBaseToIntermediate;
                    if (isValidNumericRate(crossRate2)) {
                        ratesToUpsert.push({
                            from_currency: finalTargetCurrency,
                            to_currency: keyIntermediateCurrency,
                            rate: crossRate2,
                            rate_date: rateEffectiveDate,
                            fetch_date: currentDbFetchTimestamp
                        });
                    }
                }
            }
        }
    }
    
    // 3. Add self-rates (USD to USD = 1, CAD to CAD = 1, etc.) for all relevant currencies
    const allCurrenciesProcessed = Array.from(new Set([apiBase, ...Object.keys(apiRates), ...TARGET_CURRENCIES, ...KEY_COMPARISON_CURRENCIES]));
    allCurrenciesProcessed.forEach(curr => {
        if (curr && typeof curr === 'string') { // Ensure currency string is not empty/null
            const existingSelfRate = ratesToUpsert.find(r => r.from_currency === curr && r.to_currency === curr && r.rate_date === rateEffectiveDate);
            if (!existingSelfRate) {
                 ratesToUpsert.push({ from_currency: curr, to_currency: curr, rate: 1.0, rate_date: rateEffectiveDate, fetch_date: currentDbFetchTimestamp });
            }
        }
    });

    if (ratesToUpsert.length === 0) {
        logger.info("No exchange rates to upsert after processing API data and calculating cross-rates.");
        return { success: true, upsertedCount: 0, errorCount: 0 };
    }

    // Deduplicate entries just in case the logic above created any for the same (from, to, rate_date)
    const uniqueRatesMap = new Map();
    ratesToUpsert.forEach(rateEntry => {
        const key = `${rateEntry.from_currency}-${rateEntry.to_currency}-${rateEntry.rate_date}`;
        if (!uniqueRatesMap.has(key)) {
            uniqueRatesMap.set(key, rateEntry);
        } else {
            logger.debug(`Duplicate rate generated for key ${key} before final upsert, keeping first: ${JSON.stringify(uniqueRatesMap.get(key))}`);
        }
    });
    const finalRatesToUpsert = Array.from(uniqueRatesMap.values());


    logger.info(`Attempting to upsert ${finalRatesToUpsert.length} unique exchange rate entries for effective date ${rateEffectiveDate}...`, { step: 'UPSERT_RATES' });
    logger.debug("Final rates to upsert (sample of up to 5):", finalRatesToUpsert.slice(0, 5));

    // This relies on the UNIQUE constraint `exchange_rates_pair_rate_date_key` on (from_currency, to_currency, rate_date)
    const { data, error } = await supabase
        .from('exchange_rates')
        .upsert(finalRatesToUpsert, { 
            onConflict: 'from_currency, to_currency, rate_date',
        });

    if (error) {
        logger.error("Error upserting exchange rates to Supabase:", { message: error.message, details: error.details, hint: error.hint });
        if (error.message.includes('no unique or exclusion constraint matching the ON CONFLICT')) {
            logger.error("CRITICAL: The 'exchange_rates' table is missing the UNIQUE constraint on (from_currency, to_currency, rate_date). The upsert will fail. Please run the SQL provided in the README/chat to add it.");
        }
        return { success: false, upsertedCount: 0, errorCount: finalRatesToUpsert.length, errorMessage: error.message };
    }

    // Supabase upsert in JS v2 doesn't reliably return the count of affected rows in `data` for batch operations without `select()`
    // We consider it a success if no error was thrown.
    logger.info(`Successfully processed (upserted/updated) ${finalRatesToUpsert.length} exchange rate entries for effective date ${rateEffectiveDate}.`);
    return { success: true, upsertedCount: finalRatesToUpsert.length, errorCount: 0 };
}

// --- Main Execution Logic ---
async function main() {
    logger.info(`Exchange Rate Updater Script Started. PID: ${process.pid}`);
    const lockFilePath = path.join(__dirname, 'update_exchange_rates.lock');

    if (fs.existsSync(lockFilePath)) {
        const lockFileContent = fs.readFileSync(lockFilePath, 'utf8');
        const lockTime = new Date(lockFileContent.split('PID:')[0].replace('Running since: ', '').trim()).getTime();
        if (Date.now() - lockTime < LOCK_FILE_TIMEOUT) {
            logger.warn(`Lock file exists and is recent: ${lockFileContent}. Another instance might be running. Exiting.`);
            return;
        } else {
            logger.warn(`Stale lock file found: ${lockFileContent}. Removing and proceeding.`);
            try { fs.unlinkSync(lockFilePath); } catch(e){ logger.error(`Could not remove stale lock file: ${e.message}`)}
        }
    }

    try {
        fs.writeFileSync(lockFilePath, `Running since: ${new Date().toISOString()} PID: ${process.pid}`);
        logger.info('Lock file created.');
        
        const result = await updateExchangeRatesInSupabase();
        if (result.success) {
            logger.info(`Exchange rate update process completed. ${result.upsertedCount} rates processed/upserted.`);
        } else {
            logger.error(`Exchange rate update process encountered errors. ${result.errorCount} potential errors. Message: ${result.errorMessage || 'N/A'}`);
        }

    } catch (error) {
        logger.error(`Unhandled error in main execution: ${error.message}`, { stack: error.stack });
        process.exitCode = 1;
    } finally {
        if (fs.existsSync(lockFilePath)) {
            try { fs.unlinkSync(lockFilePath); logger.info('Lock file removed.'); } 
            catch (e) { logger.error('Error removing lock file on exit:', e); }
        }
        logger.info('Exchange Rate Updater script run complete.');
    }
}

// This script is intended for occasional manual runs or scheduled less frequently.
if (require.main === module) {
    main().catch(e => {
        logger.error(`Error in main execution: ${e.message}`, {stack: e.stack});
        if (fs.existsSync(LOCK_FILE)) { try { fs.unlinkSync(LOCK_FILE); } catch (err) { /* ignore */ } }
        process.exit(1);
    });
}

process.on('SIGINT', () => { 
    isShuttingDown = true; 
    logger.warn("SIGINT received. Attempting to shut down gracefully..."); 
    if (fs.existsSync(LOCK_FILE)) { try { fs.unlinkSync(LOCK_FILE); logger.info('Lock file removed on SIGINT.'); } catch(e){} }
    process.exit(0); 
});
process.on('SIGTERM', () => { 
    isShuttingDown = true; 
    logger.warn("SIGTERM received. Attempting to shut down gracefully..."); 
    if (fs.existsSync(LOCK_FILE)) { try { fs.unlinkSync(LOCK_FILE); logger.info('Lock file removed on SIGTERM.'); } catch(e){} }
    process.exit(0); 
});
process.on('uncaughtException', (err, origin) => { 
    logger.error(`UNCAUGHT EXCEPTION: Origin: ${origin}, Error: ${err.message}`, { stack: err.stack });
    if (fs.existsSync(LOCK_FILE)) { try { fs.unlinkSync(LOCK_FILE); } catch (e) { /* ignore */ } }
    process.exit(1);
});
process.on('unhandledRejection', async (reason, promise) => { 
    const reasonMessage = reason instanceof Error ? reason.message : String(reason);
    logger.error('UNHANDLED PROMISE REJECTION:', { reason: reasonMessage });
    if (fs.existsSync(LOCK_FILE)) { try { fs.unlinkSync(LOCK_FILE); } catch (e) { /* ignore */ } }
    process.exit(1);
});