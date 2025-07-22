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
  FileUp,
  Sparkles,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from './ui/button';
import { StatusFilterButton } from './status-filter-button';
import type { CompanyStatus } from '../lib/types';
import debounce from 'lodash/debounce';
import { STYLE_CONFIG } from './style-config';

// Interfaces
interface UnifiedControlPanelProps {
  availableStatuses: readonly CompanyStatus[];
  selectedStatuses: readonly CompanyStatus[];
  onStatusChange: (status: CompanyStatus) => void;
  totalCount: number;
  selectedCount: number;
  showDeselected: boolean;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onInvertSelection: () => void;
  onToggleShowDeselected: () => void;
  onExportSelected: () => void;
  onImportFavorites?: () => void;
  onSelectCompany: (companyId: number) => void;
  onSearchCompanies: (query: string) => Promise<{ id: number; name: string; ticker: string }[]>;
  onClearAllFilters: () => void;
  hasActiveFilters: boolean;
  onSearchTermChange?: (term: string) => void;
  setMetricRange?: (db_column: string, min: number | null, max: number | null) => void;
  isLoading?: boolean;
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

// CompanySearchInput Component
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

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setSearchTerm(value);
      setSelectedIndex(-1);
      debouncedSearch(value);
    },
    [debouncedSearch]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!searchResults.length) return;
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => (prev < searchResults.length - 1 ? prev + 1 : 0));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : searchResults.length - 1));
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
    },
    [searchResults, selectedIndex, onSelectCompany]
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        resultsRef.current &&
        !resultsRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setSearchResults([]);
        setSelectedIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const styles = STYLE_CONFIG.companySearchInput;

  return (
    <div className="relative">
      <div className={cn('relative transition-all duration-200', isFocused && styles.container)}>
        <Search
          className={cn(
            'absolute left-3 top-1/2 -translate-y-1/2',
            styles.iconSize,
            STYLE_CONFIG.variant === 'HighContrast' ? 'text-cyan-400' : 'text-gray-400'
          )}
        />
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={handleSearchChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          className={styles.input}
        />
        {isSearching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <RefreshCcw className={cn(styles.iconSize, 'text-cyan-400 animate-spin')} />
          </div>
        )}
        {searchTerm && !isSearching && (
          <button
            onClick={() => {
              setSearchTerm('');
              setSearchResults([]);
              inputRef.current?.focus();
            }}
            className={cn(
              'absolute right-3 top-1/2 -translate-y-1/2 transition-colors',
              STYLE_CONFIG.variant === 'HighContrast'
                ? 'text-cyan-400 hover:text-cyan-200'
                : 'text-gray-400 hover:text-gray-200'
            )}
          >
            <X className={styles.iconSize} />
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
            className={styles.resultsContainer}
          >
            <div className={styles.maxHeight + ' overflow-y-auto'}>
              {searchResults.map((company, index) => (
                <button
                  key={company.id}
                  onClick={() => {
                    console.log('[CompanySearchInput] Clicked company:', company);
                    onSelectCompany(company.id);
                    setSearchTerm('');
                    setSearchResults([]);
                    setIsSearching(false);
                  }}
                  className={cn(styles.resultItem, index === selectedIndex && 'bg-navy-600/50')}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className={cn('text-gray-200 font-medium', styles.textSize)}>
                        {company.name}
                      </span>
                      {company.ticker && (
                        <span className={cn('text-gray-400 ml-2', styles.textSize)}>
                          ({company.ticker})
                        </span>
                      )}
                    </div>
                    <Plus className={cn(styles.iconSize, 'text-cyan-400')} />
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
  onInvertSelection: () => void;
  onToggleShowDeselected: () => void;
  onExportSelected: () => void;
  onImportFavorites?: () => void;
}> = ({
  totalCount,
  selectedCount,
  showDeselected,
  onSelectAll,
  onDeselectAll,
  onInvertSelection,
  onToggleShowDeselected,
  onExportSelected,
  onImportFavorites,
}) => {
  const selectionPercentage = totalCount > 0 ? (selectedCount / totalCount) * 100 : 0;
  const styles = STYLE_CONFIG.companySelectionBar;

  return (
    <div className="space-y-2">
      <div className={styles.text}>
        <span className="font-medium text-cyan-400">{selectedCount.toLocaleString()}</span>
        <span> / {totalCount.toLocaleString()} favorited </span>
        <span>({selectionPercentage.toFixed(1)}%)</span>
      </div>
      <div className={cn('flex flex-wrap', styles.gap)}>
        <Button
          onClick={onSelectAll}
          variant="outline"
          size="icon-sm"
          tooltipContent="Add All to Favorites"
          className={cn(
            'text-cyan-400 border-cyan-400/50 hover:bg-cyan-400/10',
            styles.buttonSize
          )}
        >
          <CheckCircle2 className={styles.iconSize} />
        </Button>
        <Button
          onClick={onDeselectAll}
          variant="outline"
          size="icon-sm"
          tooltipContent="Remove All from Favorites"
          className={cn('text-red-400 border-red-400/50 hover:bg-red-400/10', styles.buttonSize)}
        >
          <XCircle className={styles.iconSize} />
        </Button>
        <Button
          onClick={onInvertSelection}
          variant="outline"
          size="icon-sm"
          tooltipContent="Invert Favorites"
          className={cn('text-blue-400 border-blue-400/50 hover:bg-blue-400/10', styles.buttonSize)}
        >
          <RefreshCcw className={styles.iconSize} />
        </Button>
        <Button
          onClick={onToggleShowDeselected}
          variant="outline"
          size="icon-sm"
          tooltipContent={showDeselected ? 'Hide Deselected Companies' : 'Show Deselected Companies'}
          className={cn(
            'text-gray-200',
            STYLE_CONFIG.variant === 'Opaque' || STYLE_CONFIG.variant === 'HighContrast'
              ? 'border-navy-600/50 hover:bg-navy-700/50'
              : 'border-navy-300/20 hover:bg-navy-600/50',
            styles.buttonSize
          )}
        >
          {showDeselected ? (
            <EyeOff className={styles.iconSize} />
          ) : (
            <Eye className={styles.iconSize} />
          )}
        </Button>
			
        {onImportFavorites && (
          <Button
            onClick={onImportFavorites}
            variant="outline"
            size="icon-sm"
            tooltipContent="Import Favorites from CSV"
            className={cn(
              'text-cyan-400 border-cyan-400/50 hover:bg-cyan-400/10',
              styles.buttonSize
            )}
          >
            <FileUp className={styles.iconSize} />
        </Button>
        )}
			
        <Button
          onClick={onExportSelected}
          disabled={selectedCount === 0}
          variant="outline"
          size="icon-sm"
          tooltipContent="Export Favorites to CSV"
          className={cn(
            'text-cyan-400 border-cyan-400/50 hover:bg-cyan-400/10 disabled:opacity-50',
            styles.buttonSize
          )}
        >
          <Download className={styles.iconSize} />
        </Button>
      </div>
    </div>
  );
};

// Toast Component
const Toast = ({ message, type, onClose }: { message: string; type: 'success' | 'info'; onClose: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const styles = STYLE_CONFIG.toast;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      className={cn(
        styles.container,
        type === 'success' ? 'bg-emerald-500/90 text-gray-200' : 'bg-blue-500/90 text-gray-200',
        STYLE_CONFIG.variant === 'Opaque' && type === 'success' && 'text-emerald-200',
        STYLE_CONFIG.variant === 'Opaque' && type === 'info' && 'text-blue-400'
      )}
    >
      {type === 'success' ? (
        <CheckCircle2 className={styles.iconSize} />
      ) : (
        <Sparkles className={styles.iconSize} />
      )}
      <span className={styles.textSize}>{message}</span>
    </motion.div>
  );
};

// UnifiedControlPanel Component
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
  onImportFavorites,
  onSearchTermChange,
  setMetricRange,
  isLoading,
}: UnifiedControlPanelProps) {
  const [toastMessage, setToastMessage] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  const handleSelectAll = useCallback(() => {
    onSelectAll();
    setToastMessage({ message: 'All companies added to favorites', type: 'success' });
  }, [onSelectAll]);

  const handleDeselectAll = useCallback(() => {
    onDeselectAll();
    setToastMessage({ message: 'All companies removed from favorites', type: 'info' });
  }, [onDeselectAll]);

  const handleInvertSelection = useCallback(() => {
    onInvertSelection();
    setToastMessage({ message: 'Favorites inverted', type: 'success' });
  }, [onInvertSelection]);

  const styles = STYLE_CONFIG.unifiedControlPanel;

  return (
    <div>
      <AnimatePresence>
        {toastMessage && (
          <Toast
            message={toastMessage.message}
            type={toastMessage.type}
            onClose={() => setToastMessage(null)}
          />
        )}
      </AnimatePresence>
      <div className={styles.container}>
        <div className={cn('flex flex-col lg:flex-row lg:justify-between lg:items-start', styles.gap)}>
          <div className="flex-1 space-y-3">
            <h3 className={styles.header}>Dataset Filters</h3>
            <div>
              <p className={styles.filterText}>Filter by company status</p>
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
          <div className="flex-1 space-y-3">
            <h3 className={styles.header}>Company Search</h3>
            <CompanySearchInput
              onSearchCompanies={onSearchCompanies}
              onSelectCompany={(companyId) => {
                console.log('[UnifiedControlPanel] Company selected from search:', companyId);
                onSelectCompany(companyId);
              }}
              placeholder="Search and add companies..."
            />
          </div>
          <div className="flex-1 space-y-3">
            <h3 className={styles.header}>Favorites</h3>
            <CompanySelectionBar
              totalCount={totalCount}
              selectedCount={selectedCount}
              showDeselected={showDeselected}
              onSelectAll={handleSelectAll}
              onDeselectAll={handleDeselectAll}
              onToggleShowDeselected={onToggleShowDeselected}
              onInvertSelection={handleInvertSelection}
              onExportSelected={onExportSelected}
              onImportFavorites={onImportFavorites}
            />
          </div>
          {hasActiveFilters && (
            <div className="mt-3 pt-3 border-t border-cyan-400/50">
              <Button
                onClick={onClearAllFilters}
                variant="ghost"
                size="sm"
                className={styles.clearButton}
              >
                <X className={cn(styles.clearIconSize, 'mr-1')} />
                Clear All Filters
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}