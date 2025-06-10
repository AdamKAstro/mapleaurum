//src/componenets/mineral-badge.tsx
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
  borderColor: string;
  textColor: string;
  glowColor: string;
}> = {
  gold: {
    baseColor: 'from-amber-400/10 to-amber-600/20',
    hoverColor: 'hover:from-amber-400/20 hover:to-amber-600/30',
    borderColor: 'border-amber-300/30',
    textColor: 'text-amber-100',
    glowColor: 'shadow-amber-400/20',
  },
  silver: {
    baseColor: 'from-gray-300/10 to-gray-400/20',
    hoverColor: 'hover:from-gray-300/20 hover:to-gray-400/30',
    borderColor: 'border-gray-200/30',
    textColor: 'text-gray-100',
    glowColor: 'shadow-gray-300/20',
  },
  copper: {
    baseColor: 'from-orange-600/10 to-orange-700/20',
    hoverColor: 'hover:from-orange-600/20 hover:to-orange-700/30',
    borderColor: 'border-orange-400/30',
    textColor: 'text-orange-100',
    glowColor: 'shadow-orange-500/20',
  },
  zinc: {
    baseColor: 'from-teal-500/10 to-cyan-600/20',
    hoverColor: 'hover:from-teal-500/20 hover:to-cyan-600/30',
    borderColor: 'border-teal-300/30',
    textColor: 'text-teal-100',
    glowColor: 'shadow-teal-400/20',
  },
  uranium: {
    baseColor: 'from-green-400/10 to-emerald-600/20',
    hoverColor: 'hover:from-green-400/20 hover:to-emerald-600/30',
    borderColor: 'border-green-300/30',
    textColor: 'text-green-100',
    glowColor: 'shadow-green-400/20',
  },
  lithium: {
    baseColor: 'from-pink-500/10 to-purple-600/20',
    hoverColor: 'hover:from-pink-500/20 hover:to-purple-600/30',
    borderColor: 'border-pink-300/30',
    textColor: 'text-pink-100',
    glowColor: 'shadow-pink-400/20',
  },
  platinum: {
    baseColor: 'from-slate-300/10 to-slate-400/20',
    hoverColor: 'hover:from-slate-300/20 hover:to-slate-400/30',
    borderColor: 'border-slate-200/30',
    textColor: 'text-slate-100',
    glowColor: 'shadow-slate-300/20',
  },
  palladium: {
    baseColor: 'from-indigo-400/10 to-indigo-600/20',
    hoverColor: 'hover:from-indigo-400/20 hover:to-indigo-600/30',
    borderColor: 'border-indigo-300/30',
    textColor: 'text-indigo-100',
    glowColor: 'shadow-indigo-400/20',
  },
};

export function MineralBadge({ mineral, className }: MineralBadgeProps) {
  const config = mineralConfigs[mineral.toLowerCase()] || {
    baseColor: 'from-gray-300/10 to-gray-400/20',
    hoverColor: 'hover:from-gray-300/20 hover:to-gray-400/30',
    borderColor: 'border-gray-300/30',
    textColor: 'text-gray-100',
    glowColor: 'shadow-gray-400/20',
  };

  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.05 }}
      className={cn(
        'group relative inline-flex items-center px-2 py-0.5 rounded-full',
        'backdrop-blur-md bg-gradient-to-r shadow-md transition-all duration-300',
        'border border-solid',
        config.baseColor,
        config.hoverColor,
        config.borderColor,
        config.glowColor,
        'transform hover:-translate-y-0.5 hover:shadow-lg',
        'before:absolute before:inset-0 before:rounded-full before:bg-white/5',
        className
      )}
    >
      {/* Glass shine effect */}
      <div className={cn(
        'absolute inset-0 rounded-full bg-gradient-to-t from-transparent to-white/10 pointer-events-none'
      )} />
      
      {/* Subtle inner glow */}
      <div className={cn(
        'absolute inset-0 rounded-full blur-sm opacity-20 transition-opacity duration-300',
        'bg-gradient-to-r',
        config.baseColor,
        'group-hover:opacity-40'
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