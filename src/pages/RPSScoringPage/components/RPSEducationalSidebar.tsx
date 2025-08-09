// src/pages/RPSScoringPage/components/RPSEducationalSidebar.tsx

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, BookOpen, Calculator, Users, AlertCircle, Lightbulb, BarChart3, Scale } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RPSEducationalSidebarProps {
    onClose: () => void;
}

interface Section {
    id: string;
    title: string;
    icon: React.ElementType;
    content: React.ReactNode;
}

const sections: Section[] = [
    {
        id: 'rps-basics',
        title: 'Understanding RPS',
        icon: BookOpen,
        content: (
            <div className="space-y-4">
                <div>
                    <h4 className="font-semibold text-surface-white mb-2">What is a Relative Performance Score?</h4>
                    <p className="text-sm text-gray-300">
                        RPS is a powerful scoring system designed to rank companies against their **true peers**, not against the entire market. It understands that you can't compare an early-stage explorer to a senior producer with the same metrics.
                    </p>
                </div>
                <div>
                    <h4 className="font-semibold text-surface-white mb-2">Why Use RPS?</h4>
                    <ul className="text-sm text-gray-300 space-y-2">
                        <li className="flex items-start gap-2">
                            <span className="text-accent-teal mt-1">•</span>
                            <span><strong>Fair Comparisons:</strong> It creates an "apples-to-apples" comparison by scoring companies based on what matters for their specific stage (Producer, Developer, etc.).</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-accent-teal mt-1">•</span>
                            <span><strong>Context-Aware:</strong> The metrics and weights are tailored for each company type, providing a much more nuanced view than a one-size-fits-all model.</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-accent-teal mt-1">•</span>
                            <span><strong>Multi-Faceted:</strong> RPS combines operational, financial, and valuation metrics to give a holistic view of a company's performance relative to its peers.</span>
                        </li>
                    </ul>
                </div>
            </div>
        )
    },
    {
        id: 'peer-groups',
        title: 'The Three Peer Groups',
        icon: Users,
        content: (
            <div className="space-y-4">
                <div>
                    <h4 className="font-semibold text-surface-white mb-2">The Core of RPS</h4>
                    <p className="text-sm text-gray-300 mb-4">
                        RPS scores every metric against three distinct peer groups. You can adjust the weighting of these groups to fine-tune the final score based on your investment thesis.
                    </p>
                </div>
                <div>
                    <h4 className="font-semibold text-accent-teal mb-2">1. Status Peers</h4>
                    <p className="text-sm text-gray-300">
                        This is the broadest group. It compares a company against **all other companies with the same status** (e.g., all Producers, all Developers). This is useful for understanding a company's overall rank within its category.
                    </p>
                </div>
                 <div>
                    <h4 className="font-semibold text-accent-teal mb-2">2. Valuation Peers</h4>
                    <p className="text-sm text-gray-300">
                        This is a focused group of the **10 most similarly-sized companies** based on Market Cap and Enterprise Value. This is the best group for identifying potentially undervalued companies compared to their direct market competitors.
                    </p>
                </div>
                 <div>
                    <h4 className="font-semibold text-accent-teal mb-2">3. Operational Peers</h4>
                    <p className="text-sm text-gray-300">
                        This group compares companies at a similar **operational scale** (e.g., Junior Producers vs. Senior Producers). This is ideal for judging operational efficiency against companies with comparable resources and output.
                    </p>
                </div>
            </div>
        )
    },
    {
        id: 'scoring-methodology',
        title: 'Scoring Methodology',
        icon: Calculator,
        content: (
            <div className="space-y-4">
                <div>
                    <h4 className="font-semibold text-surface-white mb-2">A Four-Step Process</h4>
                    <ol className="text-sm text-gray-300 space-y-3">
                        <li className="flex items-start gap-2">
                            <span className="text-accent-teal font-semibold">1.</span>
                            <div>
                                <h5 className="font-semibold text-surface-white">Normalization</h5>
                                <p>For each metric, a company's raw value is compared against its three peer groups. This comparison generates a percentile rank, which is then transformed into a normalized score from 0-100 for each peer group.</p>
                            </div>
                        </li>
                        <li className="flex items-start gap-2">
                             <span className="text-accent-teal font-semibold">2.</span>
                             <div>
                                <h5 className="font-semibold text-surface-white">Blending</h5>
                                <p>The three normalized scores (from Status, Valuation, and Operational peers) are blended into a single score using the weights you set in the "Peer Group Weighting" panel.</p>
                            </div>
                        </li>
                        <li className="flex items-start gap-2">
                             <span className="text-accent-teal font-semibold">3.</span>
                             <div>
                                <h5 className="font-semibold text-surface-white">Metric Weighting</h5>
                                <p>The blended score for each metric is multiplied by the metric's importance weight, which you control in the "RPS Configuration" panel sliders.</p>
                            </div>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-accent-teal font-semibold">4.</span>
                            <div>
                                <h5 className="font-semibold text-surface-white">Final Score</h5>
                                <p>The final weighted scores for all metrics are summed up to produce the final Relative Performance Score.</p>
                            </div>
                        </li>
                    </ol>
                </div>
            </div>
        )
    },
    {
        id: 'tips',
        title: 'Analysis Tips',
        icon: Lightbulb,
        content: (
            <div className="space-y-4">
                <div>
                    <h4 className="font-semibold text-green-400 mb-2">Best Practices</h4>
                    <ul className="text-sm text-gray-300 space-y-2">
                        <li className="flex items-start gap-2">
                            <span className="text-accent-teal">•</span>
                            <span><strong>Test a Thesis:</strong> Use the Peer Group Weighting panel to answer questions. For example, increase the "Valuation Peers" weight to 100% to find companies that are cheapest relative to their direct competitors.</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-accent-teal">•</span>
                            <span><strong>Compare Ranks:</strong> Look for discrepancies. A company ranked #50 overall but #5 against its Valuation Peers might be a hidden gem the market is mispricing.</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-accent-teal">•</span>
                            <span><strong>Drill Down:</strong> Don't just look at the final score. Expand the row to see the breakdown. A company might have a mediocre score but be best-in-class on a metric you care about, like low costs (AISC).</span>
                        </li>
                    </ul>
                </div>
                <div>
                    <h4 className="font-semibold text-red-400 mb-2">Common Pitfalls</h4>
                    <ul className="text-sm text-gray-300 space-y-2">
                        <li className="flex items-start gap-2">
                            <AlertCircle className="text-amber-400 mt-0.5 flex-shrink-0" size={14} />
                            <span><strong>Never compare scores across different statuses.</strong> A score of 85 for an Explorer is not "better" than a score of 80 for a Producer. They are calculated using completely different models.</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <AlertCircle className="text-amber-400 mt-0.5 flex-shrink-0" size={14} />
                            <span><strong>Consider Data Completeness.</strong> A score is only as good as the data behind it. If a company scores highly on a metric where most of its peers have N/A data, the score is less reliable.</span>
                        </li>
                         <li className="flex items-start gap-2">
                            <AlertCircle className="text-amber-400 mt-0.5 flex-shrink-0" size={14} />
                            <span><strong>Use RPS as a Starting Point.</strong> RPS is a powerful quantitative screening tool, but it should always be complemented with qualitative research and due diligence.</span>
                        </li>
                    </ul>
                </div>
            </div>
        )
    }
];

export const RPSEducationalSidebar: React.FC<RPSEducationalSidebarProps> = ({ onClose }) => {
    const [activeSection, setActiveSection] = useState('rps-basics');
    
    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 z-50"
                onClick={onClose}
            >
                <motion.div
                    initial={{ x: '100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '100%' }}
                    transition={{ type: 'spring', damping: 20 }}
                    className="absolute right-0 top-0 h-full w-full max-w-md bg-navy-800 shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex items-center justify-between p-4 border-b border-navy-700">
                        <div className="flex items-center gap-2">
                            <Scale className="text-accent-teal" size={20} />
                            <h2 className="text-lg font-bold text-surface-white">RPS Learning Center</h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1 hover:bg-navy-700 rounded-lg transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                    
                    <div className="flex h-[calc(100%-64px)]">
                        <nav className="w-48 bg-navy-900/50 p-2 space-y-1 overflow-y-auto">
                            {sections.map((section) => (
                                <button
                                    key={section.id}
                                    onClick={() => setActiveSection(section.id)}
                                    className={cn(
                                        "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors text-left",
                                        activeSection === section.id
                                            ? "bg-navy-700 text-accent-teal"
                                            : "text-gray-400 hover:text-surface-white hover:bg-navy-800"
                                    )}
                                >
                                    <section.icon size={16} />
                                    <span className="flex-1 truncate">{section.title}</span>
                                    <ChevronRight 
                                        size={14} 
                                        className={cn(
                                            "transition-opacity",
                                            activeSection === section.id ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                </button>
                            ))}
                        </nav>
                        
                        <div className="flex-1 p-6 overflow-y-auto scrollbar-thin scrollbar-thumb-navy-600">
                            {sections.find(s => s.id === activeSection)?.content}
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};