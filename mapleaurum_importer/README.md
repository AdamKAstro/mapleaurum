# Maple Aurum - Supabase Data Updater Scripts

This directory contains Node.js scripts designed to fetch financial data, stock prices, and exchange rates to populate and update your Supabase database for the Maple Aurum application.

**Current Date of this README's Last Update:** May 16, 2025

## Overview & Recommended Order of Operations

These scripts help maintain different aspects of your financial database. It's generally recommended to run them in an order that ensures foundational data (like exchange rates) is present before dependent calculations or updates occur.

1.  **`update_exchange_rates.cjs` (Run Occasionally as Needed):**
    * Fetches latest exchange rates for a defined set of currencies against USD and stores them with a fetch date. This is important for currency conversions in other scripts and in your application.
2.  **`update_supabase_from_yahoo.cjs` (Run Daily):**
    * Fetches the latest daily closing stock prices from Yahoo Finance.
    * Updates your `stock_prices` table. This script performs threshold checks against previously stored prices to avoid large erroneous updates.
3.  **`update_financial_details_from_yahoo.cjs` (Run Regularly, e.g., Weekly or Monthly):**
    * Fetches comprehensive financial details (market cap, revenue, EBITDA, P/E ratios, company profile info like description/website, shares outstanding) from Yahoo Finance.
    * Updates tables like `financials`, `companies`, `capital_structure`, and `company_urls`. It employs a cautious update strategy, often preferring to fill NULLs or update based on specific conditions.
4.  **`populate_derived_metrics.cjs` (Run After Financial Details Updates):**
    * Calculates derived financial ratios and valuation metrics based on data already present in your `financials`, `mineral_estimates`, and `production` tables.
    * It only fills in `NULL` values for these metrics in your `financials` and `valuation_metrics` tables.

*(The `discover_investing_urls.cjs` script for Investing.com URL candidate generation is a separate utility if you wish to pursue that data source manually, and is not covered further in this main README for Yahoo updaters).*

## Prerequisites

* **Node.js:** Ensure you have a recent LTS version of Node.js installed (e.g., v18, v20, or v22).
* **npm or yarn:** For installing package dependencies.
* **Supabase Project:** Your Supabase project should be set up with the relevant tables.

## Setup Instructions

1.  **Project Directory:**
    Ensure this `README.md` and all `.cjs` script files are in your project directory (e.g., `mapleaurum_importer/`).

2.  **Install Dependencies:**
    Navigate to your script directory in your terminal/Git Bash and run:
    ```bash
    npm install dotenv @supabase/supabase-js yahoo-finance2 winston node-cron axios fast-csv csv-writer string-similarity
    ```
    * `dotenv`: For environment variables.
    * `@supabase/supabase-js`: Supabase client.
    * `yahoo-finance2`: For Yahoo Finance data.
    * `winston`: For logging.
    * `node-cron`: For scheduling (used by some scripts).
    * `axios`: For HTTP requests (used by `update_exchange_rates.cjs`).
    * *(fast-csv, csv-writer, string-similarity were for the Investing.com scripts, but good to have if you run those separately).*

3.  **Create `.env` File:**
    In the root of your script directory (e.g., `mapleaurum_importer/.env`), create a file named `.env`:
    ```env
    # Supabase Credentials
    SUPABASE_URL=[https://your-project-ref.supabase.co](https://your-project-ref.supabase.co)
    SUPABASE_SERVICE_KEY=your_supabase_service_role_key_eyJh...... # IMPORTANT: Use Service Role Key

    # Logging Level (optional, defaults to 'info' for most scripts)
    # Options: error, warn, info, http, verbose, debug, silly
    LOG_LEVEL=info

    # --- Configuration for update_supabase_from_yahoo.cjs (Daily Stock Prices) ---
    # YAHOO_PRICE_CRON_SCHEDULE="30 4 * * *" # Daily at 4:30 AM UTC (default in script)
    # YAHOO_PRICE_CRON_TIMEZONE="Etc/UTC"
    # PRICE_CHANGE_WARN_THRESHOLD=0.30 # e.g., 30%
    # YAHOO_PRICE_FETCH_TIMEOUT_MS=40000
    # YAHOO_PRICE_RETRY_COUNT=2
    # YAHOO_PRICE_RETRY_DELAY_MS=3000

    # --- Configuration for update_financial_details_from_yahoo.cjs (Full Financials) ---
    # FIN_DETAIL_CRON_SCHEDULE="0 5 * * SUN" # e.g., Weekly on Sunday at 5:00 AM UTC
    # FIN_DETAIL_CRON_TIMEZONE="Etc/UTC"
    # FIN_DETAIL_FETCH_TIMEOUT_MS=70000
    # FIN_DETAIL_RETRY_COUNT=3
    # FIN_DETAIL_RETRY_DELAY_MS=6000
    ```
    * **Service Role Key:** Essential for backend scripts that need to write data. Keep it secure.

## Database Table Prerequisites & SQL Setups

Before running the scripts, ensure your Supabase tables are correctly structured.

### 1. `stock_prices` Table (for `update_supabase_from_yahoo.cjs`)
   * **`data_source TEXT` column:**
     ```sql
     ALTER TABLE public.stock_prices ADD COLUMN IF NOT EXISTS data_source TEXT;
     ```
   * **`price_date` column as `DATE` type (Recommended):**
     ```sql
     -- BACKUP FIRST IF DATA EXISTS!
     ALTER TABLE public.stock_prices ALTER COLUMN price_date TYPE DATE USING CAST(price_date AS DATE);
     ```
   * **`UNIQUE` constraint for daily prices per source:**
     ```sql
     ALTER TABLE public.stock_prices DROP CONSTRAINT IF EXISTS stock_prices_company_date_source_unique;
     ALTER TABLE public.stock_prices ADD CONSTRAINT stock_prices_company_date_source_unique UNIQUE (company_id, price_date, data_source);
     ```
   * **`price_id` sequence check (if `pkey` errors persist):**
     ```sql
     -- Check current max price_id
     SELECT MAX(price_id) AS current_max_price_id FROM public.stock_prices;
     -- Check current sequence value
     SELECT last_value FROM public.stock_prices_price_id_seq;
     -- If sequence is behind, reset it:
     -- SELECT setval('public.stock_prices_price_id_seq', COALESCE((SELECT MAX(price_id) FROM public.stock_prices), 0));
     ```

### 2. `financials` Table (for `update_financial_details_from_yahoo.cjs` and `populate_derived_metrics.cjs`)
   * **`data_source TEXT` column:**
     ```sql
     ALTER TABLE public.financials ADD COLUMN IF NOT EXISTS data_source TEXT;
     ```
   * **`UNIQUE` constraint or Primary Key on `company_id`:** For `upsert` operations. If `financial_id` is your PK, add a unique constraint on `company_id`.
     ```sql
     ALTER TABLE public.financials DROP CONSTRAINT IF EXISTS financials_company_id_key;
     ALTER TABLE public.financials ADD CONSTRAINT financials_company_id_key UNIQUE (company_id);
     -- OR if company_id should be the PK itself (and financial_id removed/changed):
     -- ALTER TABLE public.financials ADD PRIMARY KEY (company_id); (More involved if financial_id is referenced)
     ```
    *Consider adding `data_period_end_date DATE` for more accurate updates of statement-based items.*

### 3. `capital_structure` Table (for `update_financial_details_from_yahoo.cjs`)
   * **`UNIQUE` constraint or Primary Key on `company_id`:**
     ```sql
     ALTER TABLE public.capital_structure DROP CONSTRAINT IF EXISTS capital_structure_company_id_key;
     ALTER TABLE public.capital_structure ADD CONSTRAINT capital_structure_company_id_key UNIQUE (company_id);
     ```

### 4. `company_urls` Table (for `update_financial_details_from_yahoo.cjs`)
   * **`UNIQUE` constraint on `(company_id, url_type)`:**
     ```sql
     -- Ensure url_type is NOT NULL first if it isn't already
     -- ALTER TABLE public.company_urls ALTER COLUMN url_type SET NOT NULL;
     ALTER TABLE public.company_urls DROP CONSTRAINT IF EXISTS company_urls_company_id_url_type_key;
     ALTER TABLE public.company_urls ADD CONSTRAINT company_urls_company_id_url_type_key UNIQUE (company_id, url_type);
     ```

### 5. `valuation_metrics` Table (for `populate_derived_metrics.cjs`)
   * **`UNIQUE` constraint or Primary Key on `company_id`:**
     ```sql
     ALTER TABLE public.valuation_metrics DROP CONSTRAINT IF EXISTS valuation_metrics_company_id_key;
     ALTER TABLE public.valuation_metrics ADD CONSTRAINT valuation_metrics_company_id_key UNIQUE (company_id);
     ```

### 6. `exchange_rates` Table (for `update_exchange_rates.cjs`)
   * This script now uses simple `INSERT`s to build a history of rates, so a `UNIQUE` constraint on `(from_currency, to_currency)` is **not** strictly required for the script to run (as it's not using `ON CONFLICT` for these columns). However, ensure `rate_id` is a working Primary Key. If you *did* want only the latest rate per pair, you would add `UNIQUE (from_currency, to_currency)` and change the script to `upsert`.

## Running the Scripts

Navigate to your script directory (e.g., `mapleaurum_importer/`) in your terminal.

### A. `update_exchange_rates.cjs` (Exchange Rate Updater)
* **Purpose:** Fetches and stores the latest exchange rates for various currencies against USD.
* **Run Manually/Occasionally:**
    ```bash
    node update_exchange_rates.cjs
    ```
* **Output:** Updates `public.exchange_rates` table. Logs in `logs_exchange_rate_updater/`.

### B. `update_supabase_from_yahoo.cjs` (Daily Stock Price Updater)
* **Purpose:** Updates `public.stock_prices` with daily closing prices from Yahoo.
* **To Run Once Immediately (for testing or manual execution):**
    ```bash
    node update_supabase_from_yahoo.cjs --once
    ```
* **To Run Once Immediately and then schedule future runs (if cron logic is active in script):**
    ```bash
    node update_supabase_from_yahoo.cjs --run-now
    ```
* **To Start in Scheduled Mode (uses `node-cron` as defined in script):**
    ```bash
    node update_supabase_from_yahoo.cjs
    ```
    (Requires the script to be kept running, e.g., via PM2).
* **Output:** Updates `public.stock_prices`. Logs in `logs_yahoo_updater/`.

### C. `update_financial_details_from_yahoo.cjs` (Comprehensive Financials Updater)
* **Purpose:** Updates `public.financials`, `public.companies`, `public.capital_structure`, `public.company_urls` with detailed data from Yahoo.
* **Recommended Run Frequency:** Less frequently than daily prices (e.g., weekly or monthly).
* **To Run Once Immediately:**
    ```bash
    node update_financial_details_from_yahoo.cjs --once
    ```
* **To Start in Scheduled Mode:**
    ```bash
    node update_financial_details_from_yahoo.cjs
    ```
* **Output:** Updates relevant Supabase tables. Logs in `logs_financial_details_updater/`.

### D. `populate_derived_metrics.cjs` (Derived Ratios Calculator)
* **Purpose:** Calculates and fills `NULL` financial ratios and valuation metrics using data already in your database.
* **Recommended Run Frequency:** After `update_financial_details_from_yahoo.cjs` has run and populated base financial figures.
* **To Run Once Immediately:**
    ```bash
    node populate_derived_metrics.cjs
    ```
* **Output:** Updates `NULL` fields in `public.financials` and `public.valuation_metrics`. Logs in `logs_derived_metrics_calculator/`.


## Logging & General Considerations
(Same as the "Logging" and "Important Considerations" sections from the previous README version you liked).

---

This revised README should be much cleaner and focused on the Yahoo Finance scripts and the new exchange rate updater. Remember to run the Database Prerequisite SQL commands carefully, especially if you have existing data.