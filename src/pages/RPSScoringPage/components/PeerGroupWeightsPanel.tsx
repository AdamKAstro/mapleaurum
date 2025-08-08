// src/pages/RPSScoringPage/components/PeerGroupWeightsPanel.tsx
import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Users, Gauge, Factory } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PeerGroupWeightsPanelProps {
  weights: {
    status: number;
    valuation: number;
    operational: number;
  };
  onWeightChange: (group: 'status' | 'valuation' | 'operational', value: number) => void;
}

// Animated percentage display
const AnimatedPercentage: React.FC<{ value: number }> = ({ value }) => {
  const [displayValue, setDisplayValue] = React.useState(value);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const duration = 300; // ms
    const steps = 10;
    const startValue = displayValue;
    const increment = (value - startValue) / steps;
    let currentStep = 0;
    let startTime: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;

      if (progress >= (duration / steps) * currentStep) {
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

  return <span>{Number.isFinite(displayValue) ? displayValue.toFixed(0) : '0'}%</span>;
};

export const PeerGroupWeightsPanel: React.FC<PeerGroupWeightsPanelProps> = ({ weights, onWeightChange }) => {
  const totalWeight = Number.isFinite(weights.status + weights.valuation + weights.operational)
    ? weights.status + weights.valuation + weights.operational
    : 0;
  const [hoveredSlider, setHoveredSlider] = React.useState<string | null>(null);

  const handleSliderChange = (group: 'status' | 'valuation' | 'operational', value: number) => {
    const clampedValue = Math.max(0, Math.min(100, value)); // Ensure value is between 0-100
    if ('vibrate' in navigator) {
      if (clampedValue % 25 === 0 && clampedValue !== 0 && clampedValue !== 100) {
        navigator.vibrate(10);
      }
      if (clampedValue === 50) {
        navigator.vibrate(20);
      }
    }
    onWeightChange(group, clampedValue);
  };

  const sliderConfigs = [
    {
      id: 'status' as const,
      label: 'Status Peers',
      icon: Users,
      color: 'teal',
      gradientFrom: 'from-teal-500/20',
      gradientTo: 'to-teal-400/10',
      sliderColor: '[&>span>span]:bg-teal-400',
      glowColor: 'bg-teal-400/20',
      description: 'Companies with the same operational status',
    },
    {
      id: 'valuation' as const,
      label: 'Valuation Peers',
      icon: Gauge,
      color: 'sky',
      gradientFrom: 'from-sky-500/20',
      gradientTo: 'to-sky-400/10',
      sliderColor: '[&>span>span]:bg-sky-400',
      glowColor: 'bg-sky-400/20',
      description: '10 most similarly-sized companies',
    },
    {
      id: 'operational' as const,
      label: 'Operational Peers',
      icon: Factory,
      color: 'indigo',
      gradientFrom: 'from-indigo-500/20',
      gradientTo: 'to-indigo-400/10',
      sliderColor: '[&>span>span]:bg-indigo-400',
      glowColor: 'bg-indigo-400/20',
      description: 'Companies at similar operational scale',
    },
  ];

  return (
    <motion.div
      className="mb-6 p-4 bg-navy-800/40 rounded-lg border border-navy-600/50"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      role="region"
      aria-label="Peer Group Weighting Panel"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-surface-white">Peer Group Weighting</h3>
        <motion.div
          className="text-sm text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          Adjust how much each peer group influences the final score
        </motion.div>
      </div>

      {/* Sliders */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6">
        {sliderConfigs.map((config, index) => {
          const Icon = config.icon;
          const value = weights[config.id];
          const isHovered = hoveredSlider === config.id;

          return (
            <motion.div
              key={config.id}
              className="space-y-3"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.02 }}
              onHoverStart={() => setHoveredSlider(config.id)}
              onHoverEnd={() => setHoveredSlider(null)}
            >
              {/* Label and Value */}
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <Label
                    htmlFor={`${config.id}-slider`}
                    className="flex items-center gap-2 mb-1"
                    aria-label={`Adjust ${config.label} weight`}
                  >
                    <motion.div
                      animate={{
                        scale: isHovered ? 1.2 : 1,
                        rotate: isHovered ? 360 : 0,
                      }}
                      transition={{ duration: 0.3 }}
                      aria-hidden="true"
                    >
                      <Icon size={16} />
                    </motion.div>
                    <span>{config.label}</span>
                  </Label>
                  <motion.p
                    className="text-xs text-muted-foreground"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: isHovered ? 1 : 0.7 }}
                    transition={{ duration: 0.2 }}
                  >
                    {config.description}
                  </motion.p>
                </div>
                <motion.span
                  className="font-mono text-accent-teal font-semibold"
                  key={value}
                  initial={{ scale: 1.2 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                >
                  <AnimatedPercentage value={value} />
                </motion.span>
              </div>

              {/* Slider Container */}
              <div className="relative">
                {/* Background gradient */}
                <motion.div
                  className={cn('absolute inset-0 bg-gradient-to-r', config.gradientFrom, config.gradientTo, 'rounded-full')}
                  animate={{ opacity: isHovered ? 1 : 0.3 }}
                  transition={{ duration: 0.3 }}
                  aria-hidden="true"
                />

                {/* Slider */}
                <Slider
                  id={`${config.id}-slider`}
                  value={[value]}
                  onValueChange={([v]) => handleSliderChange(config.id, v)}
                  max={100}
                  step={1}
                  className={cn('relative z-10 [&>span:first-child]:h-2', config.sliderColor, '[&>span>span]:transition-all')}
                  aria-label={`${config.label} weight: ${value}%`}
                />

                {/* Glow effect */}
                <motion.div
                  className={cn(
                    'absolute top-1/2 -translate-y-1/2 h-4',
                    config.glowColor,
                    'rounded-full blur-xl pointer-events-none'
                  )}
                  animate={{
                    opacity: isHovered ? 0.6 : 0,
                    width: `${value}%`,
                  }}
                  transition={{ duration: 0.3 }}
                  aria-hidden="true"
                />

                {/* Value indicators at key points */}
                <div className="absolute inset-x-0 top-3 flex justify-between pointer-events-none" aria-hidden="true">
                  {[0, 25, 50, 75, 100].map((mark) => (
                    <motion.div
                      key={mark}
                      className="relative"
                      style={{ left: `${mark}%`, transform: 'translateX(-50%)' }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: isHovered ? 0.3 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="absolute top-0 w-px h-2 bg-gray-600" />
                      <div className="absolute top-3 text-xs text-gray-600 transform -translate-x-1/2">{mark}</div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Total weight indicator */}
      <AnimatePresence>
        {Math.round(totalWeight) !== 100 && (
          <motion.div
            className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-md"
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            transition={{ duration: 0.2 }}
            role="alert"
            aria-label="Total weight warning"
          >
            <motion.p
              className="text-center text-xs text-amber-400 flex items-center justify-center gap-2"
            >
              <motion.span
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
                className="inline-block w-2 h-2 bg-amber-400 rounded-full"
                aria-hidden="true"
              />
              Total weight is {totalWeight.toFixed(0)}%. Please adjust sliders to sum to 100% for an accurate score.
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Visual balance indicator */}
      <motion.div
        className="mt-4 h-1 bg-navy-700 rounded-full overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        aria-hidden="true"
      >
        <motion.div
          className="h-full bg-gradient-to-r from-teal-400 via-sky-400 to-indigo-400"
          animate={{
            width: `${Math.min(totalWeight, 100)}%`,
            backgroundColor: Math.round(totalWeight) === 100 ? '#10b981' : '#f59e0b',
          }}
          transition={{ duration: 0.3 }}
        />
      </motion.div>
    </motion.div>
  );
};