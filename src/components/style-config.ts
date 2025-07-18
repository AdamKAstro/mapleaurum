// src/components/style-config.ts
// src/components/style-config.ts
export type StyleVariant = 'Compact' | 'Spacious' | 'Opaque' | 'Minimalist' | 'HighContrast';

export interface StyleConfig {
  variant: StyleVariant;
  companySearchInput: {
    container: string;
    input: string;
    iconSize: string;
    resultsContainer: string;
    resultItem: string;
    maxHeight: string;
    textSize: string;
  };
  companySelectionBar: {
    text: string;
    buttonSize: string;
    iconSize: string;
    gap: string;
  };
  toast: {
    container: string;
    iconSize: string;
    textSize: string;
  };
  unifiedControlPanel: {
    container: string;
    header: string;
    gap: string;
    filterText: string;
    clearButton: string;
    clearIconSize: string;
  };
}

const variant: StyleVariant = 'Compact'; // Define variant separately

export const STYLE_CONFIG: StyleConfig = {
  variant,
  companySearchInput: {
    Compact: {
      container: 'ring-1 ring-cyan-400 ring-offset-1 ring-offset-navy-400 rounded-md',
      input: 'w-full pl-8 pr-8 py-1.5 bg-navy-600/50 border border-navy-300/20 rounded-md text-xs text-gray-200 placeholder-gray-400 focus:outline-none focus:border-cyan-400 transition-colors h-7',
      iconSize: 'h-3 w-3',
      resultsContainer: 'top-full left-0 right-0 mt-1 bg-navy-600/95 backdrop-blur-sm border border-navy-300/20 rounded-md shadow-md overflow-hidden z-50 max-h-48',
      resultItem: 'w-full text-left px-2 py-1 hover:bg-navy-600/50 rounded-sm transition-colors',
      maxHeight: 'max-h-48',
      textSize: 'text-xs',
    },
    Spacious: {
      container: 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-navy-400 rounded-2xl',
      input: 'w-full pl-12 pr-12 py-3 bg-navy-600/50 border border-navy-300/20 rounded-2xl text-base text-gray-200 placeholder-gray-400 focus:outline-none focus:border-cyan-400 transition-colors h-10',
      iconSize: 'h-5 w-5',
      resultsContainer: 'top-full left-0 right-0 mt-3 bg-navy-600/95 backdrop-blur-sm border border-navy-300/20 rounded-2xl shadow-xl overflow-hidden z-50 max-h-80',
      resultItem: 'w-full text-left px-4 py-3 hover:bg-navy-600/50 rounded-md transition-colors',
      maxHeight: 'max-h-80',
      textSize: 'text-base',
    },
    Opaque: {
      container: 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-navy-800 rounded-lg',
      input: 'w-full pl-10 pr-10 py-2 bg-navy-800 border border-navy-600/50 rounded-lg text-sm text-gray-200 placeholder-gray-400 focus:outline-none focus:border-cyan-400 transition-colors h-9',
      iconSize: 'h-4 w-4',
      resultsContainer: 'top-full left-0 right-0 mt-2 bg-navy-800 border border-navy-600/50 rounded-lg shadow-lg overflow-hidden z-50 max-h-64',
      resultItem: 'w-full text-left px-3 py-2 hover:bg-navy-700/50 rounded transition-colors',
      maxHeight: 'max-h-64',
      textSize: 'text-sm',
    },
    Minimalist: {
      container: 'ring-1 ring-cyan-400 ring-offset-1 ring-offset-navy-400',
      input: 'w-full pl-8 pr-8 py-1 bg-navy-600/50 border border-navy-300/20 text-xs text-gray-200 placeholder-gray-400 focus:outline-none focus:border-cyan-400 transition-colors h-6',
      iconSize: 'h-3 w-3',
      resultsContainer: 'top-full left-0 right-0 mt-1 bg-navy-600/95 border border-navy-300/20 overflow-hidden z-50 max-h-48',
      resultItem: 'w-full text-left px-2 py-1 hover:bg-navy-600/50 transition-colors',
      maxHeight: 'max-h-48',
      textSize: 'text-xs',
    },
    HighContrast: {
      container: 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-navy-400 rounded-lg',
      input: 'w-full pl-10 pr-10 py-1.5 bg-navy-600/50 border border-cyan-400/50 rounded-lg text-sm text-gray-200 placeholder-gray-400 focus:outline-none focus:border-cyan-400 transition-colors h-9',
      iconSize: 'h-4 w-4',
      resultsContainer: 'top-full left-0 right-0 mt-2 bg-navy-600/95 backdrop-blur-sm border border-cyan-400/50 rounded-lg shadow-lg overflow-hidden z-50 max-h-64',
      resultItem: 'w-full text-left px-3 py-1.5 hover:bg-navy-600/50 rounded transition-colors',
      maxHeight: 'max-h-64',
      textSize: 'text-sm',
    },
  }[variant],
  companySelectionBar: {
    Compact: {
      text: 'text-xs text-gray-400',
      buttonSize: 'h-10 w-10 p-0',
      iconSize: 'h-5 w-5',
      gap: 'gap-4',
    },
    Spacious: {
      text: 'text-sm text-gray-400',
      buttonSize: 'h-10 w-10 p-0',
      iconSize: 'h-5 w-5',
      gap: 'gap-3',
    },
    Opaque: {
      text: 'text-xs text-gray-400',
      buttonSize: 'h-9 w-9 p-0',
      iconSize: 'h-4 w-4',
      gap: 'gap-2',
    },
    Minimalist: {
      text: 'text-xs text-gray-400',
      buttonSize: 'h-6 w-6 p-0',
      iconSize: 'h-3 w-3',
      gap: 'gap-1',
    },
    HighContrast: {
      text: 'text-xs text-gray-400',
      buttonSize: 'h-9 w-9 p-0',
      iconSize: 'h-4 w-4',
      gap: 'gap-2',
    },
  }[variant],
  toast: {
    Compact: {
      container: 'fixed top-2 right-6 z-50 px-6 py-3 rounded-2x1 shadow-md backdrop-blur-sm flex items-center gap-4',
      iconSize: 'h-5 w-5',
      textSize: 'text-xs font-medium',
    },
    Spacious: {
      container: 'fixed top-6 right-6 z-50 px-6 py-3 rounded-2xl shadow-xl backdrop-blur-sm flex items-center gap-3',
      iconSize: 'h-5 w-5',
      textSize: 'text-base font-medium',
    },
    Opaque: {
      container: 'fixed top-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 bg-navy-800 border border-navy-600/50',
      iconSize: 'h-4 w-4',
      textSize: 'text-sm font-medium',
    },
    Minimalist: {
      container: 'fixed top-2 right-2 z-50 px-2 py-1 flex items-center gap-1',
      iconSize: 'h-3 w-3',
      textSize: 'text-xs font-medium',
    },
    HighContrast: {
      container: 'fixed top-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg backdrop-blur-sm flex items-center gap-2 border border-cyan-400/50',
      iconSize: 'h-4 w-4',
      textSize: 'text-sm font-medium',
    },
  }[variant],
  unifiedControlPanel: {
    Compact: {
      container: 'bg-navy-400/20 backdrop-blur-sm rounded-md shadow-md border border-navy-300/20 p-2',
      header: 'text-xs font-semibold text-gray-200 uppercase tracking-wider',
      gap: 'gap-2',
      filterText: 'text-xs text-gray-400 mb-1',
      clearButton: 'text-amber-400 hover:text-amber-300 hover:bg-amber-400/10 text-xs h-7 px-1.5 py-0.5',
      clearIconSize: 'h-3 w-3',
    },
    Spacious: {
      container: 'bg-navy-400/20 backdrop-blur-sm rounded-2xl shadow-xl border border-navy-300/20 p-6',
      header: 'text-base font-semibold text-gray-200 uppercase tracking-wider',
      gap: 'gap-8',
      filterText: 'text-sm text-gray-400 mb-3',
      clearButton: 'text-amber-400 hover:text-amber-300 hover:bg-amber-400/10 text-base h-10 px-4 py-2',
      clearIconSize: 'h-5 w-5',
    },
    Opaque: {
      container: 'bg-navy-800 rounded-xl shadow-lg border border-navy-600/50 p-4',
      header: 'text-sm font-semibold text-gray-200 uppercase tracking-wider',
      gap: 'gap-4',
      filterText: 'text-xs text-gray-400 mb-2',
      clearButton: 'text-amber-400 hover:text-amber-300 hover:bg-amber-400/10 text-sm h-9 px-3 py-1',
      clearIconSize: 'h-4 w-4',
    },
    Minimalist: {
      container: 'bg-navy-400/20 border border-navy-300/20 p-2',
      header: 'text-xs font-medium text-gray-200 uppercase tracking-wider',
      gap: 'gap-1.5',
      filterText: 'text-xs text-gray-400 mb-1',
      clearButton: 'text-amber-400 hover:text-amber-300 hover:bg-amber-400/10 text-xs h-6 px-1 py-0.5',
      clearIconSize: 'h-3 w-3',
    },
    HighContrast: {
      container: 'bg-navy-400/20 backdrop-blur-sm rounded-xl shadow-lg border border-cyan-400/50 p-4',
      header: 'text-sm font-semibold text-cyan-400 uppercase tracking-wider',
      gap: 'gap-3',
      filterText: 'text-xs text-gray-400 mb-2',
      clearButton: 'text-amber-400 hover:text-amber-300 hover:bg-amber-400/10 text-sm h-9 px-3 py-1.5',
      clearIconSize: 'h-4 w-4',
    },
  }[variant],
};