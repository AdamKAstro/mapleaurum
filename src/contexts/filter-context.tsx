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
  ExchangeRateMap, // Added for exchange rates
  AugmentedPriceInfo // For priceMap in augmentCompaniesWithStockPrices
} from '../lib/types';
import { supabase } from '../lib/supabaseClient';
import { convertRpcRowsToCompanies } from '../lib/converters';
import { metrics as allMetricConfigs } from '../lib/metric-types';
import { isValidNumber } from '../lib/utils';
import { useSubscription } from './subscription-context';
import { useCurrency } from './currency-context'; // Import useCurrency
import { fetchLatestExchangeRates, convertAmount } from '../lib/currencyUtils'; // Import currency utilities
import origFetchRetry from 'fetch-retry';

// Type for the data returned by RPC function `get_latest_stock_prices` (as in user's file)
interface FetchedStockPrice {
  company_id: number;
  latest_price_value: number | null;
  latest_price_currency: string | null; // Should ideally be Currency type
  latest_price_date: string | null;
}

interface FilterContextType {
  currentUserTier: ColumnTier;
  // currentCurrency: Currency; // REMOVED - Sourced from useCurrency() directly in components or passed where needed
  filterSettings: FilterSettings;
  metricFullRanges: Record<string, [number, number]>;
  displayData: Company[]; // This will be the CURRENCY-CONVERTED data
  totalCount: number;
  effectiveTotalCount: number;
  filteredCompanyIds: number[];
  excludedCompanyIds: Set<number>;
  toggleCompanyExclusion: (companyId: number) => void;
  loadingPaginated: boolean;
  loadingRanges: boolean;
  loadingFilteredSet: boolean;
  loadingPriceAugmentation: boolean;
  loadingExchangeRates: boolean; // NEW
  loading: boolean;
  error: string | null;
  // setCurrentCurrency: (currency: Currency) => void; // REMOVED
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
  fetchCompaniesByIds: (ids: number[]) => Promise<Company[]>; // Will implicitly use selectedDisplayCurrency for conversion
  exchangeRates: ExchangeRateMap; // Expose rates
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
const EMPTY_RATE_MAP: ExchangeRateMap = {}; // NEW
const DEBUG_FILTER_CONTEXT = process.env.NODE_ENV === 'development'; // For conditional logging

// fetchSupabaseRpcWithRetry - Using user's provided robust version
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

  // Pass fetcher directly to origFetchRetry
  const retryingFetch = origFetchRetry(fetcher, {
    retries: options.retries,
    retryDelay: options.retryDelay,
    retryOn: async (_attempt: number, error: any, response: any) => {
      if (error) { if (DEBUG_FILTER_CONTEXT) console.warn(`[FC] RPC NetErr '${rpcName}':`, error); return true; }
      if (response && response.error) {
        const supaError = response.error;
        if (DEBUG_FILTER_CONTEXT) console.warn(`[FC] RPC SupaErr '${rpcName}' (S:${response.status},C:${supaError.code}):`, supaError.message);
        if (response.status === 404 && (supaError.code === 'PGRST200' || supaError.message.toLowerCase().includes('function not found'))) {
          console.error(`[FC] CRITICAL: RPC '${rpcName}' not found on Supabase. No Retry.`); return false;
        }
        return true;
      }
      return false;
    },
  });
  try {
    return await retryingFetch() as { data: any; error: any };
  } catch (error: any) {
    console.error(`[FC] CRITICAL: Unhandled Exception from fetch-retry for RPC '${rpcName}':`, error);
    return { data: null, error: error instanceof Error ? error : new Error(String(error.message || `Unknown exception during RPC ${rpcName}`)) };
  }
};


export const FilterProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { currentUserSubscriptionTier, isLoading: isSubscriptionLoading } = useSubscription();
  const { currency: selectedDisplayCurrency } = useCurrency(); // Get selected display currency
  const currentUserTier: ColumnTier = currentUserSubscriptionTier as ColumnTier || 'free';

  const [filterSettings, setFilterSettings] = useState<FilterSettings>(DEFAULT_FILTER_SETTINGS);
  const [metricFullRanges, setMetricFullRanges] = useState<Record<string, [number, number]>>({});
  const [rawDisplayData, setRawDisplayData] = useState<Company[]>(EMPTY_COMPANY_ARRAY); // Stores data in original currencies
  const [exchangeRates, setExchangeRates] = useState<ExchangeRateMap>(EMPTY_RATE_MAP);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [filteredCompanyIds, setFilteredCompanyIds] = useState<number[]>(EMPTY_ID_ARRAY);
  const [excludedCompanyIds, setExcludedCompanyIds] = useState<Set<number>>(EMPTY_SET);
  
  const [loadingPaginated, setLoadingPaginated] = useState<boolean>(false);
  const [loadingRanges, setLoadingRanges] = useState<boolean>(true);
  const [loadingFilteredSet, setLoadingFilteredSet] = useState<boolean>(true);
  const [loadingPriceAugmentation, setLoadingPriceAugmentation] = useState<boolean>(false);
  const [loadingExchangeRates, setLoadingExchangeRates] = useState<boolean>(true);
  
  const [error, setError] = useState<string | null>(null);
  const [sortState, setSortState] = useState<SortState>(DEFAULT_SORT_STATE);
  const [currentPage, setCurrentPage] = useState<number>(DEFAULT_PAGE);
  const [pageSize, setPageSizeState] = useState<number>(DEFAULT_PAGE_SIZE);
  const lastFetchedPageRef = useRef<number>(0);

  // Fetch exchange rates on mount
  useEffect(() => {
    let mounted = true;
    const loadRates = async () => {
      if (DEBUG_FILTER_CONTEXT) console.log("[FilterContext] useEffect: Triggered loadRates to fetch exchange rates.");
      setLoadingExchangeRates(true);
      try {
        const rates = await fetchLatestExchangeRates(); // From currencyUtils.ts
        if (mounted) {
          setExchangeRates(rates);
          if (DEBUG_FILTER_CONTEXT) console.log("[FilterContext] Exchange rates loaded:", Object.keys(rates).length > 0 ? rates : "No rates returned/found.");
        }
      } catch (err: any) {
        if (mounted) {
          console.error("[FilterContext] Error fetching exchange rates:", err);
          setError(`Failed to load exchange rates: ${err.message || 'Unknown error'}`);
          setExchangeRates(EMPTY_RATE_MAP); // Set to empty on error
        }
      } finally {
        if (mounted) setLoadingExchangeRates(false);
      }
    };
    loadRates();
    return () => { mounted = false; };
  }, []); // Fetch rates once on mount

  const effectiveTotalCount = useMemo(() => {
    const count = totalCount - excludedCompanyIds.size;
    return Math.max(0, count);
  }, [totalCount, excludedCompanyIds]);

  // NEW: Utility to convert monetary fields of a single company object
  const convertCompanyMonetaryFields = useCallback((company: Company, targetCurrency: Currency, rates: ExchangeRateMap): Company => {
    if (!company) return company;
    if ((Object.keys(rates).length === 0 || loadingExchangeRates) && targetCurrency !== 'USD' && targetCurrency !== 'CAD') { // Example base currencies
      // Potentially skip conversion if rates aren't ready and not targeting a common base.
      // Or ensure this function is only called when rates ARE ready.
      if (DEBUG_FILTER_CONTEXT) console.warn(`[FilterContext][CurrencyConvert] Skipping conversion for ${company.company_name}; rates not ready or empty, and target is ${targetCurrency}.`);
      return company;
    }

    // Deep clone to avoid mutating the original objects in rawDisplayData
    const newCompany = JSON.parse(JSON.stringify(company)) as Company;

    // Define which fields and their original currency keys need conversion
    const fieldsToConvert: {
        objKey: keyof Company | null; // Path to the object holding the value and currency (null for top-level)
        valueKey: string;             // Key of the numeric value field
        currencyKey: string;          // Key of the currency code field for that value
    }[] = [
        { objKey: null, valueKey: 'share_price', currencyKey: 'share_price_currency_actual' },
        // Financials
        { objKey: 'financials', valueKey: 'cash_value', currencyKey: 'cash_currency' },
        { objKey: 'financials', valueKey: 'market_cap_value', currencyKey: 'market_cap_currency' },
        { objKey: 'financials', valueKey: 'enterprise_value_value', currencyKey: 'enterprise_value_currency' },
        { objKey: 'financials', valueKey: 'net_financial_assets', currencyKey: 'net_financial_assets_currency' },
        { objKey: 'financials', valueKey: 'free_cash_flow', currencyKey: 'revenue_currency' }, // Assuming FCF is in revenue's currency, adjust if different
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
        // Capital Structure
        { objKey: 'capital_structure', valueKey: 'options_revenue', currencyKey: 'options_revenue_currency'},
        // Costs
        { objKey: 'costs', valueKey: 'aisc_future', currencyKey: 'aisc_future_currency'},
        { objKey: 'costs', valueKey: 'construction_costs', currencyKey: 'construction_costs_currency'},
        { objKey: 'costs', valueKey: 'tco_future', currencyKey: 'tco_future_currency'},
        { objKey: 'costs', valueKey: 'aisc_last_quarter', currencyKey: 'aisc_last_quarter_currency'},
        { objKey: 'costs', valueKey: 'aisc_last_year', currencyKey: 'aisc_last_year_currency'},
        { objKey: 'costs', valueKey: 'aic_last_quarter', currencyKey: 'aic_last_quarter_currency'},
        { objKey: 'costs', valueKey: 'aic_last_year', currencyKey: 'aic_last_year_currency'},
        { objKey: 'costs', valueKey: 'tco_current', currencyKey: 'tco_current_currency'},
    ];

    fieldsToConvert.forEach(field => {
        let valueHolder: any = field.objKey ? newCompany[field.objKey] : newCompany;
        
        if (valueHolder && typeof valueHolder === 'object') { // Ensure the sub-object exists
            const originalValue = valueHolder[field.valueKey] as number | null | undefined;
            const originalCurrency = valueHolder[field.currencyKey] as Currency | null | undefined;

            if (isValidNumber(originalValue) && originalCurrency && originalCurrency !== targetCurrency) {
                const converted = convertAmount(originalValue, originalCurrency, targetCurrency, rates);
                if (isValidNumber(converted)) {
                    valueHolder[field.valueKey] = converted;
                    valueHolder[field.currencyKey] = targetCurrency; // Update the currency field
                } else {
                    if (DEBUG_FILTER_CONTEXT) console.warn(`[FilterContext][CurrencyConvert] Failed to convert ${String(field.objKey)}.${field.valueKey} for ${newCompany.company_name} from ${originalCurrency} to ${targetCurrency}. Original value ${originalValue} kept.`);
                }
            } else if (isValidNumber(originalValue) && originalCurrency && originalCurrency === targetCurrency) {
                // Already in target currency, ensure currency key reflects this if it was different (e.g. from augmentation)
                valueHolder[field.currencyKey] = targetCurrency;
            }
        }
    });
    return newCompany;
  }, []); // Does not depend on state, only arguments

  // This is the displayData exposed to the components, now currency-converted.
  const displayData = useMemo(() => {
    if (loadingExchangeRates) { // If rates are still loading, return the unconverted data to avoid flicker or errors
        if (DEBUG_FILTER_CONTEXT) console.log("[FilterContext][DisplayDataMemo] Exchange rates loading, returning raw (unconverted) data for now.");
        return rawDisplayData;
    }
    if (Object.keys(exchangeRates).length === 0 && selectedDisplayCurrency !== 'USD' && selectedDisplayCurrency !== 'CAD') { // Or other default/base currencies
        if (DEBUG_FILTER_CONTEXT) console.warn(`[FilterContext][DisplayDataMemo] Exchange rates map is empty and target currency (${selectedDisplayCurrency}) is not a base. Returning raw (unconverted) data.`);
        return rawDisplayData;
    }

    if (DEBUG_FILTER_CONTEXT) console.log(`[FilterContext][DisplayDataMemo] Re-calculating/converting displayData for currency: ${selectedDisplayCurrency}. Raw data count: ${rawDisplayData.length}. Rates available: ${Object.keys(exchangeRates).length > 0}`);
    
    return rawDisplayData.map(company => 
        convertCompanyMonetaryFields(company, selectedDisplayCurrency, exchangeRates)
    );
  }, [rawDisplayData, selectedDisplayCurrency, exchangeRates, loadingExchangeRates, convertCompanyMonetaryFields]);

  // augmentCompaniesWithStockPrices (Using user's version)
  const augmentCompaniesWithStockPrices = useCallback(async (companiesToAugment: Company[]): Promise<Company[]> => {
    if (!companiesToAugment || companiesToAugment.length === 0) {
      return companiesToAugment;
    }
    const companyIds = companiesToAugment.map(c => c.company_id).filter(id => id != null && typeof id === 'number') as number[];
    if (companyIds.length === 0) {
      return companiesToAugment;
    }
    if (DEBUG_FILTER_CONTEXT) console.log(`[FilterContext][Augment] Starting price augmentation for ${companyIds.length} companies.`);
    setLoadingPriceAugmentation(true);
    try {
      const { data: rpcStockPriceData, error: stockPriceError } = await fetchSupabaseRpcWithRetry('get_latest_stock_prices', {
        company_ids_array: companyIds,
      });

      if (stockPriceError) {
        console.error("[FilterContext][Augment] Error fetching latest stock prices from RPC:", stockPriceError.message);
        return companiesToAugment.map(company => ({
          ...company,
          share_price_source_actual: company.share_price_source_actual || 'calculated_from_market_cap',
          share_price_currency_actual: company.share_price_currency_actual || company.financials?.market_cap_currency || 'USD',
          share_price_date_actual: company.share_price_date_actual || null,
        }));
      }
      
      const stockPriceData = rpcStockPriceData as FetchedStockPrice[] | null;
      const priceMap = new Map<number, AugmentedPriceInfo & { latest_price_value?: number | null }>();
      
      if (stockPriceData) {
        if (DEBUG_FILTER_CONTEXT) console.log(`[FilterContext][Augment] Received ${stockPriceData.length} stock price entries from RPC.`);
        stockPriceData.forEach(sp => {
          if (sp.latest_price_date && isValidNumber(sp.latest_price_value) && sp.latest_price_currency) {
            const priceDate = new Date(sp.latest_price_date);
            const roughlyOneWeekAgo = new Date(); 
            roughlyOneWeekAgo.setDate(roughlyOneWeekAgo.getDate() - 7);
            roughlyOneWeekAgo.setHours(0,0,0,0);

            if (!isNaN(priceDate.getTime())) {
              priceMap.set(sp.company_id, {
                latest_price_value: sp.latest_price_value,
                share_price_currency_actual: sp.latest_price_currency as Currency,
                share_price_date_actual: sp.latest_price_date,
                share_price_source_actual: priceDate >= roughlyOneWeekAgo ? 'stock_prices_table' : 'stock_prices_table_old',
              });
            } else {
                if (DEBUG_FILTER_CONTEXT) console.warn(`[FilterContext][Augment] Invalid priceDate for company ${sp.company_id}: ${sp.latest_price_date}`);
            }
          } else {
              if (DEBUG_FILTER_CONTEXT) console.log(`[FilterContext][Augment] Skipped stock price for company ${sp.company_id} due to missing/invalid data.`);
          }
        });
      } else {
        if (DEBUG_FILTER_CONTEXT) console.log("[FilterContext][Augment] No stock price data array returned from RPC.");
      }

      const augmentedOutput = companiesToAugment.map(company => {
        const stockPriceInfo = priceMap.get(company.company_id);
        let updatedCompany = { ...company };

        if (stockPriceInfo && stockPriceInfo.share_price_source_actual === 'stock_prices_table' && isValidNumber(stockPriceInfo.latest_price_value)) {
          updatedCompany.share_price = stockPriceInfo.latest_price_value;
          updatedCompany.share_price_currency_actual = stockPriceInfo.share_price_currency_actual;
          updatedCompany.share_price_date_actual = stockPriceInfo.share_price_date_actual;
          updatedCompany.share_price_source_actual = 'stock_prices_table';
        } else if (stockPriceInfo && stockPriceInfo.share_price_source_actual === 'stock_prices_table_old') {
          // Keep existing company.share_price (which might be calculated)
          // but update the augmentation info to reflect the old fetched price details
          updatedCompany.share_price_currency_actual = stockPriceInfo.share_price_currency_actual;
          updatedCompany.share_price_date_actual = stockPriceInfo.share_price_date_actual;
          updatedCompany.share_price_source_actual = 'stock_prices_table_old';
        } else {
          // Fallback if no price info or if it's not a 'stock_prices_table' source.
          // Ensure source_actual is set. The share_price itself might already be the calculated one from the view.
          updatedCompany.share_price_source_actual = company.share_price_source_actual || 'calculated_from_market_cap';
          updatedCompany.share_price_currency_actual = company.share_price_currency_actual || company.financials?.market_cap_currency || 'USD';
          // company.share_price_date_actual would be null if calculated
        }
        return updatedCompany;
      });
      if (DEBUG_FILTER_CONTEXT) console.log(`[FilterContext][Augment] Price augmentation applied. Output companies: ${augmentedOutput.length}`);
      return augmentedOutput;

    } catch (error) {
      console.error("[FilterContext][Augment] Exception during price augmentation process:", error);
      return companiesToAugment.map(c => ({ ...c, share_price_source_actual: 'calculated_from_market_cap' })); // Minimal fallback
    } finally {
      setLoadingPriceAugmentation(false);
    }
  }, [supabase]); // supabase is stable


  const loading = useMemo(() => 
    isSubscriptionLoading || loadingRanges || loadingFilteredSet || loadingPaginated || loadingPriceAugmentation || loadingExchangeRates,
  [isSubscriptionLoading, loadingRanges, loadingFilteredSet, loadingPaginated, loadingPriceAugmentation, loadingExchangeRates]);

  // useEffect to fetch global metric ranges (min/max for all metrics) - from user's code
  useEffect(() => {
    let mounted = true;
    const fetchFullRanges = async () => { 
        if (!mounted) return;
        setLoadingRanges(true); setError(null);
        if (DEBUG_FILTER_CONTEXT) console.log("[FilterContext] Fetching global metric ranges.");
        try {
            const { data, error: rpcError } = await fetchSupabaseRpcWithRetry('get_metrics_ranges');
            if (!mounted) return;
            if (rpcError) throw rpcError;
            setMetricFullRanges((data as Record<string, [number, number]>) ?? {});
            if (DEBUG_FILTER_CONTEXT) console.log("[FilterContext] Global metric ranges fetched successfully:", data ? Object.keys(data).length : 0, "keys");
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
  }, []); 

  // buildFiltersJson - from user's code
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

  // fetchFilteredSetAndFirstPage - modified to use rawDisplayData and handle currency via memo
  const fetchFilteredSetAndFirstPage = useCallback(async (
    currentFilters: FilterSettings, currentSort: SortState, sizeForFirstPage: number,
    tier: ColumnTier // target_currency removed, will use selectedDisplayCurrency from context
  ) => {
    if (isSubscriptionLoading || loadingExchangeRates || !currentUserTier) {
      if (DEBUG_FILTER_CONTEXT) console.log('[FilterContext][InitialFetch] Skipping: Subscription/tier/rates not ready.');
      setLoadingFilteredSet(false); setLoadingPaginated(false); return;
    }
    if (DEBUG_FILTER_CONTEXT) console.log(`[FilterContext][InitialFetch] Initiating. PageSize: ${sizeForFirstPage}, Sort: ${currentSort.key} ${currentSort.direction}, Filters:`, JSON.stringify(currentFilters));
    setLoadingFilteredSet(true); setLoadingPaginated(true); setError(null);
    
    const filtersJson = buildFiltersJson(currentFilters);
    let fetchedTotalCount = 0; let rpcPageOneData: RpcResponseRow[] = []; 
    let allMatchingIds: number[] = EMPTY_ID_ARRAY;

    try {
      const pageOneRpcParams = {
        page_num: 1, page_size: sizeForFirstPage, sort_column: currentSort.key,
        sort_direction: currentSort.direction, filters: filtersJson,
        // target_currency: selectedDisplayCurrency, // Backend RPC doesn't use this parameter
      };
      const { data: pageOneRawData, error: pageOneError } = await fetchSupabaseRpcWithRetry('get_companies_paginated', pageOneRpcParams);

      if (pageOneError) throw pageOneError; 
      rpcPageOneData = (pageOneRawData as RpcResponseRow[] || []);
      
      if (rpcPageOneData.length > 0 && rpcPageOneData[0]?.total_rows !== undefined) {
        fetchedTotalCount = Number(rpcPageOneData[0].total_rows);
        if (!isValidNumber(fetchedTotalCount)) fetchedTotalCount = rpcPageOneData.length;
      } else {
        fetchedTotalCount = rpcPageOneData.length;
      }

      let convertedItems = convertRpcRowsToCompanies(rpcPageOneData);
      let augmentedItems = await augmentCompaniesWithStockPrices(convertedItems);
      
      if (currentSort.key === 'share_price') {
        augmentedItems.sort((a, b) => {
            const valA = a.share_price ?? (currentSort.direction === 'asc' ? Infinity : -Infinity);
            const valB = b.share_price ?? (currentSort.direction === 'asc' ? Infinity : -Infinity);
            return currentSort.direction === 'asc' ? valA - valB : valB - valA;
        });
      }
      setRawDisplayData(augmentedItems); // This will trigger displayData useMemo for currency conversion

      const idRpcParams = { filters: filtersJson };
      const { data: idData, error: idError } = await fetchSupabaseRpcWithRetry('get_filtered_company_ids', idRpcParams);
      if (idError) {
        console.error("[FilterContext][InitialFetch] Error fetching filtered IDs:", idError);
        allMatchingIds = augmentedItems.map(c => c.company_id); // Fallback
        if(fetchedTotalCount === 0 && augmentedItems.length > 0) fetchedTotalCount = augmentedItems.length;
      } else {
        allMatchingIds = (idData as { company_id: number }[] || []).map(r => r.company_id);
        if (Object.keys(filtersJson).length > 0 && allMatchingIds.length !== fetchedTotalCount) {
            if (DEBUG_FILTER_CONTEXT) console.warn(`[FC][InitialFetch] Count Mismatch. Paginated: ${fetchedTotalCount}, IDs: ${allMatchingIds.length}. Using ID count.`);
            fetchedTotalCount = allMatchingIds.length;
        } else if (Object.keys(filtersJson).length === 0 && fetchedTotalCount === 0 && allMatchingIds.length > 0) {
             fetchedTotalCount = allMatchingIds.length;
        }
      }
      setTotalCount(fetchedTotalCount);
      setFilteredCompanyIds(allMatchingIds);
      lastFetchedPageRef.current = 1;

    } catch (err: any) { 
        console.error('[FilterContext][InitialFetch] Error:', err.message);
        setError(`Fetch initial data failed: ${err.message || 'Unknown error'}`);
        setTotalCount(0); setRawDisplayData(EMPTY_COMPANY_ARRAY); setFilteredCompanyIds(EMPTY_ID_ARRAY);
    } finally {
      setLoadingFilteredSet(false); setLoadingPaginated(false);
    }
  }, [buildFiltersJson, isSubscriptionLoading, currentUserTier, augmentCompaniesWithStockPrices, loadingExchangeRates, supabase, selectedDisplayCurrency]); // Added selectedDisplayCurrency

  // fetchPaginatedDataOnly - modified to use rawDisplayData
  const fetchPaginatedDataOnly = useCallback(async (
    pageToFetch: number, sizeToFetch: number, currentSort: SortState,
    currentFilters: FilterSettings, tier: ColumnTier // target_currency removed
  ) => {
    if (pageToFetch <= 1) { return; }
    if (loadingRanges || loadingFilteredSet || loadingPaginated || isSubscriptionLoading || loadingPriceAugmentation || loadingExchangeRates || !currentUserTier) { return; }
    
    setLoadingPaginated(true); setError(null);
    if (DEBUG_FILTER_CONTEXT) console.log(`[FilterContext][Paginate] Fetching Page: ${pageToFetch}`);
    const filtersJson = buildFiltersJson(currentFilters);
    const rpcParams = {
      page_num: pageToFetch, page_size: sizeToFetch, sort_column: currentSort.key,
      sort_direction: currentSort.direction, filters: filtersJson,
    };
    try {
      const { data: rawPageData, error: rpcError } = await fetchSupabaseRpcWithRetry('get_companies_paginated', rpcParams);
      if (rpcError) throw rpcError;
      
      let convertedData = rawPageData ? convertRpcRowsToCompanies(rawPageData as RpcResponseRow[]) : EMPTY_COMPANY_ARRAY;
      let augmentedData = await augmentCompaniesWithStockPrices(convertedData);

      if (currentSort.key === 'share_price') { /* ... client-side sort ... */ 
        augmentedData.sort((a,b) => {
            const valA = a.share_price ?? (currentSort.direction === 'asc' ? Infinity : -Infinity);
            const valB = b.share_price ?? (currentSort.direction === 'asc' ? Infinity : -Infinity);
            return currentSort.direction === 'asc' ? valA - valB : valB - valA;
        });
      }
      setRawDisplayData(augmentedData); // Set raw, displayData memo will convert
      lastFetchedPageRef.current = pageToFetch;
    } catch (err: any) { 
        console.error(`[FilterContext][Paginate] Error page ${pageToFetch}:`, err.message);
        setError(`Fetch page ${pageToFetch} failed: ${err.message || 'Unknown error'}`);
        setRawDisplayData(EMPTY_COMPANY_ARRAY);
    } finally {
      setLoadingPaginated(false);
    }
  }, [buildFiltersJson, loadingRanges, loadingFilteredSet, loadingPaginated, isSubscriptionLoading, currentUserTier, augmentCompaniesWithStockPrices, loadingExchangeRates, supabase, totalCount]);


  // Effect 1: Initial data load ...
  useEffect(() => {
    if (loadingRanges || isSubscriptionLoading || loadingExchangeRates || !currentUserTier ) {
      return;
    }
    // This effect now also depends on selectedDisplayCurrency because if it changes,
    // we might want to re-evaluate if fetchFilteredSetAndFirstPage needs to run,
    // though displayData memo handles actual conversion.
    // However, the core data fetch trigger is still filterSettings, pageSize, sortState, tier readiness.
    // The displayData useMemo will handle re-conversion if selectedDisplayCurrency changes.
    // We call fetchFilteredSetAndFirstPage if these primary triggers change.
    if (DEBUG_FILTER_CONTEXT) console.log("[FilterContext][Effect1] Dependencies changed or initial. Resetting to page 1.");
    setCurrentPage(DEFAULT_PAGE); 
    lastFetchedPageRef.current = 0; 
    fetchFilteredSetAndFirstPage(filterSettings, sortState, pageSize, currentUserTier);
  }, [filterSettings, pageSize, sortState, currentUserTier, loadingRanges, isSubscriptionLoading, fetchFilteredSetAndFirstPage, loadingExchangeRates, selectedDisplayCurrency]);

  // Effect 2: Subsequent page changes ...
  useEffect(() => {
    if (currentPage === DEFAULT_PAGE || lastFetchedPageRef.current === currentPage) return;
    if (loadingRanges || loadingFilteredSet || isSubscriptionLoading || loadingPaginated || loadingPriceAugmentation || loadingExchangeRates || !currentUserTier) return;
    fetchPaginatedDataOnly(currentPage, pageSize, sortState, filterSettings, currentUserTier);
  }, [currentPage, filterSettings, pageSize, sortState, currentUserTier, loadingRanges, loadingFilteredSet, loadingPaginated, loadingPriceAugmentation, fetchPaginatedDataOnly, loadingExchangeRates, selectedDisplayCurrency]);

  // fetchCompaniesByIds - now uses selectedDisplayCurrency from context for conversion
  const fetchCompaniesByIds = useCallback(async (ids: number[]): Promise<Company[]> => {
    const targetCurrency = selectedDisplayCurrency; 
    if (!Array.isArray(ids) || ids.length === 0) return EMPTY_COMPANY_ARRAY;
    if (DEBUG_FILTER_CONTEXT) console.log(`[FilterContext] fetchCompaniesByIds: Fetching ${ids.length} companies. Target display currency: ${targetCurrency}. Rates loaded: ${!loadingExchangeRates && Object.keys(exchangeRates).length > 0 }`);
    
    setError(null); 
    setLoadingPriceAugmentation(true); // Use a generic loading indicator

    try {
      const { data, error: viewError } = await supabase
        .from('companies_detailed_view')
        .select('*')
        .in('company_id', ids);

      if (viewError) throw viewError;
      if (data === null) return EMPTY_COMPANY_ARRAY;
      
      let initialCompanyData = convertRpcRowsToCompanies(data as RpcResponseRow[]);
      let augmentedCompanyData = await augmentCompaniesWithStockPrices(initialCompanyData);
      
      const currencyConvertedData = augmentedCompanyData.map(company => 
          convertCompanyMonetaryFields(company, targetCurrency, exchangeRates)
      );
      
      if (DEBUG_FILTER_CONTEXT) console.log(`[FilterContext] fetchCompaniesByIds: Processed ${currencyConvertedData.length} companies for currency ${targetCurrency}.`);
      return currencyConvertedData;

    } catch (err: any) { 
        console.error('[FilterContext] fetchCompaniesByIds: Critical error:', err);
        setError(`Failed to load company details by IDs: ${err.message || 'Unknown error'}`);
        return EMPTY_COMPANY_ARRAY;
    } finally {
      setLoadingPriceAugmentation(false);
    }
  }, [supabase, augmentCompaniesWithStockPrices, exchangeRates, selectedDisplayCurrency, convertCompanyMonetaryFields, loadingExchangeRates]);

  // Setter Callbacks (using user's full implementations)
  const handleSetDevelopmentStatus = useCallback((statuses: CompanyStatus[]) => {
    if (DEBUG_FILTER_CONTEXT) console.log("[FilterContext] Setting Development Status Filter:", statuses);
    setFilterSettings(prev => ({ ...prev, developmentStatus: statuses }));
  }, []);
  const handleSetMetricRange = useCallback((db_column: string, min: number | null, max: number | null) => {
    if (DEBUG_FILTER_CONTEXT) console.log(`[FilterContext] Setting Metric Range for ${db_column}: [${min}, ${max}]`);
    setFilterSettings(prev => ({ ...prev, metricRanges: { ...prev.metricRanges, [db_column]: [min, max] } }));
  }, []);
  const handleSetSearchTerm = useCallback((term: string) => {
    if (DEBUG_FILTER_CONTEXT) console.log(`[FilterContext] Setting Search Term: "${term}"`);
    setFilterSettings(prev => ({ ...prev, searchTerm: term }));
  }, []);
  const handleResetFilters = useCallback(() => {
    if (DEBUG_FILTER_CONTEXT) console.log("[FilterContext] Resetting all filters to default.");
    setFilterSettings(DEFAULT_FILTER_SETTINGS);
    setSortState(DEFAULT_SORT_STATE);
    setExcludedCompanyIds(EMPTY_SET);
    setPageSizeState(DEFAULT_PAGE_SIZE);
    // setCurrentPage(DEFAULT_PAGE); // Effect 1 handles resetting page due to filterSettings change
  }, []);
  const handleToggleCompanyExclusion = useCallback((companyId: number) => {
    setExcludedCompanyIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(companyId)) {
        newSet.delete(companyId);
        if (DEBUG_FILTER_CONTEXT) console.log(`[FilterContext] Company ID ${companyId} REMOVED from exclusions.`);
      } else {
        newSet.add(companyId);
        if (DEBUG_FILTER_CONTEXT) console.log(`[FilterContext] Company ID ${companyId} ADDED to exclusions.`);
      }
      return newSet;
    });
  }, []);
  const handleSetSort = useCallback((newSortState: SortState) => {
    if (newSortState.key !== sortState.key || newSortState.direction !== sortState.direction) {
        if (DEBUG_FILTER_CONTEXT) console.log(`[FilterContext] Sort state changing to: Key=${newSortState.key}, Direction=${newSortState.direction}`);
        setSortState(newSortState);
    }
  }, [sortState]);
  const handleSetPage = useCallback((page: number) => {
    const maxPage = Math.max(1, Math.ceil(effectiveTotalCount / pageSize)); 
    const validPage = Math.max(1, Math.min(page, maxPage));
    if (validPage !== currentPage) {
        if (DEBUG_FILTER_CONTEXT) console.log(`[FilterContext] Page changing from ${currentPage} to ${validPage}.`);
        setCurrentPage(validPage);
    } else if (page !== validPage && DEBUG_FILTER_CONTEXT) { 
        console.log(`[FilterContext] Requested page ${page} is out of bounds (1-${maxPage}). Current page ${currentPage} remains.`);
    }
  }, [currentPage, effectiveTotalCount, pageSize]);
  const handleSetPageSize = useCallback((size: number) => {
    if (pageSizeOptions.includes(size) && size !== pageSize) {
        if (DEBUG_FILTER_CONTEXT) console.log(`[FilterContext] Page size changing to: ${size}`);
        setPageSizeState(size);
    }
  }, [pageSize]);
  
  const getMetricConfigByDbColumn = useCallback((db_column: string): MetricConfig | undefined => {
    if (!Array.isArray(allMetricConfigs)) return undefined;
    return allMetricConfigs.find(m => m.db_column === db_column); // Using db_column for lookup
  }, []); // allMetricConfigs is stable

  const value = useMemo<FilterContextType>(() => ({
    currentUserTier,
    filterSettings, metricFullRanges, 
    displayData, // This is the currency-converted data
    totalCount,
    effectiveTotalCount,
    filteredCompanyIds, excludedCompanyIds, toggleCompanyExclusion: handleToggleCompanyExclusion,
    loadingPaginated, loadingRanges, loadingFilteredSet, loadingPriceAugmentation, loadingExchangeRates, loading, error, 
    setDevelopmentStatusFilter: handleSetDevelopmentStatus, setMetricRange: handleSetMetricRange,
    setSearchTerm: handleSetSearchTerm, resetFilters: handleResetFilters, getMetricConfigByDbColumn,
    sortState, currentPage, pageSize, setSort: handleSetSort, setPage: handleSetPage,
    setPageSize: handleSetPageSize, 
    fetchCompaniesByIds: fetchCompaniesByIds, // Directly pass the memoized function
    exchangeRates,
  }), [
    currentUserTier, filterSettings, metricFullRanges, displayData, totalCount, 
    effectiveTotalCount, filteredCompanyIds, excludedCompanyIds, handleToggleCompanyExclusion, loadingPaginated, loadingRanges,
    loadingFilteredSet, loadingPriceAugmentation, loadingExchangeRates, loading, error, handleSetDevelopmentStatus, handleSetMetricRange,
    handleSetSearchTerm, handleResetFilters, getMetricConfigByDbColumn, sortState, currentPage, pageSize,
    handleSetSort, handleSetPage, handleSetPageSize, fetchCompaniesByIds, exchangeRates
    // selectedDisplayCurrency is implicitly a dependency because displayData and fetchCompaniesByIds use it via useCurrency() or pass it
  ]);

  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>;
};

export const useFilters = (): FilterContextType => {
  const context = useContext(FilterContext);
  if (context === undefined) {
    console.error("useFilters must be used within a FilterProvider. Ensure your component tree is correctly wrapped.");
    throw new Error('useFilters must be used within a FilterProvider.');
  }
  return context;
};