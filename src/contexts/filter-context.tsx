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
import type { Company, RpcResponseRow, CompanyStatus, ColumnTier, Currency, SortState, FilterSettings, MetricConfig, SubscriptionTier } from '../lib/types'; // Added SubscriptionTier
import { supabase } from '../lib/supabaseClient';
import { convertRpcRowsToCompanies } from '../lib/converters';
import { metrics as allMetricConfigs } from '../lib/metric-types';
import { isValidNumber } from '../lib/utils';
import { useSubscription } from './subscription-context'; // Import useSubscription

// --- State Types ---
interface MetricRanges { [db_column: string]: [number | null, number | null]; }
interface MetricFullRanges { [db_column: string]: [number, number]; }

// --- Context Type ---
interface FilterContextType {
    currentUserTier: ColumnTier; // This will now be derived from SubscriptionProvider
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
    // setCurrentUserTier: (tier: ColumnTier) => void; // We will remove this setter
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
const pageSizeOptions = [10, 25, 50, 100];
const EMPTY_ARRAY: Company[] = [];
const EMPTY_ID_ARRAY: number[] = [];
const EMPTY_SET = new Set<number>();

// --- Provider Component ---
export const FilterProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // --- Get Tier from SubscriptionProvider ---
    const { getEffectiveTier, isLoading: isSubscriptionLoading } = useSubscription();
    const currentUserTier = getEffectiveTier(); // Get the current tier

    // --- Other State ---
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
    const lastFetchedPageRef = useRef<number>(DEFAULT_PAGE);

    // Log when currentUserTier from subscription changes
    useEffect(() => {
        console.log('[FilterContext] currentUserTier from SubscriptionProvider updated:', currentUserTier);
        // If your data fetching or other logic needs to re-run when the tier changes,
        // ensure `currentUserTier` is a dependency of those useEffects.
        // For example, if `fetchFilteredSetAndFirstPage` needs to be re-called:
        // This might be too aggressive if it causes too many re-fetches,
        // but it ensures data reflects the new tier if backend filtering depends on it.
        // Consider if this is needed based on your backend logic.
        // If filtering by tier is purely client-side, this re-fetch might not be essential here.
    }, [currentUserTier]);


    const effectiveTotalCount = useMemo(() => {
        const count = totalCount - excludedCompanyIds.size;
        return Math.max(0, count);
    }, [totalCount, excludedCompanyIds]);

    // Combined loading state, now includes subscription loading
    const loading = useMemo(() => isSubscriptionLoading || loadingRanges || loadingFilteredSet || loadingPaginated, [isSubscriptionLoading, loadingRanges, loadingFilteredSet, loadingPaginated]);

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
        if (settings.developmentStatus?.length > 0) filtersJson.status = settings.developmentStatus.filter(s => typeof s === 'string');
        const searchTerm = settings.searchTerm?.trim();
        if (searchTerm) filtersJson.searchTerm = searchTerm;
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

    // fetchPaginatedDataOnly - Fetches ONLY data for a specific page > 1
    const fetchPaginatedDataOnly = useCallback(async (pageToFetch: number, sizeToFetch: number, currentSort: SortState, currentFilters: FilterSettings, currency: Currency, tier: ColumnTier) => {
        if (pageToFetch <= 1) {
            console.warn(`[FilterContext] fetchPaginatedDataOnly called for page ${pageToFetch}, skipping.`);
            return;
        }
        if (loadingPaginated || loadingFilteredSet || loadingRanges || isSubscriptionLoading) { // Added isSubscriptionLoading
            console.log(`[FilterContext] Skipping Paginated Fetch (loading active or sub loading)`);
            return;
        }
        setLoadingPaginated(true);
        setError(null);
        console.log(`[FilterContext] Fetching Page Only: ${pageToFetch}, Size: ${sizeToFetch}, Sort: ${currentSort.key}, Currency: ${currency}, Tier: ${tier}`);
        const filtersJson = buildFiltersJson(currentFilters);
        try {
            const { data, error: rpcError } = await supabase.rpc('get_companies_paginated', {
                page_num: pageToFetch,
                page_size: sizeToFetch,
                sort_column: currentSort.key,
                sort_direction: currentSort.direction,
                target_currency: currency,
                filters: filtersJson,
                // p_user_tier: tier // Example: Pass tier to backend if RPC function expects it
            });
            if (rpcError) throw rpcError;
            const fetchedData = data ? convertRpcRowsToCompanies(data as RpcResponseRow[]) : EMPTY_ARRAY;
            setDisplayData(fetchedData);
            if (fetchedData.length > 0) {
                const exactTotal = data[0]?.total_rows;
                if (typeof exactTotal === 'number' && isFinite(exactTotal) && exactTotal !== totalCount) {
                    console.warn(`[FilterContext] Paginated total_rows (${exactTotal}) inconsistent with stored total (${totalCount}) on page ${pageToFetch}.`);
                }
            }
            lastFetchedPageRef.current = pageToFetch;
        } catch (err: any) {
            console.error('[FilterContext] Error fetching paginated only:', err);
            setError(`Data fetch failed for page ${pageToFetch}: ${err.message}`);
            setDisplayData(EMPTY_ARRAY);
        } finally {
            setLoadingPaginated(false);
        }
    }, [buildFiltersJson, loadingPaginated, loadingFilteredSet, loadingRanges, totalCount, isSubscriptionLoading]); // Added isSubscriptionLoading

    // fetchFilteredSetAndFirstPage - Fetches total count, all IDs, and data for page 1
    const fetchFilteredSetAndFirstPage = useCallback(async (currentFilters: FilterSettings, currentSort: SortState, sizeForFirstPage: number, currency: Currency, tier: ColumnTier) => {
        if (isSubscriptionLoading) { // Don't fetch if subscription is still loading
            console.log('[FilterContext] Subscription loading, delaying fetchFilteredSetAndFirstPage.');
            setLoadingFilteredSet(false); // Ensure this doesn't stay true
            setLoadingPaginated(false); // Ensure this doesn't stay true
            return;
        }
        setLoadingFilteredSet(true);
        setLoadingPaginated(true);
        setError(null);
        console.log(`[FilterContext] Updating Full Filtered Set & Fetching Page 1. Size: ${sizeForFirstPage}, Sort: ${currentSort.key}, Currency: ${currency}, Tier: ${tier}`);
        const filtersJson = buildFiltersJson(currentFilters);
        let fetchedCount = 0;
        let firstPageData: Company[] = EMPTY_ARRAY;
        let allIds: number[] = EMPTY_ID_ARRAY;
        try {
            const { data: pageData, error: pageError } = await supabase.rpc('get_companies_paginated', {
                page_num: 1,
                page_size: sizeForFirstPage,
                sort_column: currentSort.key,
                sort_direction: currentSort.direction,
                target_currency: currency,
                filters: filtersJson,
                // p_user_tier: tier // Example: Pass tier to backend if RPC function expects it
            });
            if (pageError) throw new Error(`Failed to fetch initial page data: ${pageError.message}`);
            if (!pageData || pageData.length === 0) {
                fetchedCount = 0;
                firstPageData = EMPTY_ARRAY;
                allIds = EMPTY_ID_ARRAY;
            } else {
                const exactTotal = pageData[0]?.total_rows;
                if (typeof exactTotal !== 'number' || !isFinite(exactTotal)) throw new Error("Invalid total_rows received from RPC.");
                fetchedCount = exactTotal;
                firstPageData = convertRpcRowsToCompanies(pageData as RpcResponseRow[]);
                if (fetchedCount > 0) {
                    const { data: idData, error: idError } = await supabase.rpc('get_filtered_company_ids', { filters: filtersJson /*, p_user_tier: tier */ }); // Pass tier if needed
                    if (idError) throw new Error(`Failed to fetch filtered company IDs: ${idError.message}`);
                    allIds = (idData as { company_id: number }[] || []).map(r => r.company_id);
                    if (allIds.length !== fetchedCount) console.warn(`[FilterContext] Count mismatch: paginated total (${fetchedCount}) vs fetched IDs (${allIds.length}).`);
                } else {
                    allIds = EMPTY_ID_ARRAY;
                }
            }
            setTotalCount(fetchedCount);
            setDisplayData(firstPageData);
            setFilteredCompanyIds(allIds);
            lastFetchedPageRef.current = 1;
        } catch (err: any) {
            console.error('[FilterContext] Error updating filtered set:', err);
            setError(`Filter update failed: ${err.message}`);
            setTotalCount(0);
            setDisplayData(EMPTY_ARRAY);
            setFilteredCompanyIds(EMPTY_ID_ARRAY);
        } finally {
            setLoadingFilteredSet(false);
            setLoadingPaginated(false);
        }
    }, [buildFiltersJson, isSubscriptionLoading]); // Added isSubscriptionLoading

    // --- Effects to Trigger Fetches ---
    // This effect handles changes to primary filters, currency, page size, sort, or TIER
    useEffect(() => {
        if (loadingRanges || isSubscriptionLoading) { // Also wait for subscription status to be known
             console.log(`[FilterContext] Effect 1: Skipping data fetch (initial load in progress ranges=${loadingRanges}, subLoading=${isSubscriptionLoading}).`);
            return;
        }
        console.log("[FilterContext] Effect 1 Triggered: Filters/Currency/Sort/PageSize/Tier changed. Fetching full set + page 1. Current Tier:", currentUserTier);
        setCurrentPage(DEFAULT_PAGE); // Reset to page 1 on these changes
        fetchFilteredSetAndFirstPage(filterSettings, sortState, pageSize, currentCurrency, currentUserTier);
    }, [filterSettings, currentCurrency, pageSize, sortState, loadingRanges, fetchFilteredSetAndFirstPage, currentUserTier, isSubscriptionLoading]); // Added currentUserTier and isSubscriptionLoading

    // This effect handles pagination (when currentPage changes)
    useEffect(() => {
        if (loadingRanges || loadingFilteredSet || isSubscriptionLoading) {
            console.log(`[FilterContext] Effect 2: Skipping pagination fetch (initial load in progress ranges=${loadingRanges}, set=${loadingFilteredSet}, subLoading=${isSubscriptionLoading}).`);
            return;
        }
        if (currentPage === lastFetchedPageRef.current) {
            console.log(`[FilterContext] Effect 2: Skipping fetch for page ${currentPage} (already fetched).`);
            return;
        }
        if (currentPage !== DEFAULT_PAGE) {
            console.log(`[FilterContext] Effect 2 Triggered: Page changed to ${currentPage}. Fetching paginated data.`);
            fetchPaginatedDataOnly(currentPage, pageSize, sortState, filterSettings, currentCurrency, currentUserTier);
        } else {
            // Page 1 is handled by the effect above when filters/sort/tier change.
            // If only page number changed back to 1, and other deps of Effect 1 didn't change,
            // Effect 1 might not re-run. However, setting page to 1 typically happens
            // alongside other filter changes handled by Effect 1.
            console.log(`[FilterContext] Effect 2: Page is ${currentPage}. No explicit fetch for page 1 here (handled by filter/sort/tier change effect).`);
        }
    }, [currentPage, pageSize, sortState, filterSettings, currentCurrency, currentUserTier, loadingRanges, loadingFilteredSet, fetchPaginatedDataOnly, isSubscriptionLoading]); // Added dependencies

    const fetchCompaniesByIds = useCallback(async (ids: number[]): Promise<Company[]> => {
        // ... (fetchCompaniesByIds remains the same)
        if (!Array.isArray(ids) || ids.length === 0) return EMPTY_ARRAY;
        console.log(`[FilterContext] Fetching full data for ${ids.length} companies by ID using view.`);
        setError(null);
        try {
            const { data, error } = await supabase.from('companies_detailed_view').select('*').in('company_id', ids).limit(ids.length);
            if (error) throw error;
            if (data === null) return EMPTY_ARRAY;
            if (!Array.isArray(data)) throw new Error('Unexpected data format received.');
            const convertedData = convertRpcRowsToCompanies(data as RpcResponseRow[]);
            return convertedData === undefined ? EMPTY_ARRAY : convertedData;
        } catch (err: any) {
            console.error('[FilterContext] Catch block: Error fetching companies by IDs from view:', err);
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
        const needsReset = JSON.stringify(filterSettings) !== JSON.stringify(DEFAULT_FILTER_SETTINGS) ||
                           JSON.stringify(sortState) !== JSON.stringify(DEFAULT_SORT_STATE) ||
                           excludedCompanyIds.size > 0 ||
                           currentPage !== DEFAULT_PAGE;
        if (needsReset) {
            setFilterSettings(DEFAULT_FILTER_SETTINGS);
            setSortState(DEFAULT_SORT_STATE);
            setExcludedCompanyIds(EMPTY_SET);
            // setCurrentPage(DEFAULT_PAGE); // This will be handled by the useEffect due to filterSettings change
        } else {
            console.log("[FilterContext] Filters already default, reset skipped.");
        }
    }, [filterSettings, sortState, excludedCompanyIds, currentPage]);
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
        const maxPage = Math.max(1, Math.ceil(totalCount / pageSize));
        const validPage = Math.max(1, Math.min(page, maxPage));
        if (validPage !== currentPage) {
            setCurrentPage(validPage);
        }
    }, [currentPage, totalCount, pageSize]);
    const handleSetPageSize = useCallback((size: number) => {
        if (pageSizeOptions.includes(size) && size !== pageSize) {
            setPageSizeState(size);
        }
    }, [pageSize]);
    // Remove setCurrentUserTierState as tier is now from SubscriptionProvider
    // const handleSetCurrentUserTier = useCallback((tier: ColumnTier) => {
    //     setCurrentUserTierState(tier);
    // }, []);
    const handleSetCurrentCurrency = useCallback((currency: Currency) => {
        if (currency !== currentCurrency) {
            setCurrentCurrencyState(currency);
        }
    }, [currentCurrency]);
    const getMetricConfigByDbColumn = useCallback((db_column: string): MetricConfig | undefined => {
        return allMetricConfigs.find(m => m.db_column === db_column || m.key === db_column || m.nested_path === db_column);
    }, []);

    // --- CONTEXT VALUE ---
    const value = useMemo<FilterContextType>(() => ({
        currentUserTier, // Directly use the tier from useSubscription
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
        loading, // Use the combined loading state
        error,
        // setCurrentUserTier: handleSetCurrentUserTier, // Remove this
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
        currentUserTier, // Add currentUserTier from useSubscription
        currentCurrency,
        filterSettings,
        metricFullRanges,
        displayData,
        totalCount,
        effectiveTotalCount,
        filteredCompanyIds,
        excludedCompanyIds,
        loadingPaginated,
        loadingRanges,
        loadingFilteredSet,
        loading, // Use combined loading
        error,
        handleSetCurrentCurrency,
        handleSetDevelopmentStatus,
        handleSetMetricRange,
        handleSetSearchTerm,
        handleResetFilters,
        handleToggleCompanyExclusion,
        getMetricConfigByDbColumn,
        sortState,
        currentPage,
        pageSize,
        handleSetSort,
        handleSetPage,
        handleSetPageSize,
        fetchCompaniesByIds,
    ]);

    return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>;
};

// --- Custom Hook ---
export const useFilters = (): FilterContextType => {
    const context = useContext(FilterContext);
    if (context === undefined) { throw new Error('useFilters must be used within a FilterProvider'); }
    return context;
};
