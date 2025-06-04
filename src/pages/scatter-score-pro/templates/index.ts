// src/pages/scatter-score-pro/templates/index.ts
import type { ScatterScoreTemplate } from '../types';

import { ValueHunterTemplate } from './value-hunter';
import { FinancialStabilityTemplate } from './financial-stability';
import { GrowthCatalystTemplate } from './growth-catalyst';
import { ProducerProfitabilityTemplate } from './producer-profitability';
import { PreciousMetalsTemplate } from './precious-metals';
import { TurnaroundOpportunitiesTemplate } from './turnaround-opportunities';

export const PREDEFINED_TEMPLATES: ScatterScoreTemplate[] = [
  ValueHunterTemplate,
  GrowthCatalystTemplate,
  ProducerProfitabilityTemplate,
  FinancialStabilityTemplate,
  PreciousMetalsTemplate,
  TurnaroundOpportunitiesTemplate,
  // Add any new templates here in the desired order
];

export function getTemplateById(id: string): ScatterScoreTemplate | undefined {
  return PREDEFINED_TEMPLATES.find(template => template.id === id);
}

export function getTemplateByName(name: string): ScatterScoreTemplate | undefined {
  return PREDEFINED_TEMPLATES.find(template => template.name === name);
}

// Function to get all templates, useful for populating selectors
export function getAllTemplates(): ScatterScoreTemplate[] {
  return PREDEFINED_TEMPLATES;
}