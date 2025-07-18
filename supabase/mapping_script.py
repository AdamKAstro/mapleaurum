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
        logging.FileHandler(LOG_FILE),
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
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
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
            except:
                return {}
        return {}
    
    def save_cache(self):
        """Save cache in a thread-safe manner"""
        try:
            # Create a copy to avoid modification during iteration
            cache_copy = dict(self.cache)
            with open(CACHE_FILE, 'w', encoding='utf-8') as f:
                json.dump(cache_copy, f, indent=2)
        except Exception as e:
            logger.error(f"Error saving cache: {e}")
    
    def load_checkpoint(self) -> Dict:
        if CHECKPOINT_FILE.exists():
            try:
                with open(CHECKPOINT_FILE, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except:
                return {"processed_ids": [], "mappings": []}
        return {"processed_ids": [], "mappings": []}
    
    def save_checkpoint(self, mappings: List[Mapping]):
        self.checkpoint["mappings"] = [asdict(m) for m in mappings]
        self.checkpoint["processed_ids"] = [m.company_id for m in mappings]
        with open(CHECKPOINT_FILE, 'w', encoding='utf-8') as f:
            json.dump(self.checkpoint, f, indent=2)

def signal_handler(sig, frame):
    global interrupted
    logger.info("Received Ctrl+C. Saving progress and exiting...")
    interrupted = True

signal.signal(signal.SIGINT, signal_handler)

def normalize_ticker(ticker: Optional[str]) -> Optional[str]:
    """Normalize ticker symbol by removing exchange prefixes and suffixes"""
    if not ticker:
        return None
    
    # Store original for debugging
    original = ticker
    
    # Handle special cases for Canadian exchanges
    # .CN often represents CNSX/CSE listings
    if ticker.endswith('.CN'):
        base_ticker = ticker[:-3]
        # Return just the base ticker for matching
        return base_ticker.strip().upper()
    
    # Remove exchange prefixes (including CNSX which is now CSE)
    ticker = re.sub(r'^(CVE|TSE|TSX|TSXV|CSE|CNSX|NYSE|NASDAQ|OTC):', '', ticker, flags=re.IGNORECASE)
    
    # Remove exchange suffixes
    ticker = re.sub(r'\.(V|TO|CN|T|VN|WT)$', '', ticker, flags=re.IGNORECASE)
    
    # Remove any remaining dots or special characters
    ticker = re.sub(r'[.\-_]', '', ticker)
    
    result = ticker.strip().upper()
    
    # Log normalization for debugging
    if result != original.upper():
        logger.debug(f"Normalized ticker: {original} -> {result}")
    
    return result

def normalize_name(name: Optional[str]) -> str:
    """Normalize company name for better matching"""
    if not name:
        return ""
    
    # Convert to lowercase
    name = name.lower()
    
    # Remove common suffixes
    suffixes = [
        r'\s+inc\.?$', r'\s+ltd\.?$', r'\s+limited$', r'\s+corp\.?$', 
        r'\s+corporation$', r'\s+plc$', r'\s+llc$', r'\s+sa$', r'\s+ag$',
        r'\s+mining$', r'\s+mines$', r'\s+resources$', r'\s+minerals$',
        r'\s+gold$', r'\s+silver$', r'\s+metals$', r'\s+exploration$'
    ]
    
    for suffix in suffixes:
        name = re.sub(suffix, '', name, flags=re.IGNORECASE)
    
    # Remove special characters and extra spaces
    name = re.sub(r'[^\w\s]', ' ', name)
    name = re.sub(r'\s+', ' ', name)
    
    return name.strip()

def extract_company_aliases(name: str) -> List[str]:
    """Extract possible company name variations"""
    aliases = [name]
    
    # Add version without parentheses content
    if '(' in name and ')' in name:
        clean_name = re.sub(r'\([^)]+\)', '', name).strip()
        if clean_name:
            aliases.append(clean_name)
    
    # Add abbreviated version
    words = name.split()
    if len(words) > 1:
        # First letter of each word
        abbrev = ''.join(w[0].upper() for w in words if w)
        if len(abbrev) > 1:
            aliases.append(abbrev)
    
    # Add version with & replaced by and
    if '&' in name:
        aliases.append(name.replace('&', 'and'))
    if ' and ' in name:
        aliases.append(name.replace(' and ', ' & '))
    
    return list(set(aliases))

class GoldstockScraper:
    def __init__(self, matcher: CompanyMatcher):
        self.matcher = matcher
        
    def fetch_company_by_id(self, goldstock_id: int) -> Optional[GoldstockCompany]:
        """Fetch company data from goldstockdata.com with improved parsing"""
        
        # Check cache first
        cache_key = f"goldstock_{goldstock_id}"
        if cache_key in self.matcher.cache:
            cached = self.matcher.cache[cache_key]
            if cached:
                return GoldstockCompany(**cached)
            return None
        
        url = f"https://www.goldstockdata.com/company/{goldstock_id}-"
        
        try:
            # Add delay to avoid rate limiting
            time.sleep(random.uniform(1, 2))
            
            response = self.matcher.session.get(url, timeout=15)
            
            if response.status_code == 404:
                logger.debug(f"ID {goldstock_id}: 404 Not Found")
                self.matcher.cache[cache_key] = None
                return None
                
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Enhanced company name extraction
            company_name = None
            name_selectors = [
                'h1.company-name',
                'h1',
                '.company-header h1',
                'meta[property="og:title"]',
                'title',
                '.company-title',
                'div.name',
                'span.company-name'
            ]
            
            for selector in name_selectors:
                elem = soup.select_one(selector)
                if elem:
                    if elem.name == 'meta':
                        company_name = elem.get('content', '').strip()
                    else:
                        company_name = elem.text.strip()
                    
                    # Clean up the name
                    company_name = re.sub(r'\s*\|.*$', '', company_name)
                    company_name = re.sub(r'\s*-\s*Goldstock.*$', '', company_name, flags=re.IGNORECASE)
                    
                    if company_name and len(company_name) > 2:
                        break
            
            if not company_name:
                logger.debug(f"ID {goldstock_id}: No company name found")
                # Cache the null result
                cache_key = f"goldstock_{goldstock_id}"
                self.matcher.cache[cache_key] = None
                if len(self.matcher.cache) % 50 == 0:
                    self.matcher.save_cache()
                return None
            
            # Enhanced ticker extraction
            ticker = None
            ticker_patterns = [
                (r'(TSE|TSX|CVE|TSXV|CSE):\s*([A-Z0-9\.\-]+)', 2),
                (r'Symbol:\s*([A-Z0-9\.\-]+)', 1),
                (r'Ticker:\s*([A-Z0-9\.\-]+)', 1),
                (r'\b([A-Z]{2,5})\.(V|TO|T)\b', 0),
            ]
            
            # Look for ticker in text
            page_text = soup.get_text()
            for pattern, group in ticker_patterns:
                match = re.search(pattern, page_text, re.IGNORECASE)
                if match:
                    if group == 0:
                        ticker = match.group(0)
                    else:
                        ticker = match.group(group)
                    break
            
            # Also check specific elements
            if not ticker:
                ticker_selectors = [
                    'span.ticker',
                    'div.ticker',
                    '.company-ticker',
                    'b:contains("TSE:")',
                    'b:contains("TSX:")',
                    'b:contains("CVE:")',
                    'span:contains("Symbol:")'
                ]
                
                for selector in ticker_selectors:
                    try:
                        elem = soup.select_one(selector)
                        if elem:
                            ticker_text = elem.text.strip()
                            # Extract ticker from text like "TSE: ABC"
                            match = re.search(r'[A-Z]{2,5}(?:\.[A-Z]+)?', ticker_text)
                            if match:
                                ticker = match.group(0)
                                break
                    except:
                        continue
            
            result = GoldstockCompany(
                goldstock_id=str(goldstock_id),
                company_name=company_name,
                ticker=ticker,
                aliases=extract_company_aliases(company_name)
            )
            
            # Cache the result (with thread safety)
            cache_key = f"goldstock_{goldstock_id}"
            self.matcher.cache[cache_key] = asdict(result)
            
            # Save cache periodically
            if len(self.matcher.cache) % 50 == 0:
                self.matcher.save_cache()
            
            logger.info(f"ID {goldstock_id}: Found {company_name} (Ticker: {ticker or 'None'})")
            return result
            
        except requests.RequestException as e:
            logger.error(f"ID {goldstock_id}: Request failed - {e}")
            return None
        except Exception as e:
            logger.error(f"ID {goldstock_id}: Unexpected error - {e}")
            return None

    def fetch_companies_parallel(self, start_id: int = 1, max_id: int = 1000, 
                               max_workers: int = 5) -> List[GoldstockCompany]:
        """Fetch companies in parallel for faster processing"""
        companies = []
        
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            # Submit all tasks
            future_to_id = {
                executor.submit(self.fetch_company_by_id, gid): gid 
                for gid in range(start_id, max_id + 1)
            }
            
            # Process completed tasks
            for future in as_completed(future_to_id):
                if interrupted:
                    executor.shutdown(wait=False)
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
    """Perform intelligent matching between company lists"""
    
    # Create lookup structures for efficient matching
    gs_by_ticker = {}
    gs_by_normalized_name = {}
    
    for gs in goldstock_companies:
        # Index by ticker
        if gs.ticker:
            normalized_ticker = normalize_ticker(gs.ticker)
            if normalized_ticker:
                gs_by_ticker[normalized_ticker] = gs
        
        # Index by normalized name and aliases
        normalized = normalize_name(gs.company_name)
        if normalized:
            gs_by_normalized_name[normalized] = gs
            
        for alias in gs.aliases:
            normalized_alias = normalize_name(alias)
            if normalized_alias:
                gs_by_normalized_name[normalized_alias] = gs
    
    mappings = []
    
    for i, company in enumerate(companies):
        if interrupted:
            break
            
        logger.info(f"Processing company {i+1}/{len(companies)}: {company.company_name} (ID: {company.company_id})")
        
        # Check known mappings first
        if company.company_id in known_mappings:
            known = known_mappings[company.company_id]
            mapping = Mapping(
                company_id=company.company_id,
                company_name=company.company_name,
                tsx_code=company.tsx_code,
                goldstock_id=known['goldstock_id'],
                goldstock_name=known['goldstock_name'],
                match_status='matched',
                confidence_score=known['confidence_score'],
                match_method='known_mapping'
            )
            mappings.append(mapping)
            logger.info(f"Known mapping applied: {company.company_name} -> {known['goldstock_name']}")
            continue
        
        # Try exact ticker match
        match = None
        if company.tsx_code:
            normalized_ticker = normalize_ticker(company.tsx_code)
            if normalized_ticker and normalized_ticker in gs_by_ticker:
                match = gs_by_ticker[normalized_ticker]
                mapping = Mapping(
                    company_id=company.company_id,
                    company_name=company.company_name,
                    tsx_code=company.tsx_code,
                    goldstock_id=match.goldstock_id,
                    goldstock_name=match.company_name,
                    match_status='matched',
                    confidence_score=100,
                    match_method='exact_ticker'
                )
                mappings.append(mapping)
                logger.info(f"Ticker match: {company.company_name} -> {match.company_name}")
                continue
        
        # Try exact normalized name match
        normalized_name = normalize_name(company.company_name)
        if normalized_name in gs_by_normalized_name:
            match = gs_by_normalized_name[normalized_name]
            mapping = Mapping(
                company_id=company.company_id,
                company_name=company.company_name,
                tsx_code=company.tsx_code,
                goldstock_id=match.goldstock_id,
                goldstock_name=match.company_name,
                match_status='matched',
                confidence_score=95,
                match_method='exact_name'
            )
            mappings.append(mapping)
            logger.info(f"Exact name match: {company.company_name} -> {match.company_name}")
            continue
        
        # Try fuzzy matching
        best_match = None
        best_score = 0
        best_method = ''
        
        # Get all goldstock names for fuzzy matching
        all_gs_names = [(gs.company_name, gs) for gs in goldstock_companies]
        
        # Use fuzzywuzzy's process.extractOne for efficient fuzzy matching
        if normalized_name and all_gs_names:
            # Create list of normalized names
            normalized_gs_names = [normalize_name(name) for name, _ in all_gs_names]
            
            # Find best match
            result = process.extractOne(
                normalized_name,
                normalized_gs_names,
                scorer=fuzz.token_sort_ratio
            )
            
            if result:
                # process.extractOne returns (match, score) tuple
                matched_name, score = result
                
                # Find the corresponding goldstock company
                for i, (orig_name, gs) in enumerate(all_gs_names):
                    if normalize_name(orig_name) == matched_name:
                        if score >= 80:
                            best_match = gs
                            best_score = score
                            best_method = 'fuzzy_name'
                        break
        
        # Create mapping based on results
        if best_match and best_score >= 80:
            mapping = Mapping(
                company_id=company.company_id,
                company_name=company.company_name,
                tsx_code=company.tsx_code,
                goldstock_id=best_match.goldstock_id,
                goldstock_name=best_match.company_name,
                match_status='matched' if best_score >= 90 else 'manual',
                confidence_score=best_score,
                match_method=best_method
            )
            logger.info(f"Fuzzy match ({best_score}%): {company.company_name} -> {best_match.company_name}")
        else:
            mapping = Mapping(
                company_id=company.company_id,
                company_name=company.company_name,
                tsx_code=company.tsx_code,
                goldstock_id=None,
                goldstock_name=None,
                match_status='unmatched',
                confidence_score=0,
                match_method='none'
            )
            logger.warning(f"No match found for: {company.company_name}")
        
        mappings.append(mapping)
        
        # Save checkpoint periodically
        if len(mappings) % 10 == 0:
            matcher.save_checkpoint(mappings)
            save_mappings(mappings)
            
            # Log progress
            matched_so_far = sum(1 for m in mappings if m.match_status == 'matched')
            manual_so_far = sum(1 for m in mappings if m.match_status == 'manual')
            unmatched_so_far = sum(1 for m in mappings if m.match_status == 'unmatched')
            
            logger.info(f"Progress: {len(mappings)} processed - "
                       f"Matched: {matched_so_far}, Manual: {manual_so_far}, "
                       f"Unmatched: {unmatched_so_far}")
    
    # Save final results
    save_mappings(mappings)
    matcher.save_checkpoint(mappings)
    
    return mappings

def load_companies(limit: Optional[int] = None) -> List[Company]:
    """Load companies from JSON file"""
    try:
        with open(JSON_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        companies = []
        for item in data[:limit] if limit else data:
            companies.append(Company(
                company_id=item['company_id'],
                company_name=item['company_name'],
                tsx_code=item.get('tsx_code')
            ))
        
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

def main():
    parser = argparse.ArgumentParser(description="Enhanced company mapping to goldstockdata.com")
    parser.add_argument('--limit', type=int, help='Limit number of companies to process')
    parser.add_argument('--max-id', type=int, default=1000, help='Maximum goldstock ID to fetch')
    parser.add_argument('--workers', type=int, default=5, help='Number of parallel workers')
    parser.add_argument('--resume', action='store_true', help='Resume from checkpoint')
    parser.add_argument('--clear-cache', action='store_true', help='Clear cache before starting')
    args = parser.parse_args()
    
    # Clear cache if requested
    if args.clear_cache and CACHE_FILE.exists():
        os.remove(CACHE_FILE)
        logger.info("Cache cleared")
    
    # Initialize matcher
    matcher = CompanyMatcher()
    scraper = GoldstockScraper(matcher)
    
    # Known mappings (expanded)
    known_mappings = {
        8: {"goldstock_id": "1", "goldstock_name": "Abcourt Mines Inc", "confidence_score": 100},
        10: {"goldstock_id": "8", "goldstock_name": "Agnico Eagle Mines Ltd", "confidence_score": 100},
        331: {"goldstock_id": "374", "goldstock_name": "Probe Gold Inc", "confidence_score": 100},
        48: {"goldstock_id": "1470", "goldstock_name": "Aya Gold & Silver Inc.", "confidence_score": 100},
        313: {"goldstock_id": "605", "goldstock_name": "Aura Minerals Inc.", "confidence_score": 100}
    }
    
    # Load companies
    companies = load_companies(limit=args.limit)
    if not companies:
        logger.error("No companies loaded. Exiting.")
        return
    
    # Check for resume
    if args.resume and matcher.checkpoint['processed_ids']:
        processed_ids = set(matcher.checkpoint['processed_ids'])
        companies = [c for c in companies if c.company_id not in processed_ids]
        logger.info(f"Resuming with {len(companies)} remaining companies")
    
    # Fetch goldstock companies
    logger.info(f"Fetching goldstock companies (IDs 1 to {args.max_id})...")
    goldstock_companies = scraper.fetch_companies_parallel(
        start_id=1, 
        max_id=args.max_id,
        max_workers=args.workers
    )
    
    if not goldstock_companies:
        logger.error("No goldstock companies fetched. Check your connection or selectors.")
        return
    
    logger.info(f"Fetched {len(goldstock_companies)} goldstock companies")
    
    # Perform matching
    mappings = perform_matching(companies, goldstock_companies, known_mappings, matcher)
    
    # Add any existing mappings if resuming
    if args.resume and matcher.checkpoint['mappings']:
        existing_mappings = [Mapping(**m) for m in matcher.checkpoint['mappings']]
        mappings = existing_mappings + mappings
    
    # Save final results
    save_mappings(mappings)
    
    # Generate summary
    matched = sum(1 for m in mappings if m.match_status == 'matched')
    manual = sum(1 for m in mappings if m.match_status == 'manual')
    unmatched = sum(1 for m in mappings if m.match_status == 'unmatched')
    
    logger.info(f"\nFinal Summary:")
    logger.info(f"Total processed: {len(mappings)}")
    logger.info(f"Matched: {matched} ({matched/len(mappings)*100:.1f}%)")
    logger.info(f"Manual review needed: {manual} ({manual/len(mappings)*100:.1f}%)")
    logger.info(f"Unmatched: {unmatched} ({unmatched/len(mappings)*100:.1f}%)")
    
    # Clean up checkpoint if complete
    if not interrupted and CHECKPOINT_FILE.exists():
        os.remove(CHECKPOINT_FILE)
        logger.info("Checkpoint file removed (job complete)")

if __name__ == "__main__":
    main()


def normalize_name(name: Optional[str]) -> str:
    """Normalize company name for better matching"""
    if not name:
        return ""
    
    # Convert to lowercase
    name = name.lower()
    
    # Remove common suffixes
    suffixes = [
        r'\s+inc\.?$', r'\s+ltd\.?$', r'\s+limited$', r'\s+corp\.?$', 
        r'\s+corporation$', r'\s+plc$', r'\s+llc$', r'\s+sa$', r'\s+ag$',
        r'\s+mining$', r'\s+mines$', r'\s+resources$', r'\s+minerals$',
        r'\s+gold$', r'\s+silver$', r'\s+metals$', r'\s+exploration$'
    ]
    
    for suffix in suffixes:
        name = re.sub(suffix, '', name, flags=re.IGNORECASE)
    
    # Remove special characters and extra spaces
    name = re.sub(r'[^\w\s]', ' ', name)
    name = re.sub(r'\s+', ' ', name)
    
    return name.strip()

def extract_company_aliases(name: str) -> List[str]:
    """Extract possible company name variations"""
    aliases = [name]
    
    # Add version without parentheses content
    if '(' in name and ')' in name:
        clean_name = re.sub(r'\([^)]+\)', '', name).strip()
        if clean_name:
            aliases.append(clean_name)
    
    # Add abbreviated version
    words = name.split()
    if len(words) > 1:
        # First letter of each word
        abbrev = ''.join(w[0].upper() for w in words if w)
        if len(abbrev) > 1:
            aliases.append(abbrev)
    
    # Add version with & replaced by and
    if '&' in name:
        aliases.append(name.replace('&', 'and'))
    if ' and ' in name:
        aliases.append(name.replace(' and ', ' & '))
    
    return list(set(aliases))

class GoldstockScraper:
    def __init__(self, matcher: CompanyMatcher):
        self.matcher = matcher
        
    def fetch_company_by_id(self, goldstock_id: int) -> Optional[GoldstockCompany]:
        """Fetch company data from goldstockdata.com with improved parsing"""
        
        # Check cache first
        cache_key = f"goldstock_{goldstock_id}"
        if cache_key in self.matcher.cache:
            cached = self.matcher.cache[cache_key]
            if cached:
                return GoldstockCompany(**cached)
            return None
        
        url = f"https://www.goldstockdata.com/company/{goldstock_id}-"
        
        try:
            # Add delay to avoid rate limiting
            time.sleep(random.uniform(1, 2))
            
            response = self.matcher.session.get(url, timeout=15)
            
            if response.status_code == 404:
                logger.debug(f"ID {goldstock_id}: 404 Not Found")
                self.matcher.cache[cache_key] = None
                return None
                
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Enhanced company name extraction
            company_name = None
            name_selectors = [
                'h1.company-name',
                'h1',
                '.company-header h1',
                'meta[property="og:title"]',
                'title',
                '.company-title',
                'div.name',
                'span.company-name'
            ]
            
            for selector in name_selectors:
                elem = soup.select_one(selector)
                if elem:
                    if elem.name == 'meta':
                        company_name = elem.get('content', '').strip()
                    else:
                        company_name = elem.text.strip()
                    
                    # Clean up the name
                    company_name = re.sub(r'\s*\|.*$', '', company_name)
                    company_name = re.sub(r'\s*-\s*Goldstock.*$', '', company_name, flags=re.IGNORECASE)
                    
                    if company_name and len(company_name) > 2:
                        break
            
            if not company_name:
                logger.debug(f"ID {goldstock_id}: No company name found")
                # Cache the null result
                cache_key = f"goldstock_{goldstock_id}"
                self.matcher.cache[cache_key] = None
                if len(self.matcher.cache) % 50 == 0:
                    self.matcher.save_cache()
                return None
            
            # Enhanced ticker extraction
            ticker = None
            ticker_patterns = [
                (r'(TSE|TSX|CVE|TSXV|CSE):\s*([A-Z0-9\.\-]+)', 2),
                (r'Symbol:\s*([A-Z0-9\.\-]+)', 1),
                (r'Ticker:\s*([A-Z0-9\.\-]+)', 1),
                (r'\b([A-Z]{2,5})\.(V|TO|T)\b', 0),
            ]
            
            # Look for ticker in text
            page_text = soup.get_text()
            for pattern, group in ticker_patterns:
                match = re.search(pattern, page_text, re.IGNORECASE)
                if match:
                    if group == 0:
                        ticker = match.group(0)
                    else:
                        ticker = match.group(group)
                    break
            
            # Also check specific elements
            if not ticker:
                ticker_selectors = [
                    'span.ticker',
                    'div.ticker',
                    '.company-ticker',
                    'b:contains("TSE:")',
                    'b:contains("TSX:")',
                    'b:contains("CVE:")',
                    'span:contains("Symbol:")'
                ]
                
                for selector in ticker_selectors:
                    try:
                        elem = soup.select_one(selector)
                        if elem:
                            ticker_text = elem.text.strip()
                            # Extract ticker from text like "TSE: ABC"
                            match = re.search(r'[A-Z]{2,5}(?:\.[A-Z]+)?', ticker_text)
                            if match:
                                ticker = match.group(0)
                                break
                    except:
                        continue
            
            result = GoldstockCompany(
                goldstock_id=str(goldstock_id),
                company_name=company_name,
                ticker=ticker,
                aliases=extract_company_aliases(company_name)
            )
            
            # Cache the result (with thread safety)
            cache_key = f"goldstock_{goldstock_id}"
            self.matcher.cache[cache_key] = asdict(result)
            
            # Save cache periodically
            if len(self.matcher.cache) % 50 == 0:
                self.matcher.save_cache()
            
            logger.info(f"ID {goldstock_id}: Found {company_name} (Ticker: {ticker or 'None'})")
            return result
            
        except requests.RequestException as e:
            logger.error(f"ID {goldstock_id}: Request failed - {e}")
            return None
        except Exception as e:
            logger.error(f"ID {goldstock_id}: Unexpected error - {e}")
            return None

    def fetch_companies_parallel(self, start_id: int = 1, max_id: int = 1000, 
                               max_workers: int = 5) -> List[GoldstockCompany]:
        """Fetch companies in parallel for faster processing"""
        companies = []
        
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            # Submit all tasks
            future_to_id = {
                executor.submit(self.fetch_company_by_id, gid): gid 
                for gid in range(start_id, max_id + 1)
            }
            
            # Process completed tasks
            for future in as_completed(future_to_id):
                if interrupted:
                    executor.shutdown(wait=False)
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
    """Perform intelligent matching between company lists"""
    
    # Create lookup structures for efficient matching
    gs_by_ticker = {}
    gs_by_normalized_name = {}
    
    for gs in goldstock_companies:
        # Index by ticker
        if gs.ticker:
            normalized_ticker = normalize_ticker(gs.ticker)
            if normalized_ticker:
                gs_by_ticker[normalized_ticker] = gs
        
        # Index by normalized name and aliases
        normalized = normalize_name(gs.company_name)
        if normalized:
            gs_by_normalized_name[normalized] = gs
            
        for alias in gs.aliases:
            normalized_alias = normalize_name(alias)
            if normalized_alias:
                gs_by_normalized_name[normalized_alias] = gs
    
    mappings = []
    
    for i, company in enumerate(companies):
        if interrupted:
            break
            
        logger.info(f"Processing company {i+1}/{len(companies)}: {company.company_name} (ID: {company.company_id})")
        
        # Check known mappings first
        if company.company_id in known_mappings:
            known = known_mappings[company.company_id]
            mapping = Mapping(
                company_id=company.company_id,
                company_name=company.company_name,
                tsx_code=company.tsx_code,
                goldstock_id=known['goldstock_id'],
                goldstock_name=known['goldstock_name'],
                match_status='matched',
                confidence_score=known['confidence_score'],
                match_method='known_mapping'
            )
            mappings.append(mapping)
            logger.info(f"Known mapping applied: {company.company_name} -> {known['goldstock_name']}")
            continue
        
        # Try exact ticker match
        match = None
        if company.tsx_code:
            normalized_ticker = normalize_ticker(company.tsx_code)
            if normalized_ticker and normalized_ticker in gs_by_ticker:
                match = gs_by_ticker[normalized_ticker]
                mapping = Mapping(
                    company_id=company.company_id,
                    company_name=company.company_name,
                    tsx_code=company.tsx_code,
                    goldstock_id=match.goldstock_id,
                    goldstock_name=match.company_name,
                    match_status='matched',
                    confidence_score=100,
                    match_method='exact_ticker'
                )
                mappings.append(mapping)
                logger.info(f"Ticker match: {company.company_name} -> {match.company_name}")
                continue
        
        # Try exact normalized name match
        normalized_name = normalize_name(company.company_name)
        if normalized_name in gs_by_normalized_name:
            match = gs_by_normalized_name[normalized_name]
            mapping = Mapping(
                company_id=company.company_id,
                company_name=company.company_name,
                tsx_code=company.tsx_code,
                goldstock_id=match.goldstock_id,
                goldstock_name=match.company_name,
                match_status='matched',
                confidence_score=95,
                match_method='exact_name'
            )
            mappings.append(mapping)
            logger.info(f"Exact name match: {company.company_name} -> {match.company_name}")
            continue
        
        # Try fuzzy matching
        best_match = None
        best_score = 0
        best_method = ''
        
        # Get all goldstock names for fuzzy matching
        all_gs_names = [(gs.company_name, gs) for gs in goldstock_companies]
        
        # Use fuzzywuzzy's process.extractOne for efficient fuzzy matching
        if normalized_name and all_gs_names:
            # Create list of normalized names
            normalized_gs_names = [normalize_name(name) for name, _ in all_gs_names]
            
            # Find best match
            result = process.extractOne(
                normalized_name,
                normalized_gs_names,
                scorer=fuzz.token_sort_ratio
            )
            
            if result:
                # process.extractOne returns (match, score) tuple
                matched_name, score = result
                
                # Find the corresponding goldstock company
                for i, (orig_name, gs) in enumerate(all_gs_names):
                    if normalize_name(orig_name) == matched_name:
                        if score >= 80:
                            best_match = gs
                            best_score = score
                            best_method = 'fuzzy_name'
                        break
        
        # Create mapping based on results
        if best_match and best_score >= 80:
            mapping = Mapping(
                company_id=company.company_id,
                company_name=company.company_name,
                tsx_code=company.tsx_code,
                goldstock_id=best_match.goldstock_id,
                goldstock_name=best_match.company_name,
                match_status='matched' if best_score >= 90 else 'manual',
                confidence_score=best_score,
                match_method=best_method
            )
            logger.info(f"Fuzzy match ({best_score}%): {company.company_name} -> {best_match.company_name}")
        else:
            mapping = Mapping(
                company_id=company.company_id,
                company_name=company.company_name,
                tsx_code=company.tsx_code,
                goldstock_id=None,
                goldstock_name=None,
                match_status='unmatched',
                confidence_score=0,
                match_method='none'
            )
            logger.warning(f"No match found for: {company.company_name}")
        
        mappings.append(mapping)
        
        # Save checkpoint periodically
        if len(mappings) % 10 == 0:
            matcher.save_checkpoint(mappings)
            save_mappings(mappings)
            
            # Log progress
            matched_so_far = sum(1 for m in mappings if m.match_status == 'matched')
            manual_so_far = sum(1 for m in mappings if m.match_status == 'manual')
            unmatched_so_far = sum(1 for m in mappings if m.match_status == 'unmatched')
            
            logger.info(f"Progress: {len(mappings)} processed - "
                       f"Matched: {matched_so_far}, Manual: {manual_so_far}, "
                       f"Unmatched: {unmatched_so_far}")
    
    # Save final results
    save_mappings(mappings)
    matcher.save_checkpoint(mappings)
    
    return mappings

def load_companies(limit: Optional[int] = None) -> List[Company]:
    """Load companies from JSON file"""
    try:
        with open(JSON_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        companies = []
        for item in data[:limit] if limit else data:
            companies.append(Company(
                company_id=item['company_id'],
                company_name=item['company_name'],
                tsx_code=item.get('tsx_code')
            ))
        
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

def main():
    parser = argparse.ArgumentParser(description="Enhanced company mapping to goldstockdata.com")
    parser.add_argument('--limit', type=int, help='Limit number of companies to process')
    parser.add_argument('--max-id', type=int, default=1000, help='Maximum goldstock ID to fetch')
    parser.add_argument('--workers', type=int, default=5, help='Number of parallel workers')
    parser.add_argument('--resume', action='store_true', help='Resume from checkpoint')
    parser.add_argument('--clear-cache', action='store_true', help='Clear cache before starting')
    args = parser.parse_args()
    
    # Clear cache if requested
    if args.clear_cache and CACHE_FILE.exists():
        os.remove(CACHE_FILE)
        logger.info("Cache cleared")
    
    # Initialize matcher
    matcher = CompanyMatcher()
    scraper = GoldstockScraper(matcher)
    
    # Known mappings (expanded)
    known_mappings = {
        8: {"goldstock_id": "1", "goldstock_name": "Abcourt Mines Inc", "confidence_score": 100},
        10: {"goldstock_id": "8", "goldstock_name": "Agnico Eagle Mines Ltd", "confidence_score": 100},
        331: {"goldstock_id": "374", "goldstock_name": "Probe Gold Inc", "confidence_score": 100},
        48: {"goldstock_id": "1470", "goldstock_name": "Aya Gold & Silver Inc.", "confidence_score": 100},
        313: {"goldstock_id": "605", "goldstock_name": "Aura Minerals Inc.", "confidence_score": 100}
    }
    
    # Load companies
    companies = load_companies(limit=args.limit)
    if not companies:
        logger.error("No companies loaded. Exiting.")
        return
    
    # Check for resume
    if args.resume and matcher.checkpoint['processed_ids']:
        processed_ids = set(matcher.checkpoint['processed_ids'])
        companies = [c for c in companies if c.company_id not in processed_ids]
        logger.info(f"Resuming with {len(companies)} remaining companies")
    
    # Fetch goldstock companies
    logger.info(f"Fetching goldstock companies (IDs 1 to {args.max_id})...")
    goldstock_companies = scraper.fetch_companies_parallel(
        start_id=1, 
        max_id=args.max_id,
        max_workers=args.workers
    )
    
    if not goldstock_companies:
        logger.error("No goldstock companies fetched. Check your connection or selectors.")
        return
    
    logger.info(f"Fetched {len(goldstock_companies)} goldstock companies")
    
    # Perform matching
    mappings = perform_matching(companies, goldstock_companies, known_mappings, matcher)
    
    # Add any existing mappings if resuming
    if args.resume and matcher.checkpoint['mappings']:
        existing_mappings = [Mapping(**m) for m in matcher.checkpoint['mappings']]
        mappings = existing_mappings + mappings
    
    # Save final results
    save_mappings(mappings)
    
    # Generate summary
    matched = sum(1 for m in mappings if m.match_status == 'matched')
    manual = sum(1 for m in mappings if m.match_status == 'manual')
    unmatched = sum(1 for m in mappings if m.match_status == 'unmatched')
    
    logger.info(f"\nFinal Summary:")
    logger.info(f"Total processed: {len(mappings)}")
    logger.info(f"Matched: {matched} ({matched/len(mappings)*100:.1f}%)")
    logger.info(f"Manual review needed: {manual} ({manual/len(mappings)*100:.1f}%)")
    logger.info(f"Unmatched: {unmatched} ({unmatched/len(mappings)*100:.1f}%)")
    
    # Clean up checkpoint if complete
    if not interrupted and CHECKPOINT_FILE.exists():
        os.remove(CHECKPOINT_FILE)
        logger.info("Checkpoint file removed (job complete)")

if __name__ == "__main__":
    main()