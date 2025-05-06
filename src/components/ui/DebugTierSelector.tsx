// src/components/ui/DebugTierSelector.tsx (New File)
import React from 'react';
import { useSubscription } from '../../contexts/subscription-context';
import { Button } from './button'; // Assuming you have a Button component
import type { SubscriptionTier } from '../../lib/types';

export function DebugTierSelector() {
  const { setDebugTier, getEffectiveTier, isDebugActive, getActualTier } = useSubscription();

  // --- IMPORTANT: Only render this component in development ---
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  const currentEffectiveTier = getEffectiveTier();
  const currentActualTier = getActualTier();
  const debugActive = isDebugActive();

  const handleSetTier = (tier: SubscriptionTier | null) => {
    setDebugTier(tier);
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '10px',
        right: '10px',
        backgroundColor: 'rgba(0, 0, 50, 0.8)',
        padding: '10px',
        borderRadius: '8px',
        zIndex: 1000, // Ensure it's on top
        border: '1px solid rgba(100, 120, 200, 0.7)',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        fontSize: '12px',
        color: 'white',
        boxShadow: '0 4px 15px rgba(0,0,0,0.4)'
      }}
    >
      <h4 style={{ margin: 0, paddingBottom: '4px', borderBottom: '1px solid #445', textAlign: 'center', fontWeight: '600' }}>
        Debug Tier Control
      </h4>
      <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
        <Button
          size="sm"
          variant={currentEffectiveTier === 'free' && debugActive ? 'primary' : 'outline'}
          onClick={() => handleSetTier('free')}
          className={currentEffectiveTier === 'free' && debugActive ? 'ring-2 ring-offset-1 ring-cyan-400' : ''}
        >
          Force Free
        </Button>
        <Button
          size="sm"
           variant={currentEffectiveTier === 'medium' && debugActive ? 'primary' : 'outline'}
          onClick={() => handleSetTier('medium')}
           className={currentEffectiveTier === 'medium' && debugActive ? 'ring-2 ring-offset-1 ring-cyan-400' : ''}
        >
          Force Pro
        </Button>
        <Button
          size="sm"
          variant={currentEffectiveTier === 'premium' && debugActive ? 'primary' : 'outline'}
          onClick={() => handleSetTier('premium')}
           className={currentEffectiveTier === 'premium' && debugActive ? 'ring-2 ring-offset-1 ring-cyan-400' : ''}
        >
          Force Premium
        </Button>
      </div>
       <Button
          size="sm"
          variant={!debugActive ? 'secondary' : 'destructive'} // Use destructive or similar for clearing
          onClick={() => handleSetTier(null)}
          disabled={!debugActive} // Disable if not debugging
        >
           {debugActive ? 'Clear Override' : 'Using Real Tier'}
        </Button>
      <div style={{ marginTop: '5px', paddingTop: '5px', borderTop: '1px solid #445', textAlign: 'center', opacity: 0.8 }}>
        Effective: <b style={{ textTransform: 'capitalize'}}>{currentEffectiveTier}</b> <br/>
        (Actual: <span style={{ textTransform: 'capitalize'}}>{currentActualTier}</span>)
      </div>
    </div>
  );
}