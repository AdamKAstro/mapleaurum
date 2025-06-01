// src/pages/scatter-score-pro/templates/index.ts
import type { ScatterScoreTemplate } from '../types';

// Import all templates
import { ValueHunterTemplate } from './value-hunter';
import { GrowthCatalystTemplate } from './growth-catalyst';
import { ProducerProfitabilityTemplate } from './producer-profitability';
import { FinancialStabilityTemplate } from './financial-stability';
import { PreciousMetalsTemplate } from './precious-metals';

// Export all templates as an array
export const SCATTER_SCORE_TEMPLATES: ScatterScoreTemplate[] = [
  ValueHunterTemplate,
  GrowthCatalystTemplate,
  ProducerProfitabilityTemplate,
  FinancialStabilityTemplate,
  PreciousMetalsTemplate
];

// Helper functions for template management
export const getTemplateByName = (name: string): ScatterScoreTemplate | undefined => {
  return SCATTER_SCORE_TEMPLATES.find(t => t.name === name);
};

export const getTemplateById = (id: string): ScatterScoreTemplate | undefined => {
  return SCATTER_SCORE_TEMPLATES.find(t => t.id === id);
};

export const getTemplatesByCategory = (category: string): ScatterScoreTemplate[] => {
  return SCATTER_SCORE_TEMPLATES.filter(t => t.category === category);
};

export const getTemplateCategories = (): string[] => {
  const categories = new Set(SCATTER_SCORE_TEMPLATES.map(t => t.category));
  return Array.from(categories).sort();
};

export const searchTemplates = (searchTerm: string): ScatterScoreTemplate[] => {
  const term = searchTerm.toLowerCase();
  return SCATTER_SCORE_TEMPLATES.filter(t => 
    t.name.toLowerCase().includes(term) ||
    t.description.toLowerCase().includes(term) ||
    t.tags.some(tag => tag.toLowerCase().includes(term))
  );
};

// Export individual templates for direct import if needed
export {
  ValueHunterTemplate,
  GrowthCatalystTemplate,
  ProducerProfitabilityTemplate,
  FinancialStabilityTemplate,
  PreciousMetalsTemplate
};