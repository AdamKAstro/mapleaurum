// src/components/FilterDebugDisplay.tsx
import React from 'react';
import { useFilters } from '../contexts/filter-context'; // Adjust path if needed

export function FilterDebugDisplay() {
    const {
        // Core Data & State
        displayData,
        totalCount, // The estimate from backend
        filterSettings,
        sortState,
        currentPage,
        pageSize,
        // Status Indicators
        loading,
        dataLoading,
        rangeLoading,
        error,
        // Other Context Info (Optional to display)
        currentUserTier,
        currentCurrency,
        metricFullRanges,
    } = useFilters();

    const displayedCount = displayData?.length ?? 0;

    // Helper to format values that might be objects/arrays
    const formatValue = (value: any) => {
        if (typeof value === 'object' && value !== null) {
            return JSON.stringify(value, null, 2); // Pretty print objects/arrays
        }
        if (value === undefined || value === null || value === '') {
            return <span className="italic text-gray-500">{'<empty>'}</span>;
        }
        return String(value);
    };

    return (
        <div className="fixed bottom-4 left-4 z-50 max-w-md max-h-[60vh] overflow-auto bg-gray-900/90 backdrop-blur-sm border border-cyan-700 rounded-lg shadow-xl p-4 text-xs font-mono text-gray-200">
            <h3 className="text-base font-semibold text-cyan-400 mb-3 border-b border-cyan-800 pb-1">Filter Context State</h3>

            <div className="space-y-2">
                {/* Status */}
                <div><span className="font-semibold text-yellow-400">Loading State:</span> {loading ? 'TRUE' : 'FALSE'} (Data: {dataLoading ? 'T' : 'F'}, Range: {rangeLoading ? 'T' : 'F'})</div>
                <div><span className="font-semibold text-red-400">Error:</span> {formatValue(error)}</div>

                {/* Core Data Info */}
                 <div className="pt-2 mt-2 border-t border-gray-700"><span className="font-semibold text-green-400">Displayed Rows:</span> {formatValue(displayedCount)}</div>
                 <div><span className="font-semibold text-green-400">Total Count (est.):</span> {formatValue(totalCount)}</div>

                 {/* Settings */}
                 <div className="pt-2 mt-2 border-t border-gray-700"><span className="font-semibold text-blue-400">Current Page:</span> {formatValue(currentPage)}</div>
                 <div><span className="font-semibold text-blue-400">Page Size:</span> {formatValue(pageSize)}</div>
                 <div><span className="font-semibold text-purple-400">Sort State:</span> <pre className="inline-block bg-gray-800/50 p-1 rounded text-xs">{formatValue(sortState)}</pre></div>
                 <div><span className="font-semibold text-orange-400">Search Term:</span> '{formatValue(filterSettings.searchTerm)}'</div>
                 <div><span className="font-semibold text-orange-400">Dev Status Filter:</span> <pre className="inline-block bg-gray-800/50 p-1 rounded text-xs">{formatValue(filterSettings.developmentStatus)}</pre></div>
                 <details className="mt-1">
                    <summary className="cursor-pointer text-orange-400 font-semibold">Metric Range Filters ({Object.keys(filterSettings.metricRanges).length})</summary>
                    <pre className="mt-1 text-gray-300 text-[11px] bg-gray-800/50 p-2 rounded max-h-40 overflow-auto">{formatValue(filterSettings.metricRanges)}</pre>
                 </details>

                 {/* Optional Details */}
                 <details className="mt-2 pt-2 border-t border-gray-700">
                     <summary className="cursor-pointer text-gray-500 font-semibold">Other Context Info</summary>
                     <div className="mt-1 space-y-1 pl-2">
                         <div><span className="font-semibold">Tier:</span> {formatValue(currentUserTier)}</div>
                         <div><span className="font-semibold">Currency:</span> {formatValue(currentCurrency)}</div>
                         <div><span className="font-semibold">Full Ranges Loaded:</span> {Object.keys(metricFullRanges).length > 0 ? 'Yes' : 'No'} ({Object.keys(metricFullRanges).length} ranges)</div>
                         {/* Add displayData sample if needed, but can be large */}
                         {/* <div><span className="font-semibold">Display Data Sample:</span> <pre className="text-[10px] max-h-20 overflow-auto">{JSON.stringify(displayData.slice(0, 2), null, 1)}</pre></div> */}
                    </div>
                 </details>
            </div>
        </div>
    );
}