// src/features/hook-ui/components/onboarding/EnhancedProfilePreview.tsx

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Target, Zap, ChevronRight, Trophy, BarChart3, Clock, Shield, TrendingUp } from 'lucide-react';
import type { RiskProfile } from '../../types/hook-ui-types';
import { Button } from '../../../../components/ui/button';
import { cn, formatPercent } from '../../../../lib/utils';
import { interestProfiles as allInterestProfiles } from '../../lib/interest-profiles-config';
import { toast } from 'react-hot-toast';

interface ExtendedRiskProfile extends RiskProfile {
  diversificationPreference?: number;
  liquidityRequirement?: number;
  growthVsValue?: number;
  esrConsideration?: number;
}

interface EnhancedProfilePreviewProps {
  interests: { id: string; weight: number }[];
  riskProfile: ExtendedRiskProfile;
  onConfirm: () => void;
  onEditInterests: () => void;
  onEditRiskProfile: () => void;
}

const EnhancedProfilePreview: React.FC<EnhancedProfilePreviewProps> = ({
  interests,
  riskProfile,
  onConfirm,
  onEditInterests,
  onEditRiskProfile,
}) => {
  const interestData = useMemo(() => {
    const totalWeight = interests.reduce((sum, p) => sum + p.weight, 0);
    return interests
      .map(p => {
        const profile = allInterestProfiles.find(ip => ip.id === p.id);
        if (!profile) return null;
        // Normalize weights to ensure they sum to 100%
        const normalizedWeight = totalWeight > 0 ? (p.weight / totalWeight) * 100 : 0;
        return { 
          name: profile.name, 
          weight: p.weight,
          normalizedWeight,
          icon: profile.icon,
          color: profile.color || 'cyan'
        };
      })
      .filter(Boolean) as { name: string; weight: number; normalizedWeight: number; icon?: string; color: string }[];
  }, [interests]);

  const totalInterestWeight = useMemo(
    () => interestData.reduce((sum, item) => sum + item.normalizedWeight, 0),
    [interestData]
  );

  const handleShowMatches = () => {
    onConfirm();
    toast.success('Revealing your curated matches!');
  };

  const profileMetrics = [
    { label: 'Risk Tolerance', value: riskProfile.riskTolerance, icon: <Shield className="w-4 h-4" /> },
    { label: 'Investment Horizon', value: riskProfile.investmentHorizon, icon: <Clock className="w-4 h-4" /> },
    { label: 'Diversification', value: riskProfile.diversificationPreference || 50, icon: <BarChart3 className="w-4 h-4" /> },
    { label: 'Growth Focus', value: riskProfile.growthVsValue || 50, icon: <TrendingUp className="w-4 h-4" /> },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative"
      role="region"
      aria-label="Investment Profile Preview"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-cyan-500/10 to-blue-500/10 blur-3xl -z-10" />
      <div className="bg-slate-800/90 backdrop-blur-sm p-8 rounded-2xl shadow-2xl max-w-5xl mx-auto border border-slate-700/50">
        <motion.h3
          className="text-3xl font-bold bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent mb-2 text-center"
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
        >
          Your Investment Profile
        </motion.h3>
        <p className="text-slate-300 mb-8 text-center">Review your personalized strategy before we find your matches</p>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="bg-slate-700/50 p-6 rounded-xl"
          >
            <h4 className="text-lg font-semibold text-cyan-300 mb-4 flex items-center gap-2">
              <Target className="w-5 h-5" />
              Selected Interests
              <span className="ml-auto text-sm font-normal text-slate-400">
                Total: {totalInterestWeight.toFixed(0)}%
              </span>
            </h4>
            <div className="space-y-3">
              {interestData.map((interest, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    {interest.icon && <span className="text-lg">{interest.icon}</span>}
                    <span className="text-slate-200">{interest.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-slate-600 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${interest.normalizedWeight}%` }}
                        transition={{ duration: 0.5, delay: index * 0.1 }}
                        className={cn(
                          "h-full bg-gradient-to-r",
                          `from-${interest.color}-400 to-${interest.color}-500`
                        )}
                        style={{
                          background: `linear-gradient(to right, var(--tw-gradient-from), var(--tw-gradient-to))`
                        }}
                      />
                    </div>
                    <span className="text-cyan-400 font-semibold min-w-[50px] text-right">
                      {interest.normalizedWeight.toFixed(0)}%
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
            <Button
              variant="outline"
              onClick={onEditInterests}
              className="mt-4 w-full hover:bg-cyan-600/20 hover:border-cyan-400"
              aria-label="Edit Selected Interests"
            >
              Edit Interests
            </Button>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.02 }}
            className="bg-slate-700/50 p-6 rounded-xl"
          >
            <h4 className="text-lg font-semibold text-purple-300 mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Risk & Strategy Profile
            </h4>
            <div className="space-y-3">
              {profileMetrics.map((metric, index) => (
                <motion.div
                  key={metric.label}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2 text-slate-200">
                    {metric.icon}
                    <span>{metric.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-2 bg-slate-600 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${metric.value}%` }}
                        transition={{ duration: 0.5, delay: index * 0.1 }}
                        className="h-full bg-gradient-to-r from-purple-400 to-purple-500"
                      />
                    </div>
                    <span className="text-purple-400 font-semibold min-w-[45px] text-right">
                      {metric.value}%
                    </span>
                  </div>
                </motion.div>
              ))}
              
              <div className="pt-2 border-t border-slate-600 mt-3">
                <div className="flex items-center justify-between">
                  <span className="text-slate-200">Preferred Metals</span>
                  <span className="text-purple-400 font-semibold">
                    {riskProfile.preferredMinerals.map(m => (m === 'gold' ? '🥇' : '🥈')).join(' ')}
                  </span>
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={onEditRiskProfile}
              className="mt-4 w-full hover:bg-purple-600/20 hover:border-purple-400"
              aria-label="Edit Risk Profile"
            >
              Edit Profile
            </Button>
          </motion.div>
        </div>

        {/* Additional Summary Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-r from-slate-700/30 to-slate-700/50 p-4 rounded-xl mb-6"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-xs text-slate-400 mb-1">Profile Type</p>
              <p className="text-sm font-semibold text-cyan-300">
                {riskProfile.riskTolerance > 66 ? 'Aggressive' : riskProfile.riskTolerance > 33 ? 'Balanced' : 'Conservative'}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">Time Frame</p>
              <p className="text-sm font-semibold text-purple-300">
                {riskProfile.investmentHorizon > 66 ? 'Long-term' : riskProfile.investmentHorizon > 33 ? 'Medium-term' : 'Short-term'}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">Focus Areas</p>
              <p className="text-sm font-semibold text-emerald-300">{interestData.length}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">Metals</p>
              <p className="text-sm font-semibold text-yellow-300">{riskProfile.preferredMinerals.length}</p>
            </div>
          </div>
        </motion.div>

        <motion.div className="text-center">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleShowMatches}
            className="group relative px-10 py-4 bg-gradient-to-r from-emerald-500 via-cyan-500 to-blue-500 text-white font-bold rounded-xl shadow-lg shadow-cyan-500/30 transition-all hover:shadow-xl hover:shadow-cyan-500/40"
            aria-label="Reveal Investment Matches"
          >
            <span className="flex items-center gap-3">
              <Trophy className="w-6 h-6" />
              Reveal My Matches
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </span>
          </motion.button>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default EnhancedProfilePreview;