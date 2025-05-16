// update_supabase_from_yahoo.cjs
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const yahooFinance = require('yahoo-finance2').default;
const winston = require('winston');
const path = require('path');
const fs = require('fs');
const cron = require('node-cron');

// --- Configuration ---
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const LOG_DIR = path.resolve(__dirname, 'logs_yahoo_updater');
const LOCK_FILE = path.join(__dirname, 'update_supabase_from_yahoo.lock');
const LOCK_FILE_TIMEOUT = 23 * 60 * 60 * 1000; 

const PRICE_CHANGE_WARN_THRESHOLD = parseFloat(process.env.PRICE_CHANGE_WARN_THRESHOLD) || 0.30; // 30%
const RETRY_COUNT = parseInt(process.env.RETRY_COUNT) || 2;
const RETRY_DELAY_MS = parseInt(process.env.RETRY_DELAY_MS) || 3000;
const CRON_SCHEDULE = process.env.YAHOO_CRON_SCHEDULE || '30 4 * * *'; 
const CRON_TIMEZONE = process.env.YAHOO_CRON_TIMEZONE || "Etc/UTC";
const FETCH_TIMEOUT_MS = parseInt(process.env.FETCH_TIMEOUT_MS) || 40000;
const LOG_PROGRESS_INTERVAL = 20; // Adjusted for potentially longer runs

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
        winston.format.printf(({ timestamp, level, message, company_id, ticker, step, ...rest }) => {
            let log = `${timestamp} [${level.toUpperCase()}]`;
            if (company_id) log += ` [CompID: ${company_id}]`;
            if (ticker) log += ` [${ticker || 'NoTicker'}]`;
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
            format: winston.format.combine(winston.format.colorize(), winston.format.printf(({ timestamp, level, message, company_id, ticker, step }) => {
                let log = `${timestamp} [${level}]`;
                if (company_id) log += ` [CompID: ${company_id}]`;
                if (ticker) log += ` [${ticker || 'NoTicker'}]`;
                if (step) log += ` [Step: ${step}]`;
                log += `: ${message}`;
                return log;
            }))
        }),
        new winston.transports.File({ filename: path.join(LOG_DIR, 'yahoo_updater.log'), maxsize: 10485760, maxFiles: 5, tailable: true, level: 'debug' }),
        new winston.transports.File({ filename: path.join(LOG_DIR, 'yahoo_updater_errors.log'), level: 'error', maxsize: 10485760, maxFiles: 5 })
    ],
    exceptionHandlers: [new winston.transports.File({ filename: path.join(LOG_DIR, 'yahoo_updater_exceptions.log') })],
    rejectionHandlers: [new winston.transports.File({ filename: path.join(LOG_DIR, 'yahoo_updater_rejections.log') })]
});

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    logger.error("Supabase URL or Service Key is missing. Check .env file. Exiting.");
    process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
logger.info("Supabase client initialized.");

// --- Utility Functions ---
function delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

function isValidNumber(value) {
    return typeof value === 'number' && !isNaN(value) && isFinite(value);
}

function sanitizeFiniteNumber(value) {
    if (value === null || value === undefined) return null;
    let num;
    if (typeof value === 'number') { num = value; }
    else if (typeof value === 'string') {
        const cleaned = value.replace(/[, ]/g, '');
        if (cleaned === '' || cleaned === '-' || cleaned === '.') return null;
        num = parseFloat(cleaned);
    } else if (typeof value === 'object' && value !== null && 'raw' in value && value.raw !== undefined) {
        return sanitizeFiniteNumber(value.raw);
    } else { return null; }
    return Number.isFinite(num) ? num : null;
}

async function retryOperation(fn, operationName, ticker, retries = RETRY_COUNT, baseDelay = RETRY_DELAY_MS) {
    const localLogger = logger.child({ ticker, operation: operationName, company_id: undefined });
    for (let i = 0; i <= retries; i++) {
        if (isShuttingDown) {
            localLogger.warn(`Operation aborted due to shutdown signal.`);
            throw new Error(`Operation ${operationName} aborted for ${ticker}.`);
        }
        try {
            localLogger.debug(`Attempting, try ${i + 1}/${retries + 1}...`);
            const result = await fn();
            localLogger.debug(`Success (try ${i + 1}).`);
            return result;
        } catch (e) {
            const statusCode = e?.response?.status || (e?.name === 'AbortError' ? 'Timeout' : 'UnknownError');
            const isHttpClientError = typeof statusCode === 'number' && statusCode >= 400 && statusCode < 500 && statusCode !== 429;
            if (i === retries || isHttpClientError) {
                const reason = isHttpClientError ? `Client Error ${statusCode}` : (e?.name === 'AbortError' ? 'Timeout' : `Max retries or unrecoverable error`);
                localLogger.error(`Failed (${reason}): ${e.message}`, { stackShort: e.stack?.substring(0,300) });
                return null; 
            }
            const delayMs = baseDelay * Math.pow(2, i) + Math.random() * (baseDelay / 2);
            localLogger.warn(`Error: ${e.message}. Retry ${i + 1}/${retries} in ${Math.round(delayMs)}ms...`);
            await delay(delayMs);
        }
    }
    localLogger.error(`Fell through retry loop for ${operationName}, this should not happen.`);
    return null; 
}

// --- Exchange Rate Functions ---
async function loadExchangeRates() {
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
        logger.warn('Using hardcoded fallback exchange rates due to fetch error. Currency conversions might be inaccurate.');
        exchangeRatesCache = { CAD: { USD: 0.73 }, AUD: { USD: 0.66 }, USD: { CAD: 1.37 } }; 
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
        localLogger.debug(`Cannot convert to USD for ${operationContext}: invalid input value ("${value}").`);
        return null;
    }
    if (!currency) {
        localLogger.warn(`No currency provided for value ${numericValue} in ${operationContext}. Assuming USD as it's the target.`);
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

// --- Data Fetching ---
async function fetchYahooDataWithTimeout(ticker, modules) {
    const tickerLogger = logger.child({ ticker, step: 'fetchYahooData' });
    const controller = new AbortController();
    const timeoutId = setTimeout(() => { controller.abort(); }, FETCH_TIMEOUT_MS);

    try {
        tickerLogger.debug(`Workspaceing quoteSummary with modules: ${modules.join(', ')}`);
        const quoteSummary = await yahooFinance.quoteSummary(ticker, { modules }, {
            devel: process.env.NODE_ENV === 'development' ? 'long' : undefined,
            fetchOptions: { signal: controller.signal }
        });
        
        let latestHistorical = null;
        try {
            const today = new Date();
            const sevenDaysAgo = new Date(today);
            sevenDaysAgo.setDate(today.getDate() - 7);

            tickerLogger.debug(`Workspaceing historical data from ${sevenDaysAgo.toISOString().split('T')[0]} to ${today.toISOString().split('T')[0]}.`);
            const historicalRecent = await yahooFinance.historical(ticker, {
                period1: sevenDaysAgo.toISOString().split('T')[0],
                period2: today.toISOString().split('T')[0],
                interval: '1d',
            }, { devel: process.env.NODE_ENV === 'development' ? 'long' : undefined, fetchOptions: { signal: controller.signal }});

            if (historicalRecent && historicalRecent.length > 0) {
                const validHistoricalEntries = historicalRecent.filter(day => isValidNumber(day.close));
                if (validHistoricalEntries.length > 0) {
                    latestHistorical = validHistoricalEntries[validHistoricalEntries.length - 1]; 
                    tickerLogger.debug(`Workspaceed latest valid historical day: Date=${new Date(latestHistorical.date).toISOString().split('T')[0]}, Close=${latestHistorical.close}`);
                } else {
                    tickerLogger.warn(`No valid (non-null close) historical data entries found in the last 7 days.`);
                }
            } else {
                tickerLogger.warn(`No historical data array returned for the last 7 days.`);
            }
        } catch (histError) {
            tickerLogger.warn(`Could not fetch historical data: ${histError.message}`);
        }
        
        clearTimeout(timeoutId);
        return { quoteSummary, latestHistoricalData: latestHistorical };
    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            tickerLogger.warn(`Yahoo Finance request timed out for ${ticker} after ${FETCH_TIMEOUT_MS / 1000}s`);
        } else {
            tickerLogger.error(`Error in yahooFinance call for ${ticker}: ${error.message}`, { code: error.code });
        }
        throw error; 
    }
}

// --- Database Update Functions ---
async function updateStockPriceEntry(companyId, tickerUsed, priceData) {
    const localLogger = logger.child({ company_id: companyId, ticker: tickerUsed, step: 'UPDATE_STOCK_PRICE' });
    
    const {
        price_date_obj, // Expecting a JS Date object
        price_value,
        price_currency,
        data_source = 'Yahoo Finance' 
    } = priceData;

    const sanitizedPrice = sanitizeFiniteNumber(price_value);
    const finalCurrency = price_currency?.toUpperCase() || 'USD'; 
    let errorMessageForStatus = ''; 
    let dateForDb = ""; // Initialize to ensure it's defined for logging in catch block

    if (sanitizedPrice === null || sanitizedPrice <= 0) {
        errorMessageForStatus = `Invalid or zero price ("${price_value}") received.`;
        localLogger.warn(`${errorMessageForStatus} Skipping stock_prices update.`);
        return { updated: false, skippedDueToInvalidData: true, errorMessage: errorMessageForStatus };
    }
    if (!price_date_obj || !(price_date_obj instanceof Date) || isNaN(price_date_obj.getTime())) {
        errorMessageForStatus = `Invalid or missing Date object for price_date. Value: "${String(price_date_obj)}"`;
        localLogger.warn(`${errorMessageForStatus} Skipping stock_prices update.`);
        return { updated: false, skippedDueToInvalidData: true, errorMessage: errorMessageForStatus };
    }
    
    // Normalize to 'YYYY-MM-DD' string. This is crucial for DATE type column and ON CONFLICT.
    dateForDb = price_date_obj.toISOString().split('T')[0]; 

    try {
        // Threshold Check
        const { data: latestDbPriceData, error: latestPriceError } = await supabase
            .from('stock_prices')
            .select('price_value, price_currency, price_date, data_source')
            .eq('company_id', companyId)
            .order('price_date', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (latestPriceError) {
            localLogger.warn(`Could not fetch latest DB price for threshold check: ${latestPriceError.message}. Proceeding cautiously.`);
        } else if (latestDbPriceData && isValidNumber(latestDbPriceData.price_value)) {
            const latestDbPriceVal = latestDbPriceData.price_value;
            const latestDbPriceCurrency = latestDbPriceData.price_currency?.toUpperCase();
            const latestDbPriceDateDay = String(latestDbPriceData.price_date); // DB 'DATE' type comes as 'YYYY-MM-DD'
            
            let performThresholdCheck = true; 
            if (dateForDb === latestDbPriceDateDay && data_source === latestDbPriceData.data_source) {
                 performThresholdCheck = false;
                 localLogger.debug(`New price is for same date (${dateForDb}) and source (${data_source}) as latest DB price. Threshold check bypassed as upsert will handle potential value update.`);
            }

            if (performThresholdCheck) {
                const newPriceUSD = convertToUSD(sanitizedPrice, finalCurrency, `NewPriceThresh for ${tickerUsed}`, localLogger);
                const latestDbPriceUSD = convertToUSD(latestDbPriceVal, latestDbPriceCurrency, `DBPriceThresh for ${tickerUsed}`, localLogger);

                if (isValidNumber(newPriceUSD) && isValidNumber(latestDbPriceUSD) && latestDbPriceUSD > 0) {
                    const denominator = Math.max(Math.abs(latestDbPriceUSD), 0.0001); 
                    const variance = Math.abs(newPriceUSD - latestDbPriceUSD) / denominator;
                    if (variance > PRICE_CHANGE_WARN_THRESHOLD) {
                        if (finalCurrency !== latestDbPriceCurrency) { // If currencies are different and variance is high
                            localLogger.warn(`CURRENCY MISMATCH & HIGH VARIANCE: New price ${sanitizedPrice} ${finalCurrency} (USD ~${newPriceUSD.toFixed(2)}) on ${dateForDb} deviates by ${(variance * 100).toFixed(1)}% from last stored price ${latestDbPriceVal} ${latestDbPriceCurrency} (USD ~${latestDbPriceUSD.toFixed(2)}) on ${latestDbPriceDateDay}. Currencies differ. TRUSTING NEWER YAHOO DATA and proceeding with upsert.`);
                            // Intentional fall-through to upsert
                        } else { // Currencies are the same, high variance is a genuine skip
                            errorMessageForStatus = `New price ${sanitizedPrice} ${finalCurrency} (USD ~${newPriceUSD.toFixed(2)}) on ${dateForDb} deviates by ${(variance * 100).toFixed(1)}% from last stored price ${latestDbPriceVal} ${latestDbPriceCurrency} (USD ~${latestDbPriceUSD.toFixed(2)}) on ${latestDbPriceDateDay}. Exceeds threshold.`;
                            localLogger.warn(`${errorMessageForStatus} Skipping update.`);
                            return { updated: false, skippedDueToThreshold: true, errorMessage: errorMessageForStatus };
                        }
                    }
                } else { 
                    localLogger.warn(`Cannot perform precise threshold check for ${dateForDb} due to currency mismatch (DB: ${latestDbPriceCurrency}, New: ${finalCurrency}) or failed/zero USD conversion for one/both prices. Trusting newer source and proceeding with upsert.`);
                }
            }
        }
        
        const upsertData = {
            company_id: companyId,
            price_date: dateForDb, // 'YYYY-MM-DD' string
            price_value: sanitizedPrice,
            price_currency: finalCurrency,
            data_source: data_source, 
            last_updated: new Date().toISOString() 
        };
        localLogger.debug(`Attempting to upsert stock price:`, upsertData );
        
        const { error: upsertError } = await supabase
            .from('stock_prices')
            .upsert(upsertData, {
                onConflict: 'company_id, price_date, data_source', 
            });

        if (upsertError) {
            errorMessageForStatus = `Error upserting stock price for date ${dateForDb}: ${upsertError.message}`;
            localLogger.error(errorMessageForStatus, { details: upsertError.details, hint: upsertError.hint });
            return { updated: false, error: true, errorMessage: errorMessageForStatus };
        }

        localLogger.info(`Successfully upserted stock price for date ${dateForDb}: ${sanitizedPrice} ${finalCurrency} (Source: ${data_source})`);
        return { updated: true };

    } catch (err) {
        errorMessageForStatus = `Exception during stock_prices update (target date: ${dateForDb || String(price_date_obj)}): ${err.message}`;
        localLogger.error(errorMessageForStatus, { stack: err.stack });
        return { updated: false, error: true, errorMessage: errorMessageForStatus };
    }
}


async function processCompany(company) {
    const { company_id, tsx_code, company_name } = company;
    const localLogger = logger.child({ company_id, ticker: tsx_code });

    if (isShuttingDown) { /* ... */ return { company_id, status: 'shutdown_skip' }; }
    if (!tsx_code || tsx_code.trim() === '') { /* ... */ return { company_id, status: 'skipped_no_ticker' }; }

    localLogger.info(`Processing: "${company_name}" (${tsx_code})`);

    const yahooData = await retryOperation(
        () => fetchYahooDataWithTimeout(tsx_code, ['price', 'summaryDetail']),
        'fetchYahooData',
        tsx_code
    );

    if (!yahooData) {
        localLogger.error(`Failed to fetch any Yahoo data after retries. Skipping all updates.`);
        return { company_id, status: 'yahoo_fetch_failed_completely' };
    }
    
    let priceUpdateStatus = 'pending';
    let priceUpdated = false; 
    let priceResult = { updated: false, errorMessage: 'No price data processed' };

    if (yahooData.latestHistoricalData && isValidNumber(yahooData.latestHistoricalData.close)) {
        const historicalEntry = yahooData.latestHistoricalData;
        if (historicalEntry.date) {
            const priceDateFromHistorical = new Date(historicalEntry.date); 
            if (!isNaN(priceDateFromHistorical.getTime())) {
                priceResult = await updateStockPriceEntry(company_id, tsx_code, {
                    price_date_obj: priceDateFromHistorical, 
                    price_value: historicalEntry.close,
                    price_currency: yahooData.quoteSummary?.price?.currency, 
                    data_source: 'Yahoo Finance - Historical Close'
                });
                priceUpdated = priceResult.updated;
                if (priceResult.updated) priceUpdateStatus = 'updated_historical_close';
                else if (priceResult.skippedDueToInvalidData) priceUpdateStatus = `skipped_invalid_hist_price (${priceResult.errorMessage || ''})`;
                else if (priceResult.skippedDueToExisting) priceUpdateStatus = 'skipped_hist_price_exists';
                else if (priceResult.skippedDueToThreshold) priceUpdateStatus = 'skipped_hist_price_threshold';
                else if (priceResult.error) priceUpdateStatus = `error_hist_price_update: ${priceResult.errorMessage || 'DB error'}`;
                else priceUpdateStatus = 'no_change_hist_price';
            } else {
                priceUpdateStatus = 'skipped_invalid_hist_date_obj';
                localLogger.warn("Invalid date object from historical data. Skipping this entry.", { dateValue: historicalEntry.date });
            }
        } else {
            priceUpdateStatus = 'skipped_missing_hist_date';
            localLogger.warn("Historical data entry missing date. Skipping.");
        }
    } 
    
    if (!priceUpdated && !priceUpdateStatus.startsWith('error')) { 
        if (yahooData.quoteSummary?.price && isValidNumber(yahooData.quoteSummary.price.regularMarketPrice)) {
            localLogger.info("Historical price not updated/available/recent for today. Attempting to use current market price for today.");
            priceResult = await updateStockPriceEntry(company_id, tsx_code, {
                price_date_obj: new Date(), 
                price_value: yahooData.quoteSummary.price.regularMarketPrice,
                price_currency: yahooData.quoteSummary.price.currency,
                data_source: 'Yahoo Finance - Current Market'
            });
            if (priceUpdateStatus === 'pending' || !priceUpdateStatus.includes('hist_price_update_error') || priceUpdateStatus.startsWith('skipped_no_price_data') || priceUpdateStatus.startsWith('no_change')) { 
                if (priceResult.updated) priceUpdateStatus = 'updated_current_market';
                else if (priceResult.skippedDueToInvalidData) priceUpdateStatus = `skipped_invalid_curr_price (${priceResult.errorMessage || ''})`;
                else if (priceResult.skippedDueToExisting) priceUpdateStatus = 'skipped_curr_price_exists';
                else if (priceResult.skippedDueToThreshold) priceUpdateStatus = 'skipped_curr_price_threshold';
                else if (priceResult.error) priceUpdateStatus = `error_curr_price_update: ${priceResult.errorMessage || 'DB error'}`;
                else priceUpdateStatus = 'no_change_curr_price';
            }
        } else {
             if (priceUpdateStatus === 'pending' || !(priceUpdateStatus.includes('hist') && (priceUpdateStatus.includes('error') || priceUpdateStatus.includes('skipped')) ) ) { 
                localLogger.warn("No valid historical closing price OR current market price available from Yahoo Finance to update.");
                priceUpdateStatus = 'skipped_no_price_data_from_yahoo';
             }
        }
    }
    
    try {
        const { error: companyUpdateError } = await supabase
            .from('companies')
            .update({ last_updated: new Date().toISOString() })
            .eq('company_id', company_id);
        if (companyUpdateError) {
            localLogger.error(`Failed to update 'last_updated' for companies table: ${companyUpdateError.message}`);
        }
    } catch (e) {
        localLogger.error(`Exception updating 'last_updated' for companies table: ${e.message}`);
    }

    localLogger.info(`Processing completed. Stock Price Update Status: ${priceUpdateStatus}`);
    return { company_id, status: 'processed', price_status: priceUpdateStatus };
}

async function runUpdater() {
    logger.info(`Yahoo Price Updater Script Started. PID: ${process.pid}`);
    const lockFilePath = path.join(__dirname, 'update_supabase_from_yahoo.lock');

    if (fs.existsSync(lockFilePath)) {
        const lockFileContent = fs.readFileSync(lockFilePath, 'utf8');
        const lockTime = new Date(lockFileContent.split('PID:')[0].replace('Running since: ', '').trim()).getTime();
        if (Date.now() - lockTime < LOCK_FILE_TIMEOUT) {
            logger.warn(`Lock file exists and is recent: ${lockFileContent}. Exiting.`);
            return;
        } else {
            logger.warn(`Stale lock file found: ${lockFileContent}. Removing.`);
            try { fs.unlinkSync(lockFilePath); } catch(e){ logger.error(`Could not remove stale lock file: ${e.message}`)}
        }
    }

    try {
        fs.writeFileSync(lockFilePath, `Running since: ${new Date().toISOString()} PID: ${process.pid}`);
        logger.info('Lock file created.');

        await loadExchangeRates(); 

        const { data: companies, error: companiesError } = await supabase
            .from('companies')
            .select('company_id, tsx_code, company_name')
            .order('company_id', { ascending: true });
            // .limit(5); // REMOVE .limit(5) to run for ALL companies

        if (companiesError) {
            logger.error("CRITICAL: Failed to fetch companies from Supabase:", companiesError);
            throw companiesError;
        }
        if (!companies || companies.length === 0) {
            logger.info("No companies found to process.");
            return;
        }

        logger.info(`Workspaceed ${companies.length} companies for potential updates.`);
        let successCount = 0; let errorCount = 0; let skippedCount = 0;

        for (let i = 0; i < companies.length; i++) {
            if (isShuttingDown) {
                logger.info("Shutdown signal received, stopping company processing loop.");
                break;
            }
            const company = companies[i];
            const result = await processCompany(company); 
            if (result.price_status?.startsWith('updated')) successCount++;
            else if (result.status?.includes('skipped') || result.price_status?.includes('skipped')) skippedCount++;
            else if (result.status?.includes('error') || result.price_status?.includes('error') || result.status === 'yahoo_fetch_failed_completely') errorCount++;

            if ((i + 1) % LOG_PROGRESS_INTERVAL === 0 || i === companies.length - 1) {
                logger.info(`--- Progress: ${i + 1}/${companies.length} companies processed. Price Updates: ${successCount}, Skipped: ${skippedCount}, Errors: ${errorCount} ---`);
            }
            if (i < companies.length - 1 && !isShuttingDown) {
                await delay(750); // Increased delay slightly
            }
        }
        logger.info(`Yahoo data update run finished. Total Processed: ${companies.length}. Successful Price Updates: ${successCount}, Skipped: ${skippedCount}, Errors: ${errorCount}.`);

    } catch (error) {
        logger.error(`Unhandled error in runUpdater: ${error.message}`, { stack: error.stack });
    } finally {
        if (fs.existsSync(lockFilePath)) {
            try { fs.unlinkSync(lockFilePath); logger.info('Lock file removed.'); } 
            catch (e) { logger.error('Error removing lock file on exit:', e); }
        }
        logger.info('Updater script run complete.');
    }
}

// --- Execution & Scheduling ---
const runOnce = process.argv.includes('--once');
const runNowAndSchedule = process.argv.includes('--run-now');
let cronTask = null;

async function gracefulShutdown(signal) { 
    if (isShuttingDown) return;
    isShuttingDown = true;
    logger.warn(`Received ${signal}. Initiating graceful shutdown...`);
    if (cronTask) {
        cronTask.stop();
        logger.info('Cron task stopped.');
    }
    logger.info("Attempting to allow ongoing operations to finish (max 5s)...");
    await delay(5000); 

    if (fs.existsSync(LOCK_FILE)) {
        try { fs.unlinkSync(LOCK_FILE); logger.info('Lock file removed during shutdown.'); }
        catch (e) { logger.error('Error removing lock file during shutdown:', e); }
    }
    logger.info('Shutdown complete. Exiting.');
    process.exit(0);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('uncaughtException', (err, origin) => { 
    logger.error(`UNCAUGHT EXCEPTION: Origin: ${origin}, Error: ${err.message}`, { stack: err.stack });
    if (fs.existsSync(LOCK_FILE)) {
        try { fs.unlinkSync(LOCK_FILE); logger.info('Lock file removed due to uncaught exception.'); }
        catch (e) { logger.error('Error removing lock file on uncaught exception:', e); }
    }
    process.exit(1);
});
process.on('unhandledRejection', async (reason, promise) => { 
    const reasonMessage = reason instanceof Error ? reason.message : String(reason);
    const reasonStack = reason instanceof Error ? reason.stack : undefined;
    logger.error('UNHANDLED PROMISE REJECTION:', { reason: reasonMessage, stack: reasonStack, promise });
    if (fs.existsSync(LOCK_FILE)) {
        try { fs.unlinkSync(LOCK_FILE); logger.info('Lock file removed due to unhandled rejection.'); }
        catch (e) { logger.error('Error removing lock file on unhandled rejection:', e); }
    }
    process.exit(1);
});

if (runOnce) {
    logger.info('Running in --once mode.');
    runUpdater().catch(e => logger.error(`Error in --once mode execution: ${e.message}`, {stack: e.stack}));
} else {
    logger.info(`Scheduled mode. Cron Expression: "${CRON_SCHEDULE}" in Timezone: "${CRON_TIMEZONE}".`);
    if (runNowAndSchedule) {
        logger.info("`--run-now` flag detected: Executing initial run immediately...");
        runUpdater().catch(e => logger.error(`Error during initial --run-now execution: ${e.message}`, {stack: e.stack}));
    } else {
        logger.info("Waiting for the next scheduled cron time. Use --run-now or --once to execute immediately.");
    }
    cronTask = cron.schedule(CRON_SCHEDULE, () => {
        logger.info(`Cron job triggered at ${new Date().toISOString()}`);
        if (isShuttingDown) {
            logger.warn("Cron trigger skipped: Shutdown in progress.");
            return;
        }
        runUpdater().catch(e => logger.error(`Error during scheduled cron run: ${e.message}`, {stack: e.stack}));
    }, {
        scheduled: true,
        timezone: CRON_TIMEZONE
    });
    logger.info("Cron job scheduled. Script will keep running unless in --once mode. Press Ctrl+C to exit scheduled mode.");
}