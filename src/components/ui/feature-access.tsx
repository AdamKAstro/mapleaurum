import React from 'react';
import { Lock } from 'lucide-react';
import { TierBadge } from './tier-badge';
import { cn } from '../../lib/utils';
import type { ColumnTier } from '../../lib/types';
import { isFeatureAccessible } from '../../lib/tier-utils';

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
  const isAccessible = isFeatureAccessible(requiredTier, currentTier);

  if (isAccessible) {
    return <>{children}</>;
  }

  return (
    <div className={cn(
      "relative",
      className
    )}>
      <div className="absolute inset-0 bg-navy-700/70 backdrop-blur-sm rounded-lg flex flex-col items-center justify-center z-10 p-2 text-center cursor-not-allowed">
        <Lock className="h-6 w-6 text-amber-400 mb-2 flex-shrink-0" />
        <TierBadge tier={requiredTier} />
      </div>
      <div className="opacity-30 pointer-events-none">
        {children}
      </div>
    </div>
  );
}