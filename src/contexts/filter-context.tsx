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
// Import the updated Company type and new AugmentedPriceInfo type from your types file
import type { 
    Company, // This is your extended Company type from types.ts
    AugmentedPriceInfo, // This is also from types.ts now
    RpcResponseRow, 
    CompanyStatus, 
    ColumnTier, 
    Currency, 
    SortState, 
    FilterSettings, 
    MetricConfig 
} from '../lib/types'; // Ensure this path is correct
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

// FilterContextType Definition (includes new loading state)
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

// Defaults
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
      if (error) {
        console.warn(`[FilterContext] Network error during RPC '${rpcName}', retrying...`, error);
        return true;
      }
      if (response && response.error) {
        const supaError = response.error;
        console.warn(`[FilterContext] Supabase RPC '${rpcName}' returned error (status ${response.status}, code: ${supaError.code}), retrying...:`, supaError.message);
        if (response.status === 404 && (supaError.code === 'PGRST200' || supaError.message.toLowerCase().includes('function not found'))) {
          console.error(`[FilterContext] RPC function '${rpcName}' not found. Not retrying.`);
          return false;
        }
        return true;
      }
      return false;
    },
  });

  try {
    const result = await retryingFetch();
    return result as { data: any; error: any };
  } catch (error: any) {
    console.error(`[FilterContext] Unhandled exception during retry for RPC '${rpcName}':`, error);
    return { data: null, error: error instanceof Error ? error : new Error(String(error.message || `Unknown RPC error with ${rpcName} after retries`)) };
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

  // --- Helper function to augment companies with latest stock prices ---
  const augmentCompaniesWithStockPrices = useCallback(async (companiesToAugment: Company[]): Promise<Company[]> => {
    if (!companiesToAugment || companiesToAugment.length === 0) {
        console.log("[FilterContext][Augment] No companies provided to augment.");
        return companiesToAugment;
    }

    const companyIds = companiesToAugment.map(c => c.company_id).filter(id => id != null && typeof id === 'number') as number[];
    if (companyIds.length === 0) {
        console.log("[FilterContext][Augment] No valid company IDs found in the provided companies list.");
        return companiesToAugment;
    }

    console.log(`[FilterContext][Augment] Attempting to augment prices for ${companyIds.length} companies. IDs (sample): ${companyIds.slice(0,3).join(', ')}`);
    setLoadingPriceAugmentation(true);

    try {
        const { data: rpcStockPriceData, error: stockPriceError } = await supabase.rpc('get_latest_stock_prices', {
            company_ids_array: companyIds,
        });

        if (stockPriceError) {
            console.error("[FilterContext][Augment] Error fetching latest stock prices from RPC 'get_latest_stock_prices':", stockPriceError.message, stockPriceError);
            // Return original data, marking that fallback was used
            return companiesToAugment.map(company => ({
                ...company,
                share_price: company.share_price, // Keep original calculated price
                share_price_source_actual: 'calculated_from_market_cap',
                share_price_currency_actual: company.financials?.market_cap_currency ?? (company as any).f_market_cap_currency ?? 'USD', // Assuming f_market_cap_currency if financials not populated by converter
                share_price_date_actual: null,
            }));
        }
        
        const stockPriceData = rpcStockPriceData as FetchedStockPrice[] | null; // Cast RPC response
        const priceMap = new Map<number, AugmentedPriceInfo & { latest_price_value?: number | null }>(); // Store fetched prices
        
        if (stockPriceData) {
            console.log(`[FilterContext][Augment] Received ${stockPriceData.length} stock price entries from RPC.`);
            stockPriceData.forEach(sp => {
                if (sp.latest_price_date && isValidNumber(sp.latest_price_value)) { // Price value must be valid
                    const priceDate = new Date(sp.latest_price_date);
                    const roughlyOneWeekAgo = new Date();
                    roughlyOneWeekAgo.setDate(roughlyOneWeekAgo.getDate() - 7); // "Roughly a week" old is the cutoff
                    // Ensure date objects are valid before comparison
                    if (!isNaN(priceDate.getTime()) && !isNaN(roughlyOneWeekAgo.getTime())) {
                        if (priceDate >= roughlyOneWeekAgo) {
                            // Price is recent and valid
                            priceMap.set(sp.company_id, {
                                latest_price_value: sp.latest_price_value,
                                share_price_currency_actual: sp.latest_price_currency,
                                share_price_date_actual: sp.latest_price_date, // Keep as ISO string from RPC
                                share_price_source_actual: 'stock_prices_table',
                            });
                        } else {
                            // Price is valid but older than a week
                            console.log(`[FilterContext][Augment] Stock price for company ${sp.company_id} (date: ${sp.latest_price_date}) is valid but older than ~7 days.`);
                            priceMap.set(sp.company_id, {
                                latest_price_value: sp.latest_price_value, // Store it anyway for info if needed, but mark as old
                                share_price_currency_actual: sp.latest_price_currency,
                                share_price_date_actual: sp.latest_price_date,
                                share_price_source_actual: 'stock_prices_table_old',
                            });
                        }
                    } else {
                        console.warn(`[FilterContext][Augment] Invalid date encountered for company ${sp.company_id}, price data:`, sp);
                    }
                } else {
                     console.log(`[FilterContext][Augment] Stock price entry for company ${sp.company_id} skipped (missing date or invalid price value in RPC response).`);
                }
            });
        } else {
            console.log("[FilterContext][Augment] No stock price data returned from RPC call.");
        }

        // Map over original companies and augment them
        const augmentedCompanies = companiesToAugment.map(company => {
            const stockPriceInfo = priceMap.get(company.company_id);
            
            // Priority 1: Recent price from stock_prices table
            if (stockPriceInfo && stockPriceInfo.share_price_source_actual === 'stock_prices_table' && isValidNumber(stockPriceInfo.latest_price_value)) {
                if (company.company_id === B2GOLD_ID) console.log(`[B2GOLD_ID_TRACE][Augment] B2Gold (ID ${B2GOLD_ID}) using recent stock_prices_table value: ${stockPriceInfo.latest_price_value}`);
                return {
                    ...company,
                    share_price: stockPriceInfo.latest_price_value,
                    share_price_currency_actual: stockPriceInfo.share_price_currency_actual,
                    share_price_date_actual: stockPriceInfo.share_price_date_actual,
                    share_price_source_actual: 'stock_prices_table',
                };
            }
            
            // Fallback: Use the share_price already present on the Company object
            // This share_price would have come from the companies_detailed_view (calculated or otherwise)
            // and transformed by convertRpcRowsToCompanies.
            // If it's null, we try one more time to calculate if source data is available on the Company object.
            let finalSharePrice = company.share_price;
            let source = company.share_price_source_actual || 'calculated_from_market_cap'; // Default if no source yet
            let currencyActual = company.share_price_currency_actual;
            let dateActual = company.share_price_date_actual;

            if (!isValidNumber(finalSharePrice)) { // If existing share_price is null or invalid
                const marketCap = company.financials?.market_cap_value;
                const existingShares = company.capital_structure?.existing_shares;
                if (isValidNumber(marketCap) && isValidNumber(existingShares) && existingShares > 0) {
                    finalSharePrice = marketCap / existingShares;
                    source = 'calculated_from_market_cap'; // Recalculated now
                    currencyActual = company.financials?.market_cap_currency ?? 'USD'; // Prefer market cap currency
                    dateActual = null; // No specific date for this calculation
                     if (company.company_id === B2GOLD_ID) console.log(`[B2GOLD_ID_TRACE][Augment] B2Gold (ID ${B2GOLD_ID}) had no recent stock_prices, used calculated value: ${finalSharePrice}`);
                } else {
                    if (company.company_id === B2GOLD_ID) console.log(`[B2GOLD_ID_TRACE][Augment] B2Gold (ID ${B2GOLD_ID}) had no recent stock_prices AND no data for calculation. Share price remains: ${finalSharePrice}`);
                }
            } else {
                 if (company.company_id === B2GOLD_ID) console.log(`[B2GOLD_ID_TRACE][Augment] B2Gold (ID ${B2GOLD_ID}) using its existing share_price from initial load (likely calculated): ${finalSharePrice}`);
            }
            
            // If stockPriceInfo indicates an old price, use its date/currency for info, but price is already determined
            if (stockPriceInfo && stockPriceInfo.share_price_source_actual === 'stock_prices_table_old') {
                source = 'stock_prices_table_old';
                currencyActual = stockPriceInfo.share_price_currency_actual ?? currencyActual; // Prefer old stock price currency if available
                dateActual = stockPriceInfo.share_price_date_actual ?? dateActual;
            }


            return {
                ...company,
                share_price: finalSharePrice,
                share_price_source_actual: source,
                share_price_currency_actual: currencyActual,
                share_price_date_actual: dateActual,
            };
        });
        
        console.log(`[FilterContext][Augment] Price augmentation logic applied. Returning ${augmentedCompanies.length} companies.`);
        return augmentedCompanies;

    } catch (error) {
        console.error("[FilterContext][Augment] Exception during price augmentation process:", error);
        // On major error, return original companies but mark as calculated
        return companiesToAugment.map(company => ({
            ...company,
            share_price_source_actual: 'calculated_from_market_cap',
            share_price_currency_actual: company.financials?.market_cap_currency ?? (company as any).f_market_cap_currency ?? 'USD',
            share_price_date_actual: null,
        }));
    } finally {
        setLoadingPriceAugmentation(false);
    }
  }, [supabase, B2GOLD_ID]); // Added B2GOLD_ID here so the log inside can access it

  // Combined loading state
  const loading = useMemo(() => isSubscriptionLoading || loadingRanges || loadingFilteredSet || loadingPaginated || loadingPriceAugmentation,
    [isSubscriptionLoading, loadingRanges, loadingFilteredSet, loadingPaginated, loadingPriceAugmentation]);

  // Effect to fetch global metric ranges
  useEffect(() => {
    let mounted = true;
    const fetchFullRanges = async () => { /* ... (same as your existing, ensure no issues) ... */ 
        if (!mounted) return;
        setLoadingRanges(true); setError(null);
        try {
            const { data, error: rpcError } = await fetchSupabaseRpcWithRetry('get_metrics_ranges');
            if (!mounted) return;
            if (rpcError) throw rpcError;
            setMetricFullRanges((data as Record<string, [number, number]>) ?? {});
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
    return () => { mounted = false; };
  }, []);

  // Function to build JSON for RPC filters
  const buildFiltersJson = useCallback((settings: FilterSettings): Record<string, any> => { /* ... (same as your existing) ... */ 
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

  // --- Data Fetching Functions (Modified to include augmentation) ---
  const fetchFilteredSetAndFirstPage = useCallback(async (
    currentFilters: FilterSettings, currentSort: SortState, sizeForFirstPage: number,
    currency: Currency, tier: ColumnTier
  ) => {
    if (isSubscriptionLoading && !currentUserTier) {
      console.log('[FilterContext][InitialFetch] Subscription loading or tier unavailable, delaying initial data fetch.');
      setLoadingFilteredSet(false); setLoadingPaginated(false); return;
    }
    console.log(`[FilterContext][InitialFetch] Fetching Full Filtered Set & Page 1. PageSize: ${sizeForFirstPage}, Tier: ${tier}, Sort: ${currentSort.key} ${currentSort.direction}`);
    setLoadingFilteredSet(true); setLoadingPaginated(true); setError(null);
    
    const filtersJson = buildFiltersJson(currentFilters);
    let fetchedTotalCount = 0; let firstPageItems: Company[] = EMPTY_COMPANY_ARRAY; let allMatchingIds: number[] = EMPTY_ID_ARRAY;

    try {
      const pageOneRpcParams = {
        page_num: 1, page_size: sizeForFirstPage, sort_column: currentSort.key,
        sort_direction: currentSort.direction, target_currency: currency, filters: filtersJson,
      };
      console.log("[FilterContext][InitialFetch] Calling get_companies_paginated with params:", pageOneRpcParams);
      const { data: pageOneData, error: pageOneError } = await fetchSupabaseRpcWithRetry('get_companies_paginated', pageOneRpcParams);

      if (pageOneError) {
        console.error("[FilterContext][InitialFetch] Error from get_companies_paginated:", pageOneError);
        throw new Error(`Failed to fetch initial page: ${pageOneError.message || 'RPC error'}`);
      }

      if (!pageOneData || pageOneData.length === 0) {
        console.log('[FilterContext][InitialFetch] No data returned from get_companies_paginated for initial page.');
        fetchedTotalCount = 0; 
        firstPageItems = EMPTY_COMPANY_ARRAY;
      } else {
        const rpcTotalRows = pageOneData[0]?.total_rows;
        if (typeof rpcTotalRows !== 'number' || !isFinite(rpcTotalRows)) {
            console.warn("[FilterContext][InitialFetch] Invalid or missing total_rows in RPC response. Response sample:", pageOneData.slice(0,1));
        } else {
            fetchedTotalCount = rpcTotalRows;
        }
        console.log(`[FilterContext][InitialFetch] get_companies_paginated returned ${pageOneData.length} rows. Reported total_rows: ${fetchedTotalCount}`);
        let convertedItems = convertRpcRowsToCompanies(pageOneData as RpcResponseRow[]);
        console.log(`[FilterContext][InitialFetch] Converted to ${convertedItems.length} Company objects. Augmenting prices...`);
        firstPageItems = await augmentCompaniesWithStockPrices(convertedItems);

        if (currentSort.key === 'share_price') {
            console.log("[FilterContext][InitialFetch] Client-side re-sorting by share_price after augmentation.");
            firstPageItems.sort((a, b) => {
                const valA = a.share_price ?? (currentSort.direction === 'asc' ? Infinity : -Infinity);
                const valB = b.share_price ?? (currentSort.direction === 'asc' ? Infinity : -Infinity);
                return currentSort.direction === 'asc' ? valA - valB : valB - valA;
            });
        }
      }

      console.log("[FilterContext][InitialFetch] Fetching all filtered company IDs with filters:", filtersJson);
      const idRpcParams = { filters: filtersJson };
      const { data: idData, error: idError } = await fetchSupabaseRpcWithRetry('get_filtered_company_ids', idRpcParams);
      if (idError) {
          console.error("[FilterContext][InitialFetch] Error fetching filtered IDs:", idError);
          allMatchingIds = firstPageItems.map(c => c.company_id); 
          if(fetchedTotalCount === 0 && firstPageItems.length > 0) fetchedTotalCount = firstPageItems.length;
      } else {
          allMatchingIds = (idData as { company_id: number }[] || []).map(r => r.company_id);
          console.log(`[FilterContext][InitialFetch] get_filtered_company_ids returned ${allMatchingIds.length} IDs.`);
          if (fetchedTotalCount === 0 && allMatchingIds.length > 0) {
              fetchedTotalCount = allMatchingIds.length;
          } else if (allMatchingIds.length !== fetchedTotalCount && fetchedTotalCount > 0 && Object.keys(filtersJson).length > 0) {
            console.warn(`[FilterContext][InitialFetch] Count Mismatch: Paginated total (${fetchedTotalCount}) vs. IDs RPC total (${allMatchingIds.length}). Using IDs RPC total for consistency.`);
            fetchedTotalCount = allMatchingIds.length;
          }
      }
      
      setTotalCount(fetchedTotalCount); 
      setDisplayData(firstPageItems); 
      setFilteredCompanyIds(allMatchingIds);
      lastFetchedPageRef.current = 1;
      console.log(`[FilterContext][InitialFetch] Completed. TotalCount: ${fetchedTotalCount}, Displaying: ${firstPageItems.length}, AllFilteredIDs: ${allMatchingIds.length}`);

    } catch (err: any) {
      console.error('[FilterContext][InitialFetch] Critical error during fetchFilteredSetAndFirstPage:', err.message, err);
      setError(`Failed to fetch initial data: ${err.message || 'Unknown error'}`);
      setTotalCount(0); setDisplayData(EMPTY_COMPANY_ARRAY); setFilteredCompanyIds(EMPTY_ID_ARRAY);
    } finally {
      setLoadingFilteredSet(false); setLoadingPaginated(false);
    }
  }, [buildFiltersJson, isSubscriptionLoading, currentUserTier, augmentCompaniesWithStockPrices]);

  const fetchPaginatedDataOnly = useCallback(async (
    pageToFetch: number, sizeToFetch: number, currentSort: SortState,
    currentFilters: FilterSettings, currency: Currency, tier: ColumnTier
  ) => {
    if (pageToFetch <= 1) {
        console.log("[FilterContext][Paginate] Page 1 fetch attempted via fetchPaginatedDataOnly, should be handled by fetchFilteredSetAndFirstPage. Skipping.");
        return;
    }
    if (loadingRanges || loadingFilteredSet || loadingPaginated || (isSubscriptionLoading && !currentUserTier) || loadingPriceAugmentation ) {
      console.log(`[FilterContext][Paginate] Skipping Fetch for page ${pageToFetch} due to other active loading state(s).`);
      return;
    }
    setLoadingPaginated(true); setError(null);
    console.log(`[FilterContext][Paginate] Fetching Page Data: Page ${pageToFetch}, Size: ${sizeToFetch}, Tier: ${tier}, Sort: ${currentSort.key}`);
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

      if (currentSort.key === 'share_price') {
        console.log("[FilterContext][Paginate] Client-side re-sorting by share_price after augmentation for paginated data.");
        fetchedData.sort((a, b) => {
            const valA = a.share_price ?? (currentSort.direction === 'asc' ? Infinity : -Infinity);
            const valB = b.share_price ?? (currentSort.direction === 'asc' ? Infinity : -Infinity);
            return currentSort.direction === 'asc' ? valA - valB : valB - valA;
        });
      }
      
      setDisplayData(fetchedData);
      if (fetchedData.length > 0 && data[0]?.total_rows !== undefined && totalCount !== data[0].total_rows) {
        console.warn(`[FilterContext][Paginate] RPC total_rows (${data[0].total_rows}) differs from context totalCount (${totalCount}).`);
      }
      lastFetchedPageRef.current = pageToFetch;
      console.log(`[FilterContext][Paginate] Page ${pageToFetch} fetch complete. Displaying ${fetchedData.length} companies.`);
    } catch (err: any) {
      console.error(`[FilterContext][Paginate] Error fetching paginated data (page ${pageToFetch}):`, err.message, err);
      setError(`Data fetch failed for page ${pageToFetch}: ${err.message || 'Unknown error'}`);
      setDisplayData(EMPTY_COMPANY_ARRAY);
    } finally {
      setLoadingPaginated(false);
    }
  }, [buildFiltersJson, totalCount, loadingRanges, loadingFilteredSet, loadingPaginated, isSubscriptionLoading, currentUserTier, augmentCompaniesWithStockPrices]);

  // --- Effects for orchestrating data fetches ---
  useEffect(() => {
    if (loadingRanges || (isSubscriptionLoading && !currentUserTier)) {
      console.log(`[FilterContext][Effect1] Initial data fetch prerequisites not met (loadingRanges: ${loadingRanges}, isSubscriptionLoading: ${isSubscriptionLoading}, currentUserTier: ${!!currentUserTier}).`);
      return;
    }
    console.log("[FilterContext][Effect1] Primary dependencies changed. Resetting to page 1 and fetching initial data and all IDs.");
    setCurrentPage(DEFAULT_PAGE); 
    lastFetchedPageRef.current = 0;
    fetchFilteredSetAndFirstPage(filterSettings, sortState, pageSize, currentCurrency, currentUserTier);
  }, [filterSettings, currentCurrency, pageSize, sortState, currentUserTier, loadingRanges, isSubscriptionLoading, fetchFilteredSetAndFirstPage]);

  useEffect(() => {
    if (currentPage === DEFAULT_PAGE || lastFetchedPageRef.current === currentPage) {
        return;
    }
    if (loadingRanges || loadingFilteredSet || (isSubscriptionLoading && !currentUserTier) || loadingPaginated || loadingPriceAugmentation ) {
      console.log(`[FilterContext][Effect2-Pagination] Skipping fetch for page ${currentPage} due to other active loading states.`);
      return;
    }
    console.log(`[FilterContext][Effect2-Pagination] CurrentPage changed to ${currentPage}. Fetching paginated data.`);
    fetchPaginatedDataOnly(currentPage, pageSize, sortState, filterSettings, currentCurrency, currentUserTier);
  }, [currentPage]); // Simplified dependencies: only currentPage triggers this specific pagination effect

  const fetchCompaniesByIds = useCallback(async (ids: number[]): Promise<Company[]> => {
    if (!Array.isArray(ids) || ids.length === 0) {
      console.log("[FilterContext] fetchCompaniesByIds: No IDs provided.");
      return EMPTY_COMPANY_ARRAY;
    }
    console.log(`[FilterContext] fetchCompaniesByIds: Fetching details for ${ids.length} companies from view 'companies_detailed_view'.`);
    setError(null); 
    setLoadingPriceAugmentation(true); // Indicate process involving augmentation is starting

    try {
      const { data, error: viewError } = await supabase
        .from('companies_detailed_view')
        .select('*')
        .in('company_id', ids);

      if (viewError) {
        console.error('[FilterContext] fetchCompaniesByIds: Error fetching from companies_detailed_view:', viewError);
        throw viewError;
      }
      if (data === null) {
        console.log("[FilterContext] fetchCompaniesByIds: No data from companies_detailed_view for IDs:", ids);
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
        setLoadingPriceAugmentation(false);
    }
  }, [supabase, augmentCompaniesWithStockPrices]);


  // --- Setter Functions ---
  const handleSetDevelopmentStatus = useCallback((statuses: CompanyStatus[]) => setFilterSettings(prev => ({ ...prev, developmentStatus: statuses })), []);
  const handleSetMetricRange = useCallback((db_column: string, min: number | null, max: number | null) => setFilterSettings(prev => ({ ...prev, metricRanges: { ...prev.metricRanges, [db_column]: [min, max] } })), []);
  const handleSetSearchTerm = useCallback((term: string) => setFilterSettings(prev => ({ ...prev, searchTerm: term })), []);
  const handleResetFilters = useCallback(() => {
    console.log("[FilterContext] Resetting filters to default.");
    setFilterSettings(DEFAULT_FILTER_SETTINGS);
    setSortState(DEFAULT_SORT_STATE);
    setExcludedCompanyIds(EMPTY_SET);
    setPageSizeState(DEFAULT_PAGE_SIZE);
    // setCurrentPage(DEFAULT_PAGE); // The main useEffect for filterSettings will handle this
  }, []);
  const handleToggleCompanyExclusion = useCallback((companyId: number) => {
    setExcludedCompanyIds(prev => {
      const newSet = new Set(prev);
      newSet.has(companyId) ? newSet.delete(companyId) : newSet.add(companyId);
      console.log(`[FilterContext] Toggled exclusion for company ID ${companyId}. New excluded count: ${newSet.size}`);
      return newSet;
    });
  }, []);
  const handleSetSort = useCallback((newSortState: SortState) => {
    if (newSortState.key !== sortState.key || newSortState.direction !== sortState.direction) {
        console.log(`[FilterContext] Sort state changed to: Key=${newSortState.key}, Direction=${newSortState.direction}`);
        setSortState(newSortState);
    }
  }, [sortState]);
  const handleSetPage = useCallback((page: number) => {
    const maxPage = Math.max(1, Math.ceil(effectiveTotalCount / pageSize));
    const validPage = Math.max(1, Math.min(page, maxPage));
    if (validPage !== currentPage) {
        console.log(`[FilterContext] Page changed from ${currentPage} to ${validPage}.`);
        setCurrentPage(validPage);
    } else if (page !== validPage) {
        console.log(`[FilterContext] Requested page ${page} is out of bounds (1-${maxPage}). Staying on page ${currentPage}.`);
    }
  }, [currentPage, effectiveTotalCount, pageSize]);
  const handleSetPageSize = useCallback((size: number) => {
    if (pageSizeOptions.includes(size) && size !== pageSize) {
        console.log(`[FilterContext] Page size changed to: ${size}`);
        setPageSizeState(size);
    }
  }, [pageSize]);
  const handleSetCurrentCurrency = useCallback((currency: Currency) => {
    if (currency !== currentCurrency) {
        console.log(`[FilterContext] Currency changed to: ${currency}`);
        setCurrentCurrencyState(currency);
    }
  }, [currentCurrency]);
  const getMetricConfigByDbColumn = useCallback((db_column: string): MetricConfig | undefined => allMetricConfigs.find(m => m.db_column === db_column || m.key === db_column || m.nested_path === db_column), []);


  const value = useMemo<FilterContextType>(() => ({
    currentUserTier, currentCurrency, filterSettings, metricFullRanges, displayData, totalCount,
    effectiveTotalCount, filteredCompanyIds, excludedCompanyIds, toggleCompanyExclusion: handleToggleCompanyExclusion,
    loadingPaginated, loadingRanges, loadingFilteredSet, loadingPriceAugmentation, loading, error, 
    setCurrentCurrency: handleSetCurrentCurrency,
    setDevelopmentStatusFilter: handleSetDevelopmentStatus, setMetricRange: handleSetMetricRange,
    setSearchTerm: handleSetSearchTerm, resetFilters: handleResetFilters, getMetricConfigByDbColumn,
    sortState, currentPage, pageSize, setSort: handleSetSort, setPage: handleSetPage,
    setPageSize: handleSetPageSize, fetchCompaniesByIds,
  }), [
    currentUserTier, currentCurrency, filterSettings, metricFullRanges, displayData, totalCount, effectiveTotalCount,
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