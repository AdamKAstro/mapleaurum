// src/pages/glass-customization.tsx
import React from 'react';
import { GlassCustomizationTool } from '../components/glass-customization-tool';
import { ArrowLeft } from 'lucide-react';

export function GlassCustomizationPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Background pattern for better glass effect visibility */}
      <div 
        className="fixed inset-0 opacity-10"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}
      />
      
      <div className="relative z-10 p-8">
        {/* Header */}
        <header className="max-w-7xl mx-auto mb-12">
          {/* Simple back to home button since this is admin only */}
          <button 
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 text-white/70 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          
          <h1 className="text-4xl font-bold text-white mb-4">
            Glass Customization Tool
          </h1>
          <p className="text-xl text-white/70">
            Create and customize beautiful glassmorphic effects for your components
          </p>
        </header>

        {/* Main Content */}
        <GlassCustomizationTool />

        {/* Additional Info */}
        <div className="max-w-7xl mx-auto mt-12">
          <div className="glass-light glass-blur-sm rounded-xl p-6">
            <h3 className="text-white font-semibold mb-3">💡 Pro Tips</h3>
            <ul className="text-white/70 text-sm space-y-2">
              <li>• Combine multiple classes for unique effects</li>
              <li>• Use lighter glass effects for better text readability</li>
              <li>• Add <code className="text-green-400">glass-interactive</code> for hover effects</li>
              <li>• Test on different backgrounds - glass effects vary greatly</li>
              <li>• Consider performance on mobile devices with heavy blur</li>
              <li>• Use CSS variables with <code className="text-green-400">glass-custom</code> for dynamic effects</li>
              <li>• The shimmer animations work best on larger components</li>
              <li>• Neumorphic effects look best without borders</li>
            </ul>
          </div>

          {/* Quick Reference */}
          <div className="glass-light glass-blur-sm rounded-xl p-6 mt-6">
            <h3 className="text-white font-semibold mb-3">🎯 Quick Reference</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="text-white/90 font-medium mb-2">Most Popular Combinations:</h4>
                <ul className="text-white/70 space-y-1">
                  <li>• <code className="text-green-400">glass-medium glass-blur-md</code> - Standard glass</li>
                  <li>• <code className="text-green-400">glass-frosted glass-blur-xl</code> - Apple style</li>
                  <li>• <code className="text-green-400">glass-premium glass-shimmer</code> - Luxury feel</li>
                  <li>• <code className="text-green-400">glass-blue glass-interactive</code> - Interactive colored</li>
                  <li>• <code className="text-green-400">glass-metallic glass-border-glow</code> - Metallic shine</li>
                </ul>
              </div>
              <div>
                <h4 className="text-white/90 font-medium mb-2">Performance Tips:</h4>
                <ul className="text-white/70 space-y-1">
                  <li>• Mobile: Use <code className="text-green-400">glass-blur-sm</code> or <code className="text-green-400">glass-blur-md</code></li>
                  <li>• Animations: Limit to 1-2 animated elements per view</li>
                  <li>• Large areas: Use lighter effects like <code className="text-green-400">glass-light</code></li>
                  <li>• Fallbacks: Always include <code className="text-green-400">glass-opacity-*</code></li>
                  <li>• Testing: Check on actual devices, not just browser</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}