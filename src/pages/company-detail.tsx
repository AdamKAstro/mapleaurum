// src/pages/company-detail.tsx
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { useFilters } from '../contexts/filter-context';
import { useSubscription } from '../contexts/subscription-context';
import { useCurrency } from '../contexts/currency-context';
import { Button } from '../components/ui/button';
import { PageContainer } from '../components/ui/page-container';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';
import { 
  ArrowLeft, Heart, Building2, DollarSign, BarChart3, Lock, TrendingUp, Coins, Mountain, Factory, Shield,
  AlertCircle, Loader2, Sparkles, Activity, Target, Zap, Globe, Timer, Pickaxe, Crown, Search, HardHat,
  ExternalLink, Info, ArrowUpRight, ArrowDownRight, Minus, Wallet, CreditCard, Scale, BarChart2, MapPin,
  BookOpen, Hammer, ChartBar, Share2, FileText, Hash, Layers, Gem, Rocket, PieChart, ChevronRight, CheckCircle,
  Star, GaugeCircle, Briefcase
} from 'lucide-react';
import { formatCurrency, formatNumber, formatPercent, cn } from '../lib/utils';
import { TierBadge } from '../components/ui/tier-badge';
import type { Company, ColumnTier } from '../lib/types';
import { metrics as allMetrics, metricCategories, getAccessibleMetrics } from '../lib/metric-types';
import { LazyLoadImage } from 'react-lazy-load-image-component';
import 'react-lazy-load-image-component/src/effects/blur.css';
import { convertAmount, fetchLatestExchangeRates } from '../lib/currencyUtils'; // Import from currencyUtils

// MetricCard component
interface MetricCardProps {
  label: string;
  value: any;
  format?: 'currency' | 'number' | 'percent' | 'text' | 'moz' | 'koz' | 'years' | 'ratio';
  tier?: ColumnTier;
  userTier: ColumnTier;
  icon?: React.ReactNode;
  description?: string;
  benchmark?: { good: number; bad: number };
  isGoodWhenHigh?: boolean;
  trend?: number;
  sparklineData?: number[];
  category?: string;
  delay?: number;
  fullWidth?: boolean;
  currency?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ 
  label, value, format = 'text', tier = 'free', userTier, icon, description, benchmark,
  isGoodWhenHigh = true, trend, sparklineData, category, delay = 0, fullWidth, currency = 'USD'
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const { currency: selectedCurrency } = useCurrency(); // Only use currency from context
  const tierLevels: Record<ColumnTier, number> = { free: 0, pro: 1, premium: 2 };
  const hasAccess = tierLevels[userTier] >= tierLevels[tier];
  const [isHovered, setIsHovered] = useState(false);
  const [rates, setRates] = useState<any>({});

  useEffect(() => {
    const loadRates = async () => {
      const exchangeRates = await fetchLatestExchangeRates();
      setRates(exchangeRates);
    };
    loadRates();
  }, []);

  const formatValue = (val: any): string => {
    if (val === null || val === undefined) return 'N/A';
    switch (format) {
      case 'currency':
        try {
          const convertedValue = convertAmount(val, currency, selectedCurrency, rates);
          return formatCurrency(convertedValue || val, { compact: true, currency: selectedCurrency });
        } catch (e) {
          console.warn(`[MetricCard] Currency conversion failed for ${label}:`, e);
          return formatCurrency(val, { compact: true, currency });
        }
      case 'number': return formatNumber(val, { decimals: 1 });
      case 'percent': return formatPercent(val, 1);
      case 'moz': return `${formatNumber(val, { decimals: 2 })} Moz`;
      case 'koz': return `${formatNumber(val, { decimals: 0 })} koz`;
      case 'years': return `${formatNumber(val, { decimals: 1 })} years`;
      case 'ratio': return `${formatNumber(val, { decimals: 2 })}x`;
      default: return String(val);
    }
  };

  const getPerformanceScore = () => {
    if (!benchmark || value === null || value === undefined) return null;
    const { good, bad } = benchmark;
    let score: number;
    if (isGoodWhenHigh) {
      if (value >= good) score = 100;
      else if (value <= bad) score = 0;
      else score = ((value - bad) / (good - bad)) * 100;
    } else {
      if (value <= good) score = 100;
      else if (value >= bad) score = 0;
      else score = ((bad - value) / (bad - good)) * 100;
    }
    return Math.max(0, Math.min(100, score));
  };

  const performanceScore = getPerformanceScore();
  const scoreColor = performanceScore !== null
    ? performanceScore >= 70 ? 'text-green-400'
    : performanceScore >= 40 ? 'text-yellow-400'
    : 'text-red-400'
    : '';

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 10 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
      transition={{ duration: 0.3, delay }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn("relative group", fullWidth ? "col-span-full" : "")}
    >
      <div className={cn(
        "relative p-3 rounded-lg border transition-all duration-200",
        hasAccess ? "bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50 hover:border-cyan-500/50" 
        : "bg-slate-900/30 border-slate-800/30"
      )}>
        <motion.div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          animate={isHovered ? {
            background: [
              'radial-gradient(circle at 20% 50%, rgba(6, 182, 212, 0.15), transparent 50%)',
              'radial-gradient(circle at 80% 50%, rgba(139, 92, 246, 0.15), transparent 50%)',
            ],
          } : {}}
          transition={{ duration: 3, repeat: Infinity }}
        />
        <div className="relative z-10">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <motion.div className={cn("p-1.5 rounded-md", hasAccess ? "bg-slate-700/50" : "bg-slate-800/30")} whileHover={{ scale: 1.1 }}>
                {icon || <BarChart3 className="w-3 h-3 text-cyan-400" />}
              </motion.div>
              <div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <h4 className="text-xs font-medium text-gray-300 flex items-center gap-1 cursor-help">
                        {label}
                        {description && <Info className="w-2.5 h-2.5 text-gray-500" />}
                      </h4>
                    </TooltipTrigger>
                    {description && <TooltipContent className="max-w-xs"><p className="text-xs">{description}</p></TooltipContent>}
                  </Tooltip>
                </TooltipProvider>
                {category && <span className="text-[10px] text-gray-500">{category}</span>}
              </div>
            </div>
            {!hasAccess && <TierBadge tier={tier} size="xs" />}
          </div>
          {hasAccess ? (
            <div className="space-y-2">
              <div className="flex items-end justify-between">
                <motion.p className="text-lg font-bold text-white" initial={{ scale: 0.9 }} animate={{ scale: 1 }} transition={{ duration: 0.2, delay: delay + 0.1 }}>
                  {formatValue(value)}
                </motion.p>
                {trend !== undefined && (
                  <motion.div className={cn("flex items-center gap-1 text-xs", trend > 0 ? "text-green-400" : trend < 0 ? "text-red-400" : "text-gray-400")} 
                    initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: delay + 0.2 }}>
                    {trend > 0 ? <ArrowUpRight className="w-3 h-3" /> : trend < 0 ? <ArrowDownRight className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                    <span>{Math.abs(trend)}%</span>
                  </motion.div>
                )}
              </div>
              {performanceScore !== null && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-gray-500">Performance</span>
                    <span className={cn("font-medium", scoreColor)}>{performanceScore.toFixed(0)}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                    <motion.div className={cn("h-full rounded-full", performanceScore >= 70 ? "bg-green-400" : performanceScore >= 40 ? "bg-yellow-400" : "bg-red-400")} 
                      initial={{ width: 0 }} animate={{ width: `${performanceScore}%` }} transition={{ duration: 0.8, delay: delay + 0.3, ease: "easeOut" }} />
                  </div>
                </div>
              )}
              {sparklineData && sparklineData.length > 0 && (
                <motion.div className="h-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: delay + 0.4 }}>
                  <svg className="w-full h-full" viewBox="0 0 100 32">
                    <motion.path d={`M ${sparklineData.map((v, i) => `${(i / (sparklineData.length - 1)) * 100},${32 - (v / Math.max(...sparklineData)) * 28}`).join(' L ')}`} 
                      fill="none" stroke="url(#gradient)" strokeWidth="1.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} 
                      transition={{ duration: 1, delay: delay + 0.5 }} />
                    <defs>
                      <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#06b6d4" />
                        <stop offset="100%" stopColor="#8b5cf6" />
                      </linearGradient>
                    </defs>
                  </svg>
                </motion.div>
              )}
            </div>
          ) : (
            <motion.div className="flex items-center gap-1.5 text-gray-500 text-xs mt-1" whileHover={{ x: 3 }}>
              <Lock className="w-3 h-3" />
              <span>Upgrade to view</span>
            </motion.div>
          )}
        </div>
        <AnimatePresence>
          {isHovered && hasAccess && (
            <>
              {[...Array(2)].map((_, i) => (
                <motion.div key={i} className="absolute w-1 h-1 bg-cyan-400 rounded-full pointer-events-none" 
                  initial={{ x: Math.random() * 50 - 25, y: Math.random() * 50 - 25, scale: 0 }} 
                  animate={{ y: -50, scale: [0, 0.8, 0], opacity: [0, 0.6, 0] }} 
                  exit={{ opacity: 0 }} transition={{ duration: 1.5, delay: i * 0.1, repeat: Infinity }} />
              ))}
            </>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

// Status configuration
const statusConfig: Record<string, { icon: JSX.Element; label: string; color: string; bgGradient: string; description: string }> = {
  producer: { icon: <Factory className="w-4 h-4" />, label: 'Producer', color: 'text-green-400', bgGradient: 'from-green-500/20 to-emerald-500/20', description: 'Actively producing and selling minerals' },
  developer: { icon: <Building2 className="w-4 h-4" />, label: 'Developer', color: 'text-blue-400', bgGradient: 'from-blue-500/20 to-cyan-500/20', description: 'Developing mines for future production' },
  explorer: { icon: <Search className="w-4 h-4" />, label: 'Explorer', color: 'text-purple-400', bgGradient: 'from-purple-500/20 to-pink-500/20', description: 'Exploring for new mineral deposits' },
  royalty: { icon: <Crown className="w-4 h-4" />, label: 'Royalty', color: 'text-yellow-400', bgGradient: 'from-yellow-500/20 to-orange-500/20', description: 'Earning royalties from mining operations' },
  other: { icon: <HardHat className="w-4 h-4" />, label: 'Other', color: 'text-gray-400', bgGradient: 'from-gray-500/20 to-slate-500/20', description: 'Other mining-related activities' },
};


// HeroSection component
const HeroSection: React.FC<{ company: Company; isFavorite: boolean; onToggleFavorite: () => void }> = ({ company, isFavorite, onToggleFavorite }) => {
  const [logoError, setLogoError] = useState(false);
  const status = statusConfig[company.status?.toLowerCase() || 'other'] || statusConfig.other;
  const fallbackLogo = '/placeholder-logo.png';

  return (
    <motion.div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 mb-6" 
      initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <motion.div className="absolute inset-0 opacity-20" 
        animate={{ background: ['radial-gradient(circle at 0% 0%, rgba(6, 182, 212, 0.3), transparent 50%)', 'radial-gradient(circle at 100% 100%, rgba(139, 92, 246, 0.3), transparent 50%)'] }} 
        transition={{ duration: 15, repeat: Infinity }} />
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <motion.div className="relative" whileHover={{ scale: 1.05 }} transition={{ type: "spring", stiffness: 300 }}>
            <motion.div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-xl blur-lg opacity-50" 
              animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity }} />
            <LazyLoadImage 
              src={logoError ? fallbackLogo : (company.logo || `https://dvagrllvivewyxolrhsh.supabase.co/storage/v1/object/public/company-logos/logos/${company.company_id}.png`)} 
              alt={`${company.company_name} logo`} 
              className="relative w-16 h-16 rounded-xl border-2 border-cyan-400/50 object-contain bg-slate-800/80 p-1.5" 
              effect="blur" 
              width={64} 
              height={64} 
              onError={() => {
                console.warn(`[CompanyLogo] Failed to load: https://dvagrllvivewyxolrhsh.supabase.co/storage/v1/object/public/company-logos/logos/${company.company_id}.png`);
                setLogoError(true);
              }} 
            />
          </motion.div>
          <div>
            <motion.h1 className="text-3xl font-bold text-white mb-1" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
              {company.company_name}
            </motion.h1>
            <div className="flex items-center gap-3 mb-2">
              {company.tsx_code && (
                <motion.a href={`https://www.tsx.com/listings/issuer-directory/company/${company.tsx_code}`} target="_blank" rel="noopener noreferrer" 
                  className="text-sm font-medium text-cyan-400 hover:text-cyan-300 flex items-center gap-1" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  TSX: {company.tsx_code} <ExternalLink size={14} />
                </motion.a>
              )}
              <motion.div className={cn('inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium', status.color, 'bg-gradient-to-r', status.bgGradient)} 
                whileHover={{ scale: 1.05 }}>
                {status.icon}
                {status.label}
              </motion.div>
            </div>
            {company.headquarters && (
              <motion.div className="flex items-center gap-1.5 text-gray-400 text-xs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                <MapPin className="w-3 h-3" />
                <span>{company.headquarters}</span>
              </motion.div>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <motion.button onClick={onToggleFavorite} className={cn("p-3 rounded-lg transition-all", isFavorite ? "bg-gradient-to-r from-red-500 to-pink-600 text-white" : "bg-slate-800/50 text-gray-400 hover:text-white hover:bg-slate-700/50")} 
            whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
            <Heart className={cn("w-5 h-5", isFavorite && "fill-current")} />
          </motion.button>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <motion.button className="p-3 rounded-lg bg-slate-800/50 text-gray-400 hover:text-white hover:bg-slate-700/50" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                  <Share2 className="w-5 h-5" />
                </motion.button>
              </TooltipTrigger>
              <TooltipContent><p>Share company</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      <AnimatePresence>
        {[...Array(3)].map((_, i) => (
          <motion.div key={i} className="absolute w-1.5 h-1.5 bg-cyan-400/30 rounded-full" 
            initial={{ x: Math.random() * 80 - 40, y: 80, scale: 0 }} animate={{ y: -80, scale: [0, 0.8, 0], opacity: [0, 0.6, 0] }} 
            transition={{ duration: 2 + Math.random() * 1, delay: i * 0.3, repeat: Infinity }} />
        ))}
      </AnimatePresence>
    </motion.div>
  );
};









// KeyMetricsOverview component
const KeyMetricsOverview: React.FC<{ company: Company }> = ({ company }) => {
  const { currency: selectedCurrency } = useCurrency();
  const [rates, setRates] = useState<any>({});

  useEffect(() => {
    const loadRates = async () => {
      const exchangeRates = await fetchLatestExchangeRates();
      setRates(exchangeRates);
    };
    loadRates();
  }, []);

  const keyMetrics = [
    { label: 'Share Price', value: company.share_price, format: 'currency' as const, currency: 'CAD', icon: <TrendingUp className="w-4 h-4 text-green-400" />, trend: 5.2, sparkline: [20, 22, 19, 24, 26, 25, 28] },
    { label: 'Market Cap', value: company.financials?.market_cap_value, format: 'currency' as const, currency: 'CAD', icon: <PieChart className="w-4 h-4 text-blue-400" />, trend: -2.1, sparkline: [100, 98, 102, 95, 94, 96, 93] },
    { label: 'Enterprise Value', value: company.financials?.enterprise_value_value, format: 'currency' as const, currency: 'CAD', icon: <Building2 className="w-4 h-4 text-purple-400" />, trend: 3.8, sparkline: [80, 82, 85, 83, 88, 90, 92] },
    { label: 'Cash Position', value: company.financials?.cash_value, format: 'currency' as const, currency: 'CAD', icon: <Wallet className="w-4 h-4 text-cyan-400" />, trend: 12.5, sparkline: [40, 42, 45, 48, 52, 55, 60] }
  ];

  return (
    <motion.div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 mb-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, staggerChildren: 0.08 }}>
      {keyMetrics.map((metric, index) => (
        <motion.div key={metric.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.08 }}>
          <Card className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50 hover:border-cyan-500/50 transition-all duration-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <motion.div className="p-2 rounded-md bg-slate-700/50" whileHover={{ scale: 1.1, rotate: 5 }}>{metric.icon}</motion.div>
                <motion.div className={cn("flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded-full", metric.trend > 0 ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400")} 
                  initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2 + index * 0.08 }}>
                  {metric.trend > 0 ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
                  {Math.abs(metric.trend)}%
                </motion.div>
              </div>
              <h3 className="text-xs text-gray-400 mb-1">{metric.label}</h3>
              <p className="text-lg font-bold text-white mb-2">
                {metric.format === 'currency' 
                  ? (metric.value != null 
                      ? formatCurrency(
                          convertAmount(metric.value, metric.currency, selectedCurrency, rates) || metric.value,
                          { compact: true, currency: selectedCurrency }
                        ) 
                      : 'N/A')
                  : metric.value || 'N/A'}
              </p>
              {metric.sparkline && (
                <motion.div className="h-8 w-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 + index * 0.08 }}>
                  <svg className="w-full h-full" viewBox="0 0 100 32">
                    <motion.path d={`M ${metric.sparkline.map((v, i) => `${(i / (metric.sparkline.length - 1)) * 100},${32 - (v / Math.max(...metric.sparkline)) * 28}`).join(' L ')}`} 
                      fill="none" stroke={metric.trend > 0 ? "#10b981" : "#ef4444"} strokeWidth="1.5" strokeLinecap="round" 
                      initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.8, delay: 0.5 + index * 0.08 }} />
                  </svg>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  );
};












// RelatedCompanies component
const RelatedCompanies: React.FC<{ relatedCompanyIds: number[] }> = ({ relatedCompanyIds }) => {
  const { fetchCompaniesByIds } = useFilters();
  const [relatedCompanies, setRelatedCompanies] = useState<Company[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const loadRelatedCompanies = async () => {
      if (relatedCompanyIds.length > 0) {
        const companies = await fetchCompaniesByIds(relatedCompanyIds.slice(0, 4));
        setRelatedCompanies(companies);
      }
    };
    loadRelatedCompanies();
  }, [relatedCompanyIds, fetchCompaniesByIds]);

  if (relatedCompanies.length === 0) return null;

  return (
    <motion.div className="mt-6" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
      <Card className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-slate-700/50">
        <CardHeader className="py-3">
          <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Related Companies
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            {relatedCompanies.map((company, index) => (
              <motion.div key={company.company_id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 + index * 0.08 }}>
                <Card className="bg-slate-800/50 border-slate-700/50 hover:border-cyan-500/50 transition-all duration-200">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <LazyLoadImage 
                        src={company.logo || `https://dvagrllvivewyxolrhsh.supabase.co/storage/v1/object/public/company-logos/logos/${company.company_id}.png`} 
                        alt={`${company.company_name} logo`} 
                        className="w-8 h-8 rounded-md border border-slate-700 object-contain" 
                        effect="blur" 
                        width={32} 
                        height={32} 
                        onError={(e) => {
                          console.warn(`[CompanyLogo] Failed to load: https://dvagrllvivewyxolrhsh.supabase.co/storage/v1/object/public/company-logos/logos/${company.company_id}.png`);
                          e.currentTarget.src = '/placeholder-logo.png';
                        }}
                      />
                      <div>
                        <h4 className="text-sm font-medium text-white">{company.company_name}</h4>
                        {company.tsx_code && <span className="text-xs text-gray-400">TSX: {company.tsx_code}</span>}
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => navigate(`/company/${company.company_id}`)}>
                      View Details
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

// Main component
const CompanyDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { fetchCompaniesByIds, isCompanySelected, toggleCompanySelection } = useFilters();
  const { currentUserSubscriptionTier } = useSubscription();
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMetricCategory, setSelectedMetricCategory] = useState('all');

  const userTier = (currentUserSubscriptionTier as ColumnTier) || 'free';

  useEffect(() => {
    const loadCompany = async () => {
      if (!id || isNaN(Number(id))) {
        setError('Invalid company ID');
        setLoading(false);
        return;
      }
      try {
        const companies = await fetchCompaniesByIds([Number(id)]);
        if (companies.length > 0) {
          setCompany(companies[0]);
        } else {
          setError('Company not found');
        }
      } catch (err) {
        setError('Failed to load company details');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadCompany();
  }, [id, fetchCompaniesByIds]);

  if (loading) {
    return (
      <PageContainer title="Loading..." className="max-w-7xl mx-auto">
        <div className="flex items-center justify-center h-[80vh]">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="relative">
            <Loader2 className="h-12 w-12 text-cyan-400" />
            <motion.div className="absolute inset-0 h-12 w-12 rounded-full border-3 border-cyan-400/20 border-t-cyan-400" 
              animate={{ rotate: -360 }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }} />
          </motion.div>
        </div>
      </PageContainer>
    );
  }

  if (error || !company) {
    return (
      <PageContainer title="Error" className="max-w-7xl mx-auto">
        <motion.div className="flex flex-col items-center justify-center h-[80vh] gap-4" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}>
          <motion.div animate={{ y: [0, -8, 0], rotate: [0, -5, 5, 0] }} transition={{ duration: 2, repeat: Infinity }}>
            <AlertCircle className="h-16 w-16 text-red-400" />
          </motion.div>
          <div className="text-center">
            <h2 className="text-xl font-bold text-red-400 mb-2">{error || 'Company not found'}</h2>
            <p className="text-gray-400 mb-4">The company you're looking for doesn't exist or couldn't be loaded.</p>
          </div>
          <Button onClick={() => navigate('/companies')} variant="outline" className="group">
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            Back to Companies
          </Button>
        </motion.div>
      </PageContainer>
    );
  }

  const isFavorite = isCompanySelected(company.company_id);

  // Enhanced metric categories with fixed Calculator icon
  const metricCategories = [
    {
      id: 'overview',
      title: 'Company Overview',
      icon: <Building2 className="w-4 h-4" />,
      gradient: 'from-cyan-500/20 to-blue-500/20',
      metrics: [
        { key: 'description', label: 'Description', value: company.description, format: 'text' as const, icon: <FileText className="w-3 h-3 text-cyan-400" />, fullWidth: true, tier: 'free' },
        { key: 'minerals', label: 'Minerals of Interest', value: company.minerals_of_interest?.join(', ') || 'None specified', format: 'text' as const, icon: <Gem className="w-3 h-3 text-purple-400" />, tier: 'free' },
        { key: 'percent_gold', label: 'Gold %', value: company.percent_gold, format: 'percent' as const, icon: <Gem className="w-3 h-3 text-yellow-400" />, benchmark: { good: 80, bad: 20 }, isGoodWhenHigh: true, tier: 'free' },
        { key: 'percent_silver', label: 'Silver %', value: company.percent_silver, format: 'percent' as const, icon: <Gem className="w-3 h-3 text-gray-400" />, benchmark: { good: 60, bad: 10 }, isGoodWhenHigh: true, tier: 'free' },
      ]
    },
    {
      id: 'financials',
      title: 'Financial Metrics',
      icon: <DollarSign className="w-4 h-4" />,
      gradient: 'from-green-500/20 to-emerald-500/20',
      metrics: [
        { key: 'revenue', label: 'Revenue', value: company.financials?.revenue_value, format: 'currency' as const, currency: 'CAD', tier: 'pro', icon: <TrendingUp className="w-3 h-3 text-green-400" />, description: 'Total annual revenue from operations', trend: 8.5, sparklineData: [80, 85, 82, 90, 95, 92, 98] },
        { key: 'net_income', label: 'Net Income', value: company.financials?.net_income_value, format: 'currency' as const, currency: 'CAD', tier: 'pro', icon: <DollarSign className="w-3 h-3 text-emerald-400" />, description: 'Net profit after all expenses', trend: -3.2 },
        { key: 'free_cash_flow', label: 'Free Cash Flow', value: company.financials?.free_cash_flow, format: 'currency' as const, currency: 'CAD', tier: 'pro', icon: <Wallet className="w-3 h-3 text-blue-400" />, description: 'Cash generated after capital expenditures', benchmark: { good: 50000000, bad: -10000000 }, isGoodWhenHigh: true },
        { key: 'ebitda', label: 'EBITDA', value: company.financials?.ebitda, format: 'currency' as const, currency: 'CAD', tier: 'pro', icon: <BarChart2 className="w-3 h-3 text-purple-400" />, description: 'Earnings before interest, taxes, depreciation, and amortization' },
        { key: 'debt', label: 'Total Debt', value: company.financials?.debt_value, format: 'currency' as const, currency: 'CAD', tier: 'pro', icon: <CreditCard className="w-3 h-3 text-red-400" />, description: 'Total outstanding debt obligations', benchmark: { good: 10000000, bad: 100000000 }, isGoodWhenHigh: false },
        { key: 'gross_profit', label: 'Gross Profit', value: company.financials?.gross_profit, format: 'currency' as const, currency: 'CAD', tier: 'pro', icon: <DollarSign className="w-3 h-3 text-cyan-400" />, description: 'Revenue minus cost of goods sold' },
      ]
    },
    {
      id: 'valuation',
      title: 'Valuation Metrics',
      icon: <BarChart3 className="w-4 h-4" />,
      gradient: 'from-purple-500/20 to-pink-500/20',
      metrics: [
        { key: 'ev_ebitda', label: 'EV/EBITDA', value: company.financials?.enterprise_to_ebitda, format: 'ratio' as const, tier: 'premium', icon: <TrendingUp className="w-3 h-3 text-purple-400" />, description: 'Enterprise value to EBITDA ratio', benchmark: { good: 8, bad: 20 }, isGoodWhenHigh: false },
        { key: 'pe_ratio', label: 'P/E Ratio', value: company.financials?.trailing_pe, format: 'ratio' as const, tier: 'premium', icon: <Activity className="w-3 h-3 text-blue-400" />, description: 'Price to earnings ratio', benchmark: { good: 15, bad: 40 }, isGoodWhenHigh: false },
        { key: 'pb_ratio', label: 'Price to Book', value: company.financials?.price_to_book, format: 'ratio' as const, tier: 'premium', icon: <BookOpen className="w-3 h-3 text-green-400" />, description: 'Market price relative to book value', benchmark: { good: 1, bad: 3 }, isGoodWhenHigh: false },
        { key: 'peg_ratio', label: 'PEG Ratio', value: company.financials?.peg_ratio, format: 'ratio' as const, tier: 'premium', icon: <Activity className="w-3 h-3 text-orange-400" />, description: 'P/E ratio adjusted for growth', benchmark: { good: 1, bad: 2 }, isGoodWhenHigh: false },
        { key: 'ev_resource', label: 'EV/Resource oz', value: company.valuation_metrics?.ev_per_resource_oz_all, format: 'currency' as const, currency: 'CAD', tier: 'premium', icon: <Scale className="w-3 h-3 text-cyan-400" />, description: 'Enterprise value per resource ounce', benchmark: { good: 50, bad: 200 }, isGoodWhenHigh: false },
        { key: 'mc_production', label: 'MC/Production oz', value: company.valuation_metrics?.mkt_cap_per_production_oz, format: 'currency' as const, currency: 'CAD', tier: 'premium', icon: <Factory className="w-3 h-3 text-pink-400" />, description: 'Market cap per production ounce' },
        { key: 'mkt_cap_per_resource_oz_all', label: 'MC/Resource oz', value: company.valuation_metrics?.mkt_cap_per_resource_oz_all, format: 'currency' as const, currency: 'CAD', tier: 'premium', icon: <Scale className="w-3 h-3 text-cyan-400" />, description: 'Market cap per resource ounce' },
        { key: 'ev_per_mineable_oz_precious', label: 'EV/Mineable oz Precious', value: company.valuation_metrics?.ev_per_mineable_oz_precious, format: 'currency' as const, currency: 'CAD', tier: 'premium', icon: <Gem className="w-3 h-3 text-yellow-400" />, description: 'Enterprise value per mineable precious ounce', benchmark: { good: 100, bad: 300 }, isGoodWhenHigh: false },
        { key: 'mkt_cap_per_mineable_oz', label: 'MC/Mineable oz', value: company.valuation_metrics?.mkt_cap_per_mineable_oz, format: 'currency' as const, currency: 'CAD', tier: 'premium', icon: <Scale className="w-3 h-3 text-purple-400" />, description: 'Market cap per mineable ounce' },
      ]
    },
    {
      id: 'resources',
      title: 'Production & Resources',
      icon: <Mountain className="w-4 h-4" />,
      gradient: 'from-yellow-500/20 to-orange-500/20',
      metrics: [
        { key: 'current_production', label: 'Current Production', value: company.production?.current_production_total_aueq_koz, format: 'koz' as const, tier: 'pro', icon: <Factory className="w-3 h-3 text-yellow-400" />, description: 'Annual gold-equivalent production', trend: 5.8 },
        { key: 'reserves', label: 'Reserves', value: company.mineral_estimates?.reserves_total_aueq_moz, format: 'moz' as const, tier: 'pro', icon: <Shield className="w-3 h-3 text-green-400" />, description: 'Proven and probable reserves', benchmark: { good: 5, bad: 1 }, isGoodWhenHigh: true },
        { key: 'mi_resources', label: 'M&I Resources', value: company.mineral_estimates?.measured_indicated_total_aueq_moz, format: 'moz' as const, tier: 'pro', icon: <Layers className="w-3 h-3 text-blue-400" />, description: 'Measured and indicated resources', benchmark: { good: 10, bad: 2 }, isGoodWhenHigh: true },
        { key: 'total_resources', label: 'Total Resources', value: company.mineral_estimates?.resources_total_aueq_moz, format: 'moz' as const, tier: 'pro', icon: <Mountain className="w-3 h-3 text-purple-400" />, description: 'All resource categories combined' },
        { key: 'reserve_life', label: 'Reserve Life', value: company.production?.reserve_life_years, format: 'years' as const, tier: 'pro', icon: <Timer className="w-3 h-3 text-orange-400" />, description: 'Years of production at current rates', benchmark: { good: 10, bad: 3 }, isGoodWhenHigh: true },
        { key: 'future_production', label: 'Future Production', value: company.production?.future_production_total_aueq_koz, format: 'koz' as const, tier: 'pro', icon: <Rocket className="w-3 h-3 text-cyan-400" />, description: 'Projected annual production' },
        { key: 'mineable_total_aueq_moz', label: 'Mineable Total', value: company.mineral_estimates?.mineable_total_aueq_moz, format: 'moz' as const, tier: 'premium', icon: <Pickaxe className="w-3 h-3 text-cyan-400" />, description: 'Total mineable gold-equivalent ounces' },
      ]
    },
    {
      id: 'costs',
      title: 'Operating Costs',
      icon: <Coins className="w-4 h-4" />,
      gradient: 'from-red-500/20 to-pink-500/20',
      metrics: [
        { key: 'aisc_last_year', label: 'AISC (Last Year)', value: company.costs?.aisc_last_year, format: 'currency' as const, currency: 'CAD', tier: 'pro', icon: <Coins className="w-3 h-3 text-red-400" />, description: 'All-in sustaining cost per ounce', benchmark: { good: 1200, bad: 1800 }, isGoodWhenHigh: false },
        { key: 'aisc_last_quarter', label: 'AISC (Last Quarter)', value: company.costs?.aisc_last_quarter, format: 'currency' as const, currency: 'CAD', tier: 'pro', icon: <Activity className="w-3 h-3 text-orange-400" />, description: 'Recent quarterly AISC', trend: -2.5 },
        { key: 'aisc_future', label: 'Future AISC', value: company.costs?.aisc_future, format: 'currency' as const, currency: 'CAD', tier: 'premium', icon: <Target className="w-3 h-3 text-purple-400" />, description: 'Projected all-in sustaining cost' },
        { key: 'construction_costs', label: 'Construction Costs', value: company.costs?.construction_costs, format: 'currency' as const, currency: 'CAD', tier: 'premium', icon: <Hammer className="w-3 h-3 text-blue-400" />, description: 'Capital costs for new projects' },
        { key: 'tco_current', label: 'Current TCO', value: company.costs?.tco_current, format: 'currency' as const, currency: 'CAD', tier: 'premium', icon: <DollarSign className="w-3 h-3 text-cyan-400" />, description: 'Total cash cost current' },
      ]
    },
    {
      id: 'capital',
      title: 'Capital Structure',
      icon: <Briefcase className="w-4 h-4" />,
      gradient: 'from-indigo-500/20 to-purple-500/20',
      metrics: [
        { key: 'shares_outstanding', label: 'Shares Outstanding', value: company.financials?.shares_outstanding, format: 'number' as const, tier: 'free', icon: <Hash className="w-3 h-3 text-indigo-400" />, description: 'Total shares issued' },
        { key: 'fully_diluted', label: 'Fully Diluted Shares', value: company.capital_structure?.fully_diluted_shares, format: 'number' as const, tier: 'pro', icon: <Layers className="w-3 h-3 text-purple-400" />, description: 'Including all potential shares' },
        { key: 'debt_equity', label: 'Debt/Equity', value: company.financials?.debt_value && company.financials?.market_cap_value ? company.financials.debt_value / company.financials.market_cap_value : null, format: 'percent' as const, tier: 'pro', icon: <Scale className="w-3 h-3 text-red-400" />, description: 'Debt to equity ratio', benchmark: { good: 0.3, bad: 1.5 }, isGoodWhenHigh: false },
        { key: 'net_assets', label: 'Net Financial Assets', value: company.financials?.net_financial_assets, format: 'currency' as const, currency: 'CAD', tier: 'pro', icon: <Wallet className="w-3 h-3 text-green-400" />, description: 'Total assets minus liabilities' },
        { key: 'in_the_money_options', label: 'In-the-Money Options', value: company.capital_structure?.in_the_money_options, format: 'number' as const, tier: 'premium', icon: <Star className="w-3 h-3 text-yellow-400" />, description: 'Stock options exercisable at current price' },
      ]
    }
  ];

  const filteredCategories = selectedMetricCategory === 'all' ? metricCategories : metricCategories.filter(cat => cat.id === selectedMetricCategory);
  const relatedCompanyIds = company.related_company_ids || [];

  return (
    <PageContainer title="" className="max-w-7xl mx-auto">
      <motion.div className="flex items-center gap-2 text-xs text-gray-400 mb-4 sticky top-0 z-10 bg-slate-900/80 backdrop-blur-sm py-2" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
        <Button variant="ghost" size="sm" onClick={() => navigate('/companies')} className="hover:text-white">
          <ArrowLeft className="w-3 h-3 mr-1" />
          Companies
        </Button>
        <ChevronRight className="w-3 h-3" />
        <span className="text-white font-medium">{company.company_name}</span>
      </motion.div>

      <HeroSection company={company} isFavorite={isFavorite} onToggleFavorite={() => toggleCompanySelection(company.company_id)} />

      <KeyMetricsOverview company={company} />

      <motion.div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2 sticky top-12 z-10 bg-slate-900/80 backdrop-blur-sm" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Button variant={selectedMetricCategory === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setSelectedMetricCategory('all')} className="whitespace-nowrap text-xs px-3 py-1">
          All Metrics
        </Button>
        {metricCategories.map(cat => (
          <Button key={cat.id} variant={selectedMetricCategory === cat.id ? 'default' : 'outline'} size="sm" onClick={() => setSelectedMetricCategory(cat.id)} className="whitespace-nowrap text-xs px-3 py-1">
            {cat.icon}
            <span className="ml-1">{cat.title}</span>
          </Button>
        ))}
      </motion.div>

      <div className="space-y-6">
        {filteredCategories.map((category, categoryIndex) => (
          <motion.div key={category.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: categoryIndex * 0.08 }}>
            <Card className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-slate-700/50 overflow-hidden">
              <CardHeader className="relative py-3">
                <motion.div className={cn("absolute inset-0 opacity-10 bg-gradient-to-r", category.gradient)} />
                <CardTitle className="relative z-10 text-lg font-bold text-white flex items-center gap-2">
                  <motion.div className="p-1.5 rounded-md bg-slate-700/50" whileHover={{ scale: 1.1 }}>{category.icon}</motion.div>
                  {category.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {category.metrics.map((metric, index) => (
                    <MetricCard 
                      key={metric.key} 
                      label={metric.label} 
                      value={metric.value} 
                      format={metric.format} 
                      tier={metric.tier} 
                      userTier={userTier} 
                      icon={metric.icon} 
                      description={metric.description} 
                      benchmark={metric.benchmark} 
                      isGoodWhenHigh={metric.isGoodWhenHigh} 
                      trend={metric.trend} 
                      sparklineData={metric.sparklineData} 
                      category={category.title} 
                      delay={categoryIndex * 0.08 + index * 0.04} 
                      fullWidth={metric.fullWidth} 
                      currency={metric.currency || 'USD'}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <RelatedCompanies relatedCompanyIds={relatedCompanyIds} />

      {userTier === 'free' && (
        <motion.div className="mt-8" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="relative overflow-hidden bg-gradient-to-br from-cyan-500/10 via-purple-500/10 to-pink-500/10 border-cyan-500/20">
            <motion.div className="absolute inset-0 opacity-20" 
              animate={{ background: ['radial-gradient(circle at 0% 50%, rgba(6, 182, 212, 0.3), transparent 50%)', 'radial-gradient(circle at 100% 50%, rgba(139, 92, 246, 0.3), transparent 50%)'] }} 
              transition={{ duration: 8, repeat: Infinity }} />
            <CardContent className="relative z-10 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <motion.div animate={{ rotate: [0, 8, -8, 0], scale: [1, 1.05, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>
                      <Crown className="w-6 h-6 text-yellow-400" />
                    </motion.div>
                    <h3 className="text-xl font-bold text-white">Unlock Full Company Analysis</h3>
                  </div>
                  <p className="text-gray-300 text-sm mb-3 max-w-lg">Access all financial metrics, advanced valuations, cost analysis, and exclusive insights with our Pro or Premium plans.</p>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <div className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-green-400" /><span>100+ Advanced Metrics</span></div>
                    <div className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-green-400" /><span>Real-time Updates</span></div>
                    <div className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-green-400" /><span>Export Data</span></div>
                  </div>
                </div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button size="lg" onClick={() => navigate('/subscribe')} className="bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 text-white font-bold px-6 py-4 text-sm">
                    <Sparkles className="w-4 h-4 mr-1" />
                    Upgrade Now
                  </Button>
                </motion.div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <motion.div className="fixed bottom-6 right-6 flex flex-col gap-2" initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }}>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <motion.button className="p-3 rounded-full bg-slate-800 text-white shadow-lg hover:bg-slate-700" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} 
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                <ArrowUpRight className="w-4 h-4" />
              </motion.button>
            </TooltipTrigger>
            <TooltipContent side="left"><p>Back to top</p></TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </motion.div>
    </PageContainer>
  );
};

export default CompanyDetailPage;