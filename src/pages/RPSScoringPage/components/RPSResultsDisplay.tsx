// src/pages/RPSScoringPage/components/RPSResultsDisplay.tsx

import React, { useState, useMemo, Fragment } from 'react';
import type { RPSScoringResult } from '../rps-scoring-engine';
import { motion, AnimatePresence } from 'framer-motion';

// Import UI Components from your library
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/status-badge';

// Import the details component we will create next
import { RPSDetailsRow } from './RPSDetailsRow';

// Import Icons and Utilities
import { ChevronDown, Info, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

// --- Component Props ---
interface RPSResultsDisplayProps {
    results: RPSScoringResult[];
}

// --- Helper Components ---

const ColumnHeaderTooltip: React.FC<{ title: string; description: string; }> = ({ title, description }) => (
    <TooltipProvider delayDuration={100}>
        <Tooltip>
            <TooltipTrigger asChild>
                <button className="flex items-center gap-1 text-muted-foreground hover:text-accent-teal transition-colors text-left">
                    <span>{title}</span>
                    <Info size={14} />
                </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs p-3 bg-navy-700/95 border border-navy-600/80">
                <p className="font-bold text-surface-white mb-1">{title}</p>
                <p className="text-xs text-gray-300">{description}</p>
            </TooltipContent>
        </Tooltip>
    </TooltipProvider>
);

const ScoreCellTooltip: React.FC<{ result: RPSScoringResult }> = ({ result }) => {
    const topContributors = [...result.breakdown]
        .sort((a, b) => b.contribution - a.contribution)
        .slice(0, 4);
    
    return (
        <div className="space-y-3 p-1">
            <p className="font-bold text-surface-white">Top Contributing Metrics</p>
            <div className="space-y-1.5">
                {topContributors.map((data) => (
                    <div key={data.metricKey} className="flex justify-between items-center gap-3 text-xs">
                        <span className="text-gray-300 truncate">{data.label}</span>
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
        </div>
    );
};

// --- Main Results Display Component ---

export const RPSResultsDisplay: React.FC<RPSResultsDisplayProps> = ({ results }) => {
    const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
    const [page, setPage] = useState(1);
    const pageSize = 25;

    const paginatedResults = useMemo(() => {
        const start = (page - 1) * pageSize;
        return results.slice(start, start + pageSize);
    }, [results, page, pageSize]);

    const toggleRow = (companyId: number) => {
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
                                    title="RPS" 
                                    description="The final Relative Performance Score, weighted according to the selected configuration."
                                />
                            </TableHead>
                            <TableHead className="text-center">
                                <ColumnHeaderTooltip 
                                    title="Status Peers" 
                                    description="Rank against all companies of the same status (e.g., all Producers)."
                                />
                            </TableHead>
                            <TableHead className="text-center">
                                <ColumnHeaderTooltip 
                                    title="Valuation Peers" 
                                    description="Rank against the 10 most similarly-sized companies (by Market Cap & EV)."
                                />
                            </TableHead>
                            <TableHead className="text-center">
                                <ColumnHeaderTooltip 
                                    title="Operational Peers" 
                                    description="Rank against companies with a similar operational scale (e.g., Junior Producers)."
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
                                <Fragment key={result.company.company_id}>
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
                                                        {result.company.company_name}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {result.company.tsx_code}
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
                                                            <BarChart3 className="text-accent-teal/50" size={18} />
                                                        </div>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="left" className="p-3 bg-navy-700/95 border border-navy-600/80">
                                                        <ScoreCellTooltip result={result} />
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        </TableCell>
                                        <TableCell className="text-center font-mono">
                                            <span className="font-bold text-surface-white">{result.statusRank.rank}</span>
                                            <span className="text-muted-foreground">/{result.statusRank.total}</span>
                                        </TableCell>
                                        <TableCell className="text-center font-mono">
                                            <span className="font-bold text-surface-white">{result.valuationRank.rank}</span>
                                             <span className="text-muted-foreground">/{result.valuationRank.total}</span>
                                        </TableCell>
                                        <TableCell className="text-center font-mono">
                                             <span className="font-bold text-surface-white">{result.operationalRank.rank}</span>
                                             <span className="text-muted-foreground">/{result.operationalRank.total}</span>
                                        </TableCell>
                                        <TableCell>
                                            <ChevronDown 
                                                className={cn("h-4 w-4 transition-transform text-muted-foreground", isExpanded && "rotate-180")}
                                            />
                                        </TableCell>
                                    </TableRow>
                                    
                                    <AnimatePresence>
                                        {isExpanded && (
                                            <TableRow className="bg-navy-900/20">
                                                <TableCell colSpan={7} className="p-0">
                                                    <RPSDetailsRow result={result} />
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </AnimatePresence>
                                </Fragment>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>
            
            {results.length > pageSize && (
                <div className="flex justify-between items-center pt-2">
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