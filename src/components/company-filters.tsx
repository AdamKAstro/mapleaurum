// src/components/company-filters.tsx
import React from 'react';
import type { FilterState } from '../lib/types';
import { GlassContainer } from './ui/GlassContainer'; // Import the new container

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
    // Use the GlassContainer with the 'panel' variant and disable rotation for a static feel
    <GlassContainer variant="panel" rotate={false}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2 text-white/80">Status</label>
          <select
            value={currentFilters.status?.[0] || ''}
            onChange={handleStatusChange}
            // Apply a consistent glass style to form inputs
            className="w-full rounded-md border border-white/30 bg-white/10 px-3 py-2 text-white/90 focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition"
          >
            <option value="">All</option>
            <option value="producer">Producer</option>
            <option value="developer">Developer</option>
            <option value="explorer">Explorer</option>
          </select>
        </div>
        {/* Add more filter controls here */}
      </div>
    </GlassContainer>
  );
}