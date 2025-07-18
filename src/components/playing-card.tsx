//src/components/playing-card.tsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FaRocket, FaShieldAlt, FaChartLine, FaBalanceScale, FaGem, FaLeaf, FaSearchDollar, FaHandHoldingUsd, FaIndustry, FaStar } from 'react-icons/fa'; // Added more icons

// Define a specific type for the props the card will receive.
// This should align with the data eventually passed from HookUIPage.
export interface PlayingCardData {
  id: string; // Or number, if your company IDs are numbers
  name: string;
  tsxCode: string;
  logo?: string; // URL to the logo
  sharePrice: number | null;
  marketCap: number | null;
  production: number | null; // e.g., AuEq oz, ensure type matches data
  description: string | null;
  recentNews: string[]; // Array of news snippets
  analystRating: string | null; // e.g., "Buy", "Hold", "N/A"
  // This will be populated based on the matching logic from company-matcher.ts
  // It helps the card know which badges to display.
  matchedInterests?: string[]; 
  // Optional: to display the actual score if desired
  scoreForPrimaryInterest?: number; 
}

interface PlayingCardProps {
  company: PlayingCardData;
}

// Helper to get a default logo if none provided
const getDefaultLogo = (name: string) => {
  // Simple generative default based on first letter
  const firstLetter = name.charAt(0).toUpperCase();
  // You could use a service like ui-avatars.com or generate a simple SVG
  return `https://ui-avatars.com/api/?name=${firstLetter}&background=2D3748&color=FFFFFF&size=64&bold=true&font-size=0.5`;
};


const PlayingCard: React.FC<PlayingCardProps> = ({ company }) => {
  const [isFlipped, setIsFlipped] = useState(false);

  const handleFlip = (e: React.MouseEvent) => {
    // Prevent flip if clicking on the button on the back
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    setIsFlipped(!isFlipped);
  };
  
  // More comprehensive mapping of interests to icons and tooltips
  const interestBadges: { [key: string]: { icon: JSX.Element; title: string } } = {
    'Max Potential Returns': { icon: <FaRocket className="text-yellow-400" />, title: 'Max Potential Returns' },
    'Cautious Safe Ounces': { icon: <FaShieldAlt className="text-green-400" />, title: 'Cautious Safe Ounces' },
    'Near-Term Producers': { icon: <FaIndustry className="text-blue-400" />, title: 'Near-Term Producer' },
    'High-Grade Discoveries': { icon: <FaGem className="text-purple-400" />, title: 'High-Grade Discovery' },
    'Established Dividend Payers': { icon: <FaHandHoldingUsd className="text-teal-400" />, title: 'Dividend Payer' },
    'Speculative Exploration': { icon: <FaSearchDollar className="text-orange-400" />, title: 'Speculative Exploration' },
    'Environmentally Focused': { icon: <FaLeaf className="text-lime-500" />, title: 'Environmentally Focused' },
    'Undervalued Assets': { icon: <FaBalanceScale className="text-indigo-400" />, title: 'Undervalued Asset' },
    'High Cash Flow Generators': { icon: <FaChartLine className="text-pink-400" />, title: 'High Cash Flow' }, // FaDollarSign could also work
    'Low-Cost Producers': { icon: <FaStar className="text-red-400" />, title: 'Low-Cost Producer' }, // Placeholder, choose a better icon
  };

  const logoUrl = company.logo || getDefaultLogo(company.name);

  return (
    <motion.div
      className="relative w-72 h-96 cursor-pointer" // perspective-1000 can be on parent if many cards
      style={{ perspective: '1000px' }} // Apply perspective here
      onClick={handleFlip}
      whileHover={{ scale: 1.05 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        className="absolute w-full h-full"
        style={{ transformStyle: 'preserve-3d' }} // Correct property name
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Front of the Card */}
        <div className="absolute w-full h-full rounded-xl shadow-xl p-4 flex flex-col justify-between bg-gradient-to-br from-slate-800 via-slate-900 to-black border border-slate-700"
             style={{ backfaceVisibility: 'hidden' }} // Ensure this side is hidden when flipped
        >
          <div className="text-center">
            <img
              src={logoUrl}
              alt={`${company.name} logo`}
              className="w-16 h-16 mx-auto mb-2 rounded-full border-2 border-cyan-400 object-cover"
            />
            <h2 className="text-xl font-bold text-white truncate" title={company.name}>{company.name}</h2>
            <a
              href={`https://www.tsx.com/listings/issuer-directory/company/${company.tsxCode}`} // Updated TSX link structure
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()} // Prevent card flip when clicking link
              className="text-md font-semibold text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              TSX: {company.tsxCode} <span role="img" aria-label="Canada">🇨🇦</span>
            </a>
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

          {/* Badges based on matched interests */}
          {company.matchedInterests && company.matchedInterests.length > 0 && (
            <div className="flex justify-center items-center space-x-2 h-6">
              {company.matchedInterests.slice(0, 3).map((interestKey) => { // Show max 3 badges
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
             style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }} // Correctly position back
        >
          <h3 className="text-lg font-bold text-white mb-1 text-center">Overview</h3>
          <p className="text-xs text-slate-300 mb-2 h-16 overflow-y-auto custom-scrollbar"> {/* Custom scrollbar might need CSS */}
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
              e.stopPropagation(); // Prevent card flip
              // Assuming company.id is the TSX code for now for the URL
              // Later, this should use a proper company ID for an internal page
              window.open(`https://example.com/company/${company.id}`, '_blank'); // Placeholder link
              console.log(`Navigate to details for ${company.id}`);
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