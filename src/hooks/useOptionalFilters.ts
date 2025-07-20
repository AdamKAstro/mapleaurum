// src/hooks/useOptionalFilters.ts

import { useContext } from 'react';
import { FilterContext } from '../contexts/filter-context';

export const useOptionalFilters = () => {
  try {
    const context = useContext(FilterContext);
    if (!context) {
      // Not in a FilterProvider, return null
      return null;
    }
    return context;
  } catch (error) {
    // Context doesn't exist
    return null;
  }
};

export default useOptionalFilters;