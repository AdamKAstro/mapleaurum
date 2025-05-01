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
import type { Company, RpcResponseRow, CompanyStatus, ColumnTier, Currency, SortState, FilterSettings, MetricConfig } from '../lib/types';
import { supabase } from '../lib/supabaseClient';
import { convertRpcRowsToCompanies } from '../lib/converters';
import { metrics as allMetricConfigs } from '../lib/metric-types';
import { isValidNumber } from '../lib/utils';

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
    effectiveTotalCount: number; // NEW: Total count after exclusions
    filteredCompanyIds: number[];
    excludedCompanyIds: Set<number>;
    toggleCompanyExclusion: (companyId: number) => void;
    loadingPaginated: boolean;
    loadingRanges: boolean;
    loadingFilteredSet: boolean;
    loading: boolean;
    error: string | null;
    setCurrentUserTier: (tier: ColumnTier) => void;
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
    // --- State ---
    const [currentUserTier, setCurrentUserTierState] = useState<ColumnTier>('free');
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

    // NEW: Compute effective total count after exclusions
    const effectiveTotalCount = useMemo(() => {
        const count = totalCount - excludedCompanyIds.size;
        return Math.max(0, count); // Ensure non-negative
    }, [totalCount, excludedCompanyIds]);

    // Combined loading state
    const loading = useMemo(() => loadingRanges || loadingFilteredSet || loadingPaginated, [loadingRanges, loadingFilteredSet, loadingPaginated]);

    // --- Fetch Full Metric Ranges ---
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

    // --- Core Data Fetching Logic ---
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
    const fetchPaginatedDataOnly = useCallback(async (pageToFetch: number, sizeToFetch: number, currentSort: SortState, currentFilters: FilterSettings, currency: Currency) => {
        if (pageToFetch <= 1) {
            console.warn(`[FilterContext] fetchPaginatedDataOnly called for page ${pageToFetch}, skipping.`);
            return;
        }
        if (loadingPaginated || loadingFilteredSet || loadingRanges) {
            console.log(`[FilterContext] Skipping Paginated Fetch (loading active)`);
            return;
        }
        setLoadingPaginated(true);
        setError(null);
        console.log(`[FilterContext] Fetching Page Only: ${pageToFetch}, Size: ${sizeToFetch}, Sort: ${currentSort.key}, Currency: ${currency}`);
        const filtersJson = buildFiltersJson(currentFilters);
        try {
            const { data, error: rpcError } = await supabase.rpc('get_companies_paginated', {
                page_num: pageToFetch,
                page_size: sizeToFetch,
                sort_column: currentSort.key,
                sort_direction: currentSort.direction,
                target_currency: currency,
                filters: filtersJson,
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
    }, [buildFiltersJson, loadingPaginated, loadingFilteredSet, loadingRanges, totalCount]);

    // fetchFilteredSetAndFirstPage - Fetches total count, all IDs, and data for page 1
    const fetchFilteredSetAndFirstPage = useCallback(async (currentFilters: FilterSettings, currentSort: SortState, sizeForFirstPage: number, currency: Currency) => {
        setLoadingFilteredSet(true);
        setLoadingPaginated(true);
        setError(null);
        console.log(`[FilterContext] Updating Full Filtered Set & Fetching Page 1. Size: ${sizeForFirstPage}, Sort: ${currentSort.key}, Currency: ${currency}`);
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
                    const { data: idData, error: idError } = await supabase.rpc('get_filtered_company_ids', { filters: filtersJson });
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
    }, [buildFiltersJson]);

    // --- Effects to Trigger Fetches ---
    useEffect(() => {
        if (loadingRanges) return;
        console.log("[FilterContext] Effect 1 Triggered: Filters/Currency/Sort/PageSize changed. Fetching full set + page 1.");
        setCurrentPage(DEFAULT_PAGE);
        fetchFilteredSetAndFirstPage(filterSettings, sortState, pageSize, currentCurrency);
    }, [filterSettings, currentCurrency, pageSize, sortState, loadingRanges, fetchFilteredSetAndFirstPage]);

    useEffect(() => {
        if (loadingRanges || loadingFilteredSet) {
            console.log(`[FilterContext] Effect 2: Skipping run (initial load in progress ranges=${loadingRanges}, set=${loadingFilteredSet}).`);
            return;
        }
        if (currentPage === lastFetchedPageRef.current) {
            console.log(`[FilterContext] Effect 2: Skipping fetch for page ${currentPage} (already fetched).`);
            return;
        }
        if (currentPage !== DEFAULT_PAGE) {
            console.log(`[FilterContext] Effect 2 Triggered: Page changed to ${currentPage}. Fetching paginated data.`);
            fetchPaginatedDataOnly(currentPage, pageSize, sortState, filterSettings, currentCurrency);
        } else {
            console.log(`[FilterContext] Effect 2: Page is ${currentPage}. No fetch needed (handled by Effect 1).`);
        }
    }, [currentPage, loadingRanges, loadingFilteredSet, fetchPaginatedDataOnly]);

    // --- Function to fetch full company data ---
    const fetchCompaniesByIds = useCallback(async (ids: number[]): Promise<Company[]> => {
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

    // --- State Setters (Handlers) ---
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
    const handleSetCurrentUserTier = useCallback((tier: ColumnTier) => {
        setCurrentUserTierState(tier);
    }, []);
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
        setCurrentUserTier: handleSetCurrentUserTier,
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
        currentUserTier,
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
        loading,
        error,
        handleSetCurrentUserTier,
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