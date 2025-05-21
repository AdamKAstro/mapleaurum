// src/pages/help/metrics.tsx
import React, { useMemo } from 'react';
import { PageContainer } from '../../components/ui/page-container';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { metrics, metricCategories, MetricConfig } from '../../lib/metric-types';
import { ArrowUp, ArrowDown, Lock, Info } from 'lucide-react';
import { TierBadge } from '../../components/ui/tier-badge';
import { useFilters } from '../../contexts/filter-context';
import { isFeatureAccessible } from '../../lib/tier-utils';
import { cn } from '../../lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../components/ui/tooltip';

// Detailed and Rigorous Metric Descriptions
const detailedDescriptions: Record<string, string> = {
    // Top-Level Metrics
    'percent_gold': 'The percentage of a company’s total production or resources derived from gold, expressed as a proportion of gold-equivalent output. This metric is critical for investors prioritizing gold exposure, as it reflects the company’s focus on this precious metal relative to others (e.g., silver, copper). A higher percentage is generally preferred by gold-focused investors, as it aligns with strategies betting on gold price appreciation. However, its significance depends on market dynamics—e.g., during a silver bull market, a lower gold percentage might be advantageous. This metric is derived from production reports or resource estimates, typically standardized to gold-equivalent ounces to account for varying metal values. Context matters: a high percentage could indicate over-reliance on a single commodity, increasing risk if gold prices fall.',
    'percent_silver': 'The percentage of a company’s production or resources attributed to silver, calculated as a proportion of silver-equivalent or gold-equivalent output. This metric is essential for investors targeting silver exposure, given silver’s industrial and investment demand. A higher percentage is typically favored in silver-focused portfolios, especially during periods of strong silver price performance. Like percent_gold, it’s derived from production data or resource estimates, often normalized to account for price differences across metals. Investors should consider market trends (e.g., silver’s volatility) and the company’s diversification strategy—a high silver percentage may increase risk if silver prices stagnate. Comparing this metric across peers helps gauge a company’s silver emphasis.',
    'share_price': 'The most recent closing price of a company’s stock, quoted in dollars per share ($). This metric reflects the market’s current valuation of each share, driven by factors like earnings, growth prospects, and market sentiment. While a higher share price is often associated with market confidence or growth, it’s not inherently "better" without context. For example, a high price relative to earnings (high P/E ratio) may suggest overvaluation, while a low price could indicate undervaluation or distress. Share price alone is a starting point—investors must analyze it alongside valuation metrics (e.g., P/E, P/B) and market conditions to assess whether it reflects true value or speculative hype.',
    // Financials
    'financials.cash_value': 'The total cash and cash equivalents held by a company, reported in millions of dollars ($M). This metric, often sourced from the balance sheet, represents liquid assets available for operations, investments, or debt repayment. A higher cash balance enhances financial flexibility, allowing a company to fund exploration, acquisitions, or dividends without borrowing. However, excessive cash may signal underinvestment or lack of growth opportunities, while low cash raises liquidity concerns. In mining, cash reserves are critical to weather commodity price swings. Investors should compare this to debt and operational needs to gauge financial health.',
    'financials.market_cap_value': 'Market capitalization, calculated as the share price multiplied by the number of shares outstanding, reported in millions of dollars ($M). This metric represents the total equity value of a company as perceived by the market. A higher market cap typically indicates scale, stability, and investor confidence, making it attractive for conservative investors. However, smaller market caps may offer higher growth potential, albeit with greater risk. In mining, market cap reflects resource quality, production capacity, and market sentiment. It’s a key benchmark for comparing companies within the sector, though it should be paired with metrics like EV or P/B for valuation context.',
    'financials.enterprise_value_value': 'Enterprise value (EV), calculated as market capitalization plus total debt minus cash and cash equivalents, reported in millions of dollars ($M). EV provides a comprehensive measure of a company’s total value, accounting for both equity and debt financing. A higher EV may reflect a larger, more established firm, but high debt levels can inflate EV, signaling financial risk. In mining, EV is widely used to assess acquisition potential, as it approximates the cost to buy the company outright. Investors should analyze EV alongside revenue or EBITDA to evaluate whether the market’s valuation aligns with operational performance.',
    'financials.net_financial_assets': 'The difference between a company’s total financial assets (e.g., cash, investments) and total liabilities (e.g., debt, payables), reported in millions of dollars ($M). This metric, derived from the balance sheet, reflects the company’s net financial position or balance sheet strength. A higher (positive) value indicates greater financial resilience, providing a buffer against downturns or funding for growth. A negative value signals potential distress, especially if liabilities exceed assets. In mining, where capital intensity is high, this metric helps assess a company’s ability to sustain operations without excessive borrowing.',
    'financials.free_cash_flow': 'The cash generated by a company after deducting operating expenses and capital expenditures, reported in millions of dollars ($M). Free cash flow (FCF) is a key indicator of financial health, showing the cash available for dividends, debt repayment, or reinvestment. A higher FCF is strongly preferred, as it demonstrates operational efficiency and profitability, especially in capital-intensive industries like mining. Negative FCF may indicate heavy investment or operational challenges. Investors should track FCF trends over time and compare it to debt levels to evaluate sustainability.',
    'financials.price_to_book': 'The ratio of a company’s share price to its book value per share (P/B ratio), where book value is total assets minus liabilities. A lower P/B ratio is often preferred by value investors, as it suggests the stock is trading below its intrinsic asset value, potentially indicating undervaluation. However, a high P/B may be justified for growth companies with strong future prospects. In mining, P/B is useful for comparing companies with significant tangible assets (e.g., reserves). Sector norms and asset quality (e.g., proven vs. inferred resources) heavily influence this metric’s interpretation.',
    'financials.price_to_sales': 'The ratio of a company’s share price to its annual revenue per share (P/S ratio). A lower P/S ratio is typically favored, as it suggests the stock is undervalued relative to its sales, appealing to value investors. High P/S ratios are common in high-growth firms expecting future revenue increases. In mining, P/S helps assess whether the market is overpaying for a company’s production capacity. Investors should compare P/S to industry averages and consider revenue quality (e.g., stable vs. volatile commodity prices).',
    'financials.enterprise_to_revenue': 'The ratio of enterprise value to annual revenue (EV/Revenue). A lower ratio often indicates a company is undervalued relative to its sales, making it attractive for acquisitions or investment. High EV/Revenue ratios may reflect strong growth expectations or operational inefficiencies. In mining, this metric helps evaluate how the market values a company’s production relative to its total value (equity + debt). It’s particularly useful for comparing firms with different capital structures, though commodity price cycles must be considered.',
    'financials.enterprise_to_ebitda': 'The ratio of enterprise value to earnings before interest, taxes, depreciation, and amortization (EV/EBITDA). A lower ratio is generally preferred, as it suggests the company is undervalued relative to its operating profitability, a key metric for acquisitions or valuation comparisons. High ratios may indicate growth potential or overvaluation. In mining, EV/EBITDA is widely used to assess operational efficiency, as it normalizes for varying debt levels and tax structures. Investors should benchmark this against industry peers and consider commodity price impacts.',
    'financials.trailing_pe': 'The trailing price-to-earnings ratio, calculated as the share price divided by earnings per share over the past 12 months (P/E). A lower P/E is often favored by value investors, suggesting the stock is undervalued relative to historical earnings. High P/E ratios are common in growth stocks or during low-earnings periods (e.g., heavy investment phases in mining). This metric is less reliable in volatile sectors like mining, where earnings fluctuate with commodity prices. Investors should pair it with forward P/E and industry benchmarks.',
    'financials.forward_pe': 'The forward price-to-earnings ratio, based on the share price divided by projected earnings per share for the next 12 months. A lower forward P/E suggests potential undervaluation based on future earnings, but its reliability depends on the accuracy of earnings forecasts. In mining, forward P/E is useful for assessing growth potential, especially for companies ramping up production. High ratios may reflect optimism about commodity prices or output. Investors should cross-reference with historical P/E and analyst consensus.',
    'financials.revenue_value': 'The company’s total annual revenue, reported in millions of dollars ($M), reflecting income from operations (e.g., metal sales in mining). Higher revenue is generally preferred, as it indicates strong sales and market demand. However, revenue alone doesn’t guarantee profitability—cost efficiency and margins are critical. In mining, revenue is heavily tied to commodity prices and production volumes, making it sensitive to market cycles. Investors should analyze revenue trends and compare them to costs (e.g., AISC) to assess operational health.',
    'financials.ebitda': 'Earnings before interest, taxes, depreciation, and amortization, reported in millions of dollars ($M). EBITDA measures a company’s core operating profitability, excluding non-operational factors like financing costs or accounting adjustments. A higher EBITDA is preferred, as it signals strong operational performance, especially in capital-intensive sectors like mining. It’s a key metric for comparing firms with different tax or debt structures. Investors should monitor EBITDA margins and trends, as one-time gains or commodity price spikes can inflate this figure.',
    'financials.net_income_value': 'The company’s net profit after all expenses, taxes, and interest, reported in millions of dollars ($M). This bottom-line figure reflects overall profitability and is a key indicator of financial success. A higher net income is preferred, but it can be distorted by one-time items (e.g., asset sales) or accounting practices. In mining, net income is sensitive to commodity price swings and operational costs. Investors should analyze its consistency and pair it with cash flow metrics to ensure earnings translate to tangible value.',
    'financials.debt_value': 'The total debt obligations of a company, including short- and long-term liabilities, reported in millions of dollars ($M). Lower debt is generally preferred, as it reduces financial risk and interest expenses, enhancing stability. However, manageable debt can fuel growth (e.g., funding new mines), so context is critical. In mining, high debt can be risky during commodity downturns. Investors should compare debt to cash reserves, EBITDA, or equity to assess leverage and repayment capacity.',
    'financials.shares_outstanding': 'The total number of shares issued by a company, reported in millions. A lower number is generally preferred, as it minimizes ownership dilution, giving existing shareholders a larger claim on earnings and assets. However, larger companies naturally have more shares, so scale matters. In mining, share issuance often funds exploration or acquisitions, but excessive issuance can erode shareholder value. Investors should monitor trends in shares outstanding and check for dilutive actions like stock offerings.',
    'financials.peg_ratio': 'The price/earnings-to-growth (PEG) ratio, calculated as the trailing P/E ratio divided by the annual earnings growth rate. This metric adjusts the P/E ratio for expected growth, providing a more nuanced valuation measure. A lower PEG ratio is generally preferred by value investors, as it suggests the stock is undervalued relative to its growth potential. In mining, where earnings can be volatile due to commodity price swings, a PEG below 1 may indicate a bargain, but high growth forecasts can inflate the ratio. Investors should verify growth projections and compare PEG to industry peers, as mining firms with stable production may have more reliable estimates.',
    'financials.cost_of_revenue': 'The total cost directly attributable to producing goods sold, reported in millions of dollars ($M). In mining, this includes expenses like labor, materials, and energy for extracting and processing minerals. A lower cost of revenue is preferred, as it indicates higher operational efficiency and better margins, especially when commodity prices are volatile. However, very low costs may reflect underinvestment in quality or safety. Investors should compare this to revenue to calculate gross margin and assess cost trends relative to production volumes.',
    'financials.gross_profit': 'Revenue minus cost of revenue, reported in millions of dollars ($M). This metric reflects the profitability of core mining operations before operating expenses, taxes, or interest. A higher gross profit is preferred, as it signals strong revenue generation relative to production costs, a critical factor in the capital-intensive mining sector. High gross profit can support reinvestment or debt repayment, but investors should check gross margin (gross profit/revenue) to assess efficiency and compare to peers, as commodity price spikes can temporarily inflate this figure.',
    'financials.operating_expense': 'The costs of running the business beyond direct production, such as administrative, marketing, and exploration expenses, reported in millions of dollars ($M). A lower operating expense is preferred, as it reflects cost discipline and enhances operating margins. In mining, high exploration costs may justify elevated expenses if they lead to resource growth, but bloated overhead can erode profitability. Investors should compare this to revenue and operating income to evaluate efficiency and check for one-time expenses.',
    'financials.operating_income': 'Gross profit minus operating expenses, reported in millions of dollars ($M). This metric measures profitability from core operations before interest and taxes, a key indicator of operational efficiency in mining. A higher operating income is preferred, as it reflects the ability to generate profit after covering production and overhead costs. Negative operating income may signal operational challenges, especially during low commodity price cycles. Investors should analyze trends and compare to EBITDA for a fuller picture of operational health.',
    'financials.liabilities': 'The sum of all financial obligations, including debt, accounts payable, and other liabilities, reported in millions of dollars ($M). A lower value is preferred, as it reduces financial risk and interest burdens, particularly in the cyclical mining industry. However, moderate liabilities may be acceptable if used to fund high-return projects like mine development. Investors should compare liabilities to assets (e.g., net financial assets) and cash flow to assess repayment capacity and financial stability.',
    // Capital Structure
    'capital_structure.existing_shares': 'The current number of shares outstanding, reported in millions, representing the total equity ownership. A lower count is preferred to maintain concentrated ownership, benefiting existing shareholders. However, larger firms require more shares to support their scale. In mining, this metric is critical when assessing dilution from financing activities. Investors should compare it to fully diluted shares to understand potential future impacts.',
    'capital_structure.fully_diluted_shares': 'The total shares outstanding plus potential shares from exercisable options, warrants, or convertible securities, reported in millions. A lower number is preferred, as it indicates less risk of future dilution, preserving shareholder value. In mining, where capital raises are common, this metric highlights potential ownership changes. Investors should analyze the gap between existing and fully diluted shares to gauge dilution risk.',
    'capital_structure.in_the_money_options': 'The number of stock options that are currently exercisable at a profit, reported in millions. A lower count is preferred, as it reduces immediate dilution risk when options are exercised. However, in-the-money options reflect strong stock performance, which is positive. In mining, options are often used to incentivize management, but large volumes can dilute shareholders. Investors should assess the potential impact on shares outstanding.',
    'capital_structure.options_revenue': 'The potential revenue from exercising all in-the-money stock options, reported in millions of dollars ($M). A higher value could indicate future capital inflows, strengthening the balance sheet, but it comes at the cost of dilution. In mining, this metric is relevant for companies relying on stock-based financing. Investors should weigh the capital benefits against the dilutive impact on ownership.',
    // Mineral Estimates
    'mineral_estimates.reserves_total_aueq_moz': 'Proven and probable reserves of gold-equivalent ounces, reported in millions of ounces (Moz). Reserves are mineral deposits economically and legally extractable under current conditions, making this a critical metric for mining longevity. A higher value is preferred, as it ensures a robust asset base for sustained production. Investors should verify reserve quality (e.g., grade, cost) and compare it to production rates to assess mine life.',
    'mineral_estimates.measured_indicated_total_aueq_moz': 'Measured and indicated resources of gold-equivalent ounces (Moz), representing deposits with high geological confidence but not yet classified as reserves. A higher value is preferred, as it signals strong resource potential for future conversion to reserves. In mining, this metric reflects near-term upside. Investors should consider resource grade and conversion feasibility when evaluating.',
    'mineral_estimates.resources_total_aueq_moz': 'Total measured, indicated, and inferred gold-equivalent resources (Moz), encompassing all resource categories. A higher value is preferred for overall scale, but inferred resources carry significant uncertainty. This metric highlights a company’s long-term potential, though only a fraction may become economically viable. Investors should focus on the proportion of measured/indicated resources for reliability.',
    'mineral_estimates.potential_total_aueq_moz': 'Estimated exploration potential for additional gold-equivalent resources (Moz), based on geological studies but not yet classified as resources. A higher value is preferred for speculative upside, but it’s highly uncertain. In mining, this metric appeals to growth-focused investors betting on exploration success. Investors should assess the company’s exploration track record and funding capacity.',
    'mineral_estimates.reserves_precious_aueq_moz': 'Proven and probable reserves of precious metals (gold and silver equivalent, Moz). A higher value is preferred, as precious metals typically command higher value and stability than base metals. This metric emphasizes a company’s high-value asset base. Investors should evaluate reserve grade and market demand for precious metals.',
    'mineral_estimates.measured_indicated_precious_aueq_moz': 'Measured and indicated resources of precious metals (Au+Ag eq., Moz). A higher value is preferred for reliable, high-value resource potential. This metric is key for assessing near-term precious metal upside. Investors should check resource quality and conversion likelihood.',
    'mineral_estimates.resources_precious_aueq_moz': 'Total measured, indicated, and inferred precious metal resources (Moz). A higher value is preferred for overall precious metal scale, though inferred resources are speculative. This metric highlights a company’s precious metal focus. Investors should prioritize higher-confidence categories.',
    'mineral_estimates.reserves_non_precious_aueq_moz': 'Proven and probable reserves of non-precious metals (e.g., copper, zinc) in gold-equivalent ounces, reported in millions of ounces (Moz). A higher value is preferred for diversified miners, as non-precious metals can stabilize revenue during precious metal price declines. However, non-precious reserves often have lower margins and are sensitive to industrial demand. Investors should evaluate the quality (e.g., grade, cost) and market outlook for these metals, and compare to precious reserves to assess portfolio balance.',
    'mineral_estimates.measured_indicated_non_precious_aueq_moz': 'Measured and indicated resources of non-precious metals in gold-equivalent ounces (Moz), representing deposits with high geological confidence but not yet reserves. A higher value is preferred, as it indicates potential for future reserve conversion, adding to a company’s diversified asset base. Investors should assess conversion feasibility, extraction costs, and market demand for non-precious metals, as these resources may contribute to revenue stability but carry lower value than precious metals.',
    'mineral_estimates.resources_non_precious_aueq_moz': 'Total measured, indicated, and inferred resources of non-precious metals in gold-equivalent ounces (Moz). A higher value is preferred for overall scale, though inferred resources are speculative. This metric highlights a company’s long-term potential in non-precious metals, which can diversify revenue but are subject to industrial market fluctuations. Investors should prioritize higher-confidence (measured/indicated) resources and evaluate extraction economics.',
    'mineral_estimates.potential_non_precious_aueq_moz': 'Estimated exploration potential for additional non-precious metal resources in gold-equivalent ounces (Moz), based on geological studies but not yet classified. A higher value is preferred for speculative upside, appealing to growth-focused investors betting on exploration success in base metals. However, this metric is highly uncertain, and realization depends on funding and drilling outcomes. Investors should review the company’s exploration track record and market conditions for non-precious metals.',
    'mineral_estimates.mineable_total_aueq_moz': 'The total gold-equivalent ounces (Moz) deemed economically mineable under current conditions, typically a subset of reserves and high-confidence resources. A higher value is preferred, as it reflects immediately viable assets for production, critical for near-term cash flow. Unlike reserves, this metric may include select measured/indicated resources with strong economics. Investors should verify cost assumptions (e.g., AISC) and compare to production rates to assess mine life and profitability.',
    'mineral_estimates.mineable_precious_aueq_moz': 'Mineable ounces of precious metals (gold and silver equivalent, Moz) that are economically viable under current conditions. A higher value is preferred, as precious metals typically offer higher margins and market stability, enhancing profitability. This metric focuses on high-value assets ready for production. Investors should check extraction costs and market demand for gold/silver to evaluate its impact on revenue potential.',
    'mineral_estimates.mineable_non_precious_aueq_moz': 'Mineable ounces of non-precious metals (e.g., copper, zinc) in gold-equivalent ounces (Moz) that are economically viable. A higher value is preferred for diversified miners, as it supports revenue stability through base metal production. However, non-precious metals may have lower margins and higher market risk. Investors should assess extraction costs and industrial demand to gauge profitability and compare to precious mineable ounces.',
    // Valuation Metrics
    'valuation_metrics.ev_per_resource_oz_all': 'Enterprise value divided by total gold-equivalent resource ounces ($/oz). A lower value is often preferred, as it suggests the market undervalues the company’s resources relative to its total value. This metric is widely used in mining to identify potential bargains. Investors should compare it to peers and consider resource quality.',
    'valuation_metrics.ev_per_reserve_oz_all': 'Enterprise value per proven and probable reserve ounce ($/oz). A lower value is preferred, indicating undervaluation of confirmed reserves. This metric is more reliable than EV per resource due to reserves’ higher certainty. Investors should benchmark against industry averages.',
    'valuation_metrics.mkt_cap_per_resource_oz_all': 'Market capitalization per total resource ounce ($/oz). A lower value suggests the market undervalues the company’s resource base, appealing to value investors. This metric is useful for screening undervalued miners but requires context on resource quality.',
    'valuation_metrics.mkt_cap_per_reserve_oz_all': 'Market cap per reserve ounce ($/oz). A lower value indicates potential undervaluation of proven reserves, a key metric for conservative investors. It’s more precise than market cap per resource due to reserves’ certainty.',
    'valuation_metrics.ev_per_resource_oz_precious': 'Enterprise value per precious metal resource ounce ($/oz). A lower value suggests undervaluation of high-value precious resources, critical for precious metal-focused investors. This metric isolates the value of gold and silver assets.',
    'valuation_metrics.ev_per_reserve_oz_precious': 'Enterprise value per precious metal reserve ounce ($/oz). A lower value indicates undervaluation of confirmed precious reserves, a key indicator for value-focused precious metal investors.',
    'valuation_metrics.mkt_cap_per_resource_oz_precious': 'Market cap per precious metal resource ounce ($/oz). A lower value suggests the market undervalues the company’s precious resource base, appealing to value investors targeting gold and silver.',
    'valuation_metrics.mkt_cap_per_reserve_oz_precious': 'Market cap per precious metal reserve ounce ($/oz). A lower value indicates potential undervaluation of confirmed precious reserves, a precise metric for precious metal valuation.',
    'valuation_metrics.ev_per_mi_oz_all': 'Enterprise value divided by total measured and indicated gold-equivalent ounces ($/oz). A lower value is preferred, as it suggests the market undervalues the company’s high-confidence resources relative to its total value (equity + debt). This metric is more reliable than EV per total resources, as M&I ounces have greater geological certainty. Investors should compare to peers and consider resource quality (e.g., grade, location) to identify potential undervaluation.',
    'valuation_metrics.ev_per_mi_oz_precious': 'Enterprise value per measured and indicated precious metal ounce ($/oz). A lower value is preferred, indicating undervaluation of high-confidence precious resources, which are critical for gold/silver-focused investors. This metric isolates the value of high-margin assets. Investors should benchmark against industry averages and verify resource economics to assess whether the market fairly values these assets.',
    'valuation_metrics.ev_per_mineable_oz_all': 'Enterprise value divided by total mineable gold-equivalent ounces ($/oz), reflecting economically viable assets. A lower value is preferred, as it suggests the market undervalues the company’s immediately producible resources. This metric is highly reliable for assessing near-term value, as mineable ounces are typically a subset of reserves and high-confidence resources. Investors should compare to peers and check cost assumptions (e.g., AISC) for profitability context.',
    'valuation_metrics.ev_per_mineable_oz_precious': 'Enterprise value per mineable precious metal ounce ($/oz). A lower value is preferred, indicating undervaluation of economically viable gold and silver assets, which offer high margins and stability. This metric is key for precious metal investors seeking near-term production value. Investors should compare to industry norms and evaluate extraction costs to ensure profitability.',
    'valuation_metrics.ev_per_production_oz': 'Enterprise value divided by current annual gold-equivalent production ($/oz). A lower value is preferred, as it suggests the market undervalues the company’s operational output relative to its total value. This metric highlights efficiency in converting assets to production, critical for cash flow generation. Investors should compare to peers and pair with cost metrics (e.g., AISC) to assess profitability and sustainability.',
    'valuation_metrics.mkt_cap_per_mi_oz_all': 'Market capitalization per total measured and indicated gold-equivalent ounce ($/oz). A lower value is preferred, suggesting the market undervalues the company’s high-confidence resources relative to its equity value. This metric is useful for value investors screening for undervalued miners with strong resource bases. Investors should compare to peers and consider resource quality and conversion potential.',
    'valuation_metrics.mkt_cap_per_mi_oz_precious': 'Market capitalization per measured and indicated precious metal ounce ($/oz). A lower value is preferred, indicating undervaluation of high-confidence gold and silver resources, appealing to precious metal-focused investors. This metric isolates high-value assets with strong conversion potential. Investors should benchmark against peers and check resource economics.',
    'valuation_metrics.mkt_cap_per_mineable_oz_all': 'Market capitalization per total mineable gold-equivalent ounce ($/oz). A lower value is preferred, suggesting undervaluation of economically viable assets ready for production. This metric is ideal for investors seeking companies with near-term cash flow potential. Investors should compare to peers and verify cost assumptions for mineable ounces to ensure profitability.',
    'valuation_metrics.mkt_cap_per_mineable_oz_precious': 'Market capitalization per mineable precious metal ounce ($/oz). A lower value is preferred, indicating undervaluation of high-margin, economically viable gold and silver assets. This metric is critical for investors prioritizing near-term precious metal production. Investors should compare to industry averages and assess extraction costs for profitability.',
    'valuation_metrics.mkt_cap_per_production_oz': 'Market capitalization divided by current annual gold-equivalent production ($/oz). A lower value is preferred, as it suggests the market undervalues the company’s operational output relative to its equity value. This metric is useful for assessing production efficiency and cash flow potential. Investors should pair with cost metrics (e.g., AISC) and compare to peers to evaluate value.',
    // Production
    'production.current_production_total_aueq_koz': 'Current annual production of gold-equivalent ounces, reported in thousand ounces (koz). A higher value is preferred, as it reflects strong operational output and revenue potential. This metric is a core indicator of a mining company’s scale and efficiency. Investors should compare it to costs (e.g., AISC) to assess profitability.',
    'production.future_production_total_aueq_koz': 'Projected annual gold-equivalent production (koz) based on company guidance or analyst estimates. A higher value is preferred, signaling growth potential, but forecasts are uncertain due to operational or market risks. Investors should verify the credibility of projections and check funding for expansion.',
    'production.reserve_life_years': 'The estimated years of production remaining based on current reserves and production rates. A higher value is preferred, as it indicates longer operational longevity and reduced need for immediate exploration. Investors should ensure reserve estimates are reliable and consider production ramp-up plans.',
    'production.current_production_precious_aueq_koz': 'Current annual production of precious metals (gold and silver equivalent, koz). A higher value is preferred, as precious metals typically offer higher margins and stability. This metric highlights a company’s focus on high-value output. Investors should compare it to total production for diversification insights.',
    'production.current_production_non_precious_aueq_koz': 'Current annual production of non-precious metals (e.g., copper, zinc) in gold-equivalent ounces (koz). A higher value indicates diversified output, which can stabilize revenue during precious metal downturns. However, non-precious metals often have lower margins. Investors should assess the value of these metals in context.',
    // Costs
    'costs.aisc_future': 'Projected all-in sustaining cost per ounce ($/oz), encompassing all costs to sustain production (e.g., mining, overhead, exploration). A lower value is preferred, as it signals higher profitability potential at future commodity prices. This metric is critical for assessing long-term viability. Investors should verify projection assumptions.',
    'costs.construction_costs': 'Estimated capital costs for constructing new mining projects, reported in millions of dollars ($M). A lower value is preferred, as it indicates capital efficiency and lower funding needs. However, quality and scale of the project matter—cheap construction may compromise output. Investors should compare to projected revenue.',
    'costs.tco_future': 'Projected total cash costs per ounce ($/oz), covering direct production costs (e.g., mining, processing). A lower value is preferred, as it reflects operational efficiency and higher margins. This metric excludes sustaining capital, making it narrower than AISC. Investors should track trends and commodity price impacts.',
    'costs.aisc_last_quarter': 'All-in sustaining cost per ounce ($/oz) for the most recent quarter. A lower value is preferred, indicating strong recent cost performance and profitability. This metric is widely used to compare operational efficiency across miners. Investors should check for one-time cost impacts.',
    'costs.aisc_last_year': 'All-in sustaining cost per ounce ($/oz) for the last reported year. A lower value is preferred, reflecting historical cost efficiency. This metric provides a longer-term view than quarterly AISC, smoothing out short-term fluctuations. Investors should compare it to peers and commodity prices.',
    'costs.aic_last_quarter': 'All-in cost per ounce ($/oz) for the most recent quarter, including sustaining costs, exploration, and non-sustaining capital (e.g., new mine development). A lower value is preferred, as it reflects comprehensive cost efficiency, critical for profitability in mining. AIC is broader than AISC, capturing growth investments, so higher AIC may be acceptable for expanding firms. Investors should compare to peers and commodity prices to assess performance and check for one-time costs.',
    'costs.aic_last_year': 'All-in cost per ounce ($/oz) for the last reported year, encompassing all costs, including sustaining and non-sustaining capital. A lower value is preferred, indicating long-term cost efficiency across operations and growth initiatives. This metric provides a broader view than AISC, useful for assessing strategic investments. Investors should compare to industry averages, check for cost trends, and pair with commodity prices to evaluate profitability.',
    'costs.tco_current': 'Current total cash cost per ounce ($/oz), covering direct production costs (e.g., mining, processing) but excluding sustaining capital. A lower value is preferred, as it reflects operational efficiency and higher margins in current operations. This metric is narrower than AISC, focusing on cash outflows, making it sensitive to short-term cost control. Investors should compare to peers, track trends, and pair with commodity prices to assess profitability.'
};

// Group Metrics by Category
const groupMetrics = (metricsList: MetricConfig[]) => {
    const grouped: Record<string, MetricConfig[]> = {};
    if (!Array.isArray(metricsList)) return grouped;
    metricsList.forEach(metric => {
        const category = metric.category || 'other';
        if (!grouped[category]) grouped[category] = [];
        const lookupKey = metric.key || metric.db_column;
        const enhancedMetric = { ...metric, detailedDesc: detailedDescriptions[lookupKey] || metric.description || 'No description available.' };
        grouped[category].push(enhancedMetric);
    });
    return grouped;
};

export function HelpMetricsPage() {
    const grouped = useMemo(() => groupMetrics(metrics), []);
    const { currentUserTier } = useFilters();
    const backgroundImageUrl = "/Background2.jpg";

    return (
        <PageContainer
            title="Metric Explanations"
            description="A comprehensive guide to the data points used across the application, designed to inform and empower your decision-making."
        >
            <div className="relative isolate">
                <div
                    className="absolute inset-0 bg-cover bg-center bg-no-repeat bg-fixed -z-10 opacity-[0.03]"
                    style={{ backgroundImage: `url('${backgroundImageUrl}')` }}
                    aria-hidden="true"
                />
                <div className="relative z-0 space-y-6">
                    {/* Contextual Disclaimer */}
                    <div className="bg-navy-800/70 border border-navy-700 backdrop-blur-sm p-4 rounded-lg">
                        <p className="text-gray-300 text-sm">
                            <Info size={16} className="inline mr-2 text-cyan-400" />
                            <strong>Note:</strong> Metrics often carry a general "better" direction (↑ for higher, ↓ for lower), but their value depends on context—your investment goals, market conditions, and related data points. For example, lower debt is typically safer, but a higher share price isn’t always ideal if valuations are stretched. Use these explanations as a starting point, not a rulebook.
                        </p>
                    </div>
                    {/* Metric Categories */}
                    {Object.entries(grouped).map(([categoryKey, categoryMetrics]) => (
                        <Card key={categoryKey} className="bg-navy-800/70 border border-navy-700 backdrop-blur-sm overflow-hidden">
                            <CardHeader className="bg-navy-700/30 border-b border-navy-600 px-4 py-3">
                                <CardTitle className="text-base sm:text-lg font-semibold text-cyan-400 capitalize">
                                    {metricCategories[categoryKey as keyof typeof metricCategories] || categoryKey}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 md:p-6">
                                <dl className="space-y-5">
                                    {categoryMetrics.map(metric => {
                                        const isAccessible = isFeatureAccessible(metric.tier, currentUserTier);
                                        const lookupKey = metric.key || metric.db_column;
                                        const descriptionToUse = metric.detailedDesc;

                                        return (
                                            <div key={lookupKey} className="grid grid-cols-1 md:grid-cols-4 gap-1 md:gap-4">
                                                <dt
                                                    className={cn(
                                                        'md:col-span-1 font-medium text-sm flex items-center gap-1.5',
                                                        isAccessible ? 'text-gray-100' : 'text-gray-500'
                                                    )}
                                                >
                                                    {!isAccessible && (
                                                        <Lock
                                                            size={12}
                                                            className="text-yellow-600 flex-shrink-0"
                                                            title={`Requires ${metric.tier} tier`}
                                                        />
                                                    )}
                                                    <span className={cn(!isAccessible && 'opacity-60')}>
                                                        {metric.label}
                                                    </span>
                                                    {metric.unit && (
                                                        <span W className="text-xs text-gray-400">({metric.unit})</span>
                                                    )}
                                                    {metric.higherIsBetter === true ? (
                                                        <ArrowUp
                                                            size={12}
                                                            className={cn(
                                                                'flex-shrink-0',
                                                                isAccessible ? 'text-green-400' : 'text-green-700/60'
                                                            )}
                                                            title="Higher is generally better"
                                                        />
                                                    ) : metric.higherIsBetter === false ? (
                                                        <ArrowDown
                                                            size={12}
                                                            className={cn(
                                                                'flex-shrink-0',
                                                                isAccessible ? 'text-red-400' : 'text-red-700/60'
                                                            )}
                                                            title="Lower is generally better"
                                                        />
                                                    ) : null}
                                                </dt>
                                                <dd
                                                    className={cn(
                                                        'md:col-span-3 text-sm',
                                                        isAccessible ? 'text-gray-300' : 'text-gray-500 opacity-60'
                                                    )}
                                                >
                                                    {descriptionToUse}
                                                    <div className="mt-1 inline-block ml-2">
                                                        <TierBadge tier={metric.tier} />
                                                    </div>
                                                    {/* Tooltip Examples for Key Metrics */}
                                                    {lookupKey === 'share_price' && (
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Info
                                                                        size={14}
                                                                        className="inline ml-2 text-cyan-400 cursor-pointer"
                                                                    />
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p>
                                                                        Example: A $50 share price might seem strong, but if the P/E ratio is 100, it could be overvalued compared to a $20 stock with a P/E of 10, assuming similar growth prospects.
                                                                    </p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    )}
                                                    {lookupKey === 'financials.free_cash_flow' && (
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Info
                                                                        size={14}
                                                                        className="inline ml-2 text-cyan-400 cursor-pointer"
                                                                    />
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p>
                                                                        Example: A mining company with $100M in free cash flow can pay down $50M in debt and fund $50M in exploration, strengthening its balance sheet and growth potential, unlike a company with negative FCF needing to borrow.
                                                                    </p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    )}
                                                    {lookupKey === 'financials.price_to_book' && (
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Info
                                                                        size={14}
                                                                        className="inline ml-2 text-cyan-400 cursor-pointer"
                                                                    />
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p>
                                                                        Example: A P/B ratio of 0.8 suggests a stock trades below its book value, potentially undervalued, while a P/B of 3 might reflect high growth expectations or overvaluation, depending on the company’s reserve quality.
                                                                    </p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    )}
                                                    {lookupKey === 'financials.peg_ratio' && (
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Info
                                                                        size={14}
                                                                        className="inline ml-2 text-cyan-400 cursor-pointer"
                                                                    />
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p>
                                                                        Example: A PEG ratio of 0.5 suggests a stock is undervalued with strong growth (e.g., 20% annual earnings growth, P/E of 10), while a PEG of 2 (P/E of 20, 10% growth) may indicate overvaluation.
                                                                    </p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    )}
                                                    {lookupKey === 'financials.gross_profit' && (
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Info
                                                                        size={14}
                                                                        className="inline ml-2 text-cyan-400 cursor-pointer"
                                                                    />
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p>
                                                                        Example: A miner with $500M revenue and $300M gross profit (40% margin) is more efficient than one with $600M revenue and $240M gross profit (30% margin), assuming similar scale.
                                                                    </p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    )}
                                                    {lookupKey === 'mineral_estimates.reserves_total_aueq_moz' && (
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Info
                                                                        size={14}
                                                                        className="inline ml-2 text-cyan-400 cursor-pointer"
                                                                    />
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p>
                                                                        Example: A company with 10 Moz in reserves and 500 koz annual production has a 20-year mine life, far more sustainable than a company with 2 Moz producing 200 koz annually (10-year mine life).
                                                                    </p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    )}
                                                    {lookupKey === 'mineral_estimates.mineable_total_aueq_moz' && (
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Info
                                                                        size={14}
                                                                        className="inline ml-2 text-cyan-400 cursor-pointer"
                                                                    />
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p>
                                                                        Example: A company with 5 Moz mineable at $900/oz AISC is more attractive than one with 6 Moz at $1,200/oz, as the former offers better near-term profitability at $1,800/oz gold.
                                                                    </p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    )}
                                                    {lookupKey === 'valuation_metrics.ev_per_production_oz' && (
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Info
                                                                        size={14}
                                                                        className="inline ml-2 text-cyan-400 cursor-pointer"
                                                                    />
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p>
                                                                        Example: A miner with $1B EV and 500 koz production ($2,000/oz EV/production) is likely undervalued compared to a peer with $1.5B EV and 500 koz ($3,000/oz), assuming similar costs.
                                                                    </p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    )}
                                                    {lookupKey === 'costs.aisc_last_quarter' && (
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Info
                                                                        size={14}
                                                                        className="inline ml-2 text-cyan-400 cursor-pointer"
                                                                    />
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p>
                                                                        Example: A miner with an AISC of $900/oz last quarter is more profitable at $1,800/oz gold than a competitor with $1,200/oz AISC, assuming similar production volumes.
                                                                    </p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    )}
                                                    {lookupKey === 'costs.aic_last_quarter' && (
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Info
                                                                        size={14}
                                                                        className="inline ml-2 text-cyan-400 cursor-pointer"
                                                                    />
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p>
                                                                        Example: A miner with $1,000/oz AIC (including expansion costs) may be investing in growth, while a peer at $800/oz AIC with no expansion may be more profitable short-term at $1,800/oz gold.
                                                                    </p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    )}
                                                </dd>
                                            </div>
                                        );
                                    })}
                                </dl>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </PageContainer>
    );
}