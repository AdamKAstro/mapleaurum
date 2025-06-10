// update_financial_details_from_yahoo_improved.cjs
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

const RETRY_COUNT = parseInt(process.env.FIN_DETAIL_RETRY_COUNT) || 3;
const RETRY_DELAY_MS = parseInt(process.env.FIN_DETAIL_RETRY_DELAY_MS) || 6000;
const CRON_SCHEDULE = process.env.FIN_DETAIL_CRON_SCHEDULE || '0 5 * * SUN'; 
const CRON_TIMEZONE = process.env.FIN_DETAIL_CRON_TIMEZONE || "Etc/UTC";
const FETCH_TIMEOUT_MS = parseInt(process.env.FIN_DETAIL_FETCH_TIMEOUT_MS) || 70000;
const LOG_PROGRESS_INTERVAL = 10; 
const DELAY_BETWEEN_YAHOO_CALLS_MS = 2000;

// Data quality thresholds
const MIN_DESCRIPTION_LENGTH = 50; // Don't replace longer descriptions with shorter ones
const FINANCIAL_VALUE_CHANGE_THRESHOLD = 10.0; // 1000% change is suspicious
const STALE_DATA_DAYS = 365; // Consider data older than 1 year as potentially stale

// Ticker mappings for problematic symbols
const TICKER_MAPPINGS = {
    'SA.H': 'SA.V',
    // Add more mappings as discovered
};

// Disable Yahoo Finance schema validation globally
yahooFinance.setGlobalConfig({
    validation: {
        logErrors: false,
    }
});

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

function isValidNumber(value) { 
    return typeof value === 'number' && !isNaN(value) && isFinite(value) && value !== Infinity && value !== -Infinity;
}

function sanitizeFiniteNumber(value, allowZero = true) {
    if (value === null || value === undefined) return null;
    
    // Handle Infinity explicitly
    if (value === Infinity || value === -Infinity || value === 'Infinity' || value === '-Infinity') {
        return null;
    }
    
    let num;
    if (typeof value === 'number') { 
        num = value; 
    } else if (typeof value === 'string') {
        const cleaned = value.replace(/[, ]/g, '');
        if (cleaned === '' || cleaned === '-' || cleaned === '.' || 
            cleaned.toLowerCase() === 'infinity' || cleaned.toLowerCase() === '-infinity' ||
            cleaned.toLowerCase() === 'nan') {
            return null;
        }
        num = parseFloat(cleaned);
    } else if (typeof value === 'object' && value !== null && 'raw' in value && value.raw !== undefined) {
        return sanitizeFiniteNumber(value.raw, allowZero);
    } else { 
        return null; 
    }
    
    // Final validation
    if (!Number.isFinite(num)) return null;
    if (!allowZero && num === 0) return null;
    
    return num;
}

// Enhanced data quality check
function isDataQualityBetter(newValue, existingValue, fieldName, localLogger) {
    // If no existing value, any valid new value is better
    if (existingValue === null || existingValue === undefined) {
        return newValue !== null && newValue !== undefined;
    }
    
    // If no new value, keep existing
    if (newValue === null || newValue === undefined) {
        return false;
    }
    
    // Special handling for different field types
    if (fieldName === 'description') {
        // Prefer longer, more detailed descriptions
        const newLen = String(newValue).length;
        const existingLen = String(existingValue).length;
        if (newLen < MIN_DESCRIPTION_LENGTH && existingLen >= MIN_DESCRIPTION_LENGTH) {
            localLogger.debug(`New description too short (${newLen} chars) vs existing (${existingLen} chars)`);
            return false;
        }
        return newLen > existingLen * 1.2; // New must be 20% longer to replace
    }
    
    if (fieldName === 'headquarters' || fieldName === 'website') {
        // For strings, only replace if new is more complete
        const newStr = String(newValue).trim();
        const existingStr = String(existingValue).trim();
        return newStr.length > existingStr.length;
    }
    
    // For numeric fields, check for suspicious changes
    if (typeof newValue === 'number' && typeof existingValue === 'number') {
        if (existingValue !== 0) {
            const changeRatio = Math.abs(newValue - existingValue) / Math.abs(existingValue);
            if (changeRatio > FINANCIAL_VALUE_CHANGE_THRESHOLD) {
                localLogger.warn(`Suspicious change in ${fieldName}: ${existingValue} -> ${newValue} (${(changeRatio * 100).toFixed(0)}% change)`);
                return false; // Too big a change, likely an error
            }
        }
    }
    
    return true; // Default to accepting new value
}

// Enhanced retry operation
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
            const errorMessage = e?.message || 'Unknown error';
            const statusCode = e?.response?.status || (e?.name === 'AbortError' ? 'Timeout' : 'UnknownError');
            
            // Error classification
            const isQuoteNotFound = errorMessage.includes('Quote not found');
            const isSchemaError = errorMessage.includes('Schema validation') || errorMessage.includes('Expected union value');
            const isHttpClientError = typeof statusCode === 'number' && statusCode >= 400 && statusCode < 500 && statusCode !== 429;
            
            if (i === retries || isHttpClientError || isQuoteNotFound) {
                const reason = isQuoteNotFound ? 'Quote Not Found' : 
                              isSchemaError ? 'Schema Validation Error' :
                              isHttpClientError ? `Client Error ${statusCode}` : 
                              (e?.name === 'AbortError' ? 'Timeout' : `Max retries or unrecoverable error`);
                localLogger.error(`Failed (${reason}): ${errorMessage}`, { 
                    stackShort: e.stack?.substring(0, 300),
                    isSchemaError,
                    isQuoteNotFound 
                });
                return null; 
            }
            
            const delayMs = baseDelay * Math.pow(2, i) + Math.random() * (baseDelay / 2);
            localLogger.warn(`Error: ${errorMessage}. Retry ${i + 1}/${retries} in ${Math.round(delayMs)}ms...`);
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
            if (row.from_currency && row.to_currency && isValidNumber(row.rate)) {
                if (!acc[row.from_currency]) acc[row.from_currency] = {};
                acc[row.from_currency][row.to_currency] = row.rate;
            }
            return acc;
        }, {});
        
        logger.info(`Loaded ${rates.length} exchange rates into cache.`);
        
        // Enhanced fallback rates
        const fallbackRates = {
            'CAD': { 'USD': 0.73 },
            'AUD': { 'USD': 0.66 },
            'USD': { 'CAD': 1.37, 'AUD': 1.52 },
            'GBP': { 'USD': 1.27 },
            'EUR': { 'USD': 1.08 }
        };
        
        for (const [from, toRates] of Object.entries(fallbackRates)) {
            for (const [to, rate] of Object.entries(toRates)) {
                if (!getExchangeRate(from, to)) {
                    logger.warn(`${from}->${to} rate missing from DB, using fallback ${rate}`);
                    if (!exchangeRatesCache[from]) exchangeRatesCache[from] = {};
                    exchangeRatesCache[from][to] = rate;
                }
            }
        }
    } catch (err) {
        logger.error(`Failed to load exchange rates from Supabase: ${err.message}`, { stack: err.stack });
        logger.warn('Using comprehensive fallback exchange rates.');
        exchangeRatesCache = {
            'CAD': { 'USD': 0.73, 'EUR': 0.68, 'GBP': 0.58 },
            'AUD': { 'USD': 0.66, 'EUR': 0.61, 'GBP': 0.52 },
            'USD': { 'CAD': 1.37, 'AUD': 1.52, 'EUR': 0.93, 'GBP': 0.79 },
            'EUR': { 'USD': 1.08, 'CAD': 1.48, 'AUD': 1.64, 'GBP': 0.85 },
            'GBP': { 'USD': 1.27, 'CAD': 1.74, 'AUD': 1.93, 'EUR': 1.18 }
        };
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

// --- Enhanced Data Fetching ---
async function fetchYahooFinancialDetailsWithTimeout(ticker) {
    const localLogger = logger.child({ ticker, step: 'FETCH_YAHOO_FIN_DETAILS' });
    
    // Check for ticker mapping
    const actualTicker = TICKER_MAPPINGS[ticker] || ticker;
    if (actualTicker !== ticker) {
        localLogger.info(`Using mapped ticker ${actualTicker} instead of ${ticker}`);
    }
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => { controller.abort(); }, FETCH_TIMEOUT_MS);

    const modules = [
        'price', 'summaryProfile', 'financialData', 
        'defaultKeyStatistics', 'incomeStatementHistory', 'balanceSheetHistory'
    ];
    localLogger.debug(`Fetching quoteSummary with modules: ${modules.join(', ')}`);

    try {
        let result;
        try {
            result = await yahooFinance.quoteSummary(actualTicker, { modules }, {
                devel: process.env.NODE_ENV === 'development' ? 'long' : undefined,
                fetchOptions: { signal: controller.signal },
                validateResult: false // Disable validation to handle Infinity values
            });
        } catch (quoteSummaryError) {
            // Handle schema validation errors
            if (quoteSummaryError.message?.includes('Schema validation') || 
                quoteSummaryError.message?.includes('Expected union value')) {
                localLogger.warn(`Schema validation error, attempting fallback approach`);
                
                // Try simpler modules one by one
                result = {};
                for (const module of modules) {
                    try {
                        const moduleResult = await yahooFinance.quoteSummary(actualTicker, { modules: [module] }, {
                            fetchOptions: { signal: controller.signal },
                            validateResult: false
                        });
                        result[module] = moduleResult[module];
                    } catch (moduleError) {
                        localLogger.warn(`Failed to fetch module ${module}: ${moduleError.message}`);
                        result[module] = null;
                    }
                }
            } else {
                throw quoteSummaryError;
            }
        }
        
        clearTimeout(timeoutId);
        
        if (!result) {
            localLogger.warn("No result object from quoteSummary.");
            return null;
        }
        
        return { ...result, usedMappedTicker: actualTicker !== ticker };
    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            localLogger.warn(`Yahoo Finance request timed out after ${FETCH_TIMEOUT_MS / 1000}s`);
        } else {
            localLogger.error(`Error in yahooFinance call: ${error.message}`, { 
                code: error.code,
                type: error.type 
            });
        }
        throw error;
    }
}

// --- Enhanced Database Update Functions ---
async function updateCompanyProfile(companyId, ticker, yahooSummaryProfile, existingCompanyData) {
    const localLogger = logger.child({ company_id: companyId, ticker, step: 'UPDATE_COMPANY_PROFILE' });
    
    if (!yahooSummaryProfile) {
        localLogger.debug("No Yahoo summaryProfile data provided.");
        return { updated: false, reason: "No Yahoo profile data" };
    }

    const newHeadquarters = [
        yahooSummaryProfile.address1, 
        yahooSummaryProfile.city, 
        yahooSummaryProfile.state, 
        yahooSummaryProfile.country, 
        yahooSummaryProfile.zip
    ].filter(Boolean).join(', ').trim() || null;
    
    const newDescription = yahooSummaryProfile.longBusinessSummary || null;

    const updatePayload = {};
    let fieldsUpdated = [];

    // Smart comparison for description
    if (isDataQualityBetter(newDescription, existingCompanyData?.description, 'description', localLogger)) {
        updatePayload.description = newDescription;
        fieldsUpdated.push('description');
        localLogger.info(`Updating description (new: ${newDescription?.length || 0} chars, old: ${existingCompanyData?.description?.length || 0} chars)`);
    }

    // Smart comparison for headquarters
    if (isDataQualityBetter(newHeadquarters, existingCompanyData?.headquarters, 'headquarters', localLogger)) {
        updatePayload.headquarters = newHeadquarters;
        fieldsUpdated.push('headquarters');
        localLogger.info(`Updating headquarters`);
    }

    if (fieldsUpdated.length === 0) {
        localLogger.info("Company profile data unchanged or existing data is better quality.");
        return { updated: false, reason: "No improvements to existing data" };
    }

    updatePayload.last_updated = new Date().toISOString();

    try {
        localLogger.debug(`Updating company profile fields: ${fieldsUpdated.join(', ')}`);
        const { error } = await supabase.from('companies').update(updatePayload).eq('company_id', companyId);
        if (error) throw error;
        localLogger.info(`Successfully updated company profile: ${fieldsUpdated.join(', ')}`);
        return { updated: true, fieldsUpdated };
    } catch (error) {
        localLogger.error(`Error updating companies table: ${error.message}`, { details: error.details });
        return { updated: false, error: true, errorMessage: error.message };
    }
}

async function updateCompanyWebsiteUrl(companyId, ticker, yahooSummaryProfile, existingCompanyUrls) {
    const localLogger = logger.child({ company_id: companyId, ticker, step: 'UPDATE_COMPANY_WEBSITE' });
    
    if (!yahooSummaryProfile?.website || typeof yahooSummaryProfile.website !== 'string') {
        localLogger.debug("No valid website URL in Yahoo data.");
        return { updated: false, reason: "No valid website in Yahoo data" };
    }
    
    const newWebsiteUrl = yahooSummaryProfile.website.trim();
    const existingWebsiteEntry = existingCompanyUrls.find(u => u.url_type === 'website');

    // Only update if URL is different and valid
    if (existingWebsiteEntry?.url === newWebsiteUrl) {
        localLogger.info("Company website URL is already up-to-date.");
        return { updated: false, reason: "URL already up-to-date" };
    }
    
    // Validate URL format
    try {
        new URL(newWebsiteUrl);
    } catch (e) {
        localLogger.warn(`Invalid URL format from Yahoo: ${newWebsiteUrl}`);
        return { updated: false, reason: "Invalid URL format" };
    }

    try {
        const upsertData = {
            company_id: companyId,
            url_type: 'website',
            url: newWebsiteUrl,
            last_validated: new Date().toISOString()
        };
        
        localLogger.debug(`Upserting website URL: ${newWebsiteUrl}`);
        const { error } = await supabase.from('company_urls').upsert(upsertData, {
            onConflict: 'company_id, url_type',
        });
        
        if (error) {
            localLogger.error(`Error upserting company website URL: ${error.message}`, { details: error.details });
            throw error;
        }
        
        localLogger.info(`Successfully upserted website URL: ${newWebsiteUrl}`);
        return { updated: true };
    } catch (error) {
        return { updated: false, error: true, errorMessage: error.message };
    }
}

async function updateFinancialsTableInSupabase(companyId, ticker, yahooQuoteSummary, existingFinancials) {
    const localLogger = logger.child({ company_id: companyId, ticker, step: 'UPDATE_FINANCIALS_TABLE' });
    
    try {
        if (!yahooQuoteSummary?.price || !yahooQuoteSummary?.financialData || !yahooQuoteSummary?.defaultKeyStatistics) {
            localLogger.warn("Incomplete Yahoo quoteSummary for financials.");
            return { updated: false, reason: "Incomplete Yahoo data" };
        }

        const price = yahooQuoteSummary.price;
        const finData = yahooQuoteSummary.financialData;
        const keyStats = yahooQuoteSummary.defaultKeyStatistics;
        const incomeStmt = yahooQuoteSummary.incomeStatementHistory?.incomeStatementHistory?.[0] || {};
        const balanceSheet = yahooQuoteSummary.balanceSheetHistory?.balanceSheetStatements?.[0] || {};
        
        const currency = price.currency?.toUpperCase() || existingFinancials?.cash_currency || 'USD';
        const currentDateISO = new Date().toISOString();
        
        // Enhanced date parsing with validation
        let reportDate = null;
        if (isValidNumber(balanceSheet.endDate)) {
            const timestamp = balanceSheet.endDate;
            // Validate reasonable date range (1970-2070)
            if (timestamp > 0 && timestamp < 3155760000) {
                try {
                    const parsedDate = new Date(timestamp * 1000);
                    if (parsedDate.getFullYear() >= 1970 && parsedDate.getFullYear() <= 2070) {
                        reportDate = parsedDate.toISOString().split('T')[0];
                        localLogger.debug(`Parsed report date: ${reportDate}`);
                    } else {
                        localLogger.warn(`Parsed date ${parsedDate} outside reasonable range`);
                    }
                } catch (e) {
                    localLogger.warn(`Error parsing date: ${e.message}`);
                }
            }
        }
        
        // Build financial data with intelligent merging
        const newFinancialData = {
            cash_value: sanitizeFiniteNumber(finData.totalCash || balanceSheet.cash),
            cash_currency: currency,
            cash_date: reportDate,
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
            trailing_pe: sanitizeFiniteNumber(keyStats.trailingEps && price.regularMarketPrice && keyStats.trailingEps !== 0 ? 
                         price.regularMarketPrice / keyStats.trailingEps : null, false),
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
            other_financial_assets: sanitizeFiniteNumber(balanceSheet.otherCurrentAssets),
            other_financial_assets_currency: currency,
        };
        
        // Calculate net financial assets if we have the data
        if (isValidNumber(newFinancialData.cash_value) && isValidNumber(newFinancialData.debt_value)) {
            newFinancialData.net_financial_assets = newFinancialData.cash_value - newFinancialData.debt_value;
            newFinancialData.net_financial_assets_currency = currency;
        }
        
        // Handle investments JSON
        if (balanceSheet.shortTermInvestments) {
            newFinancialData.investments_json = JSON.stringify({ 
                shortTermInvestments: sanitizeFiniteNumber(balanceSheet.shortTermInvestments) 
            });
        }
        
        // Smart merge with existing data
        const finalPayload = { company_id: companyId };
        let fieldsUpdated = [];
        let significantUpdate = false;
        
        // Compare each field with existing data
        for (const [key, newValue] of Object.entries(newFinancialData)) {
            const existingValue = existingFinancials?.[key];
            
            // Skip currency fields for now, handle them with their value fields
            if (key.endsWith('_currency')) continue;
            
            // For value fields, also consider the currency
            if (key.endsWith('_value') || ['cash', 'debt', 'revenue', 'ebitda', 'net_income'].includes(key.replace('_value', ''))) {
                const currencyKey = key.replace('_value', '_currency');
                const newCurrency = newFinancialData[currencyKey];
                const existingCurrency = existingFinancials?.[currencyKey];
                
                // If we have a new value
                if (newValue !== null && newValue !== undefined) {
                    // If no existing value or currencies match and value is different
                    if (existingValue === null || existingValue === undefined ||
                        (newCurrency === existingCurrency && Math.abs(newValue - existingValue) > 0.01)) {
                        finalPayload[key] = newValue;
                        if (newCurrency) finalPayload[currencyKey] = newCurrency;
                        fieldsUpdated.push(key);
                        if (['market_cap_value', 'revenue_value', 'cash_value', 'debt_value'].includes(key)) {
                            significantUpdate = true;
                        }
                    }
                    // If currencies don't match, need to compare USD values
                    else if (newCurrency !== existingCurrency) {
                        const newUSD = convertToUSD(newValue, newCurrency, `${key} comparison`, localLogger);
                        const existingUSD = convertToUSD(existingValue, existingCurrency, `${key} comparison`, localLogger);
                        
                        if (newUSD && existingUSD) {
                            const changeRatio = Math.abs(newUSD - existingUSD) / existingUSD;
                            // Only update if change is reasonable and significant
                            if (changeRatio < FINANCIAL_VALUE_CHANGE_THRESHOLD && changeRatio > 0.01) {
                                finalPayload[key] = newValue;
                                finalPayload[currencyKey] = newCurrency;
                                fieldsUpdated.push(key);
                                if (changeRatio > 0.05) significantUpdate = true;
                            } else if (changeRatio >= FINANCIAL_VALUE_CHANGE_THRESHOLD) {
                                localLogger.warn(`Skipping ${key} due to extreme change: ${existingValue} ${existingCurrency} -> ${newValue} ${newCurrency}`);
                            }
                        }
                    }
                }
                // If no new value but we have existing, preserve it
                else if (existingValue !== null && existingValue !== undefined) {
                    finalPayload[key] = existingValue;
                    if (existingCurrency) finalPayload[currencyKey] = existingCurrency;
                }
            }
            // For non-value fields
            else if (newValue !== null && newValue !== undefined) {
                if (existingValue === null || existingValue === undefined || 
                    Math.abs(newValue - existingValue) > 0.01) {
                    finalPayload[key] = newValue;
                    fieldsUpdated.push(key);
                }
            }
            // Preserve existing non-null values
            else if (existingValue !== null && existingValue !== undefined) {
                finalPayload[key] = existingValue;
            }
        }
        
        // Always update these fields
        finalPayload.data_source = 'Yahoo Finance';
        finalPayload.last_updated = currentDateISO;
        
        if (fieldsUpdated.length === 0) {
            localLogger.info("No financial data changes detected.");
            return { updated: false, reason: "No changes to existing data" };
        }
        
        localLogger.info(`Updating financial fields: ${fieldsUpdated.join(', ')}. Significant: ${significantUpdate}`);
        
        const { error } = await supabase
            .from('financials')
            .upsert(finalPayload, { onConflict: 'company_id' });
            
        if (error) {
            localLogger.error(`Error upserting financials: ${error.message}`, { details: error.details });
            throw error;
        }
        
        localLogger.info(`Successfully updated financials. Fields: ${fieldsUpdated.length}, Significant: ${significantUpdate}`);
        return { updated: true, fieldsUpdated, significantUpdate };
        
    } catch (error) {
        localLogger.error(`Exception in updateFinancialsTable: ${error.message}`, { stack: error.stack });
        return { updated: false, error: true, errorMessage: error.message };
    }
}

async function updateCapitalStructureInSupabase(companyId, ticker, yahooQuoteSummary, existingCapitalStructure) {
    const localLogger = logger.child({ company_id: companyId, ticker, step: 'UPDATE_CAPITAL_STRUCTURE' });
    
    if (!yahooQuoteSummary?.defaultKeyStatistics) {
        localLogger.warn("Missing defaultKeyStatistics for capital structure.");
        return { updated: false, reason: "Missing defaultKeyStatistics" };
    }

    const newShares = sanitizeFiniteNumber(yahooQuoteSummary.defaultKeyStatistics.sharesOutstanding);
    const existingShares = existingCapitalStructure?.existing_shares;

    if (!isValidNumber(newShares)) {
        localLogger.warn(`Invalid sharesOutstanding from Yahoo: ${yahooQuoteSummary.defaultKeyStatistics.sharesOutstanding}`);
        return { updated: false, reason: "Invalid sharesOutstanding" };
    }

    // Check if update is needed
    if (existingShares && Math.abs(newShares - existingShares) < 1) {
        localLogger.info(`Shares outstanding unchanged: ${newShares}`);
        return { updated: false, reason: "No change in shares" };
    }

    // Check for suspicious changes
    if (existingShares && existingShares > 0) {
        const changeRatio = Math.abs(newShares - existingShares) / existingShares;
        if (changeRatio > 2.0) { // More than 200% change is suspicious
            localLogger.warn(`Suspicious change in shares: ${existingShares} -> ${newShares} (${(changeRatio * 100).toFixed(0)}% change)`);
            return { updated: false, reason: "Suspicious change magnitude" };
        }
    }

    const capitalStructurePayload = {
        company_id: companyId,
        existing_shares: newShares,
        last_updated: new Date().toISOString()
    };
    
    // Preserve other existing fields
    if (existingCapitalStructure?.fully_diluted_shares) {
        capitalStructurePayload.fully_diluted_shares = existingCapitalStructure.fully_diluted_shares;
    }
    if (existingCapitalStructure?.in_the_money_options) {
        capitalStructurePayload.in_the_money_options = existingCapitalStructure.in_the_money_options;
    }
    if (existingCapitalStructure?.options_revenue) {
        capitalStructurePayload.options_revenue = existingCapitalStructure.options_revenue;
        capitalStructurePayload.options_revenue_currency = existingCapitalStructure.options_revenue_currency;
    }

    try {
        localLogger.debug(`Updating capital structure with shares: ${newShares}`);
        const { error } = await supabase
            .from('capital_structure')
            .upsert(capitalStructurePayload, { onConflict: 'company_id' });
            
        if (error) {
            localLogger.error(`Error upserting capital_structure: ${error.message}`, { details: error.details });
            throw error;
        }
        
        localLogger.info(`Successfully updated capital structure. Shares: ${existingShares || 'null'} -> ${newShares}`);
        return { updated: true };
    } catch (error) {
        return { updated: false, error: true, errorMessage: error.message };
    }
}

// --- Enhanced Main Processing Function ---
async function processCompany(company) {
    const { company_id, tsx_code, company_name, description, headquarters } = company;
    const localLogger = logger.child({ company_id, ticker: tsx_code });

    if (isShuttingDown) {
        localLogger.info(`Skipping due to shutdown signal.`);
        return { company_id, status: 'shutdown_skip', updates: {} };
    }
    
    if (!tsx_code || tsx_code.trim() === '') {
        localLogger.warn(`Skipping company due to missing ticker.`);
        return { company_id, status: 'skipped_no_ticker', updates: {} };
    }

    localLogger.info(`Processing financial details for: "${company_name}" (${tsx_code})`);

    // Fetch existing data for intelligent merging
    let existingFinancials = null;
    let existingCapitalStructure = null;
    let existingUrls = [];
    
    try {
        // Fetch existing financials
        const { data: finData, error: finError } = await supabase
            .from('financials')
            .select('*')
            .eq('company_id', company_id)
            .maybeSingle();
            
        if (!finError && finData) {
            existingFinancials = finData;
            localLogger.debug(`Found existing financials data`);
        }
        
        // Fetch existing capital structure
        const { data: capData, error: capError } = await supabase
            .from('capital_structure')
            .select('*')
            .eq('company_id', company_id)
            .maybeSingle();
            
        if (!capError && capData) {
            existingCapitalStructure = capData;
            localLogger.debug(`Found existing capital structure data`);
        }
        
        // Fetch existing URLs
        const { data: urlData, error: urlError } = await supabase
            .from('company_urls')
            .select('url_type, url')
            .eq('company_id', company_id);
            
        if (!urlError && urlData) {
            existingUrls = urlData;
            localLogger.debug(`Found ${urlData.length} existing URLs`);
        }
    } catch (e) {
        localLogger.warn(`Error fetching existing data: ${e.message}`);
    }

    // Fetch Yahoo data
    const yahooQuoteSummary = await retryOperation(
        () => fetchYahooFinancialDetailsWithTimeout(tsx_code),
        'fetchComprehensiveYahooData',
        tsx_code
    );

    if (!yahooQuoteSummary) {
        localLogger.error(`Failed to fetch Yahoo data after retries.`);
        return { company_id, status: 'yahoo_fetch_failed', updates: {} };
    }
    
    if (yahooQuoteSummary.usedMappedTicker) {
        localLogger.info(`Successfully used ticker mapping for data fetch`);
    }

    const updatesSummary = {
        profile: 'pending',
        urls: 'pending',
        financials: 'pending',
        capitalStructure: 'pending'
    };
    
    let overallStatus = 'processed_no_updates';
    let significantUpdate = false;
    let errorOccurred = false;

    try {
        // Update company profile
        const profileResult = await updateCompanyProfile(
            company_id, 
            tsx_code, 
            yahooQuoteSummary.summaryProfile, 
            { description, headquarters }
        );
        updatesSummary.profile = profileResult.updated ? 
            `updated (${profileResult.fieldsUpdated?.join(', ')})` : 
            (profileResult.error ? 'error' : profileResult.reason || 'no_change');
        if (profileResult.updated) overallStatus = 'processed_with_updates';
        if (profileResult.error) errorOccurred = true;

        // Update website URL
        const urlResult = await updateCompanyWebsiteUrl(
            company_id, 
            tsx_code, 
            yahooQuoteSummary.summaryProfile, 
            existingUrls
        );
        updatesSummary.urls = urlResult.updated ? 'updated' : 
            (urlResult.error ? 'error' : urlResult.reason || 'no_change');
        if (urlResult.updated) overallStatus = 'processed_with_updates';
        if (urlResult.error) errorOccurred = true;
        
        // Update financials
        const financialsResult = await updateFinancialsTableInSupabase(
            company_id, 
            tsx_code, 
            yahooQuoteSummary,
            existingFinancials
        );
        updatesSummary.financials = financialsResult.updated ? 
            `updated (${financialsResult.fieldsUpdated?.length} fields)` : 
            (financialsResult.error ? 'error' : financialsResult.reason || 'no_change');
        if (financialsResult.updated) {
            overallStatus = 'processed_with_updates';
            if (financialsResult.significantUpdate) significantUpdate = true;
        }
        if (financialsResult.error) errorOccurred = true;

        // Update capital structure
        const capitalResult = await updateCapitalStructureInSupabase(
            company_id, 
            tsx_code, 
            yahooQuoteSummary,
            existingCapitalStructure
        );
        updatesSummary.capitalStructure = capitalResult.updated ? 'updated' : 
            (capitalResult.error ? 'error' : capitalResult.reason || 'no_change');
        if (capitalResult.updated) overallStatus = 'processed_with_updates';
        if (capitalResult.error) errorOccurred = true;
        
        // Only update company last_updated if we made significant changes
        if (significantUpdate || profileResult.updated || urlResult.updated) {
            const { error: companyUpdateError } = await supabase
                .from('companies')
                .update({ last_updated: new Date().toISOString() })
                .eq('company_id', company_id);
                
            if (companyUpdateError) {
                localLogger.error(`Failed to update company last_updated: ${companyUpdateError.message}`);
            }
        }
        
    } catch (processError) {
        localLogger.error(`Error during processing: ${processError.message}`);
        errorOccurred = true;
    }

    if (errorOccurred) {
        overallStatus = 'processed_with_errors';
    } else if (significantUpdate) {
        overallStatus = 'processed_significant_updates';
    }

    localLogger.info(`Processing completed. Status: ${overallStatus}. Updates: ${JSON.stringify(updatesSummary)}`);
    return { company_id, status: overallStatus, updates: updatesSummary };
}

// --- Main Runner Function ---
async function runUpdater() {
    logger.info(`Yahoo Financial Details Updater Started. PID: ${process.pid}`);
    const lockFilePath = path.join(__dirname, 'update_financial_details.lock');

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

        await loadExchangeRates();

        logger.info(`Fetching all companies for financial detail update...`);
        const { data: companies, error: companiesError } = await supabase
            .from('companies')
            .select('company_id, tsx_code, company_name, description, headquarters')
            .order('company_id', { ascending: true });
            // .limit(10); // For testing

        if (companiesError) {
            logger.error("CRITICAL: Failed to fetch companies:", companiesError);
            throw companiesError;
        }
        
        if (!companies || companies.length === 0) {
            logger.info("No companies found to process.");
            return;
        }

        logger.info(`Fetched ${companies.length} companies for processing.`);
        
        // Enhanced statistics
        const stats = {
            total: companies.length,
            processed: 0,
            withUpdates: 0,
            significantUpdates: 0,
            noChanges: 0,
            errors: 0,
            schemaErrors: 0,
            quoteNotFound: 0
        };

        for (let i = 0; i < companies.length; i++) {
            if (isShuttingDown) {
                logger.info("Shutdown signal received, stopping.");
                break;
            }
            
            const company = companies[i];
            const result = await processCompany(company);
            stats.processed++;
            
            // Update statistics
            if (result.status === 'processed_significant_updates') {
                stats.withUpdates++;
                stats.significantUpdates++;
            } else if (result.status === 'processed_with_updates') {
                stats.withUpdates++;
            } else if (result.status === 'processed_no_updates') {
                stats.noChanges++;
            } else if (result.status.includes('error') || result.status === 'yahoo_fetch_failed') {
                stats.errors++;
            }
            
            // Progress logging
            if (stats.processed % LOG_PROGRESS_INTERVAL === 0 || stats.processed === companies.length) {
                logger.info(`--- Progress: ${stats.processed}/${stats.total} companies. ` +
                           `Updates: ${stats.withUpdates} (${stats.significantUpdates} significant), ` +
                           `No Changes: ${stats.noChanges}, Errors: ${stats.errors} ---`);
            }
            
            // Adaptive delay
            if (i < companies.length - 1 && !isShuttingDown) {
                const errorRate = stats.errors / stats.processed;
                const baseDelay = DELAY_BETWEEN_YAHOO_CALLS_MS;
                const delay_ms = errorRate > 0.1 ? baseDelay * 1.5 : baseDelay;
                await delay(delay_ms);
            }
        }
        
        logger.info(`Financial details update completed. Final statistics:`, stats);

    } catch (error) {
        logger.error(`Unhandled error in runUpdater: ${error.message}`, { stack: error.stack });
    } finally {
        if (fs.existsSync(lockFilePath)) {
            try { 
                fs.unlinkSync(lockFilePath); 
                logger.info('Lock file removed.'); 
            } catch (e) { 
                logger.error('Error removing lock file:', e); 
            }
        }
        logger.info('Financial details updater complete.');
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
    
    logger.info("Allowing ongoing operations to finish (max 5s)...");
    await delay(5000);

    if (fs.existsSync(LOCK_FILE)) {
        try { 
            fs.unlinkSync(LOCK_FILE); 
            logger.info('Lock file removed during shutdown.'); 
        } catch (e) { 
            logger.error('Error removing lock file during shutdown:', e); 
        }
    }
    
    logger.info('Shutdown complete. Exiting.');
    process.exit(0);
}

// Signal handlers
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('uncaughtException', (err, origin) => { 
    logger.error(`UNCAUGHT EXCEPTION: Origin: ${origin}, Error: ${err.message}`, { stack: err.stack });
    if (fs.existsSync(LOCK_FILE)) {
        try { fs.unlinkSync(LOCK_FILE); } catch (e) { /* ignore */ }
    }
    process.exit(1);
});
process.on('unhandledRejection', async (reason, promise) => { 
    const reasonMessage = reason instanceof Error ? reason.message : String(reason);
    const reasonStack = reason instanceof Error ? reason.stack : undefined;
    logger.error('UNHANDLED PROMISE REJECTION:', { reason: reasonMessage, stack: reasonStack });
    if (fs.existsSync(LOCK_FILE)) {
        try { fs.unlinkSync(LOCK_FILE); } catch (e) { /* ignore */ }
    }
    process.exit(1);
});

// Main execution
if (runOnce) {
    logger.info('Running in --once mode.');
    runUpdater().catch(e => {
        logger.error(`Error in --once mode: ${e.message}`, { stack: e.stack });
        if (fs.existsSync(LOCK_FILE)) { 
            try { fs.unlinkSync(LOCK_FILE); } catch (err) { /* ignore */ } 
        }
        process.exit(1);
    });
} else {
    logger.info(`Scheduled mode. Cron: "${CRON_SCHEDULE}" Timezone: "${CRON_TIMEZONE}"`);
    if (runNowAndSchedule) {
        logger.info("`--run-now` flag detected: Running immediately...");
        runUpdater().catch(e => logger.error(`Error during --run-now: ${e.message}`, { stack: e.stack }));
    } else {
        logger.info("Waiting for scheduled time. Use --run-now or --once to run immediately.");
    }
    
    cronTask = cron.schedule(CRON_SCHEDULE, () => {
        logger.info(`Cron job triggered at ${new Date().toISOString()}`);
        if (isShuttingDown) {
            logger.warn("Cron trigger skipped: Shutdown in progress.");
            return;
        }
        runUpdater().catch(e => logger.error(`Error during scheduled run: ${e.message}`, { stack: e.stack }));
    }, {
        scheduled: true,
        timezone: CRON_TIMEZONE
    });
    
    logger.info("Cron job scheduled. Press Ctrl+C to exit.");
}