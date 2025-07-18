// src/features/hook-ui/config/debug-config.ts

/**
 * Centralized debug configuration for the Hook UI feature
 * 
 * To disable all debug output:
 * - Set DEBUG_ENABLED to false
 * 
 * To disable specific debug categories:
 * - Set individual category flags to false
 * 
 * To completely remove debug code in production:
 * - Use build-time environment variables
 */

// Master debug toggle - set to false to disable ALL debug output
export const DEBUG_ENABLED = false; // 👈 Change this to false to turn off all debug

// Individual debug categories - only active when DEBUG_ENABLED is true
export const DEBUG_CATEGORIES = {
  // Component rendering and lifecycle
  rendering: true,
  
  // Logo loading and image handling
  logoLoading: false,
  
  // Data processing and transformation
  dataProcessing: true,
  
  // User interactions (clicks, hovers, etc.)
  interactions: true,
  
  // Metrics calculation and analysis
  metrics: true,
  
  // Company matching algorithm
  matching: true,
  
  // API calls and data fetching
  api: true,
  
  // State management
  state: true
};

// Debug logger function - use this instead of console.debug directly
export const debugLog = (
  category: keyof typeof DEBUG_CATEGORIES, 
  message: string, 
  data?: any
) => {
  if (!DEBUG_ENABLED || !DEBUG_CATEGORIES[category]) {
    return;
  }
  
  const timestamp = new Date().toLocaleTimeString();
  const prefix = `[${timestamp}][${category.toUpperCase()}]`;
  
  if (data !== undefined) {
    console.debug(`${prefix} ${message}`, data);
  } else {
    console.debug(`${prefix} ${message}`);
  }
};

// Toast notifications for debug info - only shown when debug is enabled
export const debugToast = (message: string, options?: any) => {
  if (!DEBUG_ENABLED) {
    return;
  }
  
  // Only import toast when needed to avoid unnecessary imports in production
  import('react-hot-toast').then(({ toast }) => {
    toast(message, {
      duration: 2000,
      style: {
        background: '#1e293b',
        color: '#64748b',
        fontSize: '12px',
        border: '1px solid #334155'
      },
      ...options
    });
  });
};

// Environment-based debug settings
export const getDebugConfig = () => {
  // In production builds, you might want to force debug off
  if (process.env.NODE_ENV === 'production') {
    return {
      enabled: false,
      categories: Object.fromEntries(
        Object.keys(DEBUG_CATEGORIES).map(key => [key, false])
      )
    };
  }
  
  return {
    enabled: DEBUG_ENABLED,
    categories: DEBUG_CATEGORIES
  };
};

// Helper to check if any debug category is enabled
export const isAnyDebugEnabled = (): boolean => {
  return DEBUG_ENABLED && Object.values(DEBUG_CATEGORIES).some(Boolean);
};

// Performance monitoring (only when debug enabled)
export const debugTime = (label: string) => {
  if (!DEBUG_ENABLED) {
    return {
      end: () => {}
    };
  }
  
  const startTime = performance.now();
  console.time(label);
  
  return {
    end: () => {
      const endTime = performance.now();
      console.timeEnd(label);
      debugLog('performance', `${label} took ${(endTime - startTime).toFixed(2)}ms`);
    }
  };
};

// Debug overlay component props
export interface DebugOverlayProps {
  company?: any;
  logoStatus?: 'custom' | 'supabase' | 'error' | 'loading';
  matchScore?: number;
  additionalInfo?: Record<string, any>;
}

// Generate debug overlay data
export const getDebugOverlayData = (props: DebugOverlayProps) => {
  if (!DEBUG_ENABLED) {
    return null;
  }
  
  const { company, logoStatus, matchScore, additionalInfo } = props;
  
  return {
    companyId: company?.id || 'unknown',
    companyName: company?.name || 'unknown',
    logoStatus: logoStatus || 'unknown',
    matchScore: matchScore || 0,
    timestamp: new Date().toLocaleTimeString(),
    ...additionalInfo
  };
};

// Export for easy importing in components
export default {
  enabled: DEBUG_ENABLED,
  categories: DEBUG_CATEGORIES,
  log: debugLog,
  toast: debugToast,
  time: debugTime,
  getConfig: getDebugConfig,
  isAnyEnabled: isAnyDebugEnabled,
  getOverlayData: getDebugOverlayData
};