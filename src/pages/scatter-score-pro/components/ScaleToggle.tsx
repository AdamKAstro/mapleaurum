// src/pages/scatter-score-pro/components/ScaleToggle.tsx
import React from 'react';
import { cn } from '../../../lib/utils'; // Ensure this path is correct

interface ScaleToggleProps {
  scale: 'linear' | 'log';
  onChange: (newScale: 'linear' | 'log') => void;
  label: string;
}

export const ScaleToggle: React.FC<ScaleToggleProps> = ({ scale, onChange, label }) => (
  <div className="flex items-center justify-between gap-2 text-sm font-medium">
    <span className="text-surface-white/80 font-medium">{label}</span>
    <div className="flex bg-navy-900/50 rounded-lg p-1 border border-navy-600/70">
      <button
        type="button"
        className={cn(
          "px-4 py-1 text-xs font-semibold rounded-md transition-all duration-200 outline-none",
          "focus-visible:ring-2 focus-visible:ring-accent-teal focus-visible:ring-offset-2 focus-visible:ring-offset-navy-800",
          scale === 'linear' 
            ? "bg-accent-teal/20 text-accent-teal shadow-inner shadow-black/20" 
            : "text-surface-white/60 hover:bg-navy-700/50 hover:text-surface-white"
        )}
        onClick={() => onChange('linear')}
        aria-pressed={scale === 'linear'}
      >
        Linear
      </button>
      <button
        type="button"
        className={cn(
          "px-4 py-1 text-xs font-semibold rounded-md transition-all duration-200 outline-none",
          "focus-visible:ring-2 focus-visible:ring-accent-teal focus-visible:ring-offset-2 focus-visible:ring-offset-navy-800",
          scale === 'log' 
            ? "bg-accent-teal/20 text-accent-teal shadow-inner shadow-black/20" 
            : "text-surface-white/60 hover:bg-navy-700/50 hover:text-surface-white"
        )}
        onClick={() => onChange('log')}
        aria-pressed={scale === 'log'}
      >
        Log
      </button>
    </div>
  </div>
);