// src/features/hook-ui/components/PlayingCard.tsx
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // <--- IMPORT THIS
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import {
  Rocket, Shield, TrendingUp, Scale, Gem, Leaf, Search, DollarSign,
  Factory, Star, Heart, ExternalLink, Info, Sparkles, Award,
  TrendingDown, Activity, Pickaxe, Crown, Building2, HardHat,
  BarChart3, Globe, Coins, Timer, Mountain, AlertTriangle, ThumbsUp,
  Target, Zap
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Card, CardContent } from '../../../components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../../components/ui/tooltip';
import { toast } from 'react-hot-toast';
import { LazyLoadImage } from 'react-lazy-load-image-component';
import 'react-lazy-load-image-component/src/effects/blur.css';
import { debugLog, debugToast, debugTime, DEBUG_ENABLED } from '../config/debug-config';
import { safeString, safeNumber, safeArray, isValidUrl, getDefaultLogo, formatCurrency, formatNumber, cn } from '../lib/utils';
import type { EnhancedCompanyMatch, CompanyStatus } from '../types/hook-ui-types';
import '../styles/hook-ui.css';

interface PlayingCardProps {
  company: EnhancedCompanyMatch;
  index?: number;
  showMatchDetails?: boolean;
}

interface MetricDefinition {
  key: string;
  label: string;
  getValue: (company: EnhancedCompanyMatch) => number | null;
  format: (value: number) => string;  // Fixed the syntax error here
  icon: JSX.Element;
  isGoodWhenHigh: boolean;
  benchmark?: { good: number; bad: number };
  description?: string;
}

const metricDefinitions: MetricDefinition[] = [
  {
    key: 'ev_per_resource',
    label: 'EV/Resource',
    getValue: (c) => c.vm_ev_per_resource_oz_all || null,
    format: (v) => `${v.toFixed(0)}/oz`,
    icon: <Scale className="w-3 h-3" />,
    isGoodWhenHigh: false,
    benchmark: { good: 50, bad: 200 },
    description: 'Enterprise value per resource ounce',
  },
  {
    key: 'ev_per_reserve',
    label: 'EV/Reserve',
    getValue: (c) => c.vm_ev_per_reserve_oz_all || null,
    format: (v) => `${v.toFixed(0)}/oz`,
    icon: <Pickaxe className="w-3 h-3" />,
    isGoodWhenHigh: false,
    benchmark: { good: 100, bad: 400 },
    description: 'Enterprise value per reserve ounce',
  },
  {
    key: 'aisc',
    label: 'AISC',
    getValue: (c) => c.c_aisc_last_year || c.aisc || null,
    format: (v) => `${v.toFixed(0)}/oz`,
    icon: <Coins className="w-3 h-3" />,
    isGoodWhenHigh: false,
    benchmark: { good: 1200, bad: 1800 },
    description: 'All-in sustaining cost per ounce',
  },
  {
    key: 'reserve_life',
    label: 'Reserve Life',
    getValue: (c) => c.p_reserve_life_years || null,
    format: (v) => `${v.toFixed(1)} yrs`,
    icon: <Timer className="w-3 h-3" />,
    isGoodWhenHigh: true,
    benchmark: { good: 10, bad: 3 },
    description: 'Years of production at current rates',
  },
  {
    key: 'free_cash_flow',
    label: 'Free Cash Flow',
    getValue: (c) => c.f_free_cash_flow || null,
    format: (v) => formatCurrency(v, { compact: true }),
    icon: <DollarSign className="w-3 h-3" />,
    isGoodWhenHigh: true,
    benchmark: { good: 50000000, bad: -10000000 },
    description: 'Cash generated after capital expenditures',
  },
  {
    key: 'debt_to_equity',
    label: 'D/E Ratio',
    getValue: (c) => c.debtToEquity || null,
    format: (v) => v.toFixed(2),
    icon: <BarChart3 className="w-3 h-3" />,
    isGoodWhenHigh: false,
    benchmark: { good: 0.3, bad: 1.5 },
    description: 'Debt relative to shareholder equity',
  },
  {
    key: 'ev_to_ebitda',
    label: 'EV/EBITDA',
    getValue: (c) => c.f_enterprise_to_ebitda || null,
    format: (v) => v.toFixed(1) + 'x',
    icon: <TrendingUp className="w-3 h-3" />,
    isGoodWhenHigh: false,
    benchmark: { good: 8, bad: 20 },
    description: 'Enterprise value to earnings',
  },
  {
    key: 'price_to_book',
    label: 'P/B Ratio',
    getValue: (c) => c.f_price_to_book || null,
    format: (v) => v.toFixed(2) + 'x',
    icon: <BarChart3 className="w-3 h-3" />,
    isGoodWhenHigh: false,
    benchmark: { good: 1, bad: 3 },
    description: 'Price relative to book value',
  },
  {
    key: 'measured_indicated',
    label: 'M&I Resources',
    getValue: (c) => c.me_measured_indicated_total_aueq_moz || null,
    format: (v) => `${formatNumber(v, { decimals: 1 })}M oz`,
    icon: <Mountain className="w-3 h-3" />,
    isGoodWhenHigh: true,
    benchmark: { good: 5, bad: 1 },
    description: 'Measured & indicated resources',
  },
  {
    key: 'peg_ratio',
    label: 'PEG Ratio',
    getValue: (c) => c.f_peg_ratio || null,
    format: (v) => v.toFixed(2),
    icon: <TrendingUp className="w-3 h-3" />,
    isGoodWhenHigh: false,
    benchmark: { good: 1, bad: 2 },
    description: 'P/E ratio relative to growth',
  },
];

const analyzeMetrics = (company: EnhancedCompanyMatch) => {
  const timer = debugTime('analyzeMetrics');
  try {
    debugLog('metrics', `Analyzing metrics for company: ${company.name}`);
    const scoredMetrics = metricDefinitions
      .map(metric => {
        const value = metric.getValue(company);
        debugLog('metrics', `Metric ${metric.key}: Value = ${value}`);
        if (value === null || !metric.benchmark) return null;

        const { good, bad } = metric.benchmark;
        let score: number;
        
        if (metric.isGoodWhenHigh) {
          if (value >= good) score = 100;
          else if (value <= bad) score = 0;
          else score = ((value - bad) / (good - bad)) * 100;
        } else {
          if (value <= good) score = 100;
          else if (value >= bad) score = 0;
          else score = ((bad - value) / (bad - good)) * 100;
        }

        debugLog('metrics', `Metric ${metric.key}: Score = ${score}, Formatted = ${metric.format(value)}`);
        return {
          ...metric,
          value,
          score,
          formattedValue: metric.format(value),
        };
      })
      .filter(m => m !== null) as Array<MetricDefinition & { value: number; score: number; formattedValue: string }>;

    scoredMetrics.sort((a, b) => b.score - a.score);
    const bestMetrics = scoredMetrics.slice(0, 5);
    const worstMetrics = scoredMetrics.slice(-2).filter(m => m.score < 50);
    debugLog('metrics', `Metrics analyzed for ${company.name}`, { bestCount: bestMetrics.length, worstCount: worstMetrics.length });
    timer.end();
    return { bestMetrics, worstMetrics };
  } catch (error) {
    debugLog('metrics', `Error analyzing metrics for ${company.name}`, error);
    debugToast(`Failed to analyze metrics for ${company.name}`, { icon: '⚠️' });
    timer.end();
    return { bestMetrics: [], worstMetrics: [] };
  }
};

const statusConfig: Record<CompanyStatus, { icon: JSX.Element; label: string; color: string; bgGradient: string }> = {
  producer: {
    icon: <Factory className="w-4 h-4" />,
    label: 'Producer',
    color: 'text-green-400',
    bgGradient: 'from-green-500/20 to-emerald-500/20',
  },
  developer: {
    icon: <Building2 className="w-4 h-4" />,
    label: 'Developer',
    color: 'text-blue-400',
    bgGradient: 'from-blue-500/20 to-cyan-500/20',
  },
  explorer: {
    icon: <Search className="w-4 h-4" />,
    label: 'Explorer',
    color: 'text-purple-400',
    bgGradient: 'from-purple-500/20 to-pink-500/20',
  },
  royalty: {
    icon: <Crown className="w-4 h-4" />,
    label: 'Royalty',
    color: 'text-yellow-400',
    bgGradient: 'from-yellow-500/20 to-orange-500/20',
  },
  other: {
    icon: <HardHat className="w-4 h-4" />,
    label: 'Other',
    color: 'text-gray-400',
    bgGradient: 'from-gray-500/20 to-slate-500/20',
  },
};

const MetalComposition: React.FC<{ gold?: number | null; silver?: number | null }> = ({ gold, silver }) => {
  try {
    debugLog('rendering', `MetalComposition rendering`, { gold, silver });
    const goldPercent = safeNumber(gold, 0);
    const silverPercent = safeNumber(silver, 0);
    const otherPercent = Math.max(0, 100 - goldPercent - silverPercent);

    if (goldPercent === 0 && silverPercent === 0) {
      debugLog('rendering', 'MetalComposition: No metal data available');
      return <div className="text-xs text-slate-500 italic">No metal data</div>;
    }

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400">Metal Mix</span>
          <div className="flex gap-2 text-xs">
            {goldPercent > 0 && <span className="text-yellow-400">🥇 {goldPercent}%</span>}
            {silverPercent > 0 && <span className="text-gray-400">🥈 {silverPercent}%</span>}
            {otherPercent > 0 && <span className="text-slate-500">Other {otherPercent}%</span>}
          </div>
        </div>
        <div className="relative h-3 bg-slate-700 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${goldPercent}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="absolute left-0 top-0 h-full bg-gradient-to-r from-yellow-400 to-yellow-500"
          />
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${silverPercent}%` }}
            transition={{ duration: 1, delay: 0.2, ease: 'easeOut' }}
            className="absolute top-0 h-full bg-gradient-to-r from-gray-400 to-gray-500"
            style={{ left: `${goldPercent}%` }}
          />
        </div>
      </div>
    );
  } catch (error) {
    debugLog('rendering', `MetalComposition error`, { gold, silver, error });
    debugToast('Error rendering metal composition', { icon: '⚠️' });
    return <div className="text-xs text-red-500">Error rendering metal composition</div>;
  }
};

const MatchDetails: React.FC<{ company: EnhancedCompanyMatch }> = ({ company }) => {
  const matchScore = safeNumber(company.matchScore, 0);
  const matchReasons = safeArray(company.matchReasons, []);
  const rankPosition = safeNumber(company.rankPosition, 0);

  debugLog('rendering', `Rendering MatchDetails for ${company.name}`, { matchScore, matchReasons, rankPosition });

  if (!matchScore && !matchReasons.length && !rankPosition) {
    debugLog('rendering', 'No match data available for MatchDetails');
    return null;
  }

  return (
    <div className="mb-4 p-3 bg-slate-800/30 rounded-lg border border-cyan-500/20">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-semibold text-cyan-400">Match Analysis</span>
        </div>
        <div className="flex items-center gap-2">
          {rankPosition > 0 && <span className="text-xs text-slate-400">Rank #{rankPosition}</span>}
          <div className="px-2 py-1 bg-cyan-500/20 rounded-full">
            <span className="text-sm font-bold text-cyan-400">{matchScore}%</span>
          </div>
        </div>
      </div>
      {matchReasons.length > 0 ? (
        <div className="space-y-1">
          <span className="text-xs text-slate-400 font-medium">Why this match:</span>
          {matchReasons.slice(0, 3).map((reason, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="flex items-center gap-2 text-xs text-slate-300"
            >
              <Zap className="w-3 h-3 text-yellow-400" />
              {reason}
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-xs text-slate-500 italic">No match reasons available</div>
      )}
    </div>
  );
};

const PlayingCard: React.FC<PlayingCardProps> = ({ company, index = 0, showMatchDetails = false }) => {
  const navigate = useNavigate();
  const timer = debugTime('PlayingCardRender');
  debugLog('rendering', `Rendering card for company: ${company?.name || 'unknown'}`, {
    index,
    companyId: company?.id,
    hasMatchScore: company?.matchScore !== undefined,
    hasMatchReasons: Array.isArray(company?.matchReasons),
    hasRankPosition: company?.rankPosition !== undefined,
  });

  // Early validation
  if (!company || !company.id || !company.name) {
    debugLog('rendering', `Invalid company data provided`, {
      company,
      errors: {
        hasCompany: !!company,
        hasId: !!company?.id,
        hasName: !!company?.name,
      },
    });
    debugToast('Invalid company data provided', { icon: '⚠️', duration: 3000 });
    timer.end();
    return (
      <div className="w-80 h-[42rem] bg-red-500/20 rounded-2xl flex items-center justify-center text-white">
        <div className="text-center">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
          <p>Invalid company data</p>
          <p className="text-xs">Missing ID or name</p>
        </div>
      </div>
    );
  }

  try {
    // State
    const [isFlipped, setIsFlipped] = useState(false);
    const [isFavorite, setIsFavorite] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [logoError, setLogoError] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);

    // Animation
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const rotateX = useTransform(y, [-100, 100], [10, -10]);
    const rotateY = useTransform(x, [-100, 100], [-10, 10]);

    // Data processing
    const companyName = safeString(company.name, 'Unknown Company');
    const tsxCode = safeString(company.tsxCode);
    const logoUrl = company.logo || `https://dvagrllvivewyxolrhsh.supabase.co/storage/v1/object/public/company-logos/logos/${safeString(company.id)}.png`;
    const fallbackLogo = getDefaultLogo(companyName);
    const sharePrice = safeNumber(company.sharePrice);
    const marketCap = safeNumber(company.marketCap);
    const description = safeString(company.description, 'No description available.');
    const recentNews = safeArray(company.recentNews, []);
    const status = safeString(company.status, 'other') as CompanyStatus;
    const mineralsOfInterest = safeArray(company.minerals_of_interest, []);
    const percentGold = safeNumber(company.percent_gold);
    const percentSilver = safeNumber(company.percent_silver);
    const enterpriseValue = safeNumber(company.enterpriseValue);
    const cashPosition = safeNumber(company.cashPosition);
    const reserves = safeNumber(company.reserves);
    const resources = safeNumber(company.resources);
    const jurisdiction = safeString(company.jurisdiction);

    // Check for unused properties
    if (company.matchedInterests || company.scoreForPrimaryInterest) {
      debugLog('dataProcessing', `Unused properties detected`, {
        matchedInterests: company.matchedInterests,
        scoreForPrimaryInterest: company.scoreForPrimaryInterest,
      });
    }

    // Formatting
    const formattedSharePrice = sharePrice > 0 ? formatCurrency(sharePrice, { decimals: 2 }) : 'N/A';
    const formattedMarketCap = marketCap > 0 ? formatCurrency(marketCap, { compact: true }) : 'N/A';
    const formattedEV = enterpriseValue > 0 ? formatCurrency(enterpriseValue, { compact: true }) : 'N/A';
    const formattedCash = cashPosition > 0 ? formatCurrency(cashPosition, { compact: true }) : 'N/A';
    const statusInfo = statusConfig[status.toLowerCase()] || statusConfig.other;

    // Analyze metrics
    const { bestMetrics, worstMetrics } = analyzeMetrics(company);

    // Event handlers
    const handleLogoError = () => {
      debugLog('logoLoading', `Logo failed to load for ${companyName}: ${logoUrl}`);
      debugToast(`Failed to load logo for ${companyName}`, { icon: '⚠️', duration: 3000 });
      setLogoError(true);
    };

    const handleFlip = (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest('button')) {
        debugLog('interactions', 'Click on button, skipping flip');
        return;
      }
      debugLog('interactions', `Flipping card for ${companyName}`, { currentState: isFlipped ? 'Back' : 'Front' });
      setIsFlipped(!isFlipped);
      debugToast(`Viewing ${isFlipped ? 'overview' : 'details'} of ${companyName}`, { icon: isFlipped ? '📊' : '📈' });
    };

    const handleFavoriteToggle = (e: React.MouseEvent) => {
      e.stopPropagation();
      debugLog('interactions', `Toggling favorite for ${companyName}`, { currentState: isFavorite });
      setIsFavorite(!isFavorite);
      debugToast(
        `${companyName} ${isFavorite ? 'removed from' : 'added to'} favorites`,
        { icon: <Heart size={16} fill={isFavorite ? 'none' : 'currentColor'} />, duration: 2000 }
      );
    };

    const handleViewDetails = (e: React.MouseEvent) => {
      e.stopPropagation();
      const companyId = safeString(company.id, '0');
      debugLog('interactions', `Navigating to main companies page from ${company.name}`);
    // This now navigates the user to the main companies page
      navigate('/companies');
      toast('Navigating to the main company grid...');
    };

    // Mouse move effect
    useEffect(() => {
      const handleMouseMove = (e: MouseEvent) => {
        if (!cardRef.current || !isHovered) return;
        const rect = cardRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        x.set((e.clientX - centerX) * 0.5);
        y.set((e.clientY - centerY) * 0.5);
        debugLog('interactions', `Mouse move detected`, { x: x.get(), y: y.get() });
      };

      if (isHovered) {
        debugLog('interactions', 'Mouse entered card, enabling tilt effect');
        window.addEventListener('mousemove', handleMouseMove);
        return () => {
          debugLog('interactions', 'Mouse left card, disabling tilt effect');
          window.removeEventListener('mousemove', handleMouseMove);
          x.set(0);
          y.set(0);
        };
      }
    }, [isHovered, x, y]);

    // Reset logoError on company change
    useEffect(() => {
      debugLog('state', `Company ID changed: ${company.id}, resetting logoError`);
      setLogoError(false);
    }, [company.id]);

    // Render
    return (
      <motion.div
        ref={cardRef}
        className="relative w-80 h-[42rem] cursor-pointer mx-auto"
        style={{ perspective: '1000px', rotateX, rotateY, z: 100 }}
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: index * 0.1 }}
        onClick={handleFlip}
        onMouseEnter={() => {
          debugLog('interactions', 'Mouse entered card');
          setIsHovered(true);
        }}
        onMouseLeave={() => {
          debugLog('interactions', 'Mouse left card');
          setIsHovered(false);
        }}
        whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
        whileTap={{ scale: 0.98 }}
        role="button"
        aria-label={`View details for ${companyName}`}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            debugLog('interactions', 'Keydown Enter/Space, triggering flip');
            e.preventDefault();
            handleFlip(e as any);
          }
        }}
      >
        {/* Debug Overlay */}
        {DEBUG_ENABLED && (
          <div className="absolute top-2 right-2 bg-black/70 text-white text-xs p-2 rounded z-50">
            Logo: {company.logo ? 'Custom' : 'Supabase'} {logoError ? '(Error)' : ''}
            <br />
            Match: {company.matchScore || 0}% (#{company.rankPosition || '?'})
          </div>
        )}

        <AnimatePresence mode="wait">
          {!isFlipped ? (
            <motion.div
              key="front"
              className="absolute w-full h-full"
              initial={{ rotateY: 0 }}
              animate={{ rotateY: 0 }}
              exit={{ rotateY: -90 }}
              transition={{ duration: 0.3 }}
              style={{ backfaceVisibility: 'hidden' }}
            >
              <Card className="w-full h-full rounded-2xl shadow-2xl overflow-hidden border-2 border-slate-700/50">
                <motion.div
                  className="absolute inset-0 opacity-30"
                  animate={{
                    background: [
                      'radial-gradient(circle at 20% 80%, rgba(6, 182, 212, 0.3), transparent 50%)',
                      'radial-gradient(circle at 80% 20%, rgba(139, 92, 246, 0.3), transparent 50%)',
                      'radial-gradient(circle at 20% 80%, rgba(6, 182, 212, 0.3), transparent 50%)',
                    ],
                  }}
                  transition={{ duration: 10, repeat: Infinity }}
                />
                <CardContent className="relative p-6 h-full flex flex-col">
                  {showMatchDetails && <MatchDetails company={company} />}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <motion.div
                          className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full blur-md opacity-60"
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 3, repeat: Infinity }}
                        />
                        {logoUrl && !logoError && isValidUrl(logoUrl) ? (
                          <LazyLoadImage
                            src={logoUrl}
                            alt={`${companyName} logo`}
                            className="relative w-16 h-16 rounded-full border-2 border-cyan-400/50 object-contain bg-slate-800/50 p-1"
                            effect="blur"
                            width={64}
                            height={64}
                            onError={handleLogoError}
                            onLoad={() => debugLog('logoLoading', `Front logo loaded successfully: ${logoUrl}`)}
                          />
                        ) : (
                          <LazyLoadImage
                            src={fallbackLogo}
                            alt={`Fallback logo for ${companyName}`}
                            className="relative w-16 h-16 rounded-full border-2 border-cyan-400/50 object-contain bg-slate-800/50 p-1"
                            effect="blur"
                            width={64}
                            height={64}
                            onLoad={() => debugLog('logoLoading', `Front fallback logo loaded: ${fallbackLogo}`)}
                          />
                        )}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white truncate max-w-[180px]" title={companyName}>
                          {companyName}
                        </h3>
                        {tsxCode && tsxCode !== 'N/A' && (
                          <a
                            href={`https://www.tsx.com/listings/issuer-directory/company/${tsxCode}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => {
                              debugLog('interactions', `TSX link clicked for ${tsxCode}`);
                              e.stopPropagation();
                            }}
                            className="text-sm font-medium text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1"
                            aria-label={`Visit ${companyName} on TSX`}
                          >
                            TSX: {tsxCode} <ExternalLink size={12} />
                          </a>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        'p-2 transition-all',
                        isFavorite ? 'text-red-500 hover:text-red-400' : 'text-slate-400 hover:text-slate-300'
                      )}
                      onClick={handleFavoriteToggle}
                      aria-label={isFavorite ? `Remove ${companyName} from favorites` : `Add ${companyName} to favorites`}
                    >
                      <Heart size={20} fill={isFavorite ? 'currentColor' : 'none'} />
                    </Button>
                  </div>
                  <motion.div
                    className={cn(
                      'inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-3 w-fit',
                      statusInfo.color,
                      'bg-gradient-to-r',
                      statusInfo.bgGradient
                    )}
                    whileHover={{ scale: 1.05 }}
                  >
                    {statusInfo.icon}
                    {statusInfo.label}
                  </motion.div>
                  <div className="mb-3">
                    <MetalComposition gold={percentGold} silver={percentSilver} />
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <motion.div
                      className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-2.5 border border-slate-700/50"
                      whileHover={{ scale: 1.05, borderColor: 'rgba(6, 182, 212, 0.5)' }}
                    >
                      <span className="block text-xs text-slate-400 mb-0.5">Share Price</span>
                      <span className="text-sm font-bold text-white">{formattedSharePrice}</span>
                    </motion.div>
                    <motion.div
                      className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-2.5 border border-slate-700/50"
                      whileHover={{ scale: 1.05, borderColor: 'rgba(139, 92, 246, 0.5)' }}
                    >
                      <span className="block text-xs text-slate-400 mb-0.5">Market Cap</span>
                      <span className="text-sm font-bold text-white">{formattedMarketCap}</span>
                    </motion.div>
                    <motion.div
                      className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-2.5 border border-slate-700/50"
                      whileHover={{ scale: 1.05, borderColor: 'rgba(236, 72, 153, 0.5)' }}
                    >
                      <span className="block text-xs text-slate-400 mb-0.5">Enterprise Value</span>
                      <span className="text-sm font-bold text-white">{formattedEV}</span>
                    </motion.div>
                    <motion.div
                      className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-2.5 border border-slate-700/50"
                      whileHover={{ scale: 1.05, borderColor: 'rgba(34, 197, 94, 0.5)' }}
                    >
                      <span className="block text-xs text-slate-400 mb-0.5">Cash Position</span>
                      <span className="text-sm font-bold text-white">{formattedCash}</span>
                    </motion.div>
                  </div>
                  {bestMetrics.length > 0 && (
                    <div className="mb-3">
                      <div className="flex items-center gap-2 text-xs font-semibold text-green-400 mb-2">
                        <ThumbsUp className="w-3 h-3" />
                        Best Metrics
                      </div>
                      <div className="space-y-1">
                        {bestMetrics.map((metric, idx) => (
                          <TooltipProvider key={metric.key}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <motion.div
                                  initial={{ opacity: 0, x: -20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: idx * 0.1 }}
                                  className="flex items-center justify-between bg-green-500/10 rounded-lg px-2 py-1 border border-green-500/20"
                                >
                                  <div className="flex items-center gap-2">
                                    {metric.icon}
                                    <span className="text-xs text-slate-300">{metric.label}</span>
                                  </div>
                                  <span className="text-xs font-semibold text-green-400">{metric.formattedValue}</span>
                                </motion.div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs">{metric.description}</p>
                                <p className="text-xs text-green-400">Score: {metric.score.toFixed(0)}/100</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ))}
                      </div>
                    </div>
                  )}
                  {worstMetrics.length > 0 && (
                    <div className="mb-3">
                      <div className="flex items-center gap-2 text-xs font-semibold text-red-400 mb-2">
                        <AlertTriangle className="w-3 h-3" />
                        Areas of Concern
                      </div>
                      <div className="space-y-1">
                        {worstMetrics.map((metric, idx) => (
                          <TooltipProvider key={metric.key}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <motion.div
                                  initial={{ opacity: 0, x: -20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: idx * 0.1 }}
                                  className="flex items-center justify-between bg-red-500/10 rounded-lg px-2 py-1 border border-red-500/20"
                                >
                                  <div className="flex items-center gap-2">
                                    {metric.icon}
                                    <span className="text-xs text-slate-300">{metric.label}</span>
                                  </div>
                                  <span className="text-xs font-semibold text-red-400">{metric.formattedValue}</span>
                                </motion.div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs">{metric.description}</p>
                                <p className="text-xs text-red-400">Score: {metric.score.toFixed(0)}/100</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ))}
                      </div>
                    </div>
                  )}
                  <motion.button
                    className="w-full py-3 bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-bold rounded-xl shadow-lg relative overflow-hidden group mt-auto"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleViewDetails}
                  >
                    <span className="relative z-10">View Full Analysis</span>
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600"
                      initial={{ x: '100%' }}
                      whileHover={{ x: 0 }}
                      transition={{ duration: 0.3 }}
                    />
                  </motion.button>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <motion.div
              key="back"
              className="absolute w-full h-full"
              initial={{ rotateY: 90 }}
              animate={{ rotateY: 0 }}
              exit={{ rotateY: 90 }}
              transition={{ duration: 0.3 }}
              style={{ backfaceVisibility: 'hidden' }}
            >
              <Card className="w-full h-full rounded-2xl shadow-2xl overflow-hidden border-2 border-slate-700/50">
                <CardContent className="p-6 h-full flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {logoUrl && !logoError && isValidUrl(logoUrl) ? (
                        <LazyLoadImage
                          src={logoUrl}
                          alt={`${companyName} logo`}
                          className="w-12 h-12 rounded-lg border-2 border-purple-400/50 object-contain bg-slate-800/50 p-1"
                          effect="blur"
                          width={48}
                          height={48}
                          onError={handleLogoError}
                          onLoad={() => debugLog('logoLoading', `Back logo loaded successfully: ${logoUrl}`)}
                        />
                      ) : (
                        <LazyLoadImage
                          src={fallbackLogo}
                          alt={`Fallback logo for ${companyName}`}
                          className="w-12 h-12 rounded-lg border-2 border-purple-400/50 object-contain bg-slate-800/50 p-1"
                          effect="blur"
                          width={48}
                          height={48}
                          onLoad={() => debugLog('logoLoading', `Back fallback logo loaded: ${fallbackLogo}`)}
                        />
                      )}
                      <h3 className="text-2xl font-bold text-white">{companyName}</h3>
                    </div>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    >
                      <Info className="w-6 h-6 text-cyan-400" />
                    </motion.div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {jurisdiction && jurisdiction !== 'N/A' && (
                      <div className="bg-slate-700/50 rounded-lg p-2 text-center col-span-3">
                        <Globe className="w-4 h-4 mx-auto text-purple-400 mb-1" />
                        <p className="text-xs text-slate-400">Jurisdiction</p>
                        <p className="text-sm font-bold text-white">{jurisdiction}</p>
                      </div>
                    )}
                    {reserves > 0 && (
                      <div className="bg-slate-700/50 rounded-lg p-2 text-center">
                        <Pickaxe className="w-4 h-4 mx-auto text-yellow-400 mb-1" />
                        <p className="text-xs text-slate-400">Reserves</p>
                        <p className="text-sm font-bold text-white">{formatNumber(reserves, { decimals: 1 })}M oz</p>
                      </div>
                    )}
                    {resources > 0 && (
                      <div className="bg-slate-700/50 rounded-lg p-2 text-center">
                        <Mountain className="w-4 h-4 mx-auto text-blue-400 mb-1" />
                        <p className="text-xs text-slate-400">Resources</p>
                        <p className="text-sm font-bold text-white">{formatNumber(resources, { decimals: 1 })}M oz</p>
                      </div>
                    )}
                    {company.esgScore && company.esgScore > 0 && (
                      <div className="bg-slate-700/50 rounded-lg p-2 text-center">
                        <Leaf className="w-4 h-4 mx-auto text-green-400 mb-1" />
                        <p className="text-xs text-slate-400">ESG Score</p>
                        <p className="text-sm font-bold text-white">{company.esgScore}/100</p>
                      </div>
                    )}
                  </div>
                  <div className="mb-4 flex-1">
                    <h4 className="text-sm font-semibold text-cyan-400 mb-2">About</h4>
                    <p className="text-sm text-slate-300 leading-relaxed line-clamp-4">
                      {description}
                    </p>
                  </div>
                  {recentNews.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold text-purple-400 mb-2">Recent Updates</h4>
                      <ul className="space-y-1">
                        {recentNews.slice(0, 2).map((news, idx) => (
                          <motion.li
                            key={idx}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3, delay: idx * 0.1 }}
                            className="text-xs text-slate-300 truncate flex items-center gap-2"
                          >
                            <Activity className="w-3 h-3 text-cyan-400" />
                            {news}
                          </motion.li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-pink-400 mb-2">Focus Minerals</h4>
                    <div className="flex flex-wrap gap-2">
                      {mineralsOfInterest.length > 0 ? (
                        mineralsOfInterest.map((mineral, idx) => (
                          <motion.span
                            key={idx}
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.3, delay: idx * 0.1 }}
                            className="px-3 py-1 bg-slate-700/50 rounded-full text-xs text-slate-300 border border-slate-600"
                          >
                            {mineral === 'gold' ? '🥇' : mineral === 'silver' ? '🥈' : '💎'} {mineral}
                          </motion.span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-500 italic">No minerals specified</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 mt-auto">
                    <Button
                      className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold"
                      onClick={handleViewDetails}
                    >
                      <TrendingUp className="w-4 h-4 mr-2" />
                      Analyze
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 border-cyan-500 text-cyan-400 hover:bg-cyan-500/20"
                      onClick={(e) => {
                        debugLog('interactions', 'Flip back button clicked');
                        e.stopPropagation();
                        setIsFlipped(false);
                      }}
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      Flip Back
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {isHovered && (
            <>
              {[...Array(2)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1 h-1 bg-cyan-400 rounded-full pointer-events-none"
                  initial={{
                    x: Math.random() * 320 - 160,
                    y: Math.random() * 480 - 240,
                    scale: 0,
                  }}
                  animate={{
                    y: -300,
                    scale: [0, 0.5, 0],
                    opacity: [0, 0.5, 0],
                  }}
                  exit={{ opacity: 0 }}
                  transition={{
                    duration: 3,
                    delay: i * 0.3,
                    repeat: Infinity,
                  }}
                />
              ))}
            </>
          )}
        </AnimatePresence>
      </motion.div>
    );
  } catch (error) {
    debugLog('rendering', `Error rendering card for ${company?.name || 'unknown'}`, { error, stack: error.stack });
    debugToast(`Error rendering card for ${company?.name || 'unknown'}: ${error.message}`, { duration: 3000 });
    timer.end();
    return (
      <div className="w-80 h-[42rem] bg-red-500/20 rounded-2xl flex items-center justify-center text-white">
        <div className="text-center">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
          <p>Error: Failed to render card</p>
        </div>
      </div>
    );
  }
};

export default PlayingCard;