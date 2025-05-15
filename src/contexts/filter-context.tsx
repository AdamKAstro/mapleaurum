// src/contexts/filter-context.tsx
import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
  ReactNode,
  useMemo,
  useRef,
} from 'react';
import type {
    Company,
    AugmentedPriceInfo,
    RpcResponseRow,
    CompanyStatus,
    ColumnTier,
    Currency,
    SortState,
    FilterSettings,
    MetricConfig
} from '../lib/types'; // Ensure this path is correct for your types
import { supabase } from '../lib/supabaseClient';
import { convertRpcRowsToCompanies } from '../lib/converters'; // Ensure this path is correct
import { metrics as allMetricConfigs } from '../lib/metric-types'; // Ensure this path is correct
import { isValidNumber } from '../lib/utils'; // Ensure this path is correct
import { useSubscription } from './subscription-context'; // Ensure this path is correct
import origFetchRetry from 'fetch-retry'; // Ensure you have 'fetch-retry' installed

// Type for the data returned by our new RPC function `get_latest_stock_prices`
interface FetchedStockPrice {
    company_id: number;
    latest_price_value: number | null;
    latest_price_currency: string | null;
    latest_price_date: string | null; // Expecting ISO string from RPC (TIMESTAMPTZ)
}

// --- FilterContextType Definition ---
// Defines the shape of the context value that will be provided and consumed.
interface FilterContextType {
  currentUserTier: ColumnTier;
  currentCurrency: Currency;
  filterSettings: FilterSettings;
  metricFullRanges: Record<string, [number, number]>; // Stores min/max ranges for metrics
  displayData: Company[]; // The main array of company data to be displayed, now augmented with latest prices
  totalCount: number; // Total number of companies matching filters (from backend pagination)
  effectiveTotalCount: number; // totalCount minus client-side excludedCompanyIds
  filteredCompanyIds: number[]; // All company IDs that match current filters (for scoring page, etc.)
  excludedCompanyIds: Set<number>; // Set of company IDs to exclude from display/scoring client-side
  toggleCompanyExclusion: (companyId: number) => void;
  loadingPaginated: boolean; // True when fetching subsequent pages of data
  loadingRanges: boolean; // True when fetching global metric ranges
  loadingFilteredSet: boolean; // True when fetching the initial set of filtered company IDs and first page
  loadingPriceAugmentation: boolean; // True when fetching and merging latest stock prices
  loading: boolean; // Combined loading state for overall UI feedback
  error: string | null; // Stores any error messages from data fetching
  setCurrentCurrency: (currency: Currency) => void;
  setDevelopmentStatusFilter: (statuses: CompanyStatus[]) => void;
  setMetricRange: (db_column: string, min: number | null, max: number | null) => void;
  setSearchTerm: (term: string) => void;
  resetFilters: () => void;
  getMetricConfigByDbColumn: (db_column: string) => MetricConfig | undefined;
  sortState: SortState;
  currentPage: number;
  pageSize: number;
  setSort: (newSortState: SortState) => void;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  fetchCompaniesByIds: (ids: number[]) => Promise<Company[]>; // Fetches specific companies and augments them
}

// Create the context with an undefined initial value
const FilterContext = createContext<FilterContextType | undefined>(undefined);

// --- Defaults ---
const DEFAULT_FILTER_SETTINGS: FilterSettings = { developmentStatus: [], metricRanges: {}, searchTerm: '' };
const DEFAULT_SORT_STATE: SortState = { key: 'company_name', direction: 'asc' };
const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 25;
const pageSizeOptions = [10, 25, 50, 100]; // Available page sizes for user selection
const EMPTY_COMPANY_ARRAY: Company[] = [];
const EMPTY_ID_ARRAY: number[] = [];
const EMPTY_SET = new Set<number>();

// Robust RPC fetcher with retry logic (as you provided)
const fetchSupabaseRpcWithRetry = async (
  rpcName: string,
  rpcParams?: Record<string, any>,
  retryOptions?: { retries?: number; retryDelay?: (attempt: number) => number }
): Promise<{ data: any; error: any }> => {
  const defaultRetryOptions = {
    retries: 3,
    retryDelay: (attempt: number) => Math.pow(2, attempt) * 1000, // Exponential backoff
  };
  const options = { ...defaultRetryOptions, ...retryOptions };
  const fetcher = () => supabase.rpc(rpcName, rpcParams);

  const retryingFetch = origFetchRetry(fetcher as any, {
    retries: options.retries,
    retryDelay: options.retryDelay,
    retryOn: async (_attempt: number, error: any, response: any) => {
      if (error) {
        console.warn(`[FilterContext][Retry] Network error during RPC '${rpcName}', retrying...`, error);
        return true; // Retry on network errors
      }
      if (response && response.error) {
        const supaError = response.error;
        console.warn(`[FilterContext][Retry] Supabase RPC '${rpcName}' returned error (Status:${response.status}, Code:${supaError.code}), retrying...:`, supaError.message);
        // Do not retry if the function specifically isn't found
        if (response.status === 404 && (supaError.code === 'PGRST200' || supaError.message.toLowerCase().includes('function not found'))) {
          console.error(`[FilterContext][Retry] RPC function '${rpcName}' not found. Not retrying.`);
          return false;
        }
        return true; // Retry on other Supabase errors
      }
      return false; // Success, no retry needed
    },
  });

  try {
    const result = await retryingFetch();
    return result as { data: any; error: any };
  } catch (error: any) {
    console.error(`[FilterContext][Retry] Unhandled exception during retry for RPC '${rpcName}':`, error);
    return { data: null, error: error instanceof Error ? error : new Error(String(error.message || `Unknown RPC error with ${rpcName} after retries`)) };
  }
};

// --- FilterProvider Component ---
export const FilterProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // --- State Definitions ---
  const { currentUserSubscriptionTier, isLoading: isSubscriptionLoading } = useSubscription();
  const currentUserTier: ColumnTier = currentUserSubscriptionTier as ColumnTier;

  const [currentCurrency, setCurrentCurrencyState] = useState<Currency>('USD');
  const [filterSettings, setFilterSettings] = useState<FilterSettings>(DEFAULT_FILTER_SETTINGS);
  const [metricFullRanges, setMetricFullRanges] = useState<Record<string, [number, number]>>({});
  const [displayData, setDisplayData] = useState<Company[]>(EMPTY_COMPANY_ARRAY);
  const [totalCount, setTotalCount] = useState<number>(0); // Total items matching filters, from backend
  const [filteredCompanyIds, setFilteredCompanyIds] = useState<number[]>(EMPTY_ID_ARRAY); // All IDs matching filters
  const [excludedCompanyIds, setExcludedCompanyIds] = useState<Set<number>>(EMPTY_SET); // Client-side exclusions
  
  const [loadingPaginated, setLoadingPaginated] = useState<boolean>(false);
  const [loadingRanges, setLoadingRanges] = useState<boolean>(true);
  const [loadingFilteredSet, setLoadingFilteredSet] = useState<boolean>(true);
  const [loadingPriceAugmentation, setLoadingPriceAugmentation] = useState<boolean>(false); // For the new price fetching step
  
  const [error, setError] = useState<string | null>(null);
  const [sortState, setSortState] = useState<SortState>(DEFAULT_SORT_STATE);
  const [currentPage, setCurrentPage] = useState<number>(DEFAULT_PAGE);
  const [pageSize, setPageSizeState] = useState<number>(DEFAULT_PAGE_SIZE);
  const lastFetchedPageRef = useRef<number>(0); // To prevent redundant fetches for the same page

  // --- Memoized Derived State ---
  // Calculate effective total count after client-side exclusions
  // This must be defined *before* any useCallback that depends on it (like handleSetPage)
  const effectiveTotalCount = useMemo(() => {
    const count = totalCount - excludedCompanyIds.size;
    // console.log(`[FilterContext] effectiveTotalCount updated: total=${totalCount}, excluded=${excludedCompanyIds.size}, effective=${Math.max(0, count)}`);
    return Math.max(0, count);
  }, [totalCount, excludedCompanyIds]);

  // Combined loading state for general UI feedback
  const loading = useMemo(() => 
    isSubscriptionLoading || 
    loadingRanges || 
    loadingFilteredSet || 
    loadingPaginated || 
    loadingPriceAugmentation,
  [isSubscriptionLoading, loadingRanges, loadingFilteredSet, loadingPaginated, loadingPriceAugmentation]);

  // --- Callback for Augmenting Company Data with Latest Stock Prices ---
  const augmentCompaniesWithStockPrices = useCallback(async (companiesToAugment: Company[]): Promise<Company[]> => {
    if (!companiesToAugment || companiesToAugment.length === 0) {
        // console.log("[FilterContext][Augment] No companies provided to augment, returning original array.");
        return companiesToAugment;
    }

    const companyIds = companiesToAugment.map(c => c.company_id).filter(id => id != null && typeof id === 'number') as number[];
    if (companyIds.length === 0) {
        console.log("[FilterContext][Augment] No valid company IDs found in the provided list for price augmentation.");
        return companiesToAugment;
    }

    console.log(`[FilterContext][Augment] Starting price augmentation for ${companyIds.length} companies. Sample IDs: ${companyIds.slice(0,3).join(', ')}...`);
    setLoadingPriceAugmentation(true);

    try {
        const { data: rpcStockPriceData, error: stockPriceError } = await supabase.rpc('get_latest_stock_prices', {
            company_ids_array: companyIds,
        });

        if (stockPriceError) {
            console.error("[FilterContext][Augment] Error fetching latest stock prices from RPC 'get_latest_stock_prices':", stockPriceError.message, stockPriceError);
            return companiesToAugment.map(company => ({
                ...company,
                share_price_source_actual: 'calculated_from_market_cap', // Fallback source
                share_price_currency_actual: company.financials?.market_cap_currency ?? (company as any).f_market_cap_currency ?? 'USD', // Fallback currency
                share_price_date_actual: null, // No actual date for calculated
            }));
        }
        
        const stockPriceData = rpcStockPriceData as FetchedStockPrice[] | null;
        const priceMap = new Map<number, AugmentedPriceInfo & { latest_price_value?: number | null }>();
        
        if (stockPriceData) {
            console.log(`[FilterContext][Augment] Received ${stockPriceData.length} stock price entries from RPC.`);
            stockPriceData.forEach(sp => {
                if (sp.latest_price_date && isValidNumber(sp.latest_price_value)) {
                    const priceDate = new Date(sp.latest_price_date);
                    const roughlyOneWeekAgo = new Date();
                    roughlyOneWeekAgo.setDate(roughlyOneWeekAgo.getDate() - 7); 
                    roughlyOneWeekAgo.setHours(0,0,0,0); // Normalize to start of the day for consistent comparison

                    if (!isNaN(priceDate.getTime())) { // Ensure priceDate is a valid date
                        if (priceDate >= roughlyOneWeekAgo) {
                            priceMap.set(sp.company_id, {
                                latest_price_value: sp.latest_price_value,
                                share_price_currency_actual: sp.latest_price_currency,
                                share_price_date_actual: sp.latest_price_date,
                                share_price_source_actual: 'stock_prices_table',
                            });
                        } else {
                            // Price is valid but older than preferred window
                            priceMap.set(sp.company_id, {
                                latest_price_value: sp.latest_price_value, // Store old price for info
                                share_price_currency_actual: sp.latest_price_currency,
                                share_price_date_actual: sp.latest_price_date,
                                share_price_source_actual: 'stock_prices_table_old',
                            });
                        }
                    } else {
                        console.warn(`[FilterContext][Augment] Invalid priceDate object for company ${sp.company_id}, original date string: ${sp.latest_price_date}`);
                    }
                }
            });
        }

        const augmentedCompanies = companiesToAugment.map(company => {
            const stockPriceInfo = priceMap.get(company.company_id);
            
            if (stockPriceInfo && stockPriceInfo.share_price_source_actual === 'stock_prices_table' && isValidNumber(stockPriceInfo.latest_price_value)) {
                return {
                    ...company,
                    share_price: stockPriceInfo.latest_price_value,
                    share_price_currency_actual: stockPriceInfo.share_price_currency_actual,
                    share_price_date_actual: stockPriceInfo.share_price_date_actual,
                    share_price_source_actual: 'stock_prices_table',
                };
            } else {
                // Fallback logic: use existing calculated share_price or re-calculate if possible
                let finalSharePrice = company.share_price; // This should be the calculated one from the view
                const marketCap = company.financials?.market_cap_value ?? (company as any).f_market_cap_value;
                const existingShares = company.capital_structure?.existing_shares ?? (company as any).cs_existing_shares;
                const marketCapCurrency = company.financials?.market_cap_currency ?? (company as any).f_market_cap_currency;

                if (!isValidNumber(finalSharePrice) && isValidNumber(marketCap) && isValidNumber(existingShares) && existingShares > 0) {
                    finalSharePrice = marketCap / existingShares;
                }
                
                const sourceToSet = stockPriceInfo?.share_price_source_actual === 'stock_prices_table_old' ? 'stock_prices_table_old' : 'calculated_from_market_cap';
                const currencyToSet = stockPriceInfo?.share_price_source_actual === 'stock_prices_table_old' ? stockPriceInfo.share_price_currency_actual : (marketCapCurrency ?? 'USD');
                const dateToSet = stockPriceInfo?.share_price_source_actual === 'stock_prices_table_old' ? stockPriceInfo.share_price_date_actual : null;

                return {
                    ...company,
                    share_price: finalSharePrice,
                    share_price_source_actual: sourceToSet,
                    share_price_currency_actual: currencyToSet,
                    share_price_date_actual: dateToSet,
                };
            }
        });
        
        console.log(`[FilterContext][Augment] Price augmentation applied. Output companies: ${augmentedCompanies.length}`);
        return augmentedCompanies;

    } catch (error) {
        console.error("[FilterContext][Augment] Exception during price augmentation process:", error);
        return companiesToAugment.map(company => ({
            ...company,
            share_price_source_actual: 'calculated_from_market_cap', // Default on error
            share_price_currency_actual: company.financials?.market_cap_currency ?? (company as any).f_market_cap_currency ?? 'USD',
            share_price_date_actual: null,
        }));
    } finally {
        setLoadingPriceAugmentation(false);
    }
  }, [supabase]); // supabase client is a stable dependency

  // --- Effect to fetch global metric ranges (min/max for all metrics) ---
  useEffect(() => {
    let mounted = true;
    const fetchFullRanges = async () => { 
        if (!mounted) return;
        setLoadingRanges(true); setError(null);
        console.log("[FilterContext] Fetching global metric ranges.");
        try {
            const { data, error: rpcError } = await fetchSupabaseRpcWithRetry('get_metrics_ranges');
            if (!mounted) return; // Check mounted status after await
            if (rpcError) throw rpcError;
            setMetricFullRanges((data as Record<string, [number, number]>) ?? {});
            console.log("[FilterContext] Global metric ranges fetched.");
        } catch (err: any) {
            if (!mounted) return;
            console.error("[FilterContext] Error fetching metric ranges:", err.message);
            setError(`Failed to load metric ranges: ${err.message || 'Unknown error'}`);
            setMetricFullRanges({});
        } finally {
            if (mounted) setLoadingRanges(false);
        }
    };
    fetchFullRanges();
    return () => { mounted = false; }; // Cleanup on unmount
  }, []); // Runs once on mount

  // --- Callback to build filters JSON for RPC calls ---
  const buildFiltersJson = useCallback((settings: FilterSettings): Record<string, any> => { 
    const filtersJson: Record<string, any> = {};
    if (settings.developmentStatus?.length > 0) {
      filtersJson.status = settings.developmentStatus.filter(s => typeof s === 'string');
    }
    const searchTerm = settings.searchTerm?.trim();
    if (searchTerm) {
      filtersJson.searchTerm = searchTerm;
    }
    if (settings.metricRanges) {
      Object.entries(settings.metricRanges).forEach(([db_column, range]) => {
        if (Array.isArray(range)) {
          const [minVal, maxVal] = range;
          if (minVal !== null && isValidNumber(minVal)) filtersJson[`min_${db_column}`] = minVal;
          if (maxVal !== null && isValidNumber(maxVal)) filtersJson[`max_${db_column}`] = maxVal;
        }
      });
    }
    return filtersJson;
  }, []);

  // --- Callback to fetch initial dataset (filtered IDs and first page of data) ---
  const fetchFilteredSetAndFirstPage = useCallback(async (
    currentFilters: FilterSettings, currentSort: SortState, sizeForFirstPage: number,
    currency: Currency, tier: ColumnTier
  ) => {
    if (isSubscriptionLoading && !currentUserTier) {
      console.log('[FilterContext][InitialFetch] Skipping: Subscription/tier not ready.');
      setLoadingFilteredSet(false); setLoadingPaginated(false); return;
    }
    console.log(`[FilterContext][InitialFetch] Fetching Page 1. Size: ${sizeForFirstPage}, Sort: ${currentSort.key} ${currentSort.direction}, Filters:`, JSON.stringify(currentFilters));
    setLoadingFilteredSet(true); setLoadingPaginated(true); setError(null);
    
    const filtersJson = buildFiltersJson(currentFilters);
    let fetchedTotalCount = 0; let firstPageItems: Company[] = EMPTY_COMPANY_ARRAY; let allMatchingIds: number[] = EMPTY_ID_ARRAY;

    try {
      const pageOneRpcParams = {
        page_num: 1, page_size: sizeForFirstPage, sort_column: currentSort.key,
        sort_direction: currentSort.direction, target_currency: currency, filters: filtersJson,
      };
      const { data: pageOneData, error: pageOneError } = await fetchSupabaseRpcWithRetry('get_companies_paginated', pageOneRpcParams);

      if (pageOneError) throw new Error(`Failed to fetch page 1 (get_companies_paginated): ${pageOneError.message || 'RPC error'}`);

      if (!pageOneData || pageOneData.length === 0) {
        console.log('[FilterContext][InitialFetch] No data from get_companies_paginated for page 1.');
      } else {
        fetchedTotalCount = pageOneData[0]?.total_rows ?? 0; // Relies on total_rows from RPC
        if (typeof fetchedTotalCount !== 'number' || !isFinite(fetchedTotalCount)) fetchedTotalCount = pageOneData.length;
        let converted = convertRpcRowsToCompanies(pageOneData as RpcResponseRow[]);
        firstPageItems = await augmentCompaniesWithStockPrices(converted);
        if (currentSort.key === 'share_price') {
          firstPageItems.sort((a, b) => {
            const valA = a.share_price ?? (currentSort.direction === 'asc' ? Infinity : -Infinity);
            const valB = b.share_price ?? (currentSort.direction === 'asc' ? Infinity : -Infinity);
            return currentSort.direction === 'asc' ? valA - valB : valB - valA;
          });
        }
      }

      const { data: idData, error: idError } = await fetchSupabaseRpcWithRetry('get_filtered_company_ids', { filters: filtersJson });
      if (idError) console.error("[FilterContext][InitialFetch] Error fetching filtered IDs:", idError);
      allMatchingIds = (idData as { company_id: number }[] || []).map(r => r.company_id);
      
      // Adjust totalCount based on ID fetch if necessary
      if (Object.keys(filtersJson).length > 0 || fetchedTotalCount === 0) { // If filters were applied or paginated returned 0
          if (allMatchingIds.length !== fetchedTotalCount) {
              console.warn(`[FilterContext][InitialFetch] Count Mismatch: Paginated total (${fetchedTotalCount}) vs. IDs total (${allMatchingIds.length}). Using IDs total count.`);
              fetchedTotalCount = allMatchingIds.length;
          }
      }
      
      setTotalCount(fetchedTotalCount); 
      setDisplayData(firstPageItems); 
      setFilteredCompanyIds(allMatchingIds);
      lastFetchedPageRef.current = 1;
      console.log(`[FilterContext][InitialFetch] Done. TotalCount: ${fetchedTotalCount}, Displaying: ${firstPageItems.length}`);
    } catch (err: any) {
      console.error('[FilterContext][InitialFetch] Critical error:', err.message);
      setError(`Failed to fetch initial data: ${err.message || 'Unknown error'}`);
      setTotalCount(0); setDisplayData(EMPTY_COMPANY_ARRAY); setFilteredCompanyIds(EMPTY_ID_ARRAY);
    } finally {
      setLoadingFilteredSet(false); setLoadingPaginated(false);
    }
  }, [buildFiltersJson, isSubscriptionLoading, currentUserTier, augmentCompaniesWithStockPrices]);

  // --- Callback to fetch subsequent pages of data ---
  const fetchPaginatedDataOnly = useCallback(async (
    pageToFetch: number, sizeToFetch: number, currentSort: SortState,
    currentFilters: FilterSettings, currency: Currency, tier: ColumnTier
  ) => {
    if (pageToFetch <= 1) { console.log("[FC][Paginate] Page 1 attempt via fetchPaginatedDataOnly, skipping."); return; }
    if (loadingRanges || loadingFilteredSet || loadingPaginated || (isSubscriptionLoading && !currentUserTier) || loadingPriceAugmentation ) {
      console.log(`[FC][Paginate] Skipping Page ${pageToFetch} due to loading state.`); return;
    }
    setLoadingPaginated(true); setError(null);
    console.log(`[FC][Paginate] Fetching Page: ${pageToFetch}, Size: ${sizeToFetch}`);
    const filtersJson = buildFiltersJson(currentFilters);
    const rpcParams = { page_num: pageToFetch, page_size: sizeToFetch, sort_column: currentSort.key, sort_direction: currentSort.direction, target_currency: currency, filters: filtersJson };
    try {
      const { data, error: rpcError } = await fetchSupabaseRpcWithRetry('get_companies_paginated', rpcParams);
      if (rpcError) throw rpcError;
      let fetched = data ? convertRpcRowsToCompanies(data as RpcResponseRow[]) : EMPTY_COMPANY_ARRAY;
      fetched = await augmentCompaniesWithStockPrices(fetched);
      if (currentSort.key === 'share_price') {
        fetched.sort((a, b) => {
            const valA = a.share_price ?? (currentSort.direction === 'asc' ? Infinity : -Infinity);
            const valB = b.share_price ?? (currentSort.direction === 'asc' ? Infinity : -Infinity);
            return currentSort.direction === 'asc' ? valA - valB : valB - valA;
        });
      }
      setDisplayData(fetched);
      lastFetchedPageRef.current = pageToFetch;
    } catch (err: any) {
      console.error(`[FC][Paginate] Error page ${pageToFetch}:`, err.message);
      setError(`Workspace failed page ${pageToFetch}: ${err.message || 'Unknown'}`);
      setDisplayData(EMPTY_COMPANY_ARRAY);
    } finally {
      setLoadingPaginated(false);
    }
  }, [buildFiltersJson, loadingRanges, loadingFilteredSet, loadingPaginated, isSubscriptionLoading, currentUserTier, augmentCompaniesWithStockPrices]);

  // --- Effect to trigger initial data load and re-fetches on primary filter/sort changes ---
  useEffect(() => {
    if (loadingRanges || (isSubscriptionLoading && !currentUserTier)) {
      console.log(`[FC][Effect1] Initial data load prerequisites not met.`);
      return;
    }
    console.log("[FC][Effect1] Primary dependencies changed. Resetting to page 1 and fetching data.");
    setCurrentPage(DEFAULT_PAGE); 
    lastFetchedPageRef.current = 0; // Ensures page 1 data is fetched by fetchFilteredSetAndFirstPage
    fetchFilteredSetAndFirstPage(filterSettings, sortState, pageSize, currentCurrency, currentUserTier);
  }, [filterSettings, currentCurrency, pageSize, sortState, currentUserTier, loadingRanges, isSubscriptionLoading, fetchFilteredSetAndFirstPage]);

  // --- Effect to handle fetching for subsequent page changes ---
  useEffect(() => {
    // Do not run for page 1 (handled by the effect above)
    // Do not run if this page was just fetched (lastFetchedPageRef.current === currentPage)
    if (currentPage === DEFAULT_PAGE || lastFetchedPageRef.current === currentPage) {
        return;
    }
    // Do not run if other critical operations are in progress
    if (loadingRanges || loadingFilteredSet || (isSubscriptionLoading && !currentUserTier) || loadingPaginated || loadingPriceAugmentation ) {
      console.log(`[FC][Effect2-Pagination] Skipping fetch for page ${currentPage} due to other loading states.`);
      return;
    }
    console.log(`[FC][Effect2-Pagination] CurrentPage changed to ${currentPage}. Fetching paginated data.`);
    fetchPaginatedDataOnly(currentPage, pageSize, sortState, filterSettings, currentCurrency, currentUserTier);
  }, [currentPage, pageSize, sortState, filterSettings, currentCurrency, currentUserTier, loadingRanges, loadingFilteredSet, isSubscriptionLoading, loadingPaginated, loadingPriceAugmentation, fetchPaginatedDataOnly]); // Added all relevant dependencies

  // --- Callback to fetch specific companies by IDs (e.g., for Scoring Page) ---
  const fetchCompaniesByIds = useCallback(async (ids: number[]): Promise<Company[]> => {
    if (!Array.isArray(ids) || ids.length === 0) {
      console.log("[FC] fetchCompaniesByIds: No IDs provided.");
      return EMPTY_COMPANY_ARRAY;
    }
    console.log(`[FC] fetchCompaniesByIds: Fetching details for ${ids.length} IDs from 'companies_detailed_view'.`);
    setError(null); 
    setLoadingPriceAugmentation(true); // Use this to indicate work involving price augmentation

    try {
      const { data, error: viewError } = await supabase
        .from('companies_detailed_view') // Assumes this view provides all necessary base fields
        .select('*')
        .in('company_id', ids);

      if (viewError) {
        console.error('[FC] fetchCompaniesByIds: Error fetching from view:', viewError);
        throw viewError;
      }
      if (data === null) {
        console.log("[FC] fetchCompaniesByIds: No data from view for IDs:", ids);
        return EMPTY_COMPANY_ARRAY;
      }
      
      let initialCompanyData = convertRpcRowsToCompanies(data as RpcResponseRow[]);
      console.log(`[FC] fetchCompaniesByIds: Fetched ${initialCompanyData.length} initial records. Augmenting prices...`);
      const augmentedCompanyData = await augmentCompaniesWithStockPrices(initialCompanyData);
      
      console.log(`[FC] fetchCompaniesByIds: Successfully augmented ${augmentedCompanyData.length} companies.`);
      return augmentedCompanyData;

    } catch (err: any) {
      console.error('[FC] fetchCompaniesByIds: Critical error:', err);
      setError(`Failed to load detailed company data by IDs: ${err.message || 'Unknown error'}`);
      return EMPTY_COMPANY_ARRAY;
    } finally {
        setLoadingPriceAugmentation(false);
    }
  }, [supabase, augmentCompaniesWithStockPrices]);


  // --- Setter Callbacks ---
  const handleSetDevelopmentStatus = useCallback((statuses: CompanyStatus[]) => setFilterSettings(prev => ({ ...prev, developmentStatus: statuses })), []);
  const handleSetMetricRange = useCallback((db_column: string, min: number | null, max: number | null) => setFilterSettings(prev => ({ ...prev, metricRanges: { ...prev.metricRanges, [db_column]: [min, max] } })), []);
  const handleSetSearchTerm = useCallback((term: string) => setFilterSettings(prev => ({ ...prev, searchTerm: term })), []);
  const handleResetFilters = useCallback(() => {
    console.log("[FC] Resetting filters.");
    setFilterSettings(DEFAULT_FILTER_SETTINGS);
    setSortState(DEFAULT_SORT_STATE);
    setExcludedCompanyIds(EMPTY_SET);
    setPageSizeState(DEFAULT_PAGE_SIZE);
    // setCurrentPage(DEFAULT_PAGE); // Let the main useEffect handle this
  }, []);
  const handleToggleCompanyExclusion = useCallback((companyId: number) => {
    setExcludedCompanyIds(prev => {
      const newSet = new Set(prev);
      newSet.has(companyId) ? newSet.delete(companyId) : newSet.add(companyId);
      return newSet;
    });
  }, []);
  const handleSetSort = useCallback((newSortState: SortState) => {
    if (newSortState.key !== sortState.key || newSortState.direction !== sortState.direction) {
        setSortState(newSortState);
        // setCurrentPage(DEFAULT_PAGE); // Let the main useEffect handle this
    }
  }, [sortState]);
  
  // handleSetPage uses effectiveTotalCount, which is defined above using useMemo
  const handleSetPage = useCallback((page: number) => {
    const maxPage = Math.max(1, Math.ceil(effectiveTotalCount / pageSize)); 
    const validPage = Math.max(1, Math.min(page, maxPage));
    if (validPage !== currentPage) {
        setCurrentPage(validPage);
    } else if (page !== validPage) { 
        console.log(`[FC] Page ${page} out of bounds (1-${maxPage}). Staying on page ${currentPage}.`);
    }
  }, [currentPage, effectiveTotalCount, pageSize]); // effectiveTotalCount IS a dependency

  const handleSetPageSize = useCallback((size: number) => {
    if (pageSizeOptions.includes(size) && size !== pageSize) {
        setPageSizeState(size);
        // setCurrentPage(DEFAULT_PAGE); // Let the main useEffect handle this
    }
  }, [pageSize]);
  const handleSetCurrentCurrency = useCallback((currency: Currency) => {
    if (currency !== currentCurrency) setCurrentCurrencyState(currency);
  }, [currentCurrency]);
  const getMetricConfigByDbColumn = useCallback((db_column: string): MetricConfig | undefined => allMetricConfigs.find(m => m.db_column === db_column || m.key === db_column || m.nested_path === db_column), []);


  // --- Context Value ---
  // This useMemo also needs effectiveTotalCount in its dependency array if it's part of the returned value.
  const value = useMemo<FilterContextType>(() => ({
    currentUserTier, currentCurrency, filterSettings, metricFullRanges, displayData, totalCount,
    effectiveTotalCount, // Included here
    filteredCompanyIds, excludedCompanyIds, toggleCompanyExclusion: handleToggleCompanyExclusion,
    loadingPaginated, loadingRanges, loadingFilteredSet, loadingPriceAugmentation, loading, error, 
    setCurrentCurrency: handleSetCurrentCurrency,
    setDevelopmentStatusFilter: handleSetDevelopmentStatus, setMetricRange: handleSetMetricRange,
    setSearchTerm: handleSetSearchTerm, resetFilters: handleResetFilters, getMetricConfigByDbColumn,
    sortState, currentPage, pageSize, setSort: handleSetSort, setPage: handleSetPage,
    setPageSize: handleSetPageSize, fetchCompaniesByIds,
  }), [
    currentUserTier, currentCurrency, filterSettings, metricFullRanges, displayData, totalCount, 
    effectiveTotalCount, // Add effectiveTotalCount to dependency array
    filteredCompanyIds, excludedCompanyIds, handleToggleCompanyExclusion, loadingPaginated, loadingRanges,
    loadingFilteredSet, loadingPriceAugmentation, loading, error, handleSetCurrentCurrency, handleSetDevelopmentStatus, handleSetMetricRange,
    handleSetSearchTerm, handleResetFilters, getMetricConfigByDbColumn, sortState, currentPage, pageSize,
    handleSetSort, handleSetPage, handleSetPageSize, fetchCompaniesByIds
  ]);

  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>;
};

export const useFilters = (): FilterContextType => {
  const context = useContext(FilterContext);
  if (context === undefined) {
    console.error("useFilters called outside of a FilterProvider.");
    throw new Error('useFilters must be used within a FilterProvider. Ensure your component is wrapped.');
  }
  return context;
};