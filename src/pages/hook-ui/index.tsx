//src/pages/hook-ui/index.tsx
import React, { useState } from 'react';
import PlayingCard from '../../components/playing-card';
import InterestSelector from '../../components/onboarding-steps/interest-selector';
import RiskProfilePlaceholder from '../../components/onboarding-steps/risk-profile-placeholder'; // Import placeholder
import { Company, CompanyStatus } from '../../lib/types';

// Mock company data for initial display
// (Keep the existing mockCompanies array as is, but we'll add new fields to its items)
const mockCompanies: Company[] = [
  {
    company_id: 1,
    company_name: 'Gold Rush Corp.',
    tsx_code: 'GRC',
    status: 'producer' as CompanyStatus,
    headquarters: 'Toronto, ON',
    description: 'A leading gold producer in North America.',
    minerals_of_interest: ['Gold', 'Silver'],
    percent_gold: 80,
    percent_silver: 20,
    share_price: 15.50,
    share_price_currency_actual: 'CAD',
    financials: { /* ... existing financials ... */
      cash_value: 100000000, market_cap_value: 1200000000, market_cap_currency: 'CAD', enterprise_value_value: 1300000000, net_financial_assets: 50000000, free_cash_flow: 75000000, price_to_book: 2.5, price_to_sales: 3.1, enterprise_to_revenue: 3.5, enterprise_to_ebitda: 8.0, trailing_pe: 15.0, forward_pe: 12.0, revenue_value: 400000000, ebitda: 150000000, net_income_value: 80000000, debt_value: 100000000, shares_outstanding: 77419354, peg_ratio: 1.2, cost_of_revenue: 200000000, gross_profit: 200000000, operating_expense: 50000000, operating_income: 150000000, liabilities: 200000000, other_financial_assets: 0, other_financial_assets_currency: 'CAD',
    },
    capital_structure: { /* ... existing capital_structure ... */
      existing_shares: 77000000, fully_diluted_shares: 80000000, in_the_money_options: 3000000, options_revenue: 5000000, options_revenue_currency: 'CAD',
    },
    mineral_estimates: { /* ... existing mineral_estimates ... */
      reserves_total_aueq_moz: 5.0, measured_indicated_total_aueq_moz: 10.0, resources_total_aueq_moz: 15.0, potential_total_aueq_moz: 20.0, reserves_precious_aueq_moz: 4.0, measured_indicated_precious_aueq_moz: 8.0, resources_precious_aueq_moz: 12.0, reserves_non_precious_aueq_moz: 1.0, measured_indicated_non_precious_aueq_moz: 2.0, resources_non_precious_aueq_moz: 3.0, potential_non_precious_aueq_moz: 3.0, mineable_total_aueq_moz: 9.0, mineable_precious_aueq_moz: 7.0, mineable_non_precious_aueq_moz: 2.0, potential_precious_aueq_moz: 15.0,
    },
    valuation_metrics: { /* ... existing valuation_metrics ... */
      ev_per_resource_oz_all: 86.67, ev_per_reserve_oz_all: 260, mkt_cap_per_resource_oz_all: 80, mkt_cap_per_reserve_oz_all: 240, ev_per_resource_oz_precious: 108.33, ev_per_reserve_oz_precious: 325, mkt_cap_per_resource_oz_precious: 100, mkt_cap_per_reserve_oz_precious: 300, ev_per_mi_oz_all: 130, ev_per_mi_oz_precious: 162.5, ev_per_mineable_oz_all: 144.44, ev_per_mineable_oz_precious: 185.71, ev_per_production_oz: 0, mkt_cap_per_mi_oz_all: 120, mkt_cap_per_mi_oz_precious: 150, mkt_cap_per_mineable_oz_all: 133.33, mkt_cap_per_mineable_oz_precious: 171.43, mkt_cap_per_production_oz: 0,
    },
    production: { /* ... existing production ... */
      current_production_total_aueq_koz: 300, future_production_total_aueq_koz: 350, reserve_life_years: 16, current_production_precious_aueq_koz: 280, current_production_non_precious_aueq_koz: 20,
    },
    costs: { /* ... existing costs ... */
      aisc_future: 900, construction_costs: 0, tco_future: 1000, aisc_last_quarter: 950, aisc_last_year: 920, aic_last_quarter: 1050, aic_last_year: 1020, tco_current: 1100,
    },
    // New fields for PlayingCardData
    logo: undefined, // Let it use default
    recentNews: ["New drill results expand mineralization by 25%", "Acquired adjacent property with high potential"],
    analystRating: "Strong Buy",
    matchedInterests: ['Max Potential Returns', 'High Cash Flow Generators'], // Example
    scoreForPrimaryInterest: 85, // Example
  },
  {
    company_id: 2,
    company_name: 'Silver Streak Mines',
    tsx_code: 'SSM',
    status: 'explorer' as CompanyStatus,
    headquarters: 'Vancouver, BC',
    description: 'Exploring high-grade silver deposits.',
    minerals_of_interest: ['Silver', 'Lead', 'Zinc'],
    percent_gold: 5,
    percent_silver: 85,
    share_price: 2.30,
    share_price_currency_actual: 'CAD',
    financials: { /* ... existing financials ... */
      cash_value: 20000000, market_cap_value: 150000000, market_cap_currency: 'CAD', enterprise_value_value: 140000000, net_financial_assets: 10000000, free_cash_flow: -5000000, price_to_book: 1.8, price_to_sales: null, enterprise_to_revenue: null, enterprise_to_ebitda: null, trailing_pe: null, forward_pe: null, revenue_value: 0, ebitda: -2000000, net_income_value: -3000000, debt_value: 10000000, shares_outstanding: 65217391, peg_ratio: null, cost_of_revenue: 0, gross_profit: 0, operating_expense: 3000000, operating_income: -3000000, liabilities: 15000000, other_financial_assets: 0, other_financial_assets_currency: 'CAD',
    },
    capital_structure: { /* ... existing capital_structure ... */
      existing_shares: 65000000, fully_diluted_shares: 68000000, in_the_money_options: 1000000, options_revenue: 1000000, options_revenue_currency: 'CAD',
    },
    mineral_estimates: { /* ... existing mineral_estimates ... */
      reserves_total_aueq_moz: 0, measured_indicated_total_aueq_moz: 2.0, resources_total_aueq_moz: 8.0, potential_total_aueq_moz: 25.0, reserves_precious_aueq_moz: 0, measured_indicated_precious_aueq_moz: 1.8, resources_precious_aueq_moz: 7.0, potential_precious_aueq_moz: 20.0, reserves_non_precious_aueq_moz: 0, measured_indicated_non_precious_aueq_moz: 0.2, resources_non_precious_aueq_moz: 1.0, potential_non_precious_aueq_moz: 5.0, mineable_total_aueq_moz: 0, mineable_precious_aueq_moz: 0, mineable_non_precious_aueq_moz: 0,
    },
    valuation_metrics: { /* ... existing valuation_metrics ... */
      ev_per_resource_oz_all: 17.5, ev_per_reserve_oz_all: null, mkt_cap_per_resource_oz_all: 18.75, mkt_cap_per_reserve_oz_all: null, ev_per_resource_oz_precious: 20, ev_per_reserve_oz_precious: null, mkt_cap_per_resource_oz_precious: 21.43, mkt_cap_per_reserve_oz_precious: null, ev_per_mi_oz_all: 70, ev_per_mi_oz_precious: 77.78, ev_per_mineable_oz_all: null, ev_per_mineable_oz_precious: null, ev_per_production_oz: null, mkt_cap_per_mi_oz_all: 75, mkt_cap_per_mi_oz_precious: 83.33, mkt_cap_per_mineable_oz_all: null, mkt_cap_per_mineable_oz_precious: null, mkt_cap_per_production_oz: null,
    },
    production: { /* ... existing production ... */
      current_production_total_aueq_koz: 0, future_production_total_aueq_koz: 0, reserve_life_years: 0, current_production_precious_aueq_koz: 0, current_production_non_precious_aueq_koz: 0,
    },
    costs: { /* ... existing costs ... */
      aisc_future: null, construction_costs: null, tco_future: null, aisc_last_quarter: null, aisc_last_year: null, aic_last_quarter: null, aic_last_year: null, tco_current: null,
    },
    // New fields for PlayingCardData
    logo: 'https://example.com/silverstreak-logo.png', // Placeholder actual logo
    recentNews: ["High-grade silver intercepts continue", "Geophysical survey identifies new targets"],
    analystRating: "Speculative Buy",
    matchedInterests: ['Speculative Exploration', 'High-Grade Discoveries'], // Example
    scoreForPrimaryInterest: 78, // Example
  },
  {
    company_id: 3,
    company_name: 'Developer One Ltd.',
    tsx_code: 'DVL',
    status: 'developer' as CompanyStatus,
    headquarters: 'Calgary, AB',
    description: 'Developing a large copper-gold project.',
    minerals_of_interest: ['Copper', 'Gold'],
    percent_gold: 40,
    percent_silver: 0, // Assuming no significant silver
    share_price: 5.75,
    share_price_currency_actual: 'CAD',
    financials: {
        cash_value: 50000000,
        market_cap_value: 400000000,
        market_cap_currency: 'CAD',
        enterprise_value_value: 420000000,
        net_financial_assets: 30000000,
        free_cash_flow: -10000000, // Negative FCF for developers
        price_to_book: 2.2,
        price_to_sales: null,
        enterprise_to_revenue: null,
        enterprise_to_ebitda: null,
        trailing_pe: null,
        forward_pe: null,
        revenue_value: 0,
        ebitda: -5000000,
        net_income_value: -8000000,
        debt_value: 20000000,
        shares_outstanding: 69565217,
        peg_ratio: null,
        cost_of_revenue: 0,
        gross_profit: 0,
        operating_expense: 8000000,
        operating_income: -8000000,
        liabilities: 30000000,
        other_financial_assets: 0,
        other_financial_assets_currency: 'CAD',
    },
    capital_structure: {
        existing_shares: 69000000,
        fully_diluted_shares: 72000000,
        in_the_money_options: 2000000,
        options_revenue: 3000000,
        options_revenue_currency: 'CAD',
    },
    mineral_estimates: {
        reserves_total_aueq_moz: 3.0, // Developers may have some reserves
        measured_indicated_total_aueq_moz: 8.0,
        resources_total_aueq_moz: 12.0,
        potential_total_aueq_moz: 18.0,
        reserves_precious_aueq_moz: 1.2, // Gold portion of reserves
        measured_indicated_precious_aueq_moz: 3.2, // Gold portion of M&I
        resources_precious_aueq_moz: 4.8, // Gold portion of Resources
        potential_precious_aueq_moz: 7.2,
        reserves_non_precious_aueq_moz: 1.8, // Copper portion
        measured_indicated_non_precious_aueq_moz: 4.8,
        resources_non_precious_aueq_moz: 7.2,
        potential_non_precious_aueq_moz: 10.8,
        mineable_total_aueq_moz: 7.0,
        mineable_precious_aueq_moz: 2.8,
        mineable_non_precious_aueq_moz: 4.2,
    },
    valuation_metrics: {
        ev_per_resource_oz_all: 35,
        ev_per_reserve_oz_all: 140,
        mkt_cap_per_resource_oz_all: 33.33,
        mkt_cap_per_reserve_oz_all: 133.33,
        ev_per_resource_oz_precious: 87.5,
        ev_per_reserve_oz_precious: 350,
        mkt_cap_per_resource_oz_precious: 83.33,
        mkt_cap_per_reserve_oz_precious: 333.33,
        ev_per_mi_oz_all: 52.5,
        ev_per_mi_oz_precious: 131.25,
        ev_per_mineable_oz_all: 60,
        ev_per_mineable_oz_precious: 150,
        ev_per_production_oz: null, // Not yet in production
        mkt_cap_per_mi_oz_all: 50,
        mkt_cap_per_mi_oz_precious: 125,
        mkt_cap_per_mineable_oz_all: 57.14,
        mkt_cap_per_mineable_oz_precious: 142.86,
        mkt_cap_per_production_oz: null,
    },
    production: {
        current_production_total_aueq_koz: 0,
        future_production_total_aueq_koz: 150, // Expected future production
        reserve_life_years: 0, // Not yet in production
        current_production_precious_aueq_koz: 0,
        current_production_non_precious_aueq_koz: 0,
    },
    costs: {
        aisc_future: 850, // Projected AISC
        construction_costs: 200000000, // Significant for developers
        tco_future: 950,
        aisc_last_quarter: null,
        aisc_last_year: null,
        aic_last_quarter: null,
        aic_last_year: null,
        tco_current: null,
    },
  }
];


type OnboardingStage = 'interestSelection' | 'riskProfile' | 'showcase';

const HookUIPage: React.FC = () => {
  const [currentStage, setCurrentStage] = useState<OnboardingStage>('interestSelection');
  const [userInterests, setUserInterests] = useState<string[]>([]);

  const handleInterestsSelected = (selectedInterests: string[]) => {
    setUserInterests(selectedInterests);
    // Proceed to next step only if interests are actually selected.
    // The actual "Next" click is handled by a button now.
  };
  
  const advanceToRiskProfile = () => {
    if (userInterests.length > 0) {
      setCurrentStage('riskProfile');
    } else {
      // Optionally alert user or disable button if no interests are selected
      console.log("Please select at least one interest to proceed.");
    }
  };

  const advanceToShowcase = () => {
    // Logic for completing risk profile would go here
    // For now, just advance
    setCurrentStage('showcase');
  };

  const resetOnboarding = () => {
    setUserInterests([]);
    setCurrentStage('interestSelection');
  };

  const renderContent = () => {
    switch (currentStage) {
      case 'interestSelection':
        return (
          <>
            <header className="mb-8 text-center">
              <h1 className="text-4xl font-bold text-cyan-400">Welcome to MapleAurum!</h1>
              <p className="text-slate-300 mt-2">Let's personalize your journey into mining investments.</p>
            </header>
            <InterestSelector onSelectionChange={handleInterestsSelected} />
            {userInterests.length > 0 && (
              <div className="mt-6 text-center">
                <button
                  onClick={advanceToRiskProfile}
                  className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-8 rounded-lg transition-colors text-lg shadow-md hover:shadow-lg transform hover:scale-105"
                >
                  Next: Investor Profile
                </button>
              </div>
            )}
          </>
        );
      case 'riskProfile':
        return (
          <>
            <header className="mb-8 text-center">
              <h1 className="text-3xl font-bold text-cyan-400">Investor Profile</h1>
              <p className="text-slate-300 mt-2">Help us understand your investment preferences.</p>
               <button onClick={() => setCurrentStage('interestSelection')} className="mt-2 text-sm text-cyan-500 hover:text-cyan-400 underline">Back to Interests</button>
            </header>
            <RiskProfilePlaceholder onComplete={advanceToShowcase} />
          </>
        );
      case 'showcase':
        return (
          <>
            <header className="mb-8 text-center">
              <h1 className="text-4xl font-bold text-cyan-400">Your Curated Company Showcase</h1>
              <p className="text-slate-300">Based on your interests: {userInterests.join(', ')}</p>
              <button
                onClick={resetOnboarding}
                className="mt-4 text-sm text-cyan-400 hover:text-cyan-300 underline"
              >
                Start Over / Change Interests
              </button>
            </header>
            <div className="flex flex-wrap justify-center gap-6">
              {mockCompanies.map((company) => (
                <PlayingCard key={company.company_id} company={company} />
              ))}
              {mockCompanies.length === 0 && <p>No companies match your selected criteria yet.</p>}
            </div>
          </>
        );
      default:
        return <div>Error: Unknown onboarding stage.</div>;
    }
  };

  return (
    <div className="p-4 bg-navy-800 min-h-screen text-slate-100">
      {renderContent()}
      <div className="mt-12 text-center">
        <p className="text-slate-500 text-sm">
          {currentStage === 'showcase'
            ? "Explore the companies above or change your interests."
            : currentStage === 'interestSelection' 
            ? "Select your interests to get started."
            : "Complete your investor profile to see tailored company suggestions."
          }
        </p>
      </div>
    </div>
  );
};

export default HookUIPage;
