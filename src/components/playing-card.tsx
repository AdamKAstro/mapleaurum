// src/components/playing-card.tsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaRocket, FaShieldAlt, FaChartLine, FaBalanceScale, FaGem, FaLeaf, FaSearchDollar, FaHandHoldingUsd, FaIndustry, FaStar, FaExternalLinkAlt } from 'react-icons/fa';
import { supabase } from '../../../lib/supabase'; // Assuming this path is correct
import { isValidUrl } from '../../features/hook-ui/lib/utils'; // Assuming this path is correct

// Define a specific type for the props the card will receive.
export interface PlayingCardData {
  id: string; // The company's unique ID
  name: string;
  tsxCode: string;
  logo?: string;
  sharePrice: number | null;
  marketCap: number | null;
  production: number | null;
  description: string | null;
  recentNews: string[];
  analystRating: string | null;
  matchedInterests?: string[];
  scoreForPrimaryInterest?: number;
}

interface PlayingCardProps {
  company: PlayingCardData;
}

// Helper to get a default logo if none provided
const getDefaultLogo = (name: string) => {
  const firstLetter = name.charAt(0).toUpperCase();
  return `https://ui-avatars.com/api/?name=${firstLetter}&background=2D3748&color=FFFFFF&size=64&bold=true&font-size=0.5`;
};


const PlayingCard: React.FC<PlayingCardProps> = ({ company }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [websiteUrl, setWebsiteUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchWebsiteUrl = async () => {
      if (!company.id) return;

      // The company ID from props is a string, but the RPC needs an integer.
      const companyIdAsNumber = parseInt(company.id, 10);
      if (isNaN(companyIdAsNumber)) return;

      try {
        const { data, error } = await supabase.rpc('get_company_website_url', {
          p_company_id: companyIdAsNumber,
        });

        if (error) {
          console.error(`Error fetching website for company ${company.id}:`, error.message);
          return;
        }

        if (data && isValidUrl(data)) {
          setWebsiteUrl(data);
        }
      } catch (err) {
        console.error('An exception occurred while fetching the website URL:', err);
      }
    };

    fetchWebsiteUrl();
  }, [company.id]);


  const handleFlip = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, a')) {
      return;
    }
    setIsFlipped(!isFlipped);
  };

  const interestBadges: { [key: string]: { icon: JSX.Element; title: string } } = {
    'Max Potential Returns': { icon: <FaRocket className="text-yellow-400" />, title: 'Max Potential Returns' },
    'Cautious Safe Ounces': { icon: <FaShieldAlt className="text-green-400" />, title: 'Cautious Safe Ounces' },
    'Near-Term Producers': { icon: <FaIndustry className="text-blue-400" />, title: 'Near-Term Producer' },
    'High-Grade Discoveries': { icon: <FaGem className="text-purple-400" />, title: 'High-Grade Discovery' },
    'Established Dividend Payers': { icon: <FaHandHoldingUsd className="text-teal-400" />, title: 'Dividend Payer' },
    'Speculative Exploration': { icon: <FaSearchDollar className="text-orange-400" />, title: 'Speculative Exploration' },
    'Environmentally Focused': { icon: <FaLeaf className="text-lime-500" />, title: 'Environmentally Focused' },
    'Undervalued Assets': { icon: <FaBalanceScale className="text-indigo-400" />, title: 'Undervalued Asset' },
    'High Cash Flow Generators': { icon: <FaChartLine className="text-pink-400" />, title: 'High Cash Flow' },
    'Low-Cost Producers': { icon: <FaStar className="text-red-400" />, title: 'Low-Cost Producer' },
  };

  const logoUrl = company.logo || getDefaultLogo(company.name);

  return (
    <motion.div
      className="relative w-72 h-96 cursor-pointer"
      style={{ perspective: '1000px' }}
      onClick={handleFlip}
      whileHover={{ scale: 1.05 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        className="absolute w-full h-full"
        style={{ transformStyle: 'preserve-3d' }}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Front of the Card */}
        <div className="absolute w-full h-full rounded-xl shadow-xl p-4 flex flex-col justify-between bg-gradient-to-br from-slate-800 via-slate-900 to-black border border-slate-700"
             style={{ backfaceVisibility: 'hidden' }}
        >
          <div className="text-center">
            <img
              src={logoUrl}
              alt={`${company.name} logo`}
              className="w-16 h-16 mx-auto mb-2 rounded-full border-2 border-cyan-400 object-cover"
            />
            <h2 className="text-xl font-bold text-white truncate" title={company.name}>{company.name}</h2>
            
            {/* ✅ FIXED: Display ticker as plain text */}
            <p className="text-md font-semibold text-slate-400">
              {company.tsxCode}
            </p>

            {/* ✅ ADDED: Display website link when available */}
            {websiteUrl && (
              <a
                href={websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-sm font-medium text-cyan-400 hover:text-cyan-300 transition-colors inline-flex items-center gap-1"
              >
                Website <FaExternalLinkAlt size={12} />
              </a>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-slate-300 my-3">
            <div>
              <span className="block text-xs text-slate-400">Share Price</span>
              <span className="font-semibold">{company.sharePrice !== null ? `$${company.sharePrice.toFixed(2)}` : 'N/A'}</span>
            </div>
            <div>
              <span className="block text-xs text-slate-400">Market Cap</span>
              <span className="font-semibold">{company.marketCap !== null ? `$${(company.marketCap / 1e6).toFixed(1)}M` : 'N/A'}</span>
            </div>
            <div>
              <span className="block text-xs text-slate-400">Production</span>
              <span className="font-semibold">{company.production !== null ? `${company.production.toLocaleString()} oz` : 'N/A'}</span>
            </div>
            {company.scoreForPrimaryInterest !== undefined && (
                 <div>
                  <span className="block text-xs text-slate-400">Match Score</span>
                  <span className="font-semibold text-cyan-400">{company.scoreForPrimaryInterest.toFixed(0)}/100</span>
                </div>
            )}
          </div>

          {company.matchedInterests && company.matchedInterests.length > 0 && (
            <div className="flex justify-center items-center space-x-2 h-6">
              {company.matchedInterests.slice(0, 3).map((interestKey) => {
                const badge = interestBadges[interestKey];
                return badge ? (
                  <span key={interestKey} title={badge.title} className="text-xl">
                    {badge.icon}
                  </span>
                ) : null;
              })}
            </div>
          )}
        </div>

        {/* Back of the Card */}
        <div className="absolute w-full h-full rounded-xl shadow-xl p-4 flex flex-col bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 border border-slate-600"
             style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          <h3 className="text-lg font-bold text-white mb-1 text-center">Overview</h3>
          <p className="text-xs text-slate-300 mb-2 h-16 overflow-y-auto custom-scrollbar">
            {company.description || 'No description available.'}
          </p>
          
          {company.recentNews && company.recentNews.length > 0 && (
            <>
              <h3 className="text-md font-semibold text-white mb-1 text-center">Recent News</h3>
              <ul className="list-none text-xs text-slate-300 mb-2 h-12 overflow-y-auto custom-scrollbar">
                {company.recentNews.slice(0, 2).map((news, index) => (
                  <li key={index} className="truncate" title={news}>{news}</li>
                ))}
              </ul>
            </>
          )}
          
          <div className="text-center my-2">
            <span className="block text-xs text-slate-400">Analyst Rating</span>
            <span className="font-semibold text-white">{company.analystRating || 'N/A'}</span>
          </div>
          
          <button
            className="mt-auto w-full bg-cyan-600 hover:bg-cyan-500 text-white font-semibold py-2 px-3 rounded-md transition-colors text-sm"
            onClick={(e) => {
              e.stopPropagation();
              window.open(`https://example.com/company/${company.id}`, '_blank');
              console.log(`Maps to details for ${company.id}`);
            }}
          >
            View Full Details
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default PlayingCard;