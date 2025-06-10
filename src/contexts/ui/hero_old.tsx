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
  // Ensure these images are in your /public folder and paths are correct
  const scatterImageUrl = "/ScatterJPG.jpg";
  const compImageUrl = "/CompJPG.jpg";
  const backgroundImageUrl = "/GeminiMAB1.jpg"; // Path for the main background

  const placeholderErrorUrl = (width: number, height: number, text: string) => `https://placehold.co/${width}x${height}/1E293B/94A3B8?text=${encodeURIComponent(text)}`;


  return (
    <div
      className={cn(
        'relative min-h-[90vh] w-full overflow-hidden', // Removed explicit background gradient here
        'flex flex-col',
        className
      )}
    >
      {/* Background Image Layer */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-10 -z-20" // Lowermost layer
        style={{ backgroundImage: `url('${backgroundImageUrl}')` }}
        aria-hidden="true"
      />

      {/* Noise texture overlay Layer */}
      <div className="absolute inset-0 bg-noise opacity-30 -z-10" aria-hidden="true"></div> {/* Above background image, below content */}

      {/* Header (This is the Hero's own header, not the main site header) */}
      <header className="relative mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 z-20"> {/* Ensure header is above overlays */}
        <nav className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img
              src="/GeminiMALBig3.jpg"
              alt="Maple Aurum Logo"
              className="h-10 w-10 rounded-xl object-cover"
            />
            <span className="text-lg font-bold text-surface-white">Maple Aurum</span>
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
      <div className="relative mx-auto max-w-7xl w-full px-4 py-16 sm:py-20 md:py-24 lg:py-28 xl:py-32 flex-grow flex flex-col justify-center z-10"> {/* Adjusted padding, ensure z-index */}
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-8 items-center">
          {/* Left Column */}
          <div className="max-w-2xl text-center lg:text-left"> {/* Added text-center for smaller screens */}
            <div className="relative inline-block"> {/* For accent circle positioning relative to text block */}
              {/* Accent Circle - Adjusted positioning for better responsiveness */}
              <div className="absolute -left-4 -top-2 sm:-left-6 sm:-top-1 h-6 w-6 rounded-full bg-accent-yellow ring-4 ring-accent-yellow/30 hidden sm:block"></div>

              <Typography
                variant="h1"
                className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl text-surface-white" // Added tracking-tight
              >
                Advanced Analytics for Mining Companies
              </Typography>
            </div>

            <Typography
              variant="subtitle"
              className="mt-6 text-base sm:text-lg text-surface-white/70 max-w-xl mx-auto lg:mx-0" // Increased text size, max-width for readability
            >
              Comprehensive analysis and insights for Canadian precious metals
              companies. Track performance, compare metrics, and discover
              opportunities in the mining sector.
            </Typography>

            <div className="mt-10 flex items-center justify-center lg:justify-start gap-4"> {/* Adjusted margin, justify for mobile */}
              <Link to="/companies">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-accent-yellow to-accent-brown hover:from-accent-yellow/90 hover:to-accent-brown/90 text-surface-white px-8 py-3 text-base" // Made button larger
                >
                  View Companies
                </Button>
              </Link>
              <Link
                to="/scatter-chart"
                className="group inline-flex items-center gap-2 text-accent-yellow hover:text-accent-yellow/80 transition-colors text-base font-medium" // Made text larger
              >
                Analyze Data
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" /> {/* Made arrow slightly larger */}
              </Link>
            </div>
          </div>

          {/* Right Column - Stats Card */}
          <div className="relative lg:mt-0 mt-12"> {/* Added margin top for mobile */}
            <div className="w-full lg:max-w-md mx-auto lg:mx-0 lg:ml-auto">
              <div className="rounded-2xl bg-navy-800/50 p-6 backdrop-blur-md border border-navy-700/50 shadow-xl"> {/* Increased blur and shadow */}
                <Typography variant="h3" className="text-lg sm:text-xl font-semibold text-surface-white"> {/* Added font-semibold */}
                  Comprehensive Mining Analytics
                </Typography>
                <Typography
                  variant="body"
                  className="mt-3 text-sm text-surface-white/70"
                >
                  Track key metrics, analyze performance, and make data-driven
                  decisions with our advanced mining analytics platform.
                </Typography>
                <div className="mt-6 grid grid-cols-2 gap-4"> {/* Increased margin */}
                  <div className="rounded-lg bg-navy-700/60 p-4"> {/* Increased padding and bg opacity */}
                    <div className="text-3xl font-bold text-accent-yellow">500+</div>
                    <div className="text-xs text-surface-white/70 mt-1">
                      Companies Tracked
                    </div>
                  </div>
                  <div className="rounded-lg bg-navy-700/60 p-4"> {/* Increased padding and bg opacity */}
                    <div className="text-3xl font-bold text-accent-teal">50+</div>
                    <div className="text-xs text-surface-white/70 mt-1">Key Metrics</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* --- Image Stack Section --- */}
        <div className="mt-20 sm:mt-24 md:mt-28 lg:mt-32 xl:mt-36 flex justify-center items-center pb-10"> {/* Increased top margin, added padding-bottom */}
          {/* Adjusted width for the image stack container to make it ~20% larger */}
          <div className="relative w-full sm:w-4/5 md:w-3/4 lg:w-2/3 xl:w-3/5">
            {/* CompJPG.jpg - Bottom Image */}
            <img
              src={compImageUrl}
              alt="Mining Companies Dashboard Preview"
              className="relative z-10 w-full rounded-xl shadow-2xl aspect-[16/10] object-cover transform transition-all duration-300 hover:scale-[1.03] border-[6px] border-slate-800" // Added border
              onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = placeholderErrorUrl(800, 500, 'Companies Dashboard Preview'); }}
            />
            {/* ScatterJPG.jpg - Top Image, offset */}
            <img
              src={scatterImageUrl}
              alt="Mining Scatter Chart Analysis Preview"
              className={cn(
                "absolute z-20 w-full rounded-xl shadow-2xl aspect-[16/10] object-cover",
                "transform transition-all duration-300 hover:scale-[1.03]",
                "top-0 left-0",
                "translate-x-[25%] -translate-y-[25%]", // Offset remains 25%
                "hover:translate-x-[28%] hover:-translate-y-[28%] hover:z-30",
                "border-[6px] border-slate-800" // Added border
              )}
              onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = placeholderErrorUrl(800, 500, 'Scatter Chart Preview'); }}
            />
          </div>
        </div>
      </div>

      {/* Bottom Wave - ensure it's behind the image stack */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-navy-900 via-navy-900/70 to-transparent -z-5"> {/* Adjusted z-index and gradient */}
      </div>
    </div>
  );
}
