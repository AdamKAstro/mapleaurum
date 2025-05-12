// src/components/ui/feature-access.tsx
import React from 'react';
import { Lock } from 'lucide-react';
import { TierBadge } from './tier-badge'; // Ensure TierBadge is corrected for 'pro' tier
import { cn } from '../../lib/utils';
import type { ColumnTier } from '../../lib/types';
import { isFeatureAccessible, getTierLabel } from '../../lib/tier-utils'; // Using the corrected utility from tier-utils

interface FeatureAccessProps {
  children: React.ReactNode;
  requiredTier: ColumnTier;
  currentTier: ColumnTier | undefined | null; // Allow undefined/null while currentTier is loading from context
  className?: string;
  featureName?: string; // Optional: for more descriptive logging
}

export function FeatureAccess({
  children,
  requiredTier,
  currentTier,
  className,
  featureName // For more descriptive logging if needed
}: FeatureAccessProps) {

  // Handle case where currentTier might not be loaded yet from context (e.g., AuthProvider/SubscriptionProvider initializing)
  if (currentTier === undefined || currentTier === null) {
    // This state can occur if the context providing currentTier hasn't resolved yet.
    // It's important to block access or show a specific loading/locked state here.
    console.log(`[FeatureAccess] ${featureName || 'Feature'} check: Current tier is '${String(currentTier)}', required: '${requiredTier}'. Access temporarily displayed as restricted until current tier resolves.`);
    
    // Render a less intrusive "checking access" state or a generic locked state
    return (
      <div className={cn("relative", className)} aria-live="polite"> {/* Announce changes for screen readers */}
        {/* Render children with styles indicating a loading/pending state */}
        <div className="opacity-30 blur-[1px] pointer-events-none select-none" aria-hidden="true">
          {children}
        </div>
        {/* Overlay indicating access is being checked or is restricted */}
        <div 
          className="absolute inset-0 bg-navy-700/60 backdrop-blur-sm rounded-lg flex flex-col items-center justify-center z-10 p-1 text-center cursor-default" 
          aria-label="Access to this feature is currently being verified or is restricted."
        >
            <Lock className="h-5 w-5 text-amber-400 flex-shrink-0" />
             <span className="text-xs text-amber-200/80 mt-1">Checking access...</span>
        </div>
      </div>
    );
  }
  
  // currentTier is now confirmed to be a valid ColumnTier string ('free', 'pro', or 'premium')
  const accessible = isFeatureAccessible(requiredTier, currentTier);

  if (accessible) {
    // console.log(`[FeatureAccess] ${featureName || 'Feature'} Access GRANTED. Current: ${currentTier}, Required: ${requiredTier}`);
    return <>{children}</>;
  }

  // Fallback UI for inaccessible feature
  if (featureName) { // More detailed log if featureName is provided
      console.log(`[FeatureAccess] Access DENIED for feature '${featureName}'. User Tier: ${currentTier}, Required Tier: ${requiredTier}`);
  } else {
      console.log(`[FeatureAccess] Access DENIED. User Tier: ${currentTier}, Required Tier: ${requiredTier}`);
  }

  return (
    <div className={cn(
      "relative", // Base class for positioning the overlay
      className
    )}>
      {/* Overlay to indicate restricted access */}
      <div 
        className="absolute inset-0 bg-navy-700/70 backdrop-blur-sm rounded-lg flex flex-col items-center justify-center z-10 p-2 text-center cursor-default" 
        aria-label={`Access to this feature requires the ${getTierLabel(requiredTier)} tier.`}
      >
        <Lock className="h-5 w-5 sm:h-6 sm:w-6 text-amber-400 mb-1 sm:mb-2 flex-shrink-0" />
        <TierBadge tier={requiredTier} showIcon={false} size="sm" /> {/* Show required tier */}
        <span className="text-xs text-amber-200/80 mt-1">Requires {getTierLabel(requiredTier)}</span>
      </div>
      {/* Visually impair and disable interaction with the children */}
      <div className="opacity-40 blur-[1px] pointer-events-none select-none" aria-hidden="true">
        {children}
      </div>
    </div>
  );
}