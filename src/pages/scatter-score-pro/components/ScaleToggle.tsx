// src/pages/scatter-score-pro/components/ScaleToggle.tsx
import React from 'react';
import { cn } from '../../../lib/utils'; // Ensure this path is correct

interface ScaleToggleProps {
  scale: 'linear' | 'log';
  onChange: (newScale: 'linear' | 'log') => void;
  label: string;
}

export const ScaleToggle: React.FC<ScaleToggleProps> = ({ scale, onChange, label }) => (
  <div className="flex items-center gap-2 text-xs font-medium">
    <span className="text-surface-white/70">{label}:</span>
    <div className="flex bg-navy-400/20 rounded-lg overflow-hidden p-0.5 gap-0.5">
      <button
        type="button" // Explicit type for buttons
        className={cn(
          "px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 focus-visible:ring-2 focus-visible:ring-accent-teal focus-visible:ring-offset-2 focus-visible:ring-offset-navy-800", // Added focus styling
          scale === 'linear' 
            ? "bg-navy-400 text-surface-white shadow-lg shadow-navy-300/30 ring-1 ring-navy-300/30" 
            : "text-surface-white/70 hover:bg-navy-400/30"
        )}
        onClick={() => onChange('linear')}
        aria-pressed={scale === 'linear'}
      >
        Linear
      </button>
      <button
        type="button" // Explicit type for buttons
        className={cn(
          "px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 focus-visible:ring-2 focus-visible:ring-accent-teal focus-visible:ring-offset-2 focus-visible:ring-offset-navy-800", // Added focus styling
          scale === 'log' 
            ? "bg-navy-400 text-surface-white shadow-lg shadow-navy-300/30 ring-1 ring-navy-300/30" 
            : "text-surface-white/70 hover:bg-navy-400/30"
        )}
        onClick={() => onChange('log')}
        aria-pressed={scale === 'log'}
      >
        Log
      </button>
    </div>
  </div>
);