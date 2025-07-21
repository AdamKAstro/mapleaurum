// src/components/company-data-table.tsx

import React, { useMemo, useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useReactTable,
  getCoreRowModel,
  ColumnDef as TanStackColumnDef,
  flexRender,
} from '@tanstack/react-table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { ArrowUpDown, ArrowUp, ArrowDown, Lock, ChevronLeft, ChevronRight, Building2, DollarSign, BarChart3, FileDown, FileUp, Heart, ExternalLink } from 'lucide-react';
import { TierBadge } from './ui/tier-badge';
import { cn, getNestedValue, formatCurrency, formatPercent, formatNumber, formatMoz, formatKoz, toTitleCase } from '../lib/utils';
import { StatusBadge } from './status-badge';
import { MineralsList } from './mineral-badge';
import { Button } from './ui/button';
import { useCurrency } from '../contexts/currency-context';
import { useFilters } from '../contexts/filter-context';
import { LazyLoadImage } from 'react-lazy-load-image-component';
import 'react-lazy-load-image-component/src/effects/blur.css';
import type { Company, SortState, ColumnTier, AppColumnDef, ColumnGroup, MetricFormat, Currency, MetricConfig, CompanyStatus } from '../lib/types';
import { metrics as allMetrics, metricCategories } from '../lib/metric-types';

// Logo utility functions
const safeString = (value: any, defaultValue: string = 'N/A'): string => {
  try {
    const result = value === null || value === undefined || value === '' ? defaultValue : String(value).trim();
    return result;
  } catch (error) {
    console.error(`[CompanyDataTable] safeString Error: ${value}`, error);
    return defaultValue;
  }
};

const getDefaultLogo = (name: string): string => {
  try {
    const firstLetter = safeString(name, 'X').charAt(0).toUpperCase();
    const defaultLogo = `https://ui-avatars.com/api/?name=${firstLetter}&background=0F172A&color=06B6D4&size=128&bold=true&font-size=0.5`;
    return defaultLogo;
  } catch (error) {
    console.error(`[CompanyDataTable] getDefaultLogo Error: ${name}`, error);
    return 'https://via.placeholder.com/64';
  }
};

const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// Company Logo Component with fallback
const CompanyLogo = React.memo(({
  company,
  size = 32
}: {
  company: Company;
  size?: number;
}) => {
  const [hasError, setHasError] = useState(false);

  const logoUrl = useMemo(() => {
    if (hasError) {
      return getDefaultLogo(company.company_name);
    }

    if (company.logo && isValidUrl(company.logo)) {
      return company.logo;
    }

    const supabaseUrl = `https://dvagrllvivewyxolrhsh.supabase.co/storage/v1/object/public/company-logos/logos/${company.company_id}.png`;
    return supabaseUrl;
  }, [company.logo, company.company_id, company.company_name, hasError]);

  const fallbackUrl = getDefaultLogo(company.company_name);

  return (
    <LazyLoadImage
      src={logoUrl}
      alt={`${company.company_name} logo`}
      className="rounded-full border border-navy-400 object-contain bg-navy-800/50"
      effect="blur"
      width={size}
      height={size}
      style={{ width: size, height: size, minWidth: size, minHeight: size }}
      onError={(e) => {
        console.debug(`[CompanyLogo] Failed to load: ${logoUrl}`);
        setHasError(true);
        (e.target as HTMLImageElement).src = fallbackUrl;
      }}
      placeholderSrc={fallbackUrl}
    />
  );
});

// Enhanced tooltip content
const CompanyTooltipContent = React.memo(({ company, currency }: { company: Company; currency: Currency }) => {
  const marketCap = company.financials?.market_cap_value
    ? formatCurrency(company.financials.market_cap_value, { currency: currency ?? 'USD', decimals: 2 })
    : '-';
  const sharePrice = company.share_price
    ? formatCurrency(company.share_price, { currency: currency ?? 'USD', decimals: 2 })
    : '-';

  return (
    <div className="company-tooltip-card p-4 bg-navy-800/50 border-navy-600/50">
      <div className="company-tooltip-header flex items-center gap-3 mb-3">
        <CompanyLogo company={company} size={40} />
        <div className="company-tooltip-info flex flex-col flex-1">
          <h3 className="company-tooltip-name text-base font-bold leading-normal text-gray-200">
            {toTitleCase(company.company_name)}
          </h3>
          <p className="company-tooltip-code text-xs font-medium leading-tight text-cyan-400 mt-1">
            {company.tsx_code ? `TSX: ${company.tsx_code}` : 'No ticker'}
          </p>
        </div>
      </div>

      {company.status && (
        <div className="my-3">
          <StatusBadge status={company.status as CompanyStatus} />
        </div>
      )}

      <p className="company-tooltip-description text-sm leading-normal text-gray-200 mb-4">
        {company.description || 'No description available.'}
      </p>

      {company.headquarters && (
        <p className="text-xs font-medium leading-tight text-gray-400 mt-2">
          <Building2 className="inline w-3 h-3 mr-1" />
          {company.headquarters}
        </p>
      )}

      <div className="company-tooltip-stats grid grid-cols-2 gap-3 pt-3 border-t border-navy-600/50">
        <div className="stat-item flex items-center gap-2 bg-slate-800/50 p-2 rounded-lg">
          <DollarSign className="stat-icon w-5 h-5 text-gray-400 flex-shrink-0 mt-1" />
          <div>
            <p className="stat-label text-xs font-medium leading-tight text-gray-400">Share Price</p>
            <p className="stat-value text-sm font-semibold leading-normal text-gray-200 mt-1">{sharePrice}</p>
          </div>
        </div>
        <div className="stat-item flex items-center gap-2 bg-slate-800/50 p-2 rounded-lg">
          <BarChart3 className="stat-icon w-5 h-5 text-gray-400 flex-shrink-0 mt-1" />
          <div>
            <p className="stat-label text-xs font-medium leading-tight text-gray-400">Market Cap</p>
            <p className="stat-value text-sm font-semibold leading-normal text-gray-200 mt-1">{marketCap}</p>
          </div>
        </div>
      </div>
    </div>
  );
});

// Memoized cell renderer for data columns
const MemoizedCell = React.memo(function MemoizedCell({
  company,
  appCol,
  value,
  currency,
  isGhostRow,
  isFavorite,
}: {
  company: Company & { _isGhosted?: boolean };
  appCol: AppColumnDef;
  value: any;
  currency: Currency;
  isGhostRow: boolean;
  isFavorite?: boolean;
}) {
  const { isCompanySelected } = useFilters();

  const content = useMemo(() => {
    if (appCol.key === 'company_name') {
      return (
        <div className={cn("flex items-center gap-3 py-2", isGhostRow && "opacity-50")}>
          <CompanyLogo company={company} size={32} />
          <div className={cn("flex flex-col flex-1", isGhostRow && "line-through")}>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm leading-normal text-gray-200">
                {toTitleCase(company.company_name)}
              </span>
              {isCompanySelected(company.company_id) && (
                <Heart className="h-3 w-3 text-accent-teal fill-current" />
              )}
            </div>
            {company.tsx_code && (
              <span className="text-xs font-medium leading-tight text-gray-400">
                TSX: {company.tsx_code}
              </span>
            )}
          </div>
        </div>
      );
    }
    if (appCol.key === 'status') {
      return <StatusBadge status={value as CompanyStatus} />;
    }
    if (appCol.key === 'minerals_of_interest') {
      return <MineralsList minerals={value as string[] || []} />;
    }
    return formatValueDisplay(value, appCol.format, currency);
  }, [appCol.key, appCol.format, company, value, currency, isGhostRow, isCompanySelected]);

  return (
    <div
      className={cn(
        "truncate",
        isGhostRow && "opacity-50",
        appCol.align === 'right' ? "text-right" : appCol.align === 'center' ? "text-center" : "text-left",
        appCol.key === 'status' || appCol.key === 'minerals_of_interest' ? "flex justify-center w-full" : "",
        appCol.key === 'company_name' ? "overflow-visible" : ""
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
    prevProps.value === nextProps.value &&
    prevProps.isFavorite === nextProps.isFavorite
  );
});

// Memoized cell renderer for details column
const MemoizedDetailsCell = React.memo(function MemoizedDetailsCell({
  company,
  isGhostRow,
}: {
  company: Company & { _isGhosted?: boolean };
  isGhostRow: boolean;
}) {
  const navigate = useNavigate();

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (company.company_id != null) {
      try {
        navigate(`/company/${company.company_id}`);
      } catch (error) {
        console.error(`[CompanyDataTable] Navigation error for company ${company.company_name}:`, error);
      }
    }
  }, [navigate, company.company_id, company.company_name]);

  const isDisabled = isGhostRow || company.company_id == null;

  return (
    <div className="flex justify-center items-center h-full p-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={isDisabled ? undefined : handleClick}
            className={cn(
              "p-1.2 rounded transition-all duration-200",
              isDisabled ? "opacity-50 cursor-not-allowed" : "hover:bg-navy-700/50 hover:text-cyan-400 hover:scale-110",
              "text-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-opacity-50"
            )}
            disabled={isDisabled}
            aria-label={`View details for ${company.company_name}`}
            aria-disabled={isDisabled}
            role="link"
            tabIndex={isDisabled ? -1 : 0}
          >
            <ExternalLink className="h-4 w-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" align="center" sideOffset={4} className="z-50 bg-navy-800/50 border-navy-600/50 text-gray-200 rounded px-2 py-1 text-sm">
          {isDisabled ? "Company ID unavailable" : "View Company Details"}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.company.company_id === nextProps.company.company_id &&
    prevProps.company.company_name === nextProps.company.company_name &&
    prevProps.isGhostRow === nextProps.isGhostRow
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
    className: 'bg-navy-800/50',
    columns: categoryMetrics.map(metric => {
      const columnDef = createAppColumnDefFromMetric(metric);
      if (metric.nested_path === 'company_name') {
        columnDef.width = '280px';
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
  { key: 'company_name', label: 'Company', sortable: true, sortKey: 'company_name', description: 'Company name and trading symbol.', access: { tier: 'free' }, width: '280px', align: 'left' },
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
  className: 'bg-navy-800',
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
        return formatCurrency(numValue, { currency: currency ?? 'USD', decimals: 2 });
      case 'percent':
        return formatPercent(numValue, 1);
      case 'number':
        return formatNumber(numValue, { decimals: 0 });
      case 'decimal':
        return formatNumber(numValue, { decimals: 2 });
      case 'compact':
        if (Math.abs(numValue) >= 1000) {
          return formatNumber(numValue, { compact: true, decimals: (Math.abs(numValue) >= 10000 && Math.abs(numValue) < 1000000) ? 1 : 0 });
        }
        return formatNumber(numValue, { decimals: (Math.abs(numValue) < 10 && numValue !== 0 && !Number.isInteger(numValue)) ? 2 : 0 });
      case 'moz':
        return formatMoz(numValue, 2);
      case 'koz':
        return formatKoz(numValue, 0);
      case 'years':
        return `${formatNumber(numValue, { decimals: 1 })} yrs`;
      case 'ratio':
        return formatNumber(numValue, { decimals: 2 });
      default:
        if (typeof numValue === 'number') {
          return formatNumber(numValue);
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
    <div className="pagination-container p-4 bg-navy-800/50 border-navy-600/50 flex items-center justify-between">
      <div className="pagination-info text-sm font-medium leading-normal text-gray-200">
        Showing <span className="font-semibold">{startItem}</span>-
        <span className="font-semibold">{endItem}</span> of{' '}
        <span className="font-semibold">{totalCount}</span> companies
      </div>
      <div className="pagination-controls flex items-center gap-2">
        <div className="flex items-center gap-2">
          <label htmlFor="pageSizeSelect" className="text-sm font-medium leading-normal text-gray-400">Rows:</label>
          <select
            id="pageSizeSelect"
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="page-size-select text-sm font-medium leading-normal text-gray-200 bg-navy-800/50 border-navy-600/50 rounded-md px-2 py-1"
            aria-label="Rows per page"
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-1">
          <Button
            onClick={() => onPageChange(1)}
            disabled={isFirstPage}
            variant="ghost"
            size="icon-sm"
            className="page-button text-gray-200 hover:bg-navy-700/50"
            tooltipContent="First Page"
          >
            <span className="flex items-center">
              <ChevronLeft className="h-3 w-3" />
              <ChevronLeft className="h-3 w-3 -ml-2" />
            </span>
          </Button>
          <Button
            onClick={() => onPageChange(page - 1)}
            disabled={isFirstPage}
            variant="ghost"
            size="icon-sm"
            className="page-button text-gray-200 hover:bg-navy-700/50"
            tooltipContent="Previous Page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="page-number-display text-sm font-medium leading-normal text-gray-200">
            Page {page} of {totalPages}
          </span>
          <Button
            onClick={() => onPageChange(page + 1)}
            disabled={isLastPage}
            variant="ghost"
            size="icon-sm"
            className="page-button text-gray-200 hover:bg-navy-700/50"
            tooltipContent="Next Page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            onClick={() => onPageChange(totalPages)}
            disabled={isLastPage}
            variant="ghost"
            size="icon-sm"
            className="page-button text-gray-200 hover:bg-navy-700/50"
            tooltipContent="Last Page"
          >
            <span className="flex items-center">
              <ChevronRight className="h-3 w-3" />
              <ChevronRight className="h-3 w-3 -ml-2" />
            </span>
          </Button>
        </div>
      </div>
    </div>
  );
});

// Favorites info bar component
const FavoritesInfoBar = React.memo(({
  selectedCount,
  totalCount,
  onExport,
  onImport,
  onClear
}: {
  selectedCount: number;
  totalCount: number;
  onExport: () => void;
  onImport: () => void;
  onClear: () => void;
}) => {
  if (selectedCount === 0) return null;

  return (
    <div className="favorites-info-bar p-4 bg-navy-800/50 border-navy-600/50">
      <div className="favorites-info-content flex items-center justify-between gap-4">
        <div className="favorites-count flex items-center gap-2 text-sm font-medium leading-normal text-gray-200">
          <Heart className="h-4 w-4 text-accent-teal fill-current" />
          <span className="font-semibold">{selectedCount}</span> of {totalCount} companies favorited
        </div>
        <div className="favorites-actions flex items-center gap-2">
          <Button
            onClick={onExport}
            variant="ghost"
            size="sm"
            className="favorites-action-button text-sm font-medium leading-normal text-gray-200 hover:bg-navy-700/50 border-navy-600/50"
          >
            <FileDown className="h-4 w-4 mr-1" />
            Export Favorites
          </Button>
          <Button
            onClick={onImport}
            variant="ghost"
            size="sm"
            className="favorites-action-button text-sm font-medium leading-normal text-gray-200 hover:bg-navy-700/50 border-navy-600/50"
          >
            <FileUp className="h-4 w-4 mr-1" />
            Import Favorites
          </Button>
          <Button
            onClick={onClear}
            variant="ghost"
            size="sm"
            className="favorites-action-button text-sm font-medium leading-normal text-red-400 hover:text-red-300 hover:bg-navy-700/50 border-navy-600/50"
          >
            Clear Favorites
          </Button>
        </div>
      </div>
    </div>
  );
});

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

  const selectedCount = companies.filter(c => isCompanySelected(c.company_id)).length;

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
      return currentSort.direction === 'asc' ?
        <ArrowUp className="w-3 h-3 text-cyan-400" /> :
        <ArrowDown className="w-3 h-3 text-cyan-400" />;
    }
    return <ArrowUpDown className="w-3 h-3 text-gray-400 opacity-30 group-hover:opacity-100 transition-opacity" />;
  }, [currentSort, isColumnAccessible]);

  const tableColumns = useMemo((): TanStackColumnDef<Company & { _isGhosted?: boolean }>[] => {
    const favoritesColumn: TanStackColumnDef<Company & { _isGhosted?: boolean }> = {
      id: 'favorites',
      size: 40,
      header: () => (
        <div className="px-2 text-center text-sm font-medium leading-normal text-gray-200">
          <Tooltip>
            <TooltipTrigger>
              <Heart className="h-4 w-4 mx-auto text-gray-400" />
            </TooltipTrigger>
            <TooltipContent className="z-50 bg-navy-800/50 border-navy-600/50 text-gray-200 rounded px-2 py-1 text-sm max-w-xs">
              Add/remove companies from favorites for bulk actions like export/import
            </TooltipContent>
          </Tooltip>
        </div>
      ),
      cell: ({ row }) => {
        const company = row.original;
        const isSelected = isCompanySelected(company.company_id);
        return (
          <div className="flex justify-center h-full items-center">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onCompanyToggle(company.company_id)}
              className="h-4 w-4 rounded border-navy-600/50 bg-navy-800/50 text-accent-teal focus:ring-1 focus:ring-accent-teal cursor-pointer"
              aria-label={`Favorite ${company.company_name}`}
            />
          </div>
        );
      },
      enableSorting: false,
    };

    const detailsColumn: TanStackColumnDef<Company & { _isGhosted?: boolean }> = {
      id: 'details',
      size: 30,
      header: () => <div className="text-center" />, // Headerless
      cell: ({ row }) => {
        const company = row.original;
        const isGhostRow = company._isGhosted || false;
        return <MemoizedDetailsCell company={company} isGhostRow={isGhostRow} />;
      },
      enableSorting: false,
    };

    const groupedDataColumns = finalColumnGroups.map(group => ({
      id: group.title.replace(/\s+/g, '-').toLowerCase(),
      header: () => (
        <div className="text-center font-semibold text-sm leading-normal text-gray-200 py-2">
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
                    "flex items-center gap-1 px-2 h-full w-full group",
                    appCol.align === 'right' ? "justify-end" :
                    appCol.align === 'center' ? "justify-center" :
                    "justify-start",
                    sortable ? 'cursor-pointer select-none' : ''
                  )}
                  onClick={sortable ? () => handleHeaderSortClick(appCol) : undefined}
                >
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="flex items-center gap-1">
                        {!accessible && <Lock className="h-3 w-3 text-gray-400 mr-1 flex-shrink-0" />}
                        <span className={cn("truncate text-sm font-semibold leading-normal text-gray-200", !accessible && "opacity-50")}>
                          {appCol.label}
                        </span>
                        {sortable && (
                          <span className="flex-shrink-0 ml-1">
                            {getSortIcon(appCol)}
                          </span>
                        )}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="z-50 bg-navy-800/50 border-navy-600/50 text-gray-200 rounded px-2 py-1 text-sm max-w-xs">
                      <p className="font-semibold text-gray-200">{appCol.label}</p>
                      {appCol.description && <p className="mt-1 text-gray-200">{appCol.description}</p>}
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
                return <div className="flex justify-center items-center h-full w-full"><Lock className="h-3.5 w-3.5 text-gray-400" /></div>;
              }
              const value = getValue();
              const company = row.original;
              const isGhostRow = company._isGhosted || false;
              const isFavorite = isCompanySelected(company.company_id);

              if (appCol.key === 'company_name') {
                return (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="cursor-pointer">
                        <MemoizedCell
                          company={company}
                          appCol={appCol}
                          value={value}
                          currency={currency}
                          isGhostRow={isGhostRow}
                          isFavorite={isFavorite}
                        />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right" align="start" sideOffset={10} className="z-50 bg-navy-800/50 border-navy-600/50">
                      <CompanyTooltipContent company={company} currency={currency} />
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return (
                <MemoizedCell
                  company={company}
                  appCol={appCol}
                  value={value}
                  currency={currency}
                  isGhostRow={isGhostRow}
                  isFavorite={isFavorite}
                />
              );
            },
            enableSorting: appCol.sortable,
            size: appCol.width ? parseInt(String(appCol.width).replace('px', ''), 10) : 150,
            meta: { appColDef: appCol },
          } as TanStackColumnDef<Company & { _isGhosted?: boolean }>;
        }),
    }));

    return [favoritesColumn, detailsColumn, ...groupedDataColumns];
  }, [isColumnAccessible, handleHeaderSortClick, getSortIcon, onCompanyToggle, currency, isCompanySelected]);

  const table = useReactTable({
    data: companies,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
  });

  const handleExportFavorites = () => {
    const selectedCompanies = companies
      .filter(c => isCompanySelected(c.company_id))
      .map(c => ({
        company_id: c.company_id,
        company_name: c.company_name,
        tsx_code: c.tsx_code,
      }));
    const csvContent = [
      ['Company ID', 'Company Name', 'TSX Code'].join(','),
      ...selectedCompanies.map(c => [c.company_id, `"${c.company_name}"`, c.tsx_code].join(',')),
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'favorite_companies.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleImportFavorites = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const rows = text.split('\n').slice(1); // Skip header
        const companyIds = rows
          .map(row => row.split(',')[0])
          .filter(id => id && !isNaN(Number(id)))
          .map(id => Number(id));
        companyIds.forEach(id => {
          if (!isCompanySelected(id)) {
            onCompanyToggle(id);
          }
        });
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleClearFavorites = () => {
    companies.forEach(c => {
      if (isCompanySelected(c.company_id)) {
        onCompanyToggle(c.company_id);
      }
    });
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="table-wrapper flex flex-col h-full rounded-xl shadow-xl border border-navy-600/50 overflow-hidden">
        <FavoritesInfoBar
          selectedCount={selectedCount}
          totalCount={totalCount}
          onExport={handleExportFavorites}
          onImport={handleImportFavorites}
          onClear={handleClearFavorites}
        />
        <div ref={tableContainerRef} className="table-scroll-container relative w-full overflow-auto">
          <table className="data-table border-collapse min-w-max">
            <thead className="table-header sticky top-0 z-10 bg-navy-800/50">
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map(header => {
                    const isGroupHeader = header.depth === 0 && header.subHeaders.length > 0;
                    return (
                      <th
                        key={header.id}
                        colSpan={header.colSpan}
                        className={cn(
                          "table-cell font-semibold text-sm leading-normal whitespace-nowrap border-b border-navy-600/50 text-gray-200 p-2 bg-navy-800/50",
                          isGroupHeader ? "h-8 border-x sticky top-0 z-20" : "h-10 border-x sticky top-[34px] z-10"
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
            <tbody className="table-body">
              {companies.length === 0 ? (
                <tr>
                  <td colSpan={table.getAllColumns().length} className="text-center p-8 text-sm font-medium leading-normal text-gray-200 bg-navy-700/30 h-32">
                    No companies match the current criteria
                  </td>
                </tr>
              ) : (
                companies.map((company, index) => {
                  const row = table.getRowModel().rows[index];
                  if (!row) return null;
                  const isGhostRow = company._isGhosted || false;
                  return (
                    <tr
                      key={row.id}
                      className={cn(
                        "border-b border-navy-600/50 transition-colors",
                        isGhostRow ? "opacity-50 bg-navy-900/20" : "hover:bg-navy-700/50"
                      )}
                    >
                      {row.getVisibleCells().map(cell => (
                        <td
                          key={cell.id}
                          className={cn(
                            "table-cell relative text-sm font-medium leading-normal p-2 border-r border-navy-600/50 text-gray-200 align-middle overflow-hidden bg-navy-700/30",
                            isGhostRow && "opacity-50",
                            (cell.column.columnDef.meta as any)?.appColDef?.align === 'right' ? 'text-right' :
                            (cell.column.columnDef.meta as any)?.appColDef?.align === 'center' ? 'text-center' : 'text-left'
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