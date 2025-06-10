// src/components/ui/DebugTierSelector.tsx
import React from 'react';
import { useSubscription } from '../../contexts/subscription-context';
import { Button } from './button'; 
import { Label } from './label'; 
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";
import type { SubscriptionTier } from '../../lib/types'; // Ensure 'pro' is part of this

export function DebugTierSelector() {
  const {
    setDebugTierOverride,
    currentUserSubscriptionTier, // This IS the effective tier (actual or debug)
    actualTierFromDB,
    debugTierOverrideActive,
    isLoading: isSubscriptionLoading, // Renamed for clarity
  } = useSubscription();

  // --- IMPORTANT: Only render this component in development ---
  if (import.meta.env.MODE !== 'development') {
  // if (process.env.NODE_ENV !== 'development') { // Use this if not using Vite
    return null;
  }

  const handleTierChange = (value: string) => {
    if (value === "null" || value === "" || value === "actual") { // "actual" to represent clearing override
      setDebugTierOverride(null);
    } else {
      setDebugTierOverride(value as SubscriptionTier);
    }
  };

  // The value for the Select component should be the debug override if active, or a specific value indicating "actual"
  const selectValue = debugTierOverrideActive ? currentUserSubscriptionTier : "actual";

  return (
    <div className="fixed bottom-4 right-4 bg-slate-800 p-3 rounded-lg shadow-2xl z-[100] border border-yellow-500/50 text-xs text-slate-200 w-64">
      <Label htmlFor="debug-tier-select" className="block text-xs font-semibold text-yellow-400 mb-2 text-center">
        DEBUG TIER CONTROL
      </Label>
      <div className="space-y-2">
        <Select
          value={selectValue}
          onValueChange={handleTierChange}
          disabled={isSubscriptionLoading}
        >
          <SelectTrigger id="debug-tier-select" className="w-full bg-slate-700 border-slate-600 text-slate-100 h-8 text-xs">
            <SelectValue placeholder="Select Tier to Simulate" />
          </SelectTrigger>
          <SelectContent className="bg-slate-700 border-slate-600 text-slate-100">
            <SelectItem value="actual" className="text-slate-400 focus:bg-slate-600 text-xs">
              Use Actual Tier ({actualTierFromDB})
            </SelectItem>
            {(['free', 'pro', 'premium'] as SubscriptionTier[]).map((tierOption) => (
              <SelectItem key={tierOption} value={tierOption} className="focus:bg-slate-600 text-xs">
                Simulate: {tierOption.charAt(0).toUpperCase() + tierOption.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {debugTierOverrideActive && (
          <Button
            variant="outline"
            size="xs" // Assuming you have or can create an "xs" size
            onClick={() => setDebugTierOverride(null)}
            className="w-full text-yellow-400 border-yellow-500/70 hover:bg-yellow-500/10 h-8 text-xs"
          >
            Clear Override (Use Actual)
          </Button>
        )}
      </div>
      
      {isSubscriptionLoading && <p className="text-xs text-slate-400 mt-2 animate-pulse">Subscription loading...</p>}
      
      <div className="mt-2 pt-2 border-t border-slate-700 space-y-1">
        <p className="flex justify-between">
          <span>Effective Tier:</span>
          <span className="font-semibold text-white capitalize">{currentUserSubscriptionTier}</span>
        </p>
        <p className="flex justify-between text-slate-400">
          <span>Actual DB Tier:</span>
          <span className="font-semibold text-slate-300 capitalize">{actualTierFromDB}</span>
        </p>
        <p className="flex justify-between text-yellow-400">
          <span>Override Active:</span>
          <span className="font-semibold">{debugTierOverrideActive ? 'Yes' : 'No'}</span>
        </p>
      </div>
    </div>
  );
}