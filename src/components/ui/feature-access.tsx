// src/components/ui/feature-access.tsx
import React from 'react';
import { Lock } from 'lucide-react';
import { TierBadge } from './tier-badge';
import { cn } from '../../lib/utils';
import type { ColumnTier } from '../../lib/types';
// Removed: import { isFeatureAccessible } from '../../lib/tier-utils'; // We will inline the logic

interface FeatureAccessProps {
  children: React.ReactNode;
  requiredTier: ColumnTier;
  currentTier: ColumnTier;
  className?: string;
}

export function FeatureAccess({
  children,
  requiredTier,
  currentTier,
  className
}: FeatureAccessProps) {

  // Inlined and corrected tier accessibility logic
  const isAccessible = (): boolean => {
    const tierLevels: Record<ColumnTier, number> = {
      free: 0,
      pro: 1,    // Ensures 'pro' is used
      premium: 2,
    };

    // Ensure provided tiers are valid keys in tierLevels
    if (!(requiredTier in tierLevels)) {
      console.warn(`[FeatureAccess] Unknown requiredTier: ${requiredTier}. Defaulting to inaccessible.`);
      return false;
    }
    if (!(currentTier in tierLevels)) {
      // This could happen if currentUserTier is temporarily null/undefined during loading from context
      // Default to least permissive (inaccessible) if currentTier is unknown or not yet loaded properly.
      console.warn(`[FeatureAccess] Unknown currentTier: ${currentTier}. Defaulting to inaccessible for safety.`);
      return false;
    }
    
    // Log the comparison for debugging the specific lock issue
    if (tierLevels[currentTier] < tierLevels[requiredTier]) {
        console.log(`[FeatureAccess DEBUG] Access DENIED. Current: ${currentTier} (Level ${tierLevels[currentTier]}), Required: ${requiredTier} (Level ${tierLevels[requiredTier]})`);
    } else {
        console.log(`[FeatureAccess DEBUG] Access GRANTED. Current: ${currentTier} (Level ${tierLevels[currentTier]}), Required: ${requiredTier} (Level ${tierLevels[requiredTier]})`);
    }

    return tierLevels[currentTier] >= tierLevels[requiredTier];
  };

  const featureIsAccessible = isAccessible();

  if (featureIsAccessible) {
    return <>{children}</>;
  }

  // Fallback UI for inaccessible feature
  return (
    <div className={cn(
      "relative", // Ensure this div itself doesn't cause layout shifts if possible
      className
    )}>
      <div className="absolute inset-0 bg-navy-700/70 backdrop-blur-sm rounded-lg flex flex-col items-center justify-center z-10 p-2 text-center cursor-default"> {/* Changed to cursor-default */}
        <Lock className="h-5 w-5 sm:h-6 sm:w-6 text-amber-400 mb-1 sm:mb-2 flex-shrink-0" />
        <TierBadge tier={requiredTier} showIcon={false} size="sm" /> {/* Smaller badge, no icon */}
        {/* Optional: Add a small text if needed, e.g., "Upgrade required" */}
        {/* <span className="text-xs text-amber-200/80 mt-1">Upgrade</span> */}
      </div>
      {/* Apply styles to make children visually 'locked' but still occupy space */}
      <div className="opacity-40 blur-[1px] pointer-events-none select-none">
        {children}
      </div>
    </div>
  );
}