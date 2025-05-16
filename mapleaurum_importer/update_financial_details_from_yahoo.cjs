// update_financial_details_from_yahoo.cjs
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

const LOG_DIR = path.resolve(__dirname, 'logs_financial_details_updater');
const LOCK_FILE = path.join(__dirname, 'update_financial_details.lock');
const LOCK_FILE_TIMEOUT = 23 * 60 * 60 * 1000; 

const RETRY_COUNT = parseInt(process.env.FIN_DETAIL_RETRY_COUNT) || 2;
const RETRY_DELAY_MS = parseInt(process.env.FIN_DETAIL_RETRY_DELAY_MS) || 6000; // Increased from 5000
const CRON_SCHEDULE = process.env.FIN_DETAIL_CRON_SCHEDULE || '0 5 * * SUN'; 
const CRON_TIMEZONE = process.env.FIN_DETAIL_CRON_TIMEZONE || "Etc/UTC";
const FETCH_TIMEOUT_MS = parseInt(process.env.FIN_DETAIL_FETCH_TIMEOUT_MS) || 70000; // Increased from 60000
const LOG_PROGRESS_INTERVAL = 10; 
const DELAY_BETWEEN_YAHOO_CALLS_MS = 2000; // Increased from 1500

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
        new winston.transports.File({ filename: path.join(LOG_DIR, 'financial_details_updater.log'), maxsize: 10485760, maxFiles: 5, tailable: true, level: 'debug' }),
        new winston.transports.File({ filename: path.join(LOG_DIR, 'financial_details_updater_errors.log'), level: 'error', maxsize: 10485760, maxFiles: 5 })
    ],
    exceptionHandlers: [new winston.transports.File({ filename: path.join(LOG_DIR, 'financial_details_exceptions.log') })],
    rejectionHandlers: [new winston.transports.File({ filename: path.join(LOG_DIR, 'financial_details_rejections.log') })]
});

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    logger.error("Supabase URL or Service Key is missing. Check .env file. Exiting.");
    process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
logger.info("Supabase client initialized for financial details updater.");

// --- Utility Functions ---
function delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
function isValidNumber(value) { return typeof value === 'number' && !isNaN(value) && isFinite(value); }
function sanitizeFiniteNumber(value, allowZero = true) {
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
async function retryOperation(fn, operationName, ticker, retries = RETRY_COUNT, baseDelay = RETRY_DELAY_MS) {
    const localLogger = logger.child({ ticker, operation: operationName });
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
            const isClientHardError = typeof statusCode === 'number' && statusCode >= 400 && statusCode < 500 && statusCode !== 429 && statusCode !== 404; 
            if (i === retries || isClientHardError) {
                const reason = isClientHardError ? `Client Error ${statusCode}` : (e?.name === 'AbortError' ? 'Timeout' : `Max retries or unrecoverable error`);
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
async function loadExchangeRates() { /* ... (Identical to previous - no changes needed here) ... */
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
function getExchangeRate(fromCurrency, toCurrency) { /* ... (Identical to previous) ... */
    if (!fromCurrency || !toCurrency) return null;
    const from = String(fromCurrency).toUpperCase();
    const to = String(toCurrency).toUpperCase();
    if (from === to) return 1.0;
    return exchangeRatesCache[from]?.[to] || null;
}
function convertToUSD(value, currency, operationContext = 'Conversion', localLogger = logger) { /* ... (Identical to previous) ... */
    const numericValue = sanitizeFiniteNumber(value);
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
        localLogger.error(`Cannot convert ${upperCurrency} to USD for ${operationContext}: Rate not found. Value: ${numericValue}`);
        return null;
    }
    return numericValue * rate;
}

// --- Data Fetching from Yahoo Finance (Comprehensive) ---
async function fetchYahooFinancialDetailsWithTimeout(ticker) {
    const localLogger = logger.child({ ticker, step: 'FETCH_YAHOO_FIN_DETAILS' });
    const controller = new AbortController();
    const timeoutId = setTimeout(() => { controller.abort(); }, FETCH_TIMEOUT_MS);

    const modules = [
        'price', 'summaryProfile', 'financialData', 
        'defaultKeyStatistics', 'incomeStatementHistory', 'balanceSheetHistory'
    ];
    localLogger.debug(`Workspaceing quoteSummary with modules: ${modules.join(', ')}`);

    try {
        const result = await yahooFinance.quoteSummary(ticker, { modules }, {
            devel: process.env.NODE_ENV === 'development' ? 'long' : undefined,
            fetchOptions: { signal: controller.signal },
            validateResult: false 
        });
        clearTimeout(timeoutId);
        if (!result) {
            localLogger.warn("No result object from quoteSummary.");
            return null;
        }
        return result;
    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            localLogger.warn(`Yahoo Finance request timed out for ${ticker} after ${FETCH_TIMEOUT_MS / 1000}s`);
        } else if (error.message && error.message.includes("Failed Yahoo Schema validation")) {
            localLogger.error(`Error for ${ticker}: Failed Yahoo Schema validation. Data from Yahoo might be malformed.`, { errorMsg: error.message });
        } else {
            localLogger.error(`Error in yahooFinance.quoteSummary call for ${ticker}: ${error.message}`, { code: error.code });
        }
        throw error; 
    }
}

// --- Supabase Update Functions ---
async function updateCompanyProfile(companyId, ticker, yahooSummaryProfile, existingCompanyData) {
    const localLogger = logger.child({ company_id: companyId, ticker, step: 'UPDATE_COMPANY_PROFILE' });
    if (!yahooSummaryProfile) {
        localLogger.debug("No Yahoo summaryProfile data provided for profile update.");
        return { updated: false, reason: "No Yahoo profile data" };
    }

    const newHeadquarters = [
        yahooSummaryProfile.address1, yahooSummaryProfile.city, 
        yahooSummaryProfile.state, yahooSummaryProfile.country, yahooSummaryProfile.zip
    ].filter(Boolean).join(', ').trim() || null;
    const newDescription = yahooSummaryProfile.longBusinessSummary || null;

    const updatePayload = {};
    let madeChange = false;

    if (newDescription && (!existingCompanyData?.description || existingCompanyData.description === '')) {
        updatePayload.description = newDescription;
        madeChange = true;
        localLogger.info("Updating description (DB was empty/null and Yahoo provided).");
    } else if (newDescription && existingCompanyData?.description && newDescription.length > existingCompanyData.description.length) {
        // Optionally, update if new description is longer/more detailed
        // updatePayload.description = newDescription;
        // madeChange = true;
        // localLogger.info("Yahoo description is longer, updating.");
    }


    if (newHeadquarters && (!existingCompanyData?.headquarters || existingCompanyData.headquarters === '')) {
        updatePayload.headquarters = newHeadquarters;
        madeChange = true;
        localLogger.info("Updating headquarters (DB was empty/null and Yahoo provided).");
    }

    if (!madeChange) {
        localLogger.info("Company profile data (description, hq) unchanged or DB has existing data. No update needed.");
        return { updated: false, reason: "No changes or DB data exists" };
    }

    updatePayload.last_updated = new Date().toISOString();

    try {
        localLogger.debug("Attempting to update companies table:", updatePayload);
        const { error } = await supabase.from('companies').update(updatePayload).eq('company_id', companyId);
        if (error) throw error;
        localLogger.info("Successfully updated company profile fields.");
        return { updated: true };
    } catch (error) {
        localLogger.error(`Error updating companies table: ${error.message}`, { details: error.details });
        return { updated: false, error: true, errorMessage: error.message };
    }
}

async function updateCompanyWebsiteUrl(companyId, ticker, yahooSummaryProfile, existingCompanyUrls) {
    const localLogger = logger.child({ company_id: companyId, ticker, step: 'UPDATE_COMPANY_WEBSITE' });
    if (!yahooSummaryProfile || !yahooSummaryProfile.website || typeof yahooSummaryProfile.website !== 'string') {
        localLogger.debug("No valid website URL in Yahoo summaryProfile data.");
        return { updated: false, reason: "No valid website in Yahoo data" };
    }
    const newWebsiteUrl = yahooSummaryProfile.website;
    const existingWebsiteEntry = existingCompanyUrls.find(u => u.url_type === 'website');

    if (!existingWebsiteEntry || existingWebsiteEntry.url !== newWebsiteUrl) {
        try {
            const upsertData = {
                company_id: companyId,
                url_type: 'website',
                url: newWebsiteUrl,
                last_validated: new Date().toISOString()
            };
            localLogger.debug("Attempting to upsert company website URL:", upsertData);
            const { error } = await supabase.from('company_urls').upsert(upsertData, {
                onConflict: 'company_id, url_type', 
            });
            if (error) {
                 localLogger.error(`Error upserting company website URL: ${error.message}`, { details: error.details, hint: error.hint });
                 if (error.message.includes('no unique or exclusion constraint matching the ON CONFLICT')) {
                     localLogger.error("CRITICAL: The 'company_urls' table is missing a UNIQUE constraint on (company_id, url_type). Upsert failed.");
                 }
                throw error;
            }
            localLogger.info(`Successfully upserted company website URL: ${newWebsiteUrl}`);
            return { updated: true };
        } catch (error) {
            return { updated: false, error: true, errorMessage: error.message };
        }
    } else {
        localLogger.info("Company website URL is already up-to-date.");
        return { updated: false, reason: "URL already up-to-date" };
    }
}

async function updateFinancialsTableInSupabase(companyId, ticker, yahooQuoteSummary) {
    const localLogger = logger.child({ company_id: companyId, ticker, step: 'UPDATE_FINANCIALS_TABLE' });
    let financialsPayload = {}; 

    try {
        if (!yahooQuoteSummary || !yahooQuoteSummary.price || !yahooQuoteSummary.financialData || !yahooQuoteSummary.defaultKeyStatistics) {
            localLogger.warn("Incomplete Yahoo quoteSummary for financials. Skipping update.");
            return { updated: false, reason: "Incomplete Yahoo quoteSummary" };
        }

        const price = yahooQuoteSummary.price;
        const finData = yahooQuoteSummary.financialData;
        const keyStats = yahooQuoteSummary.defaultKeyStatistics;
        const incomeStmt = yahooQuoteSummary.incomeStatementHistory?.incomeStatementHistory?.[0] || {};
        const balanceSheet = yahooQuoteSummary.balanceSheetHistory?.balanceSheetStatements?.[0] || {};
        
        const currency = price.currency?.toUpperCase() || 'USD';
        const currentDateISO = new Date().toISOString();
        
        let reportDate = null; // This will be the 'YYYY-MM-DD' string or null
        if (isValidNumber(balanceSheet.endDate)) {
            // Check if the timestamp is within a reasonable range for a financial report date
            // Unix timestamp for "Jan 01 1971" is approx 31536000
            // Unix timestamp for "Jan 01 2070" is approx 3155760000
            if (balanceSheet.endDate > 31536000 && balanceSheet.endDate < 3155760000 * 2) { // Check if it's a plausible timestamp
                try {
                    reportDate = new Date(balanceSheet.endDate * 1000).toISOString().split('T')[0];
                    localLogger.debug(`Parsed financials reportDate: ${reportDate} from raw endDate: ${balanceSheet.endDate}`);
                } catch (dateError) {
                    localLogger.warn(`Error parsing balanceSheet.endDate (${balanceSheet.endDate}) into Date: ${dateError.message}. Setting reportDate to null.`);
                }
            } else {
                localLogger.warn(`Unreasonable balanceSheet.endDate from Yahoo: ${balanceSheet.endDate}. Treating as invalid. Setting reportDate to null.`);
            }
        } else if (balanceSheet.endDate) { // If it's not a number but exists, log it
             localLogger.warn(`balanceSheet.endDate from Yahoo is not a number: ${balanceSheet.endDate}. Setting reportDate to null.`);
        }


        financialsPayload = {
            company_id: companyId,
            cash_value: sanitizeFiniteNumber(finData.totalCash || balanceSheet.cash),
            cash_currency: currency,
            cash_date: reportDate, // Use the validated and formatted reportDate
            market_cap_value: sanitizeFiniteNumber(price.marketCap),
            market_cap_currency: currency,
            enterprise_value_value: sanitizeFiniteNumber(keyStats.enterpriseValue || finData.enterpriseValue),
            enterprise_value_currency: currency,
            revenue_value: sanitizeFiniteNumber(finData.totalRevenue || incomeStmt.totalRevenue),
            revenue_currency: currency,
            ebitda: sanitizeFiniteNumber(finData.ebitda),
            net_income_value: sanitizeFiniteNumber(keyStats.netIncomeToCommon || incomeStmt.netIncome),
            net_income_currency: currency,
            debt_value: sanitizeFiniteNumber(finData.totalDebt || balanceSheet.totalDebt || balanceSheet.totalLiab),
            debt_currency: currency,
            shares_outstanding: sanitizeFiniteNumber(keyStats.sharesOutstanding),
            free_cash_flow: sanitizeFiniteNumber(finData.freeCashflow || keyStats.freeCashflow),
            trailing_pe: sanitizeFiniteNumber(keyStats.trailingEps && price.regularMarketPrice && keyStats.trailingEps !== 0 ? price.regularMarketPrice / keyStats.trailingEps : null, false),
            forward_pe: sanitizeFiniteNumber(keyStats.forwardPE),
            peg_ratio: sanitizeFiniteNumber(keyStats.pegRatio),
            price_to_sales: sanitizeFiniteNumber(keyStats.priceToSalesTrailing12Months),
            price_to_book: sanitizeFiniteNumber(keyStats.priceToBook),
            enterprise_to_revenue: sanitizeFiniteNumber(keyStats.enterpriseToRevenue),
            enterprise_to_ebitda: sanitizeFiniteNumber(keyStats.enterpriseToEbitda),
            cost_of_revenue: sanitizeFiniteNumber(incomeStmt.costOfRevenue),
            gross_profit: sanitizeFiniteNumber(incomeStmt.grossProfit),
            operating_expense: sanitizeFiniteNumber(incomeStmt.totalOperatingExpenses),
            operating_income: sanitizeFiniteNumber(incomeStmt.operatingIncome),
            liabilities: sanitizeFiniteNumber(balanceSheet.totalLiab),
            liabilities_currency: currency,
            net_financial_assets: null, 
            net_financial_assets_currency: currency,
            investments_json: balanceSheet.shortTermInvestments ? JSON.stringify({ shortTermInvestments: balanceSheet.shortTermInvestments }) : null,
            other_financial_assets: sanitizeFiniteNumber(balanceSheet.otherCurrentAssets),
            other_financial_assets_currency: currency,
            data_source: 'Yahoo Finance',
            last_updated: currentDateISO
        };

        if (isValidNumber(financialsPayload.cash_value) && isValidNumber(financialsPayload.debt_value)) {
            financialsPayload.net_financial_assets = financialsPayload.cash_value - financialsPayload.debt_value;
        }

        const finalPayload = {};
        for (const key in financialsPayload) {
            if (financialsPayload[key] !== undefined) { 
                finalPayload[key] = financialsPayload[key];
            }
        }
        finalPayload.company_id = companyId; 
        finalPayload.last_updated = currentDateISO;
        finalPayload.data_source = 'Yahoo Finance';

        localLogger.debug("Financials payload to upsert:", finalPayload);

        const { error } = await supabase
            .from('financials')
            .upsert(finalPayload, { onConflict: 'company_id' }); 
        if (error) {
             localLogger.error(`Error upserting financials table: ${error.message}`, {details: error.details, hint: error.hint});
             if (error.message.includes('no unique or exclusion constraint matching the ON CONFLICT')) {
                 localLogger.error("CRITICAL: The 'financials' table is missing a PRIMARY KEY or UNIQUE constraint on 'company_id'. Upsert will fail. SQL: ALTER TABLE public.financials ADD PRIMARY KEY (company_id); OR ADD CONSTRAINT financials_company_id_key UNIQUE (company_id);");
             }
            throw error; // Re-throw to be caught by processCompany's error handling
        }
        localLogger.info(`Successfully upserted financials data.`);
        return { updated: true };
    } catch (error) { // Catch errors from within this function, including the re-thrown one
        localLogger.error(`Exception in updateFinancialsTable: ${error.message}`, { stack: error.stack, currentPayloadStateForDebug: financialsPayload });
        return { updated: false, error: true, errorMessage: error.message };
    }
}

async function updateCapitalStructureInSupabase(companyId, ticker, yahooQuoteSummary) {
    const localLogger = logger.child({ company_id: companyId, ticker, step: 'UPDATE_CAPITAL_STRUCTURE' });
    if (!yahooQuoteSummary || !yahooQuoteSummary.defaultKeyStatistics) {
        localLogger.warn("Incomplete Yahoo data (defaultKeyStatistics) for capital structure. Skipping.");
        return { updated: false, reason: "Missing defaultKeyStatistics" };
    }

    const existingShares = sanitizeFiniteNumber(yahooQuoteSummary.defaultKeyStatistics.sharesOutstanding);

    if (!isValidNumber(existingShares)) {
        localLogger.warn(`No valid sharesOutstanding from Yahoo (${yahooQuoteSummary.defaultKeyStatistics.sharesOutstanding}). Skipping capital_structure update.`);
        return { updated: false, reason: "Invalid sharesOutstanding from Yahoo" };
    }

    const capitalStructurePayload = {
        company_id: companyId,
        existing_shares: existingShares,
        last_updated: new Date().toISOString()
    };
    localLogger.debug("Capital structure payload to upsert:", capitalStructurePayload);

    try {
        const { error } = await supabase
            .from('capital_structure')
            .upsert(capitalStructurePayload, { 
                onConflict: 'company_id', 
            });
        if (error) {
            localLogger.error(`Error upserting capital_structure table: ${error.message}`, {details: error.details, hint: error.hint});
            if (error.message.includes('no unique or exclusion constraint matching the ON CONFLICT')) {
                 localLogger.error("CRITICAL: The 'capital_structure' table is missing a PRIMARY KEY or UNIQUE constraint on 'company_id'. Upsert will fail. Please add it.");
             }
            throw error;
        }
        localLogger.info(`Successfully upserted capital structure (Existing Shares: ${existingShares}).`);
        return { updated: true };
    } catch (error) {
        return { updated: false, error: true, errorMessage: error.message };
    }
}

// --- Main Processing Function ---
async function processCompany(companyFullDataFromDb) { // Renamed parameter for clarity
    const { company_id, tsx_code, company_name } = companyFullDataFromDb;
    const localLogger = logger.child({ company_id, ticker: tsx_code });

    if (isShuttingDown) {
        localLogger.info(`Skipping due to shutdown signal.`);
        return { company_id, status: 'shutdown_skip', updates: {} };
    }
    if (!tsx_code || tsx_code.trim() === '') {
        localLogger.warn(`Skipping company due to missing or empty tsx_code.`);
        return { company_id, status: 'skipped_no_ticker', updates: {} };
    }

    localLogger.info(`Processing financial details for: "${company_name}" (${tsx_code})`);

    const yahooQuoteSummary = await retryOperation(
        () => fetchYahooFinancialDetailsWithTimeout(tsx_code),
        'fetchComprehensiveYahooData',
        tsx_code
    );

    if (!yahooQuoteSummary) {
        localLogger.error(`Failed to fetch comprehensive Yahoo data after retries. Skipping all updates for this company.`);
        return { company_id, status: 'yahoo_fetch_failed_comprehensively', updates: {} };
    }
    
    const updatesSummary = {
        profile: 'pending',
        urls: 'pending',
        financials: 'pending',
        capitalStructure: 'pending'
    };
    let overallProcessingStatus = 'processed_with_no_updates';
    let errorOccurred = false;

    let existingUrlsForCompany = [];
    try {
        const {data: urls, error: urlError} = await supabase.from('company_urls').select('url_type, url').eq('company_id', company_id);
        if(urlError) localLogger.warn(`Could not fetch existing URLs for company ${company_id}: ${urlError.message}`);
        else existingUrlsForCompany = urls || [];
    } catch (e) { localLogger.warn(`Exception fetching existing URLs for company ${company_id}: ${e.message}`); }

    try {
        const profileResult = await updateCompanyProfile(company_id, tsx_code, yahooQuoteSummary.summaryProfile, companyFullDataFromDb);
        updatesSummary.profile = profileResult.updated ? 'updated' : (profileResult.error ? `error` : (profileResult.reason || 'no_change'));
        if(profileResult.updated) overallProcessingStatus = 'processed_with_updates';
        if(profileResult.error) errorOccurred = true;

        const urlResult = await updateCompanyWebsiteUrl(company_id, tsx_code, yahooQuoteSummary.summaryProfile, existingUrlsForCompany);
        updatesSummary.urls = urlResult.updated ? 'updated' : (urlResult.error ? `error` : (urlResult.reason || 'no_change'));
        if(urlResult.updated) overallProcessingStatus = 'processed_with_updates';
        if(urlResult.error) errorOccurred = true;
        
        const financialsResult = await updateFinancialsTableInSupabase(company_id, tsx_code, yahooQuoteSummary);
        updatesSummary.financials = financialsResult.updated ? 'updated' : (financialsResult.error ? `error` : (financialsResult.reason || 'no_change'));
        if(financialsResult.updated) overallProcessingStatus = 'processed_with_updates';
        if(financialsResult.error) errorOccurred = true;

        const capitalResult = await updateCapitalStructureInSupabase(company_id, tsx_code, yahooQuoteSummary);
        updatesSummary.capitalStructure = capitalResult.updated ? 'updated' : (capitalResult.error ? `error` : (capitalResult.reason || 'no_change'));
        if(capitalResult.updated) overallProcessingStatus = 'processed_with_updates';
        if(capitalResult.error) errorOccurred = true;
        
        if (profileResult.updated || financialsResult.updated || capitalResult.updated || urlResult.updated ) {
            // Update master company last_updated only if something tangible changed from Yahoo for these tables
            const { error: companyUpdateError } = await supabase
                .from('companies')
                .update({ last_updated: new Date().toISOString() })
                .eq('company_id', company_id);
            if (companyUpdateError) {
                localLogger.error(`Failed to update 'last_updated' for main companies table: ${companyUpdateError.message}`);
            }
        }
    } catch (processError) {
        // This catch block handles errors re-thrown by the update functions
        localLogger.error(`Error during processing sub-updates for company: ${processError.message}`);
        errorOccurred = true; // Ensure overall status reflects an error
    }

    if (errorOccurred) {
        overallProcessingStatus = `processed_with_errors (Financials: ${updatesSummary.financials}, Capital: ${updatesSummary.capitalStructure}, URL: ${updatesSummary.urls}, Profile: ${updatesSummary.profile})`;
    }


    localLogger.info(`Processing completed. Overall: ${overallProcessingStatus}. Update Summary: ${JSON.stringify(updatesSummary)}`);
    return { company_id, status: overallProcessingStatus, updates: updatesSummary };
}

async function runUpdater() {
    logger.info(`Yahoo Financial Details Updater Script Started. PID: ${process.pid}`);
    const lockFilePath = path.join(__dirname, 'update_financial_details.lock');

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

        logger.info(`Workspaceing all company master data for financial detail update...`);
        const { data: companies, error: companiesError } = await supabase
            .from('companies')
            .select('company_id, tsx_code, company_name, description, headquarters') 
            .order('company_id', { ascending: true });
            // .limit(5); // Remove limit for full run

        if (companiesError) {
            logger.error("CRITICAL: Failed to fetch companies from Supabase:", companiesError);
            throw companiesError;
        }
        if (!companies || companies.length === 0) {
            logger.info("No companies found to process.");
            return;
        }

        logger.info(`Workspaceed ${companies.length} companies for financial detail updates.`);
        let companiesProcessedCount = 0;
        let companiesWithAnyUpdate = 0;
        let companiesWithErrors = 0;
        let companiesSkippedAllUpdatesOrNoChange = 0;

        for (let i = 0; i < companies.length; i++) {
            if (isShuttingDown) {
                logger.info("Shutdown signal received, stopping company processing loop.");
                break;
            }
            const company = companies[i];
            const result = await processCompany(company, company); // Pass company as its own existing data for now
            companiesProcessedCount++;
            
            if (result.status === 'processed_with_updates') companiesWithAnyUpdate++;
            else if (result.status.startsWith('error') || result.status === 'yahoo_fetch_failed_comprehensively') {
                companiesWithErrors++;
            } else { // 'skipped_no_ticker', 'processed_with_no_updates'
                companiesSkippedAllUpdatesOrNoChange++;
            }
            
            if (companiesProcessedCount % LOG_PROGRESS_INTERVAL === 0 || companiesProcessedCount === companies.length) {
                logger.info(`--- Progress: ${companiesProcessedCount}/${companies.length} companies attempted. With Updates: ${companiesWithAnyUpdate}, Skipped/No Change: ${companiesSkippedAllUpdatesOrNoChange}, With Errors: ${companiesWithErrors} ---`);
            }
            if (i < companies.length - 1 && !isShuttingDown) {
                await delay(DELAY_BETWEEN_YAHOO_CALLS_MS); 
            }
        }
        logger.info(`Yahoo financial details update run finished. Total Companies Attempted: ${companies.length}.`);
        logger.info(`Summary: ${companiesWithAnyUpdate} companies had at least one field updated, ${companiesSkippedAllUpdatesOrNoChange} were skipped or had no changes, ${companiesWithErrors} encountered errors during processing.`);

    } catch (error) {
        logger.error(`Unhandled error in runUpdater: ${error.message}`, { stack: error.stack });
    } finally {
        if (fs.existsSync(lockFilePath)) {
            try { fs.unlinkSync(lockFilePath); logger.info('Lock file removed.'); } 
            catch (e) { logger.error('Error removing lock file on exit:', e); }
        }
        logger.info('Financial details updater script run complete.');
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
    runUpdater().catch(e => {
        logger.error(`Error in --once mode execution: ${e.message}`, {stack: e.stack});
        if (fs.existsSync(LOCK_FILE)) { try { fs.unlinkSync(LOCK_FILE); } catch (err) { /* ignore */ } }
        process.exit(1);
    });
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