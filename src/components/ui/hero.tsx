// src/components/ui/hero.tsx
import React from 'react';
import { ArrowRight, Crown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { Typography } from './typography';
import { Button } from './button';

interface HeroProps {
  className?: string;
}

export function Hero({ className }: HeroProps) {
  // Placeholder URLs for images - replace with your actual image paths if different
  // Ensure these images are in your /public folder
  const scatterImageUrl = "/ScatterJPG.jpg";
  const compImageUrl = "/CompJPG.jpg";
  const placeholderErrorUrl = (width: number, height: number, text: string) => `https://placehold.co/${width}x${height}/334155/E2E8F0?text=${encodeURIComponent(text)}`;


  return (
    <div
      className={cn(
        'relative min-h-[90vh] w-full overflow-hidden bg-gradient-to-b from-navy-900 via-navy-800 to-navy-900',
        'flex flex-col', // Added to help with potential centering/spacing if needed later
        className
      )}
    >
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-10 -z-20" // Ensure it's behind everything
        style={{ backgroundImage: "url('/Background2.jpg')" }}
      />

      {/* Noise texture overlay */}
      <div className="absolute inset-0 bg-noise opacity-30 -z-10"></div> {/* Ensure it's behind content but above bg image */}

      {/* Header (This is the Hero's own header, not the main site header) */}
      <header className="relative mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 z-10"> {/* Ensure header is above noise/bg */}
        <nav className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img
              src="/new-logo.png"
              alt="Maple Aurum Logo" // Changed alt text to be more descriptive
              className="h-10 w-10 rounded-xl object-cover"
            />
            <span className="text-lg font-bold text-surface-white">Maple Aurum</span> {/* Changed from Mining Analytics for consistency */}
          </Link>

          {/* Navigation */}
          <div className="hidden md:flex items-center gap-6">
            <Link
              to="/companies"
              className="text-sm text-surface-white/70 hover:text-surface-white transition-colors"
            >
              Companies
            </Link>
            <Link
              to="/scatter-chart"
              className="text-sm text-surface-white/70 hover:text-surface-white transition-colors"
            >
              Analysis
            </Link>
            <Link
              to="/scoring"
              className="text-sm text-surface-white/70 hover:text-surface-white transition-colors"
            >
              Rankings
            </Link>
          </div>

          {/* CTA Button */}
          <Link to="/subscribe">
            <Button
              variant="outline"
              size="sm"
              className="bg-navy-400/40 border-navy-300/20 text-surface-white hover:bg-navy-400/60 hover:border-navy-300/40"
            >
              <Crown className="h-4 w-4 mr-2" />
              Upgrade
            </Button>
          </Link>
        </nav>
      </header>

      {/* Hero Content */}
      <div className="relative mx-auto max-w-7xl w-full px-4 py-16 sm:px-6 lg:px-8 flex-grow flex flex-col justify-center z-10"> {/* Added flex-grow and justify-center, ensure z-index */}
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-8 items-center"> {/* Added items-center */}
          {/* Left Column */}
          <div className="max-w-2xl">
            <div className="relative">
              {/* Accent Circle */}
              <div className="absolute -left-8 top-1 h-6 w-6 rounded-full bg-accent-yellow ring-4 ring-accent-yellow/30"></div>

              <Typography
                variant="h1"
                className="text-3xl sm:text-4xl lg:text-5xl text-surface-white"
              >
                Advanced Analytics for Mining Companies
              </Typography>
            </div>

            <Typography
              variant="subtitle"
              className="mt-6 text-sm sm:text-base text-surface-white/70"
            >
              Comprehensive analysis and insights for Canadian precious metals
              companies. Track performance, compare metrics, and discover
              opportunities in the mining sector.
            </Typography>

            <div className="mt-8 flex items-center gap-4">
              <Link to="/companies">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-accent-yellow to-accent-brown hover:from-accent-yellow/90 hover:to-accent-brown/90 text-surface-white"
                >
                  View Companies
                </Button>
              </Link>
              <Link
                to="/scatter-chart"
                className="group inline-flex items-center gap-2 text-accent-yellow hover:text-accent-yellow/80 transition-colors"
              >
                Analyze Data
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>

          {/* Right Column - Stats Card */}
          <div className="relative lg:mt-0"> {/* Adjusted lg:mt-24 to lg:mt-0 for better alignment with text */}
            <div className="w-full lg:max-w-md mx-auto lg:mx-0 lg:ml-auto"> {/* Adjusted width and alignment */}
              <div className="rounded-2xl bg-navy-800/50 p-6 backdrop-blur-sm border border-navy-700/50">
                <Typography variant="h3" className="text-lg sm:text-xl text-surface-white">
                  Comprehensive Mining Analytics
                </Typography>
                <Typography
                  variant="body"
                  className="mt-3 text-sm text-surface-white/70"
                >
                  Track key metrics, analyze performance, and make data-driven
                  decisions with our advanced mining analytics platform.
                </Typography>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div className="rounded-lg bg-navy-700/50 p-3">
                    <div className="text-2xl font-bold text-accent-yellow">500+</div> {/* Added + for mock data */}
                    <div className="text-xs text-surface-white/70">
                      Companies Tracked
                    </div>
                  </div>
                  <div className="rounded-lg bg-navy-700/50 p-3">
                    <div className="text-2xl font-bold text-accent-teal">50+</div>
                    <div className="text-xs text-surface-white/70">Key Metrics</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* --- NEW Image Stack Section --- */}
        <div className="mt-16 lg:mt-24 xl:mt-32 flex justify-center items-center"> {/* Added items-center for vertical centering if content above is shorter */}
          <div className="relative w-full sm:w-3/4 md:w-2/3 lg:w-1/2 xl:w-[45%]"> {/* Container for sizing & positioning the stack */}
            {/* CompJPG.jpg - Bottom Image */}
            <img
              src={compImageUrl}
              alt="Mining Companies Dashboard Preview"
              className="relative z-10 w-full rounded-lg shadow-2xl aspect-[4/3] object-cover transform transition-all duration-300 hover:scale-105"
              onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = placeholderErrorUrl(800, 600, 'Companies Preview'); }}
            />
            {/* ScatterJPG.jpg - Top Image, offset */}
            <img
              src={scatterImageUrl}
              alt="Mining Scatter Chart Analysis Preview"
              className={cn(
                "absolute z-20 w-full rounded-lg shadow-2xl aspect-[4/3] object-cover",
                "transform transition-all duration-300 hover:scale-105",
                "top-0 left-0", // Start at the same position as the bottom image
                "translate-x-[15%] -translate-y-[15%]", // Offset: 15% of its own width to right, 15% up
                "hover:translate-x-[18%] hover:-translate-y-[18%] hover:z-30" // Slightly more offset on hover
              )}
              onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = placeholderErrorUrl(800, 600, 'Scatter Preview'); }}
            />
          </div>
        </div>
      </div>

      {/* Bottom Wave - ensure it's behind the image stack if stack goes very low */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-navy-900 via-navy-800/50 to-transparent -z-1"> {/* Adjusted z-index and opacity for wave */}
      </div>
    </div>
  );
}