// src/features/hook-ui/components/ConnectedPlayingCard.tsx
import React from 'react';
import PlayingCard from './PlayingCard';
import { useFilters } from '../../../contexts/filter-context';
import type { EnhancedCompanyMatch } from '../types/hook-ui-types';

interface ConnectedPlayingCardProps {
  company: EnhancedCompanyMatch;
  index?: number;
  showMatchDetails?: boolean;
  onViewDetails?: (companyId: number) => void;
}

// This wrapper component connects PlayingCard to the FilterContext
export const ConnectedPlayingCard: React.FC<ConnectedPlayingCardProps> = (props) => {
  const { isCompanySelected, toggleCompanySelection } = useFilters();
  
  return (
    <PlayingCard
      {...props}
      isFavorite={isCompanySelected(props.company.id)}
      onToggleFavorite={toggleCompanySelection}
    />
  );
};

export default ConnectedPlayingCard;