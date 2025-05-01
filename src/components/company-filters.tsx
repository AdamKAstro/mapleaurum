//src/components/company-filters.tsx
import React from 'react';
import type { FilterState } from '../lib/types';

interface CompanyFiltersProps {
  currentFilters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
}

export function CompanyFilters({ currentFilters, onFiltersChange }: CompanyFiltersProps) {
  const handleStatusChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    onFiltersChange({
      ...currentFilters,
      status: value ? [value] : null,
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Status</label>
        <select
          value={currentFilters.status?.[0] || ''}
          onChange={handleStatusChange}
          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2"
        >
          <option value="">All</option>
          <option value="producer">Producer</option>
          <option value="developer">Developer</option>
          <option value="explorer">Explorer</option>
        </select>
      </div>
      {/* Add more filter controls here */}
    </div>
  );
}