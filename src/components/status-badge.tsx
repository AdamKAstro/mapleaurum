//src/components/status-badge.tsx
import React from 'react';
import { CircleDot, Hammer, Pickaxe, Crown, HelpCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';
import type { CompanyStatus } from '../lib/types';

interface StatusBadgeProps {
  status: CompanyStatus | string | null;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const getStatusConfig = (status: CompanyStatus | string | null) => {
    if (!status) {
      return {
        icon: HelpCircle,
        baseColor: 'from-white/5 to-white/10',
        hoverColor: 'hover:from-white/10 hover:to-white/20',
        borderColor: 'border-white/20',
        textColor: 'text-surface-white/70',
        iconColor: 'text-surface-white/70',
        glowColor: '',
      };
    }
    
    const normalizedStatus = status.toLowerCase();
    
    switch (normalizedStatus) {
      case 'producer':
        return {
          icon: CircleDot,
          baseColor: 'from-emerald-500/10 to-emerald-600/20',
          hoverColor: 'hover:from-emerald-500/20 hover:to-emerald-600/30',
          borderColor: 'border-emerald-400/30',
          textColor: 'text-emerald-100',
          iconColor: 'text-emerald-200',
          glowColor: 'shadow-emerald-500/20',
        };
      case 'developer':
        return {
          icon: Hammer,
          baseColor: 'from-blue-500/10 to-blue-600/20',
          hoverColor: 'hover:from-blue-500/20 hover:to-blue-600/30',
          borderColor: 'border-blue-400/30',
          textColor: 'text-blue-100',
          iconColor: 'text-blue-200',
          glowColor: 'shadow-blue-500/20',
        };
      case 'explorer':
        return {
          icon: Pickaxe,
          baseColor: 'from-purple-500/10 to-purple-600/20',
          hoverColor: 'hover:from-purple-500/20 hover:to-purple-600/30',
          borderColor: 'border-purple-400/30',
          textColor: 'text-purple-100',
          iconColor: 'text-purple-200',
          glowColor: 'shadow-purple-500/20',
        };
      case 'royalty':
        return {
          icon: Crown,
          baseColor: 'from-amber-500/10 to-amber-600/20',
          hoverColor: 'hover:from-amber-500/20 hover:to-amber-600/30',
          borderColor: 'border-amber-400/30',
          textColor: 'text-amber-100',
          iconColor: 'text-amber-200',
          glowColor: 'shadow-amber-500/20',
        };
      default:
        return {
          icon: HelpCircle,
          baseColor: 'from-white/5 to-white/10',
          hoverColor: 'hover:from-white/10 hover:to-white/20',
          borderColor: 'border-white/20',
          textColor: 'text-surface-white/70',
          iconColor: 'text-surface-white/70',
          glowColor: '',
        };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;

  if (!status) {
    return (
      <span className="text-surface-white/50 text-sm">-</span>
    );
  }

  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={cn(
        'relative inline-flex items-center gap-1 px-2 py-1 rounded-full',
        'backdrop-blur-md bg-gradient-to-r transition-all duration-300',
        'border border-solid shadow-lg',
        config.baseColor,
        config.hoverColor,
        config.borderColor,
        config.glowColor,
        'transform hover:-translate-y-0.5 hover:shadow-xl',
        'before:absolute before:inset-0 before:rounded-full before:bg-white/5',
        'max-w-[100px]',
        className
      )}
    >
      {/* Glass shine effect */}
      <div className={cn(
        'absolute inset-0 rounded-full bg-gradient-to-t from-transparent to-white/10 pointer-events-none'
      )} />
      
      {/* Subtle inner glow */}
      <div className={cn(
        'absolute inset-0 rounded-full blur-sm opacity-30 transition-opacity duration-300',
        'bg-gradient-to-r',
        config.baseColor,
        'group-hover:opacity-50'
      )} />
      
      {/* Content */}
      <div className="relative z-10 flex items-center gap-1">
        <Icon className={cn('h-3 w-3', config.iconColor)} />
        <span className={cn('text-xs font-medium capitalize truncate', config.textColor)}>
          {status.toLowerCase()}
        </span>
      </div>
    </motion.div>
  );
}