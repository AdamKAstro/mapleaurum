//src/components/ui/tier-badge.tsx
import React from 'react';
import { Star, Zap, Crown } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { ColumnTier } from '../../lib/types';
import { getTierLabel } from '../../lib/tier-utils';

interface TierBadgeProps {
  tier: ColumnTier | null | undefined;
  showIcon?: boolean;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const tierIcons = {
  free: Star,
  medium: Zap,
  premium: Crown
} as const;

const tierColors = {
  free: {
    bg: 'bg-gray-700/50',
    text: 'text-gray-400',
    border: 'border-gray-600/20'
  },
  medium: {
    bg: 'bg-blue-900/50',
    text: 'text-blue-400',
    border: 'border-blue-500/20'
  },
  premium: {
    bg: 'bg-amber-900/50',
    text: 'text-amber-400',
    border: 'border-amber-500/20'
  }
} as const;

export function TierBadge({
  tier,
  showIcon = true,
  showLabel = true,
  size = 'md',
  className
}: TierBadgeProps) {
  if (!tier) return null;

  const Icon = tierIcons[tier];
  const colors = tierColors[tier];
  
  const sizeClasses = {
    sm: 'text-xs py-0.5 px-1.5',
    md: 'text-sm py-1 px-2',
    lg: 'text-base py-1.5 px-3'
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded border',
        sizeClasses[size],
        colors.bg,
        colors.text,
        colors.border,
        className
      )}
    >
      {showIcon && Icon && <Icon className={iconSizes[size]} />}
      {showLabel && <span className="font-medium">{getTierLabel(tier)}</span>}
    </div>
  );
}