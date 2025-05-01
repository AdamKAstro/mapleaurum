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
import { useFilters } from '../contexts/filter-context';
import type { Company, SortState, ColumnTier, ColumnAccess, ColumnDef as AppColumnDef, ColumnGroup, CompanyStatus, MetricFormat, Currency } from '../lib/types';

interface CompanyDataTableProps {
    companies: Company[];
    onSort: (dbSortKey: string, direction: 'asc' | 'desc') => void;
    currentSort: SortState;
    currentTier: ColumnTier;
    page: number;
    pageSize: number;
    totalCount: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (pageSize: number) => void;
    excludedCompanyIds: Set<number>;
    onCompanyToggle: (companyId: number) => void;
}

const columnGroups: ColumnGroup[] = [
    {
        title: 'Company Profile',
        description: 'Core company information',
        className: 'bg-navy-800/20',
        columns: [
            { key: 'company_name', label: 'Company', sortable: true, sortKey: 'company_name', description: 'Company name and trading symbol', access: { tier: 'free' }, width: '210px' },
            { key: 'status', label: 'Status', sortable: true, sortKey: 'status', description: 'Company operational status', access: { tier: 'free' }, width: '100px' },
            { key: 'share_price', label: 'Share Price', sortable: true, sortKey: 'share_price', format: 'currency', description: 'Latest stock price', access: { tier: 'free' }, width: '90px' },
            { key: 'minerals_of_interest', label: 'Minerals', sortable: false, description: 'Primary minerals', access: { tier: 'free' }, width: '120px' },
            { key: 'percent_gold', label: 'Gold %', sortable: true, sortKey: 'percent_gold', format: 'percent', description: '% of resources/revenue from gold', access: { tier: 'free' }, width: '80px' },
            { key: 'percent_silver', label: 'Silver %', sortable: true, sortKey: 'percent_silver', format: 'percent', description: '% of resources/revenue from silver', access: { tier: 'free' }, width: '80px' },
        ],
    },
    {
        title: 'Financial Health',
        description: 'Key financial indicators',
        className: 'bg-navy-800/20',
        columns: [
            { key: 'financials.market_cap_value', label: 'Market Cap', sortable: true, sortKey: 'f_market_cap_value', format: 'compact', description: 'Market value', access: { tier: 'free' } },
            { key: 'financials.enterprise_value_value', label: 'EV', sortable: true, sortKey: 'f_enterprise_value_value', format: 'compact', description: 'Enterprise Value', access: { tier: 'free' } },
            { key: 'financials.cash_value', label: 'Cash', sortable: true, sortKey: 'f_cash_value', format: 'compact', description: 'Cash reserves', access: { tier: 'free' } },
            { key: 'financials.debt_value', label: 'Total Debt', sortable: true, sortKey: 'f_debt_value', format: 'compact', description: 'Total debt', access: { tier: 'medium' } },
            { key: 'financials.net_financial_assets', label: 'Net Assets', sortable: true, sortKey: 'f_net_financial_assets', format: 'compact', description: 'Net financial assets', access: { tier: 'free' } },
            { key: 'financials.free_cash_flow', label: 'FCF', sortable: true, sortKey: 'f_free_cash_flow', format: 'compact', description: 'Free Cash Flow', access: { tier: 'premium' } },
        ],
    },
    {
        title: 'Operating Metrics',
        description: 'Revenue and profitability',
        className: 'bg-navy-800/20',
        columns: [
            { key: 'financials.revenue_value', label: 'Revenue', sortable: true, sortKey: 'f_revenue_value', format: 'compact', description: 'Annual revenue', access: { tier: 'medium' } },
            { key: 'financials.ebitda', label: 'EBITDA', sortable: true, sortKey: 'f_ebitda', format: 'compact', description: 'EBITDA', access: { tier: 'premium' } },
            { key: 'financials.net_income_value', label: 'Net Income', sortable: true, sortKey: 'f_net_income_value', format: 'compact', description: 'Net Income', access: { tier: 'medium' } },
        ],
    },
    {
        title: 'Valuation Ratios',
        description: 'Relative valuation metrics',
        className: 'bg-navy-800/20',
        columns: [
            { key: 'valuation_metrics.ev_per_resource_oz_all', label: 'EV/Resrc oz', sortable: true, sortKey: 'vm_ev_per_resource_oz_all', format: 'decimal', description: 'EV per total resource oz', access: { tier: 'premium' } },
            { key: 'valuation_metrics.ev_per_reserve_oz_all', label: 'EV/Resv oz', sortable: true, sortKey: 'vm_ev_per_reserve_oz_all', format: 'decimal', description: 'EV per reserve oz', access: { tier: 'premium' } },
            { key: 'valuation_metrics.mkt_cap_per_resource_oz_all', label: 'MC/Resrc oz', sortable: true, sortKey: 'vm_mkt_cap_per_resource_oz_all', format: 'decimal', description: 'Market Cap per total resource oz', access: { tier: 'medium' } },
            { key: 'valuation_metrics.mkt_cap_per_reserve_oz_all', label: 'MC/Resv oz', sortable: true, sortKey: 'vm_mkt_cap_per_reserve_oz_all', format: 'decimal', description: 'Market Cap per reserve oz', access: { tier: 'medium' } },
        ],
    },
    {
        title: 'Resources & Grade',
        description: 'Mineral estimates',
        className: 'bg-navy-800/20',
        columns: [
            { key: 'mineral_estimates.reserves_total_aueq_moz', label: 'Total Resv', sortable: true, sortKey: 'me_reserves_total_aueq_moz', format: 'moz', description: 'Total Reserves (Moz AuEq)', access: { tier: 'medium' } },
            { key: 'mineral_estimates.measured_indicated_total_aueq_moz', label: 'Total M&I', sortable: true, sortKey: 'me_measured_indicated_total_aueq_moz', format: 'moz', description: 'Total M&I Resources (Moz AuEq)', access: { tier: 'medium' } },
            { key: 'mineral_estimates.resources_total_aueq_moz', label: 'Total Resrc', sortable: true, sortKey: 'me_resources_total_aueq_moz', format: 'moz', description: 'Total Resources (M+I+I, Moz AuEq)', access: { tier: 'medium' } },
        ],
    },
    {
        title: 'Production & Costs',
        description: 'Output and efficiency',
        className: 'bg-navy-800/20',
        columns: [
            { key: 'production.current_production_total_aueq_koz', label: 'Curr Prod.', sortable: true, sortKey: 'p_current_production_total_aueq_koz', format: 'koz', description: 'Current Production (koz AuEq)', access: { tier: 'premium' } },
            { key: 'production.future_production_total_aueq_koz', label: 'Fut Prod.', sortable: true, sortKey: 'p_future_production_total_aueq_koz', format: 'koz', description: 'Future Production (koz AuEq)', access: { tier: 'premium' } },
            { key: 'costs.aisc_last_year', label: 'AISC (Yr)', sortable: true, sortKey: 'c_aisc_last_year', format: 'currency', description: 'AISC (Prev Yr)', access: { tier: 'premium' } },
        ],
    },
];

function formatValueDisplay(value: any, format?: MetricFormat | 'compact' | 'decimal', currency?: Currency): string {
    if (value === null || value === undefined) return '-';
    const numValue = Number(value);
    if (!isFinite(numValue)) return '-';
    try {
        switch (format) {
            case 'currency':
                return formatCurrency ? formatCurrency(numValue, { currency: currency ?? 'USD', decimals: 2 }) : String(numValue);
            case 'percent':
                return formatPercent ? formatPercent(numValue, 1) : String(numValue) + '%';
            case 'number':
                return formatNumber ? formatNumber(numValue, { decimals: 0 }) : String(numValue);
            case 'decimal':
                return formatNumber ? formatNumber(numValue, { decimals: 2 }) : String(numValue);
            case 'compact':
                if (Math.abs(numValue) >= 1000 && formatNumber) {
                    return formatNumber(numValue, { compact: true, decimals: (Math.abs(numValue) >= 10000 && Math.abs(numValue) < 1000000) ? 1 : 0 });
                }
                if (formatNumber) {
                    return formatNumber(numValue, { decimals: (Math.abs(numValue) < 10 && numValue !== 0) ? 2 : 0 });
                }
                return String(numValue);
            case 'moz':
                return formatMoz ? formatMoz(numValue, 2) : String(numValue) + ' Moz';
            case 'koz':
                return formatKoz ? formatKoz(numValue, 0) : String(numValue) + ' koz';
            case 'years':
                return formatNumber ? `${formatNumber(numValue, { decimals: 1 })} yrs` : String(numValue) + ' yrs';
            case 'ratio':
                return formatNumber ? formatNumber(numValue, { decimals: 2 }) : String(numValue);
            default:
                return String(value);
        }
    } catch (e) {
        console.error('Error in formatValueDisplay:', value, format, e);
        return String(value);
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
const Pagination = React.memo(function Pagination({
    page,
    pageSize,
    totalCount,
    effectiveTotalCount,
    onPageChange,
    onPageSizeChange,
}: {
    page: number;
    pageSize: number;
    totalCount: number;
    effectiveTotalCount: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (pageSize: number) => void;
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
                        <span className="flex items-center">
                            <ChevronLeft className="h-4 w-4" />
                            <ChevronLeft className="h-4 w-4 -ml-2" />
                        </span>
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
                        <span className="flex items-center">
                            <ChevronRight className="h-4 w-4" />
                            <ChevronRight className="h-4 w-4 -ml-2" />
                        </span>
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
    excludedCompanyIds,
    onCompanyToggle,
}: CompanyDataTableProps) {
    const { currency } = useCurrency();
    const { effectiveTotalCount } = useFilters();

    const isColumnAccessible = useCallback((columnDef: AppColumnDef): boolean => {
        if (!columnDef.access) return true;
        const tierLevels: Record<ColumnTier, number> = { free: 0, medium: 1, premium: 2 };
        const userLevel = tierLevels[currentTier ?? 'free'];
        const requiredLevel = tierLevels[columnDef.access.tier];
        return userLevel >= requiredLevel;
    }, [currentTier]);

    const flatColumns = useMemo(() => columnGroups.flatMap(g => g.columns), []);

    const handleHeaderSortClick = useCallback((column: AppColumnDef) => {
        if (!column.sortable || !isColumnAccessible(column) || !column.key) return;
        const sortKey = column.sortKey || column.key;
        const nextDirection = (currentSort.key === sortKey && currentSort.direction === 'asc') ? 'desc' : 'asc';
        onSort(sortKey, nextDirection);
    }, [currentSort, onSort, isColumnAccessible]);

    const getSortIcon = useCallback((column: AppColumnDef) => {
        if (!column.sortable || !isColumnAccessible(column) || !column.key) return null;
        const sortKey = column.sortKey || column.key;
        if (currentSort.key === sortKey) {
            return currentSort.direction === 'asc' ? <ArrowUp className="w-full h-full text-cyan-400" /> : <ArrowDown className="w-full h-full text-cyan-400" />;
        }
        return <ArrowUpDown className="w-full h-full text-gray-500 opacity-30 group-hover:opacity-100 transition-opacity" />;
    }, [currentSort, isColumnAccessible]);

    const tableColumns = useMemo((): TanStackColumnDef<Company>[] => {
        const visibilityColumn: TanStackColumnDef<Company> = {
            id: 'visibility',
            size: 40,
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

        const otherColumns = flatColumns
            .filter(appCol => !!appCol.key)
            .map(appCol => {
                const accessible = isColumnAccessible(appCol);
                const columnId = appCol.key!;
                return {
                    id: columnId,
                    accessorFn: (row) => getNestedValue(row, appCol.key!),
                    header: () => {
                        const sortable = accessible && appCol.sortable;
                        return (
                            <div className={cn("flex items-center gap-1 px-2 h-full w-full", appCol.format ? "justify-end" : "justify-start", sortable ? 'cursor-pointer select-none group' : '')} onClick={sortable ? () => handleHeaderSortClick(appCol) : undefined}>
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
                        const v = getValue();
                        const c = row.original;
                        if (appCol.key === 'company_name') return <CompanyNameBadge name={toTitleCase(c.company_name)} code={c.tsx_code} headquarters={c.headquarters} description={c.description} className="text-left" />;
                        if (appCol.key === 'status') return <div className="flex justify-center"><StatusBadge status={v as CompanyStatus} /></div>;
                        if (appCol.key === 'minerals_of_interest') return <div className="flex justify-center w-full"><MineralsList minerals={v as string[]} /></div>;
                        return <div className={cn("truncate", appCol.format ? "text-right" : "text-left")}>{formatValueDisplay(v, appCol.format, currency)}</div>;
                    },
                    enableSorting: false,
                    size: appCol.width ? parseInt(appCol.width.replace('px', ''), 10) : 150,
                    meta: { appColDef: appCol },
                } as TanStackColumnDef<Company>;
            });

        return [visibilityColumn, ...otherColumns];
    }, [flatColumns, isColumnAccessible, handleHeaderSortClick, getSortIcon, excludedCompanyIds, onCompanyToggle, currentTier, currency]);

    const table = useReactTable({
        data: companies,
        columns: tableColumns,
        getCoreRowModel: getCoreRowModel(),
        manualPagination: true,
        manualSorting: true,
    });

    const tableContainerRef = useRef<HTMLDivElement>(null);
    const { rows } = table.getCoreRowModel();
    const rowVirtualizer = useVirtualizer({
        count: rows.length,
        getScrollElement: () => tableContainerRef.current,
        estimateSize: () => 42,
        overscan: 15,
    });
    const virtualRows = rowVirtualizer.getVirtualItems();
    const totalVirtualSize = rowVirtualizer.getTotalSize();
    const paddingTop = virtualRows.length > 0 ? virtualRows[0]?.start ?? 0 : 0;
    const paddingBottom = virtualRows.length > 0 ? totalVirtualSize - (virtualRows[virtualRows.length - 1]?.end ?? 0) : 0;

    return (
        <TooltipProvider delayDuration={150}>
            <div className="flex flex-col h-full">
                <div ref={tableContainerRef} className="table-container overflow-auto flex-grow" style={{ maxHeight: 'calc(100vh - 250px)' }}>
                    <table className="table-bg w-full border-collapse min-w-max">
                        <thead className="table-header sticky top-0 z-10 bg-navy-700/95 backdrop-blur-sm">
                            {table.getHeaderGroups().map(headerGroup => (
                                <tr key={headerGroup.id}>
                                    {headerGroup.headers.map(header => (
                                        <th
                                            key={header.id}
                                            colSpan={header.colSpan}
                                            className={cn(
                                                "table-cell font-semibold group text-xs whitespace-nowrap border-b border-x border-navy-600/50 text-gray-300 bg-navy-700/95 p-0 h-10",
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
                                            data-index={virtualRow.index}
                                            ref={node => rowVirtualizer.measureElement(node)}
                                            className="border-b border-navy-700/30 hover:bg-navy-700/20 transition-colors duration-150"
                                            style={{ height: `${virtualRow.size}px` }}
                                        >
                                            {row.getVisibleCells().map(cell => (
                                                <td
                                                    key={cell.id}
                                                    className={cn(
                                                        "table-cell relative text-xs p-2 border-r border-navy-700/20 text-gray-200 align-middle overflow-hidden",
                                                        (cell.column.columnDef.meta as any)?.appColDef?.format ? 'text-right' : 'text-left'
                                                    )}
                                                    style={{ width: cell.column.getSize() }}
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
                    effectiveTotalCount={effectiveTotalCount}
                    onPageChange={onPageChange}
                    onPageSizeChange={onPageSizeChange}
                />
            </div>
        </TooltipProvider>
    );
}