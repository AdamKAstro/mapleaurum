// src/components/metric-selector.tsx

import React, { useState } from 'react'; // Keep React import
import * as Select from '@radix-ui/react-select';
// No Dialog import needed here currently: import * as Dialog from '@radix-ui/react-dialog';
import { ArrowDown, ArrowUp, Check, ChevronDown, ChevronUp, Lock, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion'; // Ensure motion is imported
import { cn } from '../lib/utils';
import type { MetricConfig, MetricCategory } from '../lib/types'; // Ensure correct path if needed
import { metricCategories, getMetricsByCategory, metrics } from '../lib/metric-types'; // Ensure correct path
import { TierBadge } from './ui/tier-badge'; // Ensure correct path

interface MetricSelectorProps {
  label: string;
  selectedMetric: string;
  onMetricChange: (metric: string) => void;
  metrics: MetricConfig[];
  currentTier: 'free' | 'medium' | 'premium';
  className?: string;
}

export function MetricSelector({
  label,
  selectedMetric,
  onMetricChange,
  metrics: availableMetrics, // Renamed prop to avoid conflict with imported 'metrics'
  currentTier,
  className
}: MetricSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  // Get all metrics defined in metric-types.ts
  const allMetrics = metrics; // Use the imported metrics array
  const selectedMetricConfig = allMetrics.find(m => m.key === selectedMetric);

  // Filter based on search term applied to *all* metrics
  const filteredMetrics = allMetrics.filter(metric => {
    const searchLower = searchTerm.toLowerCase();
    // Ensure description is checked safely
    const descriptionLower = metric.description?.toLowerCase() ?? '';
    return (
      metric.label.toLowerCase().includes(searchLower) ||
      descriptionLower.includes(searchLower) ||
      metric.category.toLowerCase().includes(searchLower)
    );
  });

  // Group the filtered metrics by category
  const groupedMetrics = Object.entries(metricCategories).map(([category, categoryLabel]) => ({
    category: category as MetricCategory,
    label: categoryLabel, // Use the mapped label from metricCategories
    metrics: filteredMetrics.filter(m => m.category === category)
  })).filter(group => group.metrics.length > 0); // Only include groups with metrics after filtering

  // Check if a specific metric is accessible based on the current tier
  const isMetricAccessible = (metric: MetricConfig): boolean => {
    const tierLevels = {
      free: 0,
      medium: 1,
      premium: 2
    };
    // Ensure metric.tier exists and is valid before comparison
    const requiredLevel = tierLevels[metric.tier];
    const currentLevel = tierLevels[currentTier];

    if (requiredLevel === undefined || currentLevel === undefined) {
        console.warn(`Unknown tier comparison in MetricSelector: metric=${metric.tier}, current=${currentTier}`);
        return false; // Default to inaccessible if tiers are unknown
    }

    return currentLevel >= requiredLevel;
  };

  // Render a single option in the select dropdown
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
          'data-[highlighted]:bg-navy-400/20', // Style for highlighted item
          'data-[disabled]:opacity-50 data-[disabled]:cursor-not-allowed', // Style for disabled item
          isSelected ? 'bg-navy-400/40' : 'hover:bg-navy-400/20', // Style for selected vs hover
          'cursor-pointer transition-colors duration-150',
          !isAccessible && 'opacity-60' // Slightly dim inaccessible items, line-through removed for potentially better readability
        )}
        // Add title for better accessibility on disabled items
        title={!isAccessible ? `Requires ${metric.tier} tier` : metric.description}
      >
        <div className="flex items-center justify-between w-full gap-2">
          <div className="flex flex-col flex-grow min-w-0"> {/* Allow text to wrap/truncate */}
            <div className="flex items-center gap-1.5">
              {!isAccessible && <Lock className="h-3 w-3 text-surface-white/40 flex-shrink-0" />}
              <span className="font-medium truncate">{metric.label}</span> {/* Added truncate */}
              {/* Keep higher/lower indicator but maybe only if accessible? Optional. */}
              {isAccessible && metric.higherIsBetter !== undefined && (
                  metric.higherIsBetter ? (
                    <ArrowUp className="h-3 w-3 text-emerald-400 flex-shrink-0" />
                  ) : (
                    <ArrowDown className="h-3 w-3 text-red-400 flex-shrink-0" />
                  )
              )}
            </div>
            {/* Optionally truncate description or show only on hover via tooltip */}
            <span className="text-xs text-surface-white/70 truncate">{metric.description}</span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {metric.unit && <span className="text-xs text-surface-white/50">{metric.unit}</span>}
            {!isAccessible && <TierBadge tier={metric.tier} className="scale-75" />}
          </div>
        </div>
        {/* Checkmark for selected item */}
        <Select.ItemIndicator className="absolute left-2 flex items-center justify-center">
          <Check className="h-4 w-4" />
        </Select.ItemIndicator>
      </Select.Item>
    );
  };

  // Main component structure
  return (
    <Select.Root
      value={selectedMetric}
      onValueChange={onMetricChange}
      open={isOpen}
      onOpenChange={setIsOpen}
    >
      <div className={cn('flex flex-col gap-1.5', className)}>
        {/* The trigger button */}
        <Select.Trigger
          className={cn(
            'flex items-center justify-between text-left', // Ensure text aligns left
            'px-3 py-2 text-sm w-full', // Ensure trigger takes full width if needed
            'bg-navy-400/20 border border-navy-300/20 rounded-md',
            'hover:bg-navy-400/30 focus:outline-none focus:ring-2 focus:ring-accent-teal focus:ring-offset-2 focus:ring-offset-navy-500', // Added offset color
            'transition-colors duration-150'
          )}
          aria-label={label} // Better accessibility
        >
          <div className="flex flex-col items-start">
            <span className="text-xs text-surface-white/70">{label}</span>
            <div className="flex items-center gap-2">
              <span className="font-medium">
                {selectedMetricConfig?.label || 'Select metric'}
              </span>
              {selectedMetricConfig && selectedMetricConfig.higherIsBetter !== undefined && ( // Check if defined
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

        {/* The dropdown content with animation */}
        <AnimatePresence>
          {isOpen && (
            // Apply forceMount to the Portal component itself
            <Select.Portal forceMount>
              <Select.Content
                position="popper"
                // Avoid setting className directly here if possible, rely on variants or parent styling
                // className="z-50" // z-index is usually needed, handled by Radix Portal/Popper
                sideOffset={5} // Add some space between trigger and content
                collisionPadding={10} // Prevent content from touching viewport edges
                asChild // Important: Keep asChild to pass Radix props to motion.div
              >
                {/* This motion.div receives Radix props via asChild but NOT forceMount */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.98, y: -5 }} // Slightly adjusted animation
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98, y: -5 }}
                  transition={{ duration: 0.15 }} // Faster transition
                  className={cn(
                    'relative w-[var(--radix-select-trigger-width)] max-h-[400px] overflow-hidden', // Match trigger width, set max height
                    'z-50', // Ensure dropdown is on top
                    'bg-navy-500 border border-navy-300/20 rounded-lg shadow-xl' // Styling
                  )}
                >
                  {/* Search Input */}
                  <div className="p-2 border-b border-navy-300/20">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-white/40 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Search metrics..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={cn(
                          'w-full pl-9 pr-3 py-1.5', // Adjusted padding for icon
                          'bg-navy-400/20 border border-navy-300/20 rounded-md',
                          'text-sm text-surface-white placeholder-surface-white/50',
                          'focus:outline-none focus:ring-1 focus:ring-accent-teal focus:border-accent-teal' // Adjusted focus style
                        )}
                      />
                    </div>
                  </div>

                  {/* Scrollable Viewport */}
                  <Select.Viewport className="p-1 max-h-[calc(400px-80px)] overflow-y-auto"> {/* Adjusted max-h accounting for search/scroll */}
                    {groupedMetrics.map(group => (
                      <div key={group.category} className="py-1">
                        <div className="px-3 py-1.5 text-xs font-semibold text-surface-white/70 sticky top-0 bg-navy-500/95 z-10"> {/* Make group label sticky */}
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

                  {/* Scroll Buttons (optional, viewport handles scroll usually) */}
                  {/* Consider removing these if viewport scroll works well
                  <Select.ScrollUpButton className="flex items-center justify-center h-6 bg-navy-500 cursor-default border-t border-navy-300/20">
                    <ChevronUp className="h-4 w-4" />
                  </Select.ScrollUpButton>
                  <Select.ScrollDownButton className="flex items-center justify-center h-6 bg-navy-500 cursor-default border-t border-navy-300/20">
                    <ChevronDown className="h-4 w-4" />
                  </Select.ScrollDownButton>
                   */}
                </motion.div>
              </Select.Content>
            </Select.Portal>
          )}
        </AnimatePresence>
      </div>
    </Select.Root>
  );
}