// src/features/hook-ui/lib/enhanced-company-matcher.ts

import type { PlayingCardDisplayData, InterestProfile, RiskProfile } from '../types/hook-ui-types';
import type { Company, CompanyStatus } from '../../../lib/types';
import debugConfig from '../config/debug-config';

export interface EnhancedCompanyMatch extends PlayingCardDisplayData {
  matchScore: number;
  matchReasons: string[];
  rankPosition: number;
  interestAlignment: {
    [interestId: string]: {
      score: number;
      reasons: string[];
    };
  };
  riskAlignment: {
    score: number;
    reasons: string[];
  };
  financialStrength: {
    score: number;
    reasons: string[];
  };
}

interface ScoringWeights {
  interestAlignment: number;
  riskAlignment: number;
  financialHealth: number;
  operationalMetrics: number;
  esgFactors: number;
}

const debugLog = (message: string, data?: any) => {
  if (debugConfig.enabled && debugConfig.categories.matching) {
    console.log(`[Enhanced Matching] ${message}`, data);
  }
};

const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  interestAlignment: 0.35,
  riskAlignment: 0.25,
  financialHealth: 0.20,
  operationalMetrics: 0.15,
  esgFactors: 0.05
};

const normalizeScore = (value: number, min: number, max: number, isHigherBetter: boolean = true): number => {
  if (max === min) return 50;
  const normalized = (value - min) / (max - min);
  return isHigherBetter ? normalized * 100 : (1 - normalized) * 100;
};

// Validate company data
const validateCompanyData = (company: PlayingCardDisplayData): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  if (!company.id) errors.push(`Missing company ID for ${company.name || 'unknown'}`);
  if (!company.name) errors.push(`Missing company name for ${company.id || 'unknown'}`);
  if (!Array.isArray(company.minerals_of_interest)) {
    errors.push(`Invalid minerals_of_interest (must be an array) for ${company.name || 'unknown'}`);
  }
  if (!company.status) {
    debugLog(`Missing status for ${company.name || 'unknown'}, using 'other'`);
    company.status = 'other';
  }
  if (company.marketCap === undefined || company.marketCap === null) {
    debugLog(`Missing marketCap for ${company.name || 'unknown'}, using null`);
    company.marketCap = null;
  }
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Calculate interest alignment score with improved logic
const calculateInterestAlignment = (
  company: PlayingCardDisplayData,
  selectedInterests: { id: string; weight: number }[],
  interestProfiles: InterestProfile[]
): { score: number; reasons: string[]; breakdown: { [key: string]: { score: number; reasons: string[] } } } => {
  const breakdown: { [key: string]: { score: number; reasons: string[] } } = {};
  let totalWeightedScore = 0;
  let totalWeight = 0;
  const allReasons: string[] = [];

  selectedInterests.forEach(({ id, weight }) => {
    const profile = interestProfiles.find(p => p.id === id);
    if (!profile) {
      debugLog(`No profile found for interest ID: ${id}`);
      return;
    }

    let interestScore = 0;
    const reasons: string[] = [];

    const companyStatus = (company.status || 'other').toLowerCase() as CompanyStatus;
    const marketCap = company.marketCap ?? 0;
    const hasProduction = company.production && company.production !== 'N/A';
    const aisc = company.c_aisc_last_year ?? 0;
    const reserves = company.reserves ?? 0;
    const resources = company.resources ?? 0;
    const cashPosition = company.cashPosition ?? 0;
    const freeCashFlow = company.f_free_cash_flow ?? 0;

    switch (id) {
      case 'max_potential_returns':
      case 'speculative_exploration':
        if (companyStatus === 'explorer') {
          interestScore += 35;
          reasons.push('Explorer status aligns with high-risk/high-reward strategy');
        }
        if (marketCap < 100e6) {
          interestScore += 25;
          reasons.push('Small market cap offers significant upside potential');
        }
        if (resources > 2 && !hasProduction) {
          interestScore += 20;
          reasons.push(`${resources.toFixed(1)}M oz resources with exploration upside`);
        }
        break;

      case 'established_dividend_payers':
      case 'low_cost_producers':
        if (companyStatus === 'producer') {
          interestScore += 35;
          reasons.push('Established producer with proven operations');
        }
        if (aisc > 0 && aisc < 1200) {
          interestScore += 30;
          reasons.push(`Low AISC of $${aisc}/oz indicates efficient operations`);
        }
        if (freeCashFlow > 50e6) {
          interestScore += 20;
          reasons.push('Strong free cash flow supports dividends');
        }
        break;

      case 'high_cash_flow_generators':
        if (freeCashFlow > 100e6) {
          interestScore += 40;
          reasons.push(`Exceptional free cash flow of $${(freeCashFlow / 1e6).toFixed(0)}M`);
        } else if (freeCashFlow > 50e6) {
          interestScore += 25;
          reasons.push(`Strong free cash flow of $${(freeCashFlow / 1e6).toFixed(0)}M`);
        }
        if (hasProduction && companyStatus === 'producer') {
          interestScore += 20;
          reasons.push('Active production generates consistent cash flow');
        }
        break;

      case 'near_term_producers':
        if (companyStatus === 'developer') {
          interestScore += 40;
          reasons.push('Developer status indicates near-term production potential');
        }
        if (reserves > 0 && !hasProduction) {
          interestScore += 25;
          reasons.push(`${reserves.toFixed(1)}M oz reserves ready for development`);
        }
        if (cashPosition > 50e6) {
          interestScore += 15;
          reasons.push('Strong cash position to fund development');
        }
        break;

      case 'cautious_safe_ounces':
        if (companyStatus === 'producer' || companyStatus === 'royalty') {
          interestScore += 30;
          reasons.push(`${companyStatus} offers stable, lower-risk exposure`);
        }
        if (reserves > 5) {
          interestScore += 25;
          reasons.push(`Large reserve base of ${reserves.toFixed(1)}M oz provides security`);
        }
        if (marketCap > 1e9) {
          interestScore += 20;
          reasons.push('Large market cap provides stability');
        }
        break;

      case 'undervalued_assets':
        const evPerResource = company.vm_ev_per_resource_oz_all ?? 0;
        if (evPerResource > 0 && evPerResource < 50) {
          interestScore += 35;
          reasons.push(`Low EV/Resource of $${evPerResource}/oz suggests undervaluation`);
        }
        const priceToBook = company.f_price_to_book ?? 0;
        if (priceToBook > 0 && priceToBook < 1) {
          interestScore += 25;
          reasons.push(`Trading below book value at ${priceToBook.toFixed(2)}x P/B`);
        }
        break;

      case 'high_grade_discoveries':
        if (companyStatus === 'explorer' || companyStatus === 'developer') {
          interestScore += 25;
          reasons.push(`${companyStatus} focused on new discoveries`);
        }
        if (resources > 0 && resources < 5) {
          interestScore += 20;
          reasons.push('Smaller resource base may indicate selective high-grade focus');
        }
        break;
    }

    const companyMinerals = company.minerals_of_interest || [];
    const profileMinerals = profile.preferredMinerals || [];
    const mineralAlignment = profileMinerals.length > 0
      ? profileMinerals.filter(m => companyMinerals.some(cm => cm.toLowerCase().includes(m.toLowerCase()))).length / profileMinerals.length
      : 0;
    
    if (mineralAlignment > 0.5) {
      interestScore += 15;
      reasons.push(`Strong mineral focus alignment (${Math.round(mineralAlignment * 100)}%)`);
    }

    if (profile.marketCapRange && marketCap > 0) {
      const { min, max } = profile.marketCapRange;
      if (marketCap >= min && marketCap <= max) {
        interestScore += 10;
        reasons.push(`Market cap within target range`);
      }
    }

    const jurisdiction = (company.jurisdiction || '').toLowerCase();
    if (profile.geographicFocus?.some(geo => jurisdiction.includes(geo.toLowerCase()))) {
      interestScore += 10;
      reasons.push(`Operating in preferred jurisdiction: ${company.jurisdiction}`);
    }

    breakdown[id] = { score: Math.min(interestScore, 100), reasons };
    totalWeightedScore += interestScore * weight;
    totalWeight += weight;
    allReasons.push(...reasons.map(r => `${profile.name}: ${r}`));
  });

  return {
    score: totalWeight > 0 ? Math.min(totalWeightedScore / totalWeight, 100) : 0,
    reasons: allReasons.slice(0, 3),
    breakdown
  };
};

// Calculate risk alignment score
const calculateRiskAlignment = (
  company: PlayingCardDisplayData,
  riskProfile: RiskProfile
): { score: number; reasons: string[] } => {
  let riskScore = 0;
  const reasons: string[] = [];

  const companyStatus = (company.status || 'other').toLowerCase();
  const riskTolerance = riskProfile.riskTolerance;

  if (companyStatus === 'producer' && riskTolerance < 40) {
    riskScore += 30;
    reasons.push('Low-risk producer status matches conservative profile');
  } else if (companyStatus === 'developer' && riskTolerance >= 40 && riskTolerance <= 70) {
    riskScore += 30;
    reasons.push('Developer stage aligns with moderate risk tolerance');
  } else if (companyStatus === 'explorer' && riskTolerance > 70) {
    riskScore += 30;
    reasons.push('Explorer stage matches high risk tolerance');
  }

  const marketCap = company.marketCap ?? 0;
  if (marketCap > 1e9 && riskTolerance < 50) {
    riskScore += 25;
    reasons.push('Large market cap provides stability for risk-averse investors');
  } else if (marketCap < 500e6 && riskTolerance > 60) {
    riskScore += 25;
    reasons.push('Small cap size offers high growth potential for risk-tolerant investors');
  }

  const debtToEquity = company.debtToEquity ?? 0;
  if (debtToEquity < 0.5 && riskTolerance < 60) {
    riskScore += 20;
    reasons.push('Low debt-to-equity ratio provides financial stability');
  }

  const cashPosition = company.cashPosition ?? 0;
  if (cashPosition > 50e6 && riskTolerance < 50) {
    riskScore += 15;
    reasons.push('Strong cash position reduces operational risk');
  }

  const hasProduction = company.production && company.production !== 'N/A';
  if (hasProduction && riskTolerance < 50) {
    riskScore += 10;
    reasons.push('Active production reduces execution risk');
  }

  return {
    score: Math.min(riskScore, 100),
    reasons: reasons.slice(0, 3)
  };
};

// Calculate financial strength score
const calculateFinancialStrength = (
  company: PlayingCardDisplayData
): { score: number; reasons: string[] } => {
  let financialScore = 0;
  const reasons: string[] = [];

  const freeCashFlow = company.f_free_cash_flow ?? 0;
  if (freeCashFlow > 0) {
    financialScore += 25;
    reasons.push(`Positive free cash flow: ${(freeCashFlow / 1e6).toFixed(1)}M`);
  }

  const debtToEquity = company.debtToEquity ?? 0;
  if (debtToEquity < 0.5) {
    financialScore += 20;
    reasons.push(`Conservative debt levels: ${debtToEquity.toFixed(2)} D/E ratio`);
  }

  const priceToBook = company.f_price_to_book ?? 0;
  if (priceToBook > 0 && priceToBook < 2) {
    financialScore += 15;
    reasons.push(`Attractive valuation: ${priceToBook.toFixed(2)}x P/B ratio`);
  }

  const evToEbitda = company.f_enterprise_to_ebitda ?? 0;
  if (evToEbitda > 0 && evToEbitda < 10) {
    financialScore += 15;
    reasons.push(`Efficient valuation: ${evToEbitda.toFixed(1)}x EV/EBITDA`);
  }

  const cashPosition = company.cashPosition ?? 0;
  if (cashPosition > 100e6) {
    financialScore += 10;
    reasons.push(`Strong cash reserves: ${(cashPosition / 1e6).toFixed(0)}M`);
  }

  return {
    score: Math.min(financialScore, 100),
    reasons: reasons.slice(0, 3)
  };
};

// Calculate operational metrics score
const calculateOperationalMetrics = (
  company: PlayingCardDisplayData
): { score: number; reasons: string[] } => {
  let operationalScore = 0;
  const reasons: string[] = [];

  const aisc = company.c_aisc_last_year ?? 0;
  if (aisc > 0 && aisc < 1500) {
    operationalScore += 25;
    reasons.push(`Competitive AISC: ${aisc.toFixed(0)}/oz`);
  }

  const reserveLife = company.p_reserve_life_years ?? 0;
  if (reserveLife > 8) {
    operationalScore += 20;
    reasons.push(`Long reserve life: ${reserveLife.toFixed(1)} years`);
  }

  const resources = company.me_measured_indicated_total_aueq_moz ?? 0;
  if (resources > 3) {
    operationalScore += 20;
    reasons.push(`Substantial resource base: ${resources.toFixed(1)}M oz AuEq`);
  }

  const evPerResource = company.vm_ev_per_resource_oz_all ?? 0;
  if (evPerResource > 0 && evPerResource < 100) {
    operationalScore += 15;
    reasons.push(`Efficient resource valuation: ${evPerResource.toFixed(0)}/oz`);
  }

  const hasStableProduction = company.production && company.production !== 'N/A' && !company.production.includes('suspended');
  if (hasStableProduction) {
    operationalScore += 10;
    reasons.push('Consistent production track record');
  }

  const jurisdiction = (company.jurisdiction || '').toLowerCase();
  const tierOneJurisdictions = ['canada', 'australia', 'usa', 'united states'];
  if (tierOneJurisdictions.some(j => jurisdiction.includes(j))) {
    operationalScore += 10;
    reasons.push(`Operating in Tier 1 jurisdiction: ${company.jurisdiction}`);
  }

  return {
    score: Math.min(operationalScore, 100),
    reasons: reasons.slice(0, 3)
  };
};

// Calculate ESG factors score
const calculateESGFactors = (
  company: PlayingCardDisplayData
): { score: number; reasons: string[] } => {
  let esgScore = 0;
  const reasons: string[] = [];

  if (company.esgScore && company.esgScore > 0) {
    esgScore += Math.min(company.esgScore, 100);
    reasons.push(`ESG rating: ${company.esgScore}/100`);
  } else {
    const jurisdiction = (company.jurisdiction || '').toLowerCase();
    const goodJurisdictions = ['canada', 'australia', 'usa', 'united states', 'norway', 'sweden'];
    if (goodJurisdictions.some(j => jurisdiction.includes(j))) {
      esgScore += 30;
      reasons.push('Operating in jurisdiction with strong regulatory framework');
    }

    const status = (company.status || 'other').toLowerCase();
    if (status === 'developer' || status === 'explorer') {
      esgScore += 20;
      reasons.push('Modern development approach likely incorporates ESG standards');
    }
  }

  return {
    score: Math.min(esgScore, 100),
    reasons: reasons.slice(0, 2)
  };
};

// Data transformation helper - converts Company to EnhancedCompanyMatch
// IMPORTANT: This function was missing the export keyword!
export const transformCompanyToEnhancedMatch = (company: Company, index: number): EnhancedCompanyMatch => {
  try {
    debugLog(`Transforming company: ${company.company_name}`, {
      id: company.company_id,
      name: company.company_name,
      status: company.status,
      hasFinancials: !!company.financials,
      hasProduction: !!company.production,
      hasMinerals: !!company.minerals_of_interest
    });

    // Calculate a basic match score based on available data
    let basicScore = 50; // Start with base score
    
    // Add points for having key data
    if (company.financials?.market_cap_value) basicScore += 5;
    if (company.status && company.status !== 'other') basicScore += 10;
    if (company.minerals_of_interest?.length > 0) basicScore += 5;
    if (company.production?.current_production_total_aueq_koz) basicScore += 10;
    if (company.mineral_estimates?.reserves_total_aueq_moz) basicScore += 10;
    if (company.costs?.aisc_last_year && company.costs.aisc_last_year < 1500) basicScore += 10;
    
    // Add randomization to prevent alphabetical bias
    basicScore += Math.random() * 20 - 10; // -10 to +10 random adjustment

    const baseData: PlayingCardDisplayData = {
      id: String(company.company_id),
      name: company.company_name || 'Unknown Company',
      tsxCode: company.tsx_code || null,
      status: company.status || 'other',
      logo: null, // Will be generated from company ID
      sharePrice: company.share_price ?? null,
      marketCap: company.financials?.market_cap_value ?? null,
      production: company.production?.current_production_total_aueq_koz 
        ? `${company.production.current_production_total_aueq_koz} koz`
        : null,
      description: company.description || null,
      jurisdiction: company.headquarters || null,
      recentNews: [],
      analystRating: null,
      matchedInterests: [],
      scoreForPrimaryInterest: '0',
      minerals_of_interest: company.minerals_of_interest || [],
      percent_gold: company.percent_gold ?? null,
      percent_silver: company.percent_silver ?? null,
      enterpriseValue: company.financials?.enterprise_value_value ?? null,
      cashPosition: company.financials?.cash_value ?? null,
      debtToEquity: company.financials?.debt_to_equity ?? null,
      esgScore: null,
      reserves: company.mineral_estimates?.reserves_total_aueq_moz ?? null,
      resources: company.mineral_estimates?.resources_total_aueq_moz ?? null,
      f_free_cash_flow: company.financials?.free_cash_flow ?? null,
      f_price_to_book: company.financials?.price_to_book ?? null,
      f_enterprise_to_ebitda: company.financials?.enterprise_to_ebitda ?? null,
      f_peg_ratio: company.financials?.peg_ratio ?? null,
      c_aisc_last_year: company.costs?.aisc_last_year ?? null,
      p_reserve_life_years: company.production?.reserve_life_years ?? null,
      me_measured_indicated_total_aueq_moz: company.mineral_estimates?.measured_indicated_total_aueq_moz ?? null,
      vm_ev_per_resource_oz_all: company.valuation_metrics?.ev_per_resource_oz_all ?? null,
      vm_ev_per_reserve_oz_all: company.valuation_metrics?.ev_per_reserve_oz_all ?? null,
      detailsPageId: company.tsx_code || String(company.company_id)
    };

    // Generate match reasons based on available data
    const matchReasons: string[] = [];
    if (company.status === 'producer') matchReasons.push('Established producer with proven operations');
    if (company.status === 'developer') matchReasons.push('Development stage with near-term potential');
    if (company.status === 'explorer') matchReasons.push('Explorer with discovery potential');
    if (company.financials?.market_cap_value && company.financials.market_cap_value > 1e9) {
      matchReasons.push('Large cap provides stability');
    } else if (company.financials?.market_cap_value && company.financials.market_cap_value < 100e6) {
      matchReasons.push('Small cap offers growth potential');
    }
    if (company.costs?.aisc_last_year && company.costs.aisc_last_year < 1200) {
      matchReasons.push(`Low cost producer at $${company.costs.aisc_last_year}/oz AISC`);
    }

    // Create enhanced match with calculated values
    const enhancedMatch: EnhancedCompanyMatch = {
      ...baseData,
      matchScore: Math.round(Math.max(0, Math.min(100, basicScore))), // Ensure 0-100 range
      matchReasons: matchReasons.length > 0 ? matchReasons : ['Company data available for analysis'],
      rankPosition: index + 1,
      interestAlignment: {},
      riskAlignment: {
        score: Math.round(basicScore * 0.8), // Slightly lower than match score
        reasons: ['Risk assessment based on available data']
      },
      financialStrength: {
        score: Math.round(basicScore * 0.7), // Even more conservative
        reasons: ['Financial data under review']
      }
    };

    debugLog(`Successfully transformed company: ${company.company_name}`, {
      id: enhancedMatch.id,
      name: enhancedMatch.name,
      matchScore: enhancedMatch.matchScore
    });

    return enhancedMatch;
  } catch (error) {
    debugLog(`Error transforming company: ${company.company_name}`, error);
    
    // Return a minimal valid company match even on error
    return {
      id: String(company.company_id || Math.random()),
      name: company.company_name || 'Unknown Company',
      tsxCode: company.tsx_code || null,
      status: 'other',
      logo: null,
      sharePrice: null,
      marketCap: null,
      production: null,
      description: 'Company data temporarily unavailable',
      jurisdiction: null,
      recentNews: [],
      analystRating: null,
      matchedInterests: [],
      scoreForPrimaryInterest: '0',
      minerals_of_interest: [],
      percent_gold: null,
      percent_silver: null,
      enterpriseValue: null,
      cashPosition: null,
      debtToEquity: null,
      esgScore: null,
      reserves: null,
      resources: null,
      f_free_cash_flow: null,
      f_price_to_book: null,
      f_enterprise_to_ebitda: null,
      f_peg_ratio: null,
      c_aisc_last_year: null,
      p_reserve_life_years: null,
      me_measured_indicated_total_aueq_moz: null,
      vm_ev_per_resource_oz_all: null,
      vm_ev_per_reserve_oz_all: null,
      detailsPageId: String(company.company_id || Math.random()),
      matchScore: 25,
      matchReasons: ['Limited data available'],
      rankPosition: index + 1,
      interestAlignment: {},
      riskAlignment: { score: 25, reasons: ['Data incomplete'] },
      financialStrength: { score: 25, reasons: ['Data incomplete'] }
    };
  }
};

// Main enhanced matching function
export const getEnhancedMatchedCompanies = (
  companies: Company[],
  selectedInterests: { id: string; weight: number }[],
  riskProfile: RiskProfile | null,
  interestProfiles: InterestProfile[],
  maxResults: number = 20,
  customWeights?: Partial<ScoringWeights>
): EnhancedCompanyMatch[] => {
  if (!companies.length || !selectedInterests.length || !riskProfile) {
    debugLog('Invalid input: missing companies, interests, or risk profile', {
      companiesCount: companies.length,
      interestsCount: selectedInterests.length,
      hasRiskProfile: !!riskProfile
    });
    return [];
  }

  const weights = { ...DEFAULT_SCORING_WEIGHTS, ...customWeights };

  const validCompanies = companies.map((company, index) => transformCompanyToEnhancedMatch(company, index)).filter(company => {
    const { isValid, errors } = validateCompanyData(company);
    if (!isValid) {
      debugLog(`Invalid company data for ${company.name || 'unknown'}`, {
        errors,
        company: {
          id: company.id,
          name: company.name,
          minerals_of_interest: company.minerals_of_interest,
          status: company.status,
          marketCap: company.marketCap
        }
      });
    }
    return isValid;
  });

  if (!validCompanies.length) {
    debugLog('No valid companies after validation', { originalCount: companies.length });
    return [];
  }

  const scoredCompanies: EnhancedCompanyMatch[] = validCompanies.map(company => {
    const interestAlignment = calculateInterestAlignment(company, selectedInterests, interestProfiles);
    const riskAlignment = calculateRiskAlignment(company, riskProfile);
    const financialStrength = calculateFinancialStrength(company);
    const operationalMetrics = calculateOperationalMetrics(company);
    const esgFactors = calculateESGFactors(company);

    const overallScore = (
      interestAlignment.score * weights.interestAlignment +
      riskAlignment.score * weights.riskAlignment +
      financialStrength.score * weights.financialHealth +
      operationalMetrics.score * weights.operationalMetrics +
      esgFactors.score * weights.esgFactors
    );

    const allReasons = [
      ...interestAlignment.reasons,
      ...riskAlignment.reasons,
      ...financialStrength.reasons,
      ...operationalMetrics.reasons,
      ...esgFactors.reasons
    ];

    const enhancedMatch: EnhancedCompanyMatch = {
      ...company,
      matchScore: Math.round(overallScore),
      matchReasons: allReasons.slice(0, 4),
      rankPosition: 0,
      interestAlignment: interestAlignment.breakdown,
      riskAlignment: {
        score: Math.round(riskAlignment.score),
        reasons: riskAlignment.reasons
      },
      financialStrength: {
        score: Math.round(financialStrength.score),
        reasons: financialStrength.reasons
      }
    };

    return enhancedMatch;
  });

  const sortedCompanies = scoredCompanies
    .sort((a, b) => {
      const scoreDiff = b.matchScore - a.matchScore;
      return scoreDiff !== 0 ? scoreDiff : Math.random() - 0.5; // Randomize to avoid alphabetical bias
    })
    .slice(0, maxResults)
    .map((company, index) => ({
      ...company,
      rankPosition: index + 1
    }));

  debugLog('Processed companies', {
    inputCount: companies.length,
    validCount: validCompanies.length,
    outputCount: sortedCompanies.length,
    topMatch: sortedCompanies[0] ? {
      name: sortedCompanies[0].name,
      matchScore: sortedCompanies[0].matchScore,
      reasons: sortedCompanies[0].matchReasons
    } : null
  });

  return sortedCompanies;
};

// Helper function to get match explanation for a specific company
export const getMatchExplanation = (
  company: EnhancedCompanyMatch,
  selectedInterests: { id: string; weight: number }[],
  riskProfile: RiskProfile,
  interestProfiles: InterestProfile[]
): string => {
  const topReasons = company.matchReasons.slice(0, 3);
  const interestNames = selectedInterests
    .map(si => interestProfiles.find(ip => ip.id === si.id)?.name)
    .filter(Boolean)
    .join(', ');

  let explanation = `This company ranks #${company.rankPosition} with a ${company.matchScore}% match score based on your interests in ${interestNames} and ${riskProfile.riskTolerance}% risk tolerance.\n\n`;
  
  explanation += 'Key match factors:\n';
  topReasons.forEach((reason, index) => {
    explanation += `${index + 1}. ${reason}\n`;
  });

  if (company.riskAlignment.score > 70) {
    explanation += `\nRisk alignment is strong (${company.riskAlignment.score}%) - this investment matches your risk profile well.`;
  }

  return explanation;
};

// Export utility function to check if enhanced matching is available
export const isEnhancedMatchingAvailable = (
  companies: Company[]
): boolean => {
  const isAvailable = companies.length > 0 && companies.some(c => 
    c.financials?.market_cap_value !== undefined || 
    c.status !== undefined || 
    c.minerals_of_interest !== undefined
  );
  debugLog('Enhanced matching availability check', { isAvailable, companyCount: companies.length });
  return isAvailable;
};