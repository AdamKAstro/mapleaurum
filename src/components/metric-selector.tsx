// src/components/metric-selector.tsx
import React, { useState } from 'react';
import * as Select from '@radix-ui/react-select';
import { ArrowDown, ArrowUp, Check, ChevronDown, Lock, Search } from 'lucide-react'; // Added Search back
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import type { MetricConfig, MetricCategory, ColumnTier } from '../lib/types'; // Use ColumnTier
import { metricCategories, metrics as allMetricsFromTypes } from '../lib/metric-types';
import { TierBadge } from './ui/tier-badge';

interface MetricSelectorProps {
  label: string;
  selectedMetric: string;
  onMetricChange: (metricKey: string) => void;
  currentTier: ColumnTier; // Type updated to ColumnTier ('free' | 'pro' | 'premium')
  className?: string;
}

export function MetricSelector({
  label,
  selectedMetric,
  onMetricChange,
  currentTier,
  className,
}: MetricSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const selectedMetricConfig = allMetricsFromTypes.find(m => m.key === selectedMetric);

  const filteredMetrics = allMetricsFromTypes.filter(metric => {
    const searchLower = searchTerm.toLowerCase();
    const descriptionLower = metric.description?.toLowerCase() ?? '';
    return (
      metric.label.toLowerCase().includes(searchLower) ||
      descriptionLower.includes(searchLower) ||
      metric.category.toLowerCase().includes(searchLower)
    );
  });

  const groupedMetrics = Object.entries(metricCategories).map(([categoryKey, categoryLabel]) => ({
    category: categoryKey as MetricCategory,
    label: categoryLabel,
    metrics: filteredMetrics.filter(m => m.category === categoryKey)
  })).filter(group => group.metrics.length > 0);

  const isMetricAccessible = (metric: MetricConfig): boolean => {
    const tierLevels: Record<ColumnTier, number> = { // Use ColumnTier
      free: 0,
      pro: 1,    // CHANGED 'medium' to 'pro'
      premium: 2,
    };
    
    const requiredTier = metric.tier; // MetricConfig.tier should be ColumnTier
    const userTier = currentTier;     // Prop currentTier is ColumnTier

    if (!(requiredTier in tierLevels) || !(userTier in tierLevels)) {
      console.warn(`[MetricSelector] Unknown tier value. Metric Tier: ${requiredTier}, User Tier: ${userTier}. Defaulting to inaccessible.`);
      return false;
    }
    return tierLevels[userTier] >= tierLevels[requiredTier];
  };
  
  const renderMetricOption = (metric: MetricConfig) => {
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
          isSelected ? 'bg-navy-400/40' : 'hover:bg-navy-400/20',
          'cursor-pointer transition-colors duration-150',
          !isAccessible && 'opacity-60'
        )}
        title={!isAccessible ? `Requires ${metric.tier} tier (Your tier: ${currentTier})` : metric.description}
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
            <span className="text-xs text-surface-white/70 truncate">{metric.description}</span>
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
  };

  return (
    <Select.Root
      value={selectedMetric}
      onValueChange={onMetricChange}
      open={isOpen}
      onOpenChange={setIsOpen}
    >
      <div className={cn('flex flex-col gap-1.5', className)}>
        <Select.Trigger
          className={cn(
            'flex items-center justify-between text-left',
            'px-3 py-2 text-sm w-full',
            'bg-navy-400/20 border border-navy-300/20 rounded-md',
            'hover:bg-navy-400/30 focus:outline-none focus:ring-2 focus:ring-accent-teal focus:ring-offset-2 focus:ring-offset-navy-500',
            'transition-colors duration-150'
          )}
          aria-label={label}
        >
          <div className="flex flex-col items-start">
            <span className="text-xs text-surface-white/70">{label}</span>
            <div className="flex items-center gap-2">
              <span className="font-medium">
                {selectedMetricConfig?.label || 'Select metric'}
              </span>
              {selectedMetricConfig && selectedMetricConfig.higherIsBetter !== undefined && (
                selectedMetricConfig.higherIsBetter ? (
                  <ArrowUp className="h-3 w-3 text-emerald-400" />
                ) : (
                  <ArrowDown className="h-3 w-3 text-red-400" />
                )
              )}
            </div>
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
                asChild
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.98, y: -5 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98, y: -5 }}
                  transition={{ duration: 0.15 }}
                  className={cn(
                    'relative w-[var(--radix-select-trigger-width)] max-h-[400px] overflow-hidden',
                    'z-50', // Ensure dropdown is on top
                    'bg-navy-500 border border-navy-300/20 rounded-lg shadow-xl'
                  )}
                >
                  <div className="p-2 border-b border-navy-300/20">
                    <div className="relative">
                       <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-white/40 pointer-events-none" /> 
                       <input
                        type="text"
                        placeholder="Search metrics..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={cn(
                          'w-full pl-9 pr-3 py-1.5', // Padding for icon
                          'bg-navy-400/20 border border-navy-300/20 rounded-md',
                          'text-sm text-surface-white placeholder-surface-white/50',
                          'focus:outline-none focus:ring-1 focus:ring-accent-teal focus:border-accent-teal'
                        )}
                      />
                    </div>
                  </div>

                  <Select.Viewport className="p-1 max-h-[calc(400px-80px)] overflow-y-auto">
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
                        No metrics found for "{searchTerm}"
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