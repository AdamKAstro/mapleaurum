// src/pages/help/scatter-score-guide.tsx
import React from 'react';
import { Helmet } from 'react-helmet';
import { PageContainer } from '../../components/ui/page-container';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import {
  BrainCircuit,
  Settings,
  Calculator,
  BarChart3,
  Info,
  Target,
  Layers3,
  MousePointerSquareDashed,
  GitBranch,
  FlaskConical,
  Activity,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  RefreshCw,
  Lightbulb,
  TrendingUp,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import backgroundImageUrl from '../../assets/Background2.jpg'; // Import image

export function HelpScatterScorePage() {
  // Component for mathematical formula display
  const FormulaDisplay: React.FC<{ children: string; className?: string }> = ({ children, className }) => (
    <div
      className={cn(
        'my-3 p-3 bg-navy-900/60 border border-navy-700 rounded-md text-sm shadow-inner overflow-x-auto',
        className
      )}
    >
      <pre className="text-cyan-300 whitespace-pre-wrap font-mono text-[0.8rem] sm:text-xs md:text-sm leading-relaxed m-0 p-0 bg-transparent">
        {children}
      </pre>
    </div>
  );

  return (
    <PageContainer
      title="Guide: Advanced ScatterScore Analysis"
      description="Master the art of multi-dimensional company scoring with weighted composite metrics visualization."
    >
      <Helmet>
        <title>MapleAurum | ScatterScore Pro Guide</title>
        <meta
          name="description"
          content="Learn how to use ScatterScore Pro for advanced multi-dimensional company scoring and visualization."
        />
      </Helmet>
      <div className="relative isolate">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat bg-fixed -z-10 opacity-[0.03]"
          style={{ backgroundImage: `url(${backgroundImageUrl})` }}
          aria-hidden="true"
        />
        <div
          className={cn(
            'relative z-0 space-y-6 text-gray-300',
            'max-w-4xl mx-auto',
            'prose prose-sm sm:prose-base prose-invert',
            'prose-headings:text-cyan-400 prose-headings:font-semibold',
            'prose-a:text-accent-teal hover:prose-a:text-accent-yellow',
            'prose-strong:text-surface-white'
          )}
        >
          <Card className="bg-navy-800/70 border border-navy-700 backdrop-blur-sm shadow-xl">
            <CardHeader>
              <CardTitle className="text-xl sm:text-2xl flex items-center gap-2.5">
                <BrainCircuit size={24} className="text-cyan-400" />
                ScatterScore Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p>
                The ScatterScore Pro page is an advanced analytical tool that combines the visual power of scatter charts with
                the sophistication of weighted composite scoring. Unlike standard scatter charts that display raw metric values,
                ScatterScore transforms multiple weighted metrics into normalized composite scores for each axis.
              </p>
              <p>
                This approach allows you to analyze companies across{' '}
                <strong className="text-accent-yellow">dozens of dimensions simultaneously</strong>, condensed into meaningful
                X and Y scores that reflect your specific investment priorities. The bubble size (Z-axis) can represent any
                additional metric for a third dimension of analysis.
              </p>
              <div className="bg-navy-900/40 border-l-4 border-accent-teal p-4 rounded-r-md">
                <p className="font-semibold text-surface-white mb-2">Key Innovation:</p>
                <p className="text-xs">
                  Instead of comparing companies on individual metrics like "Market Cap vs P/E Ratio", ScatterScore lets you
                  create composite scores like "Valuation Efficiency Score" (combining multiple valuation metrics) vs "Asset
                  Quality Score" (combining resource, financial, and operational metrics).
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-navy-800/70 border border-navy-700 backdrop-blur-sm shadow-xl">
            <CardHeader>
              <CardTitle className="text-xl sm:text-2xl flex items-center gap-2.5">
                <GitBranch size={24} className="text-cyan-400" />
                1. Template System
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p>ScatterScore includes five professionally-designed templates, each targeting specific investment strategies:</p>

              <div className="space-y-3">
                <div className="bg-navy-900/40 p-3 rounded-md">
                  <h4 className="font-semibold text-accent-teal mb-1">Value Hunter</h4>
                  <p className="text-xs mb-2">X-Axis: Valuation Efficiency | Y-Axis: Asset Quality</p>
                  <p className="text-xs text-gray-400">
                    Identifies undervalued companies with strong fundamentals by scoring valuation metrics (P/B, P/S,
                    EV/EBITDA) against asset quality indicators (net financial assets, reserves, cash flow).
                  </p>
                </div>

                <div className="bg-navy-900/40 p-3 rounded-md">
                  <h4 className="font-semibold text-accent-teal mb-1">Growth Catalyst Seeker</h4>
                  <p className="text-xs mb-2">X-Axis: Resource Potential | Y-Axis: Growth Metrics</p>
                  <p className="text-xs text-gray-400">
                    Targets expansion opportunities by scoring resource base potential against growth indicators (future
                    production, PEG ratio, resource conversion potential).
                  </p>
                </div>

                <div className="bg-navy-900/40 p-3 rounded-md">
                  <h4 className="font-semibold text-accent-teal mb-1">Producer Profitability Focus</h4>
                  <p className="text-xs mb-2">X-Axis: Cost Efficiency | Y-Axis: Profitability</p>
                  <p className="text-xs text-gray-400">
                    Evaluates operational excellence by comparing cost metrics (AISC, TCO) against profitability measures
                    (EBITDA, FCF, margins).
                  </p>
                </div>

                <div className="bg-navy-900/40 p-3 rounded-md">
                  <h4 className="font-semibold text-accent-teal mb-1">Financial Stability & Low Risk</h4>
                  <p className="text-xs mb-2">X-Axis: Financial Strength | Y-Axis: Operational Stability</p>
                  <p className="text-xs text-gray-400">
                    For risk-averse investors, balancing balance sheet strength against operational consistency and longevity.
                  </p>
                </div>

                <div className="bg-navy-900/40 p-3 rounded-md">
                  <h4 className="font-semibold text-accent-teal mb-1">Precious Metals Pure Play</h4>
                  <p className="text-xs mb-2">X-Axis: Precious Metals Resources | Y-Axis: Precious Metals Valuation</p>
                  <p className="text-xs text-gray-400">
                    Focuses exclusively on gold/silver exposure, comparing resource base against precious-specific valuation
                    metrics.
                  </p>
                </div>
              </div>

              <p className="mt-4 text-xs bg-navy-700/30 p-3 rounded-md">
                <Info size={14} className="inline mr-2 text-cyan-400" />
                Templates provide expertly-crafted starting points but are fully customizable. Each template includes Market
                Cap (X-axis) and Enterprise Value (Y-axis) as anchoring metrics to ensure comparability across different
                analyses.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-navy-800/70 border border-navy-700 backdrop-blur-sm shadow-xl">
            <CardHeader>
              <CardTitle className="text-xl sm:text-2xl flex items-center gap-2.5">
                <Calculator size={24} className="text-cyan-400" />
                2. Scoring Mathematics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p>
                Each axis score is calculated using a sophisticated multi-step process that transforms raw metric values into
                normalized, weighted composite scores:
              </p>

              <h4 className="text-md font-semibold text-accent-teal mt-4">Step 1: Individual Metric Normalization</h4>
              <p className="text-xs">For each metric in an axis configuration:</p>
              <FormulaDisplay>
                {`1. Retrieve raw value from company data
2. Apply imputation if missing (dataset median/mean or worst-case)
3. Normalize to 0-1 scale using selected normalization mode
4. Invert if "lower is better" (e.g., costs): X_norm = 1 - X_norm`}
              </FormulaDisplay>

              <h4 className="text-md font-semibold text-accent-teal mt-4">Step 2: Weighted Aggregation</h4>
              <FormulaDisplay>
                {`For each metric i with weight W_i (0-100%):
WeightedScore_i = NormalizedValue_i × (W_i / 100)

Axis Score = (Σ WeightedScore_i / Σ (W_i / 100)) × 1000`}
              </FormulaDisplay>

              <h4 className="text-md font-semibold text-accent-teal mt-4">Example Calculation</h4>
              <div className="bg-navy-900/40 p-3 rounded-md space-y-2 text-xs">
                <p className="font-semibold">X-Axis: Valuation Efficiency Score</p>
                <p>Metrics: P/B (20%), P/S (20%), EV/EBITDA (30%), Market Cap (30%)</p>
                <p>Company A normalized values: 0.8, 0.6, 0.9, 0.5</p>
                <p>Weighted sum: (0.8×20 + 0.6×20 + 0.9×30 + 0.5×30) = 70</p>
                <p>Total weight: 100%</p>
                <p className="font-semibold text-accent-teal">Final X-Score: 70/100 × 1000 = 700</p>
              </div>

              <p className="mt-4 text-xs text-gray-400">
                The 0-1000 scale provides intuitive interpretation: 500 represents median performance, 700+ indicates
                top-tier, while below 300 suggests significant underperformance relative to the dataset.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-navy-800/70 border border-navy-700 backdrop-blur-sm shadow-xl">
            <CardHeader>
              <CardTitle className="text-xl sm:text-2xl flex items-center gap-2.5">
                <Settings size={24} className="text-cyan-400" />
                3. Configuration Panel
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <h4 className="font-semibold text-surface-white mb-2">Metric Selection & Weighting</h4>
              <ul className="list-disc space-y-2 pl-5 text-xs">
                <li>
                  <strong>Adding Metrics:</strong> Use the dropdown selector to add any accessible metric to either axis. New
                  metrics automatically receive 5% weight with others proportionally reduced.
                </li>
                <li>
                  <strong>Weight Adjustment:</strong> Enter exact percentages (0-100) for fine control. The system
                  automatically normalizes to ensure 100% total.
                </li>
                <li>
                  <strong>Higher/Lower is Better (HLB):</strong> Toggle to override default directional scoring. Critical for
                  metrics that may have context-dependent interpretations.
                </li>
                <li>
                  <strong>Removing Metrics:</strong> Click the × button. Remaining weights redistribute proportionally.
                </li>
              </ul>

              <h4 className="font-semibold text-surface-white mb-2 mt-4">Scoring Settings</h4>
              <div className="space-y-3">
                <div>
                  <p className="font-medium text-gray-200">Normalization Modes:</p>
                  <ul className="list-disc pl-5 mt-1 space-y-1 text-xs">
                    <li>
                      <strong>Dataset Min-Max:</strong> Best for peer comparison within filtered set
                    </li>
                    <li>
                      <strong>Global Min-Max:</strong> Stable scoring against entire database
                    </li>
                    <li>
                      <strong>Dataset Rank/Percentile:</strong> Robust to outliers, pure relative ranking
                    </li>
                    <li>
                      <strong>Dataset Z-Score:</strong> Highlights statistical outliers
                    </li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium text-gray-200">Imputation Modes:</p>
                  <ul className="list-disc pl-5 mt-1 space-y-1 text-xs">
                    <li>
                      <strong>Zero/Worst:</strong> Conservative, penalizes missing data
                    </li>
                    <li>
                      <strong>Dataset Mean:</strong> Neutral, assumes average performance
                    </li>
                    <li>
                      <strong>Dataset Median:</strong> Robust to outliers in imputation
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-navy-800/70 border border-navy-700 backdrop-blur-sm shadow-xl">
            <CardHeader>
              <CardTitle className="text-xl sm:text-2xl flex items-center gap-2.5">
                <BarChart3 size={24} className="text-cyan-400" />
                4. Chart Interpretation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="space-y-3">
                <div>
                  <h4 className="font-semibold text-gray-100 mb-1 flex items-center gap-1">
                    <Target size={16} />
                    Position Analysis
                  </h4>
                  <p className="text-xs">
                    A company's position represents its composite performance across all weighted metrics. Top-right quadrant
                    indicates excellence in both dimensions, while bottom-left suggests underperformance.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-100 mb-1 flex items-center gap-1">
                    <Layers3 size={16} />
                    Quadrant Interpretation
                  </h4>
                  <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                    <div className="bg-green-900/20 p-2 rounded border border-green-700/30">
                      <p className="font-semibold text-green-400">Top-Right: Leaders</p>
                      <p>High scores on both axes - potential best-in-class</p>
                    </div>
                    <div className="bg-yellow-900/20 p-2 rounded border border-yellow-700/30">
                      <p className="font-semibold text-yellow-400">Top-Left: Y-Specialists</p>
                      <p>Strong Y-axis, weak X-axis - niche excellence</p>
                    </div>
                    <div className="bg-blue-900/20 p-2 rounded border border-blue-700/30">
                      <p className="font-semibold text-blue-400">Bottom-Right: X-Specialists</p>
                      <p>Strong X-axis, weak Y-axis - partial strength</p>
                    </div>
                    <div className="bg-red-900/20 p-2 rounded border border-red-700/30">
                      <p className="font-semibold text-red-400">Bottom-Left: Challenged</p>
                      <p>Low scores on both axes - potential value traps or turnarounds</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-100 mb-1 flex items-center gap-1">
                    <Activity size={16} />
                    Bubble Size Interpretation
                  </h4>
                  <p className="text-xs">
                    The Z-axis metric (bubble size) adds a third dimension. Larger bubbles might represent larger companies
                    (Market Cap), higher production (koz), or better efficiency (low AISC), depending on your selection.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-100 mb-1 flex items-center gap-1">
                    <MousePointerSquareDashed size={16} />
                    Interactive Features
                  </h4>
                  <ul className="list-disc pl-5 space-y-1 text-xs">
                    <li>
                      <strong>Hover:</strong> View company details and exact scores in tooltips
                    </li>
                    <li>
                      <strong>Pan:</strong> Click and drag to explore different chart regions
                    </li>
                    <li>
                      <strong>Zoom:</strong> Mouse wheel or buttons to focus on clusters
                    </li>
                    <li>
                      <strong>Labels:</strong> Larger bubbles display ticker symbols for quick identification
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-navy-800/70 border border-navy-700 backdrop-blur-sm shadow-xl">
            <CardHeader>
              <CardTitle className="text-xl sm:text-2xl flex items-center gap-2.5">
                <FlaskConical size={24} className="text-cyan-400" />
                5. Advanced Analysis Techniques
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <h4 className="text-md font-semibold text-accent-teal">Pattern Recognition</h4>
              <div className="space-y-2 text-xs">
                <p>
                  <strong className="text-gray-200">Clusters:</strong> Groups of companies with similar scores often share
                  characteristics (e.g., jurisdiction, development stage, commodity focus). Investigate outliers from their
                  peer clusters.
                </p>
                <p>
                  <strong className="text-gray-200">Linear Relationships:</strong> If points form a diagonal line, the two
                  composite scores are correlated. This might indicate redundancy in metric selection or genuine market
                  relationships.
                </p>
                <p>
                  <strong className="text-gray-200">Empty Regions:</strong> Areas with no companies might represent
                  impossible combinations (e.g., high profitability with high costs) or market opportunities.
                </p>
              </div>

              <h4 className="text-md font-semibold text-accent-teal mt-4">Strategic Applications</h4>
              <div className="space-y-3">
                <div className="bg-navy-900/40 p-3 rounded-md">
                  <p className="font-semibold text-surface-white mb-1">Peer Comparison</p>
                  <p className="text-xs">
                    Filter to specific company types (e.g., "Gold Producers > $1B Market Cap") then use Producer
                    Profitability template to identify operational leaders and laggards.
                  </p>
                </div>
                <div className="bg-navy-900/40 p-3 rounded-md">
                  <p className="font-semibold text-surface-white mb-1">Investment Screening</p>
                  <p className="text-xs">
                    Use Value Hunter template to find companies in the top-right quadrant (high asset quality, attractive
                    valuation) with large bubbles (substantial market cap for liquidity).
                  </p>
                </div>
                <div className="bg-navy-900/40 p-3 rounded-md">
                  <p className="font-semibold text-surface-white mb-1">Risk Assessment</p>
                  <p className="text-xs">
                    Financial Stability template helps identify companies with fortress balance sheets (top-right) vs. those
                    with financial stress (bottom-left).
                  </p>
                </div>
              </div>

              <h4 className="text-md font-semibold text-accent-teal mt-4">Customization Strategies</h4>
              <ul className="list-disc pl-5 space-y-2 text-xs">
                <li>
                  <strong>Sector-Specific Scoring:</strong> Modify templates for specific commodities - emphasize copper
                  grades for base metal focus, or silver percentages for silver plays.
                </li>
                <li>
                  <strong>Market Condition Adaptation:</strong> In bear markets, weight financial stability higher; in bulls,
                  emphasize growth and resource expansion metrics.
                </li>
                <li>
                  <strong>Time-Series Analysis:</strong> Save configurations and revisit quarterly to track how companies
                  migrate across the chart as they execute strategies.
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="bg-navy-800/70 border border-navy-700 backdrop-blur-sm shadow-xl">
            <CardHeader>
              <CardTitle className="text-xl sm:text-2xl flex items-center gap-2.5">
                <Lightbulb size={24} className="text-cyan-400" />
                6. Best Practices & Tips
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="space-y-3">
                <div className="bg-green-900/20 border border-green-700/30 p-3 rounded-md">
                  <p className="font-semibold text-green-400 mb-1">Do: Balance Your Metrics</p>
                  <p className="text-xs">
                    Include both backward-looking (financial results) and forward-looking (reserves, growth) metrics. Mix
                    absolute measures (revenue) with efficiency ratios (EV/EBITDA).
                  </p>
                </div>

                <div className="bg-green-900/20 border border-green-700/30 p-3 rounded-md">
                  <p className="font-semibold text-green-400 mb-1">Do: Consider Data Completeness</p>
                  <p className="text-xs">
                    Metrics with many missing values can skew scores. Check metric availability across your filtered companies
                    before heavily weighting sparse data.
                  </p>
                </div>

                <div className="bg-yellow-900/20 border border-yellow-700/30 p-3 rounded-md">
                  <p className="font-semibold text-yellow-400 mb-1">Caution: Normalization Impact</p>
                  <p className="text-xs">
                    Dataset normalization makes scores relative to current filter. A company scoring 800 among junior
                    explorers might score 400 among major producers. Document your filters for context.
                  </p>
                </div>

                <div className="bg-yellow-900/20 border border-yellow-700/30 p-3 rounded-md">
                  <p className="font-semibold text-yellow-400 mb-1">Caution: Over-Correlation</p>
                  <p className="text-xs">
                    Avoid using highly correlated metrics on the same axis (e.g., Market Cap and Enterprise Value). This
                    artificially inflates that factor's influence on the composite score.
                  </p>
                </div>

                <div className="bg-red-900/20 border border-red-700/30 p-3 rounded-md">
                  <p className="font-semibold text-red-400 mb-1">Avoid: Single Metric Dominance</p>
                  <p className="text-xs">
                    Don't assign 80%+ weight to one metric unless intentionally creating a single-factor analysis. The power
                    of ScatterScore lies in balanced multi-factor scoring.
                  </p>
                </div>
              </div>

              <h4 className="font-semibold text-surface-white mt-4 mb-2">Quick Reference</h4>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-navy-900/40 p-2 rounded">
                  <p className="font-semibold flex items-center gap-1 mb-1">
                    <ZoomIn size={12} />
                    Zoom In
                  </p>
                  <p>Mouse wheel up or click button</p>
                </div>
                <div className="bg-navy-900/40 p-2 rounded">
                  <p className="font-semibold flex items-center gap-1 mb-1">
                    <ZoomOut size={12} />
                    Zoom Out
                  </p>
                  <p>Mouse wheel down or click button</p>
                </div>
                <div className="bg-navy-900/40 p-2 rounded">
                  <p className="font-semibold flex items-center gap-1 mb-1">
                    <RotateCcw size={12} />
                    Reset View
                  </p>
                  <p>Click reset button to restore original zoom</p>
                </div>
                <div className="bg-navy-900/40 p-2 rounded">
                  <p className="font-semibold flex items-center gap-1 mb-1">
                    <RefreshCw size={12} />
                    Apply Changes
                  </p>
                  <p>Click to recalculate scores after config changes</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-navy-800/70 border border-navy-700 backdrop-blur-sm shadow-xl">
            <CardHeader>
              <CardTitle className="text-lg text-cyan-400 flex items-center gap-2">
                <TrendingUp size={20} />
                Example Use Case: Finding Undervalued Growth Stories
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="text-xs">
                <strong>Objective:</strong> Identify companies with strong resource growth potential trading at attractive
                valuations.
              </p>

              <div className="space-y-2 text-xs">
                <p>
                  <strong>1. Filter Setup:</strong> Development Status = "Developer", Market Cap = $100M-$1B
                </p>
                <p>
                  <strong>2. Template:</strong> Start with "Growth Catalyst Seeker"
                </p>
                <p>
                  <strong>3. X-Axis Customization:</strong> Add "EV/Resource oz" metrics with 30% weight to enhance valuation
                  focus
                </p>
                <p>
                  <strong>4. Y-Axis Customization:</strong> Increase weight on "Future Production" to 40% for near-term
                  catalysts
                </p>
                <p>
                  <strong>5. Z-Axis:</strong> Set to "Cash Value" to identify well-funded opportunities
                </p>
                <p>
                  <strong>6. Analysis:</strong> Look for companies in the top-right with large bubbles - high growth
                  potential, attractive valuation, and strong cash position to execute.
                </p>
              </div>

              <div className="mt-4 p-3 bg-accent-teal/10 border border-accent-teal/30 rounded-md">
                <p className="text-xs">
                  <strong className="text-accent-teal">Result:</strong> This configuration might reveal developers with
                  significant resource expansion potential trading at discounts to peers, with the cash runway to advance
                  projects without excessive dilution - prime candidates for further due diligence.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}