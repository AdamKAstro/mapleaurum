// src/components/import-favorites-modal.tsx
import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, FileText, AlertCircle, CheckCircle, Info, RefreshCw } from 'lucide-react'; // Added RefreshCw
import { Button } from './ui/button';
import { cn } from '../lib/utils';

interface ImportFavoritesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (companyIds: number[]) => Promise<{ imported: number[]; invalid: number[]; existing: number[] }>;
  currentSelectedCount: number;
}

interface ParseResult {
  valid: number[];
  invalid: Array<{ row: number; value: string; reason: string }>;
  duplicates: number[];
}

const MAX_FILE_SIZE = 1024 * 1024; // 1MB
const MAX_IMPORT_COUNT = 500;

export function ImportFavoritesModal({
  isOpen,
  onClose,
  onImport,
  currentSelectedCount,
}: ImportFavoritesModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [importResult, setImportResult] = useState<{
    imported: number;
    alreadySelected: number;
    invalid: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setFile(null);
    setParseResult(null);
    setImportResult(null);
    setError(null);
    setParsing(false);
    setImporting(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const parseCSV = (text: string): ParseResult => {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const result: ParseResult = {
      valid: [],
      invalid: [],
      duplicates: [],
    };

    // Check if first line is header
    let startIndex = 0;
    if (lines.length > 0) {
      const firstLine = lines[0].toLowerCase();
      if (firstLine.includes('company') || firstLine.includes('id')) {
        startIndex = 1; // Skip header
      }
    }

    const seenIds = new Set<number>();

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];
      const rowNumber = i + 1;

      // Parse CSV line (handle quoted values)
      const values = line.match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g) || [];
      if (values.length === 0) continue;

      // Get first value (company ID)
      const idValue = values[0].replace(/^"|"$/g, '').trim();

      // Validate ID
      if (!idValue) {
        result.invalid.push({
          row: rowNumber,
          value: line,
          reason: 'Empty company ID',
        });
        continue;
      }

      const companyId = parseInt(idValue, 10);

      if (isNaN(companyId)) {
        result.invalid.push({
          row: rowNumber,
          value: idValue,
          reason: 'Invalid number format',
        });
        continue;
      }

      if (companyId <= 0) {
        result.invalid.push({
          row: rowNumber,
          value: idValue,
          reason: 'Company ID must be positive',
        });
        continue;
      }

      if (companyId > 999999) {
        result.invalid.push({
          row: rowNumber,
          value: idValue,
          reason: 'Company ID too large',
        });
        continue;
      }

      // Check for duplicates in file
      if (seenIds.has(companyId)) {
        result.duplicates.push(companyId);
      } else {
        seenIds.add(companyId);
        result.valid.push(companyId);
      }
    }

    // Enforce maximum import limit
    if (result.valid.length > MAX_IMPORT_COUNT) {
      const removed = result.valid.splice(MAX_IMPORT_COUNT);
      removed.forEach((id, index) => {
        result.invalid.push({
          row: MAX_IMPORT_COUNT + index + startIndex + 1,
          value: id.toString(),
          reason: `Exceeds maximum import limit of ${MAX_IMPORT_COUNT}`,
        });
      });
    }

    return result;
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setError(null);
    setParseResult(null);
    setImportResult(null);

    // Validate file type
    if (!selectedFile.name.toLowerCase().endsWith('.csv')) {
      setError('Please select a CSV file');
      return;
    }

    // Validate file size
    if (selectedFile.size > MAX_FILE_SIZE) {
      setError('File size must be less than 1MB');
      return;
    }

    setFile(selectedFile);
    setParsing(true);

    try {
      const text = await selectedFile.text();
      const result = parseCSV(text);
      setParseResult(result);

      if (result.valid.length === 0) {
        setError('No valid company IDs found in the file');
      }
    } catch (err) {
      console.error('Error parsing CSV:', err);
      setError('Failed to read file. Please ensure it\'s a valid CSV file.');
    } finally {
      setParsing(false);
    }
  };

  const handleImport = async () => {
    if (!parseResult || parseResult.valid.length === 0) return;

    setImporting(true);
    setError(null);

    try {
      const result = await onImport(parseResult.valid);
      
      setImportResult({
        imported: result.imported.length,
        alreadySelected: result.existing.length,
        invalid: result.invalid.length,
      });

      // Auto-close after successful import (with delay for user to see result)
      if (result.imported.length > 0) {
        setTimeout(() => {
          handleClose();
        }, 2000);
      }
    } catch (err) {
      console.error('Error importing companies:', err);
      setError('Failed to import companies. Please try again.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
            onClick={handleClose}
          >
            <div
              className="bg-navy-800/50 backdrop-blur-md border border-navy-600/50 rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-6 border-b border-navy-600/50">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-200">Import Favorites from CSV</h2>
                  <button
                    onClick={handleClose}
                    className="p-2 rounded-lg hover:bg-navy-700/50 transition-colors"
                  >
                    <X className="h-5 w-5 text-gray-400" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                {/* Current status */}
                <div className="bg-navy-700/30 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-200">
                    Current favorites: <span className="text-cyan-400">{currentSelectedCount}</span> companies
                  </p>
                </div>

                {/* File input */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-200">
                    Select CSV file to import
                  </label>
                  <div className="relative">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="csv-upload"
                    />
                    <label
                      htmlFor="csv-upload"
                      className={cn(
                        "flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-lg cursor-pointer transition-all",
                        "hover:border-cyan-400/50 hover:bg-navy-700/30",
                        file ? "border-cyan-400/50 bg-navy-700/30" : "border-navy-600/50"
                      )}
                    >
                      {file ? (
                        <>
                          <FileText className="h-5 w-5 text-cyan-400" />
                          <span className="text-sm font-medium text-gray-200">{file.name}</span>
                        </>
                      ) : (
                        <>
                          <Upload className="h-5 w-5 text-gray-400" />
                          <span className="text-sm font-medium text-gray-400">
                            Click to upload or drag and drop
                          </span>
                        </>
                      )}
                    </label>
                  </div>
                  <p className="text-xs text-gray-400">
                    Maximum file size: 1MB • Maximum companies: {MAX_IMPORT_COUNT}
                  </p>
                </div>

                {/* Info box */}
                <div className="bg-blue-900/20 border border-blue-600/50 rounded-lg p-4">
                  <div className="flex gap-3">
                    <Info className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-blue-400">Expected CSV Format</p>
                      <p className="text-xs text-gray-300">
                        The CSV should contain company IDs in the first column. Headers are optional.
                        The file should match the format of exported favorites.
                      </p>
                      <pre className="text-xs text-gray-400 mt-2">
{`Company ID,Company Name,Status
123,"Example Mining Co",producer
456,"Another Company Ltd",explorer`}
                      </pre>
                    </div>
                  </div>
                </div>

                {/* Parse results */}
                {parsing && (
                  <div className="text-center py-4">
                    <div className="inline-flex items-center gap-2 text-sm text-gray-400">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </motion.div>
                      Parsing CSV file...
                    </div>
                  </div>
                )}

                {parseResult && !importing && !importResult && (
                  <div className="space-y-3">
                    <div className="bg-navy-700/30 rounded-lg p-4 space-y-2">
                      <h3 className="text-sm font-medium text-gray-200">Parse Results</h3>
                      
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-green-400" />
                          <span className="text-gray-300">
                            Valid company IDs: <span className="font-medium text-green-400">{parseResult.valid.length}</span>
                          </span>
                        </div>
                        
                        {parseResult.duplicates.length > 0 && (
                          <div className="flex items-center gap-2 text-sm">
                            <AlertCircle className="h-4 w-4 text-amber-400" />
                            <span className="text-gray-300">
                              Duplicate IDs removed: <span className="font-medium text-amber-400">{parseResult.duplicates.length}</span>
                            </span>
                          </div>
                        )}
                        
                        {parseResult.invalid.length > 0 && (
                          <div className="flex items-center gap-2 text-sm">
                            <X className="h-4 w-4 text-red-400" />
                            <span className="text-gray-300">
                              Invalid entries: <span className="font-medium text-red-400">{parseResult.invalid.length}</span>
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Show invalid entries details */}
                    {parseResult.invalid.length > 0 && (
                      <details className="bg-red-900/20 border border-red-600/50 rounded-lg p-4">
                        <summary className="cursor-pointer text-sm font-medium text-red-400">
                          View invalid entries ({parseResult.invalid.length})
                        </summary>
                        <div className="mt-3 space-y-1 max-h-32 overflow-y-auto">
                          {parseResult.invalid.slice(0, 10).map((item, index) => (
                            <div key={index} className="text-xs text-gray-300">
                              Row {item.row}: "{item.value}" - {item.reason}
                            </div>
                          ))}
                          {parseResult.invalid.length > 10 && (
                            <div className="text-xs text-gray-400 italic">
                              ...and {parseResult.invalid.length - 10} more
                            </div>
                          )}
                        </div>
                      </details>
                    )}
                  </div>
                )}

                {/* Import results */}
                {importResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-green-900/20 border border-green-600/50 rounded-lg p-4"
                  >
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-green-400">Import Complete!</p>
                        <div className="space-y-0.5 text-xs text-gray-300">
                          {importResult.imported > 0 && (
                            <p>✓ {importResult.imported} companies added to favorites</p>
                          )}
                          {importResult.alreadySelected > 0 && (
                            <p>• {importResult.alreadySelected} companies were already selected</p>
                          )}
                          {importResult.invalid > 0 && (
                            <p>✗ {importResult.invalid} invalid company IDs skipped</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Error display */}
                {error && (
                  <div className="bg-red-900/20 border border-red-600/50 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-red-400">Error</p>
                        <p className="text-xs text-gray-300 mt-1">{error}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-navy-600/50">
                <div className="flex justify-end gap-3">
                  <Button
                    onClick={handleClose}
                    variant="outline"
                    className="text-gray-200 border-navy-600/50 hover:bg-navy-700/50"
                  >
                    {importResult ? 'Close' : 'Cancel'}
                  </Button>
                  {parseResult && parseResult.valid.length > 0 && !importResult && (
                    <Button
                      onClick={handleImport}
                      disabled={importing}
                      className="bg-cyan-600 hover:bg-cyan-700 text-gray-200"
                    >
                      {importing ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Importing...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Import {parseResult.valid.length} Companies
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}