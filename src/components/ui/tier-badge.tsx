// src/components/ui/tier-badge.tsx
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
  pro: Zap,
  premium: Crown,
} as const;

const tierColors = {
  free: {
    bg: 'from-gray-400/10 to-gray-500/20',
    hover: 'hover:from-gray-400/20 hover:to-gray-500/30',
    text: 'text-gray-200',
    border: 'border-gray-300/30',
    glow: 'shadow-gray-400/20',
  },
  pro: {
    bg: 'from-blue-500/10 to-blue-600/20',
    hover: 'hover:from-blue-500/20 hover:to-blue-600/30',
    text: 'text-blue-200',
    border: 'border-blue-300/30',
    glow: 'shadow-blue-400/20',
  },
  premium: {
    bg: 'from-amber-500/10 to-amber-600/20',
    hover: 'hover:from-amber-500/20 hover:to-amber-600/30',
    text: 'text-amber-200',
    border: 'border-amber-300/30',
    glow: 'shadow-amber-400/20',
  },
} as const;

export function TierBadge({
  tier,
  showIcon = true,
  showLabel = true,
  size = 'md',
  className,
}: TierBadgeProps) {
  if (!tier) return null;

  // Ensure tier is a valid key before accessing
  const validTier = tier in tierIcons ? tier : 'free';
  const Icon = tierIcons[validTier];
  const colors = tierColors[validTier];

  if (!colors) {
    console.warn(`[TierBadge] Colors not found for tier: ${validTier}. Rendering nothing.`);
    return null;
  }

  const sizeClasses = {
    sm: 'text-xs py-0.5 px-1.5',
    md: 'text-sm py-1 px-2',
    lg: 'text-base py-1.5 px-3',
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg',
        'backdrop-blur-md bg-gradient-to-r border border-solid',
        'shadow-md transition-all duration-300',
        'before:absolute before:inset-0 before:rounded-lg before:bg-white/5',
        'hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]',
        sizeClasses[size],
        colors.bg,
        colors.hover,
        colors.text,
        colors.border,
        colors.glow,
        className
      )}
    >
      {/* Glass shine effect */}
      <div className="absolute inset-0 rounded-lg bg-gradient-to-t from-transparent to-white/10 pointer-events-none" />
      
      {/* Content */}
      <div className="relative z-10 flex items-center gap-1.5">
        {showIcon && Icon && <Icon className={iconSizes[size]} />}
        {showLabel && <span className="font-medium">{getTierLabel(validTier)}</span>}
      </div>
    </div>
  );
}