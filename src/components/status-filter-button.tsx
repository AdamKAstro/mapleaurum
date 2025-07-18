// src/components/status-filter-button.tsx
import React from 'react';
import { CircleDot, Hammer, Pickaxe, Crown } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';
import type { CompanyStatus } from '../lib/types';

interface StatusFilterButtonProps {
  status: CompanyStatus;
  isSelected: boolean;
  onChange: () => void;
}

export function StatusFilterButton({ status, isSelected, onChange }: StatusFilterButtonProps) {
  const getStatusConfig = (status: CompanyStatus) => {
    switch (status) {
      case 'producer':
        return {
          icon: CircleDot,
          baseColor: 'from-emerald-500/10 to-emerald-600/20',
          hoverColor: 'hover:from-emerald-500/20 hover:to-emerald-600/30',
          borderColor: isSelected ? 'border-emerald-400' : 'border-navy-600/50',
          textColor: isSelected ? 'text-emerald-100' : 'text-gray-200',
          iconColor: isSelected ? 'text-emerald-200' : 'text-gray-400',
          glowColor: isSelected ? 'shadow-emerald-500/20' : '',
          ringColor: 'focus:ring-emerald-400/50',
        };
      case 'developer':
        return {
          icon: Hammer,
          baseColor: 'from-blue-500/10 to-blue-600/20',
          hoverColor: 'hover:from-blue-500/20 hover:to-blue-600/30',
          borderColor: isSelected ? 'border-blue-400' : 'border-navy-600/50',
          textColor: isSelected ? 'text-blue-100' : 'text-gray-200',
          iconColor: isSelected ? 'text-blue-200' : 'text-gray-400',
          glowColor: isSelected ? 'shadow-blue-500/20' : '',
          ringColor: 'focus:ring-blue-400/50',
        };
      case 'explorer':
        return {
          icon: Pickaxe,
          baseColor: 'from-purple-500/10 to-purple-600/20',
          hoverColor: 'hover:from-purple-500/20 hover:to-purple-600/30',
          borderColor: isSelected ? 'border-purple-400' : 'border-navy-600/50',
          textColor: isSelected ? 'text-purple-100' : 'text-gray-200',
          iconColor: isSelected ? 'text-purple-200' : 'text-gray-400',
          glowColor: isSelected ? 'shadow-purple-500/20' : '',
          ringColor: 'focus:ring-purple-400/50',
        };
      case 'royalty':
        return {
          icon: Crown,
          baseColor: 'from-amber-500/10 to-amber-600/20',
          hoverColor: 'hover:from-amber-500/20 hover:to-amber-600/30',
          borderColor: isSelected ? 'border-amber-400' : 'border-navy-600/50',
          textColor: isSelected ? 'text-amber-100' : 'text-gray-200',
          iconColor: isSelected ? 'text-amber-200' : 'text-gray-400',
          glowColor: isSelected ? 'shadow-amber-500/20' : '',
          ringColor: 'focus:ring-amber-400/50',
        };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;

  return (
    <motion.button
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onChange}
      className={cn(
        'relative inline-flex items-center gap-1 px-2 py-1 rounded-full',
        'backdrop-blur-md bg-gradient-to-r transition-all duration-300',
        'border border-solid shadow-lg',
        config.baseColor,
        config.hoverColor,
        config.borderColor,
        config.glowColor,
        'hover:-translate-y-0.5 hover:shadow-xl',
        'before:absolute before:inset-0 before:rounded-full before:bg-white/5',
        'text-sm font-medium leading-normal',
        config.ringColor
      )}
      aria-pressed={isSelected}
      aria-label={`Filter by ${status} status`}
      type="button"
    >
      <div
        className={cn(
          'absolute inset-0 rounded-full bg-gradient-to-t from-transparent to-white/10 pointer-events-none'
        )}
        aria-hidden="true"
      />
      <div
        className={cn(
          'absolute inset-0 rounded-full blur-sm opacity-30 transition-opacity duration-300',
          'bg-gradient-to-r',
          config.baseColor,
          'group-hover:opacity-50'
        )}
        aria-hidden="true"
      />
      <div className="relative z-10 flex items-center gap-1">
        <Icon className={cn('h-3 w-3', config.iconColor, isSelected && 'animate-pulse')} />
        <span className={cn('capitalize truncate', config.textColor)}>{status}</span>
      </div>
    </motion.button>
  );
}