// src/components/mineral-badge.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';

interface MineralBadgeProps {
  mineral: string;
  className?: string;
}

// REFINED COLOR CONFIGS - More subtle, with Gold/Silver enhancements
const mineralConfigs: Record<string, {
  baseColor: string;
  hoverColor: string;
  borderColor: string;
  textColor: string;
  glowColor: string;
  shadowColor: string;
}> = {
  gold: {
    baseColor: 'from-amber-500/30 to-amber-600/40',
    hoverColor: 'hover:from-amber-500/40 hover:to-amber-600/50',
    borderColor: 'border-amber-400/70 border-[1.5px]', // Thicker border
    textColor: 'text-amber-100 font-semibold', // Bolder font
    glowColor: 'shadow-amber-500/20',
    shadowColor: 'shadow-md shadow-amber-900/30',
  },
  silver: {
    baseColor: 'from-gray-400/30 to-gray-500/40',
    hoverColor: 'hover:from-gray-400/40 hover:to-gray-500/50',
    borderColor: 'border-gray-300/70 border-[1.5px]', // Thicker border
    textColor: 'text-gray-100 font-semibold', // Bolder font
    glowColor: 'shadow-gray-400/20',
    shadowColor: 'shadow-md shadow-gray-900/30',
  },
  copper: {
    baseColor: 'from-orange-600/20 to-orange-700/30',
    hoverColor: 'hover:from-orange-600/30 hover:to-orange-700/40',
    borderColor: 'border-orange-500/50',
    textColor: 'text-orange-200 font-medium',
    glowColor: 'shadow-orange-600/10',
    shadowColor: 'shadow shadow-orange-900/20',
  },
  zinc: {
    baseColor: 'from-teal-600/20 to-cyan-700/30',
    hoverColor: 'hover:from-teal-600/30 hover:to-cyan-700/40',
    borderColor: 'border-teal-400/50',
    textColor: 'text-teal-200 font-medium',
    glowColor: 'shadow-teal-500/10',
    shadowColor: 'shadow shadow-teal-900/20',
  },
  uranium: {
    baseColor: 'from-green-500/20 to-emerald-600/30',
    hoverColor: 'hover:from-green-500/30 hover:to-emerald-600/40',
    borderColor: 'border-green-400/60',
    textColor: 'text-green-200 font-medium',
    glowColor: 'shadow-green-500/20',
    shadowColor: 'shadow-md shadow-green-900/30',
  },
  lithium: {
    baseColor: 'from-pink-600/20 to-purple-700/30',
    hoverColor: 'hover:from-pink-600/30 hover:to-purple-700/40',
    borderColor: 'border-pink-400/50',
    textColor: 'text-pink-200 font-medium',
    glowColor: 'shadow-pink-500/10',
    shadowColor: 'shadow shadow-purple-900/20',
  },
  platinum: {
    baseColor: 'from-slate-400/20 to-slate-500/30',
    hoverColor: 'hover:from-slate-400/30 hover:to-slate-500/40',
    borderColor: 'border-slate-300/50',
    textColor: 'text-slate-200 font-medium',
    glowColor: 'shadow-slate-400/10',
    shadowColor: 'shadow shadow-slate-900/20',
  },
  palladium: {
    baseColor: 'from-indigo-500/20 to-indigo-600/30',
    hoverColor: 'hover:from-indigo-500/30 hover:to-indigo-600/40',
    borderColor: 'border-indigo-400/50',
    textColor: 'text-indigo-200 font-medium',
    glowColor: 'shadow-indigo-500/10',
    shadowColor: 'shadow shadow-indigo-900/20',
  },
  nickel: {
    baseColor: 'from-neutral-500/20 to-neutral-600/30',
    hoverColor: 'hover:from-neutral-500/30 hover:to-neutral-600/40',
    borderColor: 'border-neutral-400/50',
    textColor: 'text-neutral-200 font-medium',
    glowColor: 'shadow-neutral-500/10',
    shadowColor: 'shadow shadow-neutral-900/20',
  },
  cobalt: {
    baseColor: 'from-blue-600/20 to-blue-700/30',
    hoverColor: 'hover:from-blue-600/30 hover:to-blue-700/40',
    borderColor: 'border-blue-500/50',
    textColor: 'text-blue-200 font-medium',
    glowColor: 'shadow-blue-500/10',
    shadowColor: 'shadow shadow-blue-900/20',
  },
};

export function MineralBadge({ mineral, className }: MineralBadgeProps) {
  const config = mineralConfigs[mineral.toLowerCase()] || {
    // Default fallback for unknown minerals
    baseColor: 'from-gray-500/20 to-gray-600/30',
    hoverColor: 'hover:from-gray-500/30 hover:to-gray-600/40',
    borderColor: 'border-gray-400/50',
    textColor: 'text-gray-200 font-medium',
    glowColor: 'shadow-gray-500/10',
    shadowColor: 'shadow shadow-gray-900/20',
  };

  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        'group relative inline-flex items-center px-2.5 py-0.5 rounded-full', // Smaller padding
        'backdrop-blur-md bg-gradient-to-r transition-all duration-300 border-solid',
        config.baseColor,
        config.hoverColor,
        config.borderColor, // Border width is now controlled by the config
        config.shadowColor,
        'transform hover:-translate-y-px', // Less dramatic hover effect
        'before:absolute before:inset-0 before:rounded-full before:bg-white/10',
        'after:absolute after:inset-0 after:rounded-full',
        'after:bg-gradient-to-t after:from-transparent after:via-white/10 after:to-transparent', // More subtle sheen
        'after:opacity-0 after:transition-opacity after:duration-300',
        'hover:after:opacity-100',
        className
      )}
    >
      {/* Glass shine effect */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-t from-transparent via-white/10 to-white/5 pointer-events-none" />
      
      {/* Inner glow */}
      <div className={cn(
        'absolute inset-0 rounded-full blur-md opacity-30 transition-opacity duration-300',
        'bg-gradient-to-r',
        config.baseColor,
        'group-hover:opacity-50'
      )} />
      
      {/* Content */}
      <div className="relative z-10">
        <span className={cn(
          'text-xs capitalize tracking-wide', // Smaller font size
          config.textColor, // Font weight now controlled by config
          'drop-shadow-sm' // Softer text shadow
        )}>
          {mineral}
        </span>
      </div>

      {/* Optional: Pulse animation for uranium */}
      {mineral.toLowerCase() === 'uranium' && (
        <div className="absolute inset-0 rounded-full animate-pulse">
          <div className={cn(
            'absolute inset-0 rounded-full blur-lg opacity-40',
            'bg-gradient-to-r from-green-400 to-emerald-600'
          )} />
        </div>
      )}
    </motion.div>
  );
}

export function MineralsList({ minerals }: { minerals: string[] | null }) {
  if (!minerals || !Array.isArray(minerals) || minerals.length === 0) {
    return <span className="text-navy-200 text-sm">-</span>;
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {minerals.map((mineral, index) => (
        <MineralBadge key={`${mineral}-${index}`} mineral={mineral} />
      ))}
    </div>
  );
}