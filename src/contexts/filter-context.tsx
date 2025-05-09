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
import type { Company, RpcResponseRow, CompanyStatus, ColumnTier, Currency, SortState, FilterSettings, MetricConfig, SubscriptionTier } from '../lib/types';
import { supabase } from '../lib/supabaseClient';
import { convertRpcRowsToCompanies } from '../lib/converters';
import { metrics as allMetricConfigs } from '../lib/metric-types';
import { isValidNumber } from '../lib/utils';
import { useSubscription } from './subscription-context'; // Correctly imported

// --- State Types ---
interface MetricRanges { [db_column: string]: [number | null, number | null]; }
interface MetricFullRanges { [db_column: string]: [number, number]; }

// --- Context Type ---
interface FilterContextType {
    currentUserTier: ColumnTier; // This will be the SubscriptionTier value
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
    loading: boolean; // Overall loading state
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

// --- Defaults ---
const DEFAULT_FILTER_SETTINGS: FilterSettings = { developmentStatus: [], metricRanges: {}, searchTerm: '' };
const DEFAULT_SORT_STATE: SortState = { key: 'company_name', direction: 'asc' };
const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 25;
const pageSizeOptions = [10, 25, 50, 100]; // Keep if used, otherwise remove
const EMPTY_ARRAY: Company[] = [];
const EMPTY_ID_ARRAY: number[] = [];
const EMPTY_SET = new Set<number>();

// --- Provider Component ---
export const FilterProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // --- Get Tier from SubscriptionProvider ---
    // FIXED: Destructure currentUserSubscriptionTier directly, which holds the tier value.
    const { currentUserSubscriptionTier, isLoading: isSubscriptionLoading } = useSubscription();
    
    // This 'currentUserTier' is what FilterContext will provide.
    // Ensure ColumnTier is compatible with SubscriptionTier (e.g., 'free', 'pro', 'premium').
    // If ColumnTier is a different enum or type, you might need a mapping function here.
    // Assuming ColumnTier can accept SubscriptionTier values directly for now.
    const currentUserTier: ColumnTier = currentUserSubscriptionTier as ColumnTier;


    // --- Other State ---
    const [currentCurrency, setCurrentCurrencyState] = useState<Currency>('USD');
    const [filterSettings, setFilterSettings] = useState<FilterSettings>(DEFAULT_FILTER_SETTINGS);
    const [metricFullRanges, setMetricFullRanges] = useState<MetricFullRanges>({});
    const [displayData, setDisplayData] = useState<Company[]>(EMPTY_ARRAY);
    const [totalCount, setTotalCount] = useState<number>(0);
    const [filteredCompanyIds, setFilteredCompanyIds] = useState<number[]>(EMPTY_ID_ARRAY);
    const [excludedCompanyIds, setExcludedCompanyIds] = useState<Set<number>>(EMPTY_SET);
    const [loadingPaginated, setLoadingPaginated] = useState<boolean>(false);
    const [loadingRanges, setLoadingRanges] = useState<boolean>(true); // Initialize as true until ranges are fetched
    const [loadingFilteredSet, setLoadingFilteredSet] = useState<boolean>(true); // Initialize as true
    const [error, setError] = useState<string | null>(null);
    const [sortState, setSortState] = useState<SortState>(DEFAULT_SORT_STATE);
    const [currentPage, setCurrentPage] = useState<number>(DEFAULT_PAGE);
    const [pageSize, setPageSizeState] = useState<number>(DEFAULT_PAGE_SIZE);
    const lastFetchedPageRef = useRef<number>(0); // Initialize to 0 to ensure first page fetch

    useEffect(() => {
        console.log('[FilterContext] currentUserTier from SubscriptionProvider updated to:', currentUserTier);
        // If your backend RPC functions (get_companies_paginated, get_filtered_company_ids)
        // require the user's tier for filtering data (e.g., to show/hide certain companies or columns),
        // then having `currentUserTier` in the dependency array of the data fetching useEffects (as it is)
        // is correct, as it will trigger a re-fetch when the tier changes.
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
                const { data, error: rpcError } = await supabase.rpc('get_metrics_ranges');
                if (!mounted) return;
                if (rpcError) throw rpcError;
                // Assuming data is directly MetricFullRanges or null/undefined
                setMetricFullRanges((data as MetricFullRanges) ?? {});
            } catch (err: any) {
                if (!mounted) return;
                console.error("[FilterContext] Error fetching ranges:", err);
                setError(`Failed to load metric ranges: ${err.message}`);
                setMetricFullRanges({});
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
        tier: ColumnTier // Use the tier passed as argument
    ) => {
        if (pageToFetch <= 1) {
            console.warn(`[FilterContext] fetchPaginatedDataOnly called for page ${pageToFetch}, but it should only be called for page > 1. Skipping.`);
            return;
        }
        // Check global loading states, including subscription loading
        if (isSubscriptionLoading || loadingRanges || loadingFilteredSet || loadingPaginated) {
            console.log(`[FilterContext] Skipping Paginated Fetch (page ${pageToFetch}) due to active loading: sub=${isSubscriptionLoading}, ranges=${loadingRanges}, set=${loadingFilteredSet}, paginated=${loadingPaginated}`);
            return;
        }
        setLoadingPaginated(true);
        setError(null);
        console.log(`[FilterContext] Fetching Page Data Only: Page ${pageToFetch}, Size: ${sizeToFetch}, Sort: ${currentSort.key}, Currency: ${currency}, Tier: ${tier}`);
        const filtersJson = buildFiltersJson(currentFilters);
        try {
            const { data, error: rpcError } = await supabase.rpc('get_companies_paginated', {
                page_num: pageToFetch,
                page_size: sizeToFetch,
                sort_column: currentSort.key,
                sort_direction: currentSort.direction,
                target_currency: currency,
                filters: filtersJson,
                // p_user_tier: tier // If your RPC needs the tier, pass it here
            });
            if (rpcError) throw rpcError;
            
            const fetchedData = data ? convertRpcRowsToCompanies(data as RpcResponseRow[]) : EMPTY_ARRAY;
            setDisplayData(fetchedData); // This will show only the current page's data
            
            // Total count should be stable from fetchFilteredSetAndFirstPage, but good to log if RPC returns it.
            if (fetchedData.length > 0 && data[0]?.total_rows !== undefined) {
                const exactTotal = data[0].total_rows;
                if (totalCount !== exactTotal) {
                     console.warn(`[FilterContext] Paginated fetch (page ${pageToFetch}) returned total_rows (${exactTotal}) different from stored total_count (${totalCount}). This might indicate an issue if total changes frequently without filter changes.`);
                    //  setTotalCount(exactTotal); // Optionally update, but might cause layout shifts if it flickers
                }
            }
            lastFetchedPageRef.current = pageToFetch;
        } catch (err: any) {
            console.error(`[FilterContext] Error fetching paginated data (page ${pageToFetch}):`, err);
            setError(`Data fetch failed for page ${pageToFetch}: ${err.message}`);
            setDisplayData(EMPTY_ARRAY); // Clear data on error
        } finally {
            setLoadingPaginated(false);
        }
    }, [buildFiltersJson, totalCount, isSubscriptionLoading, loadingRanges, loadingFilteredSet, loadingPaginated]); // Dependencies for the callback itself

    const fetchFilteredSetAndFirstPage = useCallback(async (
        currentFilters: FilterSettings, 
        currentSort: SortState, 
        sizeForFirstPage: number, 
        currency: Currency, 
        tier: ColumnTier // Use the tier passed as argument
    ) => {
        if (isSubscriptionLoading) {
            console.log('[FilterContext] Subscription data still loading, delaying initial data fetch (fetchFilteredSetAndFirstPage).');
            setLoadingFilteredSet(false); 
            setLoadingPaginated(false); 
            return;
        }
        setLoadingFilteredSet(true); // Indicates loading of the full ID set and first page
        setLoadingPaginated(true);  // Also true as first page data is part of this
        setError(null);
        console.log(`[FilterContext] Fetching Full Filtered Set & Page 1 Data. PageSize: ${sizeForFirstPage}, Sort: ${currentSort.key}, Currency: ${currency}, Tier: ${tier}`);
        const filtersJson = buildFiltersJson(currentFilters);
        
        let fetchedTotalCount = 0;
        let firstPageItems: Company[] = EMPTY_ARRAY;
        let allFilteredIds: number[] = EMPTY_ID_ARRAY;

        try {
            // Fetch first page and total count together
            const { data: pageOneData, error: pageOneError } = await supabase.rpc('get_companies_paginated', {
                page_num: 1,
                page_size: sizeForFirstPage,
                sort_column: currentSort.key,
                sort_direction: currentSort.direction,
                target_currency: currency,
                filters: filtersJson,
                // p_user_tier: tier // If your RPC needs the tier
            });

            if (pageOneError) throw new Error(`Failed to fetch initial page data: ${pageOneError.message}`);

            if (!pageOneData || pageOneData.length === 0) {
                console.log('[FilterContext] No data returned for initial page fetch.');
                // Values already initialized to empty/0
            } else {
                const rpcTotalRows = pageOneData[0]?.total_rows;
                if (typeof rpcTotalRows !== 'number' || !isFinite(rpcTotalRows)) {
                    console.error('[FilterContext] Invalid or missing total_rows from get_companies_paginated RPC.');
                    throw new Error("RPC did not return a valid total row count for the first page.");
                }
                fetchedTotalCount = rpcTotalRows;
                firstPageItems = convertRpcRowsToCompanies(pageOneData as RpcResponseRow[]);
            }

            // If there are results, fetch all their IDs
            if (fetchedTotalCount > 0) {
                console.log(`[FilterContext] Total count is ${fetchedTotalCount}, fetching all filtered company IDs.`);
                const { data: idData, error: idError } = await supabase.rpc('get_filtered_company_ids', { 
                    filters: filtersJson,
                    // p_user_tier: tier // If your RPC needs the tier
                });
                if (idError) throw new Error(`Failed to fetch filtered company IDs: ${idError.message}`);
                allFilteredIds = (idData as { company_id: number }[] || []).map(r => r.company_id);
                
                if (allFilteredIds.length !== fetchedTotalCount) {
                    console.warn(`[FilterContext] Count Mismatch: total_rows from paginated call (${fetchedTotalCount}) vs. count of IDs from get_filtered_company_ids (${allFilteredIds.length}). Using ID count for consistency if different and greater than 0, else paginated total.`);
                    // Potentially reconcile counts or log for investigation
                     if (allFilteredIds.length > 0) { // If IDs were fetched, use their count if it differs significantly
                        // fetchedTotalCount = allFilteredIds.length; // Or decide on a strategy
                     }
                }
            } else {
                 allFilteredIds = EMPTY_ID_ARRAY; // Ensure it's empty if no results
            }

            setTotalCount(fetchedTotalCount);
            setDisplayData(firstPageItems);
            setFilteredCompanyIds(allFilteredIds);
            lastFetchedPageRef.current = 1; // We've fetched page 1

        } catch (err: any) {
            console.error('[FilterContext] Error during fetchFilteredSetAndFirstPage:', err);
            setError(`Failed to update filters or fetch data: ${err.message}`);
            setTotalCount(0);
            setDisplayData(EMPTY_ARRAY);
            setFilteredCompanyIds(EMPTY_ID_ARRAY);
        } finally {
            setLoadingFilteredSet(false);
            setLoadingPaginated(false);
        }
    }, [buildFiltersJson, isSubscriptionLoading]);

    // Effect for primary filter changes (filters, currency, sort, page size, TIER)
    useEffect(() => {
        if (loadingRanges || isSubscriptionLoading) {
            console.log(`[FilterContext] Effect 1 (Filter Change): Skipping data fetch (initial ranges load=${loadingRanges}, subscription load=${isSubscriptionLoading}).`);
            return;
        }
        console.log("[FilterContext] Effect 1 (Filter Change) Triggered. Fetching full set + page 1. Current Tier:", currentUserTier);
        setCurrentPage(DEFAULT_PAGE); // Always reset to page 1 on these significant changes
        fetchFilteredSetAndFirstPage(filterSettings, sortState, pageSize, currentCurrency, currentUserTier);
    }, [filterSettings, currentCurrency, pageSize, sortState, currentUserTier, loadingRanges, isSubscriptionLoading, fetchFilteredSetAndFirstPage]);
    // Note: fetchFilteredSetAndFirstPage is stable due to useCallback, but including it makes deps explicit.

    // Effect for page changes (when currentPage state changes)
    useEffect(() => {
        if (loadingRanges || loadingFilteredSet || isSubscriptionLoading) {
             console.log(`[FilterContext] Effect 2 (Page Change): Skipping pagination fetch (initial load ongoing: ranges=${loadingRanges}, filteredSet=${loadingFilteredSet}, subLoad=${isSubscriptionLoading}).`);
            return;
        }
        if (currentPage === lastFetchedPageRef.current && currentPage !== DEFAULT_PAGE) { // Avoid refetch if page hasn't actually changed from last fetch, unless it's page 1 (handled by other effect)
            console.log(`[FilterContext] Effect 2 (Page Change): Current page ${currentPage} is same as last fetched page ${lastFetchedPageRef.current}. Skipping fetch.`);
            return;
        }

        if (currentPage === DEFAULT_PAGE) {
            // Page 1 data is fetched by the effect above (Effect 1) when filters/sort/tier change.
            // If only currentPage was set to 1 (e.g. by resetFilters without other changes immediately triggering Effect 1),
            // we might need to ensure data for page 1 is loaded if it wasn't already by Effect 1.
            // However, Effect 1 should cover this since setCurrentPage(DEFAULT_PAGE) happens there.
            // If displayData is empty and currentPage is 1, it implies Effect 1 needs to run.
            console.log(`[FilterContext] Effect 2 (Page Change): Page is ${currentPage}. Page 1 data is typically loaded by filter/sort/tier change effect.`);
            if(displayData.length === 0 && totalCount > 0) { // If page 1 but no data and there should be some
                console.log(`[FilterContext] Effect 2 (Page Change): No display data for page 1 but totalCount=${totalCount}. Re-triggering fetch for page 1.`);
                 fetchFilteredSetAndFirstPage(filterSettings, sortState, pageSize, currentCurrency, currentUserTier);
            }
            return; 
        }
        
        // Fetch data for pages other than 1
        console.log(`[FilterContext] Effect 2 (Page Change) Triggered: Page changed to ${currentPage}. Fetching paginated data.`);
        fetchPaginatedDataOnly(currentPage, pageSize, sortState, filterSettings, currentCurrency, currentUserTier);

    }, [currentPage, pageSize, sortState, filterSettings, currentCurrency, currentUserTier, loadingRanges, loadingFilteredSet, isSubscriptionLoading, fetchPaginatedDataOnly, fetchFilteredSetAndFirstPage, displayData, totalCount]);


    const fetchCompaniesByIds = useCallback(async (ids: number[]): Promise<Company[]> => {
        if (!Array.isArray(ids) || ids.length === 0) return EMPTY_ARRAY;
        console.log(`[FilterContext] Fetching full data for ${ids.length} companies by ID using view 'companies_detailed_view'.`);
        setError(null);
        // setLoadingSomething(true); // Potentially a new loading state for this specific action if it's slow
        try {
            // Ensure you only select columns needed by the component calling this. '*' can be inefficient.
            const { data, error } = await supabase.from('companies_detailed_view').select('*').in('company_id', ids).limit(ids.length);
            if (error) throw error;
            if (data === null) return EMPTY_ARRAY;
            if (!Array.isArray(data)) {
                console.error("[FilterContext] Unexpected data format from companies_detailed_view (expected array):", data);
                throw new Error('Unexpected data format received for company details.');
            }
            const convertedData = convertRpcRowsToCompanies(data as RpcResponseRow[]); // Assuming RpcResponseRow is compatible
            return convertedData === undefined ? EMPTY_ARRAY : convertedData;
        } catch (err: any) {
            console.error('[FilterContext] Error fetching companies by IDs from view:', err);
            setError(`Failed to load detailed company data: ${err.message || 'Unknown error'}`);
            return EMPTY_ARRAY;
        } finally {
            // setLoadingSomething(false);
        }
    }, []); // currentCurrency might be needed if view is currency sensitive, but RPCs handle currency

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
        // Check if a reset is actually needed to avoid unnecessary re-renders/fetches
        const isFiltersDefault = JSON.stringify(filterSettings.developmentStatus) === JSON.stringify(DEFAULT_FILTER_SETTINGS.developmentStatus) &&
                                 JSON.stringify(filterSettings.metricRanges) === JSON.stringify(DEFAULT_FILTER_SETTINGS.metricRanges) &&
                                 filterSettings.searchTerm === DEFAULT_FILTER_SETTINGS.searchTerm;
        const isSortDefault = sortState.key === DEFAULT_SORT_STATE.key && sortState.direction === DEFAULT_SORT_STATE.direction;
        const isPageDefault = currentPage === DEFAULT_PAGE;
        const isPageSizeDefault = pageSize === DEFAULT_PAGE_SIZE; // Assuming pageSize is also resettable
        // const isCurrencyDefault = currentCurrency === 'USD'; // If currency has a default to reset to

        if (!isFiltersDefault || !isSortDefault || excludedCompanyIds.size > 0 || !isPageDefault || !isPageSizeDefault /* || !isCurrencyDefault */) {
            setFilterSettings(DEFAULT_FILTER_SETTINGS);
            setSortState(DEFAULT_SORT_STATE);
            setExcludedCompanyIds(EMPTY_SET);
            setCurrentPage(DEFAULT_PAGE); // This will trigger Effect 1 (via filterSettings change) or Effect 2
            setPageSizeState(DEFAULT_PAGE_SIZE); // If pageSize is part of reset
            // setCurrentCurrencyState('USD'); // If currency is part of reset
        } else {
            console.log("[FilterContext] Filters, sort, page, and exclusions already at default values. Reset skipped.");
        }
    }, [filterSettings, sortState, excludedCompanyIds, currentPage, pageSize, /* currentCurrency */]);

    const handleToggleCompanyExclusion = useCallback((companyId: number) => {
        setExcludedCompanyIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(companyId)) newSet.delete(companyId);
            else newSet.add(companyId);
            return newSet;
        });
        // Note: Toggling exclusion changes `effectiveTotalCount` but doesn't directly refetch data here.
        // The display should ideally filter out excluded IDs client-side from `displayData`,
        // or if `filteredCompanyIds` is used for display, it should be re-filtered.
        // This current setup seems to rely on `effectiveTotalCount` for pagination UI.
    }, []);
    const handleSetSort = useCallback((newSortState: SortState) => {
        if (newSortState.key !== sortState.key || newSortState.direction !== sortState.direction) {
            setSortState(newSortState);
        }
    }, [sortState]);

    const handleSetPage = useCallback((page: number) => {
        // totalCount here is the count BEFORE client-side exclusions.
        // effectiveTotalCount is totalCount - excludedCompanyIds.size
        const maxPage = Math.max(1, Math.ceil(effectiveTotalCount / pageSize));
        const validPage = Math.max(1, Math.min(page, maxPage));
        if (validPage !== currentPage) {
            setCurrentPage(validPage);
        } else if (page > maxPage && currentPage === maxPage) {
            // If user tries to go beyond max page but is already on max page, do nothing.
            console.log(`[FilterContext] Attempted to set page ${page} beyond max page ${maxPage}. Staying on ${currentPage}.`)
        }
    }, [currentPage, effectiveTotalCount, pageSize]);

    const handleSetPageSize = useCallback((size: number) => {
        if (pageSizeOptions.includes(size) && size !== pageSize) {
            setPageSizeState(size);
            // Setting page size will also reset current page to 1 via Effect 1
        }
    }, [pageSize]);
    
    const handleSetCurrentCurrency = useCallback((currency: Currency) => {
        if (currency !== currentCurrency) {
            setCurrentCurrencyState(currency);
            // Setting currency will also reset current page to 1 via Effect 1
        }
    }, [currentCurrency]);

    const getMetricConfigByDbColumn = useCallback((db_column: string): MetricConfig | undefined => {
        return allMetricConfigs.find(m => m.db_column === db_column || m.key === db_column || m.nested_path === db_column);
    }, []); // allMetricConfigs should be stable

    const value = useMemo<FilterContextType>(() => ({
        currentUserTier, // This is now correctly the value from useSubscription
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
    if (context === undefined) { throw new Error('useFilters must be used within a FilterProvider'); }
    return context;
};