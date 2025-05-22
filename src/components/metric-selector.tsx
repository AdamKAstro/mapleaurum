// src/components/metric-selector.tsx
import React, { useState, useMemo, useCallback } from 'react';
import * as Select from '@radix-ui/react-select';
import { ArrowDown, ArrowUp, Check, ChevronDown, Lock, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import type { MetricConfig, MetricCategory, ColumnTier } from '../lib/types';
import { metricCategories, metrics as allMetricsFromTypes } from '../lib/metric-types';
import { TierBadge } from './ui/tier-badge';

interface MetricSelectorProps {
  label: string;
  selectedMetric: string | null;
  onMetricChange: (metricKey: string | null) => void;
  currentTier?: ColumnTier | null;
  availableMetrics?: MetricConfig[]; // Optional prop to override default metrics
  filterForNumericOnly?: boolean; // Optional filter
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function MetricSelector({
  label,
  selectedMetric,
  onMetricChange,
  currentTier = 'free',
  availableMetrics,
  filterForNumericOnly = false,
  placeholder = 'Select metric',
  className,
  disabled = false,
}: MetricSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  // Use provided metrics or default to all metrics
  const baseMetrics = availableMetrics || allMetricsFromTypes;

  // Get selected metric config
  const selectedMetricConfig = useMemo(() => 
    baseMetrics.find(m => m.key === selectedMetric),
    [selectedMetric, baseMetrics]
  );

  // Filter and search metrics
  const filteredMetrics = useMemo(() => {
    let metrics = baseMetrics;
    
    // Apply numeric filter if requested
    if (filterForNumericOnly) {
      metrics = metrics.filter(m => 
        ['number', 'currency', 'percent', 'moz', 'koz', 'ratio', 'years'].includes(m.format)
      );
    }

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      metrics = metrics.filter(metric => {
        const descriptionLower = (metric.description || '').toLowerCase();
        return (
          metric.label.toLowerCase().includes(searchLower) ||
          descriptionLower.includes(searchLower) ||
          metric.category.toLowerCase().includes(searchLower) ||
          metric.key.toLowerCase().includes(searchLower)
        );
      });
    }

    return metrics;
  }, [baseMetrics, searchTerm, filterForNumericOnly]);

  // Group metrics by category
  const groupedMetrics = useMemo(() => {
    const groups = Object.entries(metricCategories)
      .map(([categoryKey, categoryLabel]) => ({
        category: categoryKey as MetricCategory,
        label: categoryLabel,
        metrics: filteredMetrics.filter(m => m.category === categoryKey)
      }))
      .filter(group => group.metrics.length > 0);
    
    return groups;
  }, [filteredMetrics]);

  // Check if metric is accessible based on tier
  const isMetricAccessible = useCallback((metric: MetricConfig): boolean => {
    if (!currentTier) return false;
    
    const tierLevels: Record<ColumnTier, number> = {
      free: 0,
      pro: 1,
      premium: 2
    };
    
    const userTierLevel = tierLevels[currentTier] ?? 0;
    const requiredTierLevel = tierLevels[metric.tier] ?? 99;
    
    return userTierLevel >= requiredTierLevel;
  }, [currentTier]);

  const handleOpenChange = useCallback((open: boolean) => {
    setIsOpen(open);
    if (!open) {
      // Reset search when closing
      setSearchTerm('');
    }
  }, []);

  const handleValueChange = useCallback((value: string) => {
    if (value === '__none__') {
      onMetricChange(null);
    } else {
      onMetricChange(value);
    }
    setIsOpen(false);
  }, [onMetricChange]);

  const renderMetricOption = useCallback((metric: MetricConfig) => {
    const isAccessible = isMetricAccessible(metric);
    const isSelected = metric.key === selectedMetric;

    return (
      <Select.Item
        key={metric.key}
        value={metric.key}
        disabled={!isAccessible}
        className={cn(
          'relative flex items-center px-8 py-2 text-sm outline-none',
          'data-[highlighted]:bg-navy-400/20',
          'data-[disabled]:opacity-50 data-[disabled]:cursor-not-allowed',
          isSelected && 'bg-navy-400/40',
          !isSelected && isAccessible && 'hover:bg-navy-400/20',
          'cursor-pointer transition-colors duration-150',
          !isAccessible && 'opacity-60'
        )}
        title={!isAccessible ? `Requires ${metric.tier} tier` : metric.description}
      >
        <div className="flex items-center justify-between w-full gap-2">
          <div className="flex flex-col flex-grow min-w-0">
            <div className="flex items-center gap-1.5">
              {!isAccessible && <Lock className="h-3 w-3 text-surface-white/40 flex-shrink-0" />}
              <span className="font-medium truncate">{metric.label}</span>
              {isAccessible && metric.higherIsBetter !== undefined && (
                metric.higherIsBetter ? (
                  <ArrowUp className="h-3 w-3 text-emerald-400 flex-shrink-0" />
                ) : (
                  <ArrowDown className="h-3 w-3 text-red-400 flex-shrink-0" />
                )
              )}
            </div>
            {metric.description && (
              <span className="text-xs text-surface-white/70 truncate">
                {metric.description.substring(0, 100)}...
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {metric.unit && <span className="text-xs text-surface-white/50">{metric.unit}</span>}
            {!isAccessible && <TierBadge tier={metric.tier} showLabel={false} size="sm" />}
          </div>
        </div>
        <Select.ItemIndicator className="absolute left-2 flex items-center justify-center">
          <Check className="h-4 w-4" />
        </Select.ItemIndicator>
      </Select.Item>
    );
  }, [isMetricAccessible, selectedMetric]);

  return (
    <Select.Root
      value={selectedMetric || '__none__'}
      onValueChange={handleValueChange}
      open={isOpen}
      onOpenChange={handleOpenChange}
      disabled={disabled}
    >
      <div className={cn('flex flex-col gap-1.5', className)}>
        {label && (
          <label className="text-xs font-medium text-surface-white/70">
            {label}
          </label>
        )}
        <Select.Trigger
          className={cn(
            'flex items-center justify-between text-left',
            'px-3 py-2 text-sm w-full',
            'bg-navy-400/20 border border-navy-300/20 rounded-md',
            'hover:bg-navy-400/30 focus:outline-none focus:ring-2 focus:ring-accent-teal focus:ring-offset-2 focus:ring-offset-navy-500',
            'transition-colors duration-150',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
          aria-label={label}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="font-medium truncate">
              {selectedMetricConfig?.label || placeholder}
            </span>
            {selectedMetricConfig && selectedMetricConfig.higherIsBetter !== undefined && (
              selectedMetricConfig.higherIsBetter ? (
                <ArrowUp className="h-3 w-3 text-emerald-400 flex-shrink-0" />
              ) : (
                <ArrowDown className="h-3 w-3 text-red-400 flex-shrink-0" />
              )
            )}
          </div>
          <Select.Icon asChild>
            <ChevronDown className="h-4 w-4 text-surface-white/70 flex-shrink-0" />
          </Select.Icon>
        </Select.Trigger>

        <AnimatePresence>
          {isOpen && (
            <Select.Portal forceMount>
              <Select.Content
                position="popper"
                sideOffset={5}
                collisionPadding={10}
                align="start"
                asChild
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.98, y: -5 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98, y: -5 }}
                  transition={{ duration: 0.15 }}
                  className={cn(
                    'relative w-[var(--radix-select-trigger-width)] max-h-[400px] overflow-hidden',
                    'z-50',
                    'bg-navy-500 border border-navy-300/20 rounded-lg shadow-xl'
                  )}
                >
                  <div className="p-2 border-b border-navy-300/20 sticky top-0 bg-navy-500 z-10">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-white/40 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Search metrics..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className={cn(
                          'w-full pl-9 pr-3 py-1.5',
                          'bg-navy-400/20 border border-navy-300/20 rounded-md',
                          'text-sm text-surface-white placeholder-surface-white/50',
                          'focus:outline-none focus:ring-1 focus:ring-accent-teal focus:border-accent-teal'
                        )}
                      />
                    </div>
                  </div>

                  <Select.Viewport className="p-1 max-h-[calc(400px-80px)] overflow-y-auto">
                    {/* Option to clear selection */}
                    {selectedMetric && (
                      <>
                        <Select.Item
                          value="__none__"
                          className={cn(
                            'relative flex items-center px-8 py-2 text-sm outline-none',
                            'data-[highlighted]:bg-navy-400/20',
                            'hover:bg-navy-400/20 cursor-pointer transition-colors duration-150'
                          )}
                        >
                          <span className="text-surface-white/70">Clear selection</span>
                          <Select.ItemIndicator className="absolute left-2 flex items-center justify-center">
                            <Check className="h-4 w-4" />
                          </Select.ItemIndicator>
                        </Select.Item>
                        <Select.Separator className="h-px bg-navy-300/20 my-1" />
                      </>
                    )}

                    {groupedMetrics.map(group => (
                      <div key={group.category} className="py-1">
                        <div className="px-3 py-1.5 text-xs font-semibold text-surface-white/70 sticky top-0 bg-navy-500/95 z-10">
                          {group.label}
                        </div>
                        {group.metrics.map(renderMetricOption)}
                      </div>
                    ))}
                    
                    {groupedMetrics.length === 0 && (
                      <div className="px-2 py-4 text-center text-sm text-surface-white/50">
                        {searchTerm ? (
                          <>No metrics found for "{searchTerm}"</>
                        ) : filterForNumericOnly ? (
                          <>No numeric metrics available</>
                        ) : (
                          <>No metrics available</>
                        )}
                      </div>
                    )}
                  </Select.Viewport>
                </motion.div>
              </Select.Content>
            </Select.Portal>
          )}
        </AnimatePresence>
      </div>
    </Select.Root>
  );
}
