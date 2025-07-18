// src/features/hook-ui/components/onboarding/RiskProfilePlaceholder.tsx
import React from 'react';

interface RiskProfilePlaceholderProps {
  onComplete: () => void;
}

const RiskProfilePlaceholder: React.FC<RiskProfilePlaceholderProps> = ({ onComplete }) => {
  return (
    <div className="bg-slate-800 p-6 md:p-8 rounded-xl shadow-2xl my-8 max-w-2xl mx-auto text-center border border-slate-700">
      <h3 className="text-2xl md:text-3xl font-semibold text-cyan-400 mb-4">
        Build Your Investor Profile
      </h3>
      <p className="text-slate-300 mb-6 md:text-lg">
        The next step in refining your company suggestions would involve a few questions about your investment style and risk tolerance. 
        This feature is currently under development.
      </p>
      <div className="my-8">
        {/* Placeholder for future form elements or interactive content */}
        <div className="space-y-4 animate-pulse">
          <div className="h-5 bg-slate-700 rounded w-3/4 mx-auto"></div>
          <div className="h-5 bg-slate-700 rounded w-5/6 mx-auto"></div>
          <div className="h-5 bg-slate-700 rounded w-1/2 mx-auto"></div>
        </div>
      </div>
      <button 
        onClick={onComplete} 
        type="button" // Explicitly set button type
        className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-8 rounded-lg transition-colors text-lg shadow-md hover:shadow-lg transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-green-400"
      >
        Continue to Showcase
      </button>
    </div>
  );
};

export default RiskProfilePlaceholder;