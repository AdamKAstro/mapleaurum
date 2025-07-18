// src/features/hook-ui/components/onboarding/EnhancedRiskProfileSelector.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { Zap, ChevronRight, Shield, TrendingUp, Clock, Coins, BarChart3, Target } from 'lucide-react';
import { debounce } from 'lodash';
import { Button } from '../../../../components/ui/button';
import type { RiskProfile, Achievement } from '../../types/hook-ui-types';
import { cn, formatPercent } from '../../../../lib/utils';
import { toast } from 'react-hot-toast';

interface ExtendedRiskProfile extends RiskProfile {
  diversificationPreference?: number;
  liquidityRequirement?: number;
  growthVsValue?: number;
  esrConsideration?: number;
}

interface EnhancedRiskProfileSelectorProps {
  onComplete: (profile: ExtendedRiskProfile) => void;
  onAchievement?: (achievementId: string) => void;
  achievements?: Achievement[];
}

const EnhancedRiskProfileSelector: React.FC<EnhancedRiskProfileSelectorProps> = ({
  onComplete,
  onAchievement,
  achievements,
}) => {
  const [riskTolerance, setRiskTolerance] = useState(50);
  const [investmentHorizon, setInvestmentHorizon] = useState(50);
  const [diversificationPreference, setDiversificationPreference] = useState(50);
  const [liquidityRequirement, setLiquidityRequirement] = useState(30);
  const [growthVsValue, setGrowthVsValue] = useState(50);
  const [esrConsideration, setEsrConsideration] = useState(40);
  const [preferredMinerals, setPreferredMinerals] = useState<string[]>(['gold', 'silver']);
  const controls = useAnimation();

  const debouncedSetRiskTolerance = useCallback(
    debounce((value: number) => {
      setRiskTolerance(value);
    }, 100),
    []
  );

  useEffect(() => {
    if (
      riskTolerance > 75 &&
      onAchievement &&
      achievements?.find(a => a.id === 'risk_taker')?.unlocked === false
    ) {
      onAchievement('risk_taker');
      controls.start({
        scale: [1, 1.05, 1],
        transition: { duration: 0.3 }
      });
    }
  }, [riskTolerance, onAchievement, controls, achievements]);

  const handleSubmit = () => {
    if (preferredMinerals.length === 0) {
      toast.error('Please select at least one preferred metal.');
      return;
    }
    onComplete({ 
      riskTolerance, 
      investmentHorizon, 
      preferredMinerals,
      diversificationPreference,
      liquidityRequirement,
      growthVsValue,
      esrConsideration
    });
    toast.success('Risk profile saved!');
  };

  const getRiskEmoji = () => {
    if (riskTolerance < 25) return '🛡️';
    if (riskTolerance < 50) return '⚖️';
    if (riskTolerance < 75) return '🚀';
    return '🔥';
  };

  const getHorizonEmoji = () => {
    if (investmentHorizon < 25) return '⏱️';
    if (investmentHorizon < 50) return '📅';
    if (investmentHorizon < 75) return '📈';
    return '🏔️';
  };

  const sliderConfigs = [
    {
      id: 'risk-tolerance',
      label: 'Risk Tolerance',
      value: riskTolerance,
      setValue: debouncedSetRiskTolerance,
      icon: <Shield className="w-5 h-5" />,
      emoji: getRiskEmoji(),
      gradient: 'from-green-400 via-yellow-400 to-red-400',
      labels: ['Conservative', 'Balanced', 'Aggressive']
    },
    {
      id: 'investment-horizon',
      label: 'Investment Horizon',
      value: investmentHorizon,
      setValue: setInvestmentHorizon,
      icon: <Clock className="w-5 h-5" />,
      emoji: getHorizonEmoji(),
      gradient: 'from-blue-400 via-purple-400 to-pink-400',
      labels: ['Short-term', 'Medium-term', 'Long-term']
    },
    {
      id: 'diversification',
      label: 'Diversification Level',
      value: diversificationPreference,
      setValue: setDiversificationPreference,
      icon: <BarChart3 className="w-5 h-5" />,
      emoji: diversificationPreference < 33 ? '🎯' : diversificationPreference < 66 ? '🎪' : '🌐',
      gradient: 'from-orange-400 via-teal-400 to-indigo-400',
      labels: ['Concentrated', 'Balanced', 'Highly Diversified']
    },
    {
      id: 'liquidity',
      label: 'Liquidity Requirements',
      value: liquidityRequirement,
      setValue: setLiquidityRequirement,
      icon: <Coins className="w-5 h-5" />,
      emoji: liquidityRequirement < 33 ? '🔒' : liquidityRequirement < 66 ? '💧' : '🌊',
      gradient: 'from-gray-400 via-cyan-400 to-blue-400',
      labels: ['Low Liquidity OK', 'Moderate', 'High Liquidity']
    },
    {
      id: 'growth-value',
      label: 'Growth vs Value',
      value: growthVsValue,
      setValue: setGrowthVsValue,
      icon: <TrendingUp className="w-5 h-5" />,
      emoji: growthVsValue < 33 ? '💎' : growthVsValue < 66 ? '⚖️' : '🚀',
      gradient: 'from-emerald-400 via-yellow-400 to-rose-400',
      labels: ['Value Focus', 'Balanced', 'Growth Focus']
    },
    {
      id: 'esr',
      label: 'ESG Consideration',
      value: esrConsideration,
      setValue: setEsrConsideration,
      icon: <Target className="w-5 h-5" />,
      emoji: esrConsideration < 33 ? '⚡' : esrConsideration < 66 ? '🌱' : '🌿',
      gradient: 'from-slate-400 via-lime-400 to-green-400',
      labels: ['Low Priority', 'Moderate', 'High Priority']
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="relative"
      role="region"
      aria-label="Risk Profile Selector"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-orange-500/10 blur-3xl -z-10" />
      <div className="bg-slate-800/90 backdrop-blur-sm p-8 rounded-2xl shadow-2xl max-w-5xl mx-auto border border-slate-700/50">
        <motion.h3
          className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent mb-2 text-center"
          animate={controls}
        >
          Fine-Tune Your Investment Strategy
        </motion.h3>
        <p className="text-slate-300 mb-8 text-center">Customize your preferences across multiple dimensions</p>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {sliderConfigs.map((config) => (
            <motion.div
              key={config.id}
              whileHover={{ scale: 1.01 }}
              className="bg-slate-700/50 p-6 rounded-xl"
            >
              <div className="flex items-center justify-between mb-4">
                <label className="flex items-center gap-2 text-lg font-medium text-slate-200" htmlFor={config.id}>
                  {config.icon}
                  {config.label} {config.emoji}
                </label>
                <span className={cn(
                  "text-2xl font-bold text-transparent bg-gradient-to-r bg-clip-text",
                  config.gradient
                )}>
                  {config.value}%
                </span>
              </div>
              <div className="relative">
                <input
                  id={config.id}
                  type="range"
                  min="0"
                  max="100"
                  value={config.value}
                  onChange={(e) => config.setValue(Number(e.target.value))}
                  className="w-full h-3 bg-slate-600 rounded-lg appearance-none cursor-pointer slider-thumb"
                  aria-label={`Adjust ${config.label}`}
                />
                <div 
                  className="absolute top-0 left-0 h-3 rounded-lg pointer-events-none"
                  style={{
                    width: `${config.value}%`,
                    background: `linear-gradient(to right, ${
                      config.gradient.includes('green') ? '#4ade80' :
                      config.gradient.includes('blue') ? '#60a5fa' :
                      config.gradient.includes('orange') ? '#fb923c' :
                      config.gradient.includes('gray') ? '#9ca3af' :
                      config.gradient.includes('emerald') ? '#34d399' :
                      '#94a3b8'
                    }, ${
                      config.gradient.includes('yellow') ? '#facc15' :
                      config.gradient.includes('purple') ? '#a78bfa' :
                      config.gradient.includes('teal') ? '#2dd4bf' :
                      config.gradient.includes('cyan') ? '#22d3ee' :
                      config.gradient.includes('lime') ? '#a3e635' :
                      '#facc15'
                    }, ${
                      config.gradient.includes('red') ? '#f87171' :
                      config.gradient.includes('pink') ? '#f472b6' :
                      config.gradient.includes('indigo') ? '#818cf8' :
                      config.gradient.includes('blue') && config.gradient.includes('to-blue') ? '#3b82f6' :
                      config.gradient.includes('rose') ? '#fb7185' :
                      config.gradient.includes('green') && config.gradient.includes('to-green') ? '#22c55e' :
                      '#f87171'
                    })`
                  }}
                />
              </div>
              <div className="flex justify-between mt-2 text-xs text-slate-400">
                {config.labels.map((label, idx) => (
                  <span key={idx}>{label}</span>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        <style jsx>{`
          .slider-thumb::-webkit-slider-thumb {
            appearance: none;
            width: 20px;
            height: 20px;
            background: white;
            border-radius: 50%;
            cursor: pointer;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            position: relative;
            z-index: 10;
          }
          .slider-thumb::-moz-range-thumb {
            width: 20px;
            height: 20px;
            background: white;
            border-radius: 50%;
            cursor: pointer;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            border: none;
            position: relative;
            z-index: 10;
          }
        `}</style>

        <motion.div
          whileHover={{ scale: 1.01 }}
          className="bg-slate-700/50 p-6 rounded-xl mb-8"
        >
          <label className="block text-lg font-medium text-slate-200 mb-4">
            Preferred Precious Metals 💎
          </label>
          <div className="flex gap-3">
            {['gold', 'silver'].map((mineral) => (
              <motion.button
                key={mineral}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setPreferredMinerals(prev =>
                    prev.includes(mineral) ? prev.filter(m => m !== mineral) : [...prev, mineral]
                  );
                  toast.success(`${mineral.charAt(0).toUpperCase() + mineral.slice(1)} ${preferredMinerals.includes(mineral) ? 'removed' : 'selected'}`);
                }}
                className={cn(
                  'px-6 py-3 rounded-lg font-medium transition-all',
                  preferredMinerals.includes(mineral)
                    ? mineral === 'gold'
                      ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-lg shadow-yellow-500/30'
                      : 'bg-gradient-to-r from-gray-400 to-slate-500 text-white shadow-lg shadow-gray-400/30'
                    : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                )}
                aria-label={`${preferredMinerals.includes(mineral) ? 'Deselect' : 'Select'} ${mineral.charAt(0).toUpperCase() + mineral.slice(1)}`}
              >
                {mineral === 'gold' ? '🥇' : '🥈'} {mineral.charAt(0).toUpperCase() + mineral.slice(1)}
              </motion.button>
            ))}
          </div>
        </motion.div>

        <motion.div className="text-center">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSubmit}
            className="group relative px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-green-500/30 transition-all hover:shadow-xl hover:shadow-green-500/40"
            aria-label="Continue to Review"
          >
            <span className="flex items-center gap-2">
              Continue to Review
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </span>
          </motion.button>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default EnhancedRiskProfileSelector;