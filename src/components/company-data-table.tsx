// src/components/company-data-table.tsx
import React, { useMemo, useCallback, useRef } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  ColumnDef as TanStackColumnDef,
  flexRender,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { ArrowUpDown, ArrowUp, ArrowDown, Lock, ChevronLeft, ChevronRight } from 'lucide-react';
import { TierBadge } from './ui/tier-badge';
import { cn, getNestedValue, formatNumber, formatCurrency, formatPercent, formatMoz, formatKoz, isValidNumber } from '../lib/utils';
import { StatusBadge } from './status-badge';
import { CompanyNameBadge } from './company-name-badge';
import { MineralsList } from './mineral-badge';
import { Button } from './ui/button';
import { useCurrency } from '../contexts/currency-context';
import { useFilters } from '../contexts/filter-context'; // To get effectiveTotalCount
import type {
  Company,
  SortState,
  ColumnTier,
  // ColumnAccess, // AppColumnDef.access is directly { tier: ColumnTier }
  AppColumnDef, // Using AppColumnDef as the primary type for column definitions
  ColumnGroup,
  CompanyStatus,
  MetricFormat,
  Currency
} from '../lib/types';
import { metrics as allMetrics, metricCategories } from '../lib/metric-types'; // Import all defined metrics

interface CompanyDataTableProps {
  companies: Company[];
  onSort: (dbSortKey: string, direction: 'asc' | 'desc') => void;
  currentSort: SortState;
  currentTier: ColumnTier;
  page: number;
  pageSize: number;
  totalCount: number; // This is the count from the DB before client-side exclusions
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  excludedCompanyIds: Set<number>;
  onCompanyToggle: (companyId: number) => void;
}

// Helper function to generate AppColumnDef from MetricConfig
const createAppColumnDefFromMetric = (metric: MetricConfig): AppColumnDef => {
  // Determine a default width based on format or label length if not specified by metric
  let defaultWidth = '120px'; // Default
  if (metric.format === 'currency' || metric.format === 'compact' || metric.format === 'number') {
    defaultWidth = '100px';
  } else if (metric.format === 'percent' || metric.format === 'ratio') {
    defaultWidth = '80px';
  } else if (metric.label.length > 15) {
    defaultWidth = '150px';
  }

  return {
    key: metric.nested_path, // Used by getNestedValue
    label: metric.label,
    sortable: true, // Default to true for most metrics, can be overridden
    sortKey: metric.db_column, // For backend sorting
    format: metric.format as MetricFormat | 'compact' | 'decimal', // Cast as needed
    description: metric.description,
    access: { tier: metric.tier },
    width: defaultWidth, // Provide a sensible default or allow override
    align: (metric.format === 'currency' || metric.format === 'percent' || metric.format === 'number' || metric.format === 'compact' || metric.format === 'decimal' || metric.format === 'moz' || metric.format === 'koz' || metric.format === 'ratio') ? 'right' : 'left',
  };
};

// Dynamically generate columnGroups from allMetricConfigs
const generatedColumnGroups: ColumnGroup[] = Object.entries(metricCategories).map(([categoryKey, categoryLabel]) => {
  const categoryMetrics = allMetrics.filter(metric => metric.category === categoryKey);
  
  // Define a default description for the category if not provided by a master config for categories
  let categoryDescription = `Key metrics related to ${categoryLabel.toLowerCase()}`;
  if (categoryKey === 'company-overview') categoryDescription = 'Core company information and identifiers.';
  if (categoryKey === 'financials') categoryDescription = 'Key financial health indicators and performance ratios.';
  if (categoryKey === 'capital-structure') categoryDescription = 'Details about company shares, options, and equity structure.';
  if (categoryKey === 'mineral-estimates') categoryDescription = 'Mineral resource and reserve estimates, indicating asset base.';
  if (categoryKey === 'valuation-metrics') categoryDescription = 'Metrics for assessing company valuation relative to assets or earnings.';
  if (categoryKey === 'production') categoryDescription = 'Data related to current and future mineral production output.';
  if (categoryKey === 'costs') categoryDescription = 'Key cost metrics for mining operations and projects.';


  return {
    title: categoryLabel,
    description: categoryDescription,
    className: 'bg-navy-800/20', // Consistent styling
    columns: categoryMetrics.map(metric => {
        const columnDef = createAppColumnDefFromMetric(metric);
        // Specific overrides if needed
        if (metric.nested_path === 'company_name') {
            columnDef.width = '210px';
        }
        if (metric.nested_path === 'status') {
            columnDef.width = '100px';
            columnDef.align = 'center';
        }
         if (metric.nested_path === 'minerals_of_interest') {
            columnDef.sortable = false; // minerals_of_interest is typically not sorted
            columnDef.width = '150px'; 
            columnDef.align = 'center';
        }
        // Add other specific overrides for width or sortability here if needed
        return columnDef;
    }),
  };
}).filter(group => group.columns.length > 0); // Only include groups that have columns

// Manually define column definitions for non-metric fields or those needing special handling
// These will be merged or prepended/appended to generatedColumnGroups's columns
const manualCompanyProfileColumns: AppColumnDef[] = [
    { key: 'company_name', label: 'Company', sortable: true, sortKey: 'company_name', description: 'Company name and trading symbol.', access: { tier: 'free' }, width: '210px', align: 'left' },
    { key: 'status', label: 'Status', sortable: true, sortKey: 'status', description: 'Company operational status.', access: { tier: 'free' }, width: '100px', align: 'center' },
    { key: 'share_price', label: 'Share Price', sortable: true, sortKey: 'share_price', format: 'currency', description: 'Latest stock price.', access: { tier: 'free' }, width: '90px', align: 'right' },
    { key: 'minerals_of_interest', label: 'Minerals', sortable: false, description: 'Primary minerals the company explores for or produces.', access: { tier: 'free' }, width: '150px', align: 'center' },
    { key: 'percent_gold', label: 'Gold %', sortable: true, sortKey: 'percent_gold', format: 'percent', description: 'Percentage of revenue/resources attributed to gold.', access: { tier: 'free' }, width: '80px', align: 'right' },
    { key: 'percent_silver', label: 'Silver %', sortable: true, sortKey: 'percent_silver', format: 'percent', description: 'Percentage of revenue/resources attributed to silver.', access: { tier: 'free' }, width: '80px', align: 'right' },
];

// Combine: Use generated groups, but replace 'Company Profile' if it was generated, with the manual one for specific order/overrides.
let finalColumnGroups: ColumnGroup[] = generatedColumnGroups.filter(group => group.title !== 'Company Overview');
const companyOverviewGroupFromGenerated = generatedColumnGroups.find(group => group.title === 'Company Overview');

finalColumnGroups.unshift({
    title: 'Company Profile',
    description: 'Core company information and key identifiers.',
    className: 'bg-navy-800/20',
    columns: manualCompanyProfileColumns,
});

// Add other metrics from the generated 'Company Overview' group that weren't in manualCompanyProfileColumns, if any
if (companyOverviewGroupFromGenerated) {
    const companyProfileGroup = finalColumnGroups.find(g => g.title === 'Company Profile');
    if (companyProfileGroup) {
        companyOverviewGroupFromGenerated.columns.forEach(generatedCol => {
            if (!companyProfileGroup.columns.some(manualCol => manualCol.key === generatedCol.key)) {
                companyProfileGroup.columns.push(generatedCol);
            }
        });
    }
}


function formatValueDisplay(value: any, format?: MetricFormat | 'compact' | 'decimal', currency?: Currency): string {
  if (value === null || value === undefined) return '-';
  const numValue = Number(value);
  
  // Special handling for formats that don't require isFinite check (like 'string')
  if (format === 'string') return String(value);

  if (!isFinite(numValue)) return '-'; // Apply for numeric formats after string check

  try {
    switch (format) {
      case 'currency':
        return formatCurrency ? formatCurrency(numValue, { currency: currency ?? 'USD', decimals: 2 }) : String(numValue.toFixed(2));
      case 'percent':
        return formatPercent ? formatPercent(numValue, 1) : String((numValue * 100).toFixed(1)) + '%'; // Assuming input is decimal for percent
      case 'number':
        return formatNumber ? formatNumber(numValue, { decimals: 0 }) : String(Math.round(numValue));
      case 'decimal': // Typically for ratios or precise numbers
        return formatNumber ? formatNumber(numValue, { decimals: 2 }) : String(numValue.toFixed(2));
      case 'compact':
        if (formatNumber) {
            if (Math.abs(numValue) >= 1000) {
                 return formatNumber(numValue, { compact: true, decimals: (Math.abs(numValue) >= 10000 && Math.abs(numValue) < 1000000) ? 1 : 0 });
            }
            return formatNumber(numValue, { decimals: (Math.abs(numValue) < 10 && numValue !== 0 && !Number.isInteger(numValue)) ? 2 : 0 });
        }
        return String(numValue); // Fallback
      case 'moz':
        return formatMoz ? formatMoz(numValue, 2) : String(numValue.toFixed(2)) + ' Moz';
      case 'koz':
        return formatKoz ? formatKoz(numValue, 0) : String(Math.round(numValue)) + ' koz';
      case 'years':
        return formatNumber ? `${formatNumber(numValue, { decimals: 1 })} yrs` : String(numValue.toFixed(1)) + ' yrs';
      case 'ratio':
        return formatNumber ? formatNumber(numValue, { decimals: 2 }) : String(numValue.toFixed(2));
      default:
        // Attempt to format as a number if format is unknown but value is numeric
        if (typeof numValue === 'number') {
          return formatNumber ? formatNumber(numValue) : String(numValue);
        }
        return String(value);
    }
  } catch (e) {
    console.error('[CompanyDataTable] Error in formatValueDisplay:', value, format, e);
    return String(value); // Fallback in case of error
  }
}

function toTitleCase(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .replace(/_/g, ' ')
    .replace(/-/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, char => char.toUpperCase());
}

const pageSizeOptions = [10, 25, 50, 100];

// Pagination Component remains unchanged from your provided code
const Pagination = React.memo(function Pagination({
    page, pageSize, totalCount, effectiveTotalCount, onPageChange, onPageSizeChange,
}: {
    page: number; pageSize: number; totalCount: number; effectiveTotalCount: number;
    onPageChange: (page: number) => void; onPageSizeChange: (pageSize: number) => void;
}) {
  const totalPages = effectiveTotalCount > 0 ? Math.ceil(effectiveTotalCount / pageSize) : 1;
  const startItem = effectiveTotalCount > 0 ? (page - 1) * pageSize + 1 : 0;
  const endItem = effectiveTotalCount > 0 ? Math.min(page * pageSize, effectiveTotalCount) : 0;
  const isFirstPage = page === 1;
  const isLastPage = page === totalPages || effectiveTotalCount === 0;

  return (
    <div className="flex items-center justify-between flex-wrap gap-y-2 gap-x-4 px-3 py-1.5 border-t border-navy-600/50 text-xs text-gray-400 flex-shrink-0 bg-navy-800/50 rounded-b-lg">
        <div className="pagination-info whitespace-nowrap">
            Showing <span className="font-medium text-gray-200">{startItem}</span>-<span className="font-medium text-gray-200">{endItem}</span> of <span className="font-medium text-gray-200">{effectiveTotalCount}</span> companies
        </div>
        <div className="flex items-center gap-x-4 gap-y-2 flex-wrap justify-end sm:justify-start">
            <div className="flex items-center gap-1.5">
                <label htmlFor="pageSizeSelect" className="text-gray-400">Rows:</label>
                <select
                    id="pageSizeSelect"
                    value={pageSize}
                    onChange={(e) => onPageSizeChange(Number(e.target.value))}
                    className="bg-navy-600 border border-navy-400/50 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-cyan-500 focus:outline-none text-gray-200 appearance-none pr-5 cursor-pointer hover:border-navy-300"
                    aria-label="Rows per page"
                    style={{ paddingRight: '1.5rem' }}
                >
                    {pageSizeOptions.map((size) => (
                        <option key={size} value={size}>{size}</option>
                    ))}
                </select>
            </div>
            <div className="pagination-controls flex items-center gap-1">
                <Button onClick={() => onPageChange(1)} disabled={isFirstPage} variant="ghost" size="icon-sm" title="First Page" className="text-gray-400 hover:text-white disabled:opacity-40">
                    <span className="flex items-center"><ChevronLeft className="h-4 w-4" /><ChevronLeft className="h-4 w-4 -ml-2" /></span>
                </Button>
                <Button onClick={() => onPageChange(page - 1)} disabled={isFirstPage} variant="ghost" size="icon-sm" title="Previous Page" className="text-gray-400 hover:text-white disabled:opacity-40">
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs text-gray-300 px-1 sm:px-2 whitespace-nowrap">
                    Page {page} of {totalPages}
                </span>
                <Button onClick={() => onPageChange(page + 1)} disabled={isLastPage} variant="ghost" size="icon-sm" title="Next Page" className="text-gray-400 hover:text-white disabled:opacity-40">
                    <ChevronRight className="h-4 w-4" />
                </Button>
                <Button onClick={() => onPageChange(totalPages)} disabled={isLastPage} variant="ghost" size="icon-sm" title="Last Page" className="text-gray-400 hover:text-white disabled:opacity-40">
                    <span className="flex items-center"><ChevronRight className="h-4 w-4" /><ChevronRight className="h-4 w-4 -ml-2" /></span>
                </Button>
            </div>
        </div>
    </div>
  );
});


export function CompanyDataTable({
  companies,
  onSort,
  currentSort,
  currentTier,
  page,
  pageSize,
  totalCount, // Received from props
  onPageChange,
  onPageSizeChange,
  excludedCompanyIds,
  onCompanyToggle,
}: CompanyDataTableProps) {
  const { currency } = useCurrency();
  // Get effectiveTotalCount from useFilters context as it accounts for client-side exclusions
  const { effectiveTotalCount } = useFilters(); 

  const isColumnAccessible = useCallback((columnDef: AppColumnDef): boolean => {
    if (!columnDef.access) return true; // Public column
    const tierLevels: Record<ColumnTier, number> = { free: 0, pro: 1, premium: 2 }; // ALIGNED
    const userLevel = tierLevels[currentTier ?? 'free'];
    const requiredLevel = tierLevels[columnDef.access.tier];
    return userLevel >= requiredLevel;
  }, [currentTier]);

  // Use the dynamically generated and then finalized column groups
  const activeColumnGroups = useMemo(() => finalColumnGroups, []); 
  const flatColumns = useMemo(() => activeColumnGroups.flatMap(g => g.columns), [activeColumnGroups]);

  const handleHeaderSortClick = useCallback((column: AppColumnDef) => {
    if (!column.sortable || !isColumnAccessible(column) || !column.key) return;
    const sortKey = column.sortKey || column.key; // Use sortKey if provided (should be db_column), else fallback to key (nested_path)
    if (!sortKey) {
        console.warn(`[CompanyDataTable] Attempted to sort column "${column.label}" but it has no sortKey or key defined.`);
        return;
    }
    const nextDirection = (currentSort.key === sortKey && currentSort.direction === 'asc') ? 'desc' : 'asc';
    onSort(sortKey, nextDirection);
  }, [currentSort, onSort, isColumnAccessible]);

  const getSortIcon = useCallback((column: AppColumnDef) => {
    if (!column.sortable || !isColumnAccessible(column)) return null;
    const sortKey = column.sortKey || column.key;
     if (!sortKey) return null;
    if (currentSort.key === sortKey) {
      return currentSort.direction === 'asc' ? <ArrowUp className="w-full h-full text-cyan-400" /> : <ArrowDown className="w-full h-full text-cyan-400" />;
    }
    return <ArrowUpDown className="w-full h-full text-gray-500 opacity-30 group-hover:opacity-100 transition-opacity" />;
  }, [currentSort, isColumnAccessible]);

  const tableColumns = useMemo((): TanStackColumnDef<Company>[] => {
    const visibilityColumn: TanStackColumnDef<Company> = {
      id: 'visibility',
      size: 40, // Fixed size for checkbox column
      header: () => <div className="px-2 text-center text-gray-400 text-[11px] leading-tight">Included</div>,
      cell: ({ row }) => {
        const company = row.original;
        return (
          <div className="flex justify-center px-2 h-full items-center">
            <input
              type="checkbox"
              checked={!excludedCompanyIds.has(company.company_id)}
              onChange={() => onCompanyToggle(company.company_id)}
              className="h-4 w-4 rounded border-gray-400 bg-navy-600 text-accent-teal focus:ring-1 focus:ring-accent-teal focus:ring-offset-1 focus:ring-offset-navy-800 cursor-pointer"
              aria-label={`Toggle visibility for ${company.company_name}`}
            />
          </div>
        );
      },
      enableSorting: false,
    };

    const dataColumns = flatColumns
      .filter(appCol => !!appCol.key) // Ensure column has a key
      .map(appCol => {
        const accessible = isColumnAccessible(appCol);
        const columnId = appCol.key; // This is the nested_path

        return {
          id: columnId,
          accessorFn: (row) => getNestedValue(row, appCol.key), // appCol.key is nested_path
          header: () => {
            const sortable = accessible && appCol.sortable;
            return (
              <div
                className={cn(
                  "flex items-center gap-1 px-2 h-full w-full",
                  appCol.align === 'right' ? "justify-end" : appCol.align === 'center' ? "justify-center" : "justify-start",
                  sortable ? 'cursor-pointer select-none group' : ''
                )}
                onClick={sortable ? () => handleHeaderSortClick(appCol) : undefined}
              >
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="flex items-center gap-1">
                        {!accessible && <Lock className="h-3 w-3 text-gray-500 mr-1 flex-shrink-0" />}
                        <span className={cn("truncate", !accessible && "opacity-50")}>{appCol.label}</span>
                        {sortable && <span className="flex-shrink-0 w-3 h-3 ml-1">{getSortIcon(appCol)}</span>}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="tooltip-content z-50 bg-navy-600 border-navy-500 text-gray-200 rounded px-2 py-1 text-xs">
                      <p className="font-medium">{appCol.label}</p>
                      {appCol.description && <p className="mt-1">{appCol.description}</p>}
                      {!accessible && appCol.access && (
                        <div className="mt-1.5 flex items-center gap-1">
                          <TierBadge tier={appCol.access.tier} />
                          <span className="text-yellow-400">Required</span>
                        </div>
                      )}
                      {sortable && <p className="text-gray-400 text-xs mt-1 italic">Click to sort</p>}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            );
          },
          cell: ({ row, getValue }) => {
            if (!accessible) {
              return <div className="flex justify-center items-center h-full w-full"><Lock className="h-3.5 w-3.5 text-gray-600" /></div>;
            }
            const rawValue = getValue(); // Value from accessorFn (getNestedValue)
            const company = row.original;

            // Specific renderers
            if (appCol.key === 'company_name') {
              return <CompanyNameBadge name={toTitleCase(company.company_name)} code={company.tsx_code} headquarters={company.headquarters} description={company.description} className="text-left" />;
            }
            if (appCol.key === 'status') {
              return <div className="flex justify-center"><StatusBadge status={rawValue as CompanyStatus} /></div>;
            }
            if (appCol.key === 'minerals_of_interest') {
              // Assuming 'v' from getNestedValue is already string[] | null due to converter
              return <div className="flex justify-center w-full"><MineralsList minerals={rawValue as string[] || []} /></div>;
            }
            // Default rendering using formatValueDisplay
            return (
                <div className={cn("truncate", appCol.align === 'right' ? "text-right" : appCol.align === 'center' ? "text-center" : "text-left")}>
                    {formatValueDisplay(rawValue, appCol.format, currency)}
                </div>
            );
          },
          enableSorting: appCol.sortable, // Tanstack table sorting enable flag
          size: appCol.width ? parseInt(String(appCol.width).replace('px', ''), 10) : 150, // Default size
          meta: { appColDef: appCol }, // Store original AppColumnDef for reference if needed
        } as TanStackColumnDef<Company>;
      });

    return [visibilityColumn, ...dataColumns];
  }, [flatColumns, isColumnAccessible, handleHeaderSortClick, getSortIcon, excludedCompanyIds, onCompanyToggle, currentTier, currency]); // Added activeColumnGroups to dependencies of flatColumns

  const table = useReactTable({
    data: companies,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true, // Important: we handle sorting via onSort prop
    state: { // Control sorting state from props
        sorting: currentSort.key ? [{ id: currentSort.key, desc: currentSort.direction === 'desc' }] : [],
    },
  });

  const tableContainerRef = useRef<HTMLDivElement>(null);
  const { rows } = table.getCoreRowModel();
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 42, // Estimate row height
    overscan: 15,
  });
  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalVirtualSize = rowVirtualizer.getTotalSize();
  const paddingTop = virtualRows.length > 0 ? virtualRows[0]?.start ?? 0 : 0;
  const paddingBottom = virtualRows.length > 0 ? totalVirtualSize - (virtualRows[virtualRows.length - 1]?.end ?? 0) : 0;

  if (process.env.NODE_ENV === 'development') {
    console.log('[CompanyDataTable][DEBUG] Rendering. CurrentTier:', currentTier, 'Companies count:', companies.length, 'EffectiveTotalCount for Pagination:', effectiveTotalCount);
    // console.log('[CompanyDataTable][DEBUG] Final Column Groups:', finalColumnGroups);
    // console.log('[CompanyDataTable][DEBUG] Flat Columns for Table:', flatColumns);
  }

  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex flex-col h-full">
        <div ref={tableContainerRef} className="table-container overflow-auto flex-grow" style={{ maxHeight: 'calc(100vh - 250px)' }}> {/* Adjust max-height as needed */}
          <table className="table-bg w-full border-collapse min-w-max"> {/* min-w-max helps with many columns */}
            <thead className="table-header sticky top-0 z-10 bg-navy-700/95 backdrop-blur-sm">
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map(header => (
                    <th
                      key={header.id}
                      colSpan={header.colSpan}
                      className={cn(
                        "table-cell font-semibold group text-xs whitespace-nowrap border-b border-x border-navy-600/50 text-gray-300 bg-navy-700/95 p-0 h-10",
                        // (header.column.columnDef.meta as any)?.appColDef?.sortable ? 'cursor-pointer' : '' // Already handled in div
                      )}
                      style={{ width: header.getSize() }}
                    >
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="relative bg-navy-800/40">
              {paddingTop > 0 && (
                <tr style={{ height: `${paddingTop}px` }}>
                  <td colSpan={table.getAllColumns().length}></td>
                </tr>
              )}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={table.getAllColumns().length} className="text-center p-8 text-gray-500 italic h-32">
                    No companies match criteria
                  </td>
                </tr>
              ) : (
                virtualRows.map(virtualRow => {
                  const row = rows[virtualRow.index];
                  return (
                    <tr
                      key={row.id}
                      data-index={virtualRow.index} // For TanStack Virtual
                      ref={node => rowVirtualizer.measureElement(node)} // For TanStack Virtual
                      className="border-b border-navy-700/30 hover:bg-navy-700/20 transition-colors duration-150"
                      style={{ height: `${virtualRow.size}px` }}
                    >
                      {row.getVisibleCells().map(cell => (
                        <td
                          key={cell.id}
                          className={cn(
                            "table-cell relative text-xs p-2 border-r border-navy-700/20 text-gray-200 align-middle overflow-hidden",
                            // Use align from AppColumnDef if available
                            (cell.column.columnDef.meta as any)?.appColDef?.align === 'right' ? 'text-right' :
                            (cell.column.columnDef.meta as any)?.appColDef?.align === 'center' ? 'text-center' :
                            'text-left'
                          )}
                          style={{ width: cell.column.getSize() }}
                          title={ // Add a basic title attribute for truncated text, can be enhanced
                            typeof cell.getValue() === 'string' || typeof cell.getValue() === 'number' 
                            ? String(cell.getValue()) 
                            : undefined
                          }
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  );
                })
              )}
              {paddingBottom > 0 && (
                <tr style={{ height: `${paddingBottom}px` }}>
                  <td colSpan={table.getAllColumns().length}></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          page={page}
          pageSize={pageSize}
          totalCount={totalCount} // Use the raw totalCount from DB for display purposes
          effectiveTotalCount={effectiveTotalCount} // Use effective count for page calculation
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      </div>
    </TooltipProvider>
  );
}