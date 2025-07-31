// src/pages/help/fcf-scoring-guide.tsx
import React from 'react';
import { Helmet } from 'react-helmet-async';
import { PageContainer } from '../../components/ui/page-container';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import {
  DollarSign,
  Calculator,
  TrendingUp,
  TrendingDown,
  Target,
  AlertTriangle,
  Lightbulb,
  Settings,
  BarChart3,
  Info,
  BookOpen,
  Activity,
  Zap,
  Shield,
  Building2,
  Pickaxe,
  Crown,
  Factory,
  Users,
  FileText,
  CheckCircle,
  XCircle,
  ArrowRight,
  Eye,
  Brain,
  PieChart,
} from 'lucide-react';
import { cn } from '../../lib/utils';

export function HelpFCFScoringPage() {
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

  const backgroundImageUrl = '/Background2.jpg';

  return (
    <PageContainer
      title="Guide: FCF-Focused Scoring System"
      description="Master Free Cash Flow-centric analysis with company-type optimized scoring formulas for mining investments."
    >
      <Helmet>
        <title>MapleAurum | FCF Scoring Guide</title>
        <meta
          name="description"
          content="Complete guide to Free Cash Flow-focused scoring system for mining company analysis and investment decisions."
        />
      </Helmet>
      
      <div className="relative isolate">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat bg-fixed -z-10 opacity-[0.03]"
          style={{ backgroundImage: `url('${backgroundImageUrl}')` }}
          aria-hidden="true"
        />
        
        <div
          className={cn(
            'relative z-0 space-y-6 text-gray-300',
            'max-w-5xl mx-auto',
            'prose prose-sm sm:prose-base prose-invert',
            'prose-headings:text-cyan-400 prose-headings:font-semibold',
            'prose-a:text-accent-teal hover:prose-a:text-accent-yellow',
            'prose-strong:text-surface-white'
          )}
        >
          {/* Introduction */}
          <Card className="bg-navy-800/70 border border-navy-700 backdrop-blur-sm shadow-xl">
            <CardHeader>
              <CardTitle className="text-xl sm:text-2xl flex items-center gap-2.5">
                <DollarSign size={24} className="text-cyan-400" />
                Why Free Cash Flow Matters in Mining
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p>
                Free Cash Flow (FCF) is the ultimate test of a mining company's financial health. While earnings can be 
                manipulated through accounting practices, cash flow tells the real story of value creation. For mining 
                companies—which face volatile commodity prices, high capital requirements, and operational challenges—FCF 
                reveals which companies can consistently generate shareholder value.
              </p>
              
              <div className="bg-gradient-to-r from-cyan-900/20 to-teal-900/20 border-l-4 border-cyan-400 p-4 rounded-r-md">
                <p className="font-semibold text-cyan-400 mb-2">The FCF Scoring Advantage:</p>
                <p className="text-xs">
                  Traditional mining analysis often focuses on resources, production, or basic financial ratios. Our FCF-focused 
                  system goes deeper, using company-type specific formulas that weight metrics based on what actually drives 
                  cash generation for explorers, developers, producers, and royalty companies.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="bg-navy-900/40 p-3 rounded-md">
                  <h4 className="font-semibold text-green-400 mb-1 flex items-center gap-1">
                    <CheckCircle size={16} />
                    FCF Reveals
                  </h4>
                  <ul className="text-xs space-y-1 list-disc list-inside">
                    <li>Real cash generation ability</li>
                    <li>Capital allocation efficiency</li>
                    <li>Sustainability of operations</li>
                    <li>Dividend/buyback capacity</li>
                  </ul>
                </div>
                <div className="bg-navy-900/40 p-3 rounded-md">
                  <h4 className="font-semibold text-red-400 mb-1 flex items-center gap-1">
                    <XCircle size={16} />
                    FCF Exposes
                  </h4>
                  <ul className="text-xs space-y-1 list-disc list-inside">
                    <li>Cash burn unsustainability</li>
                    <li>Hidden capital needs</li>
                    <li>Operational inefficiencies</li>
                    <li>Dilution risks</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Company Type Framework */}
          <Card className="bg-navy-800/70 border border-navy-700 backdrop-blur-sm shadow-xl">
            <CardHeader>
              <CardTitle className="text-xl sm:text-2xl flex items-center gap-2.5">
                <Building2 size={24} className="text-cyan-400" />
                Company Type Framework
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p>
                Mining companies exist at different stages of the value chain, each with unique cash flow characteristics. 
                Our system recognizes these differences and applies specialized scoring formulas optimized for each type.
              </p>

              <div className="space-y-4">
                {/* Explorer */}
                <div className="border border-amber-700/50 bg-amber-900/10 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Pickaxe size={18} className="text-amber-400" />
                    <h4 className="font-semibold text-amber-400">Explorers</h4>
                    <span className="text-xs bg-amber-700/30 px-2 py-1 rounded">Pre-Revenue</span>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="font-medium text-gray-200 mb-1">Cash Flow Reality:</p>
                      <p>Negative FCF from exploration costs. Success measured by burn rate efficiency and discovery potential.</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-200 mb-1">Key FCF Metrics (Weights):</p>
                      <ul className="list-disc list-inside space-y-0.5">
                        <li>Cash Value (30%) - Survival runway</li>
                        <li>Free Cash Flow (15%) - Burn efficiency</li>
                        <li>Share Count (20%) - Dilution risk</li>
                        <li>Resource Potential (30%) - Upside</li>
                      </ul>
                    </div>
                  </div>
                  <div className="mt-3 text-xs bg-amber-800/20 p-2 rounded">
                    <strong>Scoring Logic:</strong> Lower cash burn = higher scores. Positive FCF for explorers = exceptional (100 points).
                  </div>
                </div>

                {/* Developer */}
                <div className="border border-blue-700/50 bg-blue-900/10 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Factory size={18} className="text-blue-400" />
                    <h4 className="font-semibold text-blue-400">Developers</h4>
                    <span className="text-xs bg-blue-700/30 px-2 py-1 rounded">Pre-Production</span>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="font-medium text-gray-200 mb-1">Cash Flow Reality:</p>
                      <p>High negative FCF during construction. Focus shifts to project economics and funding capacity.</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-200 mb-1">Key FCF Metrics (Weights):</p>
                      <ul className="list-disc list-inside space-y-0.5">
                        <li>Mineable Resources (25%) - Scale</li>
                        <li>Enterprise Value (20%) - Valuation</li>
                        <li>Free Cash Flow (15%) - Construction efficiency</li>
                        <li>Debt Management (15%) - Financial risk</li>
                      </ul>
                    </div>
                  </div>
                  <div className="mt-3 text-xs bg-blue-800/20 p-2 rounded">
                    <strong>Scoring Logic:</strong> Emphasis on controlled spending and clear path to production. Debt levels heavily weighted.
                  </div>
                </div>

                {/* Producer */}
                <div className="border border-green-700/50 bg-green-900/10 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Zap size={18} className="text-green-400" />
                    <h4 className="font-semibold text-green-400">Producers</h4>
                    <span className="text-xs bg-green-700/30 px-2 py-1 rounded">Cash Generating</span>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="font-medium text-gray-200 mb-1">Cash Flow Reality:</p>
                      <p>Positive FCF expected. Primary focus on cash generation efficiency and sustainability.</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-200 mb-1">Key FCF Metrics (Weights):</p>
                      <ul className="list-disc list-inside space-y-0.5">
                        <li>Free Cash Flow (30%) - Core driver</li>
                        <li>AISC Costs (20%) - Margin protection</li>
                        <li>Share Price (15%) - FCF yield</li>
                        <li>Enterprise Value (15%) - Valuation</li>
                      </ul>
                    </div>
                  </div>
                  <div className="mt-3 text-xs bg-green-800/20 p-2 rounded">
                    <strong>Scoring Logic:</strong> FCF is king. Cost control and reserve life ensure sustainability. FCF yield analysis crucial.
                  </div>
                </div>

                {/* Royalty */}
                <div className="border border-purple-700/50 bg-purple-900/10 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Crown size={18} className="text-purple-400" />
                    <h4 className="font-semibold text-purple-400">Royalty Companies</h4>
                    <span className="text-xs bg-purple-700/30 px-2 py-1 rounded">Asset-Light</span>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="font-medium text-gray-200 mb-1">Cash Flow Reality:</p>
                      <p>Highest FCF conversion. Minimal costs, pure cash flow plays. Valued on portfolio quality and growth.</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-200 mb-1">Key FCF Metrics (Weights):</p>
                      <ul className="list-disc list-inside space-y-0.5">
                        <li>Free Cash Flow (30%) - Pure play</li>
                        <li>Enterprise Value (20%) - Valuation</li>
                        <li>Precious Reserves (15%) - Portfolio</li>
                        <li>Current Production (15%) - Immediate cash</li>
                      </ul>
                    </div>
                  </div>
                  <div className="mt-3 text-xs bg-purple-800/20 p-2 rounded">
                    <strong>Scoring Logic:</strong> FCF consistency and growth. Portfolio diversification and operator quality matter.
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Scoring Mathematics */}
          <Card className="bg-navy-800/70 border border-navy-700 backdrop-blur-sm shadow-xl">
            <CardHeader>
              <CardTitle className="text-xl sm:text-2xl flex items-center gap-2.5">
                <Calculator size={24} className="text-cyan-400" />
                Scoring Mathematics & Methodology
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p>
                The FCF scoring system uses a sophisticated multi-step process that transforms raw company data into 
                comparable scores. Understanding this process helps you interpret results and make informed investment decisions.
              </p>

              <h4 className="text-md font-semibold text-cyan-400 mt-4">Step 1: Data Extraction & Validation</h4>
              <FormulaDisplay>
{`1. Extract metric values from company database
2. Apply per-share normalization if enabled:
   - FCF per share = FCF / Fully Diluted Shares
   - Cash per share = Cash / Fully Diluted Shares
   - Debt per share = Debt / Fully Diluted Shares
3. Handle missing data through smart imputation:
   - Conservative approach: Use peer group 25th/75th percentile
   - Preserve ranking integrity while penalizing data gaps`}
              </FormulaDisplay>

              <h4 className="text-md font-semibold text-cyan-400 mt-4">Step 2: Peer Group Analysis</h4>
              <FormulaDisplay>
{`For each metric and company type:
1. Calculate peer group statistics (mean, median, percentiles)
2. Minimum peer group size: 3 companies
3. Fallback to global statistics if peer group too small
4. Apply outlier detection using IQR method (1.5x rule)`}
              </FormulaDisplay>

              <h4 className="text-md font-semibold text-cyan-400 mt-4">Step 3: Metric Normalization (0-100 Scale)</h4>
              <FormulaDisplay>
{`Standard Formula:
percentile_rank = (rank - 1) / (total_companies - 1)
adjusted_percentile = higher_is_better ? percentile_rank : (1 - percentile_rank)

Sigmoid Transformation (for smooth score distribution):
k = 8 (steepness factor)
midpoint = 0.5
normalized_score = 100 / (1 + exp(-k * (adjusted_percentile - midpoint)))

Special Case - FCF for Explorers/Developers:
if (FCF >= 0): score = 100  // Positive FCF is exceptional
if (FCF < 0): score = burn_efficiency * 90  // Max 90 for negative FCF
burn_efficiency = (FCF - worst_peer_FCF) / (best_peer_FCF - worst_peer_FCF)`}
              </FormulaDisplay>

              <h4 className="text-md font-semibold text-cyan-400 mt-4">Step 4: Weighted Composite Calculation</h4>
              <FormulaDisplay>
{`For each company:
1. Calculate weighted contributions:
   contribution_i = (normalized_score_i * weight_i) / 100

2. Sum all contributions:
   total_weighted_sum = Σ contribution_i
   total_weight = Σ weight_i

3. Final Score Calculation:
   final_score = (total_weighted_sum / total_weight) * 100
   
4. Apply category adjustment:
   adjusted_score = final_score + category_bonus
   Category bonuses: Explorer (+12), Developer (+8), Producer (0), Royalty (-3)`}
              </FormulaDisplay>

              <div className="bg-navy-900/40 border-l-4 border-cyan-400 p-4 rounded-r-md mt-4">
                <p className="font-semibold text-cyan-400 mb-2">Why Category Adjustments?</p>
                <p className="text-xs">
                  Different company types face inherently different cash flow challenges. Explorers naturally have negative FCF, 
                  while royalty companies should have high FCF conversion. Category adjustments level the playing field, 
                  allowing meaningful comparison across the entire mining spectrum.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Configuration Panel Guide */}
          <Card className="bg-navy-800/70 border border-navy-700 backdrop-blur-sm shadow-xl">
            <CardHeader>
              <CardTitle className="text-xl sm:text-2xl flex items-center gap-2.5">
                <Settings size={24} className="text-cyan-400" />
                Configuration Panel Mastery
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <h4 className="font-semibold text-surface-white mb-2">Company Type Selection</h4>
              <p className="text-xs mb-3">
                Each company type tab loads a pre-optimized formula based on extensive research into what drives cash flow 
                for that category. You can view and modify any formula, but the defaults represent best practices.
              </p>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h5 className="font-medium text-gray-200">Metric Weight Control</h5>
                  <ul className="list-disc space-y-1 pl-5 text-xs">
                    <li><strong>Slider Control:</strong> Adjust weights from 0-50% per metric</li>
                    <li><strong>Total Weight Monitoring:</strong> System warns if total ≠ 100%</li>
                    <li><strong>Auto-Normalization:</strong> Weights automatically adjust to sum to 100%</li>
                    <li><strong>Hover for Rationale:</strong> Each metric shows detailed reasoning</li>
                  </ul>
                </div>
                <div className="space-y-3">
                  <h5 className="font-medium text-gray-200">Per-Share Normalization</h5>
                  <p className="text-xs">
                    Critical for comparing companies of different sizes. When enabled, financial metrics 
                    (FCF, Cash, Debt, EV) are divided by fully diluted shares before scoring.
                  </p>
                  <div className="bg-navy-900/40 p-2 rounded text-xs">
                    <strong>Use Cases:</strong><br/>
                    • Explorers: Compare cash per share runway<br/>
                    • Developers: FCF efficiency per share<br/>
                    • Producers: True FCF yield analysis
                  </div>
                </div>
              </div>

              <h4 className="font-semibold text-surface-white mb-2 mt-4">Metric Rationale System</h4>
              <p className="text-xs mb-2">
                Every metric includes comprehensive rationale explaining its importance for each company type:
              </p>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                <div className="bg-navy-900/40 p-3 rounded">
                  <h6 className="font-semibold text-green-400 text-xs mb-1 flex items-center gap-1">
                    <Lightbulb size={12} />
                    What to Look For
                  </h6>
                  <p className="text-xs">Positive indicators and target ranges for each metric</p>
                </div>
                <div className="bg-navy-900/40 p-3 rounded">
                  <h6 className="font-semibold text-red-400 text-xs mb-1 flex items-center gap-1">
                    <AlertTriangle size={12} />
                    Red Flags
                  </h6>
                  <p className="text-xs">Warning signs and concerning thresholds</p>
                </div>
                <div className="bg-navy-900/40 p-3 rounded">
                  <h6 className="font-semibold text-green-400 text-xs mb-1 flex items-center gap-1">
                    <CheckCircle size={12} />
                    Green Flags
                  </h6>
                  <p className="text-xs">Excellence indicators and competitive advantages</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Results Interpretation */}
          <Card className="bg-navy-800/70 border border-navy-700 backdrop-blur-sm shadow-xl">
            <CardHeader>
              <CardTitle className="text-xl sm:text-2xl flex items-center gap-2.5">
                <BarChart3 size={24} className="text-cyan-400" />
                Results Interpretation Guide
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <h4 className="font-semibold text-surface-white mb-2">Score Ranges & Meanings</h4>
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 mb-4">
                <div className="bg-gradient-to-b from-green-900/30 to-green-800/20 border border-green-700/50 p-3 rounded">
                  <h5 className="font-bold text-green-400 text-center">80-100</h5>
                  <p className="text-xs text-center mt-1">Exceptional</p>
                  <p className="text-xs mt-2">Top-tier FCF characteristics. Potential market leaders with superior cash generation.</p>
                </div>
                <div className="bg-gradient-to-b from-blue-900/30 to-blue-800/20 border border-blue-700/50 p-3 rounded">
                  <h5 className="font-bold text-blue-400 text-center">60-79</h5>
                  <p className="text-xs text-center mt-1">Strong</p>
                  <p className="text-xs mt-2">Above-average FCF profile. Solid fundamentals with competitive positioning.</p>
                </div>
                <div className="bg-gradient-to-b from-yellow-900/30 to-yellow-800/20 border border-yellow-700/50 p-3 rounded">
                  <h5 className="font-bold text-yellow-400 text-center">40-59</h5>
                  <p className="text-xs text-center mt-1">Average</p>
                  <p className="text-xs mt-2">Mixed FCF signals. Some strengths balanced by areas of concern.</p>
                </div>
                <div className="bg-gradient-to-b from-red-900/30 to-red-800/20 border border-red-700/50 p-3 rounded">
                  <h5 className="font-bold text-red-400 text-center">0-39</h5>
                  <p className="text-xs text-center mt-1">Challenged</p>
                  <p className="text-xs mt-2">Significant FCF challenges. Requires careful analysis or avoidance.</p>
                </div>
              </div>

              <h4 className="font-semibold text-surface-white mb-2">Detailed Breakdown Analysis</h4>
              <p className="text-xs mb-3">
                Click any company row to expand detailed metric breakdowns. This reveals the story behind the score:
              </p>

              <div className="space-y-3">
                <div className="bg-navy-900/40 p-3 rounded border-l-4 border-purple-400">
                  <h5 className="font-semibold text-purple-400 mb-1 flex items-center gap-1">
                    <Brain size={14} />
                    Insights & Analysis Tab
                  </h5>
                  <ul className="text-xs space-y-1 list-disc list-inside">
                    <li><strong>Strengths:</strong> Auto-generated highlights of exceptional performance</li>
                    <li><strong>Weaknesses:</strong> Areas of concern requiring attention</li>
                    <li><strong>Opportunities:</strong> Potential catalysts and growth drivers</li>
                    <li><strong>Risks:</strong> Red flags and potential pitfalls</li>
                    <li><strong>Impact Levels:</strong> High/Medium/Low priority for investment decisions</li>
                  </ul>
                </div>
              </div>

              <h4 className="font-semibold text-surface-white mb-2 mt-4">Confidence & Data Quality Indicators</h4>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <h5 className="font-medium text-gray-200 mb-2">Confidence Score</h5>
                  <p className="text-xs mb-2">
                    Reflects score reliability based on data completeness. Higher confidence means more reliable results.
                  </p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span>90-100%:</span>
                      <span className="text-green-400">High Confidence</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span>70-89%:</span>
                      <span className="text-yellow-400">Moderate Confidence</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span>Below 70%:</span>
                      <span className="text-red-400">Low Confidence</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h5 className="font-medium text-gray-200 mb-2">Data Completeness</h5>
                  <p className="text-xs mb-2">
                    Percentage of metrics with actual company data vs. estimated values.
                  </p>
                  <div className="bg-amber-900/20 border border-amber-700/30 p-2 rounded text-xs">
                    <strong>Key Point:</strong> "Value was estimated" flags appear when data is missing. 
                    Lower completeness may indicate data issues or company-specific reporting gaps.
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Advanced Strategies */}
          <Card className="bg-navy-800/70 border border-navy-700 backdrop-blur-sm shadow-xl">
            <CardHeader>
              <CardTitle className="text-xl sm:text-2xl flex items-center gap-2.5">
                <Target size={24} className="text-cyan-400" />
                Advanced Investment Strategies
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <h4 className="font-semibold text-surface-white mb-2">Strategy 1: FCF Quality Screening</h4>
              <div className="bg-navy-900/40 p-4 rounded border border-cyan-700/30">
                <p className="text-xs mb-3">
                  <strong>Objective:</strong> Identify companies with sustainable, high-quality free cash flow generation.
                </p>
                <div className="space-y-2 text-xs">
                  <p><strong>Step 1:</strong> Filter to Producers with Market Cap more than $500M</p>
                  <p><strong>Step 2:</strong> Focus on companies scoring 70+ in FCF Scoring</p>
                  <p><strong>Step 3:</strong> Analyze FCF Component specifically - look for 60+ scores</p>
                  <p><strong>Step 4:</strong> Check AISC breakdown - low costs (70+ normalized score) provide margin safety</p>
                  <p><strong>Step 5:</strong> Verify Reserve Life greater than 10 years for sustainability</p>
                </div>
                <div className="mt-3 bg-cyan-900/20 p-2 rounded">
                  <p className="text-xs"><strong>Expected Outcome:</strong> Mature producers with strong, sustainable cash flows suitable for dividend/income strategies.</p>
                </div>
              </div>

              <h4 className="font-semibold text-surface-white mb-2 mt-4">Strategy 2: Value Discovery in Developers</h4>
              <div className="bg-navy-900/40 p-4 rounded border border-blue-700/30">
                <p className="text-xs mb-3">
                  <strong>Objective:</strong> Find development-stage companies with strong fundamentals trading at discounts.
                </p>
                <div className="space-y-2 text-xs">
                  <p><strong>Step 1:</strong> Filter to Developers, enable Per-Share Normalization</p>
                  <p><strong>Step 2:</strong> Look for scores 55+ (above-average for pre-production)</p>
                  <p><strong>Step 3:</strong> Examine Enterprise Value component - look for lower scores (undervaluation)</p>
                  <p><strong>Step 4:</strong> Check Mineable Resources - high scores indicate substantial resource base</p>
                  <p><strong>Step 5:</strong> Verify manageable debt levels and reasonable construction costs</p>
                </div>
                <div className="mt-3 bg-blue-900/20 p-2 rounded">
                  <p className="text-xs"><strong>Expected Outcome:</strong> Well-resourced developers with strong project economics trading below fair value.</p>
                </div>
              </div>

              <h4 className="font-semibold text-surface-white mb-2 mt-4">Strategy 3: Explorer Survival Analysis</h4>
              <div className="bg-navy-900/40 p-4 rounded border border-amber-700/30">
                <p className="text-xs mb-3">
                  <strong>Objective:</strong> Identify explorers with longest survival runway and best discovery potential.
                </p>
                <div className="space-y-2 text-xs">
                  <p><strong>Step 1:</strong> Filter to Explorers, enable Per-Share Normalization</p>
                  <p><strong>Step 2:</strong> Focus on Cash Value breakdown - look for 70+ scores (strong cash position)</p>
                  <p><strong>Step 3:</strong> Check FCF Component - higher scores indicate efficient burn rates</p>
                  <p><strong>Step 4:</strong> Examine Share Count - lower scores mean tight structure, less dilution risk</p>
                  <p><strong>Step 5:</strong> Verify Resource Potential for meaningful upside</p>
                </div>
                <div className="mt-3 bg-amber-900/20 p-2 rounded">
                  <p className="text-xs"><strong>Expected Outcome:</strong> Well-funded explorers with efficient spending and significant discovery potential.</p>
                </div>
              </div>

              <h4 className="font-semibold text-surface-white mb-2 mt-4">Strategy 4: Royalty Yield Play</h4>
              <div className="bg-navy-900/40 p-4 rounded border border-purple-700/30">
                <p className="text-xs mb-3">
                  <strong>Objective:</strong> Find royalty companies offering attractive FCF yields with growth potential.
                </p>
                <div className="space-y-2 text-xs">
                  <p><strong>Step 1:</strong> Filter to Royalty companies</p>
                  <p><strong>Step 2:</strong> Look for overall scores 65+ (strong FCF characteristics)</p>
                  <p><strong>Step 3:</strong> Analyze FCF Component for consistency (70+ preferred)</p>
                  <p><strong>Step 4:</strong> Check Enterprise Value for valuation attractiveness</p>
                  <p><strong>Step 5:</strong> Verify diversified asset base through Precious Reserves and Current Production</p>
                </div>
                <div className="mt-3 bg-purple-900/20 p-2 rounded">
                  <p className="text-xs"><strong>Expected Outcome:</strong> High-quality royalty companies with attractive valuations and stable cash flows.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Common Pitfalls */}
          <Card className="bg-navy-800/70 border border-navy-700 backdrop-blur-sm shadow-xl">
            <CardHeader>
              <CardTitle className="text-xl sm:text-2xl flex items-center gap-2.5">
                <AlertTriangle size={24} className="text-cyan-400" />
                Common Pitfalls & How to Avoid Them
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="space-y-4">
                <div className="bg-red-900/20 border border-red-700/30 p-4 rounded">
                  <h5 className="font-semibold text-red-400 mb-2 flex items-center gap-1">
                    <XCircle size={16} />
                    Pitfall 1: Ignoring Company Type Context
                  </h5>
                  <p className="text-xs mb-2">
                    <strong>Mistake:</strong> Comparing an explorer's 45 score to a producer's 45 score and assuming equal quality.
                  </p>
                  <p className="text-xs text-gray-300">
                    <strong>Solution:</strong> Always consider company type. An explorer scoring 45 faces different challenges than 
                    a producer scoring 45. Use peer rankings within type for fairer comparisons.
                  </p>
                </div>

                <div className="bg-red-900/20 border border-red-700/30 p-4 rounded">
                  <h5 className="font-semibold text-red-400 mb-2 flex items-center gap-1">
                    <XCircle size={16} />
                    Pitfall 2: Over-Relying on Estimated Values
                  </h5>
                  <p className="text-xs mb-2">
                    <strong>Mistake:</strong> Making investment decisions on companies with extensive "Value was estimated" flags.
                  </p>
                  <p className="text-xs text-gray-300">
                    <strong>Solution:</strong> Check confidence scores and data completeness. Companies with under 70% data completeness 
                    require additional due diligence. Consider why data might be missing.
                  </p>
                </div>

                <div className="bg-red-900/20 border border-red-700/30 p-4 rounded">
                  <h5 className="font-semibold text-red-400 mb-2 flex items-center gap-1">
                    <XCircle size={16} />
                    Pitfall 3: Misunderstanding Per-Share Normalization
                  </h5>
                  <p className="text-xs mb-2">
                    <strong>Mistake:</strong> Comparing normalized scores to absolute figures, or using per-share data inappropriately.
                  </p>
                  <p className="text-xs text-gray-300">
                    <strong>Solution:</strong> When per-share normalization is enabled, remember that FCF, Cash, and Debt figures 
                    shown are per-share values. Use absolute figures for enterprise-level analysis.
                  </p>
                </div>

                <div className="bg-red-900/20 border border-red-700/30 p-4 rounded">
                  <h5 className="font-semibold text-red-400 mb-2 flex items-center gap-1">
                    <XCircle size={16} />
                    Pitfall 4: Single-Score Investment Decisions
                  </h5>
                  <p className="text-xs mb-2">
                    <strong>Mistake:</strong> Buying/selling based solely on FCF scores without deeper analysis.
                  </p>
                  <p className="text-xs text-gray-300">
                    <strong>Solution:</strong> Use FCF scores as a screening tool, not a final decision maker. Always expand metric 
                    breakdowns, read insights, and conduct additional fundamental analysis.
                  </p>
                </div>

                <div className="bg-yellow-900/20 border border-yellow-700/30 p-4 rounded">
                  <h5 className="font-semibold text-yellow-400 mb-2 flex items-center gap-1">
                    <AlertTriangle size={16} />
                    Important: Market Context Matters
                  </h5>
                  <p className="text-xs text-gray-300">
                    FCF scores reflect historical and current data. Consider commodity cycles, market conditions, and company-specific 
                    catalysts. A low-scoring company might be at a cyclical bottom with improvement ahead, while a high-scoring 
                    company might be at peak margins.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Technical Details */}
          <Card className="bg-navy-800/70 border border-navy-700 backdrop-blur-sm shadow-xl">
            <CardHeader>
              <CardTitle className="text-xl sm:text-2xl flex items-center gap-2.5">
                <Activity size={24} className="text-cyan-400" />
                Technical Implementation Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <h4 className="font-semibold text-surface-white mb-2">Data Sources & Validation</h4>
              <div className="bg-navy-900/40 p-3 rounded text-xs">
                <ul className="space-y-1 list-disc list-inside">
                  <li><strong>Financial Data:</strong> Company filings, quarterly reports, annual statements</li>
                  <li><strong>Production Data:</strong> Company guidance, technical reports, quarterly updates</li>
                  <li><strong>Resource Data:</strong> NI 43-101 reports, feasibility studies, resource estimates</li>
                  <li><strong>Market Data:</strong> Real-time pricing, trading volumes, market capitalizations</li>
                  <li><strong>Update Frequency:</strong> Daily market data, quarterly fundamental updates</li>
                </ul>
              </div>

              <h4 className="font-semibold text-surface-white mb-2 mt-4">Statistical Robustness</h4>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
                <div>
                  <h5 className="font-medium text-gray-200 mb-1">Outlier Handling</h5>
                  <p>IQR method (1.5x rule) removes extreme outliers while preserving legitimate high/low performers. Ensures scores reflect operational reality, not data errors.</p>
                </div>
                <div>
                  <h5 className="font-medium text-gray-200 mb-1">Minimum Sample Sizes</h5>
                  <p>Peer groups require minimum 3 companies. Smaller groups fall back to global statistics. Prevents scoring distortion from tiny sample sizes.</p>
                </div>
                <div>
                  <h5 className="font-medium text-gray-200 mb-1">Missing Data Strategy</h5>
                  <p>Conservative imputation penalizes missing data while maintaining ranking integrity. Uses peer-group percentiles rather than means to avoid bias.</p>
                </div>
                <div>
                  <h5 className="font-medium text-gray-200 mb-1">Score Distribution</h5>
                  <p>Sigmoid transformation ensures smooth score distribution while preserving percentile rankings. Avoids clustering around mean values.</p>
                </div>
              </div>

              <h4 className="font-semibold text-surface-white mb-2 mt-4">Performance & Scalability</h4>
              <FormulaDisplay>
{`System Performance Characteristics:
• Processing Speed: ~50ms per company for full scoring
• Concurrent Users: Optimized for 100+ simultaneous calculations
• Data Cache: 5-minute refresh cycle for market data
• Memory Usage: ~2MB per 1000 companies in memory
• API Response: <200ms for typical scoring requests

Scalability Features:
• Lazy loading of detailed breakdowns
• Pagination for large result sets (50 companies per page)
• Background calculation with progress indicators
• Efficient data structures for rapid peer comparisons`}
              </FormulaDisplay>
            </CardContent>
          </Card>

          {/* Practical Examples */}
          <Card className="bg-navy-800/70 border border-navy-700 backdrop-blur-sm shadow-xl">
            <CardHeader>
              <CardTitle className="text-xl sm:text-2xl flex items-center gap-2.5">
                <FileText size={24} className="text-cyan-400" />
                Real-World Example: Case Study Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <h4 className="font-semibold text-surface-white mb-2">Case Study: Evaluating a Mid-Tier Gold Producer</h4>
              
              <div className="bg-navy-900/40 p-4 rounded border border-cyan-700/30">
                <p className="text-xs mb-3">
                  <strong>Company Profile:</strong> $2B market cap gold producer, 300koz annual production, 12-year reserve life
                </p>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
                  <div>
                    <h5 className="font-semibold text-cyan-400 mb-2">FCF Scoring Results:</h5>
                    <ul className="space-y-1 list-disc list-inside">
                      <li>Overall Score: 72.3 (Strong)</li>
                      <li>FCF Component: 68 (Above Average)</li>
                      <li>Peer Rank: 15/47 producers</li>
                      <li>Confidence: 85% (High)</li>
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-semibold text-cyan-400 mb-2">Key Metric Breakdown:</h5>
                    <ul className="space-y-1 list-disc list-inside">
                      <li>Free Cash Flow: $180M (Score: 68)</li>
                      <li>AISC: $1,150/oz (Score: 75)</li>
                      <li>Reserve Life: 12 years (Score: 65)</li>
                      <li>FCF Yield: 9% (Score: 70)</li>
                    </ul>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  <div className="bg-green-900/20 border-l-4 border-green-400 p-3">
                    <h6 className="font-semibold text-green-400 mb-1">Generated Insights - Strengths:</h6>
                    <ul className="text-xs space-y-1 list-disc list-inside">
                      <li>Excellent cost control - AISC in top quartile of peer group</li>
                      <li>Strong FCF generation with 9% yield attractive vs. current interest rates</li>
                      <li>Consistent cash flow provides dividend sustainability</li>
                    </ul>
                  </div>

                  <div className="bg-yellow-900/20 border-l-4 border-yellow-400 p-3">
                    <h6 className="font-semibold text-yellow-400 mb-1">Generated Insights - Areas of Focus:</h6>
                    <ul className="text-xs space-y-1 list-disc list-inside">
                      <li>Reserve life at median - exploration success critical for long-term sustainability</li>
                      <li>FCF growth potential limited without production expansion</li>
                      <li>Capital allocation strategy unclear - excess cash building on balance sheet</li>
                    </ul>
                  </div>
                </div>

                <div className="mt-4 bg-cyan-900/20 p-3 rounded">
                  <h6 className="font-semibold text-cyan-400 mb-1">Investment Thesis:</h6>
                  <p className="text-xs">
                    This producer represents a solid, if unspectacular, cash flow play. The 72.3 score reflects strong 
                    operational fundamentals with room for improvement in capital allocation and reserve replacement. 
                    Suitable for income-focused investors seeking steady FCF generation with moderate upside potential.
                  </p>
                </div>
              </div>

              <h4 className="font-semibold text-surface-white mb-2 mt-4">Comparative Analysis Framework</h4>
              <div className="bg-navy-900/40 p-4 rounded">
                <p className="text-xs mb-3">
                  When comparing multiple companies, consider these analytical layers:
                </p>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 text-xs">
                  <div>
                    <h6 className="font-semibold text-gray-200 mb-1">Tier 1: Screening</h6>
                    <ul className="space-y-1 list-disc list-inside">
                      <li>Overall score comparison</li>
                      <li>Confidence levels</li>
                      <li>Basic peer ranking</li>
                    </ul>
                  </div>
                  <div>
                    <h6 className="font-semibold text-gray-200 mb-1">Tier 2: Deep Dive</h6>
                    <ul className="space-y-1 list-disc list-inside">
                      <li>Metric-by-metric analysis</li>
                      <li>Strengths/weaknesses comparison</li>
                      <li>Data quality assessment</li>
                    </ul>
                  </div>
                  <div>
                    <h6 className="font-semibold text-gray-200 mb-1">Tier 3: Context</h6>
                    <ul className="space-y-1 list-disc list-inside">
                      <li>Market conditions impact</li>
                      <li>Company-specific catalysts</li>
                      <li>Valuation vs. FCF quality</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Best Practices Summary */}
          <Card className="bg-navy-800/70 border border-navy-700 backdrop-blur-sm shadow-xl">
            <CardHeader>
              <CardTitle className="text-xl sm:text-2xl flex items-center gap-2.5">
                <CheckCircle size={24} className="text-cyan-400" />
                Best Practices Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-semibold text-green-400 flex items-center gap-1">
                    <CheckCircle size={16} />
                    Do These Things
                  </h4>
                  <div className="space-y-3">
                    <div className="bg-green-900/20 border border-green-700/30 p-3 rounded">
                      <h5 className="font-medium text-surface-white text-xs mb-1">Start with Company Type</h5>
                      <p className="text-xs">Always select the appropriate company type first. The pre-built formulas reflect years of research into what drives FCF for each category.</p>
                    </div>
                    <div className="bg-green-900/20 border border-green-700/30 p-3 rounded">
                      <h5 className="font-medium text-surface-white text-xs mb-1">Use Per-Share Normalization Wisely</h5>
                      <p className="text-xs">Enable for comparing companies of different sizes within the same category. Particularly valuable for explorers and developers.</p>
                    </div>
                    <div className="bg-green-900/20 border border-green-700/30 p-3 rounded">
                      <h5 className="font-medium text-surface-white text-xs mb-1">Check Data Quality</h5>
                      <p className="text-xs">Always review confidence scores and data completeness. Low confidence scores warrant additional due diligence.</p>
                    </div>
                    <div className="bg-green-900/20 border border-green-700/30 p-3 rounded">
                      <h5 className="font-medium text-surface-white text-xs mb-1">Read the Insights</h5>
                      <p className="text-xs">Auto-generated insights highlight the most important aspects of each company's FCF profile. Use them to guide further analysis.</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold text-red-400 flex items-center gap-1">
                    <XCircle size={16} />
                    Avoid These Mistakes
                  </h4>
                  <div className="space-y-3">
                    <div className="bg-red-900/20 border border-red-700/30 p-3 rounded">
                      <h5 className="font-medium text-surface-white text-xs mb-1">Don't Ignore Company Context</h5>
                      <p className="text-xs">A 60-scoring explorer is different from a 60-scoring producer. Always consider the company type and stage-specific challenges.</p>
                    </div>
                    <div className="bg-red-900/20 border border-red-700/30 p-3 rounded">
                      <h5 className="font-medium text-surface-white text-xs mb-1">Don't Over-Weight Single Metrics</h5>
                      <p className="text-xs">Resist the urge to put 80%+ weight on one metric. The power of FCF scoring lies in balanced, multi-factor analysis.</p>
                    </div>
                    <div className="bg-red-900/20 border border-red-700/30 p-3 rounded">
                      <h5 className="font-medium text-surface-white text-xs mb-1">Don't Make Decisions on Scores Alone</h5>
                      <p className="text-xs">FCF scores are screening tools, not final investment decisions. Always conduct additional fundamental analysis.</p>
                    </div>
                    <div className="bg-red-900/20 border border-red-700/30 p-3 rounded">
                      <h5 className="font-medium text-surface-white text-xs mb-1">Don't Ignore Market Cycles</h5>
                      <p className="text-xs">Scores reflect recent performance. Consider commodity cycles and whether companies are at cyclical highs or lows.</p>
                    </div>
                  </div>
                </div>
              </div>

			  <div className="mt-6 bg-gradient-to-r from-cyan-900/30 to-teal-900/30 border border-cyan-700/50 p-4 rounded">
                <h4 className="font-semibold text-cyan-400 mb-2 flex items-center gap-1">
                  <Lightbulb size={16} />
                  Final Thoughts: The Art of FCF Analysis
                </h4>
                <p className="text-xs leading-relaxed">
                  The FCF Scoring system provides a powerful framework for analyzing mining companies, but remember that 
                  successful investing combines quantitative analysis with qualitative judgment. Use these scores to identify 
                  promising opportunities and concerning situations, then apply your knowledge of markets, management quality, 
                  geopolitical factors, and commodity cycles to make informed investment decisions.
                </p>
                <p className="text-xs mt-2 leading-relaxed">
                  The goal isn't to find the perfect score, but to understand the story each company's cash flow tells about 
                  its operational efficiency, financial health, and long-term sustainability. Master this framework, and you'll 
                  have a significant edge in mining sector analysis.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
