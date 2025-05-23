//src/components/tier-selector.tsx

import React from 'react';
import { Crown, Star, Zap } from 'lucide-react'; // Assuming Zap is for Pro now
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
        onClick={() => onTierChange('pro')} {/* CHANGED from 'medium' */}
        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1 ${
          currentTier === 'pro' {/* CHANGED from 'medium' */}
            ? 'bg-navy-400/40 text-surface-white'
            : 'text-surface-white/70 hover:text-surface-white hover:bg-navy-400/30'
        }`}
      >
        <Zap className="h-3.5 w-3.5" /> {/* Used Zap as per TierBadge, adjust if needed */}
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