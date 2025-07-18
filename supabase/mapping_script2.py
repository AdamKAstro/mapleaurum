import json
import requests
from bs4 import BeautifulSoup
from fuzzywuzzy import fuzz, process
import csv
import re
import os
from pathlib import Path
import time
import random
import argparse
import signal
import sys
from typing import Dict, List, Optional, Tuple
import logging
from dataclasses import dataclass, asdict
from concurrent.futures import ThreadPoolExecutor, as_completed
import hashlib

# Paths
JSON_FILE = Path("companiesIDsTickers.json")
OUTPUT_FILE = Path("company_mappings.csv")
LOG_FILE = Path("mapping_log.txt")
CACHE_FILE = Path("goldstock_cache.json")
CHECKPOINT_FILE = Path("mapping_checkpoint.json")

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(LOG_FILE, mode='w'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Global flag for graceful exit
interrupted = False

@dataclass
class Company:
    company_id: int
    company_name: str
    tsx_code: Optional[str]

@dataclass
class GoldstockCompany:
    goldstock_id: str
    company_name: str
    ticker: Optional[str]
    aliases: List[str] = None
    exchange: Optional[str] = None

    def __post_init__(self):
        if self.aliases is None:
            self.aliases = []

@dataclass
class Mapping:
    company_id: int
    company_name: str
    tsx_code: Optional[str]
    goldstock_id: Optional[str]
    goldstock_name: Optional[str]
    match_status: str
    confidence_score: float
    match_method: str = ""

class CompanyMatcher:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
        })
        self.cache = self.load_cache()
        self.checkpoint = self.load_checkpoint()

    def load_cache(self) -> Dict:
        if CACHE_FILE.exists():
            try:
                with open(CACHE_FILE, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except Exception as e:
                logger.error(f"Failed to load cache: {e}")
                return {}
        return {}

    def save_cache(self):
        try:
            cache_copy = dict(self.cache)
            with open(CACHE_FILE, 'w', encoding='utf-8') as f:
                json.dump(cache_copy, f, indent=2, ensure_ascii=False)
        except Exception as e:
            logger.error(f"Failed to save cache: {e}")

    def load_checkpoint(self) -> Dict:
        if CHECKPOINT_FILE.exists():
            try:
                with open(CHECKPOINT_FILE, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except Exception as e:
                logger.error(f"Failed to load checkpoint: {e}")
                return {"processed_ids": [], "mappings": []}
        return {"processed_ids": [], "mappings": []}

    def save_checkpoint(self, mappings: List[Mapping]):
        try:
            self.checkpoint["mappings"] = [asdict(m) for m in mappings]
            self.checkpoint["processed_ids"] = [m.company_id for m in mappings]
            with open(CHECKPOINT_FILE, 'w', encoding='utf-8') as f:
                json.dump(self.checkpoint, f, indent=2)
        except Exception as e:
            logger.error(f"Failed to save checkpoint: {e}")

def signal_handler(sig, frame):
    global interrupted
    logger.info("Received Ctrl+C. Saving progress and exiting...")
    interrupted = True
    sys.exit(0)

signal.signal(signal.SIGINT, signal_handler)

def normalize_ticker(ticker: Optional[str]) -> Optional[str]:
    """Normalize ticker symbols for comparison"""
    if not ticker:
        return None
    original = ticker
    
    # Remove exchange prefixes and suffixes
    ticker = re.sub(r'^(CVE|TSE|TSX|TSXV|CSE|CNSX|NYSE|NASDAQ|OTC|NEO):', '', ticker, flags=re.IGNORECASE)
    ticker = re.sub(r'\.(V|TO|CN|T|VN|WT|CSE|NEO)$', '', ticker, flags=re.IGNORECASE)
    
    # Remove special characters
    ticker = re.sub(r'[.\-_]', '', ticker)
    
    result = ticker.strip().upper()
    if result != original.upper():
        logger.debug(f"Normalized ticker: {original} -> {result}")
    return result

def normalize_name(name: Optional[str]) -> str:
    """Normalize company names for fuzzy matching"""
    if not name:
        return ""
    name = name.lower()
    
    # Remove common suffixes
    suffixes = [
        r'\s+inc\.?$', r'\s+ltd\.?$', r'\s+limited$', r'\s+corp\.?$',
        r'\s+corporation$', r'\s+plc$', r'\s+llc$', r'\s+sa$', r'\s+ag$',
        r'\s+mining$', r'\s+mines$', r'\s+resources$', r'\s+minerals$',
        r'\s+gold$', r'\s+silver$', r'\s+metals$', r'\s+exploration$',
        r'\s+ventures?$', r'\s+holdings?$', r'\s+group$', r'\s+international$'
    ]
    for suffix in suffixes:
        name = re.sub(suffix, '', name, flags=re.IGNORECASE)
    
    # Remove special characters but keep spaces
    name = re.sub(r'[^\w\s]', ' ', name)
    name = re.sub(r'\s+', ' ', name)
    return name.strip()

def extract_company_aliases(name: str) -> List[str]:
    """Extract possible aliases from company name"""
    aliases = [name]
    
    # Extract content in parentheses as potential alias
    if '(' in name and ')' in name:
        clean_name = re.sub(r'\([^)]+\)', '', name).strip()
        if clean_name:
            aliases.append(clean_name)
        # Also extract what's inside parentheses
        matches = re.findall(r'\(([^)]+)\)', name)
        aliases.extend(matches)
    
    # Create abbreviation from capital letters
    words = name.split()
    if len(words) > 1:
        abbrev = ''.join(w[0].upper() for w in words if w and w[0].isalpha())
        if len(abbrev) > 1:
            aliases.append(abbrev)
    
    # Handle & and 'and'
    if '&' in name:
        aliases.append(name.replace('&', 'and'))
    if ' and ' in name.lower():
        aliases.append(name.replace(' and ', ' & '))
    
    return list(set(aliases))

class GoldstockScraper:
    def __init__(self, matcher: CompanyMatcher):
        self.matcher = matcher

    def extract_ticker_from_page(self, soup: BeautifulSoup, page_text: str) -> Tuple[Optional[str], Optional[str]]:
        """Extract ticker and exchange from page with enhanced detection"""
        ticker = None
        exchange = None
        
        # Method 1: Look for Symbol row in table (handles CNSX:GSRI format)
        symbol_patterns = [
            r'Symbol[:\s]+(?:Currency\s+)?(?:\*\*)?([A-Z]+)[:.]([A-Z0-9]+)(?:\*\*)?',
            r'Symbol[:\s]+(?:\*\*)?([A-Z]+)[:.]([A-Z0-9]+)(?:\*\*)?',
            r'(?:TSE|TSX|CVE|TSXV|CSE|CNSX|NEO|NYSE|NASDAQ|OTC)[:\s]*([A-Z0-9\.\-]+)',
        ]
        
        for pattern in symbol_patterns:
            match = re.search(pattern, page_text, re.IGNORECASE | re.MULTILINE)
            if match:
                if match.lastindex == 2:
                    exchange = match.group(1)
                    ticker = match.group(2)
                else:
                    ticker = match.group(1)
                logger.debug(f"Found ticker via pattern: {ticker} (Exchange: {exchange})")
                break
        
        # Method 2: Look in specific HTML elements
        if not ticker:
            # Look for bold text containing exchange:ticker
            for b_tag in soup.find_all(['b', 'strong']):
                text = b_tag.get_text(strip=True)
                match = re.search(r'([A-Z]+)[:\s]([A-Z0-9\.\-]+)', text)
                if match and match.group(1) in ['TSE', 'TSX', 'TSXV', 'CVE', 'CSE', 'CNSX', 'NEO']:
                    exchange = match.group(1)
                    ticker = match.group(2)
                    logger.debug(f"Found ticker in bold: {ticker} (Exchange: {exchange})")
                    break
        
        # Method 3: Table-based extraction
        if not ticker:
            for table in soup.find_all('table'):
                for row in table.find_all('tr'):
                    cells = row.find_all(['td', 'th'])
                    if len(cells) >= 2:
                        label = cells[0].get_text(strip=True).lower()
                        if 'symbol' in label or 'ticker' in label:
                            value = cells[1].get_text(strip=True)
                            # Clean up the value
                            value = re.sub(r'\*\*', '', value)
                            value = re.sub(r'Currency.*', '', value).strip()
                            
                            match = re.search(r'([A-Z]+)[:\s]([A-Z0-9\.\-]+)', value)
                            if match:
                                exchange = match.group(1)
                                ticker = match.group(2)
                            else:
                                ticker = value
                            logger.debug(f"Found ticker in table: {ticker} (Exchange: {exchange})")
                            break
        
        # Method 4: Look for ticker patterns in page text
        if not ticker:
            ticker_patterns = [
                r'\b([A-Z]{2,5})\.(?:V|TO|CN)\b',
                r'\b(?:ticker|symbol)[:\s]*([A-Z0-9\.\-]+)\b',
            ]
            for pattern in ticker_patterns:
                match = re.search(pattern, page_text, re.IGNORECASE)
                if match:
                    ticker = match.group(1)
                    logger.debug(f"Found ticker via fallback pattern: {ticker}")
                    break
        
        return ticker, exchange

    def fetch_company_by_id(self, goldstock_id: int) -> Optional[GoldstockCompany]:
        """Fetch company details from goldstockdata.com"""
        cache_key = f"goldstock_{goldstock_id}"
        if cache_key in self.matcher.cache:
            cached = self.matcher.cache[cache_key]
            if cached:
                return GoldstockCompany(**cached)
            return None

        url = f"https://www.goldstockdata.com/company/{goldstock_id}-"
        try:
            time.sleep(random.uniform(1, 2))
            response = self.matcher.session.get(url, timeout=15)
            
            if response.status_code == 404:
                logger.debug(f"ID {goldstock_id}: 404 Not Found")
                self.matcher.cache[cache_key] = None
                if len(self.matcher.cache) % 50 == 0:
                    self.matcher.save_cache()
                return None
                
            response.raise_for_status()
            soup = BeautifulSoup(response.text, 'html.parser')
            page_text = soup.get_text()

            # Extract company name
            name_selectors = [
                'h1.company-name', 'h1', '.company-header h1',
                'meta[property="og:title"]', 'title', '.company-title',
                'div.name', 'span.company-name'
            ]
            company_name = None
            for selector in name_selectors:
                elem = soup.select_one(selector)
                if elem:
                    if elem.name == 'meta':
                        company_name = elem.get('content', '').strip()
                    else:
                        company_name = elem.get_text(strip=True)
                    
                    # Clean the name
                    company_name = re.sub(r'\s*\|.*$', '', company_name)
                    company_name = re.sub(r'\s*-\s*Goldstock.*$', '', company_name, flags=re.IGNORECASE)
                    company_name = re.sub(r'\s*-\s*Company.*$', '', company_name, flags=re.IGNORECASE)
                    
                    if company_name and len(company_name) > 2:
                        break
            
            if not company_name:
                logger.debug(f"ID {goldstock_id}: No company name found")
                self.matcher.cache[cache_key] = None
                if len(self.matcher.cache) % 50 == 0:
                    self.matcher.save_cache()
                return None

            # Extract ticker with enhanced detection
            ticker, exchange = self.extract_ticker_from_page(soup, page_text)

            result = GoldstockCompany(
                goldstock_id=str(goldstock_id),
                company_name=company_name,
                ticker=ticker,
                exchange=exchange,
                aliases=extract_company_aliases(company_name)
            )
            
            self.matcher.cache[cache_key] = asdict(result)
            if len(self.matcher.cache) % 50 == 0:
                self.matcher.save_cache()
                
            logger.info(f"ID {goldstock_id}: Found {company_name} (Ticker: {ticker or 'None'}, Exchange: {exchange or 'None'})")
            return result
            
        except requests.RequestException as e:
            logger.error(f"ID {goldstock_id}: Request failed - {e}")
            return None
        except Exception as e:
            logger.error(f"ID {goldstock_id}: Unexpected error - {e}")
            return None

    def fetch_companies_parallel(self, start_id: int = 1, max_id: int = 1000, max_workers: int = 10) -> List[GoldstockCompany]:
        """Fetch companies in parallel"""
        companies = []
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            future_to_id = {
                executor.submit(self.fetch_company_by_id, gid): gid 
                for gid in range(start_id, max_id + 1)
            }
            
            for future in as_completed(future_to_id):
                if interrupted:
                    executor.shutdown(wait=False, cancel_futures=True)
                    logger.info("ThreadPoolExecutor shutdown due to interrupt")
                    break
                    
                gid = future_to_id[future]
                try:
                    result = future.result()
                    if result:
                        companies.append(result)
                    if len(companies) % 50 == 0:
                        logger.info(f"Fetched {len(companies)} companies so far...")
                except Exception as e:
                    logger.error(f"Error processing ID {gid}: {e}")
                    
        return companies

def perform_matching(companies: List[Company], goldstock_companies: List[GoldstockCompany], 
                    known_mappings: Dict[int, Dict], matcher: CompanyMatcher) -> List[Mapping]:
    """Perform matching between companies and goldstock companies"""
    if not goldstock_companies:
        logger.error("No goldstock companies available for matching")
        return []

    # Build lookup dictionaries
    gs_by_ticker = {}
    for gs in goldstock_companies:
        if gs.ticker:
            normalized = normalize_ticker(gs.ticker)
            if normalized:
                gs_by_ticker[normalized] = gs
    
    gs_by_normalized_name = {}
    for gs in goldstock_companies:
        normalized = normalize_name(gs.company_name)
        if normalized:
            gs_by_normalized_name[normalized] = gs
        for alias in gs.aliases:
            normalized_alias = normalize_name(alias)
            if normalized_alias:
                gs_by_normalized_name[normalized_alias] = gs

    mappings = []
    unmatched_count = 0
    
    for i, company in enumerate(companies):
        if interrupted:
            logger.info("Matching interrupted")
            break
            
        logger.info(f"Processing company {i+1}/{len(companies)}: {company.company_name} "
                   f"(ID: {company.company_id}, TSX: {company.tsx_code or 'None'})")
        
        normalized_tsx_code = normalize_ticker(company.tsx_code)
        normalized_company_name = normalize_name(company.company_name)
        
        match = None
        confidence = 0
        status = 'unmatched'
        goldstock_id = None
        goldstock_name = None
        match_method = 'none'

        # Check known mappings first
        if company.company_id in known_mappings:
            known = known_mappings[company.company_id]
            match = GoldstockCompany(
                goldstock_id=known['goldstock_id'],
                company_name=known['goldstock_name'],
                ticker=None
            )
            confidence = known['confidence_score']
            status = 'matched'
            goldstock_id = known['goldstock_id']
            goldstock_name = known['goldstock_name']
            match_method = 'known_mapping'
            logger.info(f"Known match: {company.company_name} -> {goldstock_name} "
                       f"(Goldstock ID: {goldstock_id}, Confidence: {confidence})")

        # Try exact ticker match
        if not match and normalized_tsx_code and normalized_tsx_code in gs_by_ticker:
            match = gs_by_ticker[normalized_tsx_code]
            confidence = 100
            status = 'matched'
            goldstock_id = match.goldstock_id
            goldstock_name = match.company_name
            match_method = 'exact_ticker'
            logger.info(f"Ticker match: {company.company_name} -> {goldstock_name} "
                       f"(Goldstock ID: {goldstock_id}, Ticker: {match.ticker})")

        # Try exact name match
        if not match and normalized_company_name in gs_by_normalized_name:
            match = gs_by_normalized_name[normalized_company_name]
            confidence = 95
            status = 'matched'
            goldstock_id = match.goldstock_id
            goldstock_name = match.company_name
            match_method = 'exact_name'
            logger.info(f"Exact name match: {company.company_name} -> {goldstock_name} "
                       f"(Goldstock ID: {goldstock_id})")

        # Try fuzzy name matching
        if not match and normalized_company_name:
            all_gs_names = [(gs.company_name, gs) for gs in goldstock_companies]
            choices = [normalize_name(name) for name, _ in all_gs_names]
            
            # Use process.extractOne which returns (match, score)
            result = process.extractOne(
                normalized_company_name,
                choices,
                scorer=fuzz.token_sort_ratio,
                score_cutoff=70
            )
            
            if result:
                matched_name, score = result
                # Find the index of the matched name
                idx = choices.index(matched_name)
                match = all_gs_names[idx][1]
                confidence = score
                status = 'matched' if score >= 85 else 'manual'
                goldstock_id = match.goldstock_id
                goldstock_name = match.company_name
                match_method = 'fuzzy_name'
                logger.info(f"Fuzzy match ({score}%): {company.company_name} -> {goldstock_name} "
                           f"(Goldstock ID: {goldstock_id})")

        # Create mapping entry
        mapping = Mapping(
            company_id=company.company_id,
            company_name=company.company_name,
            tsx_code=company.tsx_code,
            goldstock_id=goldstock_id,
            goldstock_name=goldstock_name,
            match_status=status,
            confidence_score=confidence,
            match_method=match_method
        )
        mappings.append(mapping)

        if status == 'unmatched':
            unmatched_count += 1
            logger.warning(f"No match for: {company.company_name} (ID: {company.company_id})")

        # Save progress periodically
        if (i + 1) % 10 == 0 or i == len(companies) - 1:
            save_mappings(mappings)
            matcher.save_checkpoint(mappings)
            matched = sum(1 for m in mappings if m.match_status == 'matched')
            manual = sum(1 for m in mappings if m.match_status == 'manual')
            unmatched = sum(1 for m in mappings if m.match_status == 'unmatched')
            logger.info(f"Processed {i + 1}/{len(companies)} companies: "
                       f"{matched} matched, {manual} manual, {unmatched} unmatched")

        if interrupted:
            save_mappings(mappings)
            matcher.save_checkpoint(mappings)
            break

    return mappings

def load_companies(limit: Optional[int] = None) -> List[Company]:
    """Load companies from JSON file"""
    try:
        with open(JSON_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        items = data[:limit] if limit is not None else data
        companies = [
            Company(
                company_id=item['company_id'],
                company_name=item['company_name'],
                tsx_code=item.get('tsx_code')
            )
            for item in items
        ]
        logger.info(f"Loaded {len(companies)} companies from {JSON_FILE}")
        return companies
    except FileNotFoundError:
        logger.error(f"Error: {JSON_FILE} not found in {os.getcwd()}")
        return []
    except json.JSONDecodeError as e:
        logger.error(f"Error decoding JSON: {e}")
        return []
        
def save_mappings(mappings: List[Mapping]):
    """Save mappings to CSV file"""
    try:
        with open(OUTPUT_FILE, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=[
                'company_id', 'company_name', 'tsx_code',
                'goldstock_id', 'goldstock_name',
                'match_status', 'confidence_score', 'match_method'
            ])
            writer.writeheader()
            for mapping in mappings:
                writer.writerow(asdict(mapping))
        logger.info(f"Saved {len(mappings)} mappings to {OUTPUT_FILE}")
    except Exception as e:
        logger.error(f"Error saving CSV: {e}")

def verify_logo(goldstock_id: str) -> bool:
    """Verify if a logo exists for the given goldstock ID"""
    for ext in ['png', 'jpg', 'webp']:
        url = f"https://www.goldstockdata.com/images/logos/{goldstock_id}.{ext}"
        try:
            response = requests.head(url, timeout=5)
            if response.status_code == 200:
                logger.debug(f"Logo found for goldstock_id {goldstock_id} ({ext})")
                return True
        except:
            continue
    return False

def main():
    parser = argparse.ArgumentParser(description="Enhanced company mapping to goldstockdata.com")
    parser.add_argument('--limit', type=int, help='Limit number of companies to process')
    parser.add_argument('--max-id', type=int, default=1500, help='Maximum goldstock ID to fetch')
    parser.add_argument('--workers', type=int, default=10, help='Number of parallel workers')
    parser.add_argument('--resume', action='store_true', help='Resume from checkpoint')
    parser.add_argument('--clear-cache', action='store_true', help='Clear cache before starting')
    args = parser.parse_args()

    logger.info(f"Script started with args: {args}")

    if args.clear_cache:
        if CACHE_FILE.exists():
            os.remove(CACHE_FILE)
            logger.info("Cache cleared")
        if CHECKPOINT_FILE.exists():
            os.remove(CHECKPOINT_FILE)
            logger.info("Checkpoint cleared")

    matcher = CompanyMatcher()
    scraper = GoldstockScraper(matcher)

    # Extended known mappings
    known_mappings = {
        8: {"goldstock_id": "1", "goldstock_name": "Abcourt Mines Inc", "confidence_score": 100},
        10: {"goldstock_id": "8", "goldstock_name": "Agnico Eagle Mines Ltd", "confidence_score": 100},
        331: {"goldstock_id": "374", "goldstock_name": "Probe Gold Inc", "confidence_score": 100},
        48: {"goldstock_id": "1470", "goldstock_name": "Aya Gold & Silver Inc.", "confidence_score": 100},
        313: {"goldstock_id": "605", "goldstock_name": "Aura Minerals Inc.", "confidence_score": 100}
    }

    companies = load_companies(limit=args.limit)
    if not companies:
        logger.error("No companies loaded. Exiting.")
        sys.exit(1)

    # Handle resume
    if args.resume and matcher.checkpoint['processed_ids']:
        processed_ids = set(matcher.checkpoint['processed_ids'])
        companies = [c for c in companies if c.company_id not in processed_ids]
        logger.info(f"Resuming with {len(companies)} remaining companies")

    if interrupted:
        logger.info("Exiting due to previous interrupt")
        sys.exit(0)

    # Fetch goldstock companies
    logger.info(f"Fetching goldstock companies (IDs 1 to {args.max_id})...")
    goldstock_companies = scraper.fetch_companies_parallel(
        start_id=1,
        max_id=args.max_id,
        max_workers=args.workers
    )

    if interrupted:
        logger.info("Exiting after fetch due to interrupt")
        sys.exit(0)

    if not goldstock_companies:
        logger.error("No goldstock companies fetched. Check connection or selectors.")
        sys.exit(1)

    logger.info(f"Fetched {len(goldstock_companies)} goldstock companies")

    # Perform matching
    mappings = perform_matching(companies, goldstock_companies, known_mappings, matcher)

    if interrupted:
        logger.info("Exiting after matching due to interrupt")
        sys.exit(0)

    # Merge with existing mappings if resuming
    if args.resume and matcher.checkpoint['mappings']:
        existing_mappings = [Mapping(**m) for m in matcher.checkpoint['mappings']]
        mappings = existing_mappings + mappings

    save_mappings(mappings)
    matcher.save_checkpoint(mappings)
    matcher.save_cache()

    # Verify logos for matched companies
    logo_verified = 0
    for mapping in mappings:
        if mapping.goldstock_id and mapping.match_status == 'matched':
            if verify_logo(mapping.goldstock_id):
                logo_verified += 1
                logger.info(f"Logo verified for {mapping.company_name} (Goldstock ID: {mapping.goldstock_id})")

    # Print summary
    matched = sum(1 for m in mappings if m.match_status == 'matched')
    manual = sum(1 for m in mappings if m.match_status == 'manual')
    unmatched = sum(1 for m in mappings if m.match_status == 'unmatched')
    
    logger.info(f"\nFinal Summary:")
    logger.info(f"Total processed: {len(mappings)}")
    logger.info(f"Matched: {matched} ({matched/len(mappings)*100:.1f}%)")
    logger.info(f"Manual review needed: {manual} ({manual/len(mappings)*100:.1f}%)")
    logger.info(f"Unmatched: {unmatched} ({unmatched/len(mappings)*100:.1f}%)")
    logger.info(f"Logos verified: {logo_verified}")

    # Clean up checkpoint if job complete
    if not interrupted and CHECKPOINT_FILE.exists():
        os.remove(CHECKPOINT_FILE)
        logger.info("Checkpoint file removed (job complete)")

    logger.info("Script completed successfully")
    sys.exit(0)

if __name__ == "__main__":
    main()