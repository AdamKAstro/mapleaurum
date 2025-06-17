// src/components/company-selection-bar.tsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './ui/button';
import { 
  Check, 
  X, 
  Eye, 
  EyeOff, 
  ChevronDown, 
  RefreshCw, 
  Download,
  Sparkles
} from 'lucide-react';
import { cn } from '../lib/utils';
import type { CompanyStatus } from '../lib/types';

interface CompanySelectionBarProps {
  totalCount: number;
  selectedCount: number;
  showDeselected: boolean;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onToggleShowDeselected: () => void;
  onSelectByStatus?: (statuses: CompanyStatus[]) => void;
  onInvertSelection?: () => void;
  onExportSelected?: () => void;
}

const STATUS_OPTIONS: { value: CompanyStatus; label: string; color: string }[] = [
  { value: 'producer', label: 'Producers', color: 'from-emerald-400 to-emerald-500' },
  { value: 'developer', label: 'Developers', color: 'from-blue-400 to-blue-500' },
  { value: 'explorer', label: 'Explorers', color: 'from-purple-400 to-purple-500' },
  { value: 'royalty', label: 'Royalty', color: 'from-amber-400 to-amber-500' },
];

export function CompanySelectionBar({
  totalCount,
  selectedCount,
  showDeselected,
  onSelectAll,
  onDeselectAll,
  onToggleShowDeselected,
  onSelectByStatus,
  onInvertSelection,
  onExportSelected,
}: CompanySelectionBarProps) {
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState<string | null>(null);
  
  const selectionPercentage = totalCount > 0 ? (selectedCount / totalCount) * 100 : 0;
  const allSelected = selectedCount === totalCount && totalCount > 0;
  const noneSelected = selectedCount === 0;

  // Auto-hide confirmation messages
  useEffect(() => {
    if (showConfirmation) {
      const timer = setTimeout(() => setShowConfirmation(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [showConfirmation]);

  const handleSelectAll = () => {
    onSelectAll();
    setShowConfirmation('All companies selected!');
  };

  const handleDeselectAll = () => {
    onDeselectAll();
    setShowConfirmation('Selection cleared!');
  };

  const handleSelectByStatus = (status: CompanyStatus) => {
    if (onSelectByStatus) {
      onSelectByStatus([status]);
      setShowConfirmation(`Selected all ${STATUS_OPTIONS.find(s => s.value === status)?.label}!`);
    }
    setShowStatusDropdown(false);
  };

  const handleInvertSelection = () => {
    if (onInvertSelection) {
      onInvertSelection();
      setShowConfirmation('Selection inverted!');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="relative"
    >
      <div className="flex items-center justify-between gap-4 bg-gradient-to-r from-navy-400/20 via-navy-500/20 to-navy-400/20 backdrop-blur-md p-4 rounded-xl shadow-lg border border-navy-300/20">
        {/* Left Section: Selection Info & Progress */}
        <div className="flex items-center gap-6">
          {/* Selection Counter with Progress Ring */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <svg className="w-12 h-12 -rotate-90">
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                  className="text-white/10"
                />
                <motion.circle
                  cx="24"
                  cy="24"
                  r="20"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 20}`}
                  strokeDashoffset={`${2 * Math.PI * 20 * (1 - selectionPercentage / 100)}`}
                  className="text-teal-400"
                  initial={{ strokeDashoffset: 2 * Math.PI * 20 }}
                  animate={{ strokeDashoffset: 2 * Math.PI * 20 * (1 - selectionPercentage / 100) }}
                  transition={{ duration: 0.5, ease: 'easeInOut' }}
                />
              </svg>
              <motion.div 
                className="absolute inset-0 flex items-center justify-center"
                key={selectionPercentage}
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <span className="text-xs font-bold text-white">
                  {Math.round(selectionPercentage)}%
                </span>
              </motion.div>
            </div>
            
            <div className="flex flex-col">
              <motion.span 
                className="text-lg font-semibold text-white"
                key={selectedCount}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <span className="text-teal-400">{selectedCount.toLocaleString()}</span> of {totalCount.toLocaleString()} selected
              </motion.span>
              <span className="text-xs text-gray-400">companies in dataset</span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={handleSelectAll}
              disabled={allSelected}
              aria-label="Select all companies"
              className={cn(
                "group relative overflow-hidden",
                allSelected && "opacity-50"
              )}
            >
              <Check className="w-4 h-4 mr-2" />
              Select All
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-teal-400/20 to-teal-500/20"
                initial={{ x: '-100%' }}
                whileHover={{ x: 0 }}
                transition={{ duration: 0.3 }}
              />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleDeselectAll}
              disabled={noneSelected}
              aria-label="Deselect all companies"
              className={cn(
                "group",
                noneSelected && "opacity-50"
              )}
            >
              <X className="w-4 h-4 mr-2" />
              Clear
            </Button>

            {onInvertSelection && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleInvertSelection}
                aria-label="Invert selection"
                className="group"
              >
                <RefreshCw className="w-4 h-4 mr-2 group-hover:rotate-180 transition-transform duration-300" />
                Invert
              </Button>
            )}
          </div>
        </div>

        {/* Right Section: Advanced Controls */}
        <div className="flex items-center gap-3">
          {/* Select by Status Dropdown */}
          {onSelectByStatus && (
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                aria-label="Select by status"
                className="group"
              >
                <Sparkles className="w-4 h-4 mr-2 text-amber-400" />
                Select by Status
                <ChevronDown className={cn(
                  "w-4 h-4 ml-2 transition-transform duration-200",
                  showStatusDropdown && "rotate-180"
                )} />
              </Button>

              <AnimatePresence>
                {showStatusDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full right-0 mt-2 w-48 bg-navy-800/95 backdrop-blur-md rounded-lg shadow-xl border border-navy-600/50 overflow-hidden z-50"
                  >
                    {STATUS_OPTIONS.map((status) => (
                      <button
                        key={status.value}
                        onClick={() => handleSelectByStatus(status.value)}
                        className="w-full px-4 py-3 text-left text-sm hover:bg-white/10 transition-colors duration-150 flex items-center gap-2 group"
                      >
                        <div className={cn(
                          "w-2 h-2 rounded-full bg-gradient-to-r",
                          status.color
                        )} />
                        <span className="text-gray-200 group-hover:text-white">
                          {status.label}
                        </span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Export Selected */}
          {onExportSelected && (
            <Button
              variant="outline"
              size="sm"
              onClick={onExportSelected}
              disabled={noneSelected}
              aria-label={`Export ${selectedCount} selected companies`}
              className={cn(
                "group",
                noneSelected && "opacity-50"
              )}
            >
              <Download className="w-4 h-4 mr-2" />
              Export ({selectedCount})
            </Button>
          )}

          {/* Visibility Toggle */}
          <Button
            variant={showDeselected ? 'secondary' : 'outline'}
            size="sm"
            onClick={onToggleShowDeselected}
            aria-label={showDeselected ? "Hide deselected companies" : "Show deselected companies"}
            className="group"
          >
            {showDeselected ? (
              <>
                <Eye className="w-4 h-4 mr-2" />
                Showing Deselected
              </>
            ) : (
              <>
                <EyeOff className="w-4 h-4 mr-2" />
                Hiding Deselected
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Confirmation Messages */}
      <AnimatePresence>
        {showConfirmation && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-4 py-2 bg-teal-500/20 backdrop-blur-md rounded-lg border border-teal-400/30 text-teal-300 text-sm font-medium shadow-lg z-50"
          >
            <Check className="w-4 h-4 inline mr-2" />
            {showConfirmation}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}