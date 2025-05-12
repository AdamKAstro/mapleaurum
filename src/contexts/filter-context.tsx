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
import type { Company, RpcResponseRow, CompanyStatus, ColumnTier, Currency, SortState, FilterSettings, MetricConfig } from '../lib/types'; // Removed SubscriptionTier import as it's not directly used here
import { supabase } from '../lib/supabaseClient';
import { convertRpcRowsToCompanies } from '../lib/converters';
import { metrics as allMetricConfigs } from '../lib/metric-types';
import { isValidNumber } from '../lib/utils';
import { useSubscription } from './subscription-context';
import origFetchRetry from 'fetch-retry'; // Use default import

// --- State Types ---
interface MetricRanges { [db_column: string]: [number | null, number | null]; }
interface MetricFullRanges { [db_column: string]: [number, number]; }

// --- Context Type ---
interface FilterContextType {
  currentUserTier: ColumnTier;
  currentCurrency: Currency;
  filterSettings: FilterSettings;
  metricFullRanges: MetricFullRanges;
  displayData: Company[];
  totalCount: number;
  effectiveTotalCount: number;
  filteredCompanyIds: number[];
  excludedCompanyIds: Set<number>;
  toggleCompanyExclusion: (companyId: number) => void;
  loadingPaginated: boolean;
  loadingRanges: boolean;
  loadingFilteredSet: boolean;
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
const EMPTY_ARRAY: Company[] = [];
const EMPTY_ID_ARRAY: number[] = [];
const EMPTY_SET = new Set<number>();

// Helper for fetchRetry with Supabase RPC
const fetchSupabaseRpcWithRetry = async (
    rpcName: string,
    rpcParams?: Record<string, any>,
    retryOptions?: { retries?: number; retryDelay?: (attempt: number) => number }
) => {
    const defaultRetryOptions = {
        retries: 3,
        retryDelay: (attempt: number) => Math.pow(2, attempt) * 1000, // 1s, 2s, 4s
    };
    const options = { ...defaultRetryOptions, ...retryOptions };

    // fetch-retry expects a function that returns a Promise resolving to a Response-like object or a value.
    // supabase.rpc returns a Promise<{ data, error, ... }>
    // We need a custom retryOn function.
    const fetcher = () => supabase.rpc(rpcName, rpcParams);

    const retryingFetch = origFetchRetry(fetcher as any, { // Cast as any because fetcher doesn't return standard Fetch Response
        retries: options.retries,
        retryDelay: options.retryDelay,
        retryOn: async (_attempt: number, error: any, response: any) => {
            // `error` is a network error or similar before Supabase responds.
            // `response` is the object { data, error, status, ... } from supabase.rpc
            if (error) { // Network error
                console.warn(`[FilterContext] Network error during RPC '${rpcName}', retrying...`, error);
                return true;
            }
            if (response && response.error) { // Supabase returned an error in its response
                console.warn(`[FilterContext] Supabase RPC '${rpcName}' returned error (status ${response.status}), retrying...:`, response.error.message);
                // Optionally, don't retry on certain status codes (e.g., 401, 403, 404 if not transient)
                // For now, retry on any Supabase error.
                return true;
            }
            return false; // Success or non-retriable Supabase error
        },
    });

    try {
        // The retryingFetch function here IS the one that should be called.
        // fetchRetry(fetcher, options) returns a new function that you call.
        const result = await retryingFetch(); // No arguments needed here as fetcher has them closure'd
        // If retryOn is correct, result should be the { data, error } object after successful attempt or exhaustion.
        if (result.error) {
            // If after retries there's still a Supabase error, throw it to be caught by the caller.
            throw result.error;
        }
        return result; // Returns { data, error: null, ... }
    } catch (error: any) {
        // This catches network errors that fetch-retry couldn't resolve, or errors thrown from retryOn, or the final Supabase error.
        console.error(`[FilterContext] Error after retries for RPC '${rpcName}':`, error);
        // Rethrow to be handled by the calling function's catch block, ensuring it gets the error object
        // And not a { data, error } wrapper if the final attempt also failed.
        // The calling function expects { data, error } so we might need to format it.
        // However, if it's a genuine network error, error.message is better.
        // Let's ensure we return a structure consistent with supabase.rpc failures for the calling functions.
        return { data: null, error: error instanceof Error ? error : new Error(String(error.message || 'Unknown RPC error after retries')) };
    }
};


export const FilterProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { currentUserSubscriptionTier, isLoading: isSubscriptionLoading } = useSubscription();
  const currentUserTier: ColumnTier = currentUserSubscriptionTier as ColumnTier;

  const [currentCurrency, setCurrentCurrencyState] = useState<Currency>('USD');
  const [filterSettings, setFilterSettings] = useState<FilterSettings>(DEFAULT_FILTER_SETTINGS);
  const [metricFullRanges, setMetricFullRanges] = useState<MetricFullRanges>({});
  const [displayData, setDisplayData] = useState<Company[]>(EMPTY_ARRAY);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [filteredCompanyIds, setFilteredCompanyIds] = useState<number[]>(EMPTY_ID_ARRAY);
  const [excludedCompanyIds, setExcludedCompanyIds] = useState<Set<number>>(EMPTY_SET);
  const [loadingPaginated, setLoadingPaginated] = useState<boolean>(false);
  const [loadingRanges, setLoadingRanges] = useState<boolean>(true);
  const [loadingFilteredSet, setLoadingFilteredSet] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [sortState, setSortState] = useState<SortState>(DEFAULT_SORT_STATE);
  const [currentPage, setCurrentPage] = useState<number>(DEFAULT_PAGE);
  const [pageSize, setPageSizeState] = useState<number>(DEFAULT_PAGE_SIZE);
  const lastFetchedPageRef = useRef<number>(0);

  useEffect(() => {
    console.log('[FilterContext] currentUserTier from SubscriptionProvider updated to:', currentUserTier);
  }, [currentUserTier]);

  const effectiveTotalCount = useMemo(() => {
    const count = totalCount - excludedCompanyIds.size;
    return Math.max(0, count);
  }, [totalCount, excludedCompanyIds]);

  const loading = useMemo(() => isSubscriptionLoading || loadingRanges || loadingFilteredSet || loadingPaginated,
    [isSubscriptionLoading, loadingRanges, loadingFilteredSet, loadingPaginated]);

  useEffect(() => {
    let mounted = true;
    const fetchFullRanges = async () => {
      if (!mounted) return;
      setLoadingRanges(true);
      setError(null);
      console.log("[FilterContext] Fetching full metric ranges...");
      try {
        const { data, error: rpcError } = await fetchSupabaseRpcWithRetry('get_metrics_ranges');
        if (!mounted) return;
        if (rpcError) throw rpcError; // Will be caught by outer catch
        setMetricFullRanges((data as MetricFullRanges) ?? {});
      } catch (err: any) {
        if (!mounted) return;
        console.error("[FilterContext] Error fetching ranges (after retries):", err);
        setError(`Failed to load metric ranges: ${err.message || 'Unknown error'}`);
        setMetricFullRanges({}); // Fallback to empty
      } finally {
        if (mounted) setLoadingRanges(false);
      }
    };
    fetchFullRanges();
    return () => { mounted = false; };
  }, []);

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

  const fetchPaginatedDataOnly = useCallback(async (
    pageToFetch: number,
    sizeToFetch: number,
    currentSort: SortState,
    currentFilters: FilterSettings,
    currency: Currency,
    tier: ColumnTier
  ) => {
    if (pageToFetch <= 1) {
      console.warn(`[FilterContext] fetchPaginatedDataOnly called for page ${pageToFetch}. Skipping.`);
      return;
    }
    if (isSubscriptionLoading || loadingRanges || loadingFilteredSet || loadingPaginated) {
      console.log(`[FilterContext] Skipping Paginated Fetch (page ${pageToFetch}) due to active loading: sub=${isSubscriptionLoading}, ranges=${loadingRanges}, set=${loadingFilteredSet}, paginated=${loadingPaginated}`);
      return;
    }
    setLoadingPaginated(true);
    setError(null);
    console.log(`[FilterContext] Fetching Page Data Only: Page ${pageToFetch}, Size: ${sizeToFetch}, Sort: ${currentSort.key}, Currency: ${currency}, Tier: ${tier}`);
    const filtersJson = buildFiltersJson(currentFilters);
    const rpcParams = {
        page_num: pageToFetch,
        page_size: sizeToFetch,
        sort_column: currentSort.key,
        sort_direction: currentSort.direction,
        target_currency: currency,
        filters: filtersJson,
        // p_user_tier: tier // If your RPC needs the tier
    };
    try {
      const { data, error: rpcError } = await fetchSupabaseRpcWithRetry('get_companies_paginated', rpcParams);
      if (rpcError) throw rpcError;

      const fetchedData = data ? convertRpcRowsToCompanies(data as RpcResponseRow[]) : EMPTY_ARRAY;
      setDisplayData(fetchedData);

      if (fetchedData.length > 0 && data[0]?.total_rows !== undefined) {
        const exactTotal = data[0].total_rows;
        if (totalCount !== exactTotal) {
          console.warn(`[FilterContext] Paginated fetch (page ${pageToFetch}) returned total_rows (${exactTotal}) different from stored total_count (${totalCount}).`);
        }
      }
      lastFetchedPageRef.current = pageToFetch;
    } catch (err: any) {
      console.error(`[FilterContext] Error fetching paginated data (page ${pageToFetch}) (after retries):`, err);
      setError(`Data fetch failed for page ${pageToFetch}: ${err.message || 'Unknown error'}`);
      setDisplayData(EMPTY_ARRAY);
    } finally {
      setLoadingPaginated(false);
    }
  }, [buildFiltersJson, totalCount, isSubscriptionLoading, loadingRanges, loadingFilteredSet, loadingPaginated]);


  const fetchFilteredSetAndFirstPage = useCallback(async (
    currentFilters: FilterSettings,
    currentSort: SortState,
    sizeForFirstPage: number,
    currency: Currency,
    tier: ColumnTier
  ) => {
    if (isSubscriptionLoading && !currentUserTier) { // Added !currentUserTier to ensure tier is available if not loading
        console.log('[FilterContext] Subscription data still loading or tier not yet available, delaying initial data fetch.');
        setLoadingFilteredSet(false); // Ensure these are false if we skip
        setLoadingPaginated(false);
        return;
    }
    setLoadingFilteredSet(true);
    setLoadingPaginated(true);
    setError(null);
    console.log(`[FilterContext] Fetching Full Filtered Set & Page 1 Data. PageSize: ${sizeForFirstPage}, Sort: ${currentSort.key}, Currency: ${currency}, Tier: ${tier}`);
    const filtersJson = buildFiltersJson(currentFilters);

    let fetchedTotalCount = 0;
    let firstPageItems: Company[] = EMPTY_ARRAY;
    let allFilteredIds: number[] = EMPTY_ID_ARRAY;

    try {
      const pageOneRpcParams = {
        page_num: 1,
        page_size: sizeForFirstPage,
        sort_column: currentSort.key,
        sort_direction: currentSort.direction,
        target_currency: currency,
        filters: filtersJson,
        // p_user_tier: tier // If your RPC needs the tier
      };
      const { data: pageOneData, error: pageOneError } = await fetchSupabaseRpcWithRetry('get_companies_paginated', pageOneRpcParams);

      if (pageOneError) throw new Error(`Failed to fetch initial page data: ${pageOneError.message || 'Unknown RPC error'}`);

      if (!pageOneData || pageOneData.length === 0) {
        console.log('[FilterContext] No data returned for initial page fetch.');
      } else {
        const rpcTotalRows = pageOneData[0]?.total_rows;
        if (typeof rpcTotalRows !== 'number' || !isFinite(rpcTotalRows)) {
          console.error('[FilterContext] Invalid or missing total_rows from get_companies_paginated RPC.');
          throw new Error("RPC did not return a valid total row count for the first page.");
        }
        fetchedTotalCount = rpcTotalRows;
        firstPageItems = convertRpcRowsToCompanies(pageOneData as RpcResponseRow[]);
      }

      if (fetchedTotalCount > 0) {
        console.log(`[FilterContext] Total count is ${fetchedTotalCount}, fetching all filtered company IDs.`);
        const idRpcParams = {
            filters: filtersJson,
            // p_user_tier: tier // If your RPC needs the tier
        };
        const { data: idData, error: idError } = await fetchSupabaseRpcWithRetry('get_filtered_company_ids', idRpcParams);
        if (idError) throw new Error(`Failed to fetch filtered company IDs: ${idError.message || 'Unknown RPC error'}`);
        allFilteredIds = (idData as { company_id: number }[] || []).map(r => r.company_id);

        if (allFilteredIds.length !== fetchedTotalCount) {
          console.warn(`[FilterContext] Count Mismatch: total_rows from paginated call (${fetchedTotalCount}) vs. count of IDs from get_filtered_company_ids (${allFilteredIds.length}).`);
          // Decide on reconciliation strategy if necessary. For now, just log.
        }
      } else {
        allFilteredIds = EMPTY_ID_ARRAY;
      }

      setTotalCount(fetchedTotalCount);
      setDisplayData(firstPageItems);
      setFilteredCompanyIds(allFilteredIds);
      lastFetchedPageRef.current = 1;

    } catch (err: any) {
      console.error('[FilterContext] Error during fetchFilteredSetAndFirstPage (after retries):', err);
      setError(`Failed to update filters or fetch data: ${err.message || 'Unknown error'}`);
      setTotalCount(0);
      setDisplayData(EMPTY_ARRAY);
      setFilteredCompanyIds(EMPTY_ID_ARRAY);
    } finally {
      setLoadingFilteredSet(false);
      setLoadingPaginated(false);
    }
  }, [buildFiltersJson, isSubscriptionLoading, currentUserTier]); // Added currentUserTier

  // Effect for primary filter changes (filters, currency, sort, page size, TIER)
  useEffect(() => {
    // Allow fetch if subscription is loading but tier is already available (e.g. from a previous load)
    // Or if subscription is not loading at all.
    if (loadingRanges || (isSubscriptionLoading && !currentUserTier)) {
      console.log(`[FilterContext] Effect 1 (Filter Change): Skipping data fetch (ranges load=${loadingRanges}, subscription load=${isSubscriptionLoading}, tier available=${!!currentUserTier}).`);
      return;
    }
    console.log("[FilterContext] Effect 1 (Filter Change) Triggered. Fetching full set + page 1. Current Tier:", currentUserTier);
    setCurrentPage(DEFAULT_PAGE);
    fetchFilteredSetAndFirstPage(filterSettings, sortState, pageSize, currentCurrency, currentUserTier);
  }, [filterSettings, currentCurrency, pageSize, sortState, currentUserTier, loadingRanges, isSubscriptionLoading, fetchFilteredSetAndFirstPage]);

  // Effect for page changes (when currentPage state changes)
  useEffect(() => {
    if (loadingRanges || loadingFilteredSet || (isSubscriptionLoading && !currentUserTier)) {
      console.log(`[FilterContext] Effect 2 (Page Change): Skipping pagination fetch (initial load ongoing: ranges=${loadingRanges}, filteredSet=${loadingFilteredSet}, subLoad=${isSubscriptionLoading}, tier available=${!!currentUserTier}).`);
      return;
    }
    if (currentPage === lastFetchedPageRef.current && currentPage !== DEFAULT_PAGE) {
      console.log(`[FilterContext] Effect 2 (Page Change): Current page ${currentPage} is same as last fetched page ${lastFetchedPageRef.current}. Skipping fetch.`);
      return;
    }

    if (currentPage === DEFAULT_PAGE) {
      console.log(`[FilterContext] Effect 2 (Page Change): Page is ${currentPage}. Page 1 data is typically loaded by filter/sort/tier change effect.`);
      if (displayData.length === 0 && totalCount > 0 && !loading) { // Added !loading to prevent race conditions if Effect 1 is already running
        console.log(`[FilterContext] Effect 2 (Page Change): No display data for page 1 but totalCount=${totalCount}. Re-triggering fetch for page 1.`);
        fetchFilteredSetAndFirstPage(filterSettings, sortState, pageSize, currentCurrency, currentUserTier);
      }
      return;
    }

    console.log(`[FilterContext] Effect 2 (Page Change) Triggered: Page changed to ${currentPage}. Fetching paginated data.`);
    fetchPaginatedDataOnly(currentPage, pageSize, sortState, filterSettings, currentCurrency, currentUserTier);
  }, [currentPage, pageSize, sortState, filterSettings, currentCurrency, currentUserTier, loadingRanges, loadingFilteredSet, isSubscriptionLoading, fetchPaginatedDataOnly, fetchFilteredSetAndFirstPage, displayData, totalCount, loading]); // Added loading

  const fetchCompaniesByIds = useCallback(async (ids: number[]): Promise<Company[]> => {
    if (!Array.isArray(ids) || ids.length === 0) return EMPTY_ARRAY;
    console.log(`[FilterContext] Fetching full data for ${ids.length} companies by ID using view 'companies_detailed_view'.`);
    setError(null);
    try {
      const { data, error: rpcError } = await fetchSupabaseRpcWithRetry('companies_detailed_view', { company_ids: ids }); // Assuming your view/RPC can take a list of IDs
      // If using .from().select().in() directly:
      // const { data, error: selectError } = await supabase.from('companies_detailed_view').select('*').in('company_id', ids).limit(ids.length);
      // For direct select, retry logic needs to wrap the whole operation. For now, using RPC style.

      if (rpcError) throw rpcError;
      if (data === null) return EMPTY_ARRAY;
      if (!Array.isArray(data)) {
        console.error("[FilterContext] Unexpected data format from companies_detailed_view (expected array):", data);
        throw new Error('Unexpected data format received for company details.');
      }
      const convertedData = convertRpcRowsToCompanies(data as RpcResponseRow[]);
      return convertedData === undefined ? EMPTY_ARRAY : convertedData;
    } catch (err: any) {
      console.error('[FilterContext] Error fetching companies by IDs from view (after retries):', err);
      setError(`Failed to load detailed company data: ${err.message || 'Unknown error'}`);
      return EMPTY_ARRAY;
    }
  }, []);

  const handleSetDevelopmentStatus = useCallback((statuses: CompanyStatus[]) => {
    setFilterSettings(prev => ({ ...prev, developmentStatus: statuses }));
  }, []);
  const handleSetMetricRange = useCallback((db_column: string, min: number | null, max: number | null) => {
    setFilterSettings(prev => ({ ...prev, metricRanges: { ...prev.metricRanges, [db_column]: [min, max] } }));
  }, []);
  const handleSetSearchTerm = useCallback((term: string) => {
    setFilterSettings(prev => ({ ...prev, searchTerm: term }));
  }, []);

  const handleResetFilters = useCallback(() => {
    console.log("[FilterContext] Resetting filters to default.");
    const isFiltersDefault = JSON.stringify(filterSettings.developmentStatus) === JSON.stringify(DEFAULT_FILTER_SETTINGS.developmentStatus) &&
      JSON.stringify(filterSettings.metricRanges) === JSON.stringify(DEFAULT_FILTER_SETTINGS.metricRanges) &&
      filterSettings.searchTerm === DEFAULT_FILTER_SETTINGS.searchTerm;
    const isSortDefault = sortState.key === DEFAULT_SORT_STATE.key && sortState.direction === DEFAULT_SORT_STATE.direction;
    const isPageDefault = currentPage === DEFAULT_PAGE;
    const isPageSizeDefault = pageSize === DEFAULT_PAGE_SIZE;

    if (!isFiltersDefault || !isSortDefault || excludedCompanyIds.size > 0 || !isPageDefault || !isPageSizeDefault) {
      setFilterSettings(DEFAULT_FILTER_SETTINGS);
      setSortState(DEFAULT_SORT_STATE);
      setExcludedCompanyIds(EMPTY_SET);
      // setCurrentPage(DEFAULT_PAGE); // This will be set by the primary effect hook when filterSettings/sortState change
      setPageSizeState(DEFAULT_PAGE_SIZE);
    } else {
      console.log("[FilterContext] Filters, sort, page, and exclusions already at default values. Reset skipped.");
    }
  }, [filterSettings, sortState, excludedCompanyIds, currentPage, pageSize]);

  const handleToggleCompanyExclusion = useCallback((companyId: number) => {
    setExcludedCompanyIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(companyId)) newSet.delete(companyId);
      else newSet.add(companyId);
      return newSet;
    });
  }, []);

  const handleSetSort = useCallback((newSortState: SortState) => {
    if (newSortState.key !== sortState.key || newSortState.direction !== sortState.direction) {
      setSortState(newSortState);
    }
  }, [sortState]);

  const handleSetPage = useCallback((page: number) => {
    const maxPage = Math.max(1, Math.ceil(effectiveTotalCount / pageSize));
    const validPage = Math.max(1, Math.min(page, maxPage));
    if (validPage !== currentPage) {
      setCurrentPage(validPage);
    } else if (page > maxPage && currentPage === maxPage) {
      console.log(`[FilterContext] Attempted to set page ${page} beyond max page ${maxPage}. Staying on ${currentPage}.`)
    }
  }, [currentPage, effectiveTotalCount, pageSize]);

  const handleSetPageSize = useCallback((size: number) => {
    if (pageSizeOptions.includes(size) && size !== pageSize) {
      setPageSizeState(size);
    }
  }, [pageSize]);

  const handleSetCurrentCurrency = useCallback((currency: Currency) => {
    if (currency !== currentCurrency) {
      setCurrentCurrencyState(currency);
    }
  }, [currentCurrency]);

  const getMetricConfigByDbColumn = useCallback((db_column: string): MetricConfig | undefined => {
    return allMetricConfigs.find(m => m.db_column === db_column || m.key === db_column || m.nested_path === db_column);
  }, []);

  const value = useMemo<FilterContextType>(() => ({
    currentUserTier,
    currentCurrency,
    filterSettings,
    metricFullRanges,
    displayData,
    totalCount,
    effectiveTotalCount,
    filteredCompanyIds,
    excludedCompanyIds,
    toggleCompanyExclusion: handleToggleCompanyExclusion,
    loadingPaginated,
    loadingRanges,
    loadingFilteredSet,
    loading,
    error,
    setCurrentCurrency: handleSetCurrentCurrency,
    setDevelopmentStatusFilter: handleSetDevelopmentStatus,
    setMetricRange: handleSetMetricRange,
    setSearchTerm: handleSetSearchTerm,
    resetFilters: handleResetFilters,
    getMetricConfigByDbColumn,
    sortState,
    currentPage,
    pageSize,
    setSort: handleSetSort,
    setPage: handleSetPage,
    setPageSize: handleSetPageSize,
    fetchCompaniesByIds,
  }), [
    currentUserTier, currentCurrency, filterSettings, metricFullRanges, displayData, totalCount, effectiveTotalCount,
    filteredCompanyIds, excludedCompanyIds, loadingPaginated, loadingRanges, loadingFilteredSet, loading, error,
    handleToggleCompanyExclusion, handleSetCurrentCurrency, handleSetDevelopmentStatus, handleSetMetricRange,
    handleSetSearchTerm, handleResetFilters, getMetricConfigByDbColumn, sortState, currentPage, pageSize,
    handleSetSort, handleSetPage, handleSetPageSize, fetchCompaniesByIds
  ]);

  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>;
};

export const useFilters = (): FilterContextType => {
  const context = useContext(FilterContext);
  if (context === undefined) {
    console.error("useFilters called outside of a FilterProvider. Ensure your component is wrapped correctly.");
    throw new Error('useFilters must be used within a FilterProvider. Check component tree and provider setup.');
  }
  return context;
};