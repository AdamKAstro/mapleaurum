import React from 'react';
import { Helmet } from 'react-helmet';
import { PageContainer } from '@/components/ui/page-container';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BrainCircuit,
  Settings2,
  Scaling,
  Filter,
  ListOrdered,
  ShieldCheck,
  Microscope,
  DivideSquare,
  GitBranch,
  FlaskConical,
  Lightbulb,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function HelpScoringPage() {
    const FormulaDisplay: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
        <div className={cn("my-3 p-4 bg-navy-900/60 border border-navy-700 rounded-lg text-sm shadow-inner overflow-x-auto", className)}>
            <pre className="text-cyan-300 whitespace-pre-wrap font-mono text-xs md:text-sm leading-relaxed m-0 p-0 bg-transparent">{children}</pre>
        </div>
    );

    const InfoBox: React.FC<{ title: string; icon: React.ElementType; color: 'teal' | 'green' | 'yellow' | 'red'; children: React.ReactNode }> = ({ title, icon: Icon, color, children }) => {
        const colorClasses = {
            teal: 'bg-accent-teal/10 border-accent-teal/30 text-accent-teal',
            green: 'bg-green-900/20 border-green-700/30 text-green-400',
            yellow: 'bg-yellow-900/20 border-yellow-700/30 text-yellow-400',
            red: 'bg-red-900/20 border-red-700/30 text-red-400',
        };
        return (
            <div className={cn('p-3 rounded-md border', colorClasses[color])}>
                <p className="font-semibold flex items-center gap-2 mb-1">
                    <Icon size={16} /> {title}
                </p>
                <div className="text-xs text-gray-300/80 space-y-1">{children}</div>
            </div>
        );
    };

    return (
        <PageContainer title="Guide: Advanced Scoring Engine" description="A technical and methodological guide to the advanced company scoring and ranking engine.">
            <Helmet>
                <title>MapleAurum | Advanced Scoring Guide</title>
                <meta name="description" content="Master the Advanced Scoring Engine with our in-depth guide covering dynamic weighting, per-share normalization, and robust statistical methods."/>
            </Helmet>
            <div className="relative z-0 space-y-8 text-gray-300 max-w-4xl mx-auto prose prose-sm sm:prose-base prose-invert prose-headings:text-cyan-400 prose-headings:font-semibold prose-a:text-accent-teal hover:prose-a:text-accent-yellow prose-strong:text-surface-white">
                
                <Card className="bg-navy-800/70 border border-navy-700 backdrop-blur-sm shadow-xl">
                    <CardHeader><CardTitle className="text-xl sm:text-2xl flex items-center gap-2.5"><BrainCircuit size={24} className="text-cyan-400"/> The Advanced Scoring Engine</CardTitle></CardHeader>
                    <CardContent className="space-y-4 text-sm">
                        <p>The Advanced Scoring Engine is a professional-grade analysis tool designed for dynamic, data-driven company evaluation. It moves beyond simple weighting by programmatically assessing data quality and scoring companies against relevant peer groups.</p>
                        <InfoBox title="Key Innovation" icon={Lightbulb} color="teal">
                            <p>This system applies distinct scoring strategies for <strong>Producers, Developers, Explorers,</strong> and <strong>Royalty</strong> companies. This ensures that a junior explorer is judged on its potential and financial health, while a major producer is judged on its operational efficiency and profitability, providing a fair and insightful comparison.</p>
                        </InfoBox>
                    </CardContent>
                </Card>

                <Card className="bg-navy-800/70 border border-navy-700 backdrop-blur-sm shadow-xl">
                    <CardHeader><CardTitle className="text-xl sm:text-2xl flex items-center gap-2.5"><Settings2 size={24} className="text-cyan-400" /> The Configuration Panel</CardTitle></CardHeader>
                    <CardContent className="space-y-4 text-sm">
                        <p>Your primary control interface allows you to define every aspect of the scoring model for each company type.</p>
                        <h4 className="font-semibold text-surface-white">Strategy Settings (Per-Status Tabs)</h4>
                        <p className="text-xs">Select a tab (e.g., Producer, Explorer) to define a unique scoring strategy for that cohort. Key settings include:</p>
                        <ul className="list-disc space-y-2 pl-5 text-xs">
                            <li><strong>Normalization:</strong> The statistical method for scaling raw data to a 0-1 range.</li>
                            <li><strong>Missing Values (Imputation):</strong> The strategy for handling null or missing data points.</li>
                            <li><strong>Sigmoid Steepness (k):</strong> An advanced setting to control the "spread" of final scores.</li>
                            <li><strong>Normalize by Shares:</strong> A powerful tool to enable size-agnostic, per-share analysis.</li>
                        </ul>
                         <h4 className="font-semibold text-surface-white">Metric Base Weights</h4>
                        <p className="text-xs">Assign a base level of importance (0-100) to any metric accessible by your tier. The engine uses this as a starting point before applying its own dynamic adjustments based on metric priority.</p>
                    </CardContent>
                </Card>

                <Card className="bg-navy-800/70 border border-navy-700 backdrop-blur-sm shadow-xl">
                    <CardHeader><CardTitle className="text-xl sm:text-2xl flex items-center gap-2.5"><GitBranch size={24} className="text-cyan-400" /> The Scoring Workflow</CardTitle></CardHeader>
                    <CardContent className="space-y-4 text-sm">
                         <p>The engine follows a sophisticated, multi-step process for each company:</p>
                        <ol className="list-decimal space-y-2 pl-5 text-sm">
                            <li><strong>Peer Group Definition:</strong> Companies are first grouped by status (Producer, etc.) and market cap to ensure they are compared against relevant peers.</li>
                            <li><strong>Dynamic Weighting:</strong> The engine takes your base weights and applies a multiplier for high-priority metrics (e.g., Cash for an Explorer), amplifying what's most important for that company type.</li>
                            <li><strong>Per-Share Adjustment (Optional):</strong> If "Normalize by Shares" is active for the strategy, absolute financial metrics are divided by shares outstanding.</li>
                            <li><strong>Imputation:</strong> Missing data for a metric is filled in using the chosen strategy (e.g., the 25th percentile of its peers).</li>
                            <li><strong>Normalization:</strong> The (now complete) data for each metric is scaled to a common 0-1 range using the selected statistical method.</li>
                            <li><strong>Transformation & Aggregation:</strong> Scores are optionally transformed to improve distribution, then aggregated into a final weighted score from 0-100.</li>
                        </ol>
                    </CardContent>
                </Card>

                <Card className="bg-navy-800/70 border border-navy-700 backdrop-blur-sm shadow-xl">
                    <CardHeader><CardTitle className="text-xl sm:text-2xl flex items-center gap-2.5"><FlaskConical size={24} className="text-cyan-400" /> Recommended Strategies & Settings</CardTitle></CardHeader>
                    <CardContent className="space-y-4 text-sm">
                        <InfoBox title="To Find Undervalued Producers" icon={TrendingUp} color="green">
                           <p><strong>Goal:</strong> Identify profitable producers trading at a discount.</p>
                           <p><strong>Settings:</strong> Enable <strong>Normalize by Shares</strong>. Set high base weights on ratio metrics like <strong>EV/EBITDA</strong> and <strong>P/B Ratio</strong>, and cost metrics like <strong>AISC</strong>. Use a lower <strong>Sigmoid Steepness (e.g., 8-10)</strong> as data is often more normally distributed.</p>
                        </InfoBox>
                        <InfoBox title="To Find High-Potential Explorers" icon={TrendingUp} color="green">
                           <p><strong>Goal:</strong> Find well-funded explorers with significant discovery potential before the market does.</p>
                           <p><strong>Settings:</strong> Enable <strong>Normalize by Shares</strong>. Use <strong>Conservative</strong> imputation to heavily penalize missing data. Set high weights on <strong>Cash</strong>, <strong>Net Financial Assets</strong>, and <strong>Total Resources</strong>. Use a higher <strong>Sigmoid Steepness (e.g., 15-20)</strong> to spread out the tightly-clustered scores.</p>
                        </InfoBox>
                    </CardContent>
                </Card>

                <Card className="bg-navy-800/70 border border-navy-700 backdrop-blur-sm shadow-xl">
                    <CardHeader><CardTitle className="text-xl sm:text-2xl flex items-center gap-2.5"><Lightbulb size={24} className="text-cyan-400" /> Best Practices & Tips</CardTitle></CardHeader>
                    <CardContent className="space-y-4 text-sm">
                        <InfoBox title="Do: Balance Your Metrics" icon={CheckCircle2} color="green">
                            <p>Include both backward-looking (financial results) and forward-looking (reserves, growth) metrics. Mix absolute measures (Market Cap) with efficiency ratios (EV/EBITDA) for a holistic view.</p>
                        </InfoBox>
                        <InfoBox title="Caution: Normalization Impact" icon={AlertTriangle} color="yellow">
                            <p>Scores are relative to the currently filtered dataset. A company scoring 80 among junior explorers might score 40 when compared against major producers. Always be aware of your active peer group.</p>
                        </InfoBox>
                        <InfoBox title="Avoid: Single Metric Dominance" icon={XCircle} color="red">
                            <p>Avoid assigning 80%+ weight to one metric unless intentionally creating a single-factor analysis. The power of this tool lies in balanced, multi-factor scoring.</p>
                        </InfoBox>
                    </CardContent>
                </Card>

                 <Card className="bg-navy-800/70 border border-navy-700 backdrop-blur-sm shadow-xl">
                    <CardHeader><CardTitle className="text-xl sm:text-2xl flex items-center gap-2.5"><Microscope size={24} className="text-cyan-400" /> Interpreting the Results</CardTitle></CardHeader>
                    <CardContent className="space-y-4 text-sm">
                        <p>The output table is more than just a ranked list. Use these columns to understand the "why" behind the numbers:</p>
                        <ul className="list-disc space-y-3 pl-5">
                            <li><strong>Final Score:</strong> A relative 0-100 score for ranking companies within this specific analysis. A higher score indicates better performance against the metrics you prioritized.</li>
                            <li><strong className="text-surface-white">Confidence Score:</strong> An essential measure of data quality (0-100%). It shows what percentage of the score was derived from actual, reported data. A low score means the rank is based more on statistical imputation than hard numbers.</li>
                            <li><strong className="text-surface-white">Row Tooltip:</strong> Hover over any company row to see a quick summary of the top 3 metrics that positively contributed to its score.</li>
                            <li><strong className="text-surface-white">Score Breakdown (Expandable Row):</strong> Click a row to expand it. This is the most critical tool for transparency, allowing you to audit the entire scoring process and see each metric's raw value, adjusted weight, and final contribution to the score.</li>
                        </ul>
                    </CardContent>
                </Card>

            </div>
        </PageContainer>
    );
}