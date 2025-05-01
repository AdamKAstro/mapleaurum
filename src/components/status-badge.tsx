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
        baseColor: 'from-navy-300/90 to-navy-400/90',
        ringColor: 'ring-navy-400/30',
        textColor: 'text-surface-white/70',
        iconColor: 'text-surface-white/70',
        shadowColor: '',
        bgColor: 'bg-navy-400/10',
      };
    }

    const normalizedStatus = status.toLowerCase();
    switch (normalizedStatus) {
      case 'producer':
        return {
          icon: CircleDot,
          baseColor: 'from-emerald-500/90 to-emerald-600/90',
          ringColor: 'ring-emerald-500/40',
          textColor: 'text-emerald-100',
          iconColor: 'text-emerald-200',
          shadowColor: 'shadow-emerald-500/30',
          bgColor: 'bg-emerald-500/20',
        };
      case 'developer':
        return {
          icon: Hammer,
          baseColor: 'from-blue-500/90 to-blue-600/90',
          ringColor: 'ring-blue-500/40',
          textColor: 'text-blue-100',
          iconColor: 'text-blue-200',
          shadowColor: 'shadow-blue-500/30',
          bgColor: 'bg-blue-500/20',
        };
      case 'explorer':
        return {
          icon: Pickaxe,
          baseColor: 'from-purple-500/90 to-purple-600/90',
          ringColor: 'ring-purple-500/40',
          textColor: 'text-purple-100',
          iconColor: 'text-purple-200',
          shadowColor: 'shadow-purple-500/30',
          bgColor: 'bg-purple-500/20',
        };
      case 'royalty':
        return {
          icon: Crown,
          baseColor: 'from-amber-500/90 to-amber-600/90',
          ringColor: 'ring-amber-500/40',
          textColor: 'text-amber-100',
          iconColor: 'text-amber-200',
          shadowColor: 'shadow-amber-500/30',
          bgColor: 'bg-amber-500/20',
        };
      default:
        return {
          icon: HelpCircle,
          baseColor: 'from-navy-300/90 to-navy-400/90',
          ringColor: 'ring-navy-400/30',
          textColor: 'text-surface-white/70',
          iconColor: 'text-surface-white/70',
          shadowColor: '',
          bgColor: 'bg-navy-400/10',
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
        'bg-gradient-to-r shadow-md transition-all duration-300',
        'ring-1 ring-offset-1 ring-offset-navy-500',
        config.baseColor,
        config.ringColor,
        config.shadowColor,
        'transform hover:-translate-y-0.5',
        'max-w-[100px]', // Match column width
        className
      )}
    >
      {/* Glow effect */}
      <div className={cn(
        'absolute inset-0 rounded-full blur opacity-50 transition-opacity duration-300',
        'bg-gradient-to-r',
        config.baseColor,
        'group-hover:opacity-75'
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