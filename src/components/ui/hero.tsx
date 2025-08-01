// src/components/ui/hero.tsx

import React, { useState, useRef, useMemo, memo, useEffect } from 'react';
import { ArrowRight, Crown, TrendingUp, Shield, Sparkles, ChevronDown, Check, Zap, Target, Gem, Rocket, Play, Pause, Volume2, VolumeX, BarChart2, PieChart, LineChart } from 'lucide-react';
import { motion, useScroll, useTransform, AnimatePresence, useInView } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { LazyLoadImage } from 'react-lazy-load-image-component';
import 'react-lazy-load-image-component/src/effects/blur.css';

// Define types for better type safety
interface Template {
  id: string;
  name: string;
  emotion: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bgGlow: string;
  metrics: string[];
}

// New interface for Scoring Engine cards
interface ScoringEngine {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
}

interface HeroProps {
  className?: string;
}

// Button component (unchanged)
const Button = memo(({ children, className = '', size = 'default', variant = 'default', ...props }: {
  children: React.ReactNode;
  className?: string;
  size?: 'default' | 'sm' | 'lg';
  variant?: 'default' | 'outline' | 'ghost';
  [key: string]: any;
}) => {
  const sizes = {
    default: 'px-4 py-2 text-sm',
    sm: 'px-3 py-1.5 text-xs',
    lg: 'px-8 py-4 text-base',
  };

  const variants = {
    default: 'bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-white shadow-lg shadow-yellow-500/25',
    outline: 'border-2 border-current bg-transparent hover:bg-white/10',
    ghost: 'bg-transparent hover:bg-white/10',
  };

  return (
    <button
      className={`inline-flex items-center justify-center rounded-lg font-medium transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 focus:ring-offset-navy-900 ${sizes[size]} ${variants[variant]} ${className}`}
      aria-label={typeof children === 'string' ? children : undefined}
      {...props}
    >
      {children}
    </button>
  );
});

// Utility for className combination
const cn = (...classes: (string | boolean | undefined)[]): string => classes.filter(Boolean).join(' ');

// Template data (unchanged)
const templates: Template[] = [
  {
    id: 'value-hunter',
    name: 'Value Hunter',
    emotion: 'Uncover Bargains',
    description: 'Find undervalued stocks with strong balance sheets.',
    icon: Gem,
    color: 'from-yellow-500 to-amber-600',
    bgGlow: 'bg-yellow-500/20',
    metrics: ['Low EV/oz', 'High Cash', 'Low Debt'],
  },
  {
    id: 'growth-catalyst',
    name: 'Growth Catalyst',
    emotion: 'Chase Growth',
    description: 'Target high resource expansion potential.',
    icon: TrendingUp,
    color: 'from-green-500 to-emerald-600',
    bgGlow: 'bg-green-500/20',
    metrics: ['Resource Growth', 'Production Expansion', 'Strong Pipeline'],
  },
  {
    id: 'income-generator',
    name: 'Producer Profitability',
    emotion: 'Earn Steadily',
    description: 'Evaluates operational excellence by comparing cost metrics (AISC, TCO) against profitability measures (EBITDA, FCF, margins).',
    icon: Shield,
    color: 'from-blue-500 to-cyan-600',
    bgGlow: 'bg-blue-500/20',
    metrics: ['Dividend Yield', 'Free Cash Flow', 'Stable Production'],
  },
  {
    id: 'risk-mitigator',
    name: 'Financial Stability & Low Risk',
    emotion: 'Invest Safely',
    description: 'For risk-averse investors, balancing balance sheet strength against operational consistency and longevity.',
    icon: Shield,
    color: 'from-purple-500 to-pink-600',
    bgGlow: 'bg-purple-500/20',
    metrics: ['Low Volatility', 'Strong Balance Sheet', 'Diversified Assets'],
  },
  {
    id: 'exploration-frontier',
    name: 'Precious Metals Pure Play',
    emotion: 'Find 10x Gems',
    description: 'Focuses exclusively on gold/silver exposure, comparing resource base against precious-specific valuation metrics.',
    icon: Target,
    color: 'from-orange-500 to-red-600',
    bgGlow: 'bg-orange-500/20',
    metrics: ['Drill Results', 'Land Package', 'Management Track Record'],
  },
];

// New Scoring Engine data
const scoringEngines: ScoringEngine[] = [
  {
    id: 'scoring-advanced',
    name: 'Advanced Scoring Engine',
    description: 'Dynamically weights metrics to deliver a Confidence Score, comparing companies against peers.',
    icon: BarChart2,
    color: 'from-cyan-500 to-blue-600',
  },
  {
    id: 'fcf-scoring',
    name: 'FCF-Focused Scoring',
    description: 'Evaluates financial health through Free Cash Flow with tailored formulas for each company type.',
    icon: PieChart,
    color: 'from-green-500 to-emerald-600',
  },
  {
    id: 'scatter-score-pro',
    name: 'ScatterScore Pro',
    description: 'Visualize complex comparisons with weighted composite scores, featuring templates like Value Hunter.',
    icon: LineChart,
    color: 'from-yellow-500 to-amber-600',
  },
];

// Demo company data (unchanged)
const demoCompanies = [
  { id: 1, name: 'Company A', x: 20, y: 70, size: 40, value: 'Low EV/oz, High Cash' },
  { id: 2, name: 'Company B', x: 60, y: 40, size: 60, value: 'Balanced metrics' },
  { id: 3, name: 'Company C', x: 30, y: 60, size: 30, value: 'Growth potential' },
  { id: 4, name: 'Company D', x: 80, y: 80, size: 50, value: 'Premium valuation' },
  { id: 5, name: 'Company E', x: 45, y: 30, size: 35, value: 'Hidden gem' },
];

export const Hero: React.FC<HeroProps> = ({ className }) => {
  const [selectedTemplate, setSelectedTemplate] = useState(templates[0]);
  const [hoveredBubble, setHoveredBubble] = useState<number | null>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [hasVideoLoaded, setHasVideoLoaded] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const isVideoInView = useInView(videoContainerRef, { once: false, margin: '-100px' });

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end start'],
  });

  // Parallax and fade effects
  const heroY = useTransform(scrollYProgress, [0, 1], [0, -150]);
  const bubblesY = useTransform(scrollYProgress, [0, 1], [0, -100]);
  const fadeOut = useTransform(scrollYProgress, [0, 0.3], [1, 0.8]);

  // Video controls
  useEffect(() => {
    if (videoRef.current) {
      if (isVideoInView && isVideoPlaying && isVideoReady) {
        videoRef.current.play().catch(() => {
          setIsVideoPlaying(false);
        });
      } else {
        videoRef.current.pause();
      }
    }
  }, [isVideoInView, isVideoPlaying, isVideoReady]);

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isVideoPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsVideoPlaying(!isVideoPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  // Memoize template buttons
  const templateButtons = useMemo(
    () =>
      templates.map((template) => (
        <Button
          key={template.id}
          onClick={() => setSelectedTemplate(template)}
          className={cn(
            'px-6 py-3 rounded-xl flex items-center gap-2 transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 focus:ring-offset-navy-900',
            selectedTemplate.id === template.id
              ? `bg-gradient-to-r ${template.color} text-white shadow-lg shadow-yellow-500/25`
              : 'bg-navy-700/50 text-gray-400 hover:text-white hover:bg-navy-700',
          )}
          aria-pressed={selectedTemplate.id === template.id}
          aria-label={`Select ${template.emotion} template`}
        >
          <template.icon className="h-5 w-5" />
          <span className="font-medium">{template.emotion}</span>
        </Button>
      )),
    [selectedTemplate],
  );

  return (
    <main ref={containerRef} className={cn('relative w-full font-sans', className)} aria-label="Maple Aurum Homepage">
      {/* Section 1: Hero Banner with Video */}
      <section className="relative min-h-screen flex flex-col overflow-hidden bg-gradient-to-b from-navy-900 via-navy-800 to-navy-900">
        {/* Dynamic background with glassmorphism */}
        <div className="absolute inset-0 backdrop-blur-[2px]">
          <div className="absolute inset-0 bg-[url('/grid-pattern.png')] bg-[length:40px_40px] opacity-10" />
          <motion.div className="absolute inset-0" style={{ y: bubblesY }} aria-hidden="true">
            {[...Array(10)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute rounded-full"
                style={{
                  width: `${20 + Math.random() * 40}px`,
                  height: `${20 + Math.random() * 40}px`,
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  background:
                    i % 3 === 0
                      ? 'radial-gradient(circle, rgba(251, 191, 36, 0.2) 0%, transparent 70%)'
                      : i % 3 === 1
                        ? 'radial-gradient(circle, rgba(34, 197, 94, 0.15) 0%, transparent 70%)'
                        : 'radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%)',
                  filter: 'blur(1px)',
                  willChange: 'transform, opacity',
                }}
                animate={{
                  y: [0, -30, 0],
                  scale: [1, 1.1, 1],
                  opacity: [0.2, 0.4, 0.2],
                }}
                transition={{
                  duration: 5 + Math.random() * 3,
                  repeat: Infinity,
                  delay: Math.random() * 3,
                  ease: 'easeInOut',
                }}
              />
            ))}
          </motion.div>
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-900/10 via-transparent to-amber-900/10" />
        </div>

        {/* Navigation Header */}
        <header className="relative z-40 mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <nav className="flex items-center justify-between" aria-label="Main navigation">
            <a
              href="/"
              className="flex items-center gap-3 group focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 focus:ring-offset-navy-900"
              aria-label="Maple Aurum Home"
            >
              <div className="relative">
                <LazyLoadImage
                  src="/GeminiMALBig3.webp"
                  alt="Maple Aurum Logo"
                  className="h-12 w-12 rounded-xl object-cover ring-2 ring-yellow-500/20 group-hover:ring-yellow-400/50 transition-all duration-300"
                  effect="blur"
                  width={48}
                  height={48}
                />
                <motion.div
                  className="absolute -inset-1 bg-gradient-to-r from-yellow-400 to-amber-600 rounded-xl opacity-0 group-hover:opacity-50 blur-lg transition-opacity duration-300"
                />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-yellow-400 to-amber-300 bg-clip-text text-transparent">
                Maple Aurum
              </span>
            </a>

            <div className="hidden md:flex items-center gap-8">
              <a
                href="/companies"
                className="text-sm font-medium text-white/80 hover:text-yellow-400 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 focus:ring-offset-navy-900"
                aria-label="View Companies"
              >
                Companies
              </a>
              <a
                href="/scatter-score-pro"
                className="text-sm font-medium text-white/80 hover:text-yellow-400 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 focus:ring-offset-navy-900"
                aria-label="Explore ScatterScore"
              >
                ScatterScore™
              </a>
              <a
                href="/scoring"
                className="text-sm font-medium text-white/80 hover:text-yellow-400 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 focus:ring-offset-navy-900"
                aria-label="View Rankings"
              >
                Rankings
              </a>
              <Button
                size="default"
                className="shadow-2xl"
                onClick={() => navigate('/subscribe')}
                aria-label="Upgrade to Pro"
              >
                <Crown className="h-4 w-4 mr-2" />
                Upgrade to Pro
              </Button>
            </div>
          </nav>
        </header>

        {/* Hero Content with Video */}
        <motion.main
          className="relative flex-1 flex flex-col items-center justify-start px-4 sm:px-6 lg:px-8 pt-12"
          style={{ y: heroY, opacity: fadeOut }}
          aria-label="Hero Section"
        >
          <div className="mx-auto max-w-7xl w-full text-center">
            {/* Updated Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-4 tracking-tight leading-tight"
            >
              Precision Analytics for
              <span className="block mt-2 bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 bg-clip-text text-transparent animate-gradient">
                Precious Metals Investing
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-lg sm:text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto mb-8 font-light"
            >
              Transform raw data into actionable insights with MapleAurum’s proprietary scoring engines and interactive tools, rivaling institutional-grade software.
            </motion.p>

            {/* Video Container (unchanged) */}
            <motion.div
              ref={videoContainerRef}
              initial={{ opacity: 0, scale: 0.9, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.3 }}
              className="relative max-w-4xl mx-auto mb-10"
            >
              <div className="relative rounded-3xl overflow-hidden backdrop-blur-sm bg-white/5 border border-white/10 shadow-2xl">
                <div className="absolute -inset-1 bg-gradient-to-r from-yellow-500/20 via-amber-500/20 to-yellow-500/20 rounded-3xl blur-2xl animate-pulse" />
                <div className="relative p-4 sm:p-6">
                  <div className="relative rounded-2xl overflow-hidden bg-black/50">
                    <AnimatePresence>
                      {!isVideoReady && (
                        <motion.div
                          initial={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.5 }}
                          className="absolute inset-0 z-10"
                        >
                          <LazyLoadImage
                            src="/GeminiMALBig2.jpg"
                            alt="Maple Aurum Logo"
                            className="w-full h-full object-cover rounded-2xl"
                            effect="blur"
                            onLoad={() => setImageLoaded(true)}
                            width={1200}
                            height={675}
                          />
                          {imageLoaded && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                className="w-12 h-12 border-4 border-yellow-400/20 border-t-yellow-400 rounded-full"
                              />
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <video
                      ref={videoRef}
                      className="w-full h-auto rounded-2xl"
                      autoPlay
                      loop
                      muted={isMuted}
                      playsInline
                      preload="auto"
                      onLoadedData={() => setHasVideoLoaded(true)}
                      onCanPlayThrough={() => {
                        setIsVideoReady(true);
                        if (isVideoInView && isVideoPlaying) {
                          videoRef.current?.play().catch(() => {
                            setIsVideoPlaying(false);
                          });
                        }
                      }}
                      poster="/GeminiMALBig2.jpg"
                      aria-label="Maple Aurum Logo Reveal"
                    >
                      <source src="/Cosmic_Genesis_Logo_Reveal_Video_2.mp4" type="video/mp4" />
                      Your browser does not support the video tag.
                    </video>

                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />

                    <AnimatePresence>
                      {hasVideoLoaded && isVideoReady && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="absolute bottom-4 left-4 right-4 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <button
                              onClick={togglePlayPause}
                              className="p-2 rounded-full bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                              aria-label={isVideoPlaying ? 'Pause video' : 'Play video'}
                            >
                              {isVideoPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                            </button>
                            <button
                              onClick={toggleMute}
                              className="p-2 rounded-full bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                              aria-label={isMuted ? 'Unmute video' : 'Mute video'}
                            >
                              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                            </button>
                          </div>
                          <div className="text-xs text-white/70 bg-black/50 backdrop-blur-sm px-3 py-1 rounded-full">
                            Experience MapleAurum
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="absolute -top-20 -left-20 w-40 h-40 bg-yellow-500/20 rounded-full blur-3xl" />
                  <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-amber-500/20 rounded-full blur-3xl" />
                </div>
              </div>

              {[...Array(4)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 bg-gradient-to-r from-yellow-400 to-amber-400 rounded-full"
                  style={{
                    top: `${20 + i * 15}%`,
                    left: i % 2 === 0 ? '-5%' : '105%',
                  }}
                  animate={{
                    x: i % 2 === 0 ? [0, 20, 0] : [0, -20, 0],
                    y: [0, -10, 0],
                    opacity: [0.3, 1, 0.3],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    delay: i * 0.5,
                    ease: 'easeInOut',
                  }}
                />
              ))}
            </motion.div>

            {/* Updated CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-8"
            >
              <Button
                size="lg"
                className="text-lg px-10 py-6 shadow-2xl transform hover:scale-110 transition-all duration-300 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500"
                onClick={() => navigate('/hook')}
                aria-label="Start Free Analysis"
              >
                <Rocket className="h-6 w-6 mr-2" />
                Start Free Analysis
              </Button>

              <Button
                size="lg"
                className="text-lg px-10 py-6 shadow-2xl transform hover:scale-110 transition-all duration-300"
                onClick={() => navigate('/scatter-score-pro')}
                aria-label="Explore Premium Tools"
              >
                <Zap className="h-6 w-6 mr-2" />
                Explore Premium Tools
              </Button>
            </motion.div>

            <p className="text-sm text-yellow-400/80 animate-pulse mb-8">Free access with premium features for subscribers!</p>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.8 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-8 text-sm text-gray-400"
            >
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-400" />
                <span>650+ Companies Tracked</span>
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
        </motion.main>

        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          aria-hidden="true"
        >
          <ChevronDown className="h-8 w-8 text-white/50" />
        </motion.div>
      </section>

      {/* New Section: Scoring Engines Spotlight */}
      <section className="relative py-32 bg-gradient-to-b from-navy-900 to-navy-800 overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6">
              Proprietary Analytics
              <span className="block mt-2 bg-gradient-to-r from-yellow-400 to-amber-400 bg-clip-text text-transparent">
                Powering Your Success
              </span>
            </h2>
            <p className="text-lg sm:text-xl text-gray-300 max-w-3xl mx-auto">
              MapleAurum’s unique scoring engines transform complex data into clear, actionable insights for investors of all levels.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {scoringEngines.map((engine, index) => (
              <motion.article
                key={engine.id}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ y: -10, scale: 1.02 }}
                className="group"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && navigate(`/${engine.id}`)}
                aria-label={`Learn more about ${engine.name}`}
              >
                <div className="relative bg-navy-800/50 backdrop-blur-sm rounded-2xl p-8 border border-navy-700 hover:border-yellow-500/50 transition-all duration-300 h-full">
                  <div className={cn('absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-20 transition-opacity duration-300', `bg-gradient-to-r ${engine.color}/20`)} />
                  <motion.div
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.5 }}
                    className={cn('inline-flex p-4 rounded-2xl mb-6', 'bg-gradient-to-br', engine.color)}
                  >
                    <engine.icon className="h-8 w-8 text-white" />
                  </motion.div>
                  <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">{engine.name}</h3>
                  <p className="text-gray-400 mb-6">{engine.description}</p>
                  <Button
                    variant="ghost"
                    className="w-full bg-white/5 hover:bg-white/10 border border-white/10"
                    onClick={() => navigate(`/${engine.id}`)}
                  >
                    <span className="bg-gradient-to-r from-yellow-400 to-amber-400 bg-clip-text text-transparent font-medium">
                      Learn More
                    </span>
                    <ArrowRight className="h-4 w-4 ml-2 text-yellow-400" />
                  </Button>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* Section 2: Choose Your Path (unchanged) */}
      <section className="relative py-32 bg-gradient-to-b from-navy-900 to-navy-800 overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6">
              Choose Your Path to Success
            </h2>
            <p className="text-lg sm:text-xl text-gray-300 max-w-3xl mx-auto">
              Whether you want a personalized experience or prefer to explore proven strategies, we've got you covered.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8">
            <motion.article
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              whileHover={{ scale: 1.02 }}
              className="relative group cursor-pointer"
              onClick={() => navigate('/hook')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && navigate('/hook')}
              aria-label="Start Personalized Journey"
            >
              <div className="relative h-full bg-gradient-to-br from-cyan-900/20 to-purple-900/20 rounded-3xl p-8 border border-cyan-500/20 hover:border-cyan-400/50 transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-purple-500/10 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative z-10">
                  <div className="w-16 h-16 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6">
                    <Target className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-bold text-white mb-4">Personalized for You</h3>
                  <p className="text-base sm:text-lg text-gray-300 mb-6">
                    Answer a few questions about your investment style and get curated company recommendations matched to your unique profile.
                  </p>
                  <ul className="space-y-3 mb-8">
                    <li className="flex items-center gap-3 text-gray-300">
                      <div className="w-2 h-2 rounded-full bg-cyan-400" />
                      <span>5-minute guided journey</span>
                    </li>
                    <li className="flex items-center gap-3 text-gray-300">
                      <div className="w-2 h-2 rounded-full bg-purple-400" />
                      <span>Custom-tailored recommendations</span>
                    </li>
                    <li className="flex items-center gap-3 text-gray-300">
                      <div className="w-2 h-2 rounded-full bg-pink-400" />
                      <span>Gamified experience with achievements</span>
                    </li>
                  </ul>
                  <Button className="w-full bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500">
                    Start Personalized Journey
                    <ArrowRight className="h-5 w-5 ml-2" />
                  </Button>
                </div>
              </div>
            </motion.article>

            <motion.article
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              whileHover={{ scale: 1.02 }}
              className="relative group cursor-pointer"
              onClick={() => navigate('/scatter-score-pro')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && navigate('/scatter-score-pro')}
              aria-label="Explore Templates"
            >
              <div className="relative h-full bg-gradient-to-br from-yellow-900/20 to-amber-900/20 rounded-3xl p-8 border border-yellow-500/20 hover:border-yellow-400/50 transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-amber-500/10 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative z-10">
                  <div className="w-16 h-16 bg-gradient-to-r from-yellow-500 to-amber-600 rounded-2xl flex items-center justify-center mb-6">
                    <Zap className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-bold text-white mb-4">Explore Templates</h3>
                  <p className="text-base sm:text-lg text-gray-300 mb-6">
                    Jump straight into our proven analysis templates designed by experts for different investment strategies.
                  </p>
                  <ul className="space-y-3 mb-8">
                    <li className="flex items-center gap-3 text-gray-300">
                      <div className="w-2 h-2 rounded-full bg-yellow-400" />
                      <span>Instant access to all templates</span>
                    </li>
                    <li className="flex items-center gap-3 text-gray-300">
                      <div className="w-2 h-2 rounded-full bg-amber-400" />
                      <span>Pre-configured for popular strategies</span>
                    </li>
                    <li className="flex items-center gap-3 text-gray-300">
                      <div className="w-2 h-2 rounded-full bg-orange-400" />
                      <span>Advanced customization options</span>
                    </li>
                  </ul>
                  <Button className="w-full">
                    Browse Templates
                    <ArrowRight className="h-5 w-5 ml-2" />
                  </Button>
                </div>
              </div>
            </motion.article>
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="text-center text-gray-400 mt-8"
          >
            Not sure which to choose? Start with the personalized journey—you can always explore templates later!
          </motion.p>
        </div>
      </section>

      {/* Section 3: Problem & Solution (updated messaging) */}
      <section className="relative py-32 bg-gradient-to-b from-navy-800 to-navy-900 overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6">
              Precious Metals Investing
              <span className="block mt-2 bg-gradient-to-r from-yellow-400 to-amber-400 bg-clip-text text-transparent">
                Simplified with Precision
              </span>
            </h2>
            <p className="text-lg sm:text-xl text-gray-300 max-w-3xl mx-auto">
              Navigating reserves, valuations, and cash flows is complex. MapleAurum’s proprietary tools deliver institutional-grade insights instantly.
            </p>
          </motion.div>

          <div className="relative">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <motion.article
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                className="relative"
                aria-label="The Old Way of Analysis"
              >
                <div className="relative h-96 rounded-2xl overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-red-900/20 to-red-800/20 backdrop-blur-sm" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-6xl mb-4">📊📈📉🤯</div>
                      <h3 className="text-xl sm:text-2xl font-bold text-red-400 mb-2">The Old Way</h3>
                      <p className="text-gray-400">Hours of manual data crunching</p>
                    </div>
                  </div>
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
              </motion.article>

              <motion.article
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                className="relative"
                aria-label="The MapleAurum Way"
              >
                <div className="relative h-96 rounded-2xl overflow-hidden bg-gradient-to-br from-green-900/20 to-emerald-800/20">
                  <LazyLoadImage
                    src="/ScatterScore1b.webp"
                    alt="MapleAurum Clarity"
                    className="absolute inset-0 w-full h-full object-cover opacity-80"
                    effect="blur"
                    width={640}
                    height={384}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-8 text-center">
                    <div className="text-6xl mb-4">✨</div>
                    <h3 className="text-xl sm:text-2xl font-bold text-green-400 mb-2">The MapleAurum Way</h3>
                    <p className="text-gray-300">Instant, actionable insights</p>
                  </div>
                </div>
              </motion.article>
            </div>
          </div>
        </div>
      </section>

      {/* Section 4: Interactive Demo (unchanged) */}
      <section className="relative py-32 bg-gradient-to-b from-navy-800 to-navy-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6">
              Explore Stocks Your Way
            </h2>
            <p className="text-lg sm:text-xl text-gray-300 max-w-2xl mx-auto">
              Choose a template, see insights instantly. From value plays to exploration gems, find what fits your strategy.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="bg-navy-800/50 backdrop-blur-sm rounded-3xl p-8 border-2 border-yellow-400/20 shadow-2xl"
          >
            <div className="flex flex-wrap gap-3 mb-8 justify-center">{templateButtons}</div>

            <div className="relative h-[500px] bg-navy-900/50 rounded-2xl overflow-hidden">
              <div className="absolute inset-0 p-8">
                <div className="absolute bottom-8 left-8 right-8 h-px bg-gray-600" />
                <div className="absolute bottom-8 left-8 top-8 w-px bg-gray-600" />
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-gray-400">Valuation Attractiveness →</div>
                <div className="absolute left-2 top-1/2 -translate-y-1/2 -rotate-90 text-xs text-gray-400">Financial Strength →</div>

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
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && setHoveredBubble(company.id)}
                    aria-label={`View details for ${company.name}`}
                  >
                    <div
                      className={cn('w-full h-full rounded-full transition-all duration-300', selectedTemplate.bgGlow)}
                      style={{
                        background: `radial-gradient(circle, ${
                          selectedTemplate.color.includes('yellow')
                            ? 'rgba(251, 191, 36, 0.6)'
                            : selectedTemplate.color.includes('green')
                              ? 'rgba(34, 197, 94, 0.6)'
                              : selectedTemplate.color.includes('blue')
                                ? 'rgba(59, 130, 246, 0.6)'
                                : selectedTemplate.color.includes('purple')
                                  ? 'rgba(168, 85, 247, 0.6)'
                                  : 'rgba(251, 146, 60, 0.6)'
                        } 0%, transparent 70%)`,
                        boxShadow: hoveredBubble === company.id ? '0 0 30px rgba(251, 191, 36, 0.5)' : '',
                      }}
                    />
                    <AnimatePresence>
                      {hoveredBubble === company.id && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute -top-20 left-1/2 -translate-x-1/2 bg-black/90 text-white p-3 rounded-lg text-sm whitespace-nowrap"
                          role="tooltip"
                        >
                          <div className="font-bold">{company.name}</div>
                          <div className="text-xs text-gray-300">{company.value}</div>
                          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black/90" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}

                {hoveredBubble && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0 }}
                    className="absolute top-4 right-4 bg-green-500/20 text-green-400 px-4 py-2 rounded-full text-sm font-medium"
                    role="alert"
                  >
                    <Sparkles className="h-4 w-4 inline mr-2" />
                    Great Find!
                  </motion.div>
                )}
              </div>

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
                    <div className="flex gap-2 mt-3 flex-wrap">
                      {selectedTemplate.metrics.map((metric, i) => (
                        <span key={i} className="text-xs px-3 py-1 rounded-full bg-navy-700 text-gray-300">
                          {metric}
                        </span>
                      ))}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => navigate('/scatter-score-pro')}
                    aria-label={`Try ${selectedTemplate.name} template for free`}
                  >
                    Try It Free
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </motion.div>
            </div>

            <div className="mt-6 flex justify-center gap-8 text-sm text-gray-400 flex-wrap">
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

      {/* Section 5: Template Spotlight (unchanged) */}
      <section className="relative py-32 bg-gradient-to-b from-navy-900 via-navy-800 to-navy-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6">Tailored for Every Investor</h2>
            <p className="text-lg sm:text-xl text-gray-300 max-w-3xl mx-auto">
              Whether you're hunting bargains or betting on growth, our templates deliver insights in seconds.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.slice(0, 5).map((template, index) => (
              <motion.article
                key={template.id}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ y: -10, scale: 1.02 }}
                className="group"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && navigate('/scatter-score-pro')}
                aria-label={`Select ${template.name} strategy`}
              >
                <div className="relative bg-navy-800/50 backdrop-blur-sm rounded-2xl p-8 border border-navy-700 hover:border-yellow-500/50 transition-all duration-300 h-full">
                  <div className={cn('absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-20 transition-opacity duration-300', template.bgGlow)} />
                  <motion.div
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.5 }}
                    className={cn('inline-flex p-4 rounded-2xl mb-6', 'bg-gradient-to-br', template.color)}
                  >
                    <template.icon className="h-8 w-8 text-white" />
                  </motion.div>
                  <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">{template.name}</h3>
                  <p className="text-base sm:text-lg font-medium text-yellow-400 mb-3">{template.emotion}</p>
                  <p className="text-gray-400 mb-6">{template.description}</p>
                  <div className="relative h-32 bg-navy-900/50 rounded-xl mb-4 overflow-hidden">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="grid grid-cols-3 gap-2">
                        {[...Array(9)].map((_, i) => (
                          <div
                            key={i}
                            className={cn('w-3 h-3 rounded-full', template.bgGlow)}
                            style={{
                              opacity: 0.3 + Math.random() * 0.7,
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    className="w-full bg-white/5 hover:bg-white/10 border border-white/10"
                    onClick={() => navigate('/scatter-score-pro')}
                  >
                    <span className="bg-gradient-to-r from-yellow-400 to-amber-400 bg-clip-text text-transparent font-medium">
                      Pick This Strategy
                    </span>
                    <ArrowRight className="h-4 w-4 ml-2 text-yellow-400" />
                  </Button>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* Section 6: ScatterScore Power (updated messaging) */}
      <section className="relative py-32 bg-gradient-to-b from-navy-900 to-navy-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6">Unmatched Analytical Precision</h2>
            <p className="text-lg sm:text-xl text-gray-300 max-w-3xl mx-auto">
              Leverage MapleAurum’s ScatterScore™ to analyze Canadian precious metals companies with over 50 metrics, uncovering opportunities with speed and clarity.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-navy-800 to-navy-900 shadow-2xl border border-yellow-400/20"
          >
            <LazyLoadImage
              src="/ScatterScore3.webp"
              alt="ScatterScore Analysis Interface"
              className="w-full h-auto object-cover"
              effect="blur"
              width={1280}
              height={720}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-8 text-center">
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">Advanced Analytics at Your Fingertips</h3>
              <p className="text-gray-300 mb-6">Visualize complex data effortlessly and make informed investment decisions.</p>
              <Button size="lg" className="shadow-2xl" onClick={() => navigate('/scatter-score-pro')} aria-label="Explore ScatterScore Now">
                Explore ScatterScore™ Now
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Section 7: Final CTA (updated messaging) */}
      <section className="relative py-32 bg-gradient-to-b from-navy-800 to-navy-900 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/10 via-transparent to-amber-500/10" />
          {[...Array(30)].map((_, i) => (
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
                scale: [0, 1.5, 0],
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 5,
              }}
              aria-hidden="true"
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
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-6">Unlock Winning Investments Today</h2>
            <p className="text-lg sm:text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Start with free access to MapleAurum’s powerful analytics. Upgrade to Pro for unlimited insights and premium tools.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-8">
              <Button
                size="lg"
                className="text-lg px-10 py-6 shadow-2xl transform hover:scale-110 transition-all duration-300 animate-pulse"
                onClick={() => navigate('/subscribe')}
                aria-label="Try Free Now"
              >
                <Zap className="h-5 w-5 mr-2" />
                Try Free Now
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-2 border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10 px-10 py-6 text-lg"
                onClick={() => navigate('/subscribe')}
                aria-label="Subscribe to Pro or Premium"
              >
                <Crown className="h-5 w-5 mr-2" />
                Subscribe to Pro or Premium
              </Button>
            </div>

            <div className="bg-black/50 backdrop-blur-sm rounded-full px-6 py-3 inline-flex items-center gap-2 text-yellow-400 mb-8">
              <Zap className="h-5 w-5 animate-pulse" />
              <span className="font-medium">Free plan includes basic access; Pro unlocks premium analytics</span>
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

      {/* Sticky CTA Bar (updated messaging) */}
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 1 }}
        className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-sm rounded-full px-6 py-3 flex items-center gap-4 z-50"
      >
        <span className="text-white text-sm font-medium">Ready to unlock premium insights?</span>
        <Button
          size="sm"
          className="bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500"
          onClick={() => navigate('/subscribe')}
          aria-label="Get Started Now"
        >
          Get Started
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </motion.div>
    </main>
  );
};