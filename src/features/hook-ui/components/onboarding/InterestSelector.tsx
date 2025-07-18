// src/features/hook-ui/components/onboarding/InterestSelector.tsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Rocket, Shield, TrendingUp, Scale, Gem, Leaf, Search, DollarSign, Factory, Star } from 'lucide-react';
import type { InterestProfile } from '../../types/hook-ui-types';
import { interestProfiles } from '../../lib/interest-profiles-config';

interface InterestSelectorProps {
  onSelectionChange: (selectedInterestIds: string[]) => void;
  initialSelectedIds?: string[];
}

// Icon mapping for each interest profile
const profileIcons: Record<string, React.ReactNode> = {
  'max_potential_returns': <Rocket className="w-5 h-5" />,
  'cautious_safe_ounces': <Shield className="w-5 h-5" />,
  'near_term_producers': <Factory className="w-5 h-5" />,
  'high_grade_discoveries': <Gem className="w-5 h-5" />,
  'established_dividend_payers': <DollarSign className="w-5 h-5" />,
  'speculative_exploration': <Search className="w-5 h-5" />,
  'environmentally_focused': <Leaf className="w-5 h-5" />,
  'undervalued_assets': <Scale className="w-5 h-5" />,
  'high_cash_flow_generators': <TrendingUp className="w-5 h-5" />,
  'low_cost_producers': <Star className="w-5 h-5" />,
};

const InterestSelector: React.FC<InterestSelectorProps> = ({ 
  onSelectionChange,
  initialSelectedIds = [] 
}) => {
  const getValidInitialIds = () => 
    initialSelectedIds.filter(id => interestProfiles.some(profile => profile.id === id));
  
  const [selectedIds, setSelectedIds] = useState<string[]>(getValidInitialIds());
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(() => {
    setSelectedIds(getValidInitialIds());
  }, [initialSelectedIds]);

  const handleInterestToggle = (profileId: string) => {
    let newSelectedIds;
    if (selectedIds.includes(profileId)) {
      newSelectedIds = selectedIds.filter((id) => id !== profileId);
    } else {
      newSelectedIds = [...selectedIds, profileId];
    }
    setSelectedIds(newSelectedIds);
    onSelectionChange(newSelectedIds);
  };

  if (!interestProfiles || interestProfiles.length === 0) {
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
      className="relative bg-slate-800/90 backdrop-blur-sm p-8 rounded-2xl shadow-2xl my-8 max-w-5xl mx-auto border border-slate-700/50"
    >
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-purple-500/5 to-pink-500/5 rounded-2xl -z-10" />
      
      <motion.h3 
        className="text-3xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-3 text-center"
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200 }}
      >
        Discover Your Investment Style
      </motion.h3>
      
      <p className="text-slate-300 mb-8 text-center text-lg">
        Select strategies that match your goals - combine multiple for a balanced approach
      </p>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {interestProfiles.map((profile, index) => {
          const isSelected = selectedIds.includes(profile.id);
          const isHovered = hoveredId === profile.id;
          
          return (
            <motion.div
              key={profile.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ scale: 1.02 }}
              onHoverStart={() => setHoveredId(profile.id)}
              onHoverEnd={() => setHoveredId(null)}
            >
              <button
                type="button"
                onClick={() => handleInterestToggle(profile.id)}
                className={`
                  relative group w-full p-5 rounded-xl text-left transition-all duration-300
                  ${isSelected
                    ? 'bg-gradient-to-br from-cyan-600/20 via-purple-600/20 to-pink-600/20 border-2 border-cyan-400/50 shadow-lg shadow-cyan-500/20 scale-105'
                    : 'bg-slate-700/50 border border-slate-600/50 hover:border-cyan-400/30 hover:bg-slate-700/70'
                  }
                `}
              >
                {/* Selection indicator */}
                <AnimatePresence>
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      exit={{ scale: 0, rotate: 180 }}
                      className="absolute -top-2 -right-2 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full p-2 shadow-lg"
                    >
                      <Sparkles className="w-4 h-4 text-white" />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Content */}
                <div className="flex items-start gap-3">
                  <motion.div 
                    className={`
                      p-2.5 rounded-lg transition-all duration-300
                      ${isSelected 
                        ? 'bg-gradient-to-br from-cyan-500/20 to-purple-500/20' 
                        : 'bg-slate-600/50 group-hover:bg-slate-600/70'
                      }
                    `}
                    animate={isSelected ? { rotate: [0, -10, 10, -10, 0] } : {}}
                    transition={{ duration: 0.5 }}
                  >
                    {profileIcons[profile.id] || <Star className="w-5 h-5 text-slate-400" />}
                  </motion.div>
                  
                  <div className="flex-1">
                    <h4 className={`
                      font-semibold text-base mb-1.5 transition-colors duration-300
                      ${isSelected ? 'text-cyan-300' : 'text-slate-200 group-hover:text-cyan-300'}
                    `}>
                      {profile.name}
                    </h4>
                    <p className={`
                      text-xs leading-relaxed transition-all duration-300
                      ${isSelected ? 'text-slate-300' : 'text-slate-400 group-hover:text-slate-300'}
                    `}>
                      {profile.description}
                    </p>
                  </div>
                </div>

                {/* Animated border gradient on selection */}
                {isSelected && (
                  <motion.div
                    className="absolute inset-0 rounded-xl opacity-50 pointer-events-none"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.5 }}
                    style={{
                      background: 'linear-gradient(45deg, transparent 30%, rgba(6, 182, 212, 0.3) 50%, transparent 70%)',
                      backgroundSize: '200% 200%',
                      animation: 'shimmer 3s ease-in-out infinite',
                    }}
                  />
                )}

                {/* Hover effect for unselected items */}
                {isHovered && !isSelected && (
                  <motion.div
                    className="absolute inset-0 rounded-xl opacity-30 pointer-events-none"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.3 }}
                    style={{
                      background: 'radial-gradient(circle at center, rgba(6, 182, 212, 0.2), transparent 70%)',
                    }}
                  />
                )}
              </button>
            </motion.div>
          );
        })}
      </div>

      {/* Selection counter with animation */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mt-8 text-center"
          >
            <motion.div 
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-900/30 to-purple-900/30 rounded-full border border-cyan-500/30"
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Sparkles className="w-5 h-5 text-cyan-400" />
              <span className="text-cyan-300 font-medium">
                {selectedIds.length} {selectedIds.length === 1 ? 'strategy' : 'strategies'} selected
              </span>
              {selectedIds.length >= 3 && (
                <motion.span
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 300 }}
                  className="ml-2 text-yellow-400 text-xl"
                >
                  🏆
                </motion.span>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating orbs animation */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-2xl">
        <motion.div
          className="absolute w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl"
          animate={{
            x: [-100, 100, -100],
            y: [-50, 50, -50],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear"
          }}
        />
        <motion.div
          className="absolute right-0 bottom-0 w-40 h-40 bg-purple-500/10 rounded-full blur-2xl"
          animate={{
            x: [100, -100, 100],
            y: [50, -50, 50],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "linear"
          }}
        />
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

export default InterestSelector;