import React, { useState, useMemo } from 'react';
import type { AdvancedScoringResult } from '@/lib/scoringUtilsAdvanced';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, TrendingUp, TrendingDown, Microscope } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getMetricByKey } from '@/lib/metric-types';
import { StatusBadge } from '@/components/status-badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DataTablePagination } from '@/components/ui/data-table-pagination';

interface AdvancedScoringDataTableProps {
    results: AdvancedScoringResult[];
    page: number;
    pageSize: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (size: number) => void;
}

const RowTooltipContent: React.FC<{ result: AdvancedScoringResult }> = ({ result }) => {
    const topDrivers = useMemo(() => {
        return Object.entries(result.breakdown)
            .filter(([, data]) => data.contribution > 0)
            .sort(([, a], [, b]) => b.contribution - a.contribution)
            .slice(0, 3);
    }, [result.breakdown]);

    if (topDrivers.length === 0) {
        return <p className="text-xs">No significant positive score drivers.</p>;
    }

    return (
        <div>
            <p className="font-bold mb-1 text-surface-white">Top Score Drivers</p>
            <p className="text-xs text-muted-foreground mb-2">Primary metrics contributing to this company's high rank.</p>
            <ul className="space-y-1 text-xs">
                {topDrivers.map(([key, data]) => {
                    const metricInfo = getMetricByKey(key);
                    return <li key={key} className="flex justify-between gap-4">
                        <span className="text-gray-300">{metricInfo?.label || key}</span>
                        <span className="font-mono text-green-400">+{ (data.contribution).toFixed(2) }</span>
                    </li>
                })}
            </ul>
        </div>
    );
};

export const AdvancedScoringDataTable: React.FC<AdvancedScoringDataTableProps> = ({ 
    results, page, pageSize, onPageChange, onPageSizeChange 
}) => {
    const [expandedRow, setExpandedRow] = useState<number | null>(null);

    const paginatedResults = useMemo(() => {
        const start = (page - 1) * pageSize;
        const end = start + pageSize;
        return results.slice(start, end);
    }, [results, page, pageSize]);

    return (
        <div className="flex flex-col h-full">
            <div className="flex-grow overflow-auto rounded-lg border border-navy-600/50">
                <Table>
                    <TableHeader className="sticky top-0 bg-navy-800/80 backdrop-blur-sm z-10">
                        <TableRow>
                            <TableHead className="w-16">Rank</TableHead>
                            <TableHead>Company</TableHead>
                            <TableHead className="text-right">Final Score</TableHead>
                            <TableHead className="text-right w-32">Confidence</TableHead>
                            <TableHead className="text-center w-28">Metrics Used</TableHead>
                            <TableHead className="w-12 text-center"><Microscope size={16} /></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginatedResults.map((result, index) => {
                            const absoluteIndex = (page - 1) * pageSize + index;
                            return (
                            <React.Fragment key={result.company.company_id}>
                                <TooltipProvider delayDuration={100}>
                                <Tooltip>
                                <TooltipTrigger asChild>
                                <TableRow onClick={() => setExpandedRow(expandedRow === absoluteIndex ? null : absoluteIndex)} className="cursor-pointer hover:bg-navy-600/50">
                                    <TableCell className="font-medium text-lg text-muted-foreground">{absoluteIndex + 1}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <StatusBadge status={result.company.status} />
                                            <div>
                                                <div className="font-bold text-surface-white">{result.company.company_name}</div>
                                                <div className="text-xs text-muted-foreground">{result.company.primary_ticker}</div>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right font-bold text-accent-teal text-lg">{result.finalScore.toFixed(2)}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-1 font-mono text-xs">
                                            <div className="w-12 h-1.5 bg-navy-800 rounded-full"><div className="h-1.5 bg-green-500 rounded-full" style={{ width: `${result.confidenceScore * 100}%`}}></div></div>
                                            <span>{(result.confidenceScore * 100).toFixed(0)}%</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center text-sm text-muted-foreground">{Object.keys(result.breakdown).length}</TableCell>
                                    <TableCell className="text-center"><ChevronDown className={cn("h-4 w-4 transition-transform", expandedRow === absoluteIndex && "rotate-180")} /></TableCell>
                                </TableRow>
                                </TooltipTrigger>
                                <TooltipContent side="top" align="start" className="p-3 z-[100] bg-navy-700/95 border border-navy-600/80 font-sans">
                                    <RowTooltipContent result={result} />
                                </TooltipContent>
                                </Tooltip>
                                </TooltipProvider>

                                <AnimatePresence>
                                    {expandedRow === absoluteIndex && (
                                        <TableRow className="bg-navy-800/50 hover:bg-navy-800/50">
                                            <TableCell colSpan={6}>
                                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} className="p-4 overflow-hidden">
                                                    <h4 className="font-bold mb-3 text-surface-white">Score Breakdown</h4>
                                                    <div className="text-xs space-y-1 max-h-60 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-navy-600">
                                                        {Object.entries(result.breakdown).sort(([, a], [, b]) => Math.abs(b.contribution) - Math.abs(a.contribution)).map(([key, metricData]) => {
                                                            const metricInfo = getMetricByKey(key);
                                                            const contribution = metricData.contribution;
                                                            const isPositive = contribution > 0;
                                                            return (
                                                            <div key={key} className="flex justify-between items-center gap-2 p-1 rounded bg-navy-900/30">
                                                                <span className={cn("truncate", metricData.wasImputed && "italic text-muted-foreground")} title={metricInfo?.label}>{metricInfo?.label || key} {metricData.wasImputed ? '(i)' : ''}</span>
                                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                                    <span className={cn("font-mono w-16 text-right", isPositive ? "text-green-400" : "text-red-400")}>{isPositive ? '+' : ''}{(contribution).toFixed(2)}</span>
                                                                    {isPositive ? <TrendingUp className="h-3 w-3 text-green-500" /> : <TrendingDown className="h-3 w-3 text-red-500" />}
                                                                </div>
                                                            </div>
                                                        )})}
                                                    </div>
                                                </motion.div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </AnimatePresence>
                            </React.Fragment>
                        )})}
                    </TableBody>
                </Table>
            </div>
            <div className="mt-4 flex-shrink-0">
                 <DataTablePagination page={page} pageSize={pageSize} totalCount={results.length} onPageChange={onPageChange} onPageSizeChange={onPageSizeChange} pageSizeOptions={[25, 50, 100, 250]} />
            </div>
        </>
    );
}