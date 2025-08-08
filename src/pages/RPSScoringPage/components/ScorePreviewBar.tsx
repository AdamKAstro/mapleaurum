// src/pages/RPSScoringPage/components/ScorePreviewBar.tsx
import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, Sparkles, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Company } from '@/lib/types';

interface ScorePreviewBarProps {
  previewData: {
    topCompanies: { company: Company; score: number; change: number }[];
    isCalculating: boolean;
  };
  onApply: () => void;
}

// Animated number component with requestAnimationFrame
const AnimatedNumber: React.FC<{ value: number; decimals?: number }> = ({ value, decimals = 1 }) => {
  const [displayValue, setDisplayValue] = React.useState(value);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const duration = 600; // ms
    const steps = 20;
    const stepDuration = duration / steps;
    const startValue = displayValue;
    const increment = (value - startValue) / steps;
    let currentStep = 0;
    let startTime: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;

      if (progress >= stepDuration * currentStep) {
        currentStep++;
        if (currentStep <= steps) {
          setDisplayValue(startValue + increment * currentStep);
        } else {
          setDisplayValue(value);
          return;
        }
      }

      if (currentStep <= steps) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [value]);

  return <span>{Number.isFinite(displayValue) ? displayValue.toFixed(decimals) : '0.0'}</span>;
};

// Score change indicator with animation
const ScoreChangeIndicator: React.FC<{ change: number }> = ({ change }) => {
  const isPositive = change > 0.1;
  const isNegative = change < -0.1;
  const isNeutral = Math.abs(change) <= 0.1;

  if (isNeutral) {
    return (
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="flex items-center gap-1 text-gray-400 text-xs"
        aria-label="No score change"
      >
        <Minus size={12} aria-hidden="true" />
        <span>No change</span>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ scale: 0, rotate: isPositive ? -180 : 180 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 200 }}
      className={cn(
        'flex items-center gap-1 text-xs font-semibold',
        isPositive ? 'text-green-400' : 'text-red-400'
      )}
      aria-label={`Score change: ${isPositive ? 'positive' : 'negative'} ${change.toFixed(1)}`}
    >
      {isPositive ? <TrendingUp size={12} aria-hidden="true" /> : <TrendingDown size={12} aria-hidden="true" />}
      <span>
        {isPositive ? '+' : ''}
        <AnimatedNumber value={change} />
      </span>
    </motion.div>
  );
};

export const ScorePreviewBar: React.FC<ScorePreviewBarProps> = ({ previewData, onApply }) => {
  const { topCompanies, isCalculating } = previewData;
  const hasChanges = topCompanies.some((c) => Math.abs(c.change) > 0.1);

  if (!hasChanges || topCompanies.length === 0) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20, height: 0 }}
        animate={{ opacity: 1, y: 0, height: 'auto' }}
        exit={{ opacity: 0, y: -20, height: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="mb-4 overflow-hidden"
        role="region"
        aria-label="Score Preview Bar"
      >
        <div className="bg-gradient-to-r from-navy-800/60 via-navy-700/60 to-navy-800/60 p-4 rounded-lg border border-accent-teal/30 backdrop-blur-sm">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                aria-hidden="true"
              >
                <Sparkles className="text-accent-teal" size={16} />
              </motion.div>
              <span className="text-sm font-semibold text-accent-teal">
                Live Preview - Top {Math.min(5, topCompanies.length)} Companies
              </span>
              {isCalculating && (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  aria-hidden="true"
                >
                  <RefreshCw size={14} className="text-accent-teal/60" />
                </motion.div>
              )}
            </div>
            <Button
              size="sm"
              onClick={onApply}
              className="bg-accent-teal/20 hover:bg-accent-teal/30 border border-accent-teal/50 text-accent-teal transition-colors"
              aria-label="Apply score changes"
            >
              Apply Changes
            </Button>
          </div>

          {/* Company previews */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {topCompanies.slice(0, 5).map((item, index) => (
              <motion.div
                key={item.company.company_id ?? `company-${index}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-navy-900/40 p-3 rounded-md border border-navy-600/30 hover:bg-navy-900/60 transition-colors"
                role="group"
                aria-label={`Company: ${item.company.tsx_code ?? item.company.company_name ?? 'Unknown'}`}
              >
                <div className="flex flex-col space-y-1">
                  <div className="text-xs text-gray-400 truncate">
                    {item.company.tsx_code ?? item.company.company_name ?? 'Unknown'}
                  </div>
                  <div className="flex items-center justify-between">
                    <motion.div
                      className="text-lg font-bold text-surface-white"
                      key={item.score}
                      initial={{ scale: 1.2 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 300 }}
                    >
                      <AnimatedNumber value={item.score} />
                    </motion.div>
                    <ScoreChangeIndicator change={item.change} />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};