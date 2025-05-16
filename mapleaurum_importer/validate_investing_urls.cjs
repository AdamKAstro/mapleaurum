// validate_investing_urls.cjs
require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');
const stringSimilarity = require('string-similarity');
const { createObjectCsvWriter } = require('csv-writer');
const fs = require('fs');
const path = require('path');
const winston = require('winston');
const csv = require('fast-csv');

// --- Configuration ---
const LOG_DIR = path.resolve(__dirname, 'logs_url_validation');
const CANDIDATE_CSV_DIR = path.resolve(__dirname, 'logs_url_discovery'); 
const OUTPUT_CSV_FILE = path.join(LOG_DIR, `investing_com_urls_validated_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.csv`);
const FETCH_TIMEOUT_MS = 25000; 
const SIMILARITY_THRESHOLD = 0.70; 
const DELAY_BETWEEN_COMPANIES_MS_MIN = 2500; // Slightly increased base delay
const DELAY_BETWEEN_COMPANIES_MS_MAX = 5500; // Slightly increased base delay
const DELAY_BETWEEN_CANDIDATE_FETCHES_MS = 1000; // Increased delay between candidates
const LOG_PROGRESS_INTERVAL = 5;

const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.5005.63 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.5 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:101.0) Gecko/20100101 Firefox/101.0',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.4951.64 Safari/537.36'
];
let currentUserAgentIndex = 0;

try {
    if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
    if (!fs.existsSync(CANDIDATE_CSV_DIR)) {
        console.warn(`Input CSV directory does not exist: ${CANDIDATE_CSV_DIR}. Script might not find input file.`);
    }
} catch (err) { console.error(`FATAL: Error creating log dir ${LOG_DIR}:`, err); process.exit(1); }

const logger = winston.createLogger({ /* ... (same Winston logger setup as before) ... */
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
        winston.format.errors({ stack: true }),
        winston.format.printf(({ timestamp, level, message, company_id, url_tested, step, ...rest }) => {
            let log = `${timestamp} [${level.toUpperCase()}]`;
            if (company_id) log += ` [CompID: ${company_id}]`;
            if (url_tested) log += ` [URL: ${(url_tested || '').substring(0,50)}...]`;
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
            format: winston.format.combine(winston.format.colorize(), winston.format.printf(({ timestamp, level, message, company_id, url_tested, step }) => {
                let log = `${timestamp} [${level}]`;
                if (company_id) log += ` [CompID: ${company_id}]`;
                if (url_tested) log += ` [URL: ${(url_tested || '').substring(0,30)}...]`;
                if (step) log += ` [Step: ${step}]`;
                log += `: ${message}`;
                return log;
            }))
        }),
        new winston.transports.File({ filename: path.join(LOG_DIR, 'url_validation_verbose.log'), maxsize: 10485760, maxFiles: 3, tailable: true, level: 'debug' }),
        new winston.transports.File({ filename: path.join(LOG_DIR, 'url_validation_errors.log'), level: 'error', maxsize: 10485760, maxFiles: 3, tailable: true })
    ],
    exceptionHandlers: [new winston.transports.File({ filename: path.join(LOG_DIR, 'url_validation_exceptions.log') })],
    rejectionHandlers: [new winston.transports.File({ filename: path.join(LOG_DIR, 'url_validation_rejections.log') })]
});

const INVESTING_COM_SELECTORS = {
    name_selector: 'h1.text-2xl[data-test="instrument-header-title"]', 
    // name_selector_alt1: '.instrument-header_title__GTJDQ', 
};
logger.debug(`Using Investing.com name selectors: ${JSON.stringify(INVESTING_COM_SELECTORS)}`);

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function getNextUserAgent() {
    const ua = USER_AGENTS[currentUserAgentIndex];
    currentUserAgentIndex = (currentUserAgentIndex + 1) % USER_AGENTS.length;
    return ua;
}

function getRandomDelay() { 
    return Math.floor(Math.random() * (DELAY_BETWEEN_COMPANIES_MS_MAX - DELAY_BETWEEN_COMPANIES_MS_MIN + 1)) + DELAY_BETWEEN_COMPANIES_MS_MIN;
}

async function validateUrl(urlToTest, dbCompanyName, dbNameAlt, localLogger) {
    // ... (validateUrl function remains IDENTICAL to the one in the previous response) ...
    // ... (It handles fetching, parsing, name comparison, and returns a status object) ...
    if (!urlToTest || typeof urlToTest !== 'string' || !urlToTest.startsWith('http')) {
        localLogger.warn(`Invalid or empty URL provided for validation: "${urlToTest}"`, { step: 'PRE_FETCH_VALIDATION' });
        return { status: 'INVALID_URL_FORMAT', extracted_name: null, similarity: 0, notes: 'URL was empty or malformed.' };
    }
    try {
        localLogger.debug(`Workspaceing candidate URL: ${urlToTest}`, { step: 'FETCH_ATTEMPT' });
        const response = await axios.get(urlToTest, {
            timeout: FETCH_TIMEOUT_MS,
            headers: {
                'User-Agent': getNextUserAgent(),
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Referer': 'https://www.google.com/' 
            },
            validateStatus: status => status >= 200 && status < 500,
        });

        localLogger.debug(`Response status ${response.status} for ${urlToTest}`, { step: 'FETCH_RESPONSE_STATUS' });

        if (response.status === 403) {
            localLogger.warn(`HTTP 403 Forbidden for URL: ${urlToTest}. Site is blocking.`, { step: 'FETCH_ERROR_403' });
            return { status: 'HTTP_403_FORBIDDEN', extracted_name: null, similarity: 0, notes: `Server returned 403.` };
        }
        if (response.status === 404) {
            localLogger.warn(`HTTP 404 Not Found for URL: ${urlToTest}`, { step: 'FETCH_ERROR_404' });
            return { status: 'HTTP_404_NOT_FOUND', extracted_name: null, similarity: 0, notes: `Server returned 404.` };
        }
        if (response.status >= 400) { 
            localLogger.warn(`HTTP ${response.status} for URL: ${urlToTest}`, { step: `Workspace_ERROR_${response.status}` });
            return { status: `HTTP_ERROR_${response.status}`, extracted_name: null, similarity: 0, notes: `Server returned ${response.status}.` };
        }

        const html = response.data;
        const $ = cheerio.load(html);
        let extractedName = $(INVESTING_COM_SELECTORS.name_selector).first().text().trim();
        
        if (!extractedName) {
            localLogger.warn(`Could not extract name from ${urlToTest} using selectors.`, { step: 'NAME_EXTRACTION_FAILED' });
            return { status: 'PAGE_ACCESSIBLE_NAME_NOT_EXTRACTED', extracted_name: null, similarity: 0, notes: 'Page fetched, but name not found with selectors.' };
        }

        localLogger.debug(`Extracted name "${extractedName}" from ${urlToTest}`, { step: 'NAME_EXTRACTED' });

        const s1 = stringSimilarity.compareTwoStrings((dbCompanyName || '').toLowerCase(), extractedName.toLowerCase());
        const s2 = dbNameAlt ? stringSimilarity.compareTwoStrings(dbNameAlt.toLowerCase(), extractedName.toLowerCase()) : 0;
        const similarity = Math.max(s1, s2);
        const matchedAgainst = s1 >= s2 && dbCompanyName ? 'db_company_name' : (dbNameAlt ? 'db_name_alt' : 'unknown_db_field');

        if (similarity >= SIMILARITY_THRESHOLD) {
            localLogger.info(`Validation SUCCESS for ${urlToTest}. Similarity: ${similarity.toFixed(3)} with "${extractedName}" (matched ${matchedAgainst})`, { step: 'VALIDATION_SUCCESS' });
            return { status: 'VALIDATED_MATCH', extracted_name: extractedName, similarity: parseFloat(similarity.toFixed(3)), notes: `Matched with ${matchedAgainst}` };
        } else {
            localLogger.warn(`Validation FAILED for ${urlToTest}. Low similarity: ${similarity.toFixed(3)}. Page name: "${extractedName}", DB names: ["${dbCompanyName}", "${dbNameAlt || ''}"]`, { step: 'VALIDATION_LOW_SIMILARITY' });
            return { status: 'PAGE_ACCESSIBLE_NAME_MISMATCH', extracted_name: extractedName, similarity: parseFloat(similarity.toFixed(3)), notes: `Low similarity. Matched with ${matchedAgainst}` };
        }

    } catch (error) {
        if (axios.isAxiosError(error) && error.code === 'ECONNABORTED') {
            localLogger.error(`Timeout fetching ${urlToTest} after ${FETCH_TIMEOUT_MS}ms.`, { step: 'FETCH_TIMEOUT' });
            return { status: 'FETCH_TIMEOUT', extracted_name: null, similarity: 0, notes: 'Request timed out.' };
        }
        localLogger.error(`Generic error validating URL ${urlToTest}: ${error.message}`, { step: 'VALIDATION_GENERIC_ERROR', stack_brief: error.stack?.substring(0,200) });
        return { status: 'GENERIC_FETCH_ERROR', extracted_name: null, similarity: 0, notes: error.message };
    }
}

// --- NEW: Pre-flight check function ---
async function performPreFlightChecks() {
    logger.info("Performing pre-flight checks with known-good URLs...", { step: 'PRE_FLIGHT_START' });
    const KNOWN_GOOD_URLS_TO_TEST = [
        { name: "ABERDEEN INTERNATIONAL", url: "https://www.investing.com/equities/aberdeen-international-inc." }, // Note the trailing period
        { name: "IRVING RESOURCES", url: "https://www.investing.com/equities/irving-resources-inc" },
        { name: "INTL. TOWER HILL MINES", url: "https://www.investing.com/equities/international-tower-hill-mines?cid=24960" },
        { name: "ABCOURT MINES", url: "https://www.investing.com/equities/abcourt-mines-inc" },
        { name: "AGNICO EAGLE MINES", url: "https://www.investing.com/equities/agnico-eagle-mines" } 
    ];

    let successfulChecks = 0;
    let failedChecks = 0;

    for (const testCase of KNOWN_GOOD_URLS_TO_TEST) {
        const preFlightLogger = logger.child({ company_name_test: testCase.name, url_tested: testCase.url });
        preFlightLogger.info(`Pre-flight test for: "${testCase.name}"`);
        const result = await validateUrl(testCase.url, testCase.name, '', preFlightLogger); // Pass empty altName for simplicity here
        
        if (result.status === 'VALIDATED_MATCH' || result.status.startsWith('PAGE_ACCESSIBLE')) {
            preFlightLogger.info(`Pre-flight check SUCCEEDED for "${testCase.name}" with status: ${result.status}`);
            successfulChecks++;
        } else {
            preFlightLogger.error(`Pre-flight check FAILED for "${testCase.name}". Status: ${result.status}, Notes: ${result.notes}`);
            failedChecks++;
        }
        await delay(getRandomDelay()); // Be respectful even during pre-flight
    }

    logger.info(`Pre-flight checks complete. Successful: ${successfulChecks}, Failed (403s, 404s, etc.): ${failedChecks}`, { step: 'PRE_FLIGHT_END' });
    if (failedChecks > 0 && successfulChecks < KNOWN_GOOD_URLS_TO_TEST.length / 2) { // If more than half fail, or any critical number
        logger.error("Many pre-flight checks failed, particularly with 403s or other errors. This indicates a high likelihood of being blocked by Investing.com. Further automated validation may be ineffective.");
        logger.warn("Consider stopping the script and re-evaluating your IP, User-Agent strategy, or relying on manual validation for Investing.com URLs.");
        // You could choose to exit here: process.exit(1); 
        // For now, we'll let it continue but with a strong warning.
        return false; // Indicate pre-flight had significant issues
    }
    if (failedChecks === KNOWN_GOOD_URLS_TO_TEST.length) {
        logger.error("ALL pre-flight checks failed. It's highly probable that Investing.com is blocking requests from this script/IP.");
        return false; // All failed
    }
    return true; // Pre-flight passed sufficiently well
}


async function processCandidateUrls() {
    logger.info("Starting Investing.com URL Candidate Validation Script...");
    let isScriptInterrupted = false;
    process.on('SIGINT', () => {
        logger.warn('SIGINT received! Script will attempt to finish current company and then stop before writing CSV.');
        isScriptInterrupted = true;
    });

    // Perform pre-flight checks
    const preFlightSuccessful = await performPreFlightChecks();
    if (!preFlightSuccessful) {
        logger.error("Pre-flight checks indicated significant issues. Aborting main URL validation process. Please check logs.");
        return; // Stop if pre-flight checks fail badly
    }
    logger.info("Pre-flight checks passed sufficiently. Proceeding with CSV processing.");
    await delay(getRandomDelay()); // Pause after pre-flight

    let inputCsvFile = '';
    // ... (rest of the CSV finding logic as before) ...
    try {
        const files = fs.readdirSync(CANDIDATE_CSV_DIR);
        const candidateFiles = files
            .filter(f => f.startsWith('investing_com_url_candidates_v2_') && f.endsWith('.csv'))
            .sort((a, b) => b.localeCompare(a)); 
        if (candidateFiles.length > 0) {
            inputCsvFile = path.join(CANDIDATE_CSV_DIR, candidateFiles[0]);
            logger.info(`Using input CSV: ${inputCsvFile}`);
        } else {
            logger.error(`No candidate CSV file found matching pattern in ${CANDIDATE_CSV_DIR}. Run Script 1 first. Exiting.`);
            return;
        }
    } catch (e) {
        logger.error(`Error finding input CSV file in ${CANDIDATE_CSV_DIR}: ${e.message}`);
        return;
    }

    const rowsToValidate = [];
    try {
        await new Promise((resolve, reject) => {
            fs.createReadStream(inputCsvFile)
                .pipe(csv.parse({ headers: true, ignoreEmpty: true, trim: true }))
                .on('error', error => { logger.error(`Error reading CSV ${inputCsvFile}:`, error); isScriptInterrupted = true; reject(error); })
                .on('data', row => rowsToValidate.push(row))
                .on('end', (rowCount) => { logger.info(`Read ${rowCount} rows from ${inputCsvFile}. Starting validation...`); resolve(); });
        });
    } catch (e) { logger.error("Could not complete CSV reading. Aborting."); return; }
    
    if (isScriptInterrupted || rowsToValidate.length === 0) { logger.info("No rows to validate or script interrupted."); return; }

    const validatedRecords = [];
    let companiesProcessedCount = 0;

    for (let i = 0; i < rowsToValidate.length; i++) {
        if (isScriptInterrupted) { logger.warn("Validation loop interrupted."); break; }
        const row = rowsToValidate[i];
        const companyId = row.Company_ID; 
        const tsxCode = row.TSX_Code;
        const dbCompanyName = row.DB_Company_Name;
        const dbNameAlt = row.DB_Name_Alt;
        const localLogger = logger.child({ company_id: companyId, ticker: tsxCode || 'N/A' });
        
        localLogger.info(`Validating URLs for company ${companiesProcessedCount + 1}/${rowsToValidate.length}: ${dbCompanyName}`);

        let bestOverallResult = { 
            status: 'NO_CANDIDATES_IN_ROW_OR_ALL_FAILED', extracted_name: null, similarity: 0, 
            notes: 'No valid URLs in candidate columns for this row, or all attempts failed.', validated_url: '' 
        };
        let foundValidatedMatch = false;
        
        const candidateUrlFields = [
            'Candidate_URL_Name_FullSuffix', 'Candidate_URL_Name_NoSuffix',
            'Candidate_URL_Alt_FullSuffix', 'Candidate_URL_Alt_NoSuffix',
            row.URL_Status === 'EXISTING_IN_DB' ? row.Proposed_or_Existing_URL : null // Add existing URL if it was logged this way
        ];
        
        const uniqueUrlsToTest = Array.from(new Set(
            candidateUrlFields.map(fieldKey => row[fieldKey])
                            .filter(url => url && typeof url === 'string' && url.startsWith('http'))
        ));

        localLogger.debug(`Unique candidate URLs to test for this company: ${JSON.stringify(uniqueUrlsToTest)}`);

        if (uniqueUrlsToTest.length > 0) {
            for (const candidateUrl of uniqueUrlsToTest) {
                if (isScriptInterrupted) break;
                const currentValidationResult = await validateUrl(candidateUrl, dbCompanyName, dbNameAlt, localLogger);
                
                if (currentValidationResult.status === 'VALIDATED_MATCH') {
                    bestOverallResult = { ...currentValidationResult, validated_url: candidateUrl };
                    foundValidatedMatch = true;
                    localLogger.info(`Top match FOUND for ${dbCompanyName}: ${candidateUrl} (Similarity: ${currentValidationResult.similarity})`);
                    break; 
                }

                if (!foundValidatedMatch) {
                    const currentIsBetter = 
                        (bestOverallResult.status.includes('ERROR') || bestOverallResult.status.includes('TIMEOUT') || bestOverallResult.status.startsWith('NO_CANDIDATES') || bestOverallResult.status.startsWith('ALL_CANDIDATES_TESTED')) && 
                        !currentValidationResult.status.includes('ERROR') && !currentValidationResult.status.includes('TIMEOUT') ||
                        (currentValidationResult.status.startsWith('PAGE_ACCESSIBLE') && (bestOverallResult.status.includes('ERROR') || bestOverallResult.status.includes('TIMEOUT'))) ||
                        (currentValidationResult.status === 'PAGE_ACCESSIBLE_NAME_MISMATCH' && bestOverallResult.status === 'PAGE_ACCESSIBLE_NAME_NOT_EXTRACTED') ||
                        (currentValidationResult.status === 'PAGE_ACCESSIBLE_NAME_MISMATCH' && bestOverallResult.status === 'PAGE_ACCESSIBLE_NAME_MISMATCH' && currentValidationResult.similarity > bestOverallResult.similarity) ||
                        (currentValidationResult.status === 'PAGE_ACCESSIBLE_NAME_NOT_EXTRACTED' && (bestOverallResult.status.includes('ERROR') || bestOverallResult.status.includes('TIMEOUT')));
                    
                    if (isCurrentBetter) {
                        bestOverallResult = { ...currentValidationResult, validated_url: candidateUrl };
                    }
                }
                await delay(DELAY_BETWEEN_CANDIDATE_FETCHES_MS); 
            }
        } else {
            bestOverallResult.notes = 'No valid candidate URLs were present in the input CSV row to test for this company.';
            localLogger.warn("No valid candidate URLs found for this company in the CSV row.")
        }

        validatedRecords.push({
            company_id: companyId, tsx_code: tsxCode,
            db_company_name: dbCompanyName, db_name_alt: dbNameAlt,
            validation_status: bestOverallResult.status,
            validated_url: bestOverallResult.validated_url,
            extracted_name_on_page: bestOverallResult.extracted_name || '',
            calculated_similarity_score: bestOverallResult.similarity || 0,
            notes: bestOverallResult.notes || ''
        });

        companiesProcessedCount++;
        if (companiesProcessedCount % LOG_PROGRESS_INTERVAL === 0 || companiesProcessedCount === rowsToValidate.length) {
            logger.info(`Validation Progress: ${companiesProcessedCount}/${rowsToValidate.length} companies' URL candidates processed.`);
        }
        if (!isScriptInterrupted && i < rowsToValidate.length -1) {
            await delay(getRandomDelay());
        }
    }

    if (validatedRecords.length > 0) {
        const validatedCsvWriter = createObjectCsvWriter({
            path: OUTPUT_CSV_FILE,
            header: [
                { id: 'company_id', title: 'Company_ID' },
                { id: 'tsx_code', title: 'TSX_Code' },
                { id: 'db_company_name', title: 'DB_Company_Name' },
                { id: 'db_name_alt', title: 'DB_Name_Alt' },
                { id: 'validation_status', title: 'Validation_Status' },
                { id: 'validated_url', title: 'Tested_URL_Outcome' },
                { id: 'extracted_name_on_page', title: 'Name_Found_on_Page' },
                { id: 'calculated_similarity_score', title: 'Similarity_Score' },
                { id: 'notes', title: 'Notes' }
            ]
        });
        try {
            await validatedCsvWriter.writeRecords(validatedRecords);
            logger.info(`SUCCESS: Wrote ${validatedRecords.length} validation results to ${OUTPUT_CSV_FILE}`);
            logger.info("Please review this new CSV. Rows with 'VALIDATED_MATCH' are good candidates to update in your 'company_urls' table.");
        } catch(csvError) {
            logger.error(`CRITICAL: Error writing validation results to CSV file ${OUTPUT_CSV_FILE}:`, csvError);
        }
    } else {
        logger.info("No records were validated to write to output CSV.");
    }
    logger.info("Investing.com URL validation script finished.");
}

async function main() {
    logger.info(`Script execution started (URL Validator v2.1 - Iterates All Candidates) at ${new Date().toISOString()}`);
    const lockFilePath = path.join(__dirname, 'validate_investing_urls.lock'); 

    if (fs.existsSync(lockFilePath)) {
        logger.warn(`Lock file '${lockFilePath}' exists. Another instance might be running or previous run failed to clean up. Exiting.`);
        return; 
    }

    try {
        fs.writeFileSync(lockFilePath, `Running since: ${new Date().toISOString()}, PID: ${process.pid}`);
        logger.info('Lock file created.');
        await processCandidateUrls(); 
    } catch (error) {
        logger.error('CRITICAL: Unhandled error in main script execution:', { message: error.message, stack: error.stack });
        process.exitCode = 1;
    } finally {
        if (fs.existsSync(lockFilePath)) {
            try {
                fs.unlinkSync(lockFilePath);
                logger.info('Lock file removed successfully.');
            } catch (unlinkErr) {
                logger.error(`Error removing lock file '${lockFilePath}':`, unlinkErr);
            }
        }
        logger.info(`Script execution finished (URL Validator v2.1) at ${new Date().toISOString()}.`);
    }
}

if (require.main === module) {
    main().catch(error => {
        logger.error("FATAL: Top-level unhandled promise rejection in script:", error);
        process.exit(1);
    });
}