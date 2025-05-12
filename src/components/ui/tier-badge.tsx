// src/components/ui/tier-badge.tsx
import React from 'react';
import { Star, Zap, Crown } from 'lucide-react'; // Zap might be unused if 'medium' is fully replaced by 'pro'
import { cn } from '../../lib/utils';
import type { ColumnTier } from '../../lib/types'; // Should be 'free' | 'pro' | 'premium'
import { getTierLabel } from '../../lib/tier-utils'; // Assuming this function correctly handles 'pro'

interface TierBadgeProps {
  tier: ColumnTier | null | undefined;
  showIcon?: boolean;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// Updated to use 'pro'
const tierIcons = {
  free: Star,
  pro: Zap, // Or choose a different icon for Pro if Star is for Free and Crown for Premium
  premium: Crown,
} as const;

// Updated to use 'pro'
const tierColors = {
  free: {
    bg: 'bg-gray-700/50',
    text: 'text-gray-400',
    border: 'border-gray-600/20',
  },
  pro: { // Changed from 'medium' to 'pro'
    bg: 'bg-blue-900/50',
    text: 'text-blue-400',
    border: 'border-blue-500/20',
  },
  premium: {
    bg: 'bg-amber-900/50',
    text: 'text-amber-400',
    border: 'border-amber-500/20',
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

  // Ensure tier is a valid key before accessing.
  // This guards against unexpected tier values that might come from inconsistent data.
  const validTier = tier in tierIcons ? tier : 'free'; // Fallback to 'free' or handle error

  const Icon = tierIcons[validTier];
  const colors = tierColors[validTier];

  // If after fallback, colors is still somehow undefined (e.g. if 'free' was removed from tierColors), add a guard.
  if (!colors) {
    console.warn(`[TierBadge] Colors not found for tier: ${validTier}. Rendering nothing.`);
    return null; // Or render a default badge
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
        'inline-flex items-center gap-1.5 rounded border',
        sizeClasses[size],
        colors.bg,
        colors.text,
        colors.border,
        className
      )}
    >
      {showIcon && Icon && <Icon className={iconSizes[size]} />}
      {showLabel && <span className="font-medium">{getTierLabel(validTier)}</span>}
    </div>
  );
}