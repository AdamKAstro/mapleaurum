// src/pages/fcf-scoring/components/EducationalSidebar.tsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, BookOpen, Calculator, TrendingUp, AlertCircle, Lightbulb, DollarSign, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EducationalSidebarProps {
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
        id: 'fcf-basics',
        title: 'Understanding Free Cash Flow',
        icon: DollarSign,
        content: (
            <div className="space-y-4">
                <div>
                    <h4 className="font-semibold text-surface-white mb-2">What is Free Cash Flow?</h4>
                    <p className="text-sm text-gray-300">
                        Free Cash Flow (FCF) represents the cash a company generates after accounting for capital expenditures. 
                        It's the cash available for distribution to investors, debt repayment, or reinvestment.
                    </p>
                </div>
                
                <div>
                    <h4 className="font-semibold text-surface-white mb-2">FCF Formula</h4>
                    <div className="bg-navy-800/50 p-3 rounded-lg border border-navy-600/50">
                        <p className="text-sm font-mono text-accent-teal">
                            FCF = Operating Cash Flow - Capital Expenditures
                        </p>
                    </div>
                </div>
                
                <div>
                    <h4 className="font-semibold text-surface-white mb-2">Why FCF Matters</h4>
                    <ul className="text-sm text-gray-300 space-y-2">
                        <li className="flex items-start gap-2">
                            <span className="text-accent-teal mt-1">•</span>
                            <span>Unlike earnings, FCF is harder to manipulate and represents real cash generation</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-accent-teal mt-1">•</span>
                            <span>Positive FCF allows companies to pay dividends, buy back shares, or reduce debt</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-accent-teal mt-1">•</span>
                            <span>FCF yield (FCF/Market Cap) helps identify undervalued companies</span>
                        </li>
                    </ul>
                </div>
            </div>
        )
    },
    {
        id: 'fcf-ratios',
        title: 'Key FCF Ratios',
        icon: BarChart3,
        content: (
            <div className="space-y-4">
                <div>
                    <h4 className="font-semibold text-surface-white mb-2">FCF/Price (FCF Yield)</h4>
                    <p className="text-sm text-gray-300 mb-2">
                        Measures cash return on market cap investment. Higher is better.
                    </p>
                    <div className="bg-navy-800/50 p-3 rounded-lg border border-navy-600/50 space-y-1">
                        <p className="text-xs text-gray-400">Interpretation:</p>
                        <p className="text-xs text-green-400">• &gt;15%: Excellent value</p>
                        <p className="text-xs text-yellow-400">• 8-15%: Good value</p>
                        <p className="text-xs text-red-400">• &lt;5%: Expensive or growth priced</p>
                    </div>
                </div>
                
                <div>
                    <h4 className="font-semibold text-surface-white mb-2">FCF/Enterprise Value</h4>
                    <p className="text-sm text-gray-300 mb-2">
                        Total capital efficiency including debt. Preferred for comparing companies with different capital structures.
                    </p>
                    <div className="bg-navy-800/50 p-3 rounded-lg border border-navy-600/50 space-y-1">
                        <p className="text-xs text-gray-400">Target Ranges:</p>
                        <p className="text-xs text-green-400">• &gt;12%: Strong value opportunity</p>
                        <p className="text-xs text-yellow-400">• 6-12%: Fair value</p>
                        <p className="text-xs text-red-400">• &lt;4%: Premium valuation</p>
                    </div>
                </div>
                
                <div>
                    <h4 className="font-semibold text-surface-white mb-2">FCF Margin</h4>
                    <p className="text-sm text-gray-300">
                        FCF as percentage of revenue. Shows operational efficiency and cash conversion ability.
                    </p>
                </div>
            </div>
        )
    },
    {
        id: 'company-types',
        title: 'FCF by Company Type',
        icon: TrendingUp,
        content: (
            <div className="space-y-4">
                <div>
                    <h4 className="font-semibold text-accent-teal mb-2">Explorers</h4>
                    <p className="text-sm text-gray-300">
                        Typically have negative FCF due to exploration spending. Focus on cash burn rate and runway. 
                        A less negative FCF trend indicates improving capital discipline.
                    </p>
                </div>
                
                <div>
                    <h4 className="font-semibold text-accent-teal mb-2">Developers</h4>
                    <p className="text-sm text-gray-300">
                        Usually negative FCF during construction. Key is the path to positive FCF post-production. 
                        Look for conservative burn rates and realistic timelines to cash generation.
                    </p>
                </div>
                
                <div>
                    <h4 className="font-semibold text-accent-teal mb-2">Producers</h4>
                    <p className="text-sm text-gray-300">
                        Should generate strong positive FCF. Focus on FCF yield, consistency, and growth. 
                        High FCF margins (&gt;30%) indicate operational excellence.
                    </p>
                </div>
                
                <div>
                    <h4 className="font-semibold text-accent-teal mb-2">Royalty Companies</h4>
                    <p className="text-sm text-gray-300">
                        Highest FCF conversion due to minimal operating costs. Look for stable FCF growth 
                        and high FCF/Revenue ratios (&gt;90%).
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
                    <h4 className="font-semibold text-surface-white mb-2">How Scores Are Calculated</h4>
                    <ol className="text-sm text-gray-300 space-y-2">
                        <li className="flex items-start gap-2">
                            <span className="text-accent-teal font-semibold">1.</span>
                            <span>Each metric is normalized to 0-100 based on peer group performance</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-accent-teal font-semibold">2.</span>
                            <span>Weights are applied based on company type and metric importance</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-accent-teal font-semibold">3.</span>
                            <span>Weighted scores are summed for the final FCF score</span>
                        </li>
                    </ol>
                </div>
                
                <div>
                    <h4 className="font-semibold text-surface-white mb-2">Normalization Options</h4>
                    <p className="text-sm text-gray-300 mb-2">
                        <strong>Per-Share Normalization:</strong> Divides absolute metrics by share count to enable 
                        fair comparison between different sized companies.
                    </p>
                    <p className="text-sm text-gray-300">
                        <strong>Sigmoid Transformation:</strong> Creates better score distribution by emphasizing 
                        differences between similarly ranked companies.
                    </p>
                </div>
            </div>
        )
    },
    {
        id: 'red-green-flags',
        title: 'What to Look For',
        icon: AlertCircle,
        content: (
            <div className="space-y-4">
                <div>
                    <h4 className="font-semibold text-green-400 mb-2">Green Flags</h4>
                    <ul className="text-sm text-gray-300 space-y-2">
                        <li className="flex items-start gap-2">
                            <TrendingUp className="text-green-400 mt-0.5" size={14} />
                            <span>Consistent FCF growth over multiple years</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <TrendingUp className="text-green-400 mt-0.5" size={14} />
                            <span>FCF yield above 10% with stable operations</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <TrendingUp className="text-green-400 mt-0.5" size={14} />
                            <span>Low AISC with expanding margins</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <TrendingUp className="text-green-400 mt-0.5" size={14} />
                            <span>Strong balance sheet with minimal debt</span>
                        </li>
                    </ul>
                </div>
                
                <div>
                    <h4 className="font-semibold text-red-400 mb-2">Red Flags</h4>
                    <ul className="text-sm text-gray-300 space-y-2">
                        <li className="flex items-start gap-2">
                            <TrendingUp className="text-red-400 rotate-180 mt-0.5" size={14} />
                            <span>Declining FCF despite rising revenues</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <TrendingUp className="text-red-400 rotate-180 mt-0.5" size={14} />
                            <span>High share dilution eroding per-share metrics</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <TrendingUp className="text-red-400 rotate-180 mt-0.5" size={14} />
                            <span>AISC above $1,500/oz for gold producers</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <TrendingUp className="text-red-400 rotate-180 mt-0.5" size={14} />
                            <span>Short reserve life with no exploration success</span>
                        </li>
                    </ul>
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
                    <h4 className="font-semibold text-surface-white mb-2">Best Practices</h4>
                    <ul className="text-sm text-gray-300 space-y-2">
                        <li className="flex items-start gap-2">
                            <span className="text-accent-teal">1.</span>
                            <span>Compare companies within the same type (explorer vs explorer)</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-accent-teal">2.</span>
                            <span>Look at both FCF/Price and FCF/EV for complete picture</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-accent-teal">3.</span>
                            <span>Consider data completeness - higher confidence scores are more reliable</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-accent-teal">4.</span>
                            <span>Use per-share normalization when comparing different sized companies</span>
                        </li>
                    </ul>
                </div>
                
                <div>
                    <h4 className="font-semibold text-surface-white mb-2">Common Pitfalls</h4>
                    <ul className="text-sm text-gray-300 space-y-2">
                        <li className="flex items-start gap-2">
                            <AlertCircle className="text-amber-400 mt-0.5" size={14} />
                            <span>Don't rely solely on FCF - consider growth prospects</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <AlertCircle className="text-amber-400 mt-0.5" size={14} />
                            <span>Watch for one-time items affecting FCF</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <AlertCircle className="text-amber-400 mt-0.5" size={14} />
                            <span>Consider metal price assumptions in FCF projections</span>
                        </li>
                    </ul>
                </div>
            </div>
        )
    }
];

export const EducationalSidebar: React.FC<EducationalSidebarProps> = ({ onClose }) => {
    const [activeSection, setActiveSection] = useState('fcf-basics');
    
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
                            <BookOpen className="text-accent-teal" size={20} />
                            <h2 className="text-lg font-bold text-surface-white">FCF Learning Center</h2>
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
                        
                        <div className="flex-1 p-6 overflow-y-auto">
                            {sections.find(s => s.id === activeSection)?.content}
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};