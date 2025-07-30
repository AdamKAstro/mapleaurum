// src/pages/fcf-scoring/components/FCFScoringTable.tsx
import React, { useState, useMemo } from 'react';
import type { FCFScoringResult } from '../types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, TrendingUp, TrendingDown, AlertCircle, Lightbulb, Target, DollarSign, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getMetricByKey } from '@/lib/metric-types';
import { formatNumber, formatCurrency, formatPercent, formatMoz } from '../utils';
import { StatusBadge } from '@/components/status-badge';
import { getMetricRationale } from '../fcf-scoring-configs';

interface FCFScoringTableProps {
    results: FCFScoringResult[];
}

const ColumnHeaderTooltip: React.FC<{ 
    title: string; 
    description: string;
    additionalInfo?: string;
}> = ({ title, description, additionalInfo }) => (
    <TooltipProvider delayDuration={100}>
        <Tooltip>
            <TooltipTrigger asChild>
                <button className="flex items-center gap-1 text-muted-foreground hover:text-accent-teal transition-colors">
                    <span>{title}</span>
                    <Info size={14} />
                </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs p-3 bg-navy-700/95 border border-navy-600/80">
                <p className="font-bold text-surface-white mb-1">{title}</p>
                <p className="text-xs text-gray-300">{description}</p>
                {additionalInfo && (
                    <p className="text-xs text-accent-teal mt-2">{additionalInfo}</p>
                )}
            </TooltipContent>
        </Tooltip>
    </TooltipProvider>
);

const ScoreCellTooltip: React.FC<{ result: FCFScoringResult }> = ({ result }) => {
    const topContributors = Object.entries(result.breakdown)
        .sort((a, b) => b[1].contribution - a[1].contribution)
        .slice(0, 4);
    
    return (
        <div className="space-y-3">
            <div>
                <p className="font-bold text-surface-white">Score Breakdown</p>
                <p className="text-xs text-gray-400 mt-1">
                    Top contributing metrics to final score
                </p>
            </div>
            
            <div className="space-y-1.5">
                {topContributors.map(([key, data]) => (
                    <div key={key} className="flex justify-between items-center gap-3 text-xs">
                        <span className="text-gray-300 truncate">{data.metricLabel}</span>
                        <div className="flex items-center gap-2">
                            <span className="font-mono text-accent-teal">
                                +{data.contribution.toFixed(1)}
                            </span>
                            <span className="text-gray-500">
                                ({data.weight}%)
                            </span>
                        </div>
                    </div>
                ))}
            </div>
            
            <div className="pt-2 border-t border-navy-600/50">
                <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Data Completeness:</span>
                    <span className={cn(
                        "font-mono",
                        result.dataCompleteness > 0.8 ? "text-green-400" : 
                        result.dataCompleteness > 0.6 ? "text-amber-400" : "text-red-400"
                    )}>
                        {(result.dataCompleteness * 100).toFixed(0)}%
                    </span>
                </div>
            </div>
        </div>
    );
};

const ExpandedRowDetail: React.FC<{ result: FCFScoringResult }> = ({ result }) => {
    const [activeTab, setActiveTab] = useState<'breakdown' | 'insights'>('breakdown');
    
    return (
        <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
        >
            <div className="p-6 bg-navy-800/30">
                <div className="flex gap-2 mb-4">
                    <button
                        onClick={() => setActiveTab('breakdown')}
                        className={cn(
                            "px-3 py-1.5 text-sm rounded-md transition-colors",
                            activeTab === 'breakdown' 
                                ? "bg-navy-700 text-accent-teal" 
                                : "text-muted-foreground hover:text-surface-white"
                        )}
                    >
                        Metric Breakdown
                    </button>
                    <button
                        onClick={() => setActiveTab('insights')}
                        className={cn(
                            "px-3 py-1.5 text-sm rounded-md transition-colors",
                            activeTab === 'insights' 
                                ? "bg-navy-700 text-accent-teal" 
                                : "text-muted-foreground hover:text-surface-white"
                        )}
                    >
                        Insights & Analysis
                    </button>
                </div>
                
                {activeTab === 'breakdown' ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {Object.entries(result.breakdown)
                            .sort((a, b) => b[1].weight - a[1].weight)
                            .map(([key, data]) => {
                                const metricConfig = getMetricByKey(key);
                                const rationale = getMetricRationale(result.companyType, key);
                                
                                return (
                                    <div key={key} className="bg-navy-900/50 p-4 rounded-lg border border-navy-600/50">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex-1">
                                                <h4 className="font-semibold text-surface-white text-sm">
                                                    {data.metricLabel}
                                                </h4>
                                                {data.wasImputed && (
                                                    <p className="text-xs text-amber-400 mt-1 flex items-center gap-1">
                                                        <AlertCircle size={12} />
                                                        Value was estimated
                                                    </p>
                                                )}
                                            </div>
                                            <div className="text-right">
                                                <div className="text-lg font-bold text-accent-teal">
                                                    {data.normalizedValue.toFixed(0)}
                                                </div>
                                                <div className="text-xs text-gray-500">/ 100</div>
                                            </div>
                                        </div>
                                        
                                        <div className="space-y-2 text-xs">
                                            <div className="flex justify-between">
                                                <span className="text-gray-400">Raw Value:</span>
                                                <span className="font-mono text-gray-300">
                                                    {formatMetricValue(data.rawValue, key)}
                                                </span>
                                            </div>
                                            
                                            <div className="flex justify-between">
                                                <span className="text-gray-400">Weight:</span>
                                                <span className="font-mono text-gray-300">{data.weight}%</span>
                                            </div>
                                            
                                            <div className="flex justify-between">
                                                <span className="text-gray-400">Contribution:</span>
                                                <span className={cn(
                                                    "font-mono",
                                                    data.contribution > 0 ? "text-green-400" : "text-red-400"
                                                )}>
                                                    {data.contribution > 0 ? '+' : ''}{data.contribution.toFixed(1)}
                                                </span>
                                            </div>
                                            
                                            <div className="flex justify-between">
                                                <span className="text-gray-400">Peer Percentile:</span>
                                                <span className={cn(
                                                    "font-mono",
                                                    data.peerGroupComparison.percentile > 0.75 ? "text-green-400" :
                                                    data.peerGroupComparison.percentile > 0.5 ? "text-yellow-400" :
                                                    data.peerGroupComparison.percentile > 0.25 ? "text-orange-400" :
                                                    "text-red-400"
                                                )}>
                                                    {(data.peerGroupComparison.percentile * 100).toFixed(0)}%
                                                </span>
                                            </div>
                                            
                                            {rationale && (
                                                <TooltipProvider delayDuration={100}>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <button className="mt-2 text-xs text-accent-teal hover:text-teal-400 transition-colors flex items-center gap-1">
                                                                <Lightbulb size={12} />
                                                                View Rationale
                                                            </button>
                                                        </TooltipTrigger>
                                                        <TooltipContent 
                                                            side="top" 
                                                            className="max-w-sm p-3 bg-navy-700/95 border border-navy-600/80"
                                                        >
                                                            <p className="text-xs text-gray-300">{rationale.reasoning}</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {result.insights.length > 0 ? (
                            result.insights.map((insight, index) => (
                                <div 
                                    key={index}
                                    className={cn(
                                        "p-4 rounded-lg border",
                                        insight.type === 'strength' && "bg-green-900/20 border-green-700/50",
                                        insight.type === 'weakness' && "bg-red-900/20 border-red-700/50",
                                        insight.type === 'opportunity' && "bg-blue-900/20 border-blue-700/50",
                                        insight.type === 'risk' && "bg-amber-900/20 border-amber-700/50"
                                    )}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className={cn(
                                            "p-2 rounded-lg",
                                            insight.type === 'strength' && "bg-green-800/50",
                                            insight.type === 'weakness' && "bg-red-800/50",
                                            insight.type === 'opportunity' && "bg-blue-800/50",
                                            insight.type === 'risk' && "bg-amber-800/50"
                                        )}>
                                            {insight.type === 'strength' && <TrendingUp size={16} />}
                                            {insight.type === 'weakness' && <TrendingDown size={16} />}
                                            {insight.type === 'opportunity' && <Target size={16} />}
                                            {insight.type === 'risk' && <AlertCircle size={16} />}
                                        </div>
                                        <div className="flex-1">
                                            <h5 className="font-semibold text-surface-white text-sm mb-1">
                                                {insight.title}
                                            </h5>
                                            <p className="text-xs text-gray-300">
                                                {insight.description}
                                            </p>
                                            <div className="flex items-center gap-2 mt-2">
                                                <Badge 
                                                    variant="secondary" 
                                                    className="text-xs py-0.5 px-2"
                                                >
                                                    {insight.impactLevel} impact
                                                </Badge>
                                                {insight.relatedMetrics.map(metric => {
                                                    const config = getMetricByKey(metric);
                                                    return config ? (
                                                        <Badge 
                                                            key={metric}
                                                            variant="outline" 
                                                            className="text-xs py-0.5 px-2"
                                                        >
                                                            {config.label}
                                                        </Badge>
                                                    ) : null;
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-center text-muted-foreground py-8">
                                No specific insights generated for this company
                            </p>
                        )}
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export const FCFScoringTable: React.FC<FCFScoringTableProps> = ({ results }) => {
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
    const [page, setPage] = useState(1);
    const pageSize = 50;
    
    const paginatedResults = useMemo(() => {
        const start = (page - 1) * pageSize;
        const end = start + pageSize;
        return results.slice(start, end);
    }, [results, page, pageSize]);
    
    const toggleRow = (companyId: string) => {
        setExpandedRows(prev => {
            const next = new Set(prev);
            if (next.has(companyId)) {
                next.delete(companyId);
            } else {
                next.add(companyId);
            }
            return next;
        });
    };
    
    return (
        <div className="space-y-4">
            <div className="rounded-lg border border-navy-600/50 overflow-hidden">
                <Table>
                    <TableHeader className="bg-navy-800/50">
                        <TableRow>
                            <TableHead className="w-16">Rank</TableHead>
                            <TableHead>Company</TableHead>
                            <TableHead className="text-right">
                                <ColumnHeaderTooltip 
                                    title="FCF Score" 
                                    description="Overall score based on FCF-focused formula weights for this company type."
                                    additionalInfo="Higher scores indicate stronger FCF characteristics"
                                />
                            </TableHead>
                            <TableHead className="text-right">
                                <ColumnHeaderTooltip 
                                    title="FCF Component" 
                                    description="The normalized Free Cash Flow metric score (0-100)."
                                    additionalInfo="Direct measure of cash generation ability"
                                />
                            </TableHead>
                            <TableHead className="text-center">
                                <ColumnHeaderTooltip 
                                    title="Peer Rank" 
                                    description="Ranking within the same company type (Explorer, Developer, etc.)"
                                />
                            </TableHead>
                            <TableHead className="text-center">
                                <ColumnHeaderTooltip 
                                    title="Confidence" 
                                    description="Score reliability based on data completeness. Higher is better."
                                />
                            </TableHead>
                            <TableHead className="w-12"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginatedResults.map((result, index) => {
                            const globalRank = (page - 1) * pageSize + index + 1;
                            const isExpanded = expandedRows.has(result.company.company_id);
                            
                            return (
                                <React.Fragment key={result.company.company_id}>
                                    <TableRow 
                                        className="cursor-pointer hover:bg-navy-700/30 transition-colors"
                                        onClick={() => toggleRow(result.company.company_id)}
                                    >
                                        <TableCell>
                                            <div className="text-lg font-bold text-muted-foreground">
                                                #{globalRank}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <StatusBadge status={result.company.status} />
                                                <div>
                                                    <div className="font-bold text-surface-white">
                                                        {result.company.company_name.toUpperCase()}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {result.company.primary_ticker}
                                                    </div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <TooltipProvider delayDuration={100}>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <div className="inline-flex items-center gap-2">
                                                            <span className="text-2xl font-bold text-accent-teal">
                                                                {result.finalScore.toFixed(1)}
                                                            </span>
                                                            <DollarSign className="text-accent-teal/50" size={18} />
                                                        </div>
                                                    </TooltipTrigger>
                                                    <TooltipContent 
                                                        side="left" 
                                                        className="p-4 bg-navy-700/95 border border-navy-600/80"
                                                    >
                                                        <ScoreCellTooltip result={result} />
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className={cn(
                                                "text-lg font-semibold",
                                                result.fcfScore > 70 ? "text-green-400" :
                                                result.fcfScore > 40 ? "text-yellow-400" :
                                                "text-red-400"
                                            )}>
                                                {result.fcfScore.toFixed(0)}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="text-sm">
                                                <span className="font-bold text-surface-white">
                                                    {result.peerGroupRank.withinType}
                                                </span>
                                                <span className="text-muted-foreground">
                                                    /{result.peerGroupRank.totalInType}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <div className="w-12 h-1.5 bg-navy-800 rounded-full">
                                                    <div 
                                                        className="h-1.5 bg-gradient-to-r from-accent-teal to-teal-500 rounded-full"
                                                        style={{ width: `${result.confidenceScore * 100}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs font-mono text-muted-foreground">
                                                    {(result.confidenceScore * 100).toFixed(0)}%
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <ChevronDown 
                                                className={cn(
                                                    "h-4 w-4 transition-transform text-muted-foreground",
                                                    isExpanded && "rotate-180"
                                                )}
                                            />
                                        </TableCell>
                                    </TableRow>
                                    
                                    <AnimatePresence>
                                        {isExpanded && (
                                            <TableRow>
                                                <TableCell colSpan={7} className="p-0">
                                                    <ExpandedRowDetail result={result} />
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </AnimatePresence>
                                </React.Fragment>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>
            
            {results.length > pageSize && (
                <div className="flex justify-between items-center">
                    <p className="text-sm text-muted-foreground">
                        Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, results.length)} of {results.length} results
                    </p>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                        >
                            Previous
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(p => p + 1)}
                            disabled={page * pageSize >= results.length}
                        >
                            Next
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};

function formatMetricValue(value: number | null, metricKey: string): string {
    if (value === null) return '-';
    
    const metricConfig = getMetricByKey(metricKey);
    if (!metricConfig) return value.toString();
    
    // Handle different metric types
    if (metricKey.includes('cash') || metricKey.includes('debt') || 
        metricKey.includes('financial') || metricKey.includes('enterprise_value')) {
        return formatCurrency(value, { compact: true });
    }
    
    if (metricKey.includes('share_price') || metricKey.includes('costs')) {
        return formatCurrency(value, { compact: false });
    }
    
    if (metricKey.includes('moz')) {
        return formatMoz(value);
    }
    
    if (metricKey.includes('koz')) {
        return formatNumber(value, { decimals: 0, suffix: ' koz' });
    }
    
    if (metricKey.includes('shares')) {
        return formatNumber(value, { decimals: 0, compact: true, suffix: 'M' });
    }
    
    if (metricKey.includes('years')) {
        return formatNumber(value, { decimals: 1, suffix: ' years' });
    }
    
    return formatNumber(value, { decimals: 2, compact: true });
}