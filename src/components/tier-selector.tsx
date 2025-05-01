import React from 'react';
import { Crown, Star } from 'lucide-react';
import type { ColumnTier } from '../lib/types';

interface TierSelectorProps {
  currentTier: ColumnTier;
  onTierChange: (tier: ColumnTier) => void;
}

export function TierSelector({ currentTier, onTierChange }: TierSelectorProps) {
  return (
    <div className="flex items-center gap-1 bg-navy-400/20 rounded-lg p-1">
      <button
        onClick={() => onTierChange('free')}
        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
          currentTier === 'free'
            ? 'bg-navy-400/40 text-surface-white'
            : 'text-surface-white/70 hover:text-surface-white hover:bg-navy-400/30'
        }`}
      >
        Free
      </button>
      <button
        onClick={() => onTierChange('medium')}
        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1 ${
          currentTier === 'medium'
            ? 'bg-navy-400/40 text-surface-white'
            : 'text-surface-white/70 hover:text-surface-white hover:bg-navy-400/30'
        }`}
      >
        <Star className="h-3.5 w-3.5" />
        Pro
      </button>
      <button
        onClick={() => onTierChange('premium')}
        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1 ${
          currentTier === 'premium'
            ? 'bg-navy-400/40 text-surface-white'
            : 'text-surface-white/70 hover:text-surface-white hover:bg-navy-400/30'
        }`}
      >
        <Crown className="h-3.5 w-3.5" />
        Premium
      </button>
    </div>
  );
}