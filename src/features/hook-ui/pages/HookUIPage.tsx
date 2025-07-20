// src/features/hook-ui/pages/HookUIPage.tsx
import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LazyLoadComponent } from 'react-lazy-load-image-component';
import { toast } from 'react-hot-toast';
import { getPaginatedCompanies } from '../../../lib/supabase';
import { Settings, Sparkles, TrendingUp, Trophy, Zap, Target, ChevronRight, RefreshCw, Home, ArrowRight, AlertCircle } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../../../components/ui/button';
import { LoadingIndicator } from '../../../components/ui/loading-indicator';
import { arrayUtils, cn, formatCurrency, formatPercent } from '../lib/utils';
import type { PlayingCardDisplayData, InterestProfile, RiskProfile, Achievement } from '../types/hook-ui-types';
import { interestProfiles as allInterestProfiles } from '../lib/interest-profiles-config';
import { getEnhancedMatchedCompanies, isEnhancedMatchingAvailable, type EnhancedCompanyMatch } from '../lib/enhanced-company-matcher';
import type { Company } from '../../../lib/types';
import confetti from 'canvas-confetti';
import PlayingCard from '../components/PlayingCard';
import useOptionalFilters from '../../../hooks/useOptionalFilters';

// Lazy-loaded components
const EnhancedInterestSelector = React.lazy(() => import('../components/onboarding/EnhancedInterestSelector'));
const EnhancedRiskProfileSelector = React.lazy(() => import('../components/onboarding/EnhancedRiskProfileSelector'));
const EnhancedProfilePreview = React.lazy(() => import('../components/onboarding/EnhancedProfilePreview'));

// Debug configuration
const DEBUG_ENABLED = true;

const debugLog = (message: string, data?: any) => {
  if (DEBUG_ENABLED) {
    console.log(`[HookUIPage] ${message}`, data);
  }
};

// Types
type OnboardingStage = 'welcome' | 'interestSelection' | 'riskProfile' | 'preview' | 'showcase';

interface ProgressStage {
  id: OnboardingStage;
  label: string;
  icon: React.ReactNode;
}

// Custom hook for confetti
const useConfetti = () => {
  const triggerConfetti = useCallback(() => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#06b6d4', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b'],
      zIndex: 9999,
    });
  }, []);

  return triggerConfetti;
};

// Enhanced Progress Indicator
const EnhancedProgressIndicator: React.FC<{ currentStage: OnboardingStage; setCurrentStage: (stage: OnboardingStage) => void }> = ({ currentStage, setCurrentStage }) => {
  const stages: ProgressStage[] = [
    { id: 'welcome', label: 'Welcome', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'interestSelection', label: 'Interests', icon: <Target className="w-4 h-4" /> },
    { id: 'riskProfile', label: 'Profile', icon: <Zap className="w-4 h-4" /> },
    { id: 'preview', label: 'Review', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'showcase', label: 'Results', icon: <Trophy className="w-4 h-4" /> },
  ];
  const currentIndex = stages.findIndex((s) => s.id === currentStage);

  return (
    <motion.nav
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex justify-center items-center mb-8 relative"
      role="navigation"
      aria-label="Onboarding Progress"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-pink-500/10 blur-3xl -z-10" />
      {stages.map((stage, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;

        return (
          <React.Fragment key={stage.id}>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: index * 0.1, type: 'spring', stiffness: 200 }}
              className="flex flex-col items-center"
            >
              <motion.div
                className={cn(
                  'w-12 h-12 rounded-full flex items-center justify-center relative transform transition-transform duration-300 cursor-pointer',
                  isCurrent
                    ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white shadow-lg shadow-cyan-500/50 scale-110'
                    : isCompleted
                    ? 'bg-cyan-600 text-white'
                    : 'bg-slate-700 text-slate-400'
                )}
                animate={isCurrent ? { scale: [1, 1.1, 1] } : {}}
                transition={{ repeat: isCurrent ? Infinity : 0, duration: 2 }}
                role="button"
                tabIndex={0}
                aria-label={`${stage.label} ${isCurrent ? 'Current' : isCompleted ? 'Completed' : 'Not Started'}`}
                onClick={() => setCurrentStage(stage.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setCurrentStage(stage.id);
                  }
                }}
              >
                {isCompleted ? <Trophy className="w-5 h-5" /> : stage.icon}
                {isCurrent && (
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-cyan-400 animate-pulse"
                    animate={{ scale: [1, 1.2], opacity: [1, 0] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                  />
                )}
              </motion.div>
              <span
                className={cn(
                  'mt-2 text-xs font-medium',
                  isCurrent ? 'text-cyan-400' : isCompleted ? 'text-cyan-500' : 'text-slate-300'
                )}
              >
                {stage.label}
              </span>
            </motion.div>
            {index < stages.length - 1 && (
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: index * 0.1 + 0.2, duration: 0.3 }}
                className="relative w-16 h-1 mx-2"
                style={{ originX: 0 }}
              >
                <div className={cn('absolute inset-0 rounded-full', isCompleted ? 'bg-cyan-500' : 'bg-slate-700')} />
                {isCompleted && (
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-purple-400 rounded-full"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ delay: 0.5, duration: 0.5 }}
                    style={{ originX: 0 }}
                  />
                )}
              </motion.div>
            )}
          </React.Fragment>
        );
      })}
    </motion.nav>
  );
};

// Main component
const HookUIPage: React.FC = () => {
  const navigate = useNavigate();
  const filters = useOptionalFilters();

  // Use global favorites if available, otherwise use local state
  const [localFavorites, setLocalFavorites] = useState<Set<number>>(() => {
    // Load from localStorage if no global context
    if (!filters) {
      const saved = localStorage.getItem('hookui_favorites');
      if (saved) {
        try {
          return new Set(JSON.parse(saved));
        } catch {
          return new Set();
        }
      }
    }
    return new Set();
  });

  // Save local favorites to localStorage
  useEffect(() => {
    if (!filters) {
      localStorage.setItem('hookui_favorites', JSON.stringify(Array.from(localFavorites)));
    }
  }, [localFavorites, filters]);

  const toggleFavorite = (companyId: number) => {
    if (filters) {
      // Use global toggle
      filters.toggleCompanySelection(companyId);
      toast.success(filters.isCompanySelected(companyId) ? 'Removed from favorites' : 'Added to favorites');
    } else {
      // Use local toggle
      setLocalFavorites(prev => {
        const newSet = new Set(prev);
        if (newSet.has(companyId)) {
          newSet.delete(companyId);
          toast.success('Removed from favorites');
        } else {
          newSet.add(companyId);
          toast.success('Added to favorites');
        }
        return newSet;
      });
    }
  };

  const isFavorite = (companyId: number): boolean => {
    if (filters) {
      return filters.isCompanySelected(companyId);
    }
    return localFavorites.has(companyId);
  };

  const [currentStage, setCurrentStage] = useState<OnboardingStage>('welcome');
  const [selectedInterestIds, setSelectedInterestIds] = useState<{ id: string; weight: number }[]>([]);
  const [riskProfile, setRiskProfile] = useState<RiskProfile | null>(null);
  const [companiesToShow, setCompaniesToShow] = useState<EnhancedCompanyMatch[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [metricRanges, setMetricRanges] = useState<{ marketCap: { min: number; max: number }; scoreForPrimaryInterest: { min: number; max: number } } | null>(null);
  const [isConfigPanelOpen, setIsConfigPanelOpen] = useState(false);
  const [showMatchDetails, setShowMatchDetails] = useState<boolean>(true);
  const [achievements, setAchievements] = useState<Achievement[]>([
    { id: 'first_selection', title: 'First Steps', description: 'Selected your first interest', icon: <Target className="w-5 h-5" />, unlocked: false },
    { id: 'risk_taker', title: 'Risk Taker', description: 'Set risk tolerance above 75%', icon: <Zap className="w-5 h-5" />, unlocked: false },
    { id: 'diversified', title: 'Diversified', description: 'Selected 3+ interests', icon: <TrendingUp className="w-5 h-5" />, unlocked: false },
    { id: 'perfect_match', title: 'Perfect Match', description: 'Found a 90%+ match', icon: <Trophy className="w-5 h-5" />, unlocked: false },
  ]);
  const triggerConfetti = useConfetti();

  // Robust fetch and process companies function
  const fetchAndProcessCompanies = useCallback(
    async () => {
      setIsLoading(true);
      setError(null);
      debugLog('Starting FULL database fetch and matching process', {
        selectedInterests: selectedInterestIds.length,
        hasRiskProfile: !!riskProfile,
      });

      try {
        if (!selectedInterestIds.length || !riskProfile) {
          throw new Error('Please select interests and complete your profile before proceeding.');
        }

        const pageSize = 100;
        const { companies: firstPageCompanies, totalCount } = await getPaginatedCompanies(
          1,
          pageSize,
          { key: 'company_id', direction: 'asc' },
          {},
          'USD'
        );

        if (!totalCount) {
          throw new Error('No companies were found in the database.');
        }
        
        debugLog(`Initial fetch complete. Total companies to fetch: ${totalCount}`);
        let allCompanies: Company[] = [...firstPageCompanies];

        const totalPages = Math.ceil(totalCount / pageSize);
        if (totalPages > 1) {
          const pagePromises: Promise<{ companies: Company[] }>[] = [];
          for (let page = 2; page <= totalPages; page++) {
            pagePromises.push(
              getPaginatedCompanies(page, pageSize, { key: 'company_id', direction: 'asc' }, {}, 'USD')
            );
          }

          const remainingPagesResults = await Promise.all(pagePromises);
          remainingPagesResults.forEach(result => {
            allCompanies.push(...result.companies);
          });
        }
        
        debugLog(`Fetch complete. Total companies in memory: ${allCompanies.length}`);
        
        if (allCompanies.length < totalCount) {
            console.warn(`[HookUIPage] Mismatch: Expected ${totalCount} but fetched ${allCompanies.length}`);
        }

        const shuffledCompanies = arrayUtils.shuffle(allCompanies);
        debugLog('Shuffled the COMPLETE company list.');

        let matchedCompanies: EnhancedCompanyMatch[] = getEnhancedMatchedCompanies(
          shuffledCompanies,
          selectedInterestIds,
          riskProfile,
          allInterestProfiles,
          20
        );
        
        debugLog('Enhanced matching completed on the full dataset.', { resultCount: matchedCompanies.length });

        if (!matchedCompanies.length) {
          throw new Error('No companies could be matched to your profile. Please try adjusting your preferences.');
        }

        matchedCompanies = matchedCompanies
          .sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0))
          .map((company, index) => ({ ...company, rankPosition: index + 1 }));

        debugLog('Final sorted companies', {
          companyOrder: matchedCompanies.map(c => ({ name: c.name, matchScore: c.matchScore, rank: c.rankPosition }))
        });

        setCompaniesToShow(matchedCompanies);

        setMetricRanges({
          marketCap: {
            min: Math.min(...matchedCompanies.map((c) => c.marketCap || 0)),
            max: Math.max(...matchedCompanies.map((c) => c.marketCap || 0)),
          },
          scoreForPrimaryInterest: {
            min: Math.min(...matchedCompanies.map((c) => c.matchScore || 0)),
            max: Math.max(...matchedCompanies.map((c) => c.matchScore || 0)),
          },
        });

        const topMatch = matchedCompanies[0];
        toast.success(
          `Found ${matchedCompanies.length} companies! Top match: ${topMatch.name} (${topMatch.matchScore}% match)`,
          { duration: 4000, icon: '🎯' }
        );

        debugLog('Company processing completed successfully', {
          finalCount: matchedCompanies.length,
          topScore: topMatch.matchScore,
          averageScore: Math.round(matchedCompanies.reduce((sum, c) => sum + (c.matchScore || 0), 0) / matchedCompanies.length)
        });

      } catch (err: any) {
        const errorMessage = err.message || 'Failed to fetch or process companies';
        debugLog('Error in company processing', { error: errorMessage, stack: err.stack });
        setError(errorMessage);
        toast.error(errorMessage, { duration: 5000 });
      } finally {
        setIsLoading(false);
      }
    },
    [selectedInterestIds, riskProfile]
  );

  // Enhanced sorting and filtering functions
  const enhancedSortFunctions = {
    byMatchScore: () => {
      setCompaniesToShow((prev) => {
        const sorted = [...prev]
          .sort((a, b) => {
            const scoreDiff = (b.matchScore || 0) - (a.matchScore || 0);
            return scoreDiff !== 0 ? scoreDiff : Math.random() * 2 - 1;
          })
          .map((company, index) => ({
            ...company,
            rankPosition: index + 1
          }));
        debugLog('Sorted by match score', {
          companyOrder: sorted.map(c => ({ name: c.name, matchScore: c.matchScore }))
        });
        toast.success('Sorted by match score (best matches first)', { icon: '🎯' });
        return sorted;
      });
    },
    byMarketCap: () => {
      setCompaniesToShow((prev) => {
        const sorted = [...prev]
          .sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0))
          .map((company, index) => ({
            ...company,
            rankPosition: index + 1
          }));
        debugLog('Sorted by market cap', {
          companyOrder: sorted.map(c => ({ name: c.name, marketCap: c.marketCap }))
        });
        toast.success('Sorted by market cap (largest first)', { icon: '💰' });
        return sorted;
      });
    },
    byRiskAlignment: () => {
      setCompaniesToShow((prev) => {
        const sorted = [...prev]
          .sort((a, b) => (b.riskAlignment?.score || 0) - (a.riskAlignment?.score || 0))
          .map((company, index) => ({
            ...company,
            rankPosition: index + 1
          }));
        debugLog('Sorted by risk alignment', {
          companyOrder: sorted.map(c => ({ name: c.name, riskAlignmentScore: c.riskAlignment?.score }))
        });
        toast.success('Sorted by risk alignment (best fit first)', { icon: '⚖️' });
        return sorted;
      });
    },
    byFinancialStrength: () => {
      setCompaniesToShow((prev) => {
        const sorted = [...prev]
          .sort((a, b) => (b.financialStrength?.score || 0) - (a.financialStrength?.score || 0))
          .map((company, index) => ({
            ...company,
            rankPosition: index + 1
          }));
        debugLog('Sorted by financial strength', {
          companyOrder: sorted.map(c => ({ name: c.name, financialStrengthScore: c.financialStrength?.score }))
        });
        toast.success('Sorted by financial strength', { icon: '💪' });
        return sorted;
      });
    }
  };

  const enhancedFilterFunctions = {
    topMatches: () => {
      setCompaniesToShow((prev) => {
        const filtered = prev.filter(c => (c.matchScore || 0) >= 70);
        debugLog('Filtered by top matches', {
          companyOrder: filtered.map(c => ({ name: c.name, matchScore: c.matchScore }))
        });
        toast.success('Showing only top matches (70%+ score)', { icon: '⭐' });
        return filtered;
      });
    },
    highRiskAlignment: () => {
      setCompaniesToShow((prev) => {
        const filtered = prev.filter(c => (c.riskAlignment?.score || 0) >= 60);
        debugLog('Filtered by high risk alignment', {
          companyOrder: filtered.map(c => ({ name: c.name, riskAlignmentScore: c.riskAlignment?.score }))
        });
        toast.success('Filtered by high risk alignment', { icon: '🎲' });
        return filtered;
      });
    },
    strongFinancials: () => {
      setCompaniesToShow((prev) => {
        const filtered = prev.filter(c => (c.financialStrength?.score || 0) >= 50);
        debugLog('Filtered by strong financials', {
          companyOrder: filtered.map(c => ({ name: c.name, financialStrengthScore: c.financialStrength?.score }))
        });
        toast.success('Filtered by strong financials', { icon: '💎' });
        return filtered;
      });
    },
    byPreferredMinerals: (mineral: string) => {
      setCompaniesToShow((prev) => {
        const filtered = prev.filter(c => {
          const minerals = c.minerals_of_interest || [];
          return minerals.some(m => m.toLowerCase().includes(mineral.toLowerCase()));
        });
        debugLog(`Filtered by ${mineral} focus`, {
          companyOrder: filtered.map(c => ({ name: c.name, minerals: c.minerals_of_interest }))
        });
        toast.success(`Filtered by ${mineral} focus`, { icon: mineral === 'gold' ? '🥇' : '🥈' });
        return filtered;
      });
    }
  };

  // Effect to trigger company fetching when reaching showcase
  useEffect(() => {
    if (currentStage === 'showcase' && selectedInterestIds.length > 0 && riskProfile) {
      debugLog('Showcase stage reached, triggering company fetch');
      setCompaniesToShow([]);
      fetchAndProcessCompanies();
    }
  }, [currentStage, fetchAndProcessCompanies]);

  // Achievement handling
  const handleAchievement = useCallback(
    (achievementId: string) => {
      setAchievements((prev) =>
        prev.map((a) =>
          a.id === achievementId && !a.unlocked
            ? { ...a, unlocked: true }
            : a
        )
      );

      const achievement = achievements.find((a) => a.id === achievementId);
      if (achievement && !achievement.unlocked) {
        toast(
          <div className="flex items-center gap-3">
            <div className="text-2xl">🏆</div>
            <div>
              <div className="font-bold">Achievement Unlocked!</div>
              <div className="text-sm text-gray-200">{achievement.title}</div>
            </div>
          </div>,
          {
            duration: 3000,
            position: 'top-right',
            style: {
              background: 'linear-gradient(to right, #06b6d4, #8b5cf6)',
              color: '#fff',
              padding: '16px',
              borderRadius: '8px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
            },
          }
        );
        triggerConfetti();
      }
    },
    [achievements, triggerConfetti]
  );

  // Event handlers
  const handleInterestsSelected = useCallback(
    (profiles: { id: string; weight: number }[]) => {
      debugLog('Interests selected by user', { count: profiles.length, profiles });
      setSelectedInterestIds(profiles);

      if (profiles.length === 1) {
        handleAchievement('first_selection');
      }
      if (profiles.length >= 3) {
        handleAchievement('diversified');
      }
    },
    [handleAchievement]
  );

  const handleRiskProfileComplete = useCallback(
    (profile: RiskProfile) => {
      debugLog('Risk profile completed', profile);
      setRiskProfile(profile);
      setCurrentStage('preview');
      if (profile.riskTolerance > 75) {
        handleAchievement('risk_taker');
      }
      triggerConfetti();
    },
    [handleAchievement, triggerConfetti]
  );

  const advanceToInterestSelection = useCallback(() => {
    debugLog('Advancing to interest selection');
    setCurrentStage('interestSelection');
    triggerConfetti();
  }, [triggerConfetti]);

  const advanceToRiskProfile = useCallback(() => {
    if (selectedInterestIds.length > 0) {
      debugLog('Advancing to risk profile stage');
      setCurrentStage('riskProfile');
    } else {
      toast.error('Please select at least one interest to proceed.');
    }
  }, [selectedInterestIds]);

  const advanceToShowcase = useCallback(() => {
    debugLog('Advancing to showcase');
    setCurrentStage('showcase');
    triggerConfetti();
  }, [triggerConfetti]);

  const resetOnboarding = useCallback(() => {
    debugLog('Resetting onboarding process');
    setSelectedInterestIds([]);
    setRiskProfile(null);
    setCompaniesToShow([]);
    setError(null);
    setCurrentStage('welcome');
    setAchievements((prev) => prev.map((a) => ({ ...a, unlocked: false })));
    setLocalFavorites(new Set());
    toast.success('Onboarding reset. Start fresh!');
  }, []);

  const checkPerfectMatch = useCallback(() => {
    const hasPerfectMatch = companiesToShow.some(
      (company) => (company.matchScore || 0) >= 90
    );
    if (hasPerfectMatch) {
      handleAchievement('perfect_match');
    }
  }, [companiesToShow, handleAchievement]);

  useEffect(() => {
    if (currentStage === 'showcase' && companiesToShow.length > 0) {
      checkPerfectMatch();
    }
  }, [currentStage, companiesToShow, checkPerfectMatch]);

  // Enhanced showcase rendering with robust error handling
  const renderEnhancedShowcase = () => (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Mobile controls button */}
      <Button
        onClick={() => setIsConfigPanelOpen(!isConfigPanelOpen)}
        variant="outline"
        className="lg:hidden fixed bottom-4 right-4 z-[60] bg-slate-800 border-slate-600 p-2 h-auto shadow-lg"
        aria-label="Toggle Configuration Panel"
      >
        <Settings size={20} />
      </Button>

      {/* Configuration Panel */}
      <AnimatePresence>
        {isConfigPanelOpen && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.3 }}
            className="fixed inset-y-0 right-0 w-full sm:w-96 bg-slate-800/95 backdrop-blur-md p-6 shadow-2xl z-50 overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-cyan-400">Match Controls</h3>
              <Button
                onClick={() => setIsConfigPanelOpen(false)}
                variant="ghost"
                className="text-slate-400 hover:text-white"
                aria-label="Close Configuration Panel"
              >
                ✕
              </Button>
            </div>

            {/* Match details toggle */}
            <div className="mb-6">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showMatchDetails}
                  onChange={(e) => {
                    setShowMatchDetails(e.target.checked);
                    toast.success(e.target.checked ? 'Match details enabled' : 'Match details hidden');
                  }}
                  className="w-4 h-4 text-cyan-500 rounded focus:ring-cyan-500"
                />
                <span className="text-slate-200">Show match explanations</span>
              </label>
            </div>

            {/* Sorting options */}
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-purple-400 mb-3">Sort Results</h4>
              <div className="space-y-2">
                <Button
                  onClick={enhancedSortFunctions.byMatchScore}
                  variant="outline"
                  className="w-full justify-start border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  🎯 Best Matches First
                </Button>
                <Button
                  onClick={enhancedSortFunctions.byRiskAlignment}
                  variant="outline"
                  className="w-full justify-start border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  ⚖️ Risk Alignment
                </Button>
                <Button
                  onClick={enhancedSortFunctions.byFinancialStrength}
                  variant="outline"
                  className="w-full justify-start border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  💪 Financial Strength
                </Button>
                <Button
                  onClick={enhancedSortFunctions.byMarketCap}
                  variant="outline"
                  className="w-full justify-start border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  💰 Market Cap
                </Button>
              </div>
            </div>

            {/* Filtering options */}
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-pink-400 mb-3">Filter Results</h4>
              <div className="space-y-2">
                <Button
                  onClick={enhancedFilterFunctions.topMatches}
                  variant="outline"
                  className="w-full justify-start border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  ⭐ Top Matches Only (70%+)
                </Button>
                <Button
                  onClick={enhancedFilterFunctions.highRiskAlignment}
                  variant="outline"
                  className="w-full justify-start border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  🎲 High Risk Alignment
                </Button>
                <Button
                  onClick={enhancedFilterFunctions.strongFinancials}
                  variant="outline"
                  className="w-full justify-start border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  💎 Strong Financials
                </Button>
                {riskProfile?.preferredMinerals?.filter(m => ['gold', 'silver'].includes(m)).map(mineral => (
                  <Button
                    key={mineral}
                    onClick={() => enhancedFilterFunctions.byPreferredMinerals(mineral)}
                    variant="outline"
                    className="w-full justify-start border-slate-600 text-slate-300 hover:bg-slate-700"
                  >
                    {mineral === 'gold' ? '🥇' : '🥈'} {mineral.charAt(0).toUpperCase() + mineral.slice(1)} Focus
                  </Button>
                ))}
              </div>
            </div>

            {/* Reset and refresh */}
            <div className="space-y-2">
              <Button
                onClick={() => {
                  fetchAndProcessCompanies();
                  toast.success('Results refreshed with latest data');
                }}
                variant="outline"
                className="w-full flex items-center justify-center gap-2 border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                <RefreshCw size={16} />
                Refresh Results
              </Button>
              <Button
                onClick={() => {
                  setCompaniesToShow([]);
                  setLocalFavorites(new Set());
                  fetchAndProcessCompanies();
                  toast.success('Reset all filters and refreshed');
                }}
                variant="outline"
                className="w-full border-red-600 text-red-400 hover:bg-red-900/20"
              >
                Reset All Filters
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header section */}
      <header className="mb-8 text-center">
        <motion.h1
          className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent animate-gradient"
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
        >
          Your Top {companiesToShow.length} Precious Metals Matches
        </motion.h1>

        {selectedInterestIds.length > 0 && riskProfile && companiesToShow.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-slate-200">
              Matched to your {selectedInterestIds.map(si => allInterestProfiles.find(p => p.id === si.id)?.name).filter(Boolean).join(', ')} interests
              {' '}and {formatPercent(riskProfile.riskTolerance / 100, { decimals: 0 })} risk tolerance
            </p>
            <div className="flex justify-center gap-4 text-sm flex-wrap">
              <span className="px-3 py-1 bg-green-500/20 rounded-full text-green-400">
                🎯 Avg Match: {Math.round(companiesToShow.reduce((sum, c) => sum + (c.matchScore || 0), 0) / companiesToShow.length)}%
              </span>
              <span className="px-3 py-1 bg-blue-500/20 rounded-full text-blue-400">
                💰 Range: ${formatCurrency(Math.min(...companiesToShow.map(c => c.marketCap || 0)), { decimals: 1 })} - ${formatCurrency(Math.max(...companiesToShow.map(c => c.marketCap || 0)), { decimals: 1 })}
              </span>
              <span className="px-3 py-1 bg-purple-500/20 rounded-full text-purple-400">
                📊 {companiesToShow.length} Companies
              </span>
            </div>
          </div>
        )}

        <div className="flex justify-center gap-4 mt-4 flex-wrap">
          <Button
            onClick={() => setIsConfigPanelOpen(!isConfigPanelOpen)}
            variant="outline"
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            <Settings size={16} className="mr-2" />
            Sort & Filter
          </Button>
          <Button
            onClick={resetOnboarding}
            variant="outline"
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            Start Over
          </Button>
        </div>
      </header>

      {/* Results display with robust error handling */}
      {isLoading ? (
        <LoadingIndicator message="Finding your perfect matches using advanced algorithms..." />
      ) : error ? (
        <div className="text-center py-10">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <p className="text-xl text-red-400 mb-2">Oops! Something went wrong</p>
          <p className="text-slate-300 mb-4 max-w-md mx-auto">{error}</p>
          <div className="space-x-4">
            <Button
              onClick={() => {
                setError(null);
                fetchAndProcessCompanies();
              }}
              variant="outline"
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              <RefreshCw size={16} className="mr-2" />
              Try Again
            </Button>
            <Button
              onClick={() => setCurrentStage('interestSelection')}
              variant="outline"
              className="border-cyan-600 text-cyan-400 hover:bg-cyan-900/20"
            >
              Adjust Preferences
            </Button>
          </div>
        </div>
      ) : companiesToShow.length > 0 ? (
        <motion.div
          className="flex flex-wrap justify-center items-start gap-6 lg:gap-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ staggerChildren: 0.1 }}
        >
          {companiesToShow.map((company, index) => {
            const uniqueKey = `company-${company.id}-${company.matchScore || 0}-${company.rankPosition || index}-${index}`;
            return (
              <LazyLoadComponent key={uniqueKey}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <Suspense
                    fallback={
                      <div className="w-80 h-[42rem] bg-slate-800/50 rounded-2xl flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
                      </div>
                    }
                  >
                    <PlayingCard
                      company={company}
                      index={index}
                      showMatchDetails={showMatchDetails}
                      isFavorite={isFavorite(company.id)}
                      onToggleFavorite={toggleFavorite}
                      onViewDetails={(companyId) => {
                        navigate(`/company/${companyId}`);
                      }}
                    />
                  </Suspense>
                </motion.div>
              </LazyLoadComponent>
            );
          })}
        </motion.div>
      ) : selectedInterestIds.length > 0 ? (
        <div className="text-center py-10">
          <Target className="w-16 h-16 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-200 text-xl mb-2">No companies match your criteria yet</p>
          <p className="text-slate-300 mb-4 max-w-md mx-auto">
            Try adjusting your interests, risk tolerance, or filters to see more results.
          </p>
          <div className="space-x-4">
            <Button
              onClick={() => setCurrentStage('interestSelection')}
              variant="outline"
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              Adjust Interests
            </Button>
            <Button
              onClick={() => setCurrentStage('riskProfile')}
              variant="outline"
              className="border-purple-600 text-purple-400 hover:bg-purple-900/20"
            >
              Adjust Risk Profile
            </Button>
          </div>
        </div>
      ) : (
        <div className="text-center py-10">
          <Sparkles className="w-16 h-16 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-200 text-xl mb-2">Ready to find your matches?</p>
          <p className="text-slate-300 mb-4">Complete your preferences to see personalized company recommendations.</p>
          <Button
            onClick={() => setCurrentStage('interestSelection')}
            variant="outline"
            className="border-cyan-600 text-cyan-400 hover:bg-cyan-900/20"
          >
            Get Started
          </Button>
        </div>
      )}
    </motion.section>
  );

  // Render content based on current stage
  const renderContent = useMemo(() => {
    switch (currentStage) {
      case 'welcome':
        return (
          <motion.section
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, type: 'spring' }}
            className="relative"
            role="main"
            aria-label="Welcome Screen"
          >
            <motion.div
              className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-purple-500/10 rounded-3xl -z-10"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 5, repeat: Infinity }}
            />
            <header className="mb-12 text-center relative z-10">
              <motion.div
                initial={{ y: -30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="flex justify-center mb-6"
              >
                <div className="relative">
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-purple-500 blur-2xl opacity-50"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 4 }}
                  />
                  <Sparkles className="w-20 h-20 text-cyan-400 relative z-10" />
                </div>
              </motion.div>
              <motion.h1
                className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <span className="bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent animate-gradient">
                  Discover Mining Investments
                </span>
                <br />
                <span className="text-2xl sm:text-3xl md:text-4xl text-slate-200">Tailored to Your Style</span>
              </motion.h1>
              <motion.p
                className="text-slate-200 mt-6 text-lg sm:text-xl max-w-2xl mx-auto"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                In just 5 steps, find precious metals companies perfectly matched to your investment preferences
              </motion.p>
              <motion.div
                className="mt-8 flex flex-wrap justify-center gap-4 text-sm"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                {['🎯 Personalized Matches', '📊 Data-Driven Insights', '💎 Premium Companies'].map((feature, index) => (
                  <motion.div
                    key={index}
                    whileHover={{ scale: 1.05 }}
                    className="px-4 py-2 bg-slate-800/50 rounded-full border border-slate-600"
                  >
                    {feature}
                  </motion.div>
                ))}
              </motion.div>
            </header>
            <motion.div
              className="text-center"
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              <Button
                onClick={advanceToInterestSelection}
                className="group relative px-12 py-5 bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-bold text-lg sm:text-xl rounded-2xl shadow-2xl shadow-cyan-500/30 transition-all hover:shadow-cyan-500/50"
                aria-label="Start Onboarding"
              >
                <span className="flex items-center gap-3">
                  Let's Get Started
                  <motion.div
                    animate={{ x: [0, 5, 0] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                  >
                    <ChevronRight className="w-6 h-6" />
                  </motion.div>
                </span>
              </Button>
              <p className="mt-4 text-sm text-slate-300">
                Or{' '}
                <Link to="/" className="text-cyan-400 hover:text-cyan-300 underline" aria-label="Return to Home">
                  return home
                </Link>
              </p>
            </motion.div>
          </motion.section>
        );

      case 'interestSelection':
        return (
          <Suspense fallback={<LoadingIndicator message="Loading interest selector..." />}>
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <header className="mb-8 text-center">
                <h1 className="text-3xl sm:text-4xl font-bold text-cyan-400">Choose Your Investment Interests</h1>
                <p className="text-slate-200 mt-2">Select and prioritize areas that align with your strategy.</p>
              </header>
              <EnhancedInterestSelector
                onSelectionChange={handleInterestsSelected}
                initialSelectedIds={selectedInterestIds}
                profiles={allInterestProfiles}
              />
              {selectedInterestIds.length > 0 && (
                <motion.div
                  className="mt-6 text-center"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <p className="text-slate-200 mb-4">Great choices! Ready to define your investor profile?</p>
                  <Button
                    onClick={advanceToRiskProfile}
                    className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-3 px-8 rounded-xl shadow-lg"
                    aria-label="Proceed to Investor Profile"
                  >
                    Next: Investor Profile
                  </Button>
                </motion.div>
              )}
            </motion.section>
          </Suspense>
        );

      case 'riskProfile':
        return (
          <Suspense fallback={<LoadingIndicator message="Loading risk profile selector..." />}>
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <header className="mb-8 text-center">
                <h1 className="text-3xl sm:text-4xl font-bold text-cyan-400">Build Your Investor Profile</h1>
                <p className="text-slate-200 mt-2">Fine-tune your preferences for personalized matches.</p>
                <Button
                  variant="outline"
                  onClick={() => setCurrentStage('interestSelection')}
                  className="mt-2 border-slate-600 text-slate-300 hover:bg-slate-700"
                  aria-label="Back to Interest Selection"
                >
                  Back to Interests
                </Button>
              </header>
              <EnhancedRiskProfileSelector
                onComplete={handleRiskProfileComplete}
                onAchievement={handleAchievement}
                achievements={achievements}
              />
            </motion.section>
          </Suspense>
        );

      case 'preview':
        return (
          <Suspense fallback={<LoadingIndicator message="Loading profile preview..." />}>
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <EnhancedProfilePreview
                interests={selectedInterestIds}
                riskProfile={riskProfile!}
                onConfirm={advanceToShowcase}
                onEditInterests={() => setCurrentStage('interestSelection')}
                onEditRiskProfile={() => setCurrentStage('riskProfile')}
              />
            </motion.section>
          </Suspense>
        );

      case 'showcase':
        return (
          <Suspense fallback={<LoadingIndicator message="Loading enhanced company showcase..." />}>
            {renderEnhancedShowcase()}
          </Suspense>
        );

      default:
        debugLog('Unknown onboarding stage', currentStage);
        toast.error('Unknown onboarding stage. Please try again.');
        return (
          <div className="text-red-400 text-center py-10" role="alert">
            <AlertCircle className="w-16 h-16 mx-auto mb-4" />
            <p className="text-xl mb-2">Oops! Something went wrong</p>
            <p className="text-slate-300 mb-4">Unknown onboarding stage detected.</p>
            <Button onClick={resetOnboarding} variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700">
              Start Over
            </Button>
          </div>
        );
    }
  }, [
    currentStage,
    selectedInterestIds,
    riskProfile,
    companiesToShow,
    isLoading,
    error,
    showMatchDetails,
    isConfigPanelOpen,
    advanceToInterestSelection,
    advanceToRiskProfile,
    advanceToShowcase,
    resetOnboarding,
    handleInterestsSelected,
    handleRiskProfileComplete,
    achievements,
    enhancedSortFunctions,
    enhancedFilterFunctions,
    fetchAndProcessCompanies,
  ]);

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 relative overflow-hidden" aria-label="Maple Aurum Onboarding">
      <nav className="fixed top-0 left-0 right-0 bg-slate-900/90 backdrop-blur-sm border-b border-slate-800 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Button
            onClick={() => navigate('/', { replace: true })}
            className="text-cyan-400 hover:text-cyan-300 flex items-center gap-2 bg-transparent hover:bg-slate-800"
            aria-label="Return to Home"
          >
            <Home className="w-5 h-5" />
            <span className="hidden sm:inline">Home</span>
          </Button>
          <h2 className="text-lg font-semibold text-cyan-400">MapleAurum Onboarding</h2>
          <div className="w-20" />
        </div>
      </nav>

      <div className="pt-16">
        <div className="fixed inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900" />
          <motion.div
            className="absolute top-0 left-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl"
            animate={{ xknight: [0, 100, 0], y: [0, 50, 0] }}
            transition={{ repeat: Infinity, duration: 20, ease: 'linear' }}
            aria-hidden="true"
          />
          <motion.div
            className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"
            animate={{ x: [0, -100, 0], y: [0, -50, 0] }}
            transition={{ repeat: Infinity, duration: 15, ease: 'linear' }}
            aria-hidden="true"
          />
        </div>

        {currentStage !== 'welcome' && (
          <EnhancedProgressIndicator
            currentStage={currentStage}
            setCurrentStage={setCurrentStage}
          />
        )}

        {currentStage !== 'welcome' && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed top-20 left-4 flex gap-2 z-40"
            role="region"
            aria-label="Achievement Tracker"
          >
            {achievements.map((achievement) => (
              <motion.div
                key={achievement.id}
                whileHover={{ scale: 1.1 }}
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center cursor-pointer',
                  achievement.unlocked ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white shadow-lg' : 'bg-slate-800 text-slate-600 border border-slate-600'
                )}
                role="button"
                tabIndex={0}
                aria-label={`${achievement.title}: ${achievement.description}`}
                title={`${achievement.title}: ${achievement.description}`}
                onKeyDown={(e) => e.key === 'Enter' && toast.success(`${achievement.title}: ${achievement.description}`)}
              >
                {achievement.icon}
              </motion.div>
            ))}
          </motion.div>
        )}

        <div className="max-w-7xl mx-auto px-4 py-8">{renderContent}</div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 1 }}
        className="fixed bottom-4 left-3/4 -translate-x-1/4 bg-black/80 backdrop-blur-sm rounded-full px-3 py-3 flex items-center gap-2 z-50"
      >
        <span className="text-slate-300 text-sm font-medium hidden sm:block">Ready to dive deeper?</span>
        
        <Button
          variant="outline"
          className="border-slate-600 text-slate-300 hover:bg-slate-700"
          onClick={() => navigate('/companies')}
          aria-label="View all companies in a table"
        >
          View All Companies
        </Button>

        <Button
          className="bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white"
          onClick={() => navigate('/subscribe')}
          aria-label="Subscribe for full access"
        >
          Subscribe for Full Access
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </motion.div>

      <style jsx="true">{`
        @keyframes shimmer {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 3s ease infinite;
        }
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
      `}</style>
    </main>
  );
};

export default HookUIPage;