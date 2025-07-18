//src/features/hook-ui/components/onboarding/EnhancedInterestSelector.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Rocket, Shield, TrendingUp, Scale, Gem, Leaf, Search, DollarSign, Factory, Star } from 'lucide-react';
import type { InterestProfile } from '../../types/hook-ui-types';
import { cn } from '../../../../lib/utils';
import { normalizeWeights } from '../../../../pages/scatter-score-pro/utils/normalizeWeights';
import { toast } from 'react-hot-toast';

interface EnhancedInterestSelectorProps {
  onSelectionChange: (profiles: { id: string; weight: number }[]) => void;
  initialSelectedIds: { id: string; weight: number }[] | string[];
  profiles: InterestProfile[];
}

const profileIcons: Record<string, React.ReactNode> = {
  max_potential_returns: <Rocket className="w-5 h-5 text-yellow-400" />,
  cautious_safe_ounces: <Shield className="w-5 h-5 text-green-400" />,
  near_term_producers: <Factory className="w-5 h-5 text-blue-400" />,
  high_grade_discoveries: <Gem className="w-5 h-5 text-purple-400" />,
  established_dividend_payers: <DollarSign className="w-5 h-5 text-teal-400" />,
  speculative_exploration: <Search className="w-5 h-5 text-orange-400" />,
  environmentally_focused: <Leaf className="w-5 h-5 text-lime-500" />,
  undervalued_assets: <Scale className="w-5 h-5 text-indigo-400" />,
  high_cash_flow_generators: <TrendingUp className="w-5 h-5 text-pink-400" />,
  low_cost_producers: <Star className="w-5 h-5 text-red-400" />,
};

const FloatingParticles = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {[...Array(3)].map((_, i) => (
      <motion.div
        key={i}
        className="absolute w-1 h-1 bg-cyan-400/30 rounded-full"
        initial={{ 
          x: `${Math.random() * 100}%`,
          y: '100%',
          scale: Math.random() * 0.5 + 0.5
        }}
        animate={{ 
          y: '-10%',
          transition: {
            duration: Math.random() * 20 + 20,
            repeat: Infinity,
            ease: 'linear',
            delay: Math.random() * 5
          }
        }}
      />
    ))}
  </div>
);

const EnhancedInterestSelector: React.FC<EnhancedInterestSelectorProps> = ({
  onSelectionChange,
  initialSelectedIds = [],
  profiles
}) => {
  const [selectedProfiles, setSelectedProfiles] = useState<{ id: string; weight: number }[]>(() => {
    if (Array.isArray(initialSelectedIds) && initialSelectedIds.length > 0) {
      if (typeof initialSelectedIds[0] === 'object' && 'id' in initialSelectedIds[0] && 'weight' in initialSelectedIds[0]) {
        return initialSelectedIds as { id: string; weight: number }[];
      } else if (typeof initialSelectedIds[0] === 'string') {
        const weightPerProfile = 100 / initialSelectedIds.length;
        return (initialSelectedIds as string[]).map(id => ({ id, weight: weightPerProfile }));
      }
    }
    return [];
  });
  const [hoveredProfile, setHoveredProfile] = useState<string | null>(null);

  useEffect(() => {
    if (Array.isArray(initialSelectedIds) && initialSelectedIds.length > 0) {
      if (typeof initialSelectedIds[0] === 'object' && 'id' in initialSelectedIds[0] && 'weight' in initialSelectedIds[0]) {
        setSelectedProfiles(initialSelectedIds as { id: string; weight: number }[]);
      } else if (typeof initialSelectedIds[0] === 'string') {
        const weightPerProfile = 100 / initialSelectedIds.length;
        setSelectedProfiles((initialSelectedIds as string[]).map(id => ({ id, weight: weightPerProfile })));
      }
    }
  }, [initialSelectedIds]);

  const handleProfileToggle = (id: string) => {
    const existingIndex = selectedProfiles.findIndex(p => p.id === id);
    let newProfiles = [...selectedProfiles];

    if (existingIndex >= 0) {
      newProfiles = newProfiles.filter(p => p.id !== id);
    } else {
      newProfiles.push({ id, weight: 0 });
    }

    if (newProfiles.length > 3) {
      toast.error('You can select up to 3 interests for optimal diversification.');
      return;
    }

    const normalized = normalizeWeights(
      newProfiles.map(p => ({ key: p.id, metricLabel: p.id, weight: p.weight })),
      id,
      undefined,
      existingIndex === -1
    ).map(m => ({ id: m.key, weight: m.weight }));

    setSelectedProfiles(normalized);
    onSelectionChange(normalized);
    toast.success(`${existingIndex >= 0 ? 'Removed' : 'Added'} ${profiles.find(p => p.id === id)?.name}`);
  };

  const handleWeightChange = (id: string, weight: number) => {
    const newProfiles = selectedProfiles.map(p => (p.id === id ? { ...p, weight } : p));
    const normalized = normalizeWeights(
      newProfiles.map(p => ({ key: p.id, metricLabel: p.id, weight: p.weight })),
      id,
      weight
    ).map(m => ({ id: m.key, weight: m.weight }));

    setSelectedProfiles(normalized);
    onSelectionChange(normalized);
  };

  const profileNames = useMemo(
    () =>
      selectedProfiles.map(p => ({
        id: p.id,
        name: profiles.find(profile => profile.id === p.id)?.name || p.id,
        weight: p.weight,
      })),
    [selectedProfiles, profiles]
  );

  if (!profiles || profiles.length === 0) {
    return (
      <div className="text-center text-slate-400 py-8">
        <p>Interest profiles are currently unavailable. Please check back later.</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative"
      role="region"
      aria-label="Investment Interest Selector"
    >
      <FloatingParticles />
      <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-pink-500/10 blur-3xl -z-10" />
      <div className="bg-slate-800/90 backdrop-blur-sm p-8 rounded-2xl shadow-2xl max-w-5xl mx-auto border border-slate-700/50">
        <motion.h3
          className="text-3xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-6 text-center"
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
        >
          Customize Your Investment DNA
        </motion.h3>
        <p className="text-center text-slate-300 mb-6">Select up to 3 interests and adjust their weights to match your strategy.</p>

        {selectedProfiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 (;;) bg-gradient-to-r from-cyan-900/20 to-purple-900/20 rounded-lg border border-cyan-500/20"
          >
            <p className="text-center text-sm text-cyan-300">
              <span className="font-semibold">{selectedProfiles.length}</span> {selectedProfiles.length === 1 ? 'interest' : 'interests'} selected
              {selectedProfiles.length >= 3 && ' • 🏆 Diversification achieved!'}
            </p>
            <div className="mt-2 text-sm text-slate-300">
              {profileNames.map(profile => (
                <div key={profile.id} className="flex justify-between">
                  <span>{profile.name}</span>
                  <span className="font-semibold text-cyan-400">{Math.round(profile.weight)}%</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {profiles.map((profile, index) => {
            const isSelected = selectedProfiles.some(p => p.id === profile.id);
            const selectedProfile = selectedProfiles.find(p => p.id === profile.id);

            return (
              <motion.div
                key={profile.id}
                initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.02 }}
                onHoverStart={() => setHoveredProfile(profile.id)}
                onHoverEnd={() => setHoveredProfile(null)}
                role="group"
                aria-label={`Interest: ${profile.name}`}
              >
                <div
                  className={cn(
                    'relative p-6 rounded-xl transition-all duration-300 cursor-pointer',
                    isSelected
                      ? 'bg-gradient-to-br from-cyan-600/20 to-purple-600/20 border-2 border-cyan-400/50 shadow-lg shadow-cyan-500/20'
                      : 'bg-slate-700/50 border border-slate-600/50 hover:border-slate-500'
                  )}
                >
                  {isSelected && (
                    <motion.div
                      className="absolute -top-2 -right-2"
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', stiffness: 300 }}
                    >
                      <div className="bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full p-2">
                        <Sparkles className="w-4 h-4 text-white" />
                      </div>
                    </motion.div>
                  )}

                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div
                          className={cn(
                            'p-2 rounded-lg transition-all duration-300',
                            isSelected ? 'bg-gradient-to-br from-cyan-500/20 to-purple-500/20' : 'bg-slate-600/50'
                          )}
                        >
                          {profileIcons[profile.id] || <Star className="w-5 h-5 text-slate-400" />}
                        </div>
                        <h4
                          className={cn(
                            'font-semibold text-lg transition-colors',
                            isSelected ? 'text-cyan-300' : 'text-slate-200'
                          )}
                        >
                          {profile.name}
                        </h4>
                      </div>
                      <p className="text-sm text-slate-400 leading-relaxed">{profile.description}</p>
                    </div>

                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleProfileToggle(profile.id)}
                      className={cn(
                        'ml-4 w-6 h-6 rounded-full border-2 transition-all flex-shrink-0',
                        isSelected ? 'bg-gradient-to-r from-cyan-500 to-purple-500 border-transparent' : 'border-slate-500 hover:border-cyan-400'
                      )}
                      aria-label={isSelected ? `Deselect ${profile.name}` : `Select ${profile.name}`}
                    >
                      {isSelected && (
                        <motion.svg
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="w-full h-full p-1"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <path d="M5 13l4 4L19 7" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                        </motion.svg>
                      )}
                    </motion.button>
                  </div>

                  <AnimatePresence>
                    {isSelected && selectedProfile && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div className="pt-4 border-t border-slate-600/50">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-slate-400">Weight</span>
                            <span className="text-sm font-semibold text-cyan-400">{Math.round(selectedProfile.weight)}%</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={selectedProfile.weight}
                            onChange={(e) => handleWeightChange(profile.id, Number(e.target.value))}
                            className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer"
                            style={{
                              background: `linear-gradient(to right, #06b6d4 0%, #06b6d4 ${selectedProfile.weight}%, #475569 ${selectedProfile.weight}%, #475569 100%)`
                            }}
                            aria-label={`Adjust weight for ${profile.name}`}
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {hoveredProfile === profile.id && !isSelected && (
                    <motion.div
                      className="absolute inset-0 rounded-xl opacity-30 pointer-events-none"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 0.3 }}
                      style={{
                        background: 'linear-gradient(45deg, transparent 30%, rgba(6, 182, 212, 0.3) 50%, transparent 70%)',
                        backgroundSize: '200% 200%',
                        animation: 'shimmer 3s ease-in-out infinite',
                      }}
                    />
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      <style jsx>{`
        @keyframes shimmer {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
    </motion.div>
  );
};

export default EnhancedInterestSelector;