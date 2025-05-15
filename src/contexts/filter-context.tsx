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
} from '../lib/types';
import { supabase } from '../lib/supabaseClient';
import { convertRpcRowsToCompanies } from '../lib/converters';
import { metrics as allMetricConfigs } from '../lib/metric-types';
import { isValidNumber } from '../lib/utils';
import { useSubscription } from './subscription-context';
import origFetchRetry from 'fetch-retry';

// Type for the data returned by our new RPC function `get_latest_stock_prices`
interface FetchedStockPrice {
    company_id: number;
    latest_price_value: number | null;
    latest_price_currency: string | null;
    latest_price_date: string | null; // Expecting ISO string from RPC (TIMESTAMPTZ)
}

interface FilterContextType {
  currentUserTier: ColumnTier;
  currentCurrency: Currency;
  filterSettings: FilterSettings;
  metricFullRanges: Record<string, [number, number]>;
  displayData: Company[];
  totalCount: number;
  effectiveTotalCount: number;
  filteredCompanyIds: number[];
  excludedCompanyIds: Set<number>;
  toggleCompanyExclusion: (companyId: number) => void;
  loadingPaginated: boolean;
  loadingRanges: boolean;
  loadingFilteredSet: boolean;
  loadingPriceAugmentation: boolean;
  loading: boolean;
  error: string | null;
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
  fetchCompaniesByIds: (ids: number[]) => Promise<Company[]>;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

const DEFAULT_FILTER_SETTINGS: FilterSettings = { developmentStatus: [], metricRanges: {}, searchTerm: '' };
const DEFAULT_SORT_STATE: SortState = { key: 'company_name', direction: 'asc' };
const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 25;
const pageSizeOptions = [10, 25, 50, 100];
const EMPTY_COMPANY_ARRAY: Company[] = [];
const EMPTY_ID_ARRAY: number[] = [];
const EMPTY_SET = new Set<number>();

const fetchSupabaseRpcWithRetry = async (
  rpcName: string,
  rpcParams?: Record<string, any>,
  retryOptions?: { retries?: number; retryDelay?: (attempt: number) => number }
): Promise<{ data: any; error: any }> => {
  const defaultRetryOptions = {
    retries: 3,
    retryDelay: (attempt: number) => Math.pow(2, attempt) * 1000,
  };
  const options = { ...defaultRetryOptions, ...retryOptions };
  const fetcher = () => supabase.rpc(rpcName, rpcParams);

  const retryingFetch = origFetchRetry(fetcher as any, {
    retries: options.retries,
    retryDelay: options.retryDelay,
    retryOn: async (_attempt: number, error: any, response: any) => {
      if (error) { console.warn(`[FC] RPC NetErr '${rpcName}':`, error); return true; }
      if (response && response.error) {
        const supaError = response.error;
        console.warn(`[FC] RPC SupaErr '${rpcName}' (S:${response.status},C:${supaError.code}):`, supaError.message);
        if (response.status === 404 && (supaError.code === 'PGRST200' || supaError.message.toLowerCase().includes('function not found'))) {
          console.error(`[FC] RPC '${rpcName}' not found. No Retry.`); return false;
        }
        return true;
      }
      return false;
    },
  });
  try {
    return await retryingFetch() as { data: any; error: any };
  } catch (error: any) {
    console.error(`[FC] Unhandled RPC Retry Exception '${rpcName}':`, error);
    return { data: null, error: error instanceof Error ? error : new Error(String(error.message || `Unknown RPC err ${rpcName}`)) };
  }
};

export const FilterProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { currentUserSubscriptionTier, isLoading: isSubscriptionLoading } = useSubscription();
  const currentUserTier: ColumnTier = currentUserSubscriptionTier as ColumnTier;

  const [currentCurrency, setCurrentCurrencyState] = useState<Currency>('USD');
  const [filterSettings, setFilterSettings] = useState<FilterSettings>(DEFAULT_FILTER_SETTINGS);
  const [metricFullRanges, setMetricFullRanges] = useState<Record<string, [number, number]>>({});
  const [displayData, setDisplayData] = useState<Company[]>(EMPTY_COMPANY_ARRAY);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [filteredCompanyIds, setFilteredCompanyIds] = useState<number[]>(EMPTY_ID_ARRAY);
  const [excludedCompanyIds, setExcludedCompanyIds] = useState<Set<number>>(EMPTY_SET);
  const [loadingPaginated, setLoadingPaginated] = useState<boolean>(false);
  const [loadingRanges, setLoadingRanges] = useState<boolean>(true);
  const [loadingFilteredSet, setLoadingFilteredSet] = useState<boolean>(true);
  const [loadingPriceAugmentation, setLoadingPriceAugmentation] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [sortState, setSortState] = useState<SortState>(DEFAULT_SORT_STATE);
  const [currentPage, setCurrentPage] = useState<number>(DEFAULT_PAGE);
  const [pageSize, setPageSizeState] = useState<number>(DEFAULT_PAGE_SIZE);
  const lastFetchedPageRef = useRef<number>(0);

  // Memoized derived state for effective total count (after client-side exclusions)
  // This MUST be defined before any useCallback/useMemo that depends on it.
  const effectiveTotalCount = useMemo(() => {
    const count = totalCount - excludedCompanyIds.size;
    return Math.max(0, count);
  }, [totalCount, excludedCompanyIds]);

  // Callback to augment companies with latest stock prices from the 'stock_prices' table
  const augmentCompaniesWithStockPrices = useCallback(async (companiesToAugment: Company[]): Promise<Company[]> => {
    if (!companiesToAugment || companiesToAugment.length === 0) {
      // console.log("[FilterContext][Augment] No companies provided to augment, returning original array.");
      return companiesToAugment;
    }

    const companyIds = companiesToAugment.map(c => c.company_id).filter(id => id != null && typeof id === 'number') as number[];
    if (companyIds.length === 0) {
      // console.log("[FilterContext][Augment] No valid company IDs found in the provided companies list for price augmentation.");
      return companiesToAugment;
    }

    console.log(`[FilterContext][Augment] Starting price augmentation for ${companyIds.length} companies. Sample IDs: ${companyIds.slice(0,3).join(', ')}...`);
    setLoadingPriceAugmentation(true); // Signal that price augmentation is in progress

    try {
      // Call the new RPC function to get the latest stock prices
      const { data: rpcStockPriceData, error: stockPriceError } = await supabase.rpc('get_latest_stock_prices', {
          company_ids_array: companyIds,
      });

      if (stockPriceError) {
          console.error("[FilterContext][Augment] Error fetching latest stock prices from RPC 'get_latest_stock_prices':", stockPriceError.message, stockPriceError);
          // On error, return original data but ensure source is marked as calculated for clarity
          return companiesToAugment.map(company => ({
              ...company,
              share_price: company.share_price, // Keep original (calculated) share_price
              share_price_source_actual: 'calculated_from_market_cap', // Indicate source
              // Try to get currency from nested financials, then flat f_market_cap_currency, then default
              share_price_currency_actual: company.financials?.market_cap_currency ?? (company as any).f_market_cap_currency ?? 'USD',
              share_price_date_actual: null, // No specific date for calculated price
          }));
      }
      
      const stockPriceData = rpcStockPriceData as FetchedStockPrice[] | null;
      const priceMap = new Map<number, AugmentedPriceInfo & { latest_price_value?: number | null }>(); // To store fetched prices by company_id
      
      if (stockPriceData) {
          console.log(`[FilterContext][Augment] Received ${stockPriceData.length} stock price entries from RPC.`);
          stockPriceData.forEach(sp => {
              // Ensure the fetched price data is valid before processing
              if (sp.latest_price_date && isValidNumber(sp.latest_price_value)) {
                  const priceDate = new Date(sp.latest_price_date);
                  const roughlyOneWeekAgo = new Date(); // Define "recent" threshold
                  roughlyOneWeekAgo.setDate(roughlyOneWeekAgo.getDate() - 7); // Example: 7 calendar days
                  roughlyOneWeekAgo.setHours(0,0,0,0); // Normalize to start of the day for comparison

                  if (!isNaN(priceDate.getTime())) { // Check if priceDate is a valid Date object
                      if (priceDate >= roughlyOneWeekAgo) {
                          // Price is recent and valid, store it for use
                          priceMap.set(sp.company_id, {
                              latest_price_value: sp.latest_price_value,
                              share_price_currency_actual: sp.latest_price_currency,
                              share_price_date_actual: sp.latest_price_date, // Store as ISO string
                              share_price_source_actual: 'stock_prices_table',
                          });
                      } else {
                          // Price is valid but older than the defined "recent" window
                          // console.log(`[FilterContext][Augment] Stock price for company ${sp.company_id} (date: ${sp.latest_price_date}) is valid but older than ~7 days.`);
                          priceMap.set(sp.company_id, {
                              latest_price_value: sp.latest_price_value, // Store old price value for info
                              share_price_currency_actual: sp.latest_price_currency,
                              share_price_date_actual: sp.latest_price_date,
                              share_price_source_actual: 'stock_prices_table_old', // Mark as old
                          });
                      }
                  } else {
                      console.warn(`[FilterContext][Augment] Invalid priceDate object constructed for company ${sp.company_id}, original date string from RPC: ${sp.latest_price_date}`);
                  }
              } else {
                   console.log(`[FilterContext][Augment] Stock price entry for company ${sp.company_id} skipped (missing date or invalid/null price value in RPC response).`);
              }
          });
      } else {
          console.log("[FilterContext][Augment] No stock price data array returned from RPC call (data is null).");
      }

      // Map over the original company data and augment with new price info where applicable
      const augmentedCompanies = companiesToAugment.map(company => {
          const stockPriceInfo = priceMap.get(company.company_id);
          
          // Case 1: Recent and valid price found in stock_prices table
          if (stockPriceInfo && stockPriceInfo.share_price_source_actual === 'stock_prices_table' && isValidNumber(stockPriceInfo.latest_price_value)) {
              return {
                  ...company,
                  share_price: stockPriceInfo.latest_price_value, // Override with actual stock price
                  share_price_currency_actual: stockPriceInfo.share_price_currency_actual,
                  share_price_date_actual: stockPriceInfo.share_price_date_actual,
                  share_price_source_actual: 'stock_prices_table',
              };
          } else {
              // Case 2: No recent price from stock_prices, or it was invalid. Use fallback.
              // The company.share_price already holds the calculated value from the view if `convertRpcRowsToCompanies` set it.
              let finalSharePrice = company.share_price;
              let source: AugmentedPriceInfo['share_price_source_actual'] = 'calculated_from_market_cap';
              let currencyActual: string | null | undefined = company.financials?.market_cap_currency ?? (company as any).f_market_cap_currency ?? 'USD';
              let dateActual: string | null = null;

              // If existing share_price on company object is not valid, try to re-calculate
              if (!isValidNumber(finalSharePrice)) {
                  const marketCap = company.financials?.market_cap_value ?? (company as any).f_market_cap_value;
                  const existingShares = company.capital_structure?.existing_shares ?? (company as any).cs_existing_shares;
                  
                  if (isValidNumber(marketCap) && isValidNumber(existingShares) && existingShares > 0) {
                      finalSharePrice = marketCap / existingShares;
                      // Currency and source are already set for calculated
                  } else {
                      finalSharePrice = null; // Cannot calculate
                  }
              }

              // If an old stock price was found, update source/date/currency for info, but use calculated price
              if (stockPriceInfo && stockPriceInfo.share_price_source_actual === 'stock_prices_table_old') {
                  source = 'stock_prices_table_old';
                  // If we use calculated price, currencyActual should reflect that.
                  // If we were to display the old stock price, we'd use stockPriceInfo.share_price_currency_actual.
                  // For now, if source is old, the price is still the calculated one.
                  currencyActual = stockPriceInfo.share_price_currency_actual ?? currencyActual; 
                  dateActual = stockPriceInfo.share_price_date_actual ?? dateActual;
              }

              return {
                  ...company,
                  share_price: finalSharePrice,
                  share_price_source_actual: source,
                  share_price_currency_actual: currencyActual,
                  share_price_date_actual: dateActual,
              };
          }
      });
      
      console.log(`[FilterContext][Augment] Price augmentation logic applied. Output companies: ${augmentedCompanies.length}`);
      return augmentedCompanies;

    } catch (error) {
        console.error("[FilterContext][Augment] Exception during price augmentation process:", error);
        return companiesToAugment.map(company => ({ // Fallback on major error during augmentation
            ...company,
            share_price_source_actual: 'calculated_from_market_cap',
            share_price_currency_actual: company.financials?.market_cap_currency ?? (company as any).f_market_cap_currency ?? 'USD',
            share_price_date_actual: null,
        }));
    } finally {
        setLoadingPriceAugmentation(false);
    }
  }, [supabase]); // supabase is a stable dependency

  // Combined loading state for general UI feedback
  const loading = useMemo(() => 
    isSubscriptionLoading || 
    loadingRanges || 
    loadingFilteredSet || 
    loadingPaginated || 
    loadingPriceAugmentation,
  [isSubscriptionLoading, loadingRanges, loadingFilteredSet, loadingPaginated, loadingPriceAugmentation]);

  // Effect to fetch global metric ranges (min/max for all metrics)
  useEffect(() => {
    let mounted = true;
    const fetchFullRanges = async () => { 
        if (!mounted) return;
        setLoadingRanges(true); setError(null);
        console.log("[FilterContext] Fetching global metric ranges.");
        try {
            const { data, error: rpcError } = await fetchSupabaseRpcWithRetry('get_metrics_ranges');
            if (!mounted) return;
            if (rpcError) throw rpcError;
            setMetricFullRanges((data as Record<string, [number, number]>) ?? {});
            console.log("[FilterContext] Global metric ranges fetched successfully.");
        } catch (err: any) {
            if (!mounted) return;
            console.error("[FilterContext] Error fetching global metric ranges:", err.message);
            setError(`Failed to load metric ranges: ${err.message || 'Unknown error'}`);
            setMetricFullRanges({});
        } finally {
            if (mounted) setLoadingRanges(false);
        }
    };
    fetchFullRanges();
    return () => { mounted = false; };
  }, []); // Runs once on mount

  // Callback to build filters JSON for RPC calls
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

  // Callback to fetch initial dataset (filtered IDs and first page of data)
  const fetchFilteredSetAndFirstPage = useCallback(async (
    currentFilters: FilterSettings, currentSort: SortState, sizeForFirstPage: number,
    currency: Currency, tier: ColumnTier
  ) => {
    if (isSubscriptionLoading && !currentUserTier) {
      console.log('[FilterContext][InitialFetch] Skipping: Subscription/tier not ready.');
      setLoadingFilteredSet(false); setLoadingPaginated(false); return;
    }
    console.log(`[FilterContext][InitialFetch] Initiating fetch for Page 1 & All IDs. PageSize: ${sizeForFirstPage}, Sort: ${currentSort.key} ${currentSort.direction}, Filters:`, JSON.stringify(currentFilters));
    setLoadingFilteredSet(true); setLoadingPaginated(true); setError(null); // Set both true as this function does two things
    
    const filtersJson = buildFiltersJson(currentFilters);
    let fetchedTotalCount = 0; let firstPageItems: Company[] = EMPTY_COMPANY_ARRAY; let allMatchingIds: number[] = EMPTY_ID_ARRAY;

    try {
      // 1. Fetch first page of data
      const pageOneRpcParams = {
        page_num: 1, page_size: sizeForFirstPage, sort_column: currentSort.key,
        sort_direction: currentSort.direction, target_currency: currency, filters: filtersJson,
      };
      console.log("[FilterContext][InitialFetch] Calling RPC 'get_companies_paginated' for page 1 with params:", pageOneRpcParams);
      const { data: pageOneData, error: pageOneError } = await fetchSupabaseRpcWithRetry('get_companies_paginated', pageOneRpcParams);

      if (pageOneError) {
        console.error("[FilterContext][InitialFetch] Error from 'get_companies_paginated':", pageOneError);
        throw new Error(`Failed to fetch initial page: ${pageOneError.message || 'RPC error from get_companies_paginated'}`);
      }

      if (!pageOneData) {
        console.log('[FilterContext][InitialFetch] No data array returned from get_companies_paginated for page 1.');
        firstPageItems = EMPTY_COMPANY_ARRAY;
      } else if (pageOneData.length === 0) {
        console.log('[FilterContext][InitialFetch] get_companies_paginated returned 0 rows for page 1.');
        firstPageItems = EMPTY_COMPANY_ARRAY;
      } else {
        fetchedTotalCount = pageOneData[0]?.total_rows ?? 0; // Relies on total_rows from RPC
        if (typeof fetchedTotalCount !== 'number' || !isFinite(fetchedTotalCount)) {
            console.warn(`[FilterContext][InitialFetch] Invalid or missing total_rows in RPC response. Defaulting to length of received data. Response sample:`, pageOneData.slice(0,1));
            fetchedTotalCount = pageOneData.length; 
        }
        console.log(`[FilterContext][InitialFetch] 'get_companies_paginated' returned ${pageOneData.length} rows. Reported total_rows: ${fetchedTotalCount}`);
        let convertedItems = convertRpcRowsToCompanies(pageOneData as RpcResponseRow[]);
        console.log(`[FilterContext][InitialFetch] Converted to ${convertedItems.length} Company objects. Now augmenting prices...`);
        firstPageItems = await augmentCompaniesWithStockPrices(convertedItems);

        // Client-side re-sorting if share_price was the sort key, after augmentation
        if (currentSort.key === 'share_price') {
            console.log("[FilterContext][InitialFetch] Client-side re-sorting by 'share_price' after price augmentation.");
            firstPageItems.sort((a, b) => {
                const valA = a.share_price ?? (currentSort.direction === 'asc' ? Infinity : -Infinity); // Treat nulls as largest/smallest based on sort
                const valB = b.share_price ?? (currentSort.direction === 'asc' ? Infinity : -Infinity);
                return currentSort.direction === 'asc' ? valA - valB : valB - valA;
            });
        }
      }

      // 2. Fetch all filtered company IDs
      console.log("[FilterContext][InitialFetch] Fetching all filtered company IDs with filters:", filtersJson);
      const idRpcParams = { filters: filtersJson };
      const { data: idData, error: idError } = await fetchSupabaseRpcWithRetry('get_filtered_company_ids', idRpcParams);
      if (idError) {
          console.error("[FilterContext][InitialFetch] Error fetching filtered IDs:", idError);
          // Fallback: use IDs from the first page if ID fetch fails, total count might be less accurate
          allMatchingIds = firstPageItems.map(c => c.company_id); 
          if(fetchedTotalCount === 0 && firstPageItems.length > 0) fetchedTotalCount = firstPageItems.length; // Very rough estimate
      } else {
          allMatchingIds = (idData as { company_id: number }[] || []).map(r => r.company_id);
          console.log(`[FilterContext][InitialFetch] 'get_filtered_company_ids' returned ${allMatchingIds.length} IDs.`);
          // If paginated call returned 0 items but ID call found some, use ID call length for total.
          // This ensures totalCount reflects all possible items matching filters, not just page 1.
          if (fetchedTotalCount === 0 && allMatchingIds.length > 0) {
              fetchedTotalCount = allMatchingIds.length;
              console.log(`[FilterContext][InitialFetch] Updated totalCount to ${fetchedTotalCount} based on ID fetch, as paginated page 1 was empty.`);
          } else if (allMatchingIds.length !== fetchedTotalCount && Object.keys(filtersJson).length > 0) { 
            // Only reconcile if filters were applied. If no filters, paginated total_rows should be the source of truth for all items.
            console.warn(`[FilterContext][InitialFetch] Count Mismatch between paginated total_rows (${fetchedTotalCount}) and all filtered IDs count (${allMatchingIds.length}). Using all filtered IDs count for totalCount when filters are active.`);
            fetchedTotalCount = allMatchingIds.length;
          }
      }
      
      setTotalCount(fetchedTotalCount); 
      setDisplayData(firstPageItems); 
      setFilteredCompanyIds(allMatchingIds);
      lastFetchedPageRef.current = 1; // Mark page 1 as fetched
      console.log(`[FilterContext][InitialFetch] Fetch process completed. TotalCount: ${fetchedTotalCount}, Displaying: ${firstPageItems.length} (Page 1), AllFilteredIDs Count: ${allMatchingIds.length}`);

    } catch (err: any) {
      console.error('[FilterContext][InitialFetch] Critical error during fetchFilteredSetAndFirstPage:', err.message, err);
      setError(`Failed to fetch initial data: ${err.message || 'Unknown error'}`);
      setTotalCount(0); setDisplayData(EMPTY_COMPANY_ARRAY); setFilteredCompanyIds(EMPTY_ID_ARRAY);
    } finally {
      setLoadingFilteredSet(false); setLoadingPaginated(false); // Ensure both are reset
    }
  }, [buildFiltersJson, isSubscriptionLoading, currentUserTier, augmentCompaniesWithStockPrices]); // augmentCompaniesWithStockPrices is a dependency

  // --- Callback to fetch subsequent pages of data ---
  const fetchPaginatedDataOnly = useCallback(async (
    pageToFetch: number, sizeToFetch: number, currentSort: SortState,
    currentFilters: FilterSettings, currency: Currency, tier: ColumnTier
  ) => {
    if (pageToFetch <= 1) {
        // This case should ideally be caught by the calling useEffect logic, but as a safeguard:
        console.warn("[FilterContext][Paginate] Page 1 fetch attempted via fetchPaginatedDataOnly; this is typically handled by fetchFilteredSetAndFirstPage. Skipping.");
        return;
    }
    // Prevent concurrent fetches or fetching if critical data isn't ready
    if (loadingRanges || loadingFilteredSet || loadingPaginated || (isSubscriptionLoading && !currentUserTier) || loadingPriceAugmentation ) {
      console.log(`[FilterContext][Paginate] Skipping fetch for page ${pageToFetch} due to one or more active loading states.`);
      return;
    }
    setLoadingPaginated(true); setError(null);
    console.log(`[FilterContext][Paginate] Fetching Page Data: Page ${pageToFetch}, Size: ${sizeToFetch}, Tier: ${tier}, Sort: ${currentSort.key} ${currentSort.direction}`);
    const filtersJson = buildFiltersJson(currentFilters);
    const rpcParams = {
      page_num: pageToFetch, page_size: sizeToFetch, sort_column: currentSort.key,
      sort_direction: currentSort.direction, target_currency: currency, filters: filtersJson,
    };
    try {
      const { data, error: rpcError } = await fetchSupabaseRpcWithRetry('get_companies_paginated', rpcParams);
      if (rpcError) throw rpcError;
      
      let fetchedData = data ? convertRpcRowsToCompanies(data as RpcResponseRow[]) : EMPTY_COMPANY_ARRAY;
      console.log(`[FilterContext][Paginate] Received ${fetchedData.length} rows for page ${pageToFetch}. Augmenting prices...`);
      fetchedData = await augmentCompaniesWithStockPrices(fetchedData);

      // Client-side re-sorting if share_price was the sort key
      if (currentSort.key === 'share_price') {
        console.log("[FilterContext][Paginate] Client-side re-sorting by 'share_price' after price augmentation for paginated data.");
        fetchedData.sort((a, b) => {
            const valA = a.share_price ?? (currentSort.direction === 'asc' ? Infinity : -Infinity);
            const valB = b.share_price ?? (currentSort.direction === 'asc' ? Infinity : -Infinity);
            return currentSort.direction === 'asc' ? valA - valB : valB - valA;
        });
      }
      
      setDisplayData(fetchedData);
      // totalCount is primarily authoritative from fetchFilteredSetAndFirstPage. This is just a check.
      if (fetchedData.length > 0 && data[0]?.total_rows !== undefined && totalCount !== data[0].total_rows) {
        console.warn(`[FilterContext][Paginate] RPC total_rows (${data[0].total_rows}) for page ${pageToFetch} differs from context totalCount (${totalCount}). This can happen and is usually informational.`);
      }
      lastFetchedPageRef.current = pageToFetch; // Mark this page as fetched
      console.log(`[FilterContext][Paginate] Page ${pageToFetch} fetch complete. Displaying ${fetchedData.length} companies.`);
    } catch (err: any) {
      console.error(`[FilterContext][Paginate] Error fetching paginated data for page ${pageToFetch}:`, err.message, err);
      setError(`Data fetch failed for page ${pageToFetch}: ${err.message || 'Unknown error'}`);
      setDisplayData(EMPTY_COMPANY_ARRAY); // Clear display data on error for this page
    } finally {
      setLoadingPaginated(false);
    }
  }, [buildFiltersJson, totalCount, loadingRanges, loadingFilteredSet, loadingPaginated, isSubscriptionLoading, currentUserTier, augmentCompaniesWithStockPrices]);

  // --- Effects for orchestrating data fetches ---
  // Effect 1: Handles initial data load and re-fetches when primary filters, sort, page size, or tier change.
  useEffect(() => {
    if (loadingRanges || (isSubscriptionLoading && !currentUserTier)) {
      console.log(`[FilterContext][Effect1] Initial data load prerequisites not met (loadingRanges: ${loadingRanges}, isSubscriptionLoading: ${isSubscriptionLoading}, currentUserTier: ${!!currentUserTier}). Will wait.`);
      return;
    }
    console.log("[FilterContext][Effect1] Primary dependencies (filters, sort, pageSize, currency, tier) changed. Resetting to page 1 and fetching initial data and all IDs.");
    setCurrentPage(DEFAULT_PAGE); 
    lastFetchedPageRef.current = 0; // Reset to ensure page 1 logic runs in fetchFilteredSetAndFirstPage
    fetchFilteredSetAndFirstPage(filterSettings, sortState, pageSize, currentCurrency, currentUserTier);
  }, [filterSettings, currentCurrency, pageSize, sortState, currentUserTier, loadingRanges, isSubscriptionLoading, fetchFilteredSetAndFirstPage]);

  // Effect 2: Handles fetching data for subsequent page changes (i.e., when currentPage changes to something other than 1).
  useEffect(() => {
    if (currentPage === DEFAULT_PAGE) {
        // Page 1 data loading is handled by Effect 1 (via fetchFilteredSetAndFirstPage).
        // This effect is only for pages > 1.
        return;
    }
    if (lastFetchedPageRef.current === currentPage) {
        // Data for this page was already fetched (e.g. by Effect 1 if it was page 1, or by this effect itself previously).
        console.log(`[FilterContext][Effect2-Pagination] Data for page ${currentPage} already considered fetched (lastFetchedPageRef: ${lastFetchedPageRef.current}). Skipping.`);
        return;
    }
    if (loadingRanges || loadingFilteredSet || (isSubscriptionLoading && !currentUserTier) || loadingPaginated || loadingPriceAugmentation ) {
      console.log(`[FilterContext][Effect2-Pagination] Skipping fetch for page ${currentPage} due to other critical loading states.`);
      return;
    }
    console.log(`[FilterContext][Effect2-Pagination] CurrentPage changed to ${currentPage}. Fetching paginated data.`);
    fetchPaginatedDataOnly(currentPage, pageSize, sortState, filterSettings, currentCurrency, currentUserTier);
  }, [currentPage, pageSize, sortState, filterSettings, currentCurrency, currentUserTier, loadingRanges, loadingFilteredSet, isSubscriptionLoading, loadingPaginated, loadingPriceAugmentation, fetchPaginatedDataOnly]);

  // --- Callback to fetch specific companies by IDs (e.g., for Scoring Page) ---
  const fetchCompaniesByIds = useCallback(async (ids: number[]): Promise<Company[]> => {
    if (!Array.isArray(ids) || ids.length === 0) {
      console.log("[FilterContext] fetchCompaniesByIds: No IDs provided, returning empty array.");
      return EMPTY_COMPANY_ARRAY;
    }
    console.log(`[FilterContext] fetchCompaniesByIds: Request to fetch details for ${ids.length} companies. Sample IDs: ${ids.slice(0,3).join(', ')}`);
    setError(null); 
    setLoadingPriceAugmentation(true); // Use this to indicate a fetch operation that includes augmentation

    try {
      const { data, error: viewError } = await supabase
        .from('companies_detailed_view') // Assumes this view provides all necessary base fields
        .select('*')
        .in('company_id', ids);

      if (viewError) {
        console.error('[FilterContext] fetchCompaniesByIds: Error fetching from companies_detailed_view:', viewError);
        throw viewError;
      }
      if (data === null) {
        console.log("[FilterContext] fetchCompaniesByIds: No data returned from companies_detailed_view for IDs:", ids);
        return EMPTY_COMPANY_ARRAY;
      }
      
      let initialCompanyData = convertRpcRowsToCompanies(data as RpcResponseRow[]);
      console.log(`[FilterContext] fetchCompaniesByIds: Fetched ${initialCompanyData.length} initial records. Augmenting prices...`);
      const augmentedCompanyData = await augmentCompaniesWithStockPrices(initialCompanyData);
      
      console.log(`[FilterContext] fetchCompaniesByIds: Successfully fetched and augmented ${augmentedCompanyData.length} companies.`);
      return augmentedCompanyData;

    } catch (err: any) {
      console.error('[FilterContext] fetchCompaniesByIds: Critical error:', err);
      setError(`Failed to load detailed company data by IDs: ${err.message || 'Unknown error'}`);
      return EMPTY_COMPANY_ARRAY;
    } finally {
        setLoadingPriceAugmentation(false); // Ensure this is reset
    }
  }, [supabase, augmentCompaniesWithStockPrices]); // supabase is stable, augmentCompaniesWithStockPrices is memoized


  // --- Setter Callbacks for Filters and Pagination ---
  const handleSetDevelopmentStatus = useCallback((statuses: CompanyStatus[]) => {
    console.log("[FilterContext] Setting Development Status Filter:", statuses);
    setFilterSettings(prev => ({ ...prev, developmentStatus: statuses }));
  }, []);
  const handleSetMetricRange = useCallback((db_column: string, min: number | null, max: number | null) => {
    console.log(`[FilterContext] Setting Metric Range for ${db_column}: [${min}, ${max}]`);
    setFilterSettings(prev => ({ ...prev, metricRanges: { ...prev.metricRanges, [db_column]: [min, max] } }));
  }, []);
  const handleSetSearchTerm = useCallback((term: string) => {
    console.log(`[FilterContext] Setting Search Term: "${term}"`);
    setFilterSettings(prev => ({ ...prev, searchTerm: term }));
  }, []);
  const handleResetFilters = useCallback(() => {
    console.log("[FilterContext] Resetting all filters to default.");
    setFilterSettings(DEFAULT_FILTER_SETTINGS);
    setSortState(DEFAULT_SORT_STATE);
    setExcludedCompanyIds(EMPTY_SET);
    setPageSizeState(DEFAULT_PAGE_SIZE);
    // setCurrentPage(DEFAULT_PAGE); // This will be triggered by the useEffect watching filterSettings
  }, []);
  const handleToggleCompanyExclusion = useCallback((companyId: number) => {
    setExcludedCompanyIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(companyId)) {
        newSet.delete(companyId);
        console.log(`[FilterContext] Company ID ${companyId} REMOVED from exclusions.`);
      } else {
        newSet.add(companyId);
        console.log(`[FilterContext] Company ID ${companyId} ADDED to exclusions.`);
      }
      return newSet;
    });
  }, []);
  const handleSetSort = useCallback((newSortState: SortState) => {
    if (newSortState.key !== sortState.key || newSortState.direction !== sortState.direction) {
        console.log(`[FilterContext] Sort state changing to: Key=${newSortState.key}, Direction=${newSortState.direction}`);
        setSortState(newSortState);
        // setCurrentPage(DEFAULT_PAGE); // Let main effect handle this
    }
  }, [sortState]);
  
  // handleSetPage uses effectiveTotalCount. Ensure effectiveTotalCount is defined before this.
  const handleSetPage = useCallback((page: number) => {
    const maxPage = Math.max(1, Math.ceil(effectiveTotalCount / pageSize)); 
    const validPage = Math.max(1, Math.min(page, maxPage));
    if (validPage !== currentPage) {
        console.log(`[FilterContext] Page changing from ${currentPage} to ${validPage}.`);
        setCurrentPage(validPage); // This will trigger Effect2 if page > 1
    } else if (page !== validPage) { 
        console.log(`[FilterContext] Requested page ${page} is out of bounds (1-${maxPage}). Current page ${currentPage} remains.`);
    }
  }, [currentPage, effectiveTotalCount, pageSize]); // effectiveTotalCount is a dependency

  const handleSetPageSize = useCallback((size: number) => {
    if (pageSizeOptions.includes(size) && size !== pageSize) {
        console.log(`[FilterContext] Page size changing to: ${size}`);
        setPageSizeState(size);
        // setCurrentPage(DEFAULT_PAGE); // Let main effect handle this
    }
  }, [pageSize]);
  const handleSetCurrentCurrency = useCallback((currency: Currency) => {
    if (currency !== currentCurrency) {
        console.log(`[FilterContext] Currency changing to: ${currency}`);
        setCurrentCurrencyState(currency);
    }
  }, [currentCurrency]);
  const getMetricConfigByDbColumn = useCallback((db_column: string): MetricConfig | undefined => allMetricConfigs.find(m => m.db_column === db_column || m.key === db_column || m.nested_path === db_column), []);


  // --- Context Value Memoization ---
  // This must be defined AFTER all its constituent parts (states, memoized values, callbacks) are defined.
  const value = useMemo<FilterContextType>(() => ({
    currentUserTier, currentCurrency, filterSettings, metricFullRanges, displayData, totalCount,
    effectiveTotalCount, // Ensure this is the memoized effectiveTotalCount from above
    filteredCompanyIds, excludedCompanyIds, toggleCompanyExclusion: handleToggleCompanyExclusion,
    loadingPaginated, loadingRanges, loadingFilteredSet, loadingPriceAugmentation, loading, error, 
    setCurrentCurrency: handleSetCurrentCurrency,
    setDevelopmentStatusFilter: handleSetDevelopmentStatus, setMetricRange: handleSetMetricRange,
    setSearchTerm: handleSetSearchTerm, resetFilters: handleResetFilters, getMetricConfigByDbColumn,
    sortState, currentPage, pageSize, setSort: handleSetSort, setPage: handleSetPage,
    setPageSize: handleSetPageSize, fetchCompaniesByIds,
  }), [
    currentUserTier, currentCurrency, filterSettings, metricFullRanges, displayData, totalCount, 
    effectiveTotalCount, // Crucial: this must be the memoized state, not a function call
    filteredCompanyIds, excludedCompanyIds, handleToggleCompanyExclusion, loadingPaginated, loadingRanges,
    loadingFilteredSet, loadingPriceAugmentation, loading, error, handleSetCurrentCurrency, handleSetDevelopmentStatus, handleSetMetricRange,
    handleSetSearchTerm, handleResetFilters, getMetricConfigByDbColumn, sortState, currentPage, pageSize,
    handleSetSort, handleSetPage, handleSetPageSize, fetchCompaniesByIds
  ]);

  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>;
};

// --- Custom Hook to Consume Context ---
export const useFilters = (): FilterContextType => {
  const context = useContext(FilterContext);
  if (context === undefined) {
    console.error("useFilters must be used within a FilterProvider. Make sure your component tree is correctly wrapped.");
    throw new Error('useFilters must be used within a FilterProvider.');
  }
  return context;
};