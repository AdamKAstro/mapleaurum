// src/components/status-filter-button.tsx
import React from 'react';
import { CircleDot, Hammer, Pickaxe, Crown } from 'lucide-react';
import { cn } from '../lib/utils';
import type { CompanyStatus } from '../lib/types';

interface StatusFilterButtonProps {
  status: CompanyStatus;
  isSelected: boolean;
  onChange: () => void;
}

export function StatusFilterButton({ status, isSelected, onChange }: StatusFilterButtonProps) {
  const getStatusConfig = (status: CompanyStatus) => {
    const normalizedStatus = status.toLowerCase();
    
    switch (normalizedStatus) {
      case 'producer':
        return {
          icon: CircleDot,
          baseColor: 'from-emerald-500/90 to-emerald-600/90',
          selectedBg: 'bg-emerald-500/20',
          selectedBorder: 'border-emerald-500/60',
          selectedText: 'text-emerald-100',
          unselectedBg: 'bg-navy-600/30',
          unselectedBorder: 'border-navy-400/30',
          unselectedText: 'text-surface-white/60',
          hoverBg: 'hover:bg-emerald-500/30',
          shadowColor: 'shadow-emerald-500/30',
          ringColor: 'focus:ring-emerald-500/50',
        };
      case 'developer':
        return {
          icon: Hammer,
          baseColor: 'from-blue-500/90 to-blue-600/90',
          selectedBg: 'bg-blue-500/20',
          selectedBorder: 'border-blue-500/60',
          selectedText: 'text-blue-100',
          unselectedBg: 'bg-navy-600/30',
          unselectedBorder: 'border-navy-400/30',
          unselectedText: 'text-surface-white/60',
          hoverBg: 'hover:bg-blue-500/30',
          shadowColor: 'shadow-blue-500/30',
          ringColor: 'focus:ring-blue-500/50',
        };
      case 'explorer':
        return {
          icon: Pickaxe,
          baseColor: 'from-purple-500/90 to-purple-600/90',
          selectedBg: 'bg-purple-500/20',
          selectedBorder: 'border-purple-500/60',
          selectedText: 'text-purple-100',
          unselectedBg: 'bg-navy-600/30',
          unselectedBorder: 'border-navy-400/30',
          unselectedText: 'text-surface-white/60',
          hoverBg: 'hover:bg-purple-500/30',
          shadowColor: 'shadow-purple-500/30',
          ringColor: 'focus:ring-purple-500/50',
        };
      case 'royalty':
        return {
          icon: Crown,
          baseColor: 'from-amber-500/90 to-amber-600/90',
          selectedBg: 'bg-amber-500/20',
          selectedBorder: 'border-amber-500/60',
          selectedText: 'text-amber-100',
          unselectedBg: 'bg-navy-600/30',
          unselectedBorder: 'border-navy-400/30',
          unselectedText: 'text-surface-white/60',
          hoverBg: 'hover:bg-amber-500/30',
          shadowColor: 'shadow-amber-500/30',
          ringColor: 'focus:ring-amber-500/50',
        };
      default:
        return {
          icon: CircleDot,
          baseColor: 'from-navy-300/90 to-navy-400/90',
          selectedBg: 'bg-navy-400/20',
          selectedBorder: 'border-navy-400/60',
          selectedText: 'text-surface-white',
          unselectedBg: 'bg-navy-600/30',
          unselectedBorder: 'border-navy-400/30',
          unselectedText: 'text-surface-white/60',
          hoverBg: 'hover:bg-navy-400/30',
          shadowColor: '',
          ringColor: 'focus:ring-navy-400/50',
        };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;

  return (
    <button
      onClick={onChange}
      className={cn(
        'relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full',
        'border transition-all duration-200 transform',
        'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-navy-700',
        isSelected ? [
          config.selectedBg,
          config.selectedBorder,
          config.selectedText,
          config.shadowColor,
          'shadow-md',
          'hover:shadow-lg',
          'hover:scale-105',
          'ring-1 ring-white/10',
        ] : [
          config.unselectedBg,
          config.unselectedBorder,
          config.unselectedText,
          config.hoverBg,
          'hover:scale-105',
          'hover:border-opacity-80',
        ],
        config.ringColor
      )}
      aria-pressed={isSelected}
      aria-label={`Filter by ${status} status`}
      type="button"
    >
      {isSelected && (
        <div 
          className={cn(
            'absolute inset-0 rounded-full bg-gradient-to-r opacity-20',
            config.baseColor
          )} 
          aria-hidden="true"
        />
      )}
      <Icon className={cn('h-3.5 w-3.5 relative z-10', isSelected && 'animate-pulse')} />
      <span className="text-xs font-medium capitalize relative z-10">{status}</span>
    </button>
  );
}
