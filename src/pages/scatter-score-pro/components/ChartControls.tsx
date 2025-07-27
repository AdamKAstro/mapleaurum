// src/pages/scatter-score-pro/components/ChartControls.tsx
import React from 'react';
import { Button } from '../../../components/ui/button';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface ChartControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  canZoomIn?: boolean;
  canZoomOut?: boolean;
  className?: string;
}

export const ChartControls: React.FC<ChartControlsProps> = ({
  onZoomIn,
  onZoomOut,
  onResetZoom,
  canZoomIn = true,
  canZoomOut = true,
  className
}) => {
  return (
    <div 
      className={cn(
        // Positioning and layout
        "absolute top-4 right-4 z-10",
        "flex items-center",
        // Visual design with enhanced glassmorphism
        "bg-gradient-to-r from-navy-900/70 to-navy-800/70",
        "backdrop-blur-md backdrop-saturate-150",
        "rounded-xl border border-navy-500/30",
        "shadow-[0_8px_32px_rgba(0,0,0,0.3)]",
        // Subtle glow effect
        "before:absolute before:inset-0 before:rounded-xl",
        "before:bg-gradient-to-r before:from-blue-500/10 before:to-purple-500/10",
        "before:blur-xl before:-z-10",
        // Responsive adjustments
        "scale-90 sm:scale-100",
        className
      )}
      role="group"
      aria-label="Chart zoom controls"
    >
      {/* Zoom In Button */}
      <Button 
        variant="ghost" 
        size="icon-sm" 
        onClick={onZoomIn}
        disabled={!canZoomIn}
        title="Zoom In (Ctrl +)" 
        aria-label="Zoom in"
        className={cn(
          "group relative rounded-r-none",
          "hover:bg-white/10 active:bg-white/15",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "transition-all duration-200",
          "focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-0",
          // Touch target size
          "min-w-[44px] min-h-[44px] sm:min-w-[36px] sm:min-h-[36px]"
        )}
      >
        <ZoomIn className={cn(
          "h-4 w-4",
          "text-gray-300 group-hover:text-white group-active:scale-95",
          "group-disabled:text-gray-500",
          "transition-all duration-200"
        )} />
      </Button>

      {/* Vertical Divider */}
      <div className="w-px h-6 bg-gradient-to-b from-transparent via-navy-400/40 to-transparent" />

      {/* Zoom Out Button */}
      <Button 
        variant="ghost" 
        size="icon-sm" 
        onClick={onZoomOut}
        disabled={!canZoomOut}
        title="Zoom Out (Ctrl -)" 
        aria-label="Zoom out"
        className={cn(
          "group relative rounded-none",
          "hover:bg-white/10 active:bg-white/15",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "transition-all duration-200",
          "focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-0",
          "min-w-[44px] min-h-[44px] sm:min-w-[36px] sm:min-h-[36px]"
        )}
      >
        <ZoomOut className={cn(
          "h-4 w-4",
          "text-gray-300 group-hover:text-white group-active:scale-95",
          "group-disabled:text-gray-500",
          "transition-all duration-200"
        )} />
      </Button>

      {/* Vertical Divider */}
      <div className="w-px h-6 bg-gradient-to-b from-transparent via-navy-400/40 to-transparent" />

      {/* Reset Button */}
      <Button 
        variant="ghost" 
        size="icon-sm" 
        onClick={onResetZoom}
        title="Reset View (Ctrl 0)" 
        aria-label="Reset zoom"
        className={cn(
          "group relative rounded-l-none",
          "hover:bg-white/10 active:bg-white/15",
          "transition-all duration-200",
          "focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-0",
          "min-w-[44px] min-h-[44px] sm:min-w-[36px] sm:min-h-[36px]"
        )}
      >
        <RotateCcw className={cn(
          "h-4 w-4",
          "text-gray-300 group-hover:text-white group-active:scale-95",
          "transition-all duration-200"
        )} />
      </Button>

      {/* Keyboard shortcut hint (appears on hover) */}
      <div className={cn(
        "absolute -bottom-8 right-0",
        "px-2 py-1 rounded-md",
        "bg-navy-900/90 backdrop-blur-sm",
        "text-xs text-gray-400",
        "opacity-0 group-hover:opacity-100",
        "transition-opacity duration-300",
        "pointer-events-none",
        "hidden sm:block"
      )}>
        Use Ctrl +/- to zoom
      </div>
    </div>
  );
};