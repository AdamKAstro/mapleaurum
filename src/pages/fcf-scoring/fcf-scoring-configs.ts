// src/pages/fcf-scoring/fcf-scoring-configs.ts
import type { CompanyStatus } from '@/lib/types';
import type { FCFScoringConfigs, CompanyTypeRationale } from './types';

export const FCF_SCORING_CONFIGS: FCFScoringConfigs = {
    explorer: {
        'financials.free_cash_flow': 30,
        'financials.cash_value': 25,
        'capital_structure.fully_diluted_shares': 15,
        'mineral_estimates.potential_total_aueq_moz': 15,
        'mineral_estimates.measured_indicated_total_aueq_moz': 10,
        'costs.construction_costs': 5
    },
    developer: {
        'financials.free_cash_flow': 25,
        'financials.enterprise_value_value': 20,
        'mineral_estimates.mineable_total_aueq_moz': 20,
        'financials.debt_value': 15,
        'costs.construction_costs': 10,
        'production.future_production_total_aueq_koz': 10
    },
    producer: {
        'financials.free_cash_flow': 30,
        'company-overview.share_price': 15,
        'financials.enterprise_value_value': 15,
        'costs.aisc_last_year': 20,
        'production.reserve_life_years': 10,
        'mineral_estimates.reserves_total_aueq_moz': 10
    },
    royalty: {
        'financials.free_cash_flow': 30,
        'financials.enterprise_value_value': 20,
        'mineral_estimates.reserves_precious_aueq_moz': 15,
        'production.current_production_precious_aueq_koz': 15,
        'financials.net_financial_assets': 10,
        'costs.aisc_last_year': 10
    },
    other: {
        'financials.free_cash_flow': 25,
        'financials.enterprise_value_value': 20,
        'financials.cash_value': 20,
        'capital_structure.fully_diluted_shares': 15,
        'financials.debt_value': 10,
        'mineral_estimates.measured_indicated_total_aueq_moz': 10
    }
};

export const FCF_METRIC_RATIONALES: Record<CompanyStatus, CompanyTypeRationale> = {
    explorer: {
        companyType: 'explorer',
        overallApproach: "Explorers typically have negative FCF due to high exploration costs. The scoring emphasizes survival metrics (cash runway) and dilution risk while assessing discovery potential.",
        keyPriorities: ["Cash preservation", "Minimal dilution", "Discovery upside", "Capital efficiency"],
        metrics: [
            {
                metricKey: 'financials.free_cash_flow',
                weight: 30,
                reasoning: "FCF is usually negative for explorers. A 30% weight reflects the critical need to monitor burn rate. Lower negative values (closer to breakeven) score higher, indicating better capital discipline.",
                whatToLookFor: "Improving FCF trend, reduced burn rate, movement toward cash flow neutrality",
                redFlags: ["Accelerating cash burn", "FCF worse than -$20M annually", "No path to positive FCF"],
                greenFlags: ["FCF improving year-over-year", "Burn rate under $10M annually", "Strategic spending on high-priority targets"]
            },
            {
                metricKey: 'financials.cash_value',
                weight: 25,
                reasoning: "Cash is the lifeline for explorers. A 25% weight prioritizes companies with strong balance sheets that can fund exploration without excessive dilution.",
                whatToLookFor: "At least 18-24 months of cash runway based on current burn rate",
                redFlags: ["Less than 12 months runway", "Declining cash with no financing secured", "Cash under $5M"],
                greenFlags: ["Over 24 months runway", "Recent financing at good terms", "Cash over $20M"]
            },
            {
                metricKey: 'capital_structure.fully_diluted_shares',
                weight: 15,
                reasoning: "Lower share count is better. Explorers often dilute shareholders through equity raises. This metric penalizes excessive dilution.",
                whatToLookFor: "Tight share structure under 200M shares, minimal warrant overhang",
                redFlags: ["Over 500M fully diluted shares", "Massive warrant overhang", "History of excessive dilution"],
                greenFlags: ["Under 100M shares", "Management owns >10%", "Strategic investors participating"]
            },
            {
                metricKey: 'mineral_estimates.potential_total_aueq_moz',
                weight: 15,
                reasoning: "Captures the blue-sky potential that drives explorer valuations. Includes inferred and exploration target ounces.",
                whatToLookFor: "Large exploration potential relative to market cap, quality targets",
                redFlags: ["Limited exploration upside", "Poor grade potential", "Difficult metallurgy indicated"],
                greenFlags: ["Multiple Moz potential", "High-grade discoveries", "District-scale opportunity"]
            },
            {
                metricKey: 'mineral_estimates.measured_indicated_total_aueq_moz',
                weight: 10,
                reasoning: "M&I resources provide higher confidence than inferred. Shows progress in defining economic mineralization.",
                whatToLookFor: "Growing M&I resource base, conversion from inferred categories",
                redFlags: ["No M&I resources after years of drilling", "Declining resources", "Poor conversion rates"],
                greenFlags: ["Rapidly growing M&I", "High-grade M&I core", "Good conversion from drilling"]
            },
            {
                metricKey: 'costs.construction_costs',
                weight: 5,
                reasoning: "Low weight (5%) as most explorers are far from construction. Indicates future capital requirements if development proceeds.",
                whatToLookFor: "Reasonable capex estimates under $500M for future development",
                redFlags: ["Capex over $1B", "Rising cost estimates", "Infrastructure challenges"],
                greenFlags: ["Sub-$300M capex potential", "Simple metallurgy", "Good infrastructure access"]
            }
        ]
    },
    developer: {
        companyType: 'developer',
        overallApproach: "Developers are transitioning to production. FCF is still typically negative but improving. Focus shifts to project economics, funding capability, and construction progress.",
        keyPriorities: ["Project funding", "Construction efficiency", "Debt management", "Production timeline"],
        metrics: [
            {
                metricKey: 'financials.free_cash_flow',
                weight: 25,
                reasoning: "FCF weight reduced to 25% as developers are pre-production. Focus is on minimizing burn while advancing construction.",
                whatToLookFor: "Controlled burn rate, clear path to positive FCF post-production",
                redFlags: ["Burn exceeding budget", "No clear FCF positive timeline", "Cost overruns"],
                greenFlags: ["On-budget spending", "FCF positive in <2 years", "Strong project economics"]
            },
            {
                metricKey: 'financials.enterprise_value_value',
                weight: 20,
                reasoning: "EV captures both equity and debt financing. Lower EV relative to project NPV indicates undervaluation.",
                whatToLookFor: "EV significantly below project NPV, reasonable EV/resource ratios",
                redFlags: ["EV exceeds NPV", "Excessive market cap for pre-production", "High EV per resource ounce"],
                greenFlags: ["EV at 0.5x NPV or less", "Modest valuation", "EV under $100/oz resource"]
            },
            {
                metricKey: 'mineral_estimates.mineable_total_aueq_moz',
                weight: 20,
                reasoning: "Mineable ounces (reserves + resources) indicate project scale and economic viability. Higher is better for long mine life.",
                whatToLookFor: "Robust mineable resources supporting 10+ year mine life",
                redFlags: ["Short mine life under 7 years", "Low confidence in resources", "Marginal economics"],
                greenFlags: ["15+ year mine life", "High-confidence reserves", "Excellent strip ratios"]
            },
            {
                metricKey: 'financials.debt_value',
                weight: 15,
                reasoning: "Debt is common for project financing but high levels increase risk. Lower debt scores higher.",
                whatToLookFor: "Manageable debt levels under 50% of capex, favorable terms",
                redFlags: ["Debt over 70% of capex", "High interest rates", "Aggressive covenants"],
                greenFlags: ["Conservative debt under 40%", "Low interest rates", "Flexible terms"]
            },
            {
                metricKey: 'costs.construction_costs',
                weight: 10,
                reasoning: "Lower construction costs improve project returns and reduce financing needs.",
                whatToLookFor: "Capex in line with feasibility study, no major overruns expected",
                redFlags: ["Capex inflation over 20%", "Complex construction", "Remote location challenges"],
                greenFlags: ["Capex under budget", "Simple construction", "Experienced contractors"]
            },
            {
                metricKey: 'production.future_production_total_aueq_koz',
                weight: 10,
                reasoning: "Projected production indicates future cash generation potential. Higher production supports faster payback.",
                whatToLookFor: "Annual production over 200k oz AuEq, consistent production profile",
                redFlags: ["Under 100k oz annually", "Declining production profile", "Complex ore blending"],
                greenFlags: ["Over 300k oz annually", "Growing production", "Simple mining plan"]
            }
        ]
    },
    producer: {
        companyType: 'producer',
        overallApproach: "Producers generate positive FCF and are valued on cash generation ability. Focus on FCF yield, operational efficiency, and sustainability of cash flows.",
        keyPriorities: ["FCF generation", "Cost control", "Reserve life", "Capital allocation"],
        metrics: [
            {
                metricKey: 'financials.free_cash_flow',
                weight: 30,
                reasoning: "FCF is the primary value driver for producers. 30% weight reflects its dominance in assessing financial health and shareholder returns.",
                whatToLookFor: "Strong and growing FCF, high FCF margins, consistent generation",
                redFlags: ["Declining FCF", "FCF margin under 10%", "Volatile cash generation"],
                greenFlags: ["FCF margin over 30%", "Growing FCF", "FCF exceeding capex + dividends"]
            },
            {
                metricKey: 'company-overview.share_price',
                weight: 15,
                reasoning: "Share price enables FCF/Price yield calculation. Lower prices relative to FCF indicate better value.",
                whatToLookFor: "FCF yield over 10% (FCF/Market Cap), undervaluation vs peers",
                redFlags: ["FCF yield under 5%", "Premium valuation", "Declining share price with falling FCF"],
                greenFlags: ["FCF yield over 15%", "Discount to NAV", "Share price lagging FCF growth"]
            },
            {
                metricKey: 'financials.enterprise_value_value',
                weight: 15,
                reasoning: "EV enables FCF/EV calculation for total capital efficiency. Complements FCF/Price for complete valuation picture.",
                whatToLookFor: "FCF/EV yield over 8%, reasonable EV/EBITDA multiples",
                redFlags: ["FCF/EV under 4%", "EV/EBITDA over 10x", "High debt component of EV"],
                greenFlags: ["FCF/EV over 12%", "EV/EBITDA under 5x", "Net cash position"]
            },
            {
                metricKey: 'costs.aisc_last_year',
                weight: 20,
                reasoning: "AISC directly impacts margins and FCF. Lower costs provide cushion against metal price volatility.",
                whatToLookFor: "AISC under $1,200/oz gold, improving cost trend, peer-leading costs",
                redFlags: ["AISC over $1,500/oz", "Rising cost trend", "Costs above peer average"],
                greenFlags: ["AISC under $1,000/oz", "Declining costs", "First quartile costs"]
            },
            {
                metricKey: 'production.reserve_life_years',
                weight: 10,
                reasoning: "Longer reserve life ensures sustainable FCF generation. 10+ years provides confidence in long-term cash flows.",
                whatToLookFor: "Reserve life over 10 years, stable or growing through exploration",
                redFlags: ["Under 5 years remaining", "Declining reserves", "No exploration success"],
                greenFlags: ["Over 15 years", "Reserve replacement exceeding depletion", "Low-cost reserve additions"]
            },
            {
                metricKey: 'mineral_estimates.reserves_total_aueq_moz',
                weight: 10,
                reasoning: "Total reserves indicate production capacity and company scale. Larger reserve base supports consistent operations.",
                whatToLookFor: "Reserves supporting current production rate, quality over quantity",
                redFlags: ["Declining reserves", "Low-grade reserves", "Geopolitical risks to reserves"],
                greenFlags: ["Growing reserves", "High-grade core", "Reserves in safe jurisdictions"]
            }
        ]
    },
    royalty: {
        companyType: 'royalty',
        overallApproach: "Royalty companies have minimal costs and stable FCF. Valuation focuses on FCF yield, portfolio quality, and growth potential through new royalty acquisitions.",
        keyPriorities: ["FCF stability", "Portfolio diversification", "Operator quality", "Growth pipeline"],
        metrics: [
            {
                metricKey: 'financials.free_cash_flow',
                weight: 30,
                reasoning: "Royalty companies are pure FCF plays with minimal operating costs. 30% weight reflects FCF as the core investment thesis.",
                whatToLookFor: "Stable and growing FCF, high FCF conversion from revenue",
                redFlags: ["Volatile FCF", "Declining cash flows", "High corporate costs"],
                greenFlags: ["Steadily growing FCF", "95%+ FCF conversion", "Low G&A costs"]
            },
            {
                metricKey: 'financials.enterprise_value_value',
                weight: 20,
                reasoning: "EV/FCF is the key valuation metric for royalties. Lower multiples indicate better value.",
                whatToLookFor: "EV/FCF multiple under 15x, discount to streaming peers",
                redFlags: ["EV/FCF over 25x", "Premium to peers", "High debt levels"],
                greenFlags: ["EV/FCF under 12x", "Discount valuation", "Net cash position"]
            },
            {
                metricKey: 'mineral_estimates.reserves_precious_aueq_moz',
                weight: 15,
                reasoning: "Underlying reserves from operating partners drive long-term royalty value.",
                whatToLookFor: "Large reserve base from quality operators, reserve growth over time",
                redFlags: ["Declining partner reserves", "Single asset concentration", "Operator issues"],
                greenFlags: ["Growing reserves", "Diversified portfolio", "Tier-1 operators"]
            },
            {
                metricKey: 'production.current_production_precious_aueq_koz',
                weight: 15,
                reasoning: "Current production generates immediate cash flow. Higher and stable production is preferred.",
                whatToLookFor: "Steady or growing production, diversified asset contribution",
                redFlags: ["Declining production", "Concentration risk", "Operator production issues"],
                greenFlags: ["Record production", "Balanced portfolio", "Multiple growth assets"]
            },
            {
                metricKey: 'financials.net_financial_assets',
                weight: 10,
                reasoning: "Strong balance sheet enables new royalty acquisitions and provides financial flexibility.",
                whatToLookFor: "Net cash position or minimal debt, available capital for deals",
                redFlags: ["High debt levels", "Limited liquidity", "Covenant restrictions"],
                greenFlags: ["Significant net cash", "Undrawn credit facility", "Recent equity raise"]
            },
            {
                metricKey: 'costs.aisc_last_year',
                weight: 10,
                reasoning: "Operator AISC affects royalty margins indirectly. Lower operator costs improve asset longevity.",
                whatToLookFor: "Operators with AISC under $1,200/oz, improving cost profiles",
                redFlags: ["Operators with high costs", "Rising AISC trends", "Marginal operations"],
                greenFlags: ["Low-cost operators", "First quartile assets", "Long mine lives"]
            }
        ]
    },
    other: {
        companyType: 'other',
        overallApproach: "Generic scoring for companies that don't fit standard categories. Balanced approach focusing on financial health and value metrics.",
        keyPriorities: ["Financial stability", "Valuation", "Capital efficiency", "Asset quality"],
        metrics: [
            {
                metricKey: 'financials.free_cash_flow',
                weight: 25,
                reasoning: "FCF remains important for any mining company. 25% provides balanced emphasis.",
                whatToLookFor: "Positive or improving FCF, sustainable cash generation",
                redFlags: ["Persistent negative FCF", "No clear path to profitability", "High cash burn"],
                greenFlags: ["Positive FCF", "Growing cash generation", "Strong margins"]
            },
            {
                metricKey: 'financials.enterprise_value_value',
                weight: 20,
                reasoning: "EV provides complete valuation picture including debt. Enables cross-category comparisons.",
                whatToLookFor: "Reasonable EV relative to assets and cash flow",
                redFlags: ["Excessive valuation", "High EV/resource ratios", "Mostly debt funded"],
                greenFlags: ["Conservative valuation", "EV below replacement cost", "Strong equity component"]
            },
            {
                metricKey: 'financials.cash_value',
                weight: 20,
                reasoning: "Cash provides flexibility and downside protection. Important for companies in transition.",
                whatToLookFor: "Adequate cash for operations and growth plans",
                redFlags: ["Low cash levels", "Burning cash quickly", "No access to capital"],
                greenFlags: ["Strong cash position", "Recent financing", "Multiple funding options"]
            },
            {
                metricKey: 'capital_structure.fully_diluted_shares',
                weight: 15,
                reasoning: "Share structure impacts per-share metrics. Lower is better to avoid dilution.",
                whatToLookFor: "Reasonable share count, limited dilution potential",
                redFlags: ["Excessive shares outstanding", "Major warrant overhang", "History of dilution"],
                greenFlags: ["Tight structure", "Insider ownership", "Limited warrants/options"]
            },
            {
                metricKey: 'financials.debt_value',
                weight: 10,
                reasoning: "Debt levels affect financial flexibility. Lower debt reduces risk.",
                whatToLookFor: "Manageable debt levels, favorable terms",
                redFlags: ["High debt/equity ratio", "Near-term maturities", "Covenant pressure"],
                greenFlags: ["Low or no debt", "Long-term maturities", "Investment grade rating"]
            },
            {
                metricKey: 'mineral_estimates.measured_indicated_total_aueq_moz',
                weight: 10,
                reasoning: "M&I resources provide asset base valuation floor. Quality assets support value.",
                whatToLookFor: "Meaningful resource base, good grades and location",
                redFlags: ["Limited resources", "Low grades", "Challenging jurisdictions"],
                greenFlags: ["Large M&I base", "High grades", "Tier-1 jurisdictions"]
            }
        ]
    }
};

export function getFCFMetricsForCompanyType(companyType: CompanyStatus): string[] {
    return Object.keys(FCF_SCORING_CONFIGS[companyType] || FCF_SCORING_CONFIGS.other);
}

export function getMetricRationale(companyType: CompanyStatus, metricKey: string): MetricRationale | undefined {
    const rationale = FCF_METRIC_RATIONALES[companyType];
    if (!rationale) return undefined;
    return rationale.metrics.find(m => m.metricKey === metricKey);
}