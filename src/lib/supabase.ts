//src/lib/supabase.ts
import { supabase } from './supabaseClient';
import { convertRpcRowsToCompanies } from './converters';
import type { Company, Currency, FilterState, SortState, RpcResponseRow, PaginatedRowData } from './types';

interface GetPaginatedCompaniesResult {
  companies: Company[];
  totalCount: number;
}

const sanitizeValue = (value: any): string | number | boolean | null | any[] => {
    if (value === null || value === undefined) {
        return null;
    }
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : null;
    }
    if (Array.isArray(value)) {
        return value
            .map(item => typeof item === 'string' ? item : null)
            .filter(item => item !== null) as string[];
    }
    if (typeof value === 'string' || typeof value === 'boolean') {
        return value;
    }
    console.warn(`Attempted to serialize unsupported type (${typeof value}) for filter value:`, value);
    return null;
};

export async function getCompaniesForScatterChart(
  currency: Currency
): Promise<Company[]> {
  try {
    console.log('Fetching companies for scatter chart...');
    
    const { data, error } = await supabase.rpc<RpcResponseRow>(
      'get_companies_paginated',
      {
        page_num: 1,
        page_size: 1000, // Get all companies
        sort_column: 'company_name',
        sort_direction: 'asc',
        target_currency: currency,
        filters: {} // No filters for scatter chart
      }
    );

    if (error) {
      console.error('Supabase RPC Error:', error);
      throw new Error(`Database error fetching companies: ${error.message}`);
    }

    if (!data) {
      console.warn('No data returned from Supabase');
      return [];
    }

    console.log(`Received ${data.length} rows from database`);

    // Convert RPC rows to Company objects
    const companies = convertRpcRowsToCompanies(data, { 
      debugMode: true,
      throwOnError: false // Don't throw on individual row conversion errors
    });

    console.log(`Successfully converted ${companies.length} companies`);

    return companies;

  } catch (err: any) {
    console.error('Error in getCompaniesForScatterChart:', err);
    throw new Error(err.message || 'An unknown error occurred fetching company data.');
  }
}

export async function getPaginatedCompanies(
  page: number,
  pageSize: number,
  sort: SortState,
  filtersState: FilterState,
  currency: Currency
): Promise<GetPaginatedCompaniesResult> {
  const filtersJson: Record<string, any> = {};

  // Handle search term
  const searchTermValue = filtersState.searchTerm;
  const sanitizedSearchTerm = (searchTermValue === null || searchTermValue === undefined) ? null : String(searchTermValue);
  if (sanitizedSearchTerm !== null && sanitizedSearchTerm !== '') {
      filtersJson.searchTerm = sanitizedSearchTerm;
  }

  // Handle status filter
  const statusFilterValue = filtersState.status;
  if (Array.isArray(statusFilterValue) && statusFilterValue.length > 0) {
      const sanitizedStatus = statusFilterValue.filter(s => typeof s === 'string');
      if (sanitizedStatus.length > 0) {
        filtersJson.status = sanitizedStatus;
      }
  }

  // Range filter helper function
  const addSanitizedRange = (keyPrefix: string, range: [any, any] | null | undefined) => {
    if (range && Array.isArray(range)) {
        const minVal = sanitizeValue(range[0]);
        const maxVal = sanitizeValue(range[1]);
        if (minVal !== null && typeof minVal === 'number') filtersJson[`min_${keyPrefix}`] = minVal;
        if (maxVal !== null && typeof maxVal === 'number') filtersJson[`max_${keyPrefix}`] = maxVal;
    } else if (range !== null && range !== undefined) {
        console.warn(`Filter range for ${keyPrefix} is not an array:`, range);
    }
  };

  // Add all range filters
  Object.entries(filtersState).forEach(([key, value]) => {
    if (key.endsWith('Range')) {
      const prefix = key.replace('Range', '');
      addSanitizedRange(prefix, value as [any, any]);
    }
  });

  const rpcParams = {
      page_num: page,
      page_size: pageSize,
      sort_column: sort.key,
      sort_direction: sort.direction,
      target_currency: currency,
      filters: filtersJson
  };

  try {
    const { data, error } = await supabase.rpc<RpcResponseRow>(
      'get_companies_paginated',
      rpcParams
    );

    if (error) {
      console.error('Supabase RPC Error:', error);
      throw new Error(`Database error fetching companies: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return { companies: [], totalCount: 0 };
    }

    const totalCount = data[0]?.total_rows ?? 0;
    const companies = convertRpcRowsToCompanies(data);

    return { companies, totalCount };

  } catch (err: any) {
    console.error('Error processing paginated companies:', err);
    throw new Error(err.message || 'An unknown error occurred processing company data.');
  }
}