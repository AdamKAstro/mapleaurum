import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';

interface MineralBadgeProps {
  mineral: string;
  className?: string;
}

const mineralConfigs: Record<string, {
  baseColor: string;
  hoverColor: string;
  ringColor: string;
  textColor: string;
  glowColor: string;
}> = {
  gold: {
    baseColor: 'from-accent-yellow/80 to-accent-brown/80',
    hoverColor: 'group-hover:from-accent-yellow group-hover:to-accent-brown',
    ringColor: 'ring-accent-yellow/30',
    textColor: 'text-surface-white',
    glowColor: 'shadow-glow-yellow',
  },
  silver: {
    baseColor: 'from-navy-200/80 to-navy-300/80',
    hoverColor: 'group-hover:from-navy-200 group-hover:to-navy-300',
    ringColor: 'ring-navy-200/30',
    textColor: 'text-surface-white',
    glowColor: '',
  },
  copper: {
    baseColor: 'from-accent-red/80 to-accent-brown/80',
    hoverColor: 'group-hover:from-accent-red group-hover:to-accent-brown',
    ringColor: 'ring-accent-red/30',
    textColor: 'text-surface-white',
    glowColor: 'shadow-glow-red',
  },
  zinc: {
    baseColor: 'from-accent-teal/80 to-navy-400/80',
    hoverColor: 'group-hover:from-accent-teal group-hover:to-navy-400',
    ringColor: 'ring-accent-teal/30',
    textColor: 'text-surface-white',
    glowColor: 'shadow-glow-teal',
  },
  uranium: {
    baseColor: 'from-accent-teal/80 to-accent-yellow/80',
    hoverColor: 'group-hover:from-accent-teal group-hover:to-accent-yellow',
    ringColor: 'ring-accent-teal/30',
    textColor: 'text-surface-white',
    glowColor: 'shadow-glow-teal',
  },
  lithium: {
    baseColor: 'from-accent-pink/80 to-accent-red/80',
    hoverColor: 'group-hover:from-accent-pink group-hover:to-accent-red',
    ringColor: 'ring-accent-pink/30',
    textColor: 'text-surface-white',
    glowColor: 'shadow-glow-red',
  },
  platinum: {
    baseColor: 'from-navy-200/80 to-navy-300/80',
    hoverColor: 'group-hover:from-navy-200 group-hover:to-navy-300',
    ringColor: 'ring-navy-200/30',
    textColor: 'text-surface-white',
    glowColor: '',
  },
  palladium: {
    baseColor: 'from-navy-300/80 to-navy-400/80',
    hoverColor: 'group-hover:from-navy-300 group-hover:to-navy-400',
    ringColor: 'ring-navy-300/30',
    textColor: 'text-surface-white',
    glowColor: '',
  },
};

export function MineralBadge({ mineral, className }: MineralBadgeProps) {
  const config = mineralConfigs[mineral.toLowerCase()] || {
    baseColor: 'from-navy-300/80 to-navy-400/80',
    hoverColor: 'group-hover:from-navy-300 group-hover:to-navy-400',
    ringColor: 'ring-navy-300/30',
    textColor: 'text-surface-white',
    glowColor: '',
  };

  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.05 }}
      className={cn(
        'group relative inline-flex items-center px-2 py-0.5 rounded-full',
        'bg-gradient-to-r shadow-sm transition-all duration-300',
        'ring-1',
        config.baseColor,
        config.hoverColor,
        config.ringColor,
        config.glowColor,
        'transform hover:-translate-y-0.5',
        className
      )}
    >
      {/* Subtle glow effect */}
      <div className={cn(
        'absolute inset-0 rounded-full blur opacity-30 transition-opacity duration-300',
        'bg-gradient-to-r',
        config.baseColor,
        'group-hover:opacity-50'
      )} />
      
      {/* Content */}
      <div className="relative z-10">
        <span className={cn('text-xs font-medium capitalize', config.textColor)}>
          {mineral}
        </span>
      </div>
    </motion.div>
  );
}

export function MineralsList({ minerals }: { minerals: string[] | null }) {
  if (!minerals || !Array.isArray(minerals) || minerals.length === 0) {
    return <span className="text-navy-200 text-sm">-</span>;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {minerals.map((mineral, index) => (
        <MineralBadge key={`${mineral}-${index}`} mineral={mineral} />
      ))}
    </div>
  );
}