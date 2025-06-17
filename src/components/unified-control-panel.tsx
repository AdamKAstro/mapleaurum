// src/components/unified-control-panel.tsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Plus,
  X,
  CheckCircle2,
  XCircle,
  RefreshCcw,
  Eye,
  EyeOff,
  Download,
  Filter,
  Users,
  Sparkles
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from './ui/button'; // Ensure this is your updated Button component
import { StatusFilterButton } from './status-filter-button';
import type { CompanyStatus } from '../lib/types';
import debounce from 'lodash/debounce';

interface UnifiedControlPanelProps {
  // Status Filters
  availableStatuses: readonly CompanyStatus[];
  selectedStatuses: readonly CompanyStatus[];
  onStatusChange: (status: CompanyStatus) => void;

  // Selection State & Actions
  totalCount: number;
  selectedCount: number;
  showDeselected: boolean;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onInvertSelection: () => void;
  onToggleShowDeselected: () => void;
  onExportSelected: () => void;
  onSelectCompany: (companyId: number) => void;

  // Live Search Functionality
  onSearchCompanies: (query: string) => Promise<{ id: number; name: string; ticker: string }[]>;

  // General Actions
  onClearAllFilters: () => void;
  hasActiveFilters: boolean;
}

interface SearchResult {
  id: number;
  name: string;
  ticker: string;
}

interface CompanySearchInputProps {
  onSearchCompanies: (query: string) => Promise<{ id: number; name: string; ticker: string }[]>;
  onSelectCompany: (companyId: number) => void;
  placeholder: string;
}

// CompanySearchInput Component (remains the same)
const CompanySearchInput: React.FC<CompanySearchInputProps> = ({
  onSearchCompanies,
  onSelectCompany,
  placeholder,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const debouncedSearch = useRef(
    debounce(async (query: string) => {
      if (query.length < 2) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }
      setIsSearching(true);
      try {
        const results = await onSearchCompanies(query);
        setSearchResults(results);
      } catch (error) {
        console.error('[CompanySearchInput] Search error:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300)
  ).current;

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    setSelectedIndex(-1);
    debouncedSearch(value);
  }, [debouncedSearch]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!searchResults.length) return;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => prev < searchResults.length - 1 ? prev + 1 : 0);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : searchResults.length - 1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && searchResults[selectedIndex]) {
          onSelectCompany(searchResults[selectedIndex].id);
          setSearchTerm('');
          setSearchResults([]);
          setIsSearching(false);
        }
        break;
      case 'Escape':
        setSearchTerm('');
        setSearchResults([]);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  }, [searchResults, selectedIndex, onSelectCompany]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        resultsRef.current && !resultsRef.current.contains(e.target as Node) &&
        inputRef.current && !inputRef.current.contains(e.target as Node)
      ) {
        setSearchResults([]);
        setSelectedIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative">
      <div className={cn(
        "relative transition-all duration-200",
        isFocused && "ring-2 ring-emerald-400 ring-offset-2 ring-offset-navy-400 rounded-lg"
      )}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-white/60" />
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={handleSearchChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-2 bg-navy-600/50 border border-navy-300/20 rounded-lg text-sm text-surface-white placeholder-surface-white/60 focus:outline-none focus:border-emerald-400 transition-colors"
        />
        {isSearching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <RefreshCcw className="h-4 w-4 text-emerald-400 animate-spin" />
          </div>
        )}
        {searchTerm && !isSearching && (
          <button
            onClick={() => {
              setSearchTerm('');
              setSearchResults([]);
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-white/60 hover:text-surface-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <AnimatePresence>
        {searchResults.length > 0 && (
          <motion.div
            ref={resultsRef}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-2 bg-navy-600/95 backdrop-blur-sm border border-navy-300/20 rounded-lg shadow-lg overflow-hidden z-50"
          >
            <div className="max-h-64 overflow-y-auto">
              {searchResults.map((company) => (
                <button
                  key={company.id}
                  onClick={() => {
                    console.log('[CompanySearchInput] Clicked company:', company);
                    onSelectCompany(company.id);
                    setSearchTerm('');
                    setSearchResults([]);
                    setIsSearching(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-navy-600/50 rounded transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-surface-white font-medium">{company.name}</span>
                      {company.ticker && (
                        <span className="text-surface-white/60 text-sm ml-2">({company.ticker})</span>
                      )}
                    </div>
                    <Plus className="h-4 w-4 text-emerald-400" />
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// CompanySelectionBar Component
const CompanySelectionBar: React.FC<{
  totalCount: number;
  selectedCount: number;
  showDeselected: boolean;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onToggleShowDeselected: () => void;
  onInvertSelection: () => void;
  onExportSelected: () => void;
}> = ({
  totalCount,
  selectedCount,
  showDeselected,
  onSelectAll,
  onDeselectAll,
  onToggleShowDeselected,
  onInvertSelection,
  onExportSelected,
}) => {
  const selectionPercentage = totalCount > 0 ? (selectedCount / totalCount) * 100 : 0;

  return (
    <div className="space-y-2">
      <div className="text-xs text-surface-white/60">
        <span className="font-medium text-emerald-400">{selectedCount.toLocaleString()}</span>
        <span> / {totalCount.toLocaleString()} selected </span>
        <span>({selectionPercentage.toFixed(1)}%)</span>
      </div>
      <div className="flex flex-wrap gap-1.5"> {/* Smaller gap for smaller buttons */}
        <Button
          onClick={onSelectAll}
          variant="outline"
          size="icon-sm" // Use new icon-sm size
          tooltipContent="Select All Companies" // Tooltip content
          className="text-emerald-400 border-emerald-400/50 hover:bg-emerald-400/10"
        >
          <CheckCircle2 className="h-4 w-4" /> {/* Icon size adjusted */}
        </Button>
        <Button
          onClick={onDeselectAll}
          variant="outline"
          size="icon-sm" // Use new icon-sm size
          tooltipContent="Deselect All Companies" // Tooltip content
          className="text-red-400 border-red-400/50 hover:bg-red-400/10"
        >
          <XCircle className="h-4 w-4" /> {/* Icon size adjusted */}
        </Button>
        <Button
          onClick={onInvertSelection}
          variant="outline"
          size="icon-sm" // Use new icon-sm size
          tooltipContent="Invert Selection" // Tooltip content
          className="text-blue-400 border-blue-400/50 hover:bg-blue-400/10"
        >
          <RefreshCcw className="h-4 w-4" /> {/* Icon size adjusted */}
        </Button>
        <Button
          onClick={onToggleShowDeselected}
          variant="outline"
          size="icon-sm" // Use new icon-sm size
          tooltipContent={showDeselected ? "Hide Deselected Companies" : "Show Deselected Companies"} // Tooltip content
          className="text-surface-white/80 border-navy-300/20 hover:bg-navy-600/50"
        >
          {showDeselected ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />} {/* Icon size adjusted */}
        </Button>
        <Button
          onClick={onExportSelected}
          disabled={selectedCount === 0}
          variant="outline"
          size="icon-sm" // Use new icon-sm size
          tooltipContent="Export Selected Companies to CSV" // Tooltip content
          className="text-emerald-400 border-emerald-400/50 hover:bg-emerald-400/10 disabled:opacity-50"
        >
          <Download className="h-4 w-4" /> {/* Icon size adjusted */}
        </Button>
      </div>
    </div>
  );
};

// Toast Notification Component (remains the same)
const Toast = ({ message, type, onClose }: { message: string; type: 'success' | 'info'; onClose: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      className={cn(
        "fixed top-4 right-4 z-50 px-4 py-2.5 rounded-lg shadow-lg backdrop-blur-sm flex items-center gap-2",
        type === 'success' ? "bg-emerald-500/90 text-white" : "bg-blue-500/90 text-white"
      )}
    >
      {type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
      <span className="text-sm font-medium">{message}</span>
    </motion.div>
  );
};

export function UnifiedControlPanel({
  availableStatuses,
  selectedStatuses,
  onStatusChange,
  totalCount,
  selectedCount,
  showDeselected,
  onSelectAll,
  onDeselectAll,
  onInvertSelection,
  onToggleShowDeselected,
  onExportSelected,
  onSelectCompany,
  onSearchCompanies,
  onClearAllFilters,
  hasActiveFilters,
}: UnifiedControlPanelProps) {
  const [toastMessage, setToastMessage] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  // Handle bulk actions with toast notifications
  const handleSelectAll = useCallback(() => {
    onSelectAll();
    setToastMessage({ message: 'All companies selected', type: 'success' });
  }, [onSelectAll]);

  const handleDeselectAll = useCallback(() => {
    onDeselectAll();
    setToastMessage({ message: 'All companies deselected', type: 'info' });
  }, [onDeselectAll]);

  const handleInvertSelection = useCallback(() => {
    onInvertSelection();
    setToastMessage({ message: 'Selection inverted', type: 'success' });
  }, [onInvertSelection]);

  return (
    <>
      <AnimatePresence>
        {toastMessage && (
          <Toast
            message={toastMessage.message}
            type={toastMessage.type}
            onClose={() => setToastMessage(null)}
          />
        )}
      </AnimatePresence>

      <div className="bg-navy-400/20 backdrop-blur-sm rounded-xl shadow-lg border border-navy-300/20 p-4">
        {/* Adjusted to flexbox for better alignment and control over spacing */}
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-6">
          {/* Dataset Filters Section */}
          <div className="flex-1 space-y-4">
            <h3 className="text-sm font-semibold text-surface-white/80 uppercase tracking-wider">
              Dataset Filters
            </h3>
            <div>
              <p className="text-xs text-surface-white/60 mb-2">Filter by company status</p>
              <div className="flex flex-wrap gap-2">
                {availableStatuses.map((status) => (
                  <StatusFilterButton
                    key={status}
                    status={status}
                    isSelected={selectedStatuses.includes(status)}
                    onChange={() => onStatusChange(status)}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Company Search Section */}
          <div className="flex-1 space-y-4">
            <h3 className="text-sm font-semibold text-surface-white/80 uppercase tracking-wider">
              Company Search
            </h3>
            <CompanySearchInput
              onSearchCompanies={onSearchCompanies}
              onSelectCompany={(companyId) => {
                console.log('[UnifiedControlPanel] Company selected from search:', companyId);
                onSelectCompany(companyId);
              }}
              placeholder="Search and add companies..."
            />
          </div>

          {/* Selection Tools Section */}
          <div className="flex-1 space-y-4">
            <h3 className="text-sm font-semibold text-surface-white/80 uppercase tracking-wider">
              Selection Tools
            </h3>
            <CompanySelectionBar
              totalCount={totalCount}
              selectedCount={selectedCount}
              showDeselected={showDeselected}
              onSelectAll={handleSelectAll}
              onDeselectAll={handleDeselectAll}
              onToggleShowDeselected={onToggleShowDeselected}
              onInvertSelection={handleInvertSelection}
              onExportSelected={onExportSelected}
            />
          </div>
        </div>

        {/* Clear Filters Button - spans full width */}
        {hasActiveFilters && (
          <div className="mt-4 pt-4 border-t border-navy-300/20">
            <Button
              onClick={onClearAllFilters}
              variant="ghost"
              size="sm"
              className="text-amber-400 hover:text-amber-300 hover:bg-amber-400/10"
            >
              <X className="h-3 w-3 mr-1" />
              Clear All Filters
            </Button>
          </div>
        )}
      </div>
    </>
  );
}