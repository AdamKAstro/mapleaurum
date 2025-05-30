// src/pages/companies/index.tsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useFilters } from '../../contexts/filter-context';
import { CompanyDataTable } from '../../components/company-data-table';
import { CurrencySelector } from '../../components/currency-selector';
import { LoadingIndicator } from '../../components/ui/loading-indicator';
import { Button } from '../../components/ui/button';
import { PageContainer } from '../../components/ui/page-container';
import { StatusFilterButton } from '../../components/status-filter-button';
import { Search, X, RefreshCw, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const selectedStatuses = filterSettings.developmentStatus || [];

    // Debug logging for status filter
    useEffect(() => {
        console.log('Selected statuses:', selectedStatuses);
        console.log('Filter settings:', filterSettings);
    }, [selectedStatuses, filterSettings]);

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
        console.log('Status clicked:', status);
        const newStatuses = selectedStatuses.includes(status)
            ? selectedStatuses.filter(s => s !== status)
            : [...selectedStatuses, status];
        console.log('New statuses:', newStatuses);
        setDevelopmentStatusFilter(newStatuses);
    }, [selectedStatuses, setDevelopmentStatusFilter]);

    const handleSearchInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value;
        setLocalSearchTerm(value);
        debouncedSearchRef.current?.(value);
    }, []);

    const handleClearSearch = useCallback(() => {
        setLocalSearchTerm('');
        setSearchTerm('');
    }, [setSearchTerm]);

    const handleClearAllFilters = useCallback(() => {
        setLocalSearchTerm('');
        setSearchTerm('');
        setDevelopmentStatusFilter([]);
    }, [setSearchTerm, setDevelopmentStatusFilter]);

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

    // Check if any filters are active
    const hasActiveFilters = localSearchTerm || selectedStatuses.length > 0;

    return (
        <PageContainer
            title="Mining Companies Database"
            description={descriptionText}
            actions={pageActions}
            className="relative isolate flex flex-col flex-grow"
            contentClassName="flex flex-col flex-grow min-h-0"
            style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}
        >
            <div 
                className="absolute inset-0 bg-cover bg-center bg-no-repeat bg-fixed -z-10 opacity-[0.03]" 
                style={{ backgroundImage: "url('/Background2.jpg')" }} 
                aria-hidden="true" 
            />
            
            <div className="space-y-4 flex flex-col flex-grow min-h-0">
                {/* Enhanced Filter Bar */}
                <motion.div 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center flex-wrap gap-3 bg-navy-400/20 backdrop-blur-sm p-4 rounded-xl shadow-lg border border-navy-300/20 flex-shrink-0"
                >
                    {/* Enhanced Search Input */}
                    <div className={cn(
                        "relative flex-grow min-w-[200px] sm:min-w-[250px] md:max-w-md transition-all",
                        isSearchFocused && "md:max-w-lg"
                    )}>
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-white/50" />
                        <input
                            type="text"
                            placeholder="Search by name, ticker, or description..."
                            className={cn(
                                "w-full pl-10 pr-10 py-2.5 bg-navy-500/80 border rounded-lg",
                                "text-sm text-surface-white placeholder-surface-white/50",
                                "focus:outline-none focus:ring-2 focus:ring-offset-1",
                                "focus:ring-offset-navy-500 focus:ring-accent-teal",
                                "transition-all duration-200",
                                isSearchFocused ? "border-accent-teal/50 bg-navy-500" : "border-navy-300/20"
                            )}
                            value={localSearchTerm}
                            onChange={handleSearchInputChange}
                            onFocus={() => setIsSearchFocused(true)}
                            onBlur={() => setIsSearchFocused(false)}
                            aria-label="Search Companies"
                        />
                        <AnimatePresence>
                            {localSearchTerm && (
                                <motion.button
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    onClick={handleClearSearch}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-white/50 hover:text-surface-white transition-colors p-1 hover:bg-navy-400/50 rounded"
                                    aria-label="Clear search"
                                >
                                    <X className="h-4 w-4" />
                                </motion.button>
                            )}
                        </AnimatePresence>
                    </div>
                    
                    {/* Status Filter Buttons with Animation */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <AnimatePresence>
                            {FILTERABLE_STATUSES.map((status, index) => (
                                <motion.div
                                    key={status}
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: index * 0.05 }}
                                >
                                    <StatusFilterButton
                                        status={status}
                                        isSelected={selectedStatuses.includes(status)}
                                        onChange={() => handleStatusChange(status)}
                                    />
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>

                    {/* Clear All Filters Button */}
                    <AnimatePresence>
                        {hasActiveFilters && (
                            <motion.button
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                onClick={handleClearAllFilters}
                                className="px-3 py-1.5 text-xs font-medium text-amber-400 hover:text-amber-300 hover:bg-amber-400/10 rounded-lg transition-all flex items-center gap-1"
                            >
                                <X className="h-3 w-3" />
                                Clear All
                            </motion.button>
                        )}
                    </AnimatePresence>
                </motion.div>
                
                {/* Enhanced Data Table Container */}
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="bg-navy-700/30 backdrop-blur-sm rounded-xl shadow-xl border border-navy-600/50 flex flex-col flex-grow overflow-hidden min-h-[500px]"
                >
                    {loading && !companiesForTable.length ? (
                        <div className="flex flex-col justify-center items-center h-64 p-4">
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                className="mb-4"
                            >
                                <RefreshCw className="h-8 w-8 text-accent-teal" />
                            </motion.div>
                            <p className="text-surface-white/60 text-sm">Loading companies...</p>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col justify-center items-center h-64 p-4">
                            <AlertCircle className="h-12 w-12 text-red-400 mb-4" />
                            <p className="text-red-400 text-center mb-2">{error}</p>
                            <Button 
                                onClick={() => window.location.reload()} 
                                variant="outline" 
                                size="sm"
                                className="mt-2 border-red-400/50 text-red-400 hover:bg-red-400/10"
                            >
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Retry
                            </Button>
                        </div>
                    ) : companiesForTable.length === 0 ? (
                        <div className="flex flex-col justify-center items-center h-64 p-4">
                            <motion.div
                                initial={{ scale: 0.8 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring" }}
                                className="mb-4 text-6xl"
                            >
                                🔍
                            </motion.div>
                            <p className="text-surface-white/60 text-center mb-2">No companies match the current filters.</p>
                            <Button 
                                onClick={handleClearAllFilters} 
                                variant="outline" 
                                size="sm"
                                className="mt-2 border-accent-teal/50 text-accent-teal hover:bg-accent-teal/10"
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
                            totalCount={effectiveTotalCount}
                            onPageChange={handlePageChange}
                            onPageSizeChange={handlePageSizeChange}
                            excludedCompanyIds={excludedCompanyIds instanceof Set ? excludedCompanyIds : new Set()}
                            onCompanyToggle={toggleCompanyExclusion}
                        />
                    )}
                </motion.div>
            </div>
        </PageContainer>
    );
}