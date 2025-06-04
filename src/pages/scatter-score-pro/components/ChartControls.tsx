// src/pages/scatter-score-pro/components/ChartControls.tsx
import React from 'react';
import { Button } from '../../../components/ui/button'; // Path based on existing files
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface ChartControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  // Consider adding className for custom styling from parent if needed:
  // className?: string; 
}

export const ChartControls: React.FC<ChartControlsProps> = ({
  onZoomIn,
  onZoomOut,
  onResetZoom,
  // className
}) => {
  return (
    // The parent div might need 'className' prop for positioning if it's not always absolute top-3 right-3
    // For now, keeping the original positioning classes.
    <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
      <Button 
        variant="outline" 
        size="icon-sm" 
        onClick={onZoomIn} 
        title="Zoom In" 
        className="bg-navy-700/50 border-navy-600 hover:bg-navy-600"
      >
        <ZoomIn className="h-4 w-4" />
      </Button>
      <Button 
        variant="outline" 
        size="icon-sm" 
        onClick={onZoomOut} 
        title="Zoom Out" 
        className="bg-navy-700/50 border-navy-600 hover:bg-navy-600"
      >
        <ZoomOut className="h-4 w-4" />
      </Button>
      <Button 
        variant="outline" 
        size="icon-sm" 
        onClick={onResetZoom} 
        title="Reset Zoom" 
        className="bg-navy-700/50 border-navy-600 hover:bg-navy-600"
      >
        <RotateCcw className="h-4 w-4" />
      </Button>
    </div>
  );
};