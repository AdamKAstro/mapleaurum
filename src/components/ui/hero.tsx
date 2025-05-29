// src/components/ui/hero.tsx
import React, { useState, useRef, useEffect } from 'react';
import { ArrowRight, Crown, TrendingUp, Shield, Sparkles, ChevronDown, Check, Zap, Target, Gem, Filter, BarChart3, Layers, Database, LineChart, Search, TrendingDown, Play, Star } from 'lucide-react';
import { motion, useScroll, useTransform, useInView, AnimatePresence } from 'framer-motion';

// Simple button component with proper font
const Button = ({ children, className, size = "default", variant = "default", ...props }) => {
  const sizes = {
    default: "px-4 py-2 text-sm",
    sm: "px-3 py-1.5 text-xs",
    lg: "px-8 py-4 text-base"
  };
  
  const variants = {
    default: "bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-white shadow-lg shadow-yellow-500/25",
    outline: "border-2 border-current bg-transparent hover:bg-white/10",
    ghost: "bg-transparent hover:bg-white/10"
  };
  
  return (
    <button
      className={`inline-flex items-center justify-center rounded-lg font-medium transition-all transform hover:scale-105 ${sizes[size]} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

// Utility for className combination
const cn = (...classes) => classes.filter(Boolean).join(' ');

// Template data with emotional hooks
const templates = [
  {
    id: 'value-hunter',
    name: 'Value Hunter',
    emotion: 'Uncover Bargains',
    description: 'Find undervalued stocks with strong balance sheets',
    icon: Gem,
    color: 'from-yellow-500 to-amber-600',
    bgGlow: 'bg-yellow-500/20',
    metrics: ['Low EV/oz', 'High Cash', 'Low Debt']
  },
  {
    id: 'growth-catalyst',
    name: 'Growth Catalyst',
    emotion: 'Chase Growth',
    description: 'Target high resource expansion potential',
    icon: TrendingUp,
    color: 'from-green-500 to-emerald-600',
    bgGlow: 'bg-green-500/20',
    metrics: ['Resource Growth', 'Production Expansion', 'Strong Pipeline']
  },
  {
    id: 'income-generator',
    name: 'Income Generator',
    emotion: 'Earn Steadily',
    description: 'Focus on dividend-paying producers',
    icon: Shield,
    color: 'from-blue-500 to-cyan-600',
    bgGlow: 'bg-blue-500/20',
    metrics: ['Dividend Yield', 'Free Cash Flow', 'Stable Production']
  },
  {
    id: 'risk-mitigator',
    name: 'Risk Mitigator',
    emotion: 'Invest Safely',
    description: 'Balance returns with safety',
    icon: Shield,
    color: 'from-purple-500 to-pink-600',
    bgGlow: 'bg-purple-500/20',
    metrics: ['Low Volatility', 'Strong Balance Sheet', 'Diversified Assets']
  },
  {
    id: 'exploration-frontier',
    name: 'Exploration Frontier',
    emotion: 'Find 10x Gems',
    description: 'Spot the next big discovery',
    icon: Target,
    color: 'from-orange-500 to-red-600',
    bgGlow: 'bg-orange-500/20',
    metrics: ['Drill Results', 'Land Package', 'Management Track Record']
  }
];

// Testimonials with avatars
const testimonials = [
  {
    id: 1,
    name: "John Carter",
    role: "Retail Investor",
    quote: "I found a hidden gem in minutes—ScatterScore made it so easy!",
    rating: 5,
    avatar: "JC"
  },
  {
    id: 2,
    name: "Sarah Chen",
    role: "Portfolio Manager",
    quote: "The templates save me hours of analysis while delivering deep insights.",
    rating: 5,
    avatar: "SC"
  },
  {
    id: 3,
    name: "Mike Thompson",
    role: "Crypto Trader",
    quote: "Exploration Frontier helped me spot a 10x opportunity!",
    rating: 5,
    avatar: "MT"
  }
];

interface HeroProps {
  className?: string;
}

export function Hero({ className }: HeroProps) {
  const [selectedTemplate, setSelectedTemplate] = useState(templates[0]);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [hoveredBubble, setHoveredBubble] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });

  // Parallax transforms
  const heroY = useTransform(scrollYProgress, [0, 1], [0, -150]);
  const bubblesY = useTransform(scrollYProgress, [0, 1], [0, -100]);
  const fadeOut = useTransform(scrollYProgress, [0, 0.3], [1, 0.8]);

  // Demo chart data
  const demoCompanies = [
    { id: 1, name: "Company A", x: 20, y: 70, size: 40, value: "Low EV/oz, High Cash" },
    { id: 2, name: "Company B", x: 60, y: 40, size: 60, value: "Balanced metrics" },
    { id: 3, name: "Company C", x: 30, y: 60, size: 30, value: "Growth potential" },
    { id: 4, name: "Company D", x: 80, y: 80, size: 50, value: "Premium valuation" },
    { id: 5, name: "Company E", x: 45, y: 30, size: 35, value: "Hidden gem" },
  ];

  return (
    <div ref={containerRef} className={cn('relative w-full font-sans', className)}>
      
      {/* Section 1: Hero Banner - Grab Attention (0-2 Seconds) */}
      <section className="relative min-h-screen flex flex-col overflow-hidden bg-gradient-to-b from-navy-900 via-navy-800 to-navy-900">
        
        {/* Award-winning animated background */}
        <div className="absolute inset-0">
          {/* Grid pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: `linear-gradient(to right, #fbbf2420 1px, transparent 1px),
                                linear-gradient(to bottom, #fbbf2420 1px, transparent 1px)`,
              backgroundSize: '40px 40px'
            }} />
          </div>
          
          {/* Animated 3D scatter plot background */}
          <motion.div 
            className="absolute inset-0"
            style={{ y: bubblesY }}
          >
            {[...Array(30)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute rounded-full"
                style={{
                  width: `${30 + Math.random() * 60}px`,
                  height: `${30 + Math.random() * 60}px`,
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  background: i % 3 === 0 
                    ? 'radial-gradient(circle, rgba(251, 191, 36, 0.3) 0%, transparent 70%)'
                    : i % 3 === 1
                    ? 'radial-gradient(circle, rgba(34, 197, 94, 0.2) 0%, transparent 70%)'
                    : 'radial-gradient(circle, rgba(59, 130, 246, 0.2) 0%, transparent 70%)',
                  filter: 'blur(1px)'
                }}
                animate={{
                  y: [0, -30, 0],
                  scale: [1, 1.1, 1],
                  opacity: [0.3, 0.6, 0.3]
                }}
                transition={{
                  duration: 5 + Math.random() * 5,
                  repeat: Infinity,
                  delay: Math.random() * 5,
                  ease: "easeInOut"
                }}
              />
            ))}
          </motion.div>

          {/* Metallic gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-900/10 via-transparent to-amber-900/10" />
        </div>

        {/* Navigation Header */}
        <header className="relative z-40 mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <nav className="flex items-center justify-between">
            <a href="/" className="flex items-center gap-3 group">
              <div className="relative">
                <img
                  src="/GeminiMALBig3.jpg"
                  alt="Maple Aurum Logo"
                  className="h-12 w-12 rounded-xl object-cover ring-2 ring-yellow-500/20 group-hover:ring-yellow-400/50 transition-all"
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
              <a href="/companies" className="text-sm font-medium text-white/80 hover:text-yellow-400 transition-colors">
                Companies
              </a>
              <a href="/scatter-score-pro" className="text-sm font-medium text-white/80 hover:text-yellow-400 transition-colors">
                ScatterScore™
              </a>
              <a href="/scoring" className="text-sm font-medium text-white/80 hover:text-yellow-400 transition-colors">
                Rankings
              </a>
              <a href="/subscribe">
                <Button size="default" className="shadow-2xl">
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
          <div className="mx-auto max-w-7xl w-full text-center">
            {/* Tagline - Bold and Emotional */}
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-5xl md:text-7xl lg:text-8xl font-bold text-white mb-6 tracking-tight"
            >
              Uncover Winning Mining Stocks
              <span className="block mt-2 bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 bg-clip-text text-transparent animate-pulse">
                with One Click
              </span>
            </motion.h1>

            {/* Subheading */}
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto mb-10 font-light"
            >
              Analyze Canadian precious metals companies like a pro—find value, growth, and stability effortlessly.
            </motion.p>

            {/* Primary CTA with urgency */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="flex flex-col items-center gap-4"
            >
              <a href="/subscribe">
                <Button size="lg" className="text-lg px-10 py-6 shadow-2xl transform hover:scale-110 transition-all">
                  <Zap className="h-6 w-6 mr-2" />
                  Try Free Now
                </Button>
              </a>
              <p className="text-sm text-yellow-400/80 animate-pulse">
                Limited free usage—start now!
              </p>
            </motion.div>

            {/* Trust indicators */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.6 }}
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
                <span>Real-Time Analysis</span>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Scroll indicator with animation */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <ChevronDown className="h-8 w-8 text-white/50" />
        </motion.div>
      </section>

      {/* Section 2: Problem & Solution - Build Connection */}
      <section className="relative py-32 bg-gradient-to-b from-navy-900 to-navy-800 overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-6xl font-bold text-white mb-6">
              Mining Stocks Are Complex.
              <span className="block mt-2 bg-gradient-to-r from-yellow-400 to-amber-400 bg-clip-text text-transparent">
                We Make It Simple.
              </span>
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Sifting through reserves, cash flows, and valuations is time-consuming and confusing. 
              ScatterScore™ turns complex data into clear, actionable insights with pre-built templates for every investor.
            </p>
          </motion.div>

          {/* Split screen animation */}
          <div className="relative">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              {/* Left: Chaos */}
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                className="relative"
              >
                <div className="relative h-96 rounded-2xl overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-red-900/20 to-red-800/20 backdrop-blur-sm" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-6xl mb-4">📊📈📉🤯</div>
                      <h3 className="text-2xl font-bold text-red-400 mb-2">The Old Way</h3>
                      <p className="text-gray-400">Hours of complex analysis</p>
                    </div>
                  </div>
                  {/* Chaotic data animation */}
                  <div className="absolute inset-0 opacity-20">
                    {[...Array(20)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="absolute text-xs text-red-300"
                        style={{
                          left: `${Math.random() * 100}%`,
                          top: `${Math.random() * 100}%`,
                        }}
                        animate={{
                          opacity: [0, 1, 0],
                          scale: [0.5, 1, 0.5],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          delay: Math.random() * 2,
                        }}
                      >
                        {['P/E', 'AISC', 'NPV', 'IRR', 'EV/oz'][Math.floor(Math.random() * 5)]}
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>

              {/* Right: Clarity */}
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                className="relative"
              >
                <div className="relative h-96 rounded-2xl overflow-hidden bg-gradient-to-br from-green-900/20 to-emerald-800/20">
                  <img 
                    src="/ScatterScore1b.jpg"
                    alt="ScatterScore Clarity"
                    className="absolute inset-0 w-full h-full object-cover opacity-80"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-8 text-center">
                    <div className="text-6xl mb-4">✨</div>
                    <h3 className="text-2xl font-bold text-green-400 mb-2">The ScatterScore™ Way</h3>
                    <p className="text-gray-300">Instant visual insights</p>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Video Demo CTA */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="text-center mt-12"
            >
              <Button 
                onClick={() => setIsVideoPlaying(true)}
                size="lg"
                variant="outline"
                className="border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10"
              >
                <Play className="h-5 w-5 mr-2" />
                See How It Works
              </Button>
              <p className="text-sm text-gray-500 mt-2">15-second demo</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Section 3: Interactive Demo - Showcase Value */}
      <section className="relative py-32 bg-gradient-to-b from-navy-800 to-navy-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl md:text-6xl font-bold text-white mb-6">
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
            className="bg-navy-800/50 backdrop-blur-sm rounded-3xl p-8 border-2 border-yellow-400/20 shadow-2xl"
          >
            {/* Template selector */}
            <div className="flex flex-wrap gap-3 mb-8 justify-center">
              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => setSelectedTemplate(template)}
                  className={cn(
                    "px-6 py-3 rounded-xl flex items-center gap-2 transition-all transform hover:scale-105",
                    selectedTemplate.id === template.id
                      ? "bg-gradient-to-r text-white shadow-lg shadow-yellow-500/25"
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
                  <template.icon className="h-5 w-5" />
                  <span className="font-medium">{template.emotion}</span>
                </button>
              ))}
            </div>

            {/* Simplified interactive scatter plot */}
            <div className="relative h-[500px] bg-navy-900/50 rounded-2xl overflow-hidden">
              <div className="absolute inset-0 p-8">
                {/* Axes */}
                <div className="absolute bottom-8 left-8 right-8 h-px bg-gray-600" />
                <div className="absolute bottom-8 left-8 top-8 w-px bg-gray-600" />
                
                {/* Axis labels */}
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-gray-400">
                  Valuation Attractiveness →
                </div>
                <div className="absolute left-2 top-1/2 -translate-y-1/2 -rotate-90 text-xs text-gray-400">
                  Financial Strength →
                </div>

                {/* Interactive bubbles */}
                {demoCompanies.map((company) => (
                  <motion.div
                    key={company.id}
                    className="absolute cursor-pointer"
                    style={{
                      left: `${company.x}%`,
                      bottom: `${company.y}%`,
                      width: `${company.size}px`,
                      height: `${company.size}px`,
                    }}
                    whileHover={{ scale: 1.2 }}
                    onHoverStart={() => setHoveredBubble(company.id)}
                    onHoverEnd={() => setHoveredBubble(null)}
                  >
                    <div 
                      className={cn(
                        "w-full h-full rounded-full transition-all",
                        selectedTemplate.bgGlow
                      )}
                      style={{
                        background: `radial-gradient(circle, ${
                          selectedTemplate.color.includes('yellow') ? 'rgba(251, 191, 36, 0.6)' :
                          selectedTemplate.color.includes('green') ? 'rgba(34, 197, 94, 0.6)' :
                          selectedTemplate.color.includes('blue') ? 'rgba(59, 130, 246, 0.6)' :
                          selectedTemplate.color.includes('purple') ? 'rgba(168, 85, 247, 0.6)' :
                          'rgba(251, 146, 60, 0.6)'
                        } 0%, transparent 70%)`,
                        boxShadow: hoveredBubble === company.id ? '0 0 30px rgba(251, 191, 36, 0.5)' : ''
                      }}
                    />
                    
                    {/* Tooltip */}
                    <AnimatePresence>
                      {hoveredBubble === company.id && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute -top-20 left-1/2 -translate-x-1/2 bg-black/90 text-white p-3 rounded-lg text-sm whitespace-nowrap"
                        >
                          <div className="font-bold">{company.name}</div>
                          <div className="text-xs text-gray-300">{company.value}</div>
                          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black/90" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}

                {/* Achievement sparkle */}
                <AnimatePresence>
                  {hoveredBubble && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0 }}
                      className="absolute top-4 right-4 bg-green-500/20 text-green-400 px-4 py-2 rounded-full text-sm font-medium"
                    >
                      <Sparkles className="h-4 w-4 inline mr-2" />
                      Great Find!
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Template info overlay */}
              <motion.div
                key={selectedTemplate.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute bottom-6 left-6 right-6 bg-black/80 backdrop-blur-sm rounded-xl p-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <selectedTemplate.icon className="h-5 w-5 text-yellow-400" />
                      {selectedTemplate.name}
                    </h3>
                    <p className="text-sm text-gray-400 mt-1">{selectedTemplate.description}</p>
                    <div className="flex gap-2 mt-3">
                      {selectedTemplate.metrics.map((metric, i) => (
                        <span key={i} className="text-xs px-3 py-1 rounded-full bg-navy-700 text-gray-300">
                          {metric}
                        </span>
                      ))}
                    </div>
                  </div>
                  <a href="/scatter-score-pro">
                    <Button size="sm">
                      Try It Free
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </a>
                </div>
              </motion.div>
            </div>

            {/* Tooltips for axes */}
            <div className="mt-6 flex justify-center gap-8 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-yellow-400" />
                <span>Lower Valuation = Better Deal</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-400" />
                <span>Higher Strength = Safer Investment</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Section 4: Template Spotlight - Deepen Engagement */}
      <section className="relative py-32 bg-gradient-to-b from-navy-900 via-navy-800 to-navy-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-6xl font-bold text-white mb-6">
              Tailored for Every Investor
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Whether you're hunting bargains or betting on growth, our templates deliver insights in seconds.
            </p>
          </motion.div>

          {/* Template cards with parallax */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.slice(0, 5).map((template, index) => (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ y: -10, scale: 1.02 }}
                className="group"
              >
                <div className="relative bg-navy-800/50 backdrop-blur-sm rounded-2xl p-8 border border-navy-700 hover:border-yellow-500/50 transition-all h-full">
                  {/* Gradient background on hover */}
                  <div className={cn(
                    "absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-20 transition-opacity",
                    template.bgGlow
                  )} />

                  {/* Icon with animation */}
                  <motion.div
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.5 }}
                    className={cn(
                      "inline-flex p-4 rounded-2xl mb-6",
                      "bg-gradient-to-br",
                      template.color
                    )}
                  >
                    <template.icon className="h-8 w-8 text-white" />
                  </motion.div>

                  {/* Content */}
                  <h3 className="text-2xl font-bold text-white mb-2">{template.name}</h3>
                  <p className="text-lg font-medium text-yellow-400 mb-3">{template.emotion}</p>
                  <p className="text-gray-400 mb-6">{template.description}</p>

                  {/* Mini scatter plot preview */}
                  <div className="relative h-32 bg-navy-900/50 rounded-xl mb-4 overflow-hidden">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="grid grid-cols-3 gap-2">
                        {[...Array(9)].map((_, i) => (
                          <div
                            key={i}
                            className={cn(
                              "w-3 h-3 rounded-full",
                              template.bgGlow
                            )}
                            style={{
                              opacity: 0.3 + Math.random() * 0.7
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* CTA */}
                  <a href="/scatter-score-pro" className="block">
                    <Button 
                      variant="ghost" 
                      className="w-full bg-white/5 hover:bg-white/10 border border-white/10"
                    >
                      <span className="bg-gradient-to-r from-yellow-400 to-amber-400 bg-clip-text text-transparent font-medium">
                        Pick This Strategy
                      </span>
                      <ArrowRight className="h-4 w-4 ml-2 text-yellow-400" />
                    </Button>
                  </a>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 5: Testimonials & Trust - Build Credibility */}
      <section className="relative py-32 bg-gradient-to-b from-navy-900 to-navy-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-6xl font-bold text-white mb-6">
              Trusted by Investors Like You
            </h2>
            <div className="flex items-center justify-center gap-1 mb-4">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-8 w-8 fill-yellow-400 text-yellow-400" />
              ))}
            </div>
            <p className="text-lg text-gray-300">Join the community finding hidden gems</p>
          </motion.div>

          {/* Testimonial carousel */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={testimonial.id}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ y: -5 }}
                className="bg-navy-800/50 backdrop-blur-sm rounded-2xl p-8 border border-yellow-400/20 relative overflow-hidden"
              >
                {/* Gold frame effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/5 via-transparent to-amber-400/5" />
                
                {/* Quote */}
                <div className="relative">
                  <div className="text-6xl text-yellow-400/20 absolute -top-4 -left-2">"</div>
                  <p className="text-lg text-gray-300 italic relative z-10 pl-8">
                    {testimonial.quote}
                  </p>
                </div>

                {/* Author */}
                <div className="flex items-center gap-4 mt-6">
                  <div className="h-14 w-14 rounded-full bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center text-white font-bold text-lg">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <p className="text-white font-semibold">{testimonial.name}</p>
                    <p className="text-gray-400 text-sm">{testimonial.role}</p>
                  </div>
                </div>

                {/* Rating */}
                <div className="flex gap-1 mt-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Join CTA */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mt-12"
          >
            <a href="/subscribe">
              <Button size="lg" className="shadow-2xl">
                <Users className="h-5 w-5 mr-2" />
                Join Them Today
              </Button>
            </a>
          </motion.div>
        </div>
      </section>

      {/* Section 6: Final CTA - Drive Action */}
      <section className="relative py-32 bg-gradient-to-b from-navy-800 to-navy-900 overflow-hidden">
        {/* Animated gold mine background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/10 via-transparent to-amber-500/10" />
          {/* Floating gold particles */}
          {[...Array(50)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute h-1 w-1 bg-yellow-400 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [-20, -100],
                opacity: [0, 1, 0],
                scale: [0, 1.5, 0]
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 5,
              }}
            />
          ))}
        </div>

        <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-5xl md:text-7xl font-bold text-white mb-6">
              Start Finding Winners Today
            </h2>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Access ScatterScore™ for free and unlock powerful mining stock insights. 
              Upgrade to Pro for unlimited analysis.
            </p>

            {/* CTAs with urgency */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-8">
              <a href="/subscribe">
                <Button 
                  size="lg" 
                  className="text-lg px-10 py-6 shadow-2xl transform hover:scale-110 transition-all animate-pulse"
                >
                  <Zap className="h-6 w-6 mr-2" />
                  Try Free Now
                </Button>
              </a>
              <a href="/subscribe">
                <Button 
                  size="lg"
                  variant="outline" 
                  className="border-2 border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10 px-10 py-6 text-lg"
                >
                  <Crown className="h-6 w-6 mr-2" />
                  Go Pro with SuperGrok
                </Button>
              </a>
            </div>

            {/* Countdown timer for urgency */}
            <div className="bg-black/50 backdrop-blur-sm rounded-full px-6 py-3 inline-flex items-center gap-2 text-yellow-400 mb-8">
              <Zap className="h-5 w-5 animate-pulse" />
              <span className="font-medium">Free Quota Resets in 24h</span>
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
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-white">15-second demo video placeholder</p>
              </div>
              <button
                onClick={() => setIsVideoPlaying(false)}
                className="absolute top-4 right-4 text-white/80 hover:text-white bg-black/50 rounded-full p-2"
              >
                ✕
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Add missing import
const Users = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);