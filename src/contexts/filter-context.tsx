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
  RpcResponseRow,
  CompanyStatus,
  ColumnTier,
  Currency,
  SortState,
  FilterSettings,
  MetricConfig,
  ExchangeRateMap,
  AugmentedPriceInfo,
} from '../lib/types';
import { supabase } from '../lib/supabaseClient';
import { convertRpcRowsToCompanies } from '../lib/converters';
import { metrics as allMetricConfigs } from '../lib/metric-types';
import { isValidNumber, deepEqual, logDebug, debounce } from '../lib/utils';
import { useSubscription } from './subscription-context';
import { useCurrency } from './currency-context';
import { fetchLatestExchangeRates, convertAmount } from '../lib/currencyUtils';
import origFetchRetry from 'fetch-retry';

interface FetchedStockPrice {
  company_id: number;
  latest_price_value: number | null;
  latest_price_currency: string | null;
  latest_price_date: string | null;
}

interface SelectionState {
  selectedIds: Set<number>;
  showDeselected: boolean;
  selectionMode: 'include' | 'exclude';
  isAllSelected: boolean; // NEW: Explicit flag for "all selected" state
}

interface FilterContextType {
  currentUserTier: ColumnTier;
  filterSettings: FilterSettings;
  metricFullRanges: Record<string, [number, number]>;
  displayData: Company[];
  totalCount: number;
  effectiveTotalCount: number;
  filteredCompanyIds: Set<number>;
  activeCompanyIds: number[];
  excludedCompanyIds: Set<number>;
  loading: boolean;
  error: string | null;
  sortState: SortState;
  currentPage: number;
  pageSize: number;
  exchangeRates: ExchangeRateMap;
  selectionState: SelectionState;
  showDeselected: boolean;
  toggleCompanySelection: (companyId: number) => void;
  selectAll: () => void;
  deselectAll: () => void;
  invertSelection: () => void;
  selectByStatus: (statuses: CompanyStatus[]) => Promise<void>;
  toggleShowDeselected: () => void;
  isCompanySelected: (companyId: number) => boolean;
  getSelectedCount: () => number;
  setDevelopmentStatusFilter: (statuses: CompanyStatus[]) => void;
  setMetricRange: (db_column: string, min: number | null, max: number | null) => void;
  setSearchTerm: (term: string) => void;
  resetFilters: () => void;
  getMetricConfigByDbColumn: (db_column: string) => MetricConfig | undefined;
  setSort: (newSortState: SortState) => void;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  fetchCompaniesByIds: (ids: number[]) => Promise<Company[]>;
  searchCompanies: (query: string) => Promise<{ id: number; name: string; ticker: string }[]>;
  loadingData: boolean;
  loadingFilters: boolean;
  loadingPriceAugmentation: boolean;
  loadingExchangeRates: boolean;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

const FILTERABLE_STATUSES: CompanyStatus[] = ['producer', 'developer', 'explorer', 'royalty', 'other'];
const DEFAULT_FILTER_SETTINGS: FilterSettings = {
  developmentStatus: FILTERABLE_STATUSES,
  metricRanges: {},
  searchTerm: '',
};
const DEFAULT_SELECTION_STATE: SelectionState = {
  selectedIds: new Set(),
  showDeselected: false,
  selectionMode: 'include',
  isAllSelected: true, // Start with all selected by default
};
const DEFAULT_SORT_STATE: SortState = { key: 'company_name', direction: 'asc' };
const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 25;
const EMPTY_COMPANY_ARRAY: Company[] = [];
const EMPTY_RATE_MAP: ExchangeRateMap = {};
const EMPTY_SET = new Set<number>();
const DEBUG_FILTER_CONTEXT = process.env.NODE_ENV === 'development';

const fetchSupabaseRpcWithRetry = async (
  rpcName: string,
  rpcParams: Record<string, any> = {},
  retryOptions: { retries?: number; retryDelay?: (attempt: number) => number } = {},
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
        if (DEBUG_FILTER_CONTEXT) console.warn(`[FC] Network error in RPC '${rpcName}':`, 'color: #FFA500;', error);
        return true;
      }
      const supaError = response?.error;
      if (supaError) {
        if (DEBUG_FILTER_CONTEXT) console.warn(`%c[FC] Supabase error in RPC '${rpcName}' (Status: ${response.status}, Code: ${supaError.code}):`, 'color: #FF4500;', supaError.message);
        if (response.status === 404 && (supaError.code === 'PGRST200' || supaError.message.toLowerCase().includes('function not found'))) {
          console.error(`%c[FC] CRITICAL: RPC '${rpcName}' not found on Supabase. No retry.`, 'color: #FF0000;');
          return false;
        }
        return true;
      }
      return false;
    },
  });

  try {
    return (await retryingFetch()) as { data: any; error: any };
  } catch (error: any) {
    console.error(`%c[FC] CRITICAL: Unhandled exception in fetch-retry for RPC '${rpcName}':`, 'color: #FF0000;', error);
    return { data: null, error: error instanceof Error ? error : new Error(`Unknown exception during RPC ${rpcName}`) };
  }
};

export const FilterProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { currentUserSubscriptionTier, isLoading: isSubscriptionLoading } = useSubscription();
  const { currency: selectedDisplayCurrency } = useCurrency();
  const currentUserTier: ColumnTier = (currentUserSubscriptionTier as ColumnTier) || 'free';

  const [filterSettings, setFilterSettings] = useState<FilterSettings>(DEFAULT_FILTER_SETTINGS);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState<string>('');
  const [metricFullRanges, setMetricFullRanges] = useState<Record<string, [number, number]>>({});
  const [displayData, setDisplayData] = useState<Company[]>(EMPTY_COMPANY_ARRAY);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRateMap>(EMPTY_RATE_MAP);
  const [filteredCompanyIds, setFilteredCompanyIds] = useState<Set<number>>(EMPTY_SET);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loadingData, setLoadingData] = useState<boolean>(true);
  const [loadingFilters, setLoadingFilters] = useState<boolean>(true);
  const [loadingRanges, setLoadingRanges] = useState<boolean>(true);
  const [loadingPriceAugmentation, setLoadingPriceAugmentation] = useState<boolean>(false);
  const [loadingExchangeRates, setLoadingExchangeRates] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [sortState, setSortState] = useState<SortState>(DEFAULT_SORT_STATE);
  const [currentPage, setCurrentPage] = useState<number>(DEFAULT_PAGE);
  const [pageSize, setPageSizeState] = useState<number>(DEFAULT_PAGE_SIZE);

  const [selectionState, setSelectionState] = useState<SelectionState>(() => {
    try {
      const saved = sessionStorage.getItem('companySelectionState');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.selectedIds && Array.isArray(parsed.selectedIds) && parsed.selectedIds.length <= 500) {
          logDebug('[FC] Restored selection state from session storage');
          return {
            selectedIds: new Set(parsed.selectedIds),
            selectionMode: parsed.selectionMode || 'include',
            showDeselected: false,
            isAllSelected: parsed.isAllSelected ?? false,
          };
        }
      }
    } catch (e) {
      console.error('[FC] Failed to parse selection state from session storage:', e);
      sessionStorage.removeItem('companySelectionState');
    }
    return DEFAULT_SELECTION_STATE;
  });

  const isInitialLoadRef = useRef(true);
  const augmentedDataCacheRef = useRef<{ key: string; data: Company[] } | null>(null);

  const debouncedSearchHandler = useMemo(() => debounce((term: string) => {
    setDebouncedSearchTerm(term);
  }, 350), []);

  // Debounced filter update to prevent rapid re-fetches
  const debouncedFilterUpdate = useMemo(() => debounce(() => {
    isInitialLoadRef.current = false;
  }, 100), []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (selectionState.selectedIds.size <= 500) {
        sessionStorage.setItem('companySelectionState', JSON.stringify({
          selectedIds: Array.from(selectionState.selectedIds),
          selectionMode: selectionState.selectionMode,
          isAllSelected: selectionState.isAllSelected,
        }));
        logDebug('[FC] Saved selection state to session storage');
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [selectionState]);

  // FIXED: Proper active company IDs computation
  const activeCompanyIds = useMemo(() => {
    if (selectionState.isAllSelected && selectionState.selectionMode === 'include') {
      // All selected means all filtered companies
      return Array.from(filteredCompanyIds);
    }
    
    if (selectionState.selectionMode === 'exclude') {
      // Exclude mode: all filtered companies except those in selectedIds
      return Array.from(filteredCompanyIds).filter(id => !selectionState.selectedIds.has(id));
    }
    
    // Include mode: only those explicitly in selectedIds that are also in filtered
    return Array.from(selectionState.selectedIds).filter(id => filteredCompanyIds.has(id));
  }, [filteredCompanyIds, selectionState]);

  const excludedCompanyIds = useMemo(() => {
    const activeSet = new Set(activeCompanyIds);
    return new Set(Array.from(filteredCompanyIds).filter(id => !activeSet.has(id)));
  }, [filteredCompanyIds, activeCompanyIds]);

  const effectiveTotalCount = useMemo(() => {
    return activeCompanyIds.length;
  }, [activeCompanyIds]);

  const convertCompanyMonetaryFields = useCallback(
    (company: Company, targetCurrency: Currency, rates: ExchangeRateMap): Company => {
      if (!company) return company;
      if (
        (Object.keys(rates).length === 0 || loadingExchangeRates) &&
        targetCurrency !== 'USD' &&
        targetCurrency !== 'CAD'
      ) {
        return {
          ...company,
          share_price_currency_actual: company.share_price_currency_actual || company.financials?.market_cap_currency || 'USD',
        };
      }

      const newCompany = JSON.parse(JSON.stringify(company)) as Company;

      const fieldsToConvert: { objKey: keyof Company | null; valueKey: string; currencyKey: string }[] = [
        { objKey: null, valueKey: 'share_price', currencyKey: 'share_price_currency_actual' },
        { objKey: 'financials', valueKey: 'cash_value', currencyKey: 'cash_currency' },
        { objKey: 'financials', valueKey: 'market_cap_value', currencyKey: 'market_cap_currency' },
        { objKey: 'financials', valueKey: 'enterprise_value_value', currencyKey: 'enterprise_value_currency' },
        { objKey: 'financials', valueKey: 'net_financial_assets', currencyKey: 'net_financial_assets_currency' },
        { objKey: 'financials', valueKey: 'free_cash_flow', currencyKey: 'revenue_currency' },
        { objKey: 'financials', valueKey: 'revenue_value', currencyKey: 'revenue_currency' },
        { objKey: 'financials', valueKey: 'cost_of_revenue', currencyKey: 'revenue_currency' },
        { objKey: 'financials', valueKey: 'gross_profit', currencyKey: 'revenue_currency' },
        { objKey: 'financials', valueKey: 'operating_expense', currencyKey: 'revenue_currency' },
        { objKey: 'financials', valueKey: 'operating_income', currencyKey: 'revenue_currency' },
        { objKey: 'financials', valueKey: 'ebitda', currencyKey: 'revenue_currency' },
        { objKey: 'financials', valueKey: 'net_income_value', currencyKey: 'net_income_currency' },
        { objKey: 'financials', valueKey: 'debt_value', currencyKey: 'debt_currency' },
        { objKey: 'financials', valueKey: 'liabilities', currencyKey: 'liabilities_currency' },
        { objKey: 'financials', valueKey: 'other_financial_assets', currencyKey: 'other_financial_assets_currency' },
        { objKey: 'capital_structure', valueKey: 'options_revenue', currencyKey: 'options_revenue_currency' },
        { objKey: 'costs', valueKey: 'aisc_future', currencyKey: 'aisc_future_currency' },
        { objKey: 'costs', valueKey: 'construction_costs', currencyKey: 'construction_costs_currency' },
        { objKey: 'costs', valueKey: 'tco_future', currencyKey: 'tco_future_currency' },
        { objKey: 'costs', valueKey: 'aisc_last_quarter', currencyKey: 'aisc_last_quarter_currency' },
        { objKey: 'costs', valueKey: 'aisc_last_year', currencyKey: 'aisc_last_year_currency' },
        { objKey: 'costs', valueKey: 'aic_last_quarter', currencyKey: 'aic_last_quarter_currency' },
        { objKey: 'costs', valueKey: 'aic_last_year', currencyKey: 'aic_last_year_currency' },
        { objKey: 'costs', valueKey: 'tco_current', currencyKey: 'tco_current_currency' },
      ];

      fieldsToConvert.forEach((field) => {
        const valueHolder: any = field.objKey ? newCompany[field.objKey] : newCompany;

        if (valueHolder && typeof valueHolder === 'object') {
          const originalValue = valueHolder[field.valueKey] as number | null | undefined;
          const originalCurrency = valueHolder[field.currencyKey] as Currency | null | undefined;

          if (isValidNumber(originalValue) && originalCurrency) {
            if (originalCurrency !== targetCurrency) {
              const converted = convertAmount(originalValue, originalCurrency, targetCurrency, rates);
              if (isValidNumber(converted)) {
                valueHolder[field.valueKey] = converted;
                valueHolder[field.currencyKey] = targetCurrency;
              } else if (DEBUG_FILTER_CONTEXT) {
                console.warn(
                  `%c[FC][CurrencyConvert] Failed to convert ${String(field.objKey ? `${field.objKey}.` : '')}${field.valueKey} for ${
                    newCompany.company_name
                  } from ${originalCurrency} to ${targetCurrency}. Original value ${originalValue} kept.`,
                  'color: #BDB76B;',
                );
              }
            } else {
              valueHolder[field.currencyKey] = targetCurrency;
            }
          }
        }
      });

      return newCompany;
    },
    [loadingExchangeRates]
  );

  // FIXED: Memoized augmentation to prevent repeated calls
  const augmentCompaniesWithStockPrices = useCallback(
    async (companiesToAugment: Company[]): Promise<Company[]> => {
      if (DEBUG_FILTER_CONTEXT)
        console.log('%c[FC][Augment] augmentCompaniesWithStockPrices called.', 'color: #4682B4;');
      if (!companiesToAugment || companiesToAugment.length === 0) {
        return companiesToAugment;
      }

      // Check cache
      const cacheKey = companiesToAugment.map(c => c.company_id).join(',');
      if (augmentedDataCacheRef.current?.key === cacheKey) {
        if (DEBUG_FILTER_CONTEXT) console.log('%c[FC][Augment] Returning cached augmented data.', 'color: #4682B4;');
        return augmentedDataCacheRef.current.data;
      }

      const companyIds = companiesToAugment
        .map((c) => c.company_id)
        .filter((id): id is number => id != null && typeof id === 'number');
      if (companyIds.length === 0) {
        return companiesToAugment;
      }

      if (DEBUG_FILTER_CONTEXT)
        console.log(`%c[FC][Augment] Starting price augmentation for ${companyIds.length} companies.`, 'color: #4682B4;');
      setLoadingPriceAugmentation(true);

      try {
        const { data: rpcStockPriceData, error: stockPriceError } = await fetchSupabaseRpcWithRetry(
          'get_latest_stock_prices',
          { company_ids_array: companyIds },
        );

        if (stockPriceError) {
          console.error(
            '%c[FC][Augment] Error fetching latest stock prices from RPC:',
            'color: #FF0000;',
            stockPriceError.message,
          );
          return companiesToAugment.map((company) => ({
            ...company,
            share_price_source_actual: company.share_price_source_actual || 'calculated_from_market_cap',
            share_price_currency_actual: company.share_price_currency_actual || company.financials?.market_cap_currency || 'USD',
            share_price_date_actual: company.share_price_date_actual || null,
          }));
        }

        const stockPriceData = rpcStockPriceData as FetchedStockPrice[] | null;
        const priceMap = new Map<number, AugmentedPriceInfo & { latest_price_value?: number | null }>();

        if (stockPriceData) {
          if (DEBUG_FILTER_CONTEXT)
            console.log(
              `%c[FC][Augment] Received ${stockPriceData.length} stock price entries from RPC.`,
              'color: #4682B4;',
            );
          stockPriceData.forEach((sp) => {
            if (sp.latest_price_date && isValidNumber(sp.latest_price_value) && sp.latest_price_currency) {
              const priceDate = new Date(sp.latest_price_date);
              const roughlyOneWeekAgo = new Date();
              roughlyOneWeekAgo.setDate(roughlyOneWeekAgo.getDate() - 7);
              roughlyOneWeekAgo.setHours(0, 0, 0, 0);

              if (!isNaN(priceDate.getTime())) {
                priceMap.set(sp.company_id, {
                  latest_price_value: sp.latest_price_value,
                  share_price_currency_actual: sp.latest_price_currency as Currency,
                  share_price_date_actual: sp.latest_price_date,
                  share_price_source_actual: priceDate >= roughlyOneWeekAgo ? 'stock_prices_table' : 'stock_prices_table_old',
                });
              } else if (DEBUG_FILTER_CONTEXT) {
                console.warn(
                  `%c[FC][Augment] Invalid priceDate for company ${sp.company_id}: ${sp.latest_price_date}`,
                  'color: #BDB76B;',
                );
              }
            } else if (DEBUG_FILTER_CONTEXT) {
              console.log(
                `%c[FC][Augment] Skipped stock price for company ${sp.company_id} due to missing/invalid data.`,
                'color: #B0C4DE;',
              );
            }
          });
        } else if (DEBUG_FILTER_CONTEXT) {
          console.log('%c[FC][Augment] No stock price data array returned from RPC.', 'color: #B0C4DE;');
        }

        const augmentedOutput = companiesToAugment.map((company) => {
          const stockPriceInfo = priceMap.get(company.company_id);
          let updatedCompany = { ...company };

          if (
            stockPriceInfo &&
            stockPriceInfo.share_price_source_actual === 'stock_prices_table' &&
            isValidNumber(stockPriceInfo.latest_price_value)
          ) {
            updatedCompany = {
              ...updatedCompany,
              share_price: stockPriceInfo.latest_price_value,
              share_price_currency_actual: stockPriceInfo.share_price_currency_actual,
              share_price_date_actual: stockPriceInfo.share_price_date_actual,
              share_price_source_actual: 'stock_prices_table',
            };
          } else if (stockPriceInfo && stockPriceInfo.share_price_source_actual === 'stock_prices_table_old') {
            updatedCompany = {
              ...updatedCompany,
              share_price_currency_actual: stockPriceInfo.share_price_currency_actual,
              share_price_date_actual: stockPriceInfo.share_price_date_actual,
              share_price_source_actual: 'stock_prices_table_old',
            };
          } else {
            updatedCompany = {
              ...updatedCompany,
              share_price_source_actual: company.share_price_source_actual || 'calculated_from_market_cap',
              share_price_currency_actual:
                company.share_price_currency_actual || company.financials?.market_cap_currency || 'USD',
            };
          }

          return updatedCompany;
        });

        // Cache the result
        augmentedDataCacheRef.current = { key: cacheKey, data: augmentedOutput };

        if (DEBUG_FILTER_CONTEXT)
          console.log(
            `%c[FC][Augment] Price augmentation applied. Output companies: ${augmentedOutput.length}`,
            'color: #4682B4;',
          );
        return augmentedOutput;
      } catch (error: any) {
        console.error(
          '%c[FC][Augment] Exception during price augmentation process:',
          'color: #FF0000;',
          error,
        );
        return companiesToAugment.map((c) => ({
          ...c,
          share_price_source_actual: 'calculated_from_market_cap',
          share_price_currency_actual: c.financials?.market_cap_currency || 'USD',
        }));
      } finally {
        setLoadingPriceAugmentation(false);
      }
    },
    []
  );

  const loading = useMemo(
    () => isSubscriptionLoading || loadingRanges || loadingFilters || loadingData || loadingExchangeRates,
    [isSubscriptionLoading, loadingRanges, loadingFilters, loadingData, loadingExchangeRates]
  );

  useEffect(() => {
    let mounted = true;
    const loadRates = async () => {
      if (DEBUG_FILTER_CONTEXT) console.log('%c[FC][Effect] Fetching exchange rates.', 'color: #ADD8E6;');
      setLoadingExchangeRates(true);
      try {
        const rates = await fetchLatestExchangeRates();
        if (mounted) {
          setExchangeRates(rates);
          if (DEBUG_FILTER_CONTEXT)
            console.log(
              '%c[FC][Effect] Exchange rates loaded:',
              'color: #ADD8E6;',
              Object.keys(rates).length > 0 ? 'Success' : 'No rates found.',
            );
        }
      } catch (err: any) {
        if (mounted) {
          console.error('%c[FC][Effect] Error fetching exchange rates:', 'color: #FF0000;', err);
          setError(`Failed to load exchange rates: ${err.message || 'Unknown error'}`);
          setExchangeRates(EMPTY_RATE_MAP);
        }
      } finally {
        if (mounted) setLoadingExchangeRates(false);
      }
    };
    loadRates();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const fetchFullRanges = async () => {
      if (!mounted) return;
      setLoadingRanges(true);
      setError(null);
      if (DEBUG_FILTER_CONTEXT) console.log('%c[FC][Effect] Fetching global metric ranges.', 'color: #ADD8E6;');
      try {
        const { data, error: rpcError } = await fetchSupabaseRpcWithRetry('get_metrics_ranges');
        if (!mounted) return;
        if (rpcError) throw rpcError;
        setMetricFullRanges((data as Record<string, [number, number]>) ?? {});
        if (DEBUG_FILTER_CONTEXT)
          console.log('%c[FC][Effect] Global metric ranges fetched successfully.', 'color: #ADD8E6;');
      } catch (err: any) {
        if (!mounted) return;
        console.error('%c[FC][Effect] Error fetching global metric ranges:', 'color: #FF0000;', err.message);
        setError(`Failed to load metric ranges: ${err.message || 'Unknown error'}`);
        setMetricFullRanges({});
      } finally {
        if (mounted) setLoadingRanges(false);
      }
    };
    fetchFullRanges();
    return () => {
      mounted = false;
    };
  }, []);

  const buildFiltersJson = useCallback((settings: FilterSettings): Record<string, any> => {
    const filtersJson: Record<string, any> = {};
    if (settings.developmentStatus?.length > 0 && settings.developmentStatus.length < FILTERABLE_STATUSES.length) {
      filtersJson.status = settings.developmentStatus;
    }
    const searchTerm = settings.searchTerm?.trim();
    if (searchTerm) {
      filtersJson.searchTerm = searchTerm;
    }
    if (settings.metricRanges) {
      Object.entries(settings.metricRanges).forEach(([db_column, range]) => {
        if (range && (isValidNumber(range[0]) || isValidNumber(range[1]))) {
          const fullRange = metricFullRanges[db_column];
          if (isValidNumber(range[0]) && range[0] !== fullRange?.[0]) {
            filtersJson[`min_${db_column}`] = range[0];
          }
          if (isValidNumber(range[1]) && range[1] !== fullRange?.[1]) {
            filtersJson[`max_${db_column}`] = range[1];
          }
        }
      });
    }
    return filtersJson;
  }, [metricFullRanges]);

  useEffect(() => {
    let active = true;
    const effectiveFilters = { ...filterSettings, searchTerm: debouncedSearchTerm };

    if (isInitialLoadRef.current) return;
    if (isSubscriptionLoading || loadingRanges || loadingExchangeRates) return;

    logDebug('[FC][Effect] Triggering full data refetch due to filter/sort/size change.');
    setLoadingFilters(true);
    setLoadingData(true);
    setError(null);
    setCurrentPage(DEFAULT_PAGE);

    const fetchAllNewData = async () => {
      const filtersJson = buildFiltersJson(effectiveFilters);

      try {
        const { data: idData, error: idError } = await fetchSupabaseRpcWithRetry('get_filtered_company_ids', { filters: filtersJson });
        if (!active) return;
        if (idError) throw idError;

        const newIds = new Set((idData || []).map((r: { company_id: number }) => r.company_id));
        setFilteredCompanyIds(newIds);
        setTotalCount(newIds.size);
        setLoadingFilters(false);

        const { data: pageData, error: pageError } = await fetchSupabaseRpcWithRetry('get_companies_paginated', {
          filters: filtersJson,
          sort_column: sortState.key,
          sort_direction: sortState.direction,
          page_num: DEFAULT_PAGE,
          page_size: pageSize,
        });
        if (!active) return;
        if (pageError) throw pageError;

        const converted = convertRpcRowsToCompanies((pageData as RpcResponseRow[]) || []);
        const augmented = await augmentCompaniesWithStockPrices(converted);
        const finalData = augmented.map(c => convertCompanyMonetaryFields(c, selectedDisplayCurrency, exchangeRates));
        setDisplayData(finalData);

      } catch (err: any) {
        if (!active) return;
        console.error('[FC][Effect] Error during full data refetch:', err);
        setError(`Failed to load data: ${err.message}`);
        setFilteredCompanyIds(EMPTY_SET);
        setDisplayData(EMPTY_COMPANY_ARRAY);
        setTotalCount(0);
        setLoadingFilters(false);
      } finally {
        if (active) setLoadingData(false);
      }
    };

    fetchAllNewData();
    return () => { active = false; };
  }, [filterSettings, debouncedSearchTerm, sortState, pageSize, isSubscriptionLoading, loadingRanges, loadingExchangeRates, buildFiltersJson, augmentCompaniesWithStockPrices, selectedDisplayCurrency, exchangeRates, convertCompanyMonetaryFields]);

  useEffect(() => {
    let active = true;
    if (isInitialLoadRef.current || currentPage === 1) {
      isInitialLoadRef.current = false;
      return;
    }
    if (loadingFilters) return;

    logDebug(`[FC][Effect] Paginating to page ${currentPage}.`);
    setLoadingData(true);
    setError(null);

    const fetchPageData = async () => {
      const filtersJson = buildFiltersJson({ ...filterSettings, searchTerm: debouncedSearchTerm });
      try {
        const { data, error } = await fetchSupabaseRpcWithRetry('get_companies_paginated', {
          filters: filtersJson,
          sort_column: sortState.key,
          sort_direction: sortState.direction,
          page_num: currentPage,
          page_size: pageSize,
        });
        if (!active) return;
        if (error) throw error;

        const converted = convertRpcRowsToCompanies((data as RpcResponseRow[]) || []);
        const augmented = await augmentCompaniesWithStockPrices(converted);
        const finalData = augmented.map(c => convertCompanyMonetaryFields(c, selectedDisplayCurrency, exchangeRates));
        setDisplayData(finalData);

      } catch (err: any) {
        if (!active) return;
        console.error(`[FC][Effect] Error fetching page ${currentPage}:`, err);
        setError(`Failed to fetch page ${currentPage}: ${err.message}`);
      } finally {
        if (active) setLoadingData(false);
      }
    };

    fetchPageData();
    return () => { active = false; };
  }, [currentPage, filterSettings, debouncedSearchTerm, sortState, pageSize, loadingFilters, buildFiltersJson, augmentCompaniesWithStockPrices, selectedDisplayCurrency, exchangeRates, convertCompanyMonetaryFields]);

  const setSearchTerm = useCallback((term: string) => {
    setFilterSettings(prev => ({ ...prev, searchTerm: term }));
    debouncedSearchHandler(term);
    debouncedFilterUpdate();
  }, [debouncedSearchHandler, debouncedFilterUpdate]);

  const setDevelopmentStatusFilter = useCallback((statuses: CompanyStatus[]) => {
    setFilterSettings((prev) => {
      if (deepEqual(prev.developmentStatus, statuses)) return prev;
      return { ...prev, developmentStatus: statuses };
    });
    debouncedFilterUpdate();
  }, [debouncedFilterUpdate]);

  const setMetricRange = useCallback((db_column: string, min: number | null, max: number | null) => {
    setFilterSettings((prev) => {
      const newRanges = { ...prev.metricRanges, [db_column]: [min, max] as [number | null, number | null] };
      if (min === null && max === null) {
        delete newRanges[db_column];
      }
      if (deepEqual(prev.metricRanges, newRanges)) return prev;
      return { ...prev, metricRanges: newRanges };
    });
    debouncedFilterUpdate();
  }, [debouncedFilterUpdate]);

  const resetFilters = useCallback(() => {
    logDebug('[FC] Resetting all filters');
    setFilterSettings(DEFAULT_FILTER_SETTINGS);
    setDebouncedSearchTerm('');
    setSortState(DEFAULT_SORT_STATE);
    setSelectionState(DEFAULT_SELECTION_STATE);
    setCurrentPage(DEFAULT_PAGE);
    debouncedFilterUpdate();
  }, [debouncedFilterUpdate]);

  const setSort = useCallback((newSortState: SortState) => {
    setSortState(prev => {
      if (deepEqual(prev, newSortState)) return prev;
      return newSortState;
    });
    debouncedFilterUpdate();
  }, [debouncedFilterUpdate]);

  const setPageSize = useCallback((size: number) => {
    setPageSizeState(prev => {
      if (prev === size) return prev;
      return size;
    });
    debouncedFilterUpdate();
  }, [debouncedFilterUpdate]);

  const setPage = useCallback((page: number) => {
    const maxPage = Math.max(1, Math.ceil(effectiveTotalCount / pageSize));
    const newPage = Math.max(1, Math.min(page, maxPage));
    setCurrentPage(prev => {
      if (prev === newPage) return prev;
      return newPage;
    });
  }, [effectiveTotalCount, pageSize]);

  // FIXED: Proper toggle logic
  const toggleCompanySelection = useCallback((companyId: number) => {
    if (!Number.isFinite(companyId)) return;
    
    setSelectionState(prev => {
      const { selectedIds, selectionMode, isAllSelected } = prev;
      const newSelectedIds = new Set(selectedIds);

      // If we're in "all selected" mode, we need to switch to explicit selection
      if (isAllSelected && selectionMode === 'include') {
        // Create a set of all filtered companies except this one
        const allExceptOne = new Set(filteredCompanyIds);
        allExceptOne.delete(companyId);
        return {
          ...prev,
          selectedIds: allExceptOne,
          isAllSelected: false,
          selectionMode: 'exclude', // Switch to exclude mode to deselect this one
        };
      }

      // Normal toggle logic
      if (newSelectedIds.has(companyId)) {
        newSelectedIds.delete(companyId);
      } else {
        newSelectedIds.add(companyId);
      }

      return { ...prev, selectedIds: newSelectedIds };
    });
  }, [filteredCompanyIds]);

  const selectAll = useCallback(() => {
    setSelectionState(prev => ({
      ...prev,
      selectedIds: EMPTY_SET,
      selectionMode: 'include',
      isAllSelected: true,
    }));
  }, []);

  const deselectAll = useCallback(() => {
    setSelectionState(prev => ({
      ...prev,
      selectedIds: EMPTY_SET,
      selectionMode: 'include',
      isAllSelected: false,
    }));
  }, []);

  const invertSelection = useCallback(() => {
    logDebug('[FC] Inverting selection.');
    
    setSelectionState(prev => {
      if (prev.isAllSelected && prev.selectionMode === 'include') {
        // If all are selected, deselect all
        return {
          ...prev,
          selectedIds: EMPTY_SET,
          selectionMode: 'include',
          isAllSelected: false,
        };
      }
      
      if (!prev.isAllSelected && prev.selectedIds.size === 0) {
        // If none are selected, select all
        return {
          ...prev,
          selectedIds: EMPTY_SET,
          selectionMode: 'include',
          isAllSelected: true,
        };
      }
      
      // Otherwise, invert the current selection
      const currentlySelected = new Set(activeCompanyIds);
      const inverted = new Set(Array.from(filteredCompanyIds).filter(id => !currentlySelected.has(id)));
      
      return {
        ...prev,
        selectedIds: inverted,
        selectionMode: 'include',
        isAllSelected: false,
      };
    });
  }, [activeCompanyIds, filteredCompanyIds]);

  const toggleShowDeselected = useCallback(() => {
    setSelectionState(prev => ({ ...prev, showDeselected: !prev.showDeselected }));
  }, []);

  // FIXED: Proper isCompanySelected logic
  const isCompanySelected = useCallback((companyId: number): boolean => {
    if (selectionState.isAllSelected && selectionState.selectionMode === 'include') {
      return true;
    }
    
    if (selectionState.selectionMode === 'include') {
      return selectionState.selectedIds.has(companyId);
    }
    
    // Exclude mode
    return !selectionState.selectedIds.has(companyId);
  }, [selectionState]);

  const getSelectedCount = useCallback(() => effectiveTotalCount, [effectiveTotalCount]);

  const getMetricConfigByDbColumn = useCallback((db_column: string) => {
    return allMetricConfigs.find((m) => m.db_column === db_column);
  }, []);

  const fetchCompaniesByIds = useCallback(async (ids: number[]): Promise<Company[]> => {
    if (!ids || ids.length === 0) return EMPTY_COMPANY_ARRAY;
    const CHUNK_SIZE = 500;
    const chunks: number[][] = [];
    for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
      chunks.push(ids.slice(i, i + CHUNK_SIZE));
    }

    if (DEBUG_FILTER_CONTEXT)
      console.log(`%c[FC][Callback] fetchCompaniesByIds called for ${ids.length} IDs across ${chunks.length} chunks.`, 'color: #191970;');

    setError(null);

    let allFetchedCompanies: Company[] = [];
    for (const chunk of chunks) {
      let attempts = 0;
      const maxAttempts = 3;
      while (attempts < maxAttempts) {
        try {
          const { data, error: viewError } = await supabase
            .from('companies_detailed_view')
            .select('*')
            .in('company_id', chunk);

          if (viewError) throw viewError;
          if (data) {
            allFetchedCompanies = allFetchedCompanies.concat(convertRpcRowsToCompanies(data as RpcResponseRow[]));
          }
          break;
        } catch (err: any) {
          attempts++;
          if (attempts === maxAttempts) {
            console.error('%c[FC][Callback] fetchCompaniesByIds error after retries:', 'color: #FF0000;', err);
            setError(`Failed to load company details by IDs: ${err.message || 'Unknown error'}`);
            return EMPTY_COMPANY_ARRAY;
          }
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts) * 1000));
        }
      }
    }

    const augmentedCompanyData = await augmentCompaniesWithStockPrices(allFetchedCompanies);
    const currencyConvertedData = augmentedCompanyData.map((company) =>
      convertCompanyMonetaryFields(company, selectedDisplayCurrency, exchangeRates),
    );

    if (DEBUG_FILTER_CONTEXT)
      console.log(
        `%c[FC][Callback] fetchCompaniesByIds processed ${currencyConvertedData.length} companies.`,
        'color: #191970;',
      );
    return currencyConvertedData;
  }, [augmentCompaniesWithStockPrices, convertCompanyMonetaryFields, selectedDisplayCurrency, exchangeRates]);

  const searchCompanies = useCallback(async (query: string): Promise<{ id: number; name: string; ticker: string }[]> => {
    if (!query || query.trim().length < 2) {
      return [];
    }

    if (DEBUG_FILTER_CONTEXT)
      console.log(`%c[FC][Callback] Searching companies with query: "${query}"`, 'color: #8B008B;');

    try {
      const { data, error } = await fetchSupabaseRpcWithRetry('search_companies', {
        query: query.trim(),
        limit_count: 10,
      });

      if (error) {
        console.error('%c[FC][Callback] Search companies error:', 'color: #FF0000;', error);
        return [];
      }

      const results = (data as any[] || []).map((row) => ({
        id: row.company_id,
        name: row.company_name,
        ticker: row.tsx_code || '',
      }));

      if (DEBUG_FILTER_CONTEXT)
        console.log(`%c[FC][Callback] Search found ${results.length} companies.`, 'color: #8B008B;');
      return results;
    } catch (err: any) {
      console.error('%c[FC][Callback] Search companies exception:', 'color: #FF0000;', err);
      return [];
    }
  }, []);

  const selectByStatus = useCallback(async (statuses: CompanyStatus[]) => {
    if (!Array.isArray(statuses) || statuses.length === 0) return;
    try {
      const { data, error } = await fetchSupabaseRpcWithRetry('get_filtered_company_ids', { filters: { status: statuses } });
      if (error) throw error;

      const idsMatchingStatus = new Set((data as { company_id: number }[] || []).map(r => r.company_id));
      const newSelectedIds = new Set(Array.from(filteredCompanyIds).filter(id => idsMatchingStatus.has(id)));

      setSelectionState(prev => ({ 
        ...prev, 
        selectedIds: newSelectedIds, 
        selectionMode: 'include',
        isAllSelected: false 
      }));
    } catch (err: any) {
      console.error('[FC] Error selecting by status:', err.message);
      setError('Could not select companies by status.');
    }
  }, [filteredCompanyIds]);

  const value = useMemo<FilterContextType>(() => ({
    currentUserTier,
    filterSettings,
    metricFullRanges,
    displayData,
    totalCount,
    effectiveTotalCount,
    filteredCompanyIds,
    activeCompanyIds,
    excludedCompanyIds,
    loading,
    error,
    sortState,
    currentPage,
    pageSize,
    exchangeRates,
    selectionState,
    showDeselected: selectionState.showDeselected,
    toggleCompanySelection,
    selectAll,
    deselectAll,
    invertSelection,
    selectByStatus,
    toggleShowDeselected,
    isCompanySelected,
    getSelectedCount,
    setDevelopmentStatusFilter,
    setMetricRange,
    setSearchTerm,
    resetFilters,
    getMetricConfigByDbColumn,
    setSort,
    setPage,
    setPageSize,
    fetchCompaniesByIds,
    searchCompanies,
    loadingData,
    loadingFilters,
    loadingPriceAugmentation,
    loadingExchangeRates,
  }), [
    currentUserTier,
    filterSettings,
    metricFullRanges,
    displayData,
    totalCount,
    effectiveTotalCount,
    filteredCompanyIds,
    activeCompanyIds,
    excludedCompanyIds,
    loading,
    error,
    sortState,
    currentPage,
    pageSize,
    exchangeRates,
    selectionState,
    toggleCompanySelection,
    selectAll,
    deselectAll,
    invertSelection,
    selectByStatus,
    toggleShowDeselected,
    isCompanySelected,
    getSelectedCount,
    setDevelopmentStatusFilter,
    setMetricRange,
    setSearchTerm,
    resetFilters,
    getMetricConfigByDbColumn,
    setSort,
    setPage,
    setPageSize,
    fetchCompaniesByIds,
    searchCompanies,
    loadingData,
    loadingFilters,
    loadingPriceAugmentation,
    loadingExchangeRates,
  ]);

  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>;
};

export const useFilters = (): FilterContextType => {
  const context = useContext(FilterContext);
  if (context === undefined) {
    throw new Error('useFilters must be used within a FilterProvider.');
  }
  return context;
};