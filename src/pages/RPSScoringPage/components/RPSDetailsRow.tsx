// src/pages/RPSScoringPage/components/RPSDetailsRow.tsx

import React from 'react';
import type { RPSScoringResult, RPSMetricBreakdown } from '../rps-scoring-engine';
import { motion } from 'framer-motion';
// Import Icons and Utilities
import { TrendingUp, TrendingDown, Users, Factory, Gauge } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// --- Component Props ---
interface RPSDetailsRowProps {
    result: RPSScoringResult;
}

// --- Helper Functions for Formatting ---
function formatMetricValue(value: number | null, metricKey: string): string {
    if (value === null || !isFinite(value)) return 'N/A';

    const absValue = Math.abs(value);

    // Use includes() which works on the new nested keys e.g., 'costs.aisc_last_year'
    if (metricKey.includes('cost') || metricKey.includes('price')) {
        return `$${value.toFixed(2)}`;
    }
    if (metricKey.includes('_oz')) {
         if (absValue >= 1000000) return `${(value / 1000000).toFixed(1)}M oz`;
         if (absValue >= 1000) return `${(value / 1000).toFixed(1)}k oz`;
         return `${value.toFixed(1)} oz`;
    }
    if (metricKey.includes('value') || metricKey.includes('revenue') || metricKey.includes('ebitda')) {
        if (absValue >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
        if (absValue >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
        if (absValue >= 1e3) return `$${(value / 1e3).toFixed(0)}k`;
        return `$${value.toFixed(0)}`;
    }
    if (metricKey.includes('yield') || metricKey.includes('margin')) {
        return `${value.toFixed(1)}%`;
    }
     if (metricKey.includes('shares')) {
        if (absValue >= 1e6) return `${(value / 1e6).toFixed(0)}M`;
        return value.toFixed(0);
    }
    if (metricKey.includes('ratio') || metricKey.includes('to_')) {
        return `${value.toFixed(1)}x`;
    }
    
    return value.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

// --- Sub-Component for Peer Comparison ---
const PeerComparison: React.FC<{
    label: string;
    icon: React.ElementType;
    companyValue: number | null;
    peerMedian: number | null;
    percentile: number | null;
    higherIsBetter: boolean;
    metricKey: string;
}> = ({ label, icon: Icon, companyValue, peerMedian, percentile, higherIsBetter, metricKey }) => {
    
    const isBetter = companyValue !== null && peerMedian !== null 
        ? (higherIsBetter ? companyValue > peerMedian : companyValue < peerMedian)
        : null;

    return (
        <div className="flex items-center justify-between text-xs py-1.5 border-b border-navy-700/50 last:border-b-0">
            <div className="flex items-center gap-2 text-muted-foreground">
                <Icon size={14} />
                <span>{label}</span>
            </div>
            <div className="flex items-center gap-3 font-mono">
                <span className={cn(
                    "font-semibold",
                    isBetter === true && "text-green-400",
                    isBetter === false && "text-red-400"
                )}>
                    {formatMetricValue(companyValue, metricKey)}
                </span>
                <span className="text-gray-600">vs</span>
                <span>{formatMetricValue(peerMedian, metricKey)}</span>
                <TooltipProvider delayDuration={100}>
                    <Tooltip>
                        <TooltipTrigger>
                            <span className="text-accent-teal/80">({((percentile ?? 0.5) * 100).toFixed(0)}%)</span>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                            <p>This company is in the {((percentile ?? 0.5) * 100).toFixed(0)}th percentile of this peer group.</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>
        </div>
    );
};


// --- Sub-Component for a Single Metric Card ---
const MetricCard: React.FC<{ metricData: RPSMetricBreakdown }> = ({ metricData }) => {
    // FIX: Destructure higherIsBetter directly from metricData.
    // The engine now provides this, so we don't have to guess it.
    const { label, weight, rawValue, normalizedScore, contribution, metricKey,
            statusPeers, valuationPeers, operationalPeers, higherIsBetter } = metricData;

    return (
        <div className="bg-navy-900/50 p-4 rounded-lg border border-navy-600/50 flex flex-col">
            {/* Card Header */}
            <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                    <h4 className="font-semibold text-surface-white text-sm">{label}</h4>
                    <p className="text-xs text-muted-foreground">Weight: {weight}%</p>
                </div>
                <div className="text-right">
                    <div className="text-lg font-bold text-accent-teal">{normalizedScore.toFixed(0)}</div>
                    <div className="text-xs text-gray-500">/ 100</div>
                </div>
            </div>

             {/* Peer Comparisons */}
            <div className="bg-navy-800/40 p-3 rounded-md flex-grow">
                 <h5 className="text-xs font-semibold text-gray-400 mb-2">Comparison vs. Peer Medians</h5>
                 <PeerComparison 
                    label="Status Peers" 
                    icon={Users}
                    companyValue={rawValue}
                    peerMedian={statusPeers.medianValue}
                    percentile={statusPeers.percentile}
                    higherIsBetter={higherIsBetter}
                    metricKey={metricKey}
                 />
                 <PeerComparison 
                    label="Valuation Peers" 
                    icon={Gauge}
                    companyValue={rawValue}
                    peerMedian={valuationPeers.medianValue}
                    percentile={valuationPeers.percentile}
                    higherIsBetter={higherIsBetter}
                    metricKey={metricKey}
                 />
                 <PeerComparison 
                    label="Operational Peers" 
                    icon={Factory}
                    companyValue={rawValue}
                    peerMedian={operationalPeers.medianValue}
                    percentile={operationalPeers.percentile}
                    higherIsBetter={higherIsBetter}
                    metricKey={metricKey}
                 />
            </div>
            
            {/* Card Footer */}
            <div className="mt-3 text-xs flex justify-between items-center">
                <span className="text-muted-foreground">Score Contribution:</span>
                <div className={cn(
                    "flex items-center gap-1 font-bold",
                    contribution >= 0 ? "text-green-400" : "text-red-400"
                )}>
                    {contribution >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    <span>{contribution.toFixed(1)} pts</span>
                </div>
            </div>
        </div>
    );
};


// --- Main Details Row Component ---
export const RPSDetailsRow: React.FC<RPSDetailsRowProps> = ({ result }) => {
    // Sort metrics by their weight for intuitive display
    const sortedBreakdown = [...result.breakdown].sort((a,b) => b.weight - a.weight);

    return (
        <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
        >
            <div className="p-6 bg-navy-800/30">
                <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4">
                    {sortedBreakdown.map((metricData) => (
                        <MetricCard key={metricData.metricKey} metricData={metricData} />
                    ))}
                </div>
            </div>
        </motion.div>
    );
};