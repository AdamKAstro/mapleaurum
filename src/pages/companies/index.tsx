// src/pages/companies/index.tsx
import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import { useFilters } from '../../contexts/filter-context';
import { CompanyDataTable } from '../../components/company-data-table';
import { CurrencySelector } from '../../components/currency-selector';
import { Button } from '../../components/ui/button';
import { PageContainer } from '../../components/ui/page-container';
import { UnifiedControlPanel } from '../../components/unified-control-panel';
import { ImportFavoritesModal } from '../../components/import-favorites-modal'; // Added import
import { RefreshCw, AlertCircle, Search, CheckSquare, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import type { Company, CompanyStatus } from '../../lib/types';
import { deepEqual, logDebug } from '../../lib/utils';

const FILTERABLE_STATUSES: CompanyStatus[] = ['producer', 'developer', 'explorer', 'royalty'];
const MAX_ADDITIONAL_COMPANIES = 25;

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

 const [additionalSelectedCompanies, setAdditionalSelectedCompanies] = useState<Company[]>([]);
 const [loadingAdditional, setLoadingAdditional] = useState(false);
 const [additionalCompanyError, setAdditionalCompanyError] = useState<string | null>(null);
 const [showImportModal, setShowImportModal] = useState(false); // Added state for modal
 
 // Track the previous active company IDs to detect changes
 const prevActiveCompanyIdsRef = useRef<number[]>([]);
 const fetchInProgressRef = useRef<boolean>(false);

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

 // Added import handler
 const handleImportFavorites = useCallback(async (companyIds: number[]) => {
   // Get current selected IDs
   const currentSelected = new Set(activeCompanyIds);
   
   // Separate into new and existing
   const toImport = companyIds.filter(id => !currentSelected.has(id));
   const existing = companyIds.filter(id => currentSelected.has(id));
   
   // Check which IDs are actually valid in the database
   const validIds = toImport.filter(id => filteredCompanyIds.has(id));
   const invalidIds = toImport.filter(id => !filteredCompanyIds.has(id));
   
   // Clear current selection and set new selection
   if (validIds.length > 0) {
     // First deselect all
     deselectAll();
     
     // Then select the imported IDs
     setTimeout(() => {
       validIds.forEach(id => {
         toggleCompanySelection(id);
       });
     }, 100);
   }
   
   return {
     imported: validIds,
     invalid: invalidIds,
     existing: existing,
   };
 }, [activeCompanyIds, filteredCompanyIds, deselectAll, toggleCompanySelection]);

 // Effect to fetch additional selected companies that aren't in the current display
 useEffect(() => {
   const fetchAdditionalCompanies = async () => {
     if (fetchInProgressRef.current) {
       logDebug('[CompaniesPage] Skipping fetch - already in progress');
       return;
     }

     if (deepEqual(prevActiveCompanyIdsRef.current, activeCompanyIds)) {
       logDebug('[CompaniesPage] Skipping fetch - activeCompanyIds unchanged');
       return;
     }

     prevActiveCompanyIdsRef.current = [...activeCompanyIds];

     const displayedIds = new Set(displayData.map(c => c.company_id));
     const currentAdditionalIds = new Set(additionalSelectedCompanies.map(c => c.company_id));
     const allAvailableIds = new Set([...displayedIds, ...currentAdditionalIds]);

     const missingIds = activeCompanyIds.filter(id => !allAvailableIds.has(id));
     
     const cleanedAdditional = additionalSelectedCompanies.filter(company => 
       activeCompanyIds.includes(company.company_id) && !displayedIds.has(company.company_id)
     );

     if (!deepEqual(cleanedAdditional, additionalSelectedCompanies)) {
       setAdditionalSelectedCompanies(cleanedAdditional);
     }

     if (missingIds.length > 0) {
       const idsToFetch = missingIds.slice(0, MAX_ADDITIONAL_COMPANIES);
       
       logDebug('[CompaniesPage] Fetching additional companies:', {
         missingCount: missingIds.length,
         fetchingCount: idsToFetch.length,
         ids: idsToFetch
       });

       fetchInProgressRef.current = true;
       setLoadingAdditional(true);
       setAdditionalCompanyError(null);

       try {
         const fetchedCompanies = await fetchCompaniesByIds(idsToFetch);
         
         const mergedMap = new Map<number, Company>();
         
         cleanedAdditional.forEach(company => {
           mergedMap.set(company.company_id, company);
         });
         
         fetchedCompanies.forEach(company => {
           mergedMap.set(company.company_id, company);
         });
         
         const finalAdditionalCompanies = Array.from(mergedMap.values());
         
         const limitedAdditionalCompanies = finalAdditionalCompanies.slice(0, MAX_ADDITIONAL_COMPANIES);
         
         setAdditionalSelectedCompanies(limitedAdditionalCompanies);
         
         if (missingIds.length > MAX_ADDITIONAL_COMPANIES) {
           setAdditionalCompanyError(
             `Showing first ${MAX_ADDITIONAL_COMPANIES} of ${missingIds.length} selected companies not on current page. Use filters or search to find specific companies.`
           );
         }
         
         logDebug('[CompaniesPage] Additional companies fetched successfully:', {
           fetchedCount: fetchedCompanies.length,
           totalAdditionalCount: limitedAdditionalCompanies.length
         });
       } catch (error) {
         console.error('[CompaniesPage] Error fetching additional companies:', error);
         setAdditionalCompanyError('Failed to load some selected companies. They will appear when you navigate to their page.');
       } finally {
         setLoadingAdditional(false);
         fetchInProgressRef.current = false;
       }
     } else {
       logDebug('[CompaniesPage] No missing companies to fetch');
     }
   };

   if (!loadingData && !loadingFilters) {
     fetchAdditionalCompanies();
   }
 }, [activeCompanyIds, displayData, additionalSelectedCompanies, fetchCompaniesByIds, loadingData, loadingFilters]);

 const companiesForTable = useMemo(() => {
   logDebug('[CompaniesPage] Recalculating companiesForTable', {
     displayDataLength: displayData.length,
     additionalLength: additionalSelectedCompanies.length,
     showDeselected,
     activeCompanyIdsLength: activeCompanyIds.length
   });
   
   if (!displayData) return [];

   if (showDeselected) {
     const allPageCompanies = displayData.map(company => ({
       ...company,
       _isGhosted: !isCompanySelected(company.company_id),
     }));
     
     const pageCompanyIds = new Set(displayData.map(c => c.company_id));
     const additionalNotOnPage = additionalSelectedCompanies
       .filter(company => !pageCompanyIds.has(company.company_id))
       .map(company => ({
         ...company,
         _isGhosted: false,
       }));
     
     return [...allPageCompanies, ...additionalNotOnPage];
   }

   if (activeCompanyIds.length === 0) {
     return [];
   }

   const allCompanies = new Map<number, Company>();
   
   displayData.forEach(company => {
     if (isCompanySelected(company.company_id)) {
       allCompanies.set(company.company_id, company);
     }
   });
   
   additionalSelectedCompanies.forEach(company => {
     if (isCompanySelected(company.company_id)) {
       allCompanies.set(company.company_id, company);
     }
   });
   
   const combined = Array.from(allCompanies.values());
   
   combined.sort((a, b) => {
     const { key, direction } = sortState;
     
     if (key === 'company_name') {
       const aVal = a.company_name || '';
       const bVal = b.company_name || '';
       return direction === 'asc' 
         ? aVal.localeCompare(bVal)
         : bVal.localeCompare(aVal);
     }
     
     if (key === 'tsx_code') {
       const aVal = a.tsx_code || '';
       const bVal = b.tsx_code || '';
       return direction === 'asc' 
         ? aVal.localeCompare(bVal)
         : bVal.localeCompare(aVal);
     }
     
     if (key === 'status') {
       const aVal = a.status || '';
       const bVal = b.status || '';
       return direction === 'asc' 
         ? aVal.localeCompare(bVal)
         : bVal.localeCompare(aVal);
     }
     
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
     const filename = `favorite_companies_${timestamp}.csv`;
     exportToCSV(exportData, filename);
   } catch (err: any) {
     console.error(`[CompaniesPage] Error exporting companies:`, err);
     alert(`Failed to export companies: ${err.message || 'Unknown error'}`);
   }
 }, [filteredCompanyIds, isCompanySelected, fetchCompaniesByIds]);

 const descriptionText = (
   <div className={cn("page-stats flex items-center gap-3 text-sm font-medium leading-normal text-gray-200")}>
     <motion.span 
       className="stat-item flex items-center gap-1"
       initial={{ opacity: 0, x: -20 }}
       animate={{ opacity: 1, x: 0 }}
       transition={{ delay: 0.1 }}
     >
       <Search className="h-4 w-4 text-gray-400" />
       <span className="stat-label">
         {loadingFilters ? (
           <span className="loading-dots inline-flex">
             <span>.</span><span>.</span><span>.</span>
           </span>
         ) : (
           totalCount.toLocaleString()
         )} matching
       </span>
     </motion.span>
     <span className="stat-divider text-gray-400">•</span>
     <motion.span 
       className="stat-item flex items-center gap-1 highlight"
       initial={{ opacity: 0, x: -20 }}
       animate={{ opacity: 1, x: 0 }}
       transition={{ delay: 0.2 }}
     >
       <CheckSquare className="h-4 w-4 text-cyan-400" />
       <span className="stat-label">
         {loadingFilters ? (
           <span className="loading-dots inline-flex">
             <span>.</span><span>.</span><span>.</span>
           </span>
         ) : (
           effectiveTotalCount.toLocaleString()
         )} selected
       </span>
     </motion.span>
   </div>
 );

 return (
   <PageContainer
     title="Mining Companies Database"
     description={descriptionText}
     actions={
       <motion.div
         initial={{ opacity: 0, scale: 0.9 }}
         animate={{ opacity: 1, scale: 1 }}
         transition={{ delay: 0.3 }}
       >
         <CurrencySelector />
       </motion.div>
     }
     className="companies-page-enhanced bg-navy-800/50 border-navy-600/50 rounded-xl"
     contentClassName="page-content-enhanced"
   >
     <div className="page-background-effects absolute inset-0 overflow-hidden" aria-hidden="true">
       <div className="gradient-orb gradient-orb-1 bg-cyan-400/20 blur-3xl" />
       <div className="gradient-orb gradient-orb-2 bg-navy-600/20 blur-3xl" />
       <div className="gradient-orb gradient-orb-3 bg-amber-400/20 blur-3xl" />
       <div className="noise-texture bg-navy-800/10 opacity-50" />
       <div className="grid-pattern bg-[url('/grid-pattern.png')] opacity-20" />
     </div>

     <div className="content-wrapper relative z-10">
       <motion.div 
         initial={{ opacity: 0, y: -20 }} 
         animate={{ opacity: 1, y: 0 }} 
         transition={{ duration: 0.5 }}
       >
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
           onImportFavorites={() => setShowImportModal(true)} // Added prop
         />
       </motion.div>

       <AnimatePresence>
         {additionalCompanyError && (
           <motion.div
             initial={{ opacity: 0, y: -10 }}
             animate={{ opacity: 1, y: 0 }}
             exit={{ opacity: 0, y: -10 }}
             className="mt-4 p-3 bg-amber-900/20 border border-amber-600/50 rounded-lg"
           >
             <p className="text-sm font-medium leading-normal text-amber-400 flex items-center gap-2">
               <AlertCircle className="h-4 w-4 flex-shrink-0" />
               {additionalCompanyError}
             </p>
           </motion.div>
         )}
       </AnimatePresence>

       <motion.div
         layout
         className="table-wrapper-enhanced mt-6"
         initial={{ opacity: 0, y: 20 }}
         animate={{ opacity: 1, y: 0 }}
         transition={{ duration: 0.5, delay: 0.2 }}
       >
         <AnimatePresence>
           {(loadingData || loadingAdditional) && (
             <motion.div
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               transition={{ duration: 0.3 }}
               className="loading-overlay absolute inset-0 bg-navy-800/50 backdrop-blur-sm flex items-center justify-center z-20"
             >
               <div className="loading-content flex flex-col items-center gap-2">
                 <div className="loading-spinner relative">
                   <RefreshCw className="spinner-icon h-6 w-6 text-cyan-400 animate-spin" />
                   <div className="spinner-ring absolute inset-0 border-2 border-cyan-400/20 rounded-full" />
                 </div>
                 <p className="loading-text text-sm font-medium leading-normal text-gray-200">
                   {loadingAdditional && !loadingData ? 'Loading selected companies...' : 'Loading data...'}
                 </p>
               </div>
             </motion.div>
           )}
         </AnimatePresence>

         {error ? (
           <motion.div 
             className="error-state flex flex-col items-center justify-center p-6 bg-navy-800/50 border border-navy-600/50 rounded-lg"
             initial={{ opacity: 0, scale: 0.9 }}
             animate={{ opacity: 1, scale: 1 }}
           >
             <AlertCircle className="error-icon h-8 w-8 text-red-400 mb-2" />
             <p className="error-message text-sm font-medium leading-normal text-gray-200">{error}</p>
             <Button 
               onClick={() => window.location.reload()} 
               variant="outline" 
               size="sm"
               className="error-retry-button mt-4 text-gray-200 border-navy-600/50 hover:bg-navy-700/50 text-sm font-medium leading-normal"
             >
               Retry
             </Button>
           </motion.div>
         ) : !loadingData && !loadingFilters && companiesForTable.length === 0 ? (
           <motion.div 
             className="empty-state-wrapper flex flex-col items-center justify-center p-6 bg-navy-800/50 border border-navy-600/50 rounded-lg"
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ delay: 0.3 }}
           >
             <div className="empty-state-content flex flex-col items-center gap-3">
               <div className="empty-icon-wrapper relative">
                 <Search className="empty-search-icon h-6 w-6 text-gray-400" />
                 <Sparkles className="empty-sparkle-icon h-4 w-4 text-amber-400 absolute top-0 right-0 transform translate-x-2 -translate-y-2" />
               </div>
               <p className="empty-title text-sm font-semibold leading-normal text-gray-200">No companies found</p>
               <p className="empty-subtitle text-xs font-medium leading-tight text-gray-400">
                 {activeCompanyIds.length === 0 && effectiveTotalCount === 0 
                   ? 'No companies are currently selected. Use search or select some companies to see them here.'
                   : 'Try adjusting your filters or search criteria'}
               </p>
               {hasActiveFilters && (
                 <Button 
                   onClick={resetFilters} 
                   variant="outline" 
                   size="sm"
                   className="clear-filters-button text-gray-200 border-navy-600/50 hover:bg-navy-700/50 text-sm font-medium leading-normal"
                 >
                   Clear All Filters
                 </Button>
               )}
             </div>
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

       <ImportFavoritesModal // Added modal
         isOpen={showImportModal}
         onClose={() => setShowImportModal(false)}
         onImport={handleImportFavorites}
         currentSelectedCount={effectiveTotalCount}
       />
     </div>
   </PageContainer>
 );
}