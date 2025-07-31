// src/components/ui/page-container.tsx
import React from 'react';
import { Link, useLocation } from 'react-router-dom';

import {
  Home,
  Table2,
  LineChart,
  Filter,
  Crown,
  ChevronLeft,
  ChevronRight,
  Calculator,
  HelpCircle,
  BookOpen,
  Target,
  DollarSign,
  Gauge,
  FilterX,
  ScatterChart as Scatter,
  Award,
  TrendingUp,
  Book as BookIcon,
} from 'lucide-react';


import { Button } from './button';
import { cn } from '../../lib/utils';
import { useFilters } from '../../contexts/filter-context';

interface PageContainerProps {
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  contentClassName?: string;
  showNav?: boolean;
}

const navItems = [
  { path: '/companies', label: 'Companies', icon: Table2 },
  //{ path: '/scatter-chart', label: 'Analysis', icon: LineChart },
  { path: '/filter', label: 'Filters', icon: Filter },
  { path: '/scatter-chart', label: 'Scatter Chart', icon: Scatter },
  { path: '/scoring-advanced', label: 'Scoring', icon: Calculator },
  { path: '/fcf-scoring', label: 'FCF Scoring', icon: DollarSign },
  { path: '/scatter-score-pro', label: 'ScatterScore', icon: TrendingUp }, 
  { path: '/subscribe', label: 'Subscribe', icon: Crown },
  { path: '/help', label: 'Help', icon: HelpCircle },
];

export function PageContainer({
  title,
  description,
  children,
  actions,
  className,
  contentClassName,
  showNav = true,
}: PageContainerProps) {
  const { resetFilters } = useFilters();
  const location = useLocation();

  return (
    <div className={cn('page-container', className)}>
      <div className="page-header">
        <div>
          <h1 className="page-title">{title}</h1>
          {description && (
            <div className="page-description">{description}</div>
          )}
        </div>
        <div className="page-actions">
          {showNav &&
            navItems
              .filter(item => item.path !== location.pathname)
              .map(item => (
                <Link key={item.path} to={item.path} className="hidden sm:block">
                  <Button
                    variant="outline"
                    size="icon-sm"
                    className="text-gray-200 border-navy-600/50 hover:bg-navy-700/50 hover:text-gray-200"
                    title={item.label}
                    aria-label={item.label}
                  >
                    <item.icon className="h-4 w-4" />
                  </Button>
                </Link>
              ))}
          {showNav && location.pathname !== '/' && (
            <Button
              variant="outline"
              size="sm"
              onClick={resetFilters}
              className="text-xs border-navy-600/50 text-gray-200 hover:bg-navy-700/50 hover:text-gray-200 flex items-center gap-1.5"
              title="Reset all filters & exclusions"
              aria-label="Reset all filters"
            >
              <FilterX className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Reset Filters</span>
              <span className="md:hidden">Reset</span>
            </Button>
          )}
          {actions && (
            <div className="flex items-center gap-2 border-l border-navy-600/50 pl-2 ml-1">
              {actions}
            </div>
          )}
        </div>
      </div>
      <div className={cn('relative', contentClassName)}>{children}</div>
    </div>
  );
}