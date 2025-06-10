// src/components/ui/percentage-range-slider.tsx
import React, { useCallback, useMemo, useEffect, useState } from 'react';
import debounce from 'debounce';
import { Slider } from './slider';
import { cn, isValidNumber } from '../../lib/utils';
import type { MetricFormat } from '../../lib/types';

interface PercentageRangeSliderProps {
  metricIdentifier: string;
  fullRange: [number, number];
  currentRange: [number | null, number | null];
  onRangeChange: (min: number | null, max: number | null) => void;
  disabled?: boolean;
  className?: string;
  percentageStep?: number;
  metricFormat?: MetricFormat; // To give hints for precision
}

/**
 * Calculates a "sensible" step and precision for a given numeric range.
 * This helps in snapping slider values to more user-friendly increments.
 */
function calculateSensibleStepAndPrecision(
  minValue: number,
  maxValue: number,
  formatHint?: MetricFormat
): { step: number; precision: number } {
  if (!isValidNumber(minValue) || !isValidNumber(maxValue) || minValue > maxValue) {
    return { step: 1, precision: 0 }; // Default fallback
  }

  const range = maxValue - minValue;

  if (range === 0) {
    // If no range, step doesn't really matter for snapping, precision from min value
    const minStr = String(minValue);
    const minDec = minStr.includes('.') ? minStr.split('.')[1].length : 0;
    return { step: 1, precision: Math.min(minDec, 4) }; // Cap precision
  }

  let idealStep: number;
  let precision: number;

  // Determine a target number of steps for good UX (e.g., 100-200 steps)
  const targetSteps = 100;
  idealStep = range / targetSteps;

  // Determine precision based on format hint or idealStep magnitude
  if (formatHint === 'percent' || formatHint === 'ratio' || (idealStep > 0 && idealStep < 1)) {
    if (idealStep < 0.001) precision = 4; // e.g. 0.000x
    else if (idealStep < 0.01) precision = 3; // e.g. 0.00x
    else if (idealStep < 0.1) precision = 2;  // e.g. 0.0x
    else precision = 1;                       // e.g. 0.x
  } else if (formatHint === 'currency' || formatHint === 'moz' || formatHint === 'koz') {
     // For currency, moz, koz, typically 0-2 decimal places, but allow more if range is tiny
    if (range < 10) precision = 2;
    else if (range < 1000) precision = 1;
    else precision = 0;
  } else { // General numbers
    if (range < 1) precision = 4;
    else if (range < 100) precision = 2;
    else if (range < 10000) precision = 1;
    else precision = 0;
  }
  
  // Refine idealStep to be a "human-friendly" number (e.g., 1, 2, 5, 10, 20, 25, 50, 100...)
  if (idealStep <= 0) idealStep = Math.pow(10, -precision); // Smallest possible step based on precision

  const magnitude = Math.pow(10, Math.floor(Math.log10(idealStep)));
  const residual = idealStep / magnitude;

  if (residual < 1.5) idealStep = 1 * magnitude;
  else if (residual < 3.5) idealStep = 2.5 * magnitude; // or 2 * magnitude
  else if (residual < 7.5) idealStep = 5 * magnitude;
  else idealStep = 10 * magnitude;

  // Ensure step isn't impossibly small or larger than the range itself
  idealStep = Math.max(Math.pow(10, -Math.max(4, precision)), idealStep); // Min step related to precision
  if (idealStep > range && range > 0) idealStep = range;


  // Final precision based on the chosen step
  const stepStr = String(idealStep);
  precision = stepStr.includes('.') ? Math.min(stepStr.split('.')[1].length, 4) : 0; // Cap precision of step itself

  return { step: idealStep, precision: precision };
}


export function PercentageRangeSlider({
  metricIdentifier,
  fullRange: [absoluteMin, absoluteMax],
  currentRange: [initialCurrentMin, initialCurrentMax],
  onRangeChange,
  disabled = false,
  className,
  percentageStep = 0.1, // Step for the 0-100% visual slider
  metricFormat,
}: PercentageRangeSliderProps) {

  const { step: actualValueStep, precision: actualValuePrecision } = useMemo(
    () => calculateSensibleStepAndPrecision(absoluteMin, absoluteMax, metricFormat),
    [absoluteMin, absoluteMax, metricFormat]
  );

  const toPercentage = useCallback((value: number) => {
    if (!isValidNumber(absoluteMin) || !isValidNumber(absoluteMax)) return 50; // Default if range invalid
    const range = absoluteMax - absoluteMin;
    if (range === 0) {
      return value <= absoluteMin ? 0 : 100;
    }
    const clampedValue = Math.min(absoluteMax, Math.max(absoluteMin, value));
    const percentage = ((clampedValue - absoluteMin) / range) * 100;
    return Math.min(100, Math.max(0, percentage));
  }, [absoluteMin, absoluteMax]);

  const fromPercentage = useCallback((percentage: number) => {
    if (!isValidNumber(absoluteMin) || !isValidNumber(absoluteMax)) return null; // Cannot convert if range invalid

    const range = absoluteMax - absoluteMin;
    const clampedPercentage = Math.min(100, Math.max(0, percentage));
    
    let targetValue = absoluteMin + (range * (clampedPercentage / 100));

    if (range === 0) { // If no range, the value is just the single point
        return parseFloat(absoluteMin.toFixed(actualValuePrecision));
    }

    // Snap to the sensible step
    if (actualValueStep > 0 && Number.isFinite(actualValueStep)) {
      targetValue = Math.round(targetValue / actualValueStep) * actualValueStep;
    }
    
    // Apply precision and clamp to the absolute range
    const finalValue = parseFloat(targetValue.toFixed(actualValuePrecision));
    return Math.min(absoluteMax, Math.max(absoluteMin, finalValue));

  }, [absoluteMin, absoluteMax, actualValueStep, actualValuePrecision]);

  const [sliderPercentages, setSliderPercentages] = useState<[number, number]>(() => [
    initialCurrentMin !== null && isValidNumber(initialCurrentMin) ? toPercentage(initialCurrentMin) : 0,
    initialCurrentMax !== null && isValidNumber(initialCurrentMax) ? toPercentage(initialCurrentMax) : 100,
  ]);

  useEffect(() => {
    const newMinPercent = initialCurrentMin !== null && isValidNumber(initialCurrentMin) ? toPercentage(initialCurrentMin) : 0;
    const newMaxPercent = initialCurrentMax !== null && isValidNumber(initialCurrentMax) ? toPercentage(initialCurrentMax) : 100;
    
    if (Math.abs(newMinPercent - sliderPercentages[0]) > 1e-3 || Math.abs(newMaxPercent - sliderPercentages[1]) > 1e-3) {
        setSliderPercentages([newMinPercent, newMaxPercent]);
    }
  }, [initialCurrentMin, initialCurrentMax, toPercentage, sliderPercentages]);

  const debouncedInternalRangeChange = useMemo(
    () => debounce((newSliderPercentages: [number, number]) => {
      const [minPercent, maxPercent] = newSliderPercentages;
      
      const isAtAbsoluteMin = minPercent <= 0.01;
      const isAtAbsoluteMax = maxPercent >= 99.99;

      const finalMin = (isAtAbsoluteMin && absoluteMin !== absoluteMax) ? null : fromPercentage(minPercent);
      const finalMax = (isAtAbsoluteMax && absoluteMin !== absoluteMax) ? null : fromPercentage(maxPercent);

      if (process.env.NODE_ENV === 'development') {
        console.log(`[PercentageRangeSlider][DEBUG] Metric: ${metricIdentifier}, Slider %: [${minPercent.toFixed(2)}, ${maxPercent.toFixed(2)}], Output to onRangeChange: [${finalMin === null ? 'null' : finalMin}, ${finalMax === null ? 'null' : finalMax}] (absMin: ${absoluteMin}, absMax: ${absoluteMax}, step: ${actualValueStep}, prec: ${actualValuePrecision})`);
      }
      onRangeChange(finalMin, finalMax);
    }, 250),
    [fromPercentage, onRangeChange, metricIdentifier, absoluteMin, absoluteMax, actualValueStep, actualValuePrecision]
  );

  const handleSliderValueChange = (newPercentages: [number, number]) => {
    setSliderPercentages(newPercentages);
    debouncedInternalRangeChange(newPercentages);
  };

  const isSliderEffectivelyDisabled = disabled || !isValidNumber(absoluteMin) || !isValidNumber(absoluteMax);
  // Note: We allow the slider to render even if absoluteMin === absoluteMax,
  // as fromPercentage will handle it by returning the single value.
  // The UI in FilterPage can show "(Range N/A)" if needed.

  return (
    <div className={cn("relative pt-1", className)}>
      <Slider
        min={0}
        max={100}
        step={percentageStep}
        value={sliderPercentages}
        onValueChange={handleSliderValueChange}
        disabled={isSliderEffectivelyDisabled}
        className={cn("mt-2", isSliderEffectivelyDisabled && "opacity-50 pointer-events-none")}
        aria-label={`${metricIdentifier} range slider`}
      />
      <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
        <span>0%</span>
        <span>50%</span>
        <span>100%</span>
      </div>
    </div>
  );
}