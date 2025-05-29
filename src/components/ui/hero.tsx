// src/components/ui/hero.tsx
import React, { useState, useRef, useEffect } from 'react';
import { ArrowRight, Crown, TrendingUp, Shield, Sparkles, ChevronDown, Check, Zap, Target, Gem, Filter, BarChart3, Layers, Database, LineChart, Search } from 'lucide-react';
import { motion, useScroll, useTransform, useInView, AnimatePresence } from 'framer-motion';

// Simple button component
const Button = ({ children, className, size = "default", variant = "default", ...props }) => {
  const sizes = {
    default: "px-4 py-2",
    sm: "px-3 py-1.5 text-sm",
    lg: "px-6 py-3 text-lg"
  };
  
  const variants = {
    default: "bg-primary text-white hover:bg-primary/90",
    outline: "border border-current bg-transparent hover:bg-white/10"
  };
  
  return (
    <button
      className={`inline-flex items-center justify-center rounded-lg font-medium transition-all ${sizes[size]} ${variants[variant]} ${className}`}
      style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}
      {...props}
    >
      {children}
    </button>
  );
};

// Utility for className combination
const cn = (...classes) => classes.filter(Boolean).join(' ');

interface HeroProps {
  className?: string;
}

// Feature cards for the technical capabilities
const technicalFeatures = [
  {
    icon: Database,
    title: "500+ Companies",
    description: "Comprehensive Canadian precious metals database",
    highlight: "Real-time data"
  },
  {
    icon: Filter,
    title: "Advanced Filtering",
    description: "50+ metrics to analyze and compare",
    highlight: "Institutional-grade"
  },
  {
    icon: LineChart,
    title: "Dynamic Charting",
    description: "Interactive scatter plots reveal patterns",
    highlight: "AI-powered insights"
  },
  {
    icon: Target,
    title: "Smart Scoring",
    description: "Proprietary algorithms rank opportunities",
    highlight: "Multi-factor analysis"
  }
];

// Process flow for storytelling
const processSteps = [
  {
    number: "01",
    title: "Browse Companies",
    description: "Access our comprehensive database of 500+ Canadian precious metals companies",
    image: "/Comp1b.jpg",
    features: ["Live market data", "Company profiles", "Financial metrics"]
  },
  {
    number: "02",
    title: "Filter & Sort",
    description: "Narrow down using 50+ metrics tailored for mining investors",
    image: "/CompJPG.jpg",
    features: ["Market cap ranges", "Resource metrics", "Production data"]
  },
  {
    number: "03",
    title: "Visualize Relationships",
    description: "ScatterScore™ charts reveal hidden opportunities instantly",
    image: "/ScatterScore1b.jpg",
    features: ["Interactive plots", "Custom axes", "Pattern recognition"]
  },
  {
    number: "04",
    title: "Analyze Scores",
    description: "Our AI ranks companies based on your investment strategy",
    image: "/Score1b.jpg",
    features: ["Multi-factor scoring", "Strategy templates", "Risk assessment"]
  },
  {
    number: "05",
    title: "Chart the Winners",
    description: "Combine scores with fundamentals for ultimate insights",
    image: "/ScatterScore2b.jpg",
    features: ["Score vs metrics", "Outlier detection", "Portfolio optimization"]
  }
];

export function Hero({ className }: HeroProps) {
  const [activeStep, setActiveStep] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });

  // Parallax transforms
  const heroY = useTransform(scrollYProgress, [0, 1], [0, -200]);
  const fadeOut = useTransform(scrollYProgress, [0, 0.3], [1, 0]);

  // Auto-rotate through process steps (slower pace)
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % processSteps.length);
    }, 8000); // Slower rotation - 8 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <div ref={containerRef} className={cn('relative w-full', className)} style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      
      {/* Section 1: Hero Banner with Technical Focus */}
      <section className="relative min-h-screen flex flex-col overflow-hidden bg-gradient-to-b from-navy-900 via-navy-800 to-navy-900">
        
        {/* Animated Background Grid */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0" style={{
            backgroundImage: `linear-gradient(to right, #ffffff10 1px, transparent 1px),
                              linear-gradient(to bottom, #ffffff10 1px, transparent 1px)`,
            backgroundSize: '50px 50px'
          }}>
            <motion.div
              className="absolute inset-0"
              animate={{
                backgroundPosition: ['0px 0px', '50px 50px']
              }}
              transition={{
                duration: 20,
                repeat: Infinity,
                ease: 'linear'
              }}
              style={{
                backgroundImage: 'radial-gradient(circle at 50% 50%, #fbbf2440 0%, transparent 50%)',
                backgroundSize: '100px 100px'
              }}
            />
          </div>
        </div>

        {/* Floating Bubble Effect */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full"
              style={{
                width: `${20 + Math.random() * 40}px`,
                height: `${20 + Math.random() * 40}px`,
                left: `${Math.random() * 100}%`,
                top: `${100 + Math.random() * 100}%`,
                background: i % 3 === 0 
                  ? 'radial-gradient(circle, rgba(251, 191, 36, 0.1) 0%, transparent 70%)'
                  : i % 3 === 1
                  ? 'radial-gradient(circle, rgba(34, 197, 94, 0.1) 0%, transparent 70%)'
                  : 'radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 70%)'
              }}
              animate={{
                y: [-window.innerHeight - 100, -200],
                x: [0, (Math.random() - 0.5) * 100],
                scale: [1, 1.1, 1],
              }}
              transition={{
                duration: 15 + Math.random() * 10,
                repeat: Infinity,
                ease: 'linear',
                delay: Math.random() * 10,
              }}
            />
          ))}
        </div>

        {/* Subtle Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-[0.02]"
          style={{ backgroundImage: "url('/GeminiMAB1.jpg')" }}
        />
        
        {/* Noise texture overlay */}
        <div className="absolute inset-0 bg-noise opacity-30" aria-hidden="true" />

        {/* Navigation Header */}
        <header className="relative z-40 mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <nav className="flex items-center justify-between">
            <a href="/" className="flex items-center gap-3 group">
              <div className="relative">
                <img
                  src="/GeminiMALBig3.jpg"
                  alt="Maple Aurum Logo"
                  className="h-12 w-12 rounded-xl object-cover ring-2 ring-white/20 group-hover:ring-yellow-400/50 transition-all"
                />
                <motion.div
                  className="absolute -inset-1 bg-gradient-to-r from-yellow-400 to-amber-600 rounded-xl opacity-0 group-hover:opacity-50 blur-lg transition-opacity"
                />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-yellow-400 to-amber-300 bg-clip-text text-transparent">
                Maple Aurum
              </span>
            </a>

            <div className="hidden md:flex items-center gap-8">
              <a href="/companies" className="text-sm text-white/80 hover:text-yellow-400 transition-colors">
                Companies
              </a>
              <a href="/scatter-score-pro" className="text-sm text-white/80 hover:text-yellow-400 transition-colors">
                ScatterScore™
              </a>
              <a href="/scoring" className="text-sm text-white/80 hover:text-yellow-400 transition-colors">
                Rankings
              </a>
              <a href="/subscribe">
                <Button className="bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-white shadow-lg shadow-yellow-500/25">
                  <Crown className="h-4 w-4 mr-2" />
                  Upgrade to Pro
                </Button>
              </a>
            </div>
          </nav>
        </header>

        {/* Hero Content */}
        <motion.div 
          className="relative flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8"
          style={{ y: heroY, opacity: fadeOut }}
        >
          <div className="mx-auto max-w-7xl w-full">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              
              {/* Left: Content */}
              <div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-sm mb-6"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>Advanced Mining Analytics Platform</span>
                </motion.div>

                <motion.h1
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  className="text-4xl md:text-6xl font-bold text-white mb-6"
                >
                  Transform How You Analyze
                  <span className="block mt-2 bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 bg-clip-text text-transparent">
                    Canadian Mining Stocks
                  </span>
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.4 }}
                  className="text-xl text-gray-300 mb-8"
                >
                  Professional-grade tools that turn complex mining data into actionable insights. 
                  From exploration to production, make smarter investment decisions.
                </motion.p>

                {/* Technical Feature Grid */}
                <motion.div 
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.6 }}
                  className="grid grid-cols-2 gap-4 mb-8"
                >
                  {technicalFeatures.map((feature, index) => (
                    <div key={index} className="bg-navy-800/50 backdrop-blur-sm rounded-lg p-4 border border-navy-700">
                      <feature.icon className="h-5 w-5 text-yellow-400 mb-2" />
                      <h3 className="text-sm font-semibold text-white mb-1">{feature.title}</h3>
                      <p className="text-xs text-gray-400 mb-1">{feature.description}</p>
                      <span className="text-xs text-yellow-400/80">{feature.highlight}</span>
                    </div>
                  ))}
                </motion.div>

                {/* CTA Buttons */}
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.8 }}
                  className="flex flex-col sm:flex-row items-start gap-4"
                >
                  <a href="/scatter-score-pro">
                    <Button size="lg" className="bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-white shadow-2xl shadow-yellow-500/25 transform hover:scale-105 transition-all">
                      <BarChart3 className="h-5 w-5 mr-2" />
                      Launch ScatterScore™
                    </Button>
                  </a>
                  <a href="/companies">
                    <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10">
                      <Database className="h-5 w-5 mr-2" />
                      Explore Database
                    </Button>
                  </a>
                </motion.div>
              </div>

              {/* Right: Interactive Demo Preview */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1, delay: 0.4 }}
                className="relative"
              >
                <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-black/50 border border-navy-700 group">
                  <img 
                    src="/ScatterScore1b.jpg"
                    alt="ScatterScore Platform"
                    className="w-full h-auto transition-transform duration-700 group-hover:scale-105"
                  />
                  {/* Subtle glow overlay */}
                  <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/5 via-transparent to-blue-400/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  {/* Animated overlay points */}
                  <div className="absolute inset-0">
                    {[
                      { top: '30%', left: '25%', color: 'bg-yellow-400' },
                      { top: '50%', left: '60%', color: 'bg-green-400' },
                      { top: '70%', left: '40%', color: 'bg-blue-400' },
                    ].map((point, i) => (
                      <motion.div
                        key={i}
                        className={`absolute w-3 h-3 ${point.color} rounded-full`}
                        style={{ top: point.top, left: point.left }}
                        animate={{
                          scale: [1, 1.5, 1],
                          opacity: [0.7, 1, 0.7]
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          delay: i * 0.3
                        }}
                      />
                    ))}
                  </div>
                  {/* Feature callouts */}
                  <motion.div 
                    className="absolute top-4 left-4 bg-black/80 backdrop-blur-sm rounded-lg px-3 py-2"
                    animate={{ opacity: [0, 1, 1, 0] }}
                    transition={{ duration: 4, repeat: Infinity, times: [0, 0.1, 0.9, 1] }}
                  >
                    <span className="text-xs text-white">Real-time Analysis</span>
                  </motion.div>
                  <motion.div 
                    className="absolute bottom-4 right-4 bg-black/80 backdrop-blur-sm rounded-lg px-3 py-2"
                    animate={{ opacity: [0, 1, 1, 0] }}
                    transition={{ duration: 4, repeat: Infinity, times: [0, 0.1, 0.9, 1], delay: 2 }}
                  >
                    <span className="text-xs text-white">AI-Powered Insights</span>
                  </motion.div>
                </div>
              </motion.div>
            </div>
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

      {/* Section 2: The Process Story */}
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
              Your Journey to Smarter Investments
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Follow our proven workflow to uncover opportunities others miss
            </p>
          </motion.div>

          {/* Process Steps */}
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left: Step Navigation */}
            <div className="space-y-4">
              {processSteps.map((step, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -50 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  onClick={() => setActiveStep(index)}
                  className={cn(
                    "group cursor-pointer rounded-xl p-6 transition-all",
                    activeStep === index 
                      ? "bg-gradient-to-r from-yellow-500/20 to-amber-600/20 border-2 border-yellow-500/50" 
                      : "bg-navy-800/30 border border-navy-700 hover:bg-navy-800/50"
                  )}
                >
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      "text-3xl font-bold transition-colors",
                      activeStep === index ? "text-yellow-400" : "text-gray-600"
                    )}>
                      {step.number}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white mb-2">{step.title}</h3>
                      <p className="text-sm text-gray-400 mb-3">{step.description}</p>
                      <div className="flex flex-wrap gap-2">
                        {step.features.map((feature, i) => (
                          <span key={i} className="text-xs px-2 py-1 rounded bg-navy-700/50 text-gray-300">
                            {feature}
                          </span>
                        ))}
                      </div>
                    </div>
                    <ArrowRight className={cn(
                      "h-5 w-5 transition-all",
                      activeStep === index ? "text-yellow-400 translate-x-1" : "text-gray-600"
                    )} />
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Right: Dynamic Content Display */}
            <motion.div
              key={activeStep}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="relative"
            >
              <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-black/50 border-2 border-yellow-500/30">
                <div className="relative group">
                  <img 
                    src={processSteps[activeStep].image}
                    alt={processSteps[activeStep].title}
                    className="w-full h-auto transition-transform duration-500 group-hover:scale-105"
                  />
                  {/* Subtle glow effect on hover */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <h3 className="text-2xl font-bold text-white mb-2">
                      {processSteps[activeStep].title}
                    </h3>
                    <p className="text-gray-200">
                      {processSteps[activeStep].description}
                    </p>
                  </div>
                </div>
              </div>

              {/* Progress Indicator */}
              <div className="flex justify-center gap-2 mt-6">
                {processSteps.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveStep(index)}
                    className={cn(
                      "h-2 rounded-full transition-all",
                      activeStep === index 
                        ? "w-8 bg-yellow-400" 
                        : "w-2 bg-gray-600 hover:bg-gray-500"
                    )}
                  />
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Section 3: Technical Capabilities Showcase */}
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
              Powerful Analytics at Your Fingertips
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Built by investors, for investors. Every feature designed to give you an edge.
            </p>
          </motion.div>

          {/* Feature Grid */}
          <div className="grid md:grid-cols-3 gap-8">
            {/* ScatterScore Feature */}
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="bg-navy-800/50 backdrop-blur-sm rounded-2xl p-8 border border-navy-700 hover:border-yellow-500/50 transition-all"
            >
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center mb-6">
                <LineChart className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-2xl font-semibold text-white mb-4">ScatterScore™ Engine</h3>
              <p className="text-gray-400 mb-6">
                Instantly visualize relationships between any metrics. Our proprietary charting engine reveals patterns human analysis misses.
              </p>
              <ul className="space-y-2 text-sm text-gray-300">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-400" />
                  <span>Custom axis selection</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-400" />
                  <span>Real-time updates</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-400" />
                  <span>Pattern recognition AI</span>
                </li>
              </ul>
            </motion.div>

            {/* Multi-Factor Scoring */}
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="bg-navy-800/50 backdrop-blur-sm rounded-2xl p-8 border border-navy-700 hover:border-green-500/50 transition-all"
            >
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mb-6">
                <Target className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-2xl font-semibold text-white mb-4">Multi-Factor Scoring</h3>
              <p className="text-gray-400 mb-6">
                Our algorithms analyze 50+ metrics simultaneously, ranking companies based on your specific investment criteria.
              </p>
              <ul className="space-y-2 text-sm text-gray-300">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-400" />
                  <span>Strategy templates</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-400" />
                  <span>Custom weightings</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-400" />
                  <span>Backtested models</span>
                </li>
              </ul>
            </motion.div>

            {/* Advanced Filtering */}
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-navy-800/50 backdrop-blur-sm rounded-2xl p-8 border border-navy-700 hover:border-blue-500/50 transition-all"
            >
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center mb-6">
                <Filter className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-2xl font-semibold text-white mb-4">Smart Filtering</h3>
              <p className="text-gray-400 mb-6">
                Drill down through complex data with institutional-grade filters designed specifically for mining investors.
              </p>
              <ul className="space-y-2 text-sm text-gray-300">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-400" />
                  <span>Resource metrics</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-400" />
                  <span>Production data</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-400" />
                  <span>Financial ratios</span>
                </li>
              </ul>
            </motion.div>
          </div>

          {/* Platform Stats */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8"
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
                99.9%
              </div>
              <p className="text-gray-400 mt-2">Accuracy Rate</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Section 4: Final CTA */}
      <section className="relative py-24 bg-gradient-to-b from-navy-800 to-navy-900 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/10 via-transparent to-amber-500/10" />
        </div>

        <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-5xl md:text-6xl font-bold text-white mb-6">
              Ready to Transform Your Analysis?
            </h2>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Join forward-thinking investors using Maple Aurum to make data-driven decisions in Canadian mining.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
              <a href="/subscribe">
                <Button 
                  size="lg" 
                  className="bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-white px-10 py-6 text-lg shadow-2xl shadow-yellow-500/25 transform hover:scale-105 transition-all"
                >
                  <Zap className="h-6 w-6 mr-2" />
                  Start Free Trial
                </Button>
              </a>
              <a href="/companies">
                <Button 
                  size="lg"
                  variant="outline" 
                  className="border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10 px-10 py-6 text-lg"
                >
                  <Search className="h-6 w-6 mr-2" />
                  Explore Companies
                </Button>
              </a>
            </div>

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
    </div>
  );
}