//src/components/ui/hero.tsx
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
  return (
    <div
      className={cn(
        'relative min-h-[90vh] w-full overflow-hidden bg-gradient-to-b from-navy-900 via-navy-800 to-navy-900',
        className
      )}
    >
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-10"
        style={{ backgroundImage: "url('/Background2.jpg')" }}
      />

      {/* Noise texture overlay */}
      <div className="absolute inset-0 bg-noise opacity-30"></div>

      {/* Header */}
      <header className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <nav className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img
              src="/new-logo.png"
              alt="New Logo"
              className="h-10 w-10 rounded-xl object-cover"
            />
            <span className="text-lg font-bold text-surface-white">Mining Analytics</span>
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
      <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-8">
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

          {/* Right Column */}
          <div className="relative lg:mt-24">
            {/* Stats Card */}
            <div className="absolute right-0 top-0 lg:top-1/2 lg:-translate-y-1/2 w-full lg:w-96">
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
                    <div className="text-2xl font-bold text-accent-yellow">500</div>
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
      </div>

      {/* Bottom Wave */}
      <div className="absolute bottom-0 left-0 right-0">
        <div className="h-24 bg-gradient-to-t from-navy-900 to-transparent opacity-50"></div>
      </div>
    </div>
  );
}