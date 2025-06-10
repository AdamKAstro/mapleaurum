// src/components/ui/hero.tsx
import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, Crown, TrendingUp, Shield, Sparkles, ChevronDown, Play, Check, Star, Zap, Target, Gem } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, useInView, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import { Typography } from './typography';
import { Button } from './button';

interface HeroProps {
  className?: string;
}

// Template data for showcase
const templates = [
  {
    id: 'value-hunter',
    name: 'Value Hunter',
    description: 'Find undervalued stocks with strong balance sheets',
    icon: Gem,
    color: 'from-yellow-500 to-amber-600',
    bgGlow: 'bg-yellow-500/20',
    metrics: ['Low EV/oz', 'High Cash', 'Low Debt']
  },
  {
    id: 'growth-catalyst',
    name: 'Growth Catalyst',
    description: 'Target high resource expansion potential',
    icon: TrendingUp,
    color: 'from-green-500 to-emerald-600',
    bgGlow: 'bg-green-500/20',
    metrics: ['Resource Growth', 'Production Expansion', 'Strong Pipeline']
  },
  {
    id: 'stability-seeker',
    name: 'Financial Stability',
    description: 'Focus on companies with fortress balance sheets',
    icon: Shield,
    color: 'from-blue-500 to-cyan-600',
    bgGlow: 'bg-blue-500/20',
    metrics: ['Low Risk', 'Strong Cash Flow', 'Long Reserve Life']
  },
  {
    id: 'precious-pure',
    name: 'Precious Pure Play',
    description: 'High exposure to gold/silver resources',
    icon: Sparkles,
    color: 'from-purple-500 to-pink-600',
    bgGlow: 'bg-purple-500/20',
    metrics: ['Gold Focus', 'Silver Assets', 'Premium Valuations']
  },
  {
    id: 'producer-profit',
    name: 'Producer Profitability',
    description: 'Operational efficiency and margin expansion',
    icon: Target,
    color: 'from-orange-500 to-red-600',
    bgGlow: 'bg-orange-500/20',
    metrics: ['Low AISC', 'High Margins', 'Growing FCF']
  }
];

// Testimonials data
const testimonials = [
  {
    id: 1,
    name: "John Carter",
    role: "Retail Investor",
    avatar: "/avatars/avatar1.jpg",
    quote: "Found a 300% winner in minutes—ScatterScore made it incredibly easy!",
    rating: 5
  },
  {
    id: 2,
    name: "Sarah Chen",
    role: "Portfolio Manager",
    avatar: "/avatars/avatar2.jpg", 
    quote: "The templates save me hours of analysis while delivering institutional-grade insights.",
    rating: 5
  },
  {
    id: 3,
    name: "Mike Thompson",
    role: "Resource Investor",
    avatar: "/avatars/avatar3.jpg",
    quote: "Exploration Frontier helped me spot early-stage opportunities before the crowd.",
    rating: 5
  }
];

export function Hero({ className }: HeroProps) {
  const [selectedTemplate, setSelectedTemplate] = useState(templates[0]);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });

  // Parallax transforms
  const backgroundY = useTransform(scrollYProgress, [0, 1], [0, -300]);
  const bubblesY = useTransform(scrollYProgress, [0, 1], [0, -150]);
  const heroContentY = useTransform(scrollYProgress, [0, 0.5], [0, -100]);

  return (
    <div ref={containerRef} className={cn('relative min-h-screen w-full', className)}>
      
      {/* Section 1: Hero Banner */}
      <section className="relative min-h-screen flex flex-col overflow-hidden bg-gradient-to-b from-navy-900 via-navy-800 to-navy-900">
        
        {/* Animated Background */}
        <motion.div 
          className="absolute inset-0"
          style={{ y: backgroundY }}
        >
          {/* Gold particle effect */}
          <div className="absolute inset-0 opacity-20">
            {[...Array(50)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute h-1 w-1 bg-yellow-400 rounded-full"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                }}
                animate={{
                  y: [-20, 20],
                  opacity: [0.2, 1, 0.2],
                }}
                transition={{
                  duration: 3 + Math.random() * 2,
                  repeat: Infinity,
                  delay: Math.random() * 2,
                }}
              />
            ))}
          </div>
        </motion.div>

        {/* Navigation Header */}
        <header className="relative z-40 mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <nav className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="relative">
                <img
                  src="/GeminiMALBig3.jpg"
                  alt="Maple Aurum Logo"
                  className="h-12 w-12 rounded-xl object-cover ring-2 ring-white/20 group-hover:ring-yellow-400/50 transition-all"
                />
                <motion.div
                  className="absolute -inset-1 bg-gradient-to-r from-yellow-400 to-amber-600 rounded-xl opacity-0 group-hover:opacity-50 blur-lg transition-opacity"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-yellow-400 to-amber-300 bg-clip-text text-transparent">
                Maple Aurum
              </span>
            </Link>

            <div className="hidden md:flex items-center gap-8">
              <Link to="/companies" className="text-sm text-white/80 hover:text-yellow-400 transition-colors">
                Companies
              </Link>
              <Link to="/scatter-score-pro" className="text-sm text-white/80 hover:text-yellow-400 transition-colors">
                ScatterScore™
              </Link>
              <Link to="/scoring" className="text-sm text-white/80 hover:text-yellow-400 transition-colors">
                Rankings
              </Link>
              <Link to="/subscribe">
                <Button className="bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-white shadow-lg shadow-yellow-500/25">
                  <Crown className="h-4 w-4 mr-2" />
                  Upgrade to Pro
                </Button>
              </Link>
            </div>
          </nav>
        </header>

        {/* Hero Content */}
        <motion.div 
          className="relative flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8"
          style={{ y: heroContentY }}
        >
          <div className="mx-auto max-w-7xl w-full">
            <div className="text-center">
              {/* Animated badge */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-sm mb-8"
              >
                <Sparkles className="h-4 w-4" />
                <span>AI-Powered Mining Analytics</span>
              </motion.div>

              {/* Main headline */}
              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="text-5xl md:text-7xl font-bold text-white mb-6"
              >
                Uncover Winning Mining Stocks
                <span className="block mt-2 bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 bg-clip-text text-transparent">
                  with One Click
                </span>
              </motion.h1>

              {/* Subheading */}
              <motion.p
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto mb-10"
              >
                Analyze CANADIAN precious metals companies like a pro—find value, growth, and stability effortlessly.
              </motion.p>

			  {/* CTA Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.6 }}
                className="flex flex-col sm:flex-row items-center justify-center gap-4"
              >
                <Link to="/scatter-score-pro">
                  <Button size="lg" className="bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-white px-8 py-6 text-lg shadow-2xl shadow-yellow-500/25 transform hover:scale-105 transition-all">
                    <Zap className="h-5 w-5 mr-2" />
                    Try ScatterScore™ Free
                  </Button>
                </Link>
                <Link to="/companies">
                  <button className="group flex items-center gap-3 text-white hover:text-yellow-400 transition-colors">
                    <div className="h-14 w-14 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center group-hover:bg-yellow-500/20 transition-colors">
                      <ArrowRight className="h-6 w-6" />
                    </div>
                    <span className="text-lg font-medium">Browse 500+ Companies</span>
                  </button>
                </Link>
              </motion.div>
              {/* Trust indicators */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1, delay: 0.8 }}
                className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-8 text-sm text-gray-400"
              >
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-400" />
                  <span>500+ Companies Tracked</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-400" />
                  <span>50+ Key Metrics</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-400" />
                  <span>Real-Time Data</span>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
			

        {/* Animated 3D Scatter Plot Visualization */}
        <motion.div
          className="absolute bottom-0 left-0 right-0 h-96 pointer-events-none"
          style={{ y: bubblesY }}
        >
          <div className="relative h-full">
            {/* Animated bubbles representing companies */}
            {[...Array(15)].map((_, i) => (
              <motion.div
                key={i}
                className={cn(
                  "absolute rounded-full",
                  i % 3 === 0 ? "bg-yellow-400/30" : i % 3 === 1 ? "bg-green-400/30" : "bg-blue-400/30"
                )}
                style={{
                  left: `${10 + (i * 6)}%`,
                  bottom: `${20 + Math.sin(i) * 30}%`,
                  width: `${40 + i * 5}px`,
                  height: `${40 + i * 5}px`,
                }}
                animate={{
                  y: [0, -30, 0],
                  scale: [1, 1.1, 1],
                }}
                transition={{
                  duration: 3 + i * 0.5,
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
              />
            ))}
          </div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <ChevronDown className="h-8 w-8 text-white/50" />
        </motion.div>
      </section>

      {/* Section 2: Problem & Solution */}
      <section className="relative py-24 bg-gradient-to-b from-navy-900 to-navy-800 overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Mining Stocks Are Complex.
              <span className="block mt-2 bg-gradient-to-r from-yellow-400 to-amber-400 bg-clip-text text-transparent">
                We Make It Simple.
              </span>
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Sifting through reserves, cash flows, and valuations is time-consuming and confusing. 
              ScatterScore™ turns complex data into clear, actionable insights.
            </p>
          </motion.div>

          {/* Split screen comparison */}
          <div className="grid md:grid-cols-2 gap-8 items-center">
            {/* Before - Complex */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="relative"
            >
              <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-8">
                <h3 className="text-2xl font-semibold text-red-400 mb-4">The Old Way</h3>
                <ul className="space-y-3 text-gray-400">
                  <li className="flex items-start gap-3">
                    <span className="text-red-500 mt-1">✗</span>
                    <span>Hours analyzing spreadsheets and reports</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-red-500 mt-1">✗</span>
                    <span>Complex calculations and ratios</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-red-500 mt-1">✗</span>
                    <span>Missing opportunities in the noise</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-red-500 mt-1">✗</span>
                    <span>No clear visualization of relationships</span>
                  </li>
                </ul>
                {/* Chaotic data visualization */}
                <div className="mt-6 relative h-48 overflow-hidden rounded-lg bg-black/30">
                  <img 
                    src="/chaos-data.jpg" 
                    alt="Complex data"
                    className="absolute inset-0 w-full h-full object-cover opacity-50 blur-sm"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-red-400 text-6xl">?</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* After - Simple */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="relative"
            >
              <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-8">
                <h3 className="text-2xl font-semibold text-green-400 mb-4">The ScatterScore™ Way</h3>
                <ul className="space-y-3 text-gray-300">
                  <li className="flex items-start gap-3">
                    <span className="text-green-500 mt-1">✓</span>
                    <span>Instant visual insights with one click</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-green-500 mt-1">✓</span>
                    <span>Pre-built templates for every strategy</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-green-500 mt-1">✓</span>
                    <span>Spot winners and outliers immediately</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-green-500 mt-1">✓</span>
                    <span>Interactive charts reveal hidden gems</span>
                  </li>
                </ul>
                {/* Clean chart preview */}
                <div className="mt-6 relative h-48 overflow-hidden rounded-lg bg-gradient-to-br from-navy-700/50 to-navy-800/50 border border-green-500/20">
                  <img 
                    src="/ScatterScore1b.jpg" 
                    alt="ScatterScore Chart"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <motion.div
                    className="absolute top-4 right-4 bg-green-500 text-white text-xs px-2 py-1 rounded-full"
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    Live Demo
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Section 3: Interactive Demo */}
      <section className="relative py-24 bg-gradient-to-b from-navy-800 to-navy-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Explore Stocks Your Way
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Choose a template, see insights instantly. From value plays to exploration gems, 
              find what fits your strategy.
            </p>
          </motion.div>

          {/* Interactive Chart Demo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="bg-navy-800/50 backdrop-blur-sm rounded-2xl p-6 border border-navy-700"
          >
            {/* Template selector */}
            <div className="flex flex-wrap gap-3 mb-6 justify-center">
              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => setSelectedTemplate(template)}
                  className={cn(
                    "px-4 py-2 rounded-lg flex items-center gap-2 transition-all",
                    selectedTemplate.id === template.id
                      ? "bg-gradient-to-r text-white shadow-lg"
                      : "bg-navy-700/50 text-gray-400 hover:text-white hover:bg-navy-700"
                  )}
                  style={{
                    backgroundImage: selectedTemplate.id === template.id 
                      ? `linear-gradient(to right, var(--tw-gradient-stops))`
                      : undefined,
                    '--tw-gradient-from': selectedTemplate.id === template.id 
                      ? template.color.split(' ')[1] 
                      : undefined,
                    '--tw-gradient-to': selectedTemplate.id === template.id 
                      ? template.color.split(' ')[3] 
                      : undefined,
                  }}
                >
                  <template.icon className="h-4 w-4" />
                  <span className="text-sm font-medium">{template.name}</span>
                </button>
              ))}
            </div>

            {/* Chart area */}
            <div className="relative h-[500px] bg-navy-900/50 rounded-xl overflow-hidden">
              <img 
                src="/ScatterScore2b.jpg"
                alt="Interactive ScatterScore Demo"
                className="absolute inset-0 w-full h-full object-cover"
              />
              
              {/* Overlay with interactive hints */}
              <div className="absolute inset-0 bg-gradient-to-t from-navy-900/80 via-transparent to-transparent">
                {/* Animated bubble highlights */}
                <motion.div
                  className="absolute top-1/3 left-1/4 w-16 h-16 rounded-full bg-yellow-400/30 blur-xl"
                  animate={{
                    scale: [1, 1.3, 1],
                    opacity: [0.3, 0.6, 0.3],
                  }}
                  transition={{ duration: 3, repeat: Infinity }}
                />
                <motion.div
                  className="absolute top-1/2 right-1/3 w-20 h-20 rounded-full bg-green-400/30 blur-xl"
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.3, 0.5, 0.3],
                  }}
                  transition={{ duration: 4, repeat: Infinity, delay: 1 }}
                />
              </div>

              {/* Template info overlay */}
              <motion.div
                key={selectedTemplate.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute bottom-6 left-6 right-6 bg-black/80 backdrop-blur-sm rounded-lg p-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                      <selectedTemplate.icon className="h-5 w-5 text-yellow-400" />
                      {selectedTemplate.name}
                    </h3>
                    <p className="text-sm text-gray-400 mt-1">{selectedTemplate.description}</p>
                    <div className="flex gap-2 mt-3">
                      {selectedTemplate.metrics.map((metric, i) => (
                        <span key={i} className="text-xs px-2 py-1 rounded bg-navy-700 text-gray-300">
                          {metric}
                        </span>
                      ))}
                    </div>
                  </div>
                  <Link to="/scatter-score-pro">
                    <Button size="sm" className="bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500">
                      Try It Free
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              </motion.div>
            </div>

            {/* Feature highlights */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="bg-navy-700/30 rounded-lg p-4 text-center">
                <Zap className="h-8 w-8 text-yellow-400 mx-auto mb-2" />
                <h4 className="text-sm font-semibold text-white">Instant Analysis</h4>
                <p className="text-xs text-gray-400 mt-1">Complex calculations in milliseconds</p>
              </div>
              <div className="bg-navy-700/30 rounded-lg p-4 text-center">
                <Target className="h-8 w-8 text-green-400 mx-auto mb-2" />
                <h4 className="text-sm font-semibold text-white">Spot Opportunities</h4>
                <p className="text-xs text-gray-400 mt-1">Visual patterns reveal hidden gems</p>
              </div>
              <div className="bg-navy-700/30 rounded-lg p-4 text-center">
                <Shield className="h-8 w-8 text-blue-400 mx-auto mb-2" />
                <h4 className="text-sm font-semibold text-white">Risk Assessment</h4>
                <p className="text-xs text-gray-400 mt-1">Balance returns with safety metrics</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Section 4: Template Showcase */}
      <section className="relative py-24 bg-gradient-to-b from-navy-900 via-navy-800 to-navy-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Tailored for Every Investor
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Whether you're hunting bargains or betting on growth, our templates deliver insights in seconds.
            </p>
          </motion.div>

          {/* Template cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.slice(0, 6).map((template, index) => (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <div className={cn(
                  "group relative bg-navy-800/50 backdrop-blur-sm rounded-2xl p-6 border border-navy-700 hover:border-opacity-50 transition-all duration-300",
                  "hover:shadow-2xl hover:shadow-black/50 hover:-translate-y-1"
                )}>
                  {/* Gradient background on hover */}
                  <div className={cn(
                    "absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-10 transition-opacity",
                    template.bgGlow
                  )} />

                  {/* Icon */}
                  <div className={cn(
                    "inline-flex p-3 rounded-xl mb-4",
                    "bg-gradient-to-br",
                    template.color
                  )}>
                    <template.icon className="h-6 w-6 text-white" />
                  </div>

                  {/* Content */}
                  <h3 className="text-xl font-semibold text-white mb-2">{template.name}</h3>
                  <p className="text-gray-400 text-sm mb-4">{template.description}</p>

                  {/* Metrics */}
                  <div className="space-y-2 mb-4">
                    {template.metrics.map((metric, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <Check className="h-3 w-3 text-green-400" />
                        <span className="text-gray-300">{metric}</span>
                      </div>
                    ))}
                  </div>

                  {/* CTA */}
                  <Link to="/scatter-score-pro" className="block">
                    <Button 
                      variant="ghost" 
                      className="w-full group-hover:bg-white/10 transition-colors"
                    >
                      <span className="bg-gradient-to-r from-yellow-400 to-amber-400 bg-clip-text text-transparent">
                        Use This Template
                      </span>
                      <ArrowRight className="h-4 w-4 ml-2 text-yellow-400" />
                    </Button>
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Additional screenshots showcase */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            <div className="relative group overflow-hidden rounded-xl">
              <img 
                src="/Comp1b.jpg"
                alt="Companies Table"
                className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-4">
                <div>
                  <h4 className="text-white font-semibold">Companies Database</h4>
                  <p className="text-gray-300 text-sm">500+ tracked companies</p>
                </div>
              </div>
            </div>
            <div className="relative group overflow-hidden rounded-xl">
              <img 
                src="/Score1b.jpg"
                alt="Scoring Page"
                className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-4">
                <div>
                  <h4 className="text-white font-semibold">Smart Rankings</h4>
                  <p className="text-gray-300 text-sm">AI-powered scoring system</p>
                </div>
              </div>
            </div>
            <div className="relative group overflow-hidden rounded-xl">
              <img 
                src="/ScatterScore1b.jpg"
                alt="Analysis Tools"
                className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-4">
                <div>
                  <h4 className="text-white font-semibold">Advanced Analytics</h4>
                  <p className="text-gray-300 text-sm">Professional-grade tools</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Section 5: Social Proof */}
      <section className="relative py-24 bg-gradient-to-b from-navy-900 to-navy-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Trusted by Investors Like You
            </h2>
            <div className="flex items-center justify-center gap-1 mb-4">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-6 w-6 fill-yellow-400 text-yellow-400" />
              ))}
            </div>
            <p className="text-lg text-gray-300">4.9/5 from 200+ investors</p>
          </motion.div>

          {/* Testimonials */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={testimonial.id}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-navy-800/50 backdrop-blur-sm rounded-2xl p-6 border border-navy-700"
              >
                {/* Quote */}
                <div className="mb-6">
                  <div className="flex gap-1 mb-3">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-gray-300 italic">"{testimonial.quote}"</p>
                </div>

                {/* Author */}
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center text-white font-semibold">
                    {testimonial.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <p className="text-white font-semibold">{testimonial.name}</p>
                    <p className="text-gray-400 text-sm">{testimonial.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8"
          >
            <div className="text-center">
              <div className="text-4xl font-bold bg-gradient-to-r from-yellow-400 to-amber-400 bg-clip-text text-transparent">
                500+
              </div>
              <p className="text-gray-400 mt-2">Companies Tracked</p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                50+
              </div>
              <p className="text-gray-400 mt-2">Key Metrics</p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                24/7
              </div>
              <p className="text-gray-400 mt-2">Real-Time Updates</p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                5min
              </div>
              <p className="text-gray-400 mt-2">To First Insight</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Section 6: Final CTA */}
      <section className="relative py-24 bg-gradient-to-b from-navy-800 to-navy-900 overflow-hidden">
        {/* Background animation */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/10 via-transparent to-amber-500/10 animate-pulse" />
        </div>

        <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-5xl md:text-6xl font-bold text-white mb-6">
              Start Finding Winners Today
            </h2>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Join hundreds of investors using ScatterScore™ to uncover opportunities in Canadian mining stocks.
            </p>

            {/* CTA buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
              <Link to="/scatter-score-pro">
                <Button 
                  size="lg" 
                  className="bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-white px-10 py-6 text-lg shadow-2xl shadow-yellow-500/25 transform hover:scale-105 transition-all"
                >
                  <Zap className="h-6 w-6 mr-2" />
                  Start Free Trial
                </Button>
              </Link>
              <Link to="/subscribe">
                <Button 
                  size="lg"
                  variant="outline" 
                  className="border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10 px-10 py-6 text-lg"
                >
                  <Crown className="h-6 w-6 mr-2" />
                  View Pro Plans
                </Button>
              </Link>
            </div>

            {/* Trust badges */}
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-green-400" />
                <span>Bank-Level Security</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-400" />
                <span>No Credit Card Required</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-blue-400" />
                <span>Cancel Anytime</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Video Modal */}
      <AnimatePresence>
        {isVideoPlaying && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setIsVideoPlaying(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="relative w-full max-w-4xl aspect-video bg-black rounded-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <iframe
                src="https://www.youtube.com/embed/dQw4w9WgXcQ"
                className="absolute inset-0 w-full h-full"
                allowFullScreen
              />
              <button
                onClick={() => setIsVideoPlaying(false)}
                className="absolute top-4 right-4 text-white/80 hover:text-white"
              >
                <X className="h-8 w-8" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}