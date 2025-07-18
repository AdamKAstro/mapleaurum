// src/features/hook-ui/lib/company-matcher-logic.ts
import type { Company, PlayingCardDisplayData } from '../../../lib/types';
import type { RiskProfile, InterestProfile } from '../types/hook-ui-types';

export interface MetricStats {
  min?: number;
  max?: number;
  p05?: number;
  p95?: number;
  mean?: number;
  stddev?: number;
  median?: number;
  count?: number;
}

export type MetricStatsMap = Record<string, MetricStats | undefined>;

export interface MetricRanges {
  marketCap: { min: number; max: number };
  scoreForPrimaryInterest: { min: number; max: number };
}

export interface EnhancedPlayingCardData extends PlayingCardDisplayData {
  // Additional fields from Company type
  tsxCode?: string | null;
  sharePrice?: number | null;
  status?: string | null;
  description?: string | null;
  enterpriseValue?: number | null;
  cashPosition?: number | null;
  debtToEquity?: number | null;
  reserves?: number | null;
  resources?: number | null;
  aisc?: number | null;
  jurisdiction?: string | null;
  yearOverYearGrowth?: number | null;
  esgScore?: number | null;
}

export const getMatchedCompanies = (
  companies: Company[],
  interests: { id: string; weight: number }[],
  riskProfile: RiskProfile | null,
  metricStatsMap: MetricStatsMap = {},
  minimumScoreThreshold: number = 10
): EnhancedPlayingCardData[] => {
  console.log('[Matcher] getMatchedCompanies called with', companies.length, 'companies,',
    interests.length, 'profiles, threshold:', minimumScoreThreshold);
  console.log('[Matcher] MetricStatsMap keys:', Object.keys(metricStatsMap));
  console.log('[Matcher] Interests:', interests);
  console.log('[Matcher] RiskProfile:', riskProfile);
  console.log('[Matcher] Sample companies:', companies.slice(0, 3).map(c => ({
    company_id: c.company_id,
    name: c.company_name,
    marketCap: c.financials.market_cap_value,
    percent_gold: c.percent_gold,
    percent_silver: c.percent_silver,
    minerals_of_interest: c.minerals_of_interest,
    status: c.status,
  })));

  if (!companies?.length || !interests?.length) {
    console.warn('[Matcher] No companies or profiles provided');
    return [];
  }

  // Normalize weights to sum to 100
  let totalWeight = interests.reduce((sum, interest) => sum + (interest.weight || 0), 0);
  let normalizedInterests = interests;
  if (totalWeight <= 0) {
    console.warn('[Matcher] Total weight is zero or negative, defaulting to equal weights');
    normalizedInterests = interests.map(interest => ({ ...interest, weight: 100 / interests.length }));
    totalWeight = 100;
  } else if (Math.abs(totalWeight - 100) > 0.01) {
    console.warn('[Matcher] Profile weights do not sum to 100:', totalWeight);
    normalizedInterests = interests.map(interest => ({
      ...interest,
      weight: (interest.weight / totalWeight) * 100,
    }));
    totalWeight = 100;
  }

  const matchedCompanies = companies
    .map((company) => {
      // Calculate score based on multiple factors
      const score = normalizedInterests.reduce((totalScore, interest) => {
        let interestScore = 0;
        
        // Factor 1: Metal composition
        const goldWeight = company.percent_gold || 0;
        const silverWeight = company.percent_silver || 0;
        
        // Factor 2: Company status alignment
        let statusBonus = 0;
        if (company.status) {
          if (['max_potential_returns', 'high_grade_discoveries', 'speculative_exploration'].includes(interest.id)) {
            statusBonus = company.status === 'explorer' ? 20 : company.status === 'developer' ? 10 : 0;
          } else if (['cautious_safe_ounces', 'established_dividend_payers', 'low_cost_producers'].includes(interest.id)) {
            statusBonus = company.status === 'producer' ? 20 : company.status === 'royalty' ? 15 : 0;
          } else if (['near_term_producers'].includes(interest.id)) {
            statusBonus = company.status === 'developer' ? 25 : company.status === 'producer' ? 10 : 0;
          }
        }
        
        // Factor 3: Financial metrics alignment
        let financialBonus = 0;
        const marketCap = company.financials?.market_cap_value || 0;
        const cash = company.financials?.cash_value || 0;
        const revenue = company.financials?.revenue_value || 0;
        
        if (['established_dividend_payers', 'low_cost_producers', 'high_cash_flow_generators'].includes(interest.id)) {
          if (revenue > 0) financialBonus += 10;
          if (cash > 50000000) financialBonus += 5; // >$50M cash
          if (marketCap > 1000000000) financialBonus += 5; // >$1B market cap
        } else if (['max_potential_returns', 'speculative_exploration', 'undervalued_assets'].includes(interest.id)) {
          if (marketCap < 500000000) financialBonus += 10; // <$500M market cap
          if (marketCap < 100000000) financialBonus += 5; // <$100M market cap
        }
        
        // Factor 4: Resource metrics
        let resourceBonus = 0;
        const resources = company.mineral_estimates?.resources_total_aueq_moz || 0;
        const reserves = company.mineral_estimates?.reserves_total_aueq_moz || 0;
        
        if (resources > 0 || reserves > 0) {
          if (['cautious_safe_ounces', 'low_cost_producers'].includes(interest.id)) {
            resourceBonus = reserves > 0 ? 15 : 5;
          } else if (['high_grade_discoveries', 'max_potential_returns'].includes(interest.id)) {
            resourceBonus = resources > 5 ? 15 : resources > 0 ? 10 : 0;
          }
        }
        
        // Factor 5: Production metrics
        let productionBonus = 0;
        const currentProduction = company.production?.current_production_total_aueq_koz || 0;
        const aisc = company.costs?.aisc_last_year || 0;
        
        if (currentProduction > 0) {
          if (['established_dividend_payers', 'low_cost_producers', 'high_cash_flow_generators'].includes(interest.id)) {
            productionBonus += 15;
            if (aisc > 0 && aisc < 1200) productionBonus += 10; // Low cost producer
          }
        }
        
        // Calculate weighted interest score
        if (['max_potential_returns', 'high_grade_discoveries', 'speculative_exploration'].includes(interest.id)) {
          interestScore = (goldWeight * 0.6 + silverWeight * 0.4) + statusBonus + financialBonus + resourceBonus;
        } else if (['cautious_safe_ounces', 'established_dividend_payers', 'low_cost_producers'].includes(interest.id)) {
          interestScore = (goldWeight * 0.4 + silverWeight * 0.3) + statusBonus + financialBonus + resourceBonus + productionBonus;
        } else {
          interestScore = (goldWeight * 0.5 + silverWeight * 0.5) + statusBonus + financialBonus + resourceBonus;
        }
        
        // Cap individual scores at 100
        interestScore = Math.min(interestScore, 100);
        
        return totalScore + (interestScore * (interest.weight / 100));
      }, 0);

      // Apply risk profile filters
      let passesRiskFilters = true;
      if (riskProfile) {
        // Market cap filter based on risk tolerance
        const minMarketCap = riskProfile.riskTolerance < 33 ? 1e8 : // Conservative: >$100M
                            riskProfile.riskTolerance < 66 ? 5e7 : // Balanced: >$50M
                            1e7; // Aggressive: >$10M
        
        if (company.financials.market_cap_value && company.financials.market_cap_value < minMarketCap) {
          console.log(`[Matcher] Company ${company.company_name || 'Unknown'} failed marketCap filter: ${company.financials.market_cap_value} < ${minMarketCap}`);
          passesRiskFilters = false;
        }
        
        // Preferred minerals filter
        if (riskProfile.preferredMinerals.length > 0) {
          const hasMatchingMineral = riskProfile.preferredMinerals.some(mineral => {
            const mineralLower = mineral.toLowerCase();
            if (mineralLower === 'gold' && company.percent_gold && company.percent_gold > 0) return true;
            if (mineralLower === 'silver' && company.percent_silver && company.percent_silver > 0) return true;
            return false;
          });
          if (!hasMatchingMineral) {
            console.log(`[Matcher] Company ${company.company_name || 'Unknown'} failed preferredMinerals filter`);
            passesRiskFilters = false;
          }
        }
        
        // Investment horizon filter
        if (riskProfile.investmentHorizon < 33 && company.status === 'explorer') {
          // Short-term investors should avoid pure explorers
          passesRiskFilters = false;
        }
      }

      if (!passesRiskFilters || score < minimumScoreThreshold) {
        return null;
      }

      // Calculate additional metrics for the playing card
      const yearOverYearGrowth = company.share_price && company.financials?.forward_pe && company.financials?.trailing_pe
        ? ((company.financials.forward_pe - company.financials.trailing_pe) / company.financials.trailing_pe) * 100
        : 0;

      const esgScore = company.mineral_estimates?.potential_total_aueq_moz 
        ? Math.min(100, Math.round(50 + (company.mineral_estimates.potential_total_aueq_moz * 5)))
        : 50;

      return {
        id: company.company_id.toString(),
        name: company.company_name || 'Unknown',
        marketCap: company.financials.market_cap_value || 0,
        scoreForPrimaryInterest: score.toFixed(2),
        minerals_of_interest: company.minerals_of_interest || [],
        percent_gold: company.percent_gold,
        percent_silver: company.percent_silver,
        // Additional fields
        tsxCode: company.tsx_code,
        sharePrice: company.share_price,
        status: company.status,
        description: company.description,
        enterpriseValue: company.financials.enterprise_value_value,
        cashPosition: company.financials.cash_value,
        debtToEquity: company.financials.debt_value && company.financials.market_cap_value 
          ? company.financials.debt_value / (company.financials.market_cap_value - company.financials.debt_value)
          : null,
        reserves: company.mineral_estimates.reserves_total_aueq_moz,
        resources: company.mineral_estimates.resources_total_aueq_moz,
        aisc: company.costs.aisc_last_year,
        jurisdiction: company.headquarters,
        yearOverYearGrowth,
        esgScore,
      };
    })
    .filter((company): company is EnhancedPlayingCardData => company !== null);

  console.log('[Matcher] Matched companies:', matchedCompanies.length,
    matchedCompanies.slice(0, 3).map(c => ({
      id: c.id,
      name: c.name,
      marketCap: c.marketCap,
      score: c.scoreForPrimaryInterest,
      status: c.status,
      percent_gold: c.percent_gold,
      percent_silver: c.percent_silver,
    })));

  // Sort by score descending
  matchedCompanies.sort((a, b) => parseFloat(b.scoreForPrimaryInterest) - parseFloat(a.scoreForPrimaryInterest));
  
  return matchedCompanies;
};