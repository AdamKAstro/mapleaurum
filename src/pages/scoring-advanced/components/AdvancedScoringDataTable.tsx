import React, { useState } from 'react';
import type { AdvancedScoringResult } from '../../../lib/scoringUtilsAdvanced';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { getMetricByKey } from '../../../lib/metric-types';

interface AdvancedScoringDataTableProps {
    results: AdvancedScoringResult[];
}

export const AdvancedScoringDataTable: React.FC<AdvancedScoringDataTableProps> = ({ results }) => {
    const [expandedRow, setExpandedRow] = useState<number | null>(null);

    return (
        <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-12">Rank</TableHead>
                        <TableHead>Company</TableHead>
                        <TableHead className="text-right">Final Score</TableHead>
                        <TableHead className="text-right">Confidence</TableHead>
                        <TableHead className="text-center">Metrics Used</TableHead>
                        <TableHead className="w-12"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {results.map((result, index) => (
                        <React.Fragment key={result.company.company_id}>
                            <TableRow 
                                onClick={() => setExpandedRow(expandedRow === index ? null : index)}
                                className="cursor-pointer hover:bg-navy-600/50"
                            >
                                <TableCell className="font-medium text-lg text-muted-foreground">{index + 1}</TableCell>
                                <TableCell>
                                    <div className="font-bold text-surface-white">{result.company.company_name}</div>
                                    <div className="text-xs text-muted-foreground">{result.company.primary_ticker}</div>
                                </TableCell>
                                <TableCell className="text-right font-bold text-accent-teal text-lg">
                                    {result.finalScore.toFixed(2)}
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-1">
                                        <div className="w-12 h-1.5 bg-navy-800 rounded-full">
                                            <div className="h-1.5 bg-green-500 rounded-full" style={{ width: `${result.confidenceScore * 100}%`}}></div>
                                        </div>
                                        <span>{(result.confidenceScore * 100).toFixed(0)}%</span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-center text-sm text-muted-foreground">
                                    {result.metricsUsed}
                                </TableCell>
                                <TableCell className="text-center">
                                    <ChevronDown className={cn("h-4 w-4 transition-transform", expandedRow === index && "rotate-180")} />
                                </TableCell>
                            </TableRow>
                            <AnimatePresence>
                                {expandedRow === index && (
                                    <TableRow className="bg-navy-800/50 hover:bg-navy-800/50">
                                        <TableCell colSpan={6}>
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                transition={{ duration: 0.2 }}
                                                className="p-4 overflow-hidden"
                                            >
                                                <h4 className="font-bold mb-3 text-surface-white">Score Breakdown</h4>
                                                <div className="text-xs space-y-1 max-h-60 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-navy-600">
                                                    {Object.entries(result.breakdown).sort(([, a], [, b]) => Math.abs(b.contribution) - Math.abs(a.contribution)).map(([key, metricData]) => {
                                                        const metricInfo = getMetricByKey(key);
                                                        const contribution = metricData.contribution * 100;
                                                        const isPositive = contribution > 0;
                                                        return (
                                                        <div key={key} className="flex justify-between items-center gap-2 p-1 rounded bg-navy-900/30">
                                                            <span className={cn("truncate", metricData.wasImputed && "italic text-muted-foreground")} title={metricInfo?.label}>
                                                                {metricInfo?.label || key} {metricData.wasImputed ? '(i)' : ''}
                                                            </span>
                                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                                <span className={cn("font-mono w-16 text-right", isPositive ? "text-green-400" : "text-red-400")}>
                                                                    {isPositive ? '+' : ''}{contribution.toFixed(2)}
                                                                </span>
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
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}