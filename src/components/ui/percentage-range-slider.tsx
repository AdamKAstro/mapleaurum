// src/components/ui/percentage-range-slider.tsx (Simplified Version)
import React, { useCallback, useMemo } from 'react';
import debounce from 'debounce';
import { Slider } from './slider'; // Assuming path to shadcn slider is correct
import { cn } from '../../lib/utils'; // Assuming path is correct
// MetricConfig might not be strictly needed if formatting is removed, but keep for context
import type { MetricConfig } from '../../lib/metric-types'; // Adjust path

interface PercentageRangeSliderProps {
  // metric: MetricConfig; // No longer needed for label/desc/format
  fullRange: [number, number]; // Still needed for calculations
  currentRange: [number | null, number | null];
  onRangeChange: (min: number | null, max: number | null) => void;
  disabled?: boolean;
  className?: string;
}

export function PercentageRangeSlider({
  // metric, // Removed
  fullRange: [absoluteMin, absoluteMax],
  currentRange: [currentMin, currentMax],
  onRangeChange,
  disabled = false,
  className // Pass className to the root div if needed, or directly to Slider
}: PercentageRangeSliderProps) {

  // Robust percentage calculation
  const toPercentage = useCallback((value: number) => {
    const range = Math.max(1e-9, absoluteMax - absoluteMin); // Avoid division by zero
    // Clamp percentage between 0 and 100 in case value is outside fullRange
    return Math.min(100, Math.max(0, ((value - absoluteMin) / range) * 100));
  }, [absoluteMin, absoluteMax]);

  // Convert percentage back to actual value
  const fromPercentage = useCallback((percentage: number) => {
    const range = absoluteMax - absoluteMin; // Range can be 0 here, result is just absoluteMin
    return absoluteMin + (range * (percentage / 100));
  }, [absoluteMin, absoluteMax]);

  // Current values as percentages for the slider state
  const currentPercentages = useMemo(() => [
    currentMin !== null ? toPercentage(currentMin) : 0,
    currentMax !== null ? toPercentage(currentMax) : 100
  ], [currentMin, currentMax, toPercentage]);

  // Debounced handler to call onRangeChange with actual values
  const debouncedRangeChange = useMemo(
    () => debounce((percentages: number[]) => {
      const [minPercent, maxPercent] = percentages;
      // If slider at 0% or 100%, send null to indicate no filter at that bound
      const min = minPercent === 0 ? null : fromPercentage(minPercent);
      const max = maxPercent === 100 ? null : fromPercentage(maxPercent);
      console.log(`[Slider Change] DbColumn: ${/* Need metric.db_column here if logging */ ''} New actual range: [${min}, ${max}]`) // Add logging if needed
      onRangeChange(min, max);
    }, 300), // Debounce time
    [fromPercentage, onRangeChange]
  );

  // Handler for immediate value change if needed for display (optional)
  // const handleValueChange = (percentages: number[]) => {
  //   // Can update a local state here if needed for immediate visual feedback
  //   debouncedRangeChange(percentages); // Still call debounced version for context update
  // };

  return (
    // Root element containing slider and markers
    <div className={cn("relative pt-1", className)}>
      <Slider
        min={0}
        max={100}
        step={1} // Percentage steps
        value={currentPercentages}
        onValueChange={debouncedRangeChange} // Update context on change (debounced)
        // onValueChange={handleValueChange} // Or use intermediate handler
        disabled={disabled}
        className="mt-2" // Add some margin if needed
      />
      {/* Percentage markers */}
      <div className="flex justify-between mt-1">
        <span className="text-[10px] text-surface-white/50">0%</span>
        <span className="text-[10px] text-surface-white/50">50%</span>
        <span className="text-[10px] text-surface-white/50">100%</span>
      </div>
    </div>
  );
}