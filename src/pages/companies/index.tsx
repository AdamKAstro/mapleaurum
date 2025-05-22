// src/pages/companies/index.tsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useFilters } from '../../contexts/filter-context';
import { CompanyDataTable } from '../../components/company-data-table';
import { CurrencySelector } from '../../components/currency-selector';
import { LoadingIndicator } from '../../components/ui/loading-indicator';
import { Button } from '../../components/ui/button';
import { PageContainer } from '../../components/ui/page-container';
import { cn } from '../../lib/utils';
import type { Company, SortState, CompanyStatus } from '../../lib/types';
import debounce from 'lodash/debounce';

const FILTERABLE_STATUSES: CompanyStatus[] = ['Producer', 'Developer', 'Explorer', 'Royalty'];
const SEARCH_DEBOUNCE_MS = 350;

export function CompaniesPage() {
    const {
        displayData,
        totalCount,
        effectiveTotalCount,
        loading,
        loadingPaginated,
        error,
        filterSettings,
        setDevelopmentStatusFilter,
        setSearchTerm,
        currentUserTier,
        sortState,
        currentPage,
        pageSize,
        setSort,
        setPage,
        setPageSize,
        excludedCompanyIds,
        toggleCompanyExclusion,
    } = useFilters();

    const [localSearchTerm, setLocalSearchTerm] = useState<string>(filterSettings.searchTerm || '');
    const selectedStatuses = filterSettings.developmentStatus || [];

    // Cleanup debounced function on unmount
    const debouncedSearchRef = useRef<ReturnType<typeof debounce>>();

    useEffect(() => {
        debouncedSearchRef.current = debounce((value: string) => {
            setSearchTerm(value);
        }, SEARCH_DEBOUNCE_MS);

        return () => {
            debouncedSearchRef.current?.cancel();
        };
    }, [setSearchTerm]);

    useEffect(() => {
        if (filterSettings.searchTerm !== localSearchTerm) {
            setLocalSearchTerm(filterSettings.searchTerm || '');
        }
    }, [filterSettings.searchTerm]);

    const companiesForTable = useMemo(() => {
        const idsToExclude = excludedCompanyIds instanceof Set ? excludedCompanyIds : new Set<number>();
        
        if (!Array.isArray(displayData)) {
            console.warn('[CompaniesPage] displayData from context is not an array:', displayData);
            return [];
        }
        
        return displayData.filter(company => 
            company?.company_id !== undefined && !idsToExclude.has(company.company_id)
        );
    }, [displayData, excludedCompanyIds]);

    const handlePageChange = useCallback((newPage: number) => {
        setPage(newPage);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [setPage]);

    const handlePageSizeChange = useCallback((newPageSize: number) => {
        setPageSize(newPageSize);
    }, [setPageSize]);

    const handleSort = useCallback((dbSortKey: string, direction: 'asc' | 'desc') => {
        setSort({ key: dbSortKey, direction });
    }, [setSort]);

    const handleStatusChange = useCallback((status: CompanyStatus) => {
        const newStatuses = selectedStatuses.includes(status)
            ? selectedStatuses.filter(s => s !== status)
            : [...selectedStatuses, status];
        setDevelopmentStatusFilter(newStatuses);
    }, [selectedStatuses, setDevelopmentStatusFilter]);

    const handleSearchInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value;
        setLocalSearchTerm(value);
        debouncedSearchRef.current?.(value);
    }, []);

    const pageActions = (
        <CurrencySelector />
    );

    const descriptionText = loadingPaginated
        ? 'Loading companies...'
        : error
        ? 'Error loading data'
        : `${companiesForTable.length.toLocaleString()} companies shown${
            effectiveTotalCount > 0 
            ? ` (of ${effectiveTotalCount.toLocaleString()} total based on filters)` 
            : ''
          }`;

    return (
        <PageContainer
            title="Mining Companies Database"
            description={descriptionText}
            actions={pageActions}
            className="relative isolate flex flex-col flex-grow"
            contentClassName="flex flex-col flex-grow min-h-0"
        >
            <div 
                className="absolute inset-0 bg-cover bg-center bg-no-repeat bg-fixed -z-10 opacity-[0.03]" 
                style={{ backgroundImage: "url('/Background2.jpg')" }} 
                aria-hidden="true" 
            />
            
            <div className="space-y-4 flex flex-col flex-grow min-h-0">
                <div className="flex items-center flex-wrap gap-3 bg-navy-400/20 p-3 rounded-lg shadow flex-shrink-0">
                    <div className="relative flex-grow min-w-[200px] sm:min-w-[250px] md:max-w-md">
                        <input
                            type="text"
                            placeholder="Search by name, ticker, or description..."
                            className="w-full pl-3 pr-8 py-2 bg-navy-500/80 border border-navy-300/20 rounded-md text-xs text-surface-white placeholder-surface-white/50 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-navy-500 focus:ring-accent-teal transition-shadow"
                            value={localSearchTerm}
                            onChange={handleSearchInputChange}
                            aria-label="Search Companies"
                        />
                        {localSearchTerm && (
                            <button
                                onClick={() => {
                                    setLocalSearchTerm('');
                                    setSearchTerm('');
                                }}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-surface-white/50 hover:text-surface-white"
                                aria-label="Clear search"
                            >
                                ×
                            </button>
                        )}
                    </div>
                    
                    <div className="flex items-center gap-2 flex-wrap">
                        {FILTERABLE_STATUSES.map(status => (
                            <label 
                                key={status} 
                                className="flex items-center gap-1.5 sm:gap-2 cursor-pointer p-1 hover:bg-navy-400/30 rounded transition-colors"
                            >
                                <input
                                    type="checkbox"
                                    checked={selectedStatuses.includes(status)}
                                    onChange={() => handleStatusChange(status)}
                                    className="h-3.5 w-3.5 rounded border-gray-400 bg-navy-600 text-accent-teal focus:ring-accent-teal focus:ring-offset-navy-700"
                                />
                                <span className="text-xs sm:text-sm text-surface-white/90 capitalize select-none">
                                    {status}
                                </span>
                            </label>
                        ))}
                    </div>
                </div>
                
                <div className="bg-navy-700/30 backdrop-blur-sm rounded-lg shadow-lg border border-navy-600/50 flex flex-col flex-grow overflow-hidden min-h-[500px]">
                    {loading && !companiesForTable.length ? (
                        <div className="flex justify-center items-center h-64 p-4">
                            <LoadingIndicator message="Loading companies..." />
                        </div>
                    ) : error ? (
                        <div className="flex flex-col justify-center items-center h-64 p-4 text-red-400">
                            <p className="text-center mb-2">{error}</p>
                            <Button 
                                onClick={() => window.location.reload()} 
                                variant="outline" 
                                size="sm"
                                className="mt-2"
                            >
                                Retry
                            </Button>
                        </div>
                    ) : companiesForTable.length === 0 ? (
                        <div className="flex flex-col justify-center items-center h-64 p-4 text-surface-white/60">
                            <p className="text-center mb-2">No companies match the current filters.</p>
                            <Button 
                                onClick={() => {
                                    setLocalSearchTerm('');
                                    setSearchTerm('');
                                    setDevelopmentStatusFilter([]);
                                }} 
                                variant="outline" 
                                size="sm"
                                className="mt-2"
                            >
                                Clear Filters
                            </Button>
                        </div>
                    ) : (
                        <CompanyDataTable
                            companies={companiesForTable}
                            onSort={handleSort}
                            currentSort={sortState}
                            currentTier={currentUserTier}
                            page={currentPage}
                            pageSize={pageSize}
                            totalCount={totalCount}
                            onPageChange={handlePageChange}
                            onPageSizeChange={handlePageSizeChange}
                            excludedCompanyIds={excludedCompanyIds instanceof Set ? excludedCompanyIds : new Set()}
                            onCompanyToggle={toggleCompanyExclusion}
                        />
                    )}
                </div>
            </div>
        </PageContainer>
    );
}
