// src/pages/RPSScoringPage/components/RPSResultsDisplay.tsx
import React, { useEffect, useRef, useState, useMemo, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import type { RPSScoringResult } from '../rps-scoring-engine';
import { motion, AnimatePresence } from 'framer-motion';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/status-badge';
import { RPSDetailsRow } from './RPSDetailsRow';
import { ChevronDown, Info, BarChart3, ExternalLink } from 'lucide-react'; // IMPORTED: ExternalLink
import { cn } from '@/lib/utils';

// --- Component Props ---
interface RPSResultsDisplayProps {
  results: RPSScoringResult[];
}

// --- Helper Components ---
const ColumnHeaderTooltip: React.FC<{ title: string; description: string }> = ({ title, description }) => (
  <TooltipProvider delayDuration={100}>
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          className="flex items-center gap-1 text-muted-foreground hover:text-accent-teal transition-colors text-left"
          aria-label={`Learn more about ${title}`}
        >
          <span>{title}</span>
          <Info size={14} aria-hidden="true" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs p-3 bg-navy-700/95 border border-navy-600/80">
        <p className="font-bold text-surface-white mb-1">{title}</p>
        <p className="text-xs text-gray-300">{description}</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

// Enhanced animated score display
const AnimatedScore: React.FC<{ value: number; delay?: number }> = ({ value, delay = 0 }) => {
  const [displayValue, setDisplayValue] = useState(0);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const duration = 1000; // ms
    const steps = 30;
    const startValue = displayValue;
    const increment = (value - startValue) / steps;
    let currentStep = 0;
    let startTime: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;

      if (progress >= (duration / steps) * currentStep) {
        currentStep++;
        if (currentStep <= steps) {
          setDisplayValue(startValue + increment * currentStep);
        } else {
          setDisplayValue(value);
          return;
        }
      }

      if (currentStep <= steps) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    const timeout = setTimeout(() => {
      animationRef.current = requestAnimationFrame(animate);
    }, delay);

    return () => {
      clearTimeout(timeout);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [value, delay]);

  return (
    <motion.span
      key={value}
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 200, delay: delay / 1000 }}
      className="text-2xl font-bold text-accent-teal"
      aria-label={`Score: ${value.toFixed(1)}`}
    >
      {Number.isFinite(displayValue) ? displayValue.toFixed(1) : '0.0'}
    </motion.span>
  );
};

// Score cell tooltip
const ScoreCellTooltip: React.FC<{ result: RPSScoringResult }> = ({ result }) => {
  const topContributors = [...(result.breakdown || [])]
    .sort((a, b) => (b.contribution || 0) - (a.contribution || 0))
    .slice(0, 4);

  return (
    <div className="space-y-3 p-1">
      <p className="font-bold text-surface-white">Top Contributing Metrics</p>
      <div className="space-y-1.5">
        {topContributors.length > 0 ? (
          topContributors.map((data, index) => (
            <motion.div
              key={data.metricKey || index}
              className="flex justify-between items-center gap-3 text-xs"
              initial={{ x: -10, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.2, delay: index * 0.05 }}
            >
              <span className="text-gray-300 truncate">{data.label || 'Unknown'}</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-accent-teal">
                  +{(data.contribution || 0).toFixed(1)}
                </span>
                <span className="text-gray-500">({data.weight || 0}%)</span>
              </div>
            </motion.div>
          ))
        ) : (
          <p className="text-xs text-gray-400">No contributing metrics available.</p>
        )}
      </div>
    </div>
  );
};

// Rank badge with animation
const RankBadge: React.FC<{ rank: number; total: number; delay?: number }> = ({ rank, total, delay = 0 }) => (
  <motion.div
    initial={{ scale: 0 }}
    animate={{ scale: 1 }}
    transition={{
      type: 'spring',
      stiffness: 500,
      damping: 15,
      delay,
    }}
    whileHover={{ scale: 1.05 }}
    className="text-center font-mono"
    aria-label={`Rank ${rank} of ${total}`}
  >
    <span className="font-bold text-surface-white">{Number.isFinite(rank) ? rank : '-'}</span>
    <span className="text-muted-foreground">/{Number.isFinite(total) ? total : '-'}</span>
  </motion.div>
);

// --- Main Results Display Component ---
export const RPSResultsDisplay: React.FC<RPSResultsDisplayProps> = ({ results }) => {
  const [expandedRows, setExpandedRows] = useState<Set<string | number>>(new Set());
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const navigate = useNavigate();

  const paginatedResults = useMemo(() => {
    const start = (page - 1) * pageSize;
    return results.slice(start, start + pageSize);
  }, [results, page]);

  const toggleRow = (companyId: string | number) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(companyId)) {
        next.delete(companyId);
      } else {
        next.add(companyId);
      }
      return next;
    });
  };
  
  const handleNavigate = (companyId: string | number | undefined | null) => {
      if (companyId) {
          navigate(`/company/${companyId}`);
      }
  };

  if (!results.length) {
    return (
      <div className="text-center text-muted-foreground py-4">
        No results to display. Calculate RPS to see rankings.
      </div>
    );
  }

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
            <AnimatePresence>
              {paginatedResults.map((result, index) => {
                const globalRank = (page - 1) * pageSize + index + 1;
                const companyId = result.company.company_id ?? `company-${index}`;
                const isExpanded = expandedRows.has(companyId);
                const rowDelay = index * 30;

                return (
                  <Fragment key={companyId}>
                    <motion.tr
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{
                        duration: 0.3,
                        delay: rowDelay / 1000,
                      }}
                      className="cursor-pointer hover:bg-navy-700/30 transition-colors"
                      // REVERTED: Row click now toggles the details view
                      onClick={() => toggleRow(companyId)}
                      whileHover={{ backgroundColor: 'rgba(30, 41, 59, 0.3)' }}
                      role="button"
                      aria-label={`Toggle details for ${result.company.tsx_code ?? result.company.company_name ?? 'company'}`}
                    >
                      <TableCell>
                        <motion.div
                          className="text-lg font-bold text-muted-foreground"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', delay: (rowDelay + 50) / 1000 }}
                        >
                          #{globalRank}
                        </motion.div>
                      </TableCell>
                      <TableCell>
                        <motion.div
                          className="flex items-center gap-3"
                          initial={{ x: -20, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{ delay: (rowDelay + 40) / 1000 }}
                        >
                          <StatusBadge status={result.company.status} />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-surface-white">
                                {result.company.company_name ?? 'Unknown'}
                              </span>
                              {/* ADDED: Navigation button next to the company name */}
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-5 w-5 text-muted-foreground hover:text-accent-teal"
                                      onClick={(e) => {
                                        e.stopPropagation(); // Prevents the row's toggle onClick
                                        handleNavigate(result.company.company_id);
                                      }}
                                      aria-label={`View details for ${result.company.company_name}`}
                                    >
                                      <ExternalLink size={14} />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>View Company Details</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {result.company.tsx_code || ''}
                            </div>
                          </div>
                        </motion.div>
                      </TableCell>
                      <TableCell className="text-right">
                        <TooltipProvider delayDuration={100}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <motion.div className="inline-flex items-center gap-2" whileHover={{ scale: 1.05 }}>
                                <AnimatedScore value={result.finalScore} delay={rowDelay + 100} />
                                <motion.div
                                  animate={{ rotate: [0, 10, -10, 0] }}
                                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                                  aria-hidden="true"
                                >
                                  <BarChart3 className="text-accent-teal/50" size={18} />
                                </motion.div>
                              </motion.div>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="p-3 bg-navy-700/95 border border-navy-600/80">
                              <ScoreCellTooltip result={result} />
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell className="text-center">
                        <RankBadge
                          rank={result.statusRank.rank}
                          total={result.statusRank.total}
                          delay={(rowDelay + 150) / 1000}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <RankBadge
                          rank={result.valuationRank.rank}
                          total={result.valuationRank.total}
                          delay={(rowDelay + 200) / 1000}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <RankBadge
                          rank={result.operationalRank.rank}
                          total={result.operationalRank.total}
                          delay={(rowDelay + 250) / 1000}
                        />
                      </TableCell>
                      <TableCell>
                        {/* REVERTED: Chevron is now a visual indicator again */}
                        <motion.div
                          animate={{ rotate: isExpanded ? 180 : 0 }}
                          transition={{ duration: 0.3 }}
                          aria-hidden="true"
                        >
                          <ChevronDown className={cn('h-4 w-4 transition-transform text-muted-foreground')} />
                        </motion.div>
                      </TableCell>
                    </motion.tr>
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
            </AnimatePresence>
          </TableBody>
        </Table>
      </div>

      {results.length > pageSize && (
        <motion.div
          className="flex justify-between items-center pt-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <p className="text-sm text-muted-foreground">
            Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, results.length)} of {results.length}{' '}
            results
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              aria-label="Previous page"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={page * pageSize >= results.length}
              aria-label="Next page"
            >
              Next
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
};