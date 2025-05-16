// discover_investing_urls.cjs (Corrected function call in main)
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { createObjectCsvWriter } = require('csv-writer');
const winston = require('winston');
const path = require('path');
const fs = require('fs');

// --- Configuration ---
const LOG_DIR = path.resolve(__dirname, 'logs_url_discovery');
const OUTPUT_CSV_FILE = path.join(LOG_DIR, `investing_com_url_candidates_v2_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.csv`);
const LOG_PROGRESS_INTERVAL = 50;
// DELAY_BETWEEN_COMPANIES_MS and DELAY_BETWEEN_CANDIDATE_URL_FETCHES_MS are not used in this version as we are not fetching external URLs
// const FETCH_TIMEOUT_MS = 20000; // Not used in this version
// const SIMILARITY_THRESHOLD = 0.70; // Not used in this version as we are not validating by fetching

try {
    if (!fs.existsSync(LOG_DIR)) {
        fs.mkdirSync(LOG_DIR, { recursive: true });
        console.log(`Log directory created: ${LOG_DIR}`);
    }
} catch (err) {
    console.error(`FATAL: Error creating log directory ${LOG_DIR}:`, err);
    process.exit(1);
}

// --- Logger Setup (Winston) ---
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
                try {
                    log += ` ${JSON.stringify(filteredRest)}`;
                } catch (e) { /* ignore */ }
            }
            return log;
        })
    ),
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.printf(({ timestamp, level, message, company_id, ticker, step }) => {
                    let log = `${timestamp} [${level}]`;
                    if (company_id) log += ` [CompID: ${company_id}]`;
                    if (ticker) log += ` [${ticker || 'NoTicker'}]`;
                    if (step) log += ` [Step: ${step}]`;
                    log += `: ${message}`;
                    return log;
                })
            )
        }),
        new winston.transports.File({ filename: path.join(LOG_DIR, 'url_candidate_generation.log'), maxsize: 10485760, maxFiles: 3, tailable: true, level: 'debug' }),
        new winston.transports.File({ filename: path.join(LOG_DIR, 'url_candidate_generation_errors.log'), level: 'error', maxsize: 10485760, maxFiles: 3, tailable: true })
    ],
    exceptionHandlers: [new winston.transports.File({ filename: path.join(LOG_DIR, 'url_candidate_exceptions.log') })],
    rejectionHandlers: [new winston.transports.File({ filename: path.join(LOG_DIR, 'url_candidate_rejections.log') })]
});

// --- Supabase Client ---
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    logger.error("Supabase URL or Service Key is missing in .env file. Script cannot proceed.");
    process.exit(1);
}
let supabase;
try {
    supabase = createClient(supabaseUrl, supabaseServiceKey);
    logger.info("Supabase client initialized.");
} catch (error) {
    logger.error("CRITICAL: Failed to initialize Supabase client.", { error: error.message, stack: error.stack });
    process.exit(1);
}

/**
 * Base function to sanitize and slugify a name.
 * @param {string} name - The company name.
 * @returns {string} A URL-friendly slug.
 */
function _sanitizeAndSlugify(name) {
    if (!name || typeof name !== 'string') return '';
    return name
        .toLowerCase()
        .replace(/&amp;/g, 'and')
        .replace(/&/g, 'and')
        .replace(/\./g, '')
        .replace(/,/g, '')
        .replace(/\(/g, '')
        .replace(/\)/g, '')
        .replace(/'/g, '')
        .replace(/[^a-z0-9\s-]/g, '') 
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');
}

/**
 * Generates a URL slug from a name, keeping common corporate designators.
 * @param {string} name - The company name.
 * @returns {string} A URL-friendly slug.
 */
function nameToUrlSlugKeepingSuffixes(name) {
    return _sanitizeAndSlugify(name);
}

/**
 * Generates a URL slug from a name, attempting to remove common corporate designators.
 * @param {string} name - The company name.
 * @returns {string} A URL-friendly slug.
 */
function nameToUrlSlugRemovingSuffixes(name) {
    if (!name || typeof name !== 'string') return '';
    let tempName = name.toLowerCase();
    const suffixes = [
        ' corporation', ' incorporated', ' limited partnership', ' limited liability company',
        ' ltd liability co', ' limited', ' corp', ' inc', ' ltd', ' lp', ' llc', ' plc', ' co'
    ];
    for (const suffix of suffixes) {
        if (tempName.endsWith(suffix)) {
            tempName = tempName.substring(0, tempName.length - suffix.length);
            break; 
        }
    }
    return _sanitizeAndSlugify(tempName);
}

/**
 * Tests Supabase connection by trying to fetch a single record or count.
 * @returns {Promise<boolean>} True if connection seems okay, false otherwise.
 */
async function testSupabaseConnection() {
    logger.info("Testing Supabase connection by fetching a single company (ID: 1 as example)...", { step: 'SUPABASE_CONNECTION_TEST'});
    try {
        // Using a specific ID might fail if ID 1 doesn't exist. A count is safer.
        const { error, count } = await supabase
            .from('companies')
            .select('company_id', { count: 'exact', head: true }); 

        if (error) {
            logger.error("Supabase connection test failed during query:", { message: error.message, details: error.details, hint: error.hint });
            return false;
        }
        // If count is a number (even 0), the query executed successfully against the table.
        if (typeof count === 'number') {
            logger.info(`Supabase connection test successful. Table 'companies' is accessible. Found ${count} records.`);
            return true;
        } else {
             logger.warn("Supabase connection test: Query executed but count was not returned as expected. Table might be empty or RLS issue for count. Basic connection to DB seems OK.");
            return true; // Allow to proceed if query itself didn't error.
        }
    } catch (e) {
        logger.error("Supabase connection test critically failed (exception):", { message: e.message, stack: e.stack });
        return false;
    }
}

/**
 * Main function to discover and propose Investing.com URLs.
 */
async function discoverInvestingUrls() { // This is the correct function name
    logger.info("Starting Investing.com URL candidate generation process (v2)...");
    let isScriptInterrupted = false;
    process.on('SIGINT', () => {
        logger.warn('SIGINT received! Script will attempt to finish current company and then stop before writing CSV.');
        isScriptInterrupted = true;
    });

    if (!await testSupabaseConnection()) {
        logger.error("Supabase connection test failed. Aborting URL discovery script.");
        return;
    }

    logger.info("Fetching companies from Supabase database...", { step: 'FETCH_COMPANIES_FROM_DB' });
    const { data: companies, error: companiesError } = await supabase
        .from('companies')
        .select('company_id, tsx_code, company_name, name_alt')
        .order('company_id', { ascending: true });

    if (companiesError) {
        logger.error("CRITICAL: Error fetching companies from Supabase. Aborting.", { details: companiesError });
        return;
    }
    if (!companies || companies.length === 0) {
        logger.info("No companies found in the database to process.");
        return;
    }
    logger.info(`Successfully fetched ${companies.length} companies to process for Investing.com URL candidate generation.`);

    logger.info("Fetching existing Investing.com URLs from 'company_urls' table...", { step: 'FETCH_EXISTING_URLS' });
    const { data: existingUrlsData, error: urlsError } = await supabase
        .from('company_urls')
        .select('company_id, url')
        .eq('url_type', 'investing_com');

    if (urlsError) {
        logger.warn("Warning: Error fetching existing company_urls for 'investing_com'. Will proceed assuming no existing URLs.", { details: urlsError });
    }
    const existingInvestingUrls = new Map(); // Correct JavaScript Map initialization
    if (existingUrlsData) {
        existingUrlsData.forEach(row => existingInvestingUrls.set(row.company_id, row.url));
        logger.info(`Loaded ${existingInvestingUrls.size} existing Investing.com URLs.`);
    }

    const csvWriterInstance = createObjectCsvWriter({
        path: OUTPUT_CSV_FILE,
        header: [
            { id: 'company_id', title: 'Company_ID' },
            { id: 'tsx_code', title: 'TSX_Code' },
            { id: 'db_company_name', title: 'DB_Company_Name' },
            { id: 'db_name_alt', title: 'DB_Name_Alt' },
            { id: 'status', title: 'URL_Status' },
            { id: 'candidate_url_name_full', title: 'Candidate_URL_Name_FullSuffix' },
            { id: 'candidate_url_name_nosuffix', title: 'Candidate_URL_Name_NoSuffix' },
            { id: 'candidate_url_alt_full', title: 'Candidate_URL_AltName_FullSuffix' },
            { id: 'candidate_url_alt_nosuffix', title: 'Candidate_URL_AltName_NoSuffix' },
            { id: 'manual_verification_needed', title: 'Manual_Verification_Needed' },
            { id: 'notes', title: 'Notes' }
        ]
    });
    const recordsToWriteToCsv = [];
    let processedCount = 0;

    for (const company of companies) {
        if (isScriptInterrupted) {
            logger.warn("Processing loop interrupted by SIGINT.");
            break;
        }

        const localLogger = logger.child({ company_id: company.company_id, ticker: company.tsx_code || 'N/A' });
        
        let csvRecord = {
            company_id: company.company_id,
            tsx_code: company.tsx_code || '',
            db_company_name: company.company_name || '',
            db_name_alt: company.name_alt || '',
            status: '',
            candidate_url_name_full: '',
            candidate_url_name_nosuffix: '',
            candidate_url_alt_full: '',
            candidate_url_alt_nosuffix: '',
            manual_verification_needed: 'YES',
            notes: ''
        };

        localLogger.debug(`Processing company ${processedCount + 1}/${companies.length}: "${company.company_name || 'N/A'}"`);

        if (existingInvestingUrls.has(company.company_id)) {
            csvRecord.status = 'EXISTING_IN_DB';
            csvRecord.candidate_url_name_full = existingInvestingUrls.get(company.company_id);
            csvRecord.notes = 'URL already exists in company_urls. Manual re-validation still recommended if old.';
            localLogger.info(`Company already has an Investing.com URL in db: ${csvRecord.candidate_url_name_full}`);
        } else {
            csvRecord.status = 'CANDIDATES_GENERATED';
            let notesArr = [];

            const slugNameFull = nameToUrlSlugKeepingSuffixes(company.company_name);
            if (slugNameFull) {
                csvRecord.candidate_url_name_full = `https://www.investing.com/equities/${slugNameFull}`;
            } else {
                notesArr.push('No slug from company_name (full).');
            }

            const slugNameNoSuffix = nameToUrlSlugRemovingSuffixes(company.company_name);
            if (slugNameNoSuffix && slugNameNoSuffix !== slugNameFull) {
                csvRecord.candidate_url_name_nosuffix = `https://www.investing.com/equities/${slugNameNoSuffix}`;
            } else if (!slugNameNoSuffix && slugNameFull) { // If no suffix version is same as full, no need to populate, unless full was also empty
                // notesArr.push('No distinct slug from company_name (no suffix).');
            } else if (!slugNameNoSuffix && !slugNameFull) {
                notesArr.push('No slug from company_name (no suffix).');
            }


            if (company.name_alt) {
                const slugAltFull = nameToUrlSlugKeepingSuffixes(company.name_alt);
                if (slugAltFull) {
                    csvRecord.candidate_url_alt_full = `https://www.investing.com/equities/${slugAltFull}`;
                } else {
                    notesArr.push('No slug from name_alt (full).');
                }

                const slugAltNoSuffix = nameToUrlSlugRemovingSuffixes(company.name_alt);
                if (slugAltNoSuffix && slugAltNoSuffix !== slugAltFull) {
                    csvRecord.candidate_url_alt_nosuffix = `https://www.investing.com/equities/${slugAltNoSuffix}`;
                } else if (!slugAltNoSuffix && slugAltFull) {
                    // notesArr.push('No distinct slug from name_alt (no suffix).');
                } else if (!slugAltNoSuffix && !slugAltFull) {
                    notesArr.push('No slug from name_alt (no suffix).');
                }
            } else {
                notesArr.push('No name_alt provided.');
            }
            
            if (!csvRecord.candidate_url_name_full && !csvRecord.candidate_url_name_nosuffix && !csvRecord.candidate_url_alt_full && !csvRecord.candidate_url_alt_nosuffix) {
                csvRecord.status = 'NO_SLUGS_GENERATED';
                localLogger.warn('No valid URL slugs could be generated for this company.');
            }
            csvRecord.notes = notesArr.join(' ').trim();
            localLogger.info(`Generated candidates. NameFull: ${csvRecord.candidate_url_name_full || 'N/A'}, NameNoSuffix: ${csvRecord.candidate_url_name_nosuffix || 'N/A'}, AltFull: ${csvRecord.candidate_url_alt_full || 'N/A'}, AltNoSuffix: ${csvRecord.candidate_url_alt_nosuffix || 'N/A'}`);
        }
        
        recordsToWriteToCsv.push(csvRecord);
        processedCount++;
        if (processedCount % LOG_PROGRESS_INTERVAL === 0 || processedCount === companies.length) {
            logger.info(`Progress: ${processedCount}/${companies.length} companies processed for URL candidate generation.`);
        }
    }

    if (recordsToWriteToCsv.length > 0) {
        try {
            await csvWriterInstance.writeRecords(recordsToWriteToCsv);
            logger.info(`SUCCESS: Wrote ${recordsToWriteToCsv.length} URL candidates to ${OUTPUT_CSV_FILE}`);
            logger.info("Please review the CSV file manually. Visit the candidate URLs to verify they point to the correct company page on Investing.com. Then, update your 'company_urls' table in Supabase with the correct URLs and url_type='investing_com'.");
        } catch(csvError) {
            logger.error(`CRITICAL: Error writing URL candidates to CSV file ${OUTPUT_CSV_FILE}:`, csvError);
        }
    } else {
        logger.info("No company records were processed to write to CSV (e.g., initial company fetch failed or list was empty).");
    }

    logger.info("Investing.com URL candidate generation script finished.");
}

async function main() {
    logger.info(`Script execution started (v2 - Candidate Generation) at ${new Date().toISOString()}`);
    const lockFilePath = path.join(__dirname, 'discover_urls_v2.lock'); 

    if (fs.existsSync(lockFilePath)) {
        logger.warn(`Lock file '${lockFilePath}' exists. Another instance might be running or previous run failed to clean up. Exiting.`);
        return; 
    }

    try {
        fs.writeFileSync(lockFilePath, `Running since: ${new Date().toISOString()}, PID: ${process.pid}`);
        logger.info('Lock file created.');
        await discoverInvestingUrls(); // CORRECTED: Calling the defined function name
    } catch (error) {
        logger.error('CRITICAL: Unhandled error in main script execution flow:', { message: error.message, stack: error.stack });
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
        logger.info(`Script execution finished (v2) at ${new Date().toISOString()}.`);
    }
}

if (require.main === module) {
    main().catch(error => {
        logger.error("FATAL: Top-level unhandled promise rejection in script execution:", error);
        process.exit(1);
    });
}