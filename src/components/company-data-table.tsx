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
import { cn, getNestedValue, formatCurrency, formatPercent, formatNumber, formatMoz, formatKoz, isValidNumber, toTitleCase } from '../lib/utils';
import { StatusBadge } from './status-badge';
import { CompanyNameBadge } from './company-name-badge';
import { MineralsList } from './mineral-badge';
import { Button } from './ui/button';
import { useCurrency } from '../contexts/currency-context';
import type { Company, SortState, ColumnTier, AppColumnDef, ColumnGroup, MetricFormat, Currency, MetricConfig, CompanyStatus } from '../lib/types';
import { metrics as allMetrics, metricCategories } from '../lib/metric-types';

interface CompanyDataTableProps {
  companies: (Company & { _isGhosted?: boolean })[];
  onSort: (dbSortKey: string, direction: 'asc' | 'desc') => void;
  currentSort: SortState;
  currentTier: ColumnTier;
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onCompanyToggle: (companyId: number) => void;
  isCompanySelected: (companyId: number) => boolean;
  showDeselected: boolean;
}

// OPTIMIZATION: Memoized cell renderer to prevent re-renders on scroll or sort
const MemoizedCell = React.memo(function MemoizedCell({
  company,
  appCol,
  value,
  currency,
  isGhostRow,
}: {
  company: Company & { _isGhosted?: boolean };
  appCol: AppColumnDef;
  value: any;
  currency: Currency;
  isGhostRow: boolean;
}) {
  const content = useMemo(() => {
    if (appCol.key === 'company_name') {
      return (
        <CompanyNameBadge
          name={toTitleCase(company.company_name)}
          code={company.tsx_code}
          headquarters={company.headquarters}
          description={company.description}
          className="text-left"
        />
      );
    }
    if (appCol.key === 'status') {
      return <StatusBadge status={value as CompanyStatus} />;
    }
    if (appCol.key === 'minerals_of_interest') {
      return <MineralsList minerals={value as string[] || []} />;
    }
    return formatValueDisplay(value, appCol.format, currency);
  }, [appCol.key, appCol.format, company.company_name, company.tsx_code, company.headquarters, company.description, value, currency]);

  return (
    <div
      className={cn(
        "truncate",
        isGhostRow && "opacity-50",
        appCol.key === 'company_name' && isGhostRow && "line-through",
        appCol.align === 'right' ? "text-right" : appCol.align === 'center' ? "text-center" : "text-left",
        appCol.key === 'status' || appCol.key === 'minerals_of_interest' ? "flex justify-center w-full" : ""
      )}
    >
      {content}
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.company.company_id === nextProps.company.company_id &&
    prevProps.appCol.key === nextProps.appCol.key &&
    prevProps.currency === nextProps.currency &&
    prevProps.isGhostRow === nextProps.isGhostRow &&
    (prevProps.value === nextProps.value ||
      (Array.isArray(prevProps.value) && Array.isArray(nextProps.value) &&
       prevProps.value.length === nextProps.value.length &&
       prevProps.value.every((v: any, i: number) => v === nextProps.value[i])))
  );
});

function createAppColumnDefFromMetric(metric: MetricConfig): AppColumnDef {
  let defaultWidth = '120px';
  if (metric.format === 'currency' || metric.format === 'compact' || metric.format === 'number') {
    defaultWidth = '100px';
  } else if (metric.format === 'percent' || metric.format === 'ratio') {
    defaultWidth = '80px';
  } else if (metric.label.length > 15) {
    defaultWidth = '150px';
  }
  return {
    key: metric.nested_path,
    label: metric.label,
    sortable: true,
    sortKey: metric.db_column,
    format: metric.format as MetricFormat | 'compact' | 'decimal',
    description: metric.description,
    access: { tier: metric.tier },
    width: defaultWidth,
    align: ['currency', 'percent', 'number', 'compact', 'decimal', 'moz', 'koz', 'ratio'].includes(metric.format) ? 'right' : 'left',
  };
}

const generatedColumnGroups: ColumnGroup[] = Object.entries(metricCategories).map(([categoryKey, categoryLabel]) => {
  const categoryMetrics = allMetrics.filter(metric => metric.category === categoryKey);

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
    className: 'bg-navy-800/20',
    columns: categoryMetrics.map(metric => {
      const columnDef = createAppColumnDefFromMetric(metric);
      if (metric.nested_path === 'company_name') {
        columnDef.width = '210px';
      }
      if (metric.nested_path === 'status') {
        columnDef.width = '100px';
        columnDef.align = 'center';
      }
      if (metric.nested_path === 'minerals_of_interest') {
        columnDef.sortable = false;
        columnDef.width = '150px';
        columnDef.align = 'center';
      }
      return columnDef;
    }),
  };
}).filter(group => group.columns.length > 0);

const manualCompanyProfileColumns: AppColumnDef[] = [
  { key: 'company_name', label: 'Company', sortable: true, sortKey: 'company_name', description: 'Company name and trading symbol.', access: { tier: 'free' }, width: '210px', align: 'left' },
  { key: 'status', label: 'Status', sortable: true, sortKey: 'status', description: 'Company operational status.', access: { tier: 'free' }, width: '100px', align: 'center' },
  { key: 'share_price', label: 'Share Price', sortable: true, sortKey: 'share_price', format: 'currency', description: 'Latest stock price.', access: { tier: 'free' }, width: '90px', align: 'right' },
  { key: 'minerals_of_interest', label: 'Minerals', sortable: false, description: 'Primary minerals the company explores for or produces.', access: { tier: 'free' }, width: '150px', align: 'center' },
  { key: 'percent_gold', label: 'Gold %', sortable: true, sortKey: 'percent_gold', format: 'percent', description: 'Percentage of revenue/resources attributed to gold.', access: { tier: 'free' }, width: '80px', align: 'right' },
  { key: 'percent_silver', label: 'Silver %', sortable: true, sortKey: 'percent_silver', format: 'percent', description: 'Percentage of revenue/resources attributed to silver.', access: { tier: 'free' }, width: '80px', align: 'right' },
];

let finalColumnGroups: ColumnGroup[] = generatedColumnGroups.filter(group => group.title !== 'Company Overview');
const companyOverviewGroupFromGenerated = generatedColumnGroups.find(group => group.title === 'Company Overview');

finalColumnGroups.unshift({
  title: 'Company Profile',
  description: 'Core company information and key identifiers.',
  className: 'bg-navy-800/20',
  columns: manualCompanyProfileColumns,
});

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

  if (format === 'string') return String(value);

  if (!isFinite(numValue)) return '-';

  try {
    switch (format) {
      case 'currency':
        return formatCurrency ? formatCurrency(numValue, { currency: currency ?? 'USD', decimals: 2 }) : String(numValue.toFixed(2));
      case 'percent':
        return formatPercent ? formatPercent(numValue, 1) : String((numValue * 100).toFixed(1)) + '%';
      case 'number':
        return formatNumber ? formatNumber(numValue, { decimals: 0 }) : String(Math.round(numValue));
      case 'decimal':
        return formatNumber ? formatNumber(numValue, { decimals: 2 }) : String(numValue.toFixed(2));
      case 'compact':
        if (formatNumber) {
          if (Math.abs(numValue) >= 1000) {
            return formatNumber(numValue, { compact: true, decimals: (Math.abs(numValue) >= 10000 && Math.abs(numValue) < 1000000) ? 1 : 0 });
          }
          return formatNumber(numValue, { decimals: (Math.abs(numValue) < 10 && numValue !== 0 && !Number.isInteger(numValue)) ? 2 : 0 });
        }
        return String(numValue);
      case 'moz':
        return formatMoz ? formatMoz(numValue, 2) : String(numValue.toFixed(2)) + ' Moz';
      case 'koz':
        return formatKoz ? formatKoz(numValue, 0) : String(Math.round(numValue)) + ' koz';
      case 'years':
        return formatNumber ? `${formatNumber(numValue, { decimals: 1 })} yrs` : String(numValue.toFixed(1)) + ' yrs';
      case 'ratio':
        return formatNumber ? formatNumber(numValue, { decimals: 2 }) : String(numValue.toFixed(2));
      default:
        if (typeof numValue === 'number') {
          return formatNumber ? formatNumber(numValue) : String(numValue);
        }
        return String(value);
    }
  } catch (e) {
    console.error('[CompanyDataTable] Error in formatValueDisplay:', value, format, e);
    return String(value);
  }
}

const pageSizeOptions = [10, 25, 50, 100];

const Pagination = React.memo(function Pagination({
  page,
  pageSize,
  totalCount,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}) {
  const totalPages = totalCount > 0 ? Math.ceil(totalCount / pageSize) : 1;
  const startItem = totalCount > 0 ? (page - 1) * pageSize + 1 : 0;
  const endItem = totalCount > 0 ? Math.min(page * pageSize, totalCount) : 0;
  const isFirstPage = page === 1;
  const isLastPage = page === totalPages || totalCount === 0;

  return (
    <div className="flex items-center justify-between flex-wrap gap-y-2 gap-x-4 px-3 py-1.5 border-t border-navy-600/50 text-xs text-gray-400 flex-shrink-0 bg-navy-800/50 rounded-b-lg">
      <div className="pagination-info whitespace-nowrap">
        Showing <span className="font-medium text-gray-200">{startItem}</span>-<span className="font-medium text-gray-200">{endItem}</span> of <span className="font-medium text-gray-200">{totalCount}</span> companies
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
          <Button onClick={() => onPageChange(1)} disabled={isFirstPage} variant="ghost" size="icon-sm" tooltipContent="First Page" className="text-gray-400 hover:text-white disabled:opacity-40">
            <span className="flex items-center"><ChevronLeft className="h-4 w-4" /><ChevronLeft className="h-4 w-4 -ml-2" /></span>
          </Button>
          <Button onClick={() => onPageChange(page - 1)} disabled={isFirstPage} variant="ghost" size="icon-sm" tooltipContent="Previous Page" className="text-gray-400 hover:text-white disabled:opacity-40">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs text-gray-300 px-1 sm:px-2 whitespace-nowrap">
            Page {page} of {totalPages}
          </span>
          <Button onClick={() => onPageChange(page + 1)} disabled={isLastPage} variant="ghost" size="icon-sm" tooltipContent="Next Page" className="text-gray-400 hover:text-white disabled:opacity-40">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button onClick={() => onPageChange(totalPages)} disabled={isLastPage} variant="ghost" size="icon-sm" tooltipContent="Last Page" className="text-gray-400 hover:text-white disabled:opacity-40">
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
  totalCount,
  onPageChange,
  onPageSizeChange,
  onCompanyToggle,
  isCompanySelected,
  showDeselected,
}: CompanyDataTableProps) {
  const { currency } = useCurrency();
  const tableContainerRef = useRef<HTMLDivElement>(null);

  const isColumnAccessible = useCallback((columnDef: AppColumnDef): boolean => {
    if (!columnDef.access) return true;
    const tierLevels: Record<ColumnTier, number> = { free: 0, pro: 1, premium: 2 };
    const userLevel = tierLevels[currentTier ?? 'free'];
    const requiredLevel = tierLevels[columnDef.access.tier];
    return userLevel >= requiredLevel;
  }, [currentTier]);

  const handleHeaderSortClick = useCallback((column: AppColumnDef) => {
    if (!column.sortable || !isColumnAccessible(column) || !column.key) return;
    const sortKey = column.sortKey || column.key;
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

  const tableColumns = useMemo((): TanStackColumnDef<Company & { _isGhosted?: boolean }>[] => {
    const selectionColumn: TanStackColumnDef<Company & { _isGhosted?: boolean }> = {
      id: 'selection',
      size: 40,
      header: () => <div className="px-2 text-center text-gray-400 text-xs">Sel.</div>,
      cell: ({ row }) => {
        const company = row.original;
        const isSelected = isCompanySelected(company.company_id);
        return (
          <div className="flex justify-center h-full items-center">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onCompanyToggle(company.company_id)}
              className="h-4 w-4 rounded border-gray-400 bg-navy-600 text-accent-teal focus:ring-1 focus:ring-accent-teal"
              aria-label={`Select ${company.company_name}`}
            />
          </div>
        );
      },
      enableSorting: false,
    };

    const groupedDataColumns = finalColumnGroups.map(group => ({
      id: group.title.replace(/\s+/g, '-').toLowerCase(),
      header: () => (
        <div className="text-center font-semibold text-sm text-gray-200 py-2">
          {group.title}
        </div>
      ),
      columns: group.columns
        .filter(appCol => !!appCol.key)
        .map(appCol => {
          const accessible = isColumnAccessible(appCol);
          return {
            id: appCol.key,
            accessorFn: (row) => getNestedValue(row, appCol.key),
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
                </div>
              );
            },
            cell: ({ row, getValue }) => {
              if (!accessible) {
                return <div className="flex justify-center items-center h-full w-full"><Lock className="h-3.5 w-3.5 text-gray-600" /></div>;
              }
              const value = getValue();
              const company = row.original;
              const isGhostRow = company._isGhosted || false;
              return (
                <MemoizedCell
                  company={company}
                  appCol={appCol}
                  value={value}
                  currency={currency}
                  isGhostRow={isGhostRow}
                />
              );
            },
            enableSorting: appCol.sortable,
            size: appCol.width ? parseInt(String(appCol.width).replace('px', ''), 10) : 150,
            meta: { appColDef: appCol },
          } as TanStackColumnDef<Company & { _isGhosted?: boolean }>;
        }),
    }));

    return [selectionColumn, ...groupedDataColumns];
  }, [isColumnAccessible, handleHeaderSortClick, getSortIcon, onCompanyToggle, currency, isCompanySelected]);

  const table = useReactTable({
    data: companies,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
  });

  const { rows } = table.getCoreRowModel();
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 42,
    overscan: 20,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalVirtualSize = rowVirtualizer.getTotalSize();
  const paddingTop = virtualRows.length > 0 ? virtualRows[0]?.start ?? 0 : 0;
  const paddingBottom = virtualRows.length > 0 ? totalVirtualSize - (virtualRows[virtualRows.length - 1]?.end ?? 0) : 0;

  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex flex-col h-full">
        <div ref={tableContainerRef} className="table-container overflow-auto flex-grow">
          <table className="table-bg w-full border-collapse min-w-max">
            <thead className="table-header sticky top-0 z-10 bg-navy-700/95 backdrop-blur-sm">
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map(header => {
                    const isGroupHeader = header.depth === 0 && header.subHeaders.length > 0;
                    return (
                      <th
                        key={header.id}
                        colSpan={header.colSpan}
                        className={cn(
                          "table-cell font-semibold group text-xs whitespace-nowrap border-b border-navy-600/50 text-gray-300 p-0",
                          isGroupHeader
                            ? "h-8 bg-navy-800/50 border-x"
                            : "h-10 bg-navy-700/95 border-x"
                        )}
                        style={{ width: header.getSize() }}
                      >
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    );
                  })}
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
                  const isGhostRow = row.original._isGhosted || false;
                  return (
                    <tr
                      key={row.id}
                      data-index={virtualRow.index}
                      ref={node => rowVirtualizer.measureElement(node)}
                      className={cn(
                        "border-b border-navy-700/30 transition-colors",
                        isGhostRow ? "opacity-50 bg-navy-900/20" : "hover:bg-navy-700/20"
                      )}
                      style={{ height: `${virtualRow.size}px` }}
                    >
                      {row.getVisibleCells().map(cell => (
                        <td
                          key={cell.id}
                          className={cn(
                            "table-cell relative text-xs p-2 border-r border-navy-700/20 text-gray-200 align-middle overflow-hidden",
                            isGhostRow && "opacity-50",
                            (cell.column.columnDef.meta as any)?.appColDef?.align === 'right' ? 'text-right' :
                            (cell.column.columnDef.meta as any)?.appColDef?.align === 'center' ? 'text-center' :
                            'text-left'
                          )}
                          style={{ width: cell.column.getSize() }}
                          title={
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
          totalCount={totalCount}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      </div>
    </TooltipProvider>
  );
}