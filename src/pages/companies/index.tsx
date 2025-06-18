// src/pages/companies/index.tsx
import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { useFilters } from '../../contexts/filter-context';
import { CompanyDataTable } from '../../components/company-data-table';
import { CurrencySelector } from '../../components/currency-selector';
import { Button } from '../../components/ui/button';
import { PageContainer } from '../../components/ui/page-container';
import { UnifiedControlPanel } from '../../components/unified-control-panel';
import { RefreshCw, AlertCircle, Search, CheckSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Company, CompanyStatus } from '../../lib/types';
import { deepEqual, logDebug } from '../../lib/utils';

const FILTERABLE_STATUSES: CompanyStatus[] = ['producer', 'developer', 'explorer', 'royalty', 'other'];

function exportToCSV(companies: Array<{ company_id: number; company_name: string; status: string | null }>, filename: string) {
  const headers = ['Company ID', 'Company Name', 'Status'];
  const rows = companies.map((company) => [
    company.company_id,
    `"${company.company_name.replace(/"/g, '""')}"`,
    company.status || 'N/A',
  ]);
  const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function CompaniesPage() {
  const {
    displayData,
    totalCount,
    effectiveTotalCount,
    loadingData,
    loadingFilters,
    error,
    filterSettings,
    currentUserTier,
    sortState,
    currentPage,
    pageSize,
    setSort,
    setPage,
    setPageSize,
    showDeselected,
    selectAll,
    deselectAll,
    invertSelection,
    toggleShowDeselected,
    searchCompanies,
    filteredCompanyIds,
    activeCompanyIds,
    setDevelopmentStatusFilter,
    setMetricRange,
    resetFilters,
    setSearchTerm,
    toggleCompanySelection,
    fetchCompaniesByIds,
    isCompanySelected,
  } = useFilters();

  // NEW: State to track additional selected companies not on current page
  const [additionalSelectedCompanies, setAdditionalSelectedCompanies] = useState<Company[]>([]);
  const [loadingAdditional, setLoadingAdditional] = useState(false);

  const selectedStatuses = useMemo(
    () => filterSettings.developmentStatus || FILTERABLE_STATUSES,
    [filterSettings.developmentStatus]
  );

  const hasActiveFilters = useMemo(() => {
    const isDefaultStatus = deepEqual(selectedStatuses, FILTERABLE_STATUSES);
    const isDefaultMetricRanges = Object.keys(filterSettings.metricRanges).length === 0;
    const isDefaultSearchTerm = filterSettings.searchTerm === '';
    const hasActiveSelection = effectiveTotalCount !== totalCount;
    return !isDefaultStatus || !isDefaultMetricRanges || !isDefaultSearchTerm || hasActiveSelection;
  }, [selectedStatuses, filterSettings.metricRanges, filterSettings.searchTerm, effectiveTotalCount, totalCount]);

  // NEW: Effect to fetch selected companies not in displayData
  useEffect(() => {
    let mounted = true;
    
    const fetchAdditionalSelectedCompanies = async () => {
      // Only fetch when not showing deselected and we have selected companies
      if (!showDeselected && activeCompanyIds.length > 0) {
        // Find selected company IDs that aren't in the current displayData
        const displayDataIds = new Set(displayData.map(c => c.company_id));
        const missingSelectedIds = activeCompanyIds.filter(id => !displayDataIds.has(id));
        
        if (missingSelectedIds.length > 0) {
          logDebug(`[CompaniesPage] Fetching ${missingSelectedIds.length} additional selected companies not in current page`);
          setLoadingAdditional(true);
          
          try {
            const additionalCompanies = await fetchCompaniesByIds(missingSelectedIds);
            if (mounted) {
              setAdditionalSelectedCompanies(additionalCompanies);
              logDebug(`[CompaniesPage] Fetched ${additionalCompanies.length} additional companies`);
            }
          } catch (error) {
            console.error('[CompaniesPage] Error fetching additional selected companies:', error);
            if (mounted) {
              setAdditionalSelectedCompanies([]);
            }
          } finally {
            if (mounted) {
              setLoadingAdditional(false);
            }
          }
        } else {
          // No missing companies to fetch
          if (mounted) {
            setAdditionalSelectedCompanies([]);
            setLoadingAdditional(false);
          }
        }
      } else {
        // Clear additional companies when showing all or no selection
        if (mounted) {
          setAdditionalSelectedCompanies([]);
          setLoadingAdditional(false);
        }
      }
    };

    fetchAdditionalSelectedCompanies();
    
    return () => {
      mounted = false;
    };
  }, [activeCompanyIds, displayData, showDeselected, fetchCompaniesByIds]);

  // UPDATED: companiesForTable now includes additional selected companies
  const companiesForTable = useMemo(() => {
    logDebug('[CompaniesPage] Recalculating companiesForTable', {
      displayDataLength: displayData.length,
      additionalLength: additionalSelectedCompanies.length,
      showDeselected,
      activeCompanyIdsLength: activeCompanyIds.length
    });
    
    if (!displayData) return [];

    if (showDeselected) {
      // When showing deselected, we show all companies from current page with ghost styling
      return displayData.map(company => ({
        ...company,
        _isGhosted: !isCompanySelected(company.company_id),
      }));
    }

    // When not showing deselected, we need to show only selected companies
    if (activeCompanyIds.length === 0) {
      // No companies selected
      return [];
    }

    // Combine companies from current page and additional fetched companies
    const allCompanies = new Map<number, Company>();
    
    // Add selected companies from current page
    displayData.forEach(company => {
      if (isCompanySelected(company.company_id)) {
        allCompanies.set(company.company_id, company);
      }
    });
    
    // Add additional selected companies (this will override if duplicate, which is fine)
    additionalSelectedCompanies.forEach(company => {
      if (isCompanySelected(company.company_id)) {
        allCompanies.set(company.company_id, company);
      }
    });
    
    // Convert back to array and sort
    const combined = Array.from(allCompanies.values());
    
    // Apply current sort
    combined.sort((a, b) => {
      const { key, direction } = sortState;
      
      // Handle company_name sort
      if (key === 'company_name') {
        const aVal = a.company_name || '';
        const bVal = b.company_name || '';
        return direction === 'asc' 
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      
      // Handle tsx_code sort
      if (key === 'tsx_code') {
        const aVal = a.tsx_code || '';
        const bVal = b.tsx_code || '';
        return direction === 'asc' 
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      
      // Handle status sort
      if (key === 'status') {
        const aVal = a.status || '';
        const bVal = b.status || '';
        return direction === 'asc' 
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      
      // For other sorts, maintain original order for now
      // You can add more sort handlers as needed
      return 0;
    });
    
    return combined;
  }, [displayData, showDeselected, isCompanySelected, activeCompanyIds, additionalSelectedCompanies, sortState]);

  const handlePageChange = useCallback((newPage: number) => {
    logDebug(`[CompaniesPage] Calling setPage(${newPage})`);
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [setPage]);

  const handlePageSizeChange = useCallback((newPageSize: number) => {
    logDebug(`[CompaniesPage] Calling setPageSize(${newPageSize})`);
    setPageSize(newPageSize);
  }, [setPageSize]);

  const handleSort = useCallback((dbSortKey: string, direction: 'asc' | 'desc') => {
    logDebug(`[CompaniesPage] Calling setSort({ key: "${dbSortKey}", direction: "${direction}" })`);
    setSort({ key: dbSortKey, direction });
  }, [setSort]);

  const handleStatusChange = useCallback((status: CompanyStatus) => {
    const newStatuses = selectedStatuses.includes(status)
      ? selectedStatuses.filter((s) => s !== status)
      : [...selectedStatuses, status];
    logDebug(`[CompaniesPage] Calling setDevelopmentStatusFilter`, { newStatuses });
    setDevelopmentStatusFilter(newStatuses);
  }, [selectedStatuses, setDevelopmentStatusFilter]);

  const handleClearAllFilters = useCallback(() => {
    logDebug('[CompaniesPage] Clearing all filters via resetFilters()');
    resetFilters();
  }, [resetFilters]);

  const handleExportSelected = useCallback(async () => {
    const exportIds = Array.from(filteredCompanyIds).filter(id => isCompanySelected(id));
    if (exportIds.length === 0) {
      alert('No companies selected for export.');
      return;
    }
    logDebug(`[CompaniesPage] Exporting ${exportIds.length} selected companies`);

    try {
      const companiesToExport = await fetchCompaniesByIds(exportIds);
      const exportData = companiesToExport.map((company) => ({
        company_id: company.company_id,
        company_name: company.company_name,
        status: company.status,
      }));
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `mining_companies_export_${timestamp}.csv`;
      exportToCSV(exportData, filename);
    } catch (err: any) {
      console.error(`[CompaniesPage] Error exporting companies:`, err);
      alert(`Failed to export companies: ${err.message || 'Unknown error'}`);
    }
  }, [filteredCompanyIds, isCompanySelected, fetchCompaniesByIds]);

  const descriptionText = (
    <div className="flex items-center gap-4 text-sm">
      <span className="flex items-center gap-2 text-gray-300">
        <Search className="h-4 w-4 text-gray-400" />
        {loadingFilters ? '...' : totalCount.toLocaleString()} matching
      </span>
      <span className="text-gray-600">•</span>
      <span className="flex items-center gap-2 text-gray-300">
        <CheckSquare className="h-4 w-4 text-accent-teal" />
        {loadingFilters ? '...' : effectiveTotalCount.toLocaleString()} selected
      </span>
    </div>
  );

  return (
    <PageContainer
      title="Mining Companies Database"
      description={descriptionText}
      actions={<CurrencySelector />}
      className="relative isolate flex flex-col flex-grow"
      contentClassName="flex flex-col flex-grow min-h-0"
      style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}
    >
      <div
        className="absolute inset-0 bg-gradient-to-br from-navy-900/20 via-transparent to-accent-teal/5 -z-10"
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat bg-fixed -z-10 opacity-[0.03]"
        style={{ backgroundImage: "url('/Background2.jpg')" }}
        aria-hidden="true"
      />

      <div className="space-y-4 flex flex-col flex-grow min-h-0">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <UnifiedControlPanel
            availableStatuses={FILTERABLE_STATUSES}
            selectedStatuses={selectedStatuses}
            onStatusChange={handleStatusChange}
            totalCount={totalCount}
            selectedCount={effectiveTotalCount}
            showDeselected={showDeselected}
            onSelectAll={selectAll}
            onDeselectAll={deselectAll}
            onInvertSelection={invertSelection}
            onToggleShowDeselected={toggleShowDeselected}
            onExportSelected={handleExportSelected}
            onSelectCompany={toggleCompanySelection}
            onSearchCompanies={searchCompanies}
            onClearAllFilters={handleClearAllFilters}
            hasActiveFilters={hasActiveFilters}
            onSearchTermChange={setSearchTerm}
            setMetricRange={setMetricRange}
            isLoading={loadingFilters}
          />
        </motion.div>

        <motion.div
          layout
          className="bg-navy-700/30 backdrop-blur-sm rounded-xl shadow-xl border border-navy-600/50 flex flex-col flex-grow overflow-hidden min-h-[500px] relative"
        >
          <AnimatePresence>
            {(loadingData || loadingAdditional) && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 bg-navy-800/50 backdrop-blur-sm z-20 flex flex-col justify-center items-center"
              >
                <RefreshCw className="h-8 w-8 text-accent-teal animate-spin" />
                <p className="text-surface-white/60 text-sm mt-4">
                  {loadingAdditional && !loadingData ? 'Loading selected companies...' : 'Loading...'}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {error ? (
            <div className="flex flex-col justify-center items-center h-full text-red-400">
              <AlertCircle className="h-12 w-12 mb-4" />
              <p className="text-center mb-2">{error}</p>
              <Button onClick={() => window.location.reload()} variant="outline" size="sm">Retry</Button>
            </div>
          ) : !loadingData && !loadingFilters && companiesForTable.length === 0 ? (
            <motion.div className="flex flex-col justify-center items-center h-full text-surface-white/60">
              <Search className="h-16 w-16 mb-4 opacity-50" />
              <p className="text-center mb-2">No companies match the current filters.</p>
              {hasActiveFilters && (
                <Button onClick={resetFilters} variant="outline" size="sm">Clear All Filters</Button>
              )}
            </motion.div>
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
              onCompanyToggle={toggleCompanySelection}
              isCompanySelected={isCompanySelected}
              showDeselected={showDeselected}
            />
          )}
        </motion.div>
      </div>
    </PageContainer>
  );
}