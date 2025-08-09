// src/pages/help/rps-scoring-guide.tsx

import React from 'react';
import { Helmet } from 'react-helmet-async';
import { PageContainer } from '../../components/ui/page-container';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import {
    BarChart3,
    Calculator,
    Users,
    Scale,
    Factory,
    Eye,
    Pickaxe,
    Zap,
    Crown,
    Target,
    Settings,
} from 'lucide-react';
import { cn } from '../../lib/utils';

export function HelpRPSScoringPage() {
    // Component for mathematical formula display
    const FormulaDisplay: React.FC<{ children: string; className?: string }> = ({ children, className }) => (
        <div className={cn('my-3 p-3 bg-navy-900/60 border border-navy-700 rounded-md text-sm shadow-inner overflow-x-auto', className)}>
            <pre className="text-cyan-300 whitespace-pre-wrap font-mono text-[0.8rem] sm:text-xs md:text-sm leading-relaxed m-0 p-0 bg-transparent">
                {children}
            </pre>
        </div>
    );

    return (
        <PageContainer
            title="Guide: Relative Performance Score (RPS)"
            description="Master relative-value analysis with a dynamic scoring system that compares companies to their most relevant peers."
        >
            <Helmet>
                <title>MapleAurum | RPS Scoring Guide</title>
                <meta name="description" content="Complete guide to the Relative Performance Score (RPS) system for advanced mining company analysis." />
            </Helmet>
            
            <div className={cn(
                'relative z-0 space-y-6 text-gray-300 max-w-5xl mx-auto prose prose-sm sm:prose-base prose-invert',
                'prose-headings:text-cyan-400 prose-headings:font-semibold prose-a:text-accent-teal hover:prose-a:text-accent-yellow prose-strong:text-surface-white'
            )}>

                {/* Introduction to RPS */}
                <Card className="bg-navy-800/70 border border-navy-700 backdrop-blur-sm shadow-xl">
                    <CardHeader>
                        <CardTitle className="text-xl sm:text-2xl flex items-center gap-2.5">
                            <BarChart3 size={24} className="text-cyan-400" />
                            Beyond Absolute Scores: Why Relative Performance Matters
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm">
                        <p>
                            In investing, context is everything. Is a score of 75 good? It depends. A score of 75 for a senior gold producer means something entirely different than a 75 for a pre-revenue explorer. A single, absolute score can be misleading because it ignores the vast differences in scale, risk, and business models across the mining sector.
                        </p>
                        <div className="bg-gradient-to-r from-cyan-900/20 to-teal-900/20 border-l-4 border-cyan-400 p-4 rounded-r-md">
                            <p className="font-semibold text-cyan-400 mb-2">The RPS Advantage:</p>
                            <p className="text-xs">
                                The **Relative Performance Score (RPS)** was designed to solve this problem. Instead of providing one number, it analyzes a company through three distinct lenses, scoring it against its true peers. This provides a multi-dimensional view of a company's strengths and weaknesses, helping you uncover value that others might miss.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* The Three Peer Groups */}
                <Card className="bg-navy-800/70 border border-navy-700 backdrop-blur-sm shadow-xl">
                    <CardHeader>
                        <CardTitle className="text-xl sm:text-2xl flex items-center gap-2.5">
                            <Eye size={24} className="text-cyan-400" />
                            The Three Lenses of Analysis: Understanding Peer Groups
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm">
                        <p>The power of the RPS comes from its three dynamic peer groups. Your master sliders give you control over how much weight each peer group's score contributes to the final RPS.</p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="border border-teal-700/50 bg-teal-900/10 rounded-lg p-4 text-center flex flex-col items-center">
                                <Users size={24} className="text-teal-400 mb-2" />
                                <h4 className="font-semibold text-teal-400">Status Peers</h4>
                                <p className="text-xs mt-2">The big picture. How does this company rank against **all** other companies of the same status (e.g., all 400+ Explorers)?</p>
                            </div>
                            <div className="border border-sky-700/50 bg-sky-900/10 rounded-lg p-4 text-center flex flex-col items-center">
                                <Scale size={24} className="text-sky-400 mb-2" />
                                <h4 className="font-semibold text-sky-400">Valuation Peers</h4>
                                <p className="text-xs mt-2">The direct financial competitors. How does it rank against the **10 most similarly-sized** companies by Market Cap and Enterprise Value?</p>
                            </div>
                            <div className="border border-indigo-700/50 bg-indigo-900/10 rounded-lg p-4 text-center flex flex-col items-center">
                                <Factory size={24} className="text-indigo-400 mb-2" />
                                <h4 className="font-semibold text-indigo-400">Operational Peers</h4>
                                <p className="text-xs mt-2">The "apples-to-apples" view. How does it rank against companies with a **similar operational scale** (e.g., junior producers vs. other juniors)?</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* NEW: Tailored Scoring Models */}
                <Card className="bg-navy-800/70 border border-navy-700 backdrop-blur-sm shadow-xl">
                    <CardHeader>
                        <CardTitle className="text-xl sm:text-2xl flex items-center gap-2.5">
                            <Settings size={24} className="text-cyan-400" />
                            Tailored Scoring Models: Metrics by Company Type
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm">
                        <p>RPS uses distinct scoring models for each company type, focusing on the metrics that are most critical for success at each stage of the mining lifecycle.</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-navy-900/40 p-4 rounded">
                                <h4 className="flex items-center gap-2 font-semibold text-surface-white mb-2"><Crown size={16} className="text-yellow-400"/>Producers</h4>
                                <p className="text-xs">Judged on **profitability, operational efficiency, and sustainability**. Key metrics include <strong className="text-surface-white">All-In Sustaining Cost (AISC)</strong>, <strong className="text-surface-white">Free Cash Flow Margin</strong>, and <strong className="text-surface-white">Reserve Life</strong>.</p>
                            </div>
                            <div className="bg-navy-900/40 p-4 rounded">
                                <h4 className="flex items-center gap-2 font-semibold text-surface-white mb-2"><Pickaxe size={16} className="text-orange-400"/>Developers</h4>
                                <p className="text-xs">Judged on **project economics, de-risking, and funding capacity**. Key metrics include <strong className="text-surface-white">Construction CAPEX</strong>, <strong className="text-surface-white">Mineable Ounces</strong>, and <strong className="text-surface-white">Cash Position</strong> vs. debt.</p>
                            </div>
                            <div className="bg-navy-900/40 p-4 rounded">
                                <h4 className="flex items-center gap-2 font-semibold text-surface-white mb-2"><Zap size={16} className="text-blue-400"/>Explorers</h4>
                                <p className="text-xs">Judged on **discovery potential, financial runway, and dilution risk**. Key metrics include <strong className="text-surface-white">M&I and Potential Resources</strong>, <strong className="text-surface-white">Cash Burn Rate</strong>, and <strong className="text-surface-white">Fully Diluted Shares</strong>.</p>
                            </div>
                             <div className="bg-navy-900/40 p-4 rounded">
                                <h4 className="flex items-center gap-2 font-semibold text-surface-white mb-2"><BarChart3 size={16} className="text-green-400"/>Royalty Companies</h4>
                                <p className="text-xs">Judged on **cash flow generation and portfolio quality**. Key metrics include <strong className="text-surface-white">FCF Yield</strong>, <strong className="text-surface-white">FCF Margin</strong>, and portfolio diversification like <strong className="text-surface-white">Producing Asset Count</strong>.</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Scoring Mathematics */}
                <Card className="bg-navy-800/70 border border-navy-700 backdrop-blur-sm shadow-xl">
                    <CardHeader>
                        <CardTitle className="text-xl sm:text-2xl flex items-center gap-2.5">
                            <Calculator size={24} className="text-cyan-400" />
                            RPS Mathematics & Methodology
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm">
                         <p>The RPS system uses a transparent, multi-step process to derive its scores, combining peer-based normalization with your custom weightings.</p>

                        <h4 className="text-md font-semibold text-cyan-400 mt-4">Step 1: Metric Normalization</h4>
                        <p className="text-xs">For each metric, a company's raw value is compared against its peers to generate a percentile rank, which is then converted to an intuitive 0-100 score using a sigmoid function. This is done for all three peer groups.</p>
                        <FormulaDisplay>
{`// Simplified Logic
percentile_rank = getPercentile(company_value, peer_values)
adjusted_percentile = higher_is_better ? percentile_rank : (1 - percentile_rank)
normalized_score = convertToSigmoidScale(adjusted_percentile) // Returns 0-100`}
                        </FormulaDisplay>
                        
                        <h4 className="text-md font-semibold text-cyan-400 mt-4">Step 2: The Blended Score Calculation</h4>
                        <p className="text-xs">For each metric, a blended score is created based on the weights from your master sliders. This blended score is then used to calculate the final RPS.</p>
                        <FormulaDisplay>
{`// W = Weight from master sliders (e.g., 34%, 33%, 33%)
Blended Score = (Score_vs_Status * W_status) + 
                (Score_vs_Valuation * W_valuation) + 
                (Score_vs_Operational * W_operational)

// Final Calculation
Contribution = (Blended Score * Metric Weight) / 100
Final RPS = SUM(All Contributions)`}
                        </FormulaDisplay>
                    </CardContent>
                </Card>
                
                 {/* Advanced Strategies */}
                <Card className="bg-navy-800/70 border border-navy-700 backdrop-blur-sm shadow-xl">
                    <CardHeader>
                        <CardTitle className="text-xl sm:text-2xl flex items-center gap-2.5">
                            <Target size={24} className="text-cyan-400" />
                            Advanced RPS Strategies
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm">
                        <div className="bg-navy-900/40 p-4 rounded border border-cyan-700/30">
                           <h4 className="font-semibold text-surface-white mb-2">Strategy 1: Find Undervalued Operators</h4>
                           <p className="text-xs mb-3">
                               <strong>Objective:</strong> Identify operationally excellent companies that the market may be overlooking.
                           </p>
                           <p className="text-xs">
                               <strong>Method:</strong> Set Peer Group Weights to **70% Operational** and **30% Status**. Run for Producers. A high RPS here indicates companies that are highly efficient relative to their operational scale, even if their market cap doesn't reflect it. Check their score breakdown for top ranks in <strong className="text-surface-white">AISC</strong> and <strong className="text-surface-white">FCF Margin</strong>.
                           </p>
                        </div>
                        <div className="bg-navy-900/40 p-4 rounded border border-blue-700/30">
                           <h4 className="font-semibold text-surface-white mb-2">Strategy 2: Find High-Quality Growth</h4>
                           <p className="text-xs mb-3">
                               <strong>Objective:</strong> Find well-funded developers with robust projects compared to their similarly-sized peers.
                           </p>
                           <p className="text-xs">
                               <strong>Method:</strong> Filter to Developers. Set Peer Group Weights to **70% Valuation** and **30% Status**. This prioritizes how a developer stacks up against others the market values similarly. A top score suggests strong project economics (<strong className="text-surface-white">Mineable Ounces</strong> vs. <strong className="text-surface-white">CAPEX</strong>) relative to its market cap.
                           </p>
                        </div>
                         <div className="bg-navy-900/40 p-4 rounded border border-amber-700/30">
                           <h4 className="font-semibold text-surface-white mb-2">Strategy 3: De-Risking Exploration</h4>
                           <p className="text-xs mb-3">
                               <strong>Objective:</strong> Find explorers with the best balance of discovery potential and financial stability.
                           </p>
                           <p className="text-xs">
                               <strong>Method:</strong> Filter to Explorers. Set Peer Group Weights to **50% Operational** and **50% Status**. An Explorer's operational score is based on resource size and cash. This blend finds explorers with large potential discoveries that also have the cash to advance them, preventing imminent shareholder dilution.
                           </p>
                        </div>
                    </CardContent>
                </Card>

            </div>
        </PageContainer>
    );
}