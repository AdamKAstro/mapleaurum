//src/pages/how-to-choose-a-precious-metals-mining-company-to-invest-in.tsx

import { useState, React } from 'react'; // Add this import
import { Helmet } from 'react-helmet-async';
import { PageContainer } from '../components/ui/page-container';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '../components/ui/button';
import { Check, ArrowRight, TrendingUp, Shield, Gem, Target, AlertCircle, Book, DollarSign, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Enhanced Structured Data with FAQ Schema
const structuredData = [
  {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "How to Choose a Precious Metals Mining Company to Invest In: Complete 2025 Guide",
    "description": "Master precious metals mining investment with our comprehensive guide. Learn to evaluate gold and silver mining stocks using proven metrics, industry insights, and expert analysis.",
    "author": {
      "@type": "Organization",
      "name": "Maple Aurum",
      "url": "https://mapleaurum.com"
    },
    "publisher": {
      "@type": "Organization",
      "name": "Maple Aurum",
      "logo": {
        "@type": "ImageObject",
        "url": "https://mapleaurum.com/GeminiMALBig3.jpg"
      }
    },
    "datePublished": "2025-07-27",
    "dateModified": "2025-07-27",
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": "https://mapleaurum.com/how-to-choose-a-precious-metals-mining-company-to-invest-in"
    },
    "keywords": "precious metals mining, gold mining stocks, silver mining stocks, investment metrics, ScatterScore, financial analysis, mining reserves, production costs, AISC, free cash flow, gold ETFs, silver ETFs, mining valuation",
    "articleBody": "Comprehensive guide to evaluating precious metals mining companies...",
    "wordCount": 4500,
    "timeRequired": "PT15M"
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "What are the most important metrics when evaluating gold mining stocks?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "The most critical metrics include proven reserves (measured in ounces), all-in sustaining costs (AISC), free cash flow, debt-to-equity ratio, and reserve life. Companies with reserves over 5 million ounces, AISC below $1,200/oz, and positive free cash flow typically offer the best risk-reward profiles."
        }
      },
      {
        "@type": "Question",
        "name": "How do junior mining companies differ from major mining companies?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Junior miners focus on exploration and early-stage development, offering 10-100x return potential but with higher risk. Major miners like Barrick Gold and Newmont have established operations, stable cash flows, and dividends, typically offering 2-5x returns with lower risk."
        }
      },
      {
        "@type": "Question",
        "name": "What is a good P/NAV ratio for mining stocks?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "A Price-to-Net Asset Value (P/NAV) ratio below 1.0 suggests undervaluation. During bull markets, quality miners trade at 1.2-1.5x NAV. Juniors with exceptional projects can justify 0.7-0.9x NAV, while majors typically trade at 0.9-1.2x NAV."
        }
      }
    ]
  }
];

export function HowToChooseMiningCompanyPage() {
  const navigate = useNavigate();
  const backgroundImageUrl = "/Background2.jpg";

  return (
    <PageContainer
      title="How to Choose a Precious Metals Mining Company to Invest In: Complete 2025 Guide"
      description="Master precious metals mining investment with our comprehensive guide. Learn to evaluate gold and silver mining stocks using proven metrics, industry insights, and expert analysis tailored for the current bull market."
    >
      <Helmet>
        <title>How to Choose a Precious Metals Mining Company to Invest In | Complete 2025 Guide | Maple Aurum</title>
        <meta
          name="description"
          content="Master precious metals mining investment with our comprehensive guide. Learn to evaluate gold and silver mining stocks using proven metrics, industry insights, and expert analysis tailored for the current bull market."
        />
        <meta
          name="keywords"
          content="precious metals mining, gold mining stocks, silver mining stocks, investment metrics, ScatterScore, financial analysis, mining reserves, production costs, AISC, free cash flow, gold ETFs, silver ETFs, mining valuation, P/NAV ratio, gold bull market"
        />
        <meta name="author" content="Maple Aurum" />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://mapleaurum.com/how-to-choose-a-precious-metals-mining-company-to-invest-in" />
        <meta property="og:title" content="How to Choose a Precious Metals Mining Company to Invest In | Complete 2025 Guide" />
        <meta
          property="og:description"
          content="Master precious metals mining investment with our comprehensive guide. Learn proven strategies for evaluating gold and silver mining stocks in today's market."
        />
        <meta property="og:type" content="article" />
        <meta property="og:url" content="https://mapleaurum.com/how-to-choose-a-precious-metals-mining-company-to-invest-in" />
        <meta property="og:image" content="https://mapleaurum.com/GeminiMALBig3.jpg" />
        <meta property="og:site_name" content="Maple Aurum" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="How to Choose a Precious Metals Mining Company | Complete Investment Guide" />
        <meta
          name="twitter:description"
          content="Discover proven strategies for evaluating gold and silver mining stocks. Learn key metrics, valuation methods, and market insights for successful precious metals investing."
        />
        <meta name="twitter:image" content="https://mapleaurum.com/GeminiMALBig3.jpg" />
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      </Helmet>

      <div className="relative isolate">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat bg-fixed -z-10 opacity-[0.03]"
          style={{ backgroundImage: `url('${backgroundImageUrl}')` }}
          aria-hidden="true"
        />
        <div className="relative z-0 space-y-12">
          {/* Enhanced Hero Section */}
          <section className="text-center py-16">
            <div className="inline-flex items-center px-4 py-2 bg-yellow-600/20 rounded-full mb-6">
              <TrendingUp className="w-4 h-4 mr-2 text-yellow-500" />
              <span className="text-sm text-yellow-400">Gold at Historic Highs • Silver Outperforming</span>
            </div>
            <h1 className="text-5xl font-bold text-gray-100 mb-6">
              How to Choose a Precious Metals Mining Company to Invest In
            </h1>
            <p className="text-xl text-gray-300 max-w-4xl mx-auto mb-8">
              In an era of currency debasement and inflation, precious metals mining stocks offer exceptional leverage to rising gold and silver prices. This comprehensive guide reveals the exact metrics professional investors use to identify tomorrow's winners in the mining sector.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                onClick={() => navigate('/subscribe')}
                className="bg-yellow-600 hover:bg-yellow-700 text-white text-lg px-8 py-3"
              >
                Start Analyzing with ScatterScore™ <ArrowRight className="ml-2" />
              </Button>
              <Button
                onClick={() => navigate('../../companies')}
                variant="outline"
                className="border-gray-600 text-gray-300 hover:bg-gray-800 text-lg px-8 py-3"
              >
                View Top Mining Stocks
              </Button>
            </div>
          </section>

          {/* Market Context Alert */}
          <Card className="bg-gradient-to-r from-yellow-900/20 to-yellow-800/20 border-yellow-600/30">
            <CardContent className="p-6">
              <div className="flex items-start space-x-4">
                <AlertCircle className="w-6 h-6 text-yellow-500 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-lg font-semibold text-yellow-400 mb-2">Current Market Opportunity</h3>
                  <p className="text-gray-300">
                    With gold trading above $3,000 USD/oz and silver showing strength above $35 USD/oz, mining stocks remain historically undervalued relative to metal prices. The gold-to-gold-miners ratio suggests a potential 2-3x catch-up move in quality mining equities. Central bank buying reached record levels in 2024, while retail investment remains subdued—a classic setup for outperformance.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Table of Contents */}
          <Card className="bg-navy-800/50 border-navy-700">
            <CardHeader>
              <CardTitle className="text-xl text-cyan-400">Quick Navigation</CardTitle>
            </CardHeader>
            <CardContent>
              <nav className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <a href="#why-mining-stocks" className="text-gray-300 hover:text-cyan-400 transition-colors">→ Why Mining Stocks Outperform Physical Metals</a>
                <a href="#company-types" className="text-gray-300 hover:text-cyan-400 transition-colors">→ Types of Mining Companies Explained</a>
                <a href="#key-metrics" className="text-gray-300 hover:text-cyan-400 transition-colors">→ Essential Metrics for Analysis</a>
                <a href="#valuation-methods" className="text-gray-300 hover:text-cyan-400 transition-colors">→ Professional Valuation Techniques</a>
                <a href="#red-flags" className="text-gray-300 hover:text-cyan-400 transition-colors">→ Red Flags to Avoid</a>
                <a href="#investment-strategies" className="text-gray-300 hover:text-cyan-400 transition-colors">→ Investment Strategies & Portfolio Building</a>
                <a href="#market-timing" className="text-gray-300 hover:text-cyan-400 transition-colors">→ Market Timing & Cycles</a>
                <a href="#case-studies" className="text-gray-300 hover:text-cyan-400 transition-colors">→ Real-World Case Studies</a>
              </nav>
            </CardContent>
          </Card>

          {/* Why Mining Stocks Section */}
          <section id="why-mining-stocks" className="space-y-6">
            <h2 className="text-3xl font-bold text-gray-100 flex items-center">
              <TrendingUp className="w-8 h-8 mr-3 text-yellow-500" />
              Why Mining Stocks Outperform Physical Metals
            </h2>
            <p className="text-gray-300 text-lg">
              While physical gold and silver provide portfolio insurance, mining stocks offer leverage that can multiply returns during precious metals bull markets. Here's why sophisticated investors allocate to miners:
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-navy-800/70 border-navy-700">
                <CardHeader className="bg-gradient-to-r from-yellow-900/20 to-transparent">
                  <CardTitle className="text-cyan-400">Operational Leverage</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-300">
                    When gold rises from $2,000 to $2,500 (25% gain), a miner with $1,200 AISC sees profits surge from $800 to $1,300 per ounce—a 62.5% increase. This leverage effect becomes even more pronounced in junior miners with lower market caps.
                  </p>
                </CardContent>
            	</Card>

          	  <Card className="bg-navy-800/70 border-navy-700">
          	  	<CardHeader className="bg-gradient-to-r from-yellow-900/20 to-transparent">
          	  	  <CardTitle className="text-cyan-400">Discovery & Growth Potential</CardTitle>
          	  	</CardHeader>
          	  	<CardContent>
          	  	  <p className="text-gray-300">
          	  	  	Unlike static bullion, mining companies can grow reserves through exploration. A single major discovery can increase a junior miner's value by 10-50x, as seen with Great Bear Resources' Dixie discovery (acquired for C$1.8 billion).
          	  	  </p>
          	  	</CardContent>
          	  </Card>

          	  <Card className="bg-navy-800/70 border-navy-700">
          	  	<CardHeader className="bg-gradient-to-r from-yellow-900/20 to-transparent">
          	  	  <CardTitle className="text-cyan-400">Dividend Income</CardTitle>
          	  	</CardHeader>
          	  	<CardContent>
          	  	  <p className="text-gray-300">
          	  	  	Major producers like Agnico Eagle and Franco-Nevada offer growing dividends, currently yielding 2-4%. During the last gold bull market (2001-2011), some miners increased dividends by over 1,000%.
          	  	  </p>
          	  	</CardContent>
          	  </Card>

          	  <Card className="bg-navy-800/70 border-navy-700">
          	  	<CardHeader className="bg-gradient-to-r from-yellow-900/20 to-transparent">
          	  	  <CardTitle className="text-cyan-400">M&A Premium Potential</CardTitle>
          	  	</CardHeader>
          	  	<CardContent>
          	  	  <p className="text-gray-300">
          	  	  	Industry consolidation accelerates during bull markets. Recent examples include Newmont's acquisition of Newcrest (31% premium) and Agnico's merger with Kirkland Lake (premium valuation realized).
          	  	  </p>
          	  	</CardContent>
          	  </Card>
          	</div>
        	</section>

        	{/* Enhanced Company Types Section */}
        	<section id="company-types" className="space-y-6">
          	<h2 className="text-3xl font-bold text-gray-100 flex items-center">
            	<Check className="w-8 h-8 mr-3 text-yellow-500" />
            	Understanding Different Types of Mining Companies
          	</h2>
          	<p className="text-gray-300 text-lg">
            	Successful precious metals investing requires matching company types to your risk tolerance and return objectives. Each category offers distinct opportunities in the current market cycle:
          	</p>

          	{/* Major Producers */}
          	<Card className="bg-navy-800/70 border-navy-700 backdrop-blur-sm">
            	<CardHeader className="bg-navy-700/30 border-b border-navy-600">
              	<CardTitle className="text-xl font-bold text-cyan-400">Major Producers (Market Cap {'>'} $10B)</CardTitle>
            	</CardHeader>
            	<CardContent className="space-y-4 pt-6">
              	<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                	<div>
                  	<h4 className="font-semibold text-gray-200 mb-3">Characteristics:</h4>
                  	<ul className="space-y-2 text-gray-300">
                    	<li className="flex items-start">
                      	<Check className="w-4 h-4 mr-2 text-green-500 flex-shrink-0 mt-1" />
                      	<span>Multiple operating mines across stable jurisdictions</span>
                    	</li>
                    	<li className="flex items-start">
                      	<Check className="w-4 h-4 mr-2 text-green-500 flex-shrink-0 mt-1" />
                      	<span>Production {'>'} 500,000 oz gold annually</span>
                    	</li>
                    	<li className="flex items-start">
                      	<Check className="w-4 h-4 mr-2 text-green-500 flex-shrink-0 mt-1" />
                      	<span>Strong balance sheets (Debt/EBITDA {'<'} 2x)</span>
                    	</li>
                    	<li className="flex items-start">
                      	<Check className="w-4 h-4 mr-2 text-green-500 flex-shrink-0 mt-1" />
                      	<span>Consistent free cash flow generation</span>
                    	</li>
                    	<li className="flex items-start">
                      	<Check className="w-4 h-4 mr-2 text-green-500 flex-shrink-0 mt-1" />
                      	<span>Regular dividends and buyback programs</span>
                    	</li>
                  	</ul>
                	</div>
                	<div>
                  	<h4 className="font-semibold text-gray-200 mb-3">Investment Thesis:</h4>
                  	<p className="text-gray-300 mb-3">
                    	Major producers offer stability and steady returns through the cycle. In the current environment, they trade at historically low valuations (0.9-1.1x NAV) despite record margins. Conservative investors seeking 50-100% returns with limited downside should focus here.
                  	</p>
                  	<p className="text-sm text-gray-400">
                    	<strong>Top Examples:</strong> Newmont (NEM), Barrick Gold (GOLD), Agnico Eagle (AEM), Franco-Nevada (FNV)
                  	</p>
                	</div>
              	</div>
              	<div className="mt-4 p-4 bg-navy-900/50 rounded-lg">
                	<p className="text-sm text-gray-300">
                  	<strong className="text-cyan-400">Current Opportunity:</strong> Majors are generating record free cash flow at current gold prices but trade at just 12x P/E on average—half their historical multiples. The sector offers asymmetric risk/reward for conservative investors.
                	</p>
              	</div>
            	</CardContent>
          	</Card>

          	{/* Mid-Tier Producers */}
          	<Card className="bg-navy-800/70 border-navy-700 backdrop-blur-sm">
            	<CardHeader className="bg-navy-700/30 border-b border-navy-600">
            	  <CardTitle className="text-xl font-bold text-cyan-400">Mid-Tier Producers ($1B - $10B Market Cap)</CardTitle>
          	  </CardHeader>
          	  <CardContent className="space-y-4 pt-6">
            	<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              	  <div>
                	<h4 className="font-semibold text-gray-200 mb-3">Characteristics:</h4>
                	<ul className="space-y-2 text-gray-300">
                  	  <li className="flex items-start">
                    	<Check className="w-4 h-4 mr-2 text-green-500 flex-shrink-0 mt-1" />
                    	<span>1-5 producing assets</span>
                  	  </li>
                  	  <li className="flex items-start">
                    	<Check className="w-4 h-4 mr-2 text-green-500 flex-shrink-0 mt-1" />
                    	<span>Production: 100,000-500,000 oz annually</span>
                  	  </li>
                  	  <li className="flex items-start">
                    	<Check className="w-4 h-4 mr-2 text-green-500 flex-shrink-0 mt-1" />
                    	<span>Active development pipelines</span>
                  	  </li>
                  	  <li className="flex items-start">
                    	<Check className="w-4 h-4 mr-2 text-green-500 flex-shrink-0 mt-1" />
                    	<span>M&A targets or acquirers</span>
                  	  </li>
                  	  <li className="flex items-start">
                    	<Check className="w-4 h-4 mr-2 text-green-500 flex-shrink-0 mt-1" />
                    	<span>Improving margins through optimization</span>
                  	  </li>
                	</ul>
              	  </div>
              	  <div>
                	<h4 className="font-semibold text-gray-200 mb-3">Investment Thesis:</h4>
                	<p className="text-gray-300 mb-3">
                  	  Mid-tiers offer the "sweet spot" of growth and stability. They're large enough to weather volatility but small enough to double production through single project additions. Many trade at 0.7-0.9x NAV despite clear paths to re-rating.
                	</p>
                	<p className="text-sm text-gray-400">
                  	  <strong>Top Examples:</strong> Alamos Gold (AGI), Equinox Gold (EQX), Endeavour Mining (EDV), SSR Mining (SSRM)
                	  </p>
              	  </div>
            	</div>
            	<div className="mt-4 p-4 bg-navy-900/50 rounded-lg">
              	<p className="text-sm text-gray-300">
                	<strong className="text-cyan-400">Current Opportunity:</strong> Mid-tiers with production growth stories can deliver 100-300% returns. Focus on companies bringing new mines online in 2025-2026 at current metal prices.
              	</p>
            	</div>
          	  </CardContent>
        	</Card>

        	{/* Development Companies */}
        	<Card className="bg-navy-800/70 border-navy-700 backdrop-blur-sm">
          	<CardHeader className="bg-navy-700/30 border-b border-navy-600">
            	<CardTitle className="text-xl font-bold text-cyan-400">Development Companies ($100M - $1B Market Cap)</CardTitle>
          	</CardHeader>
          	<CardContent className="space-y-4 pt-6">
            	<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              	<div>
                	<h4 className="font-semibold text-gray-200 mb-3">Characteristics:</h4>
                	<ul className="space-y-2 text-gray-300">
                  	<li className="flex items-start">
                    	<Check className="w-4 h-4 mr-2 text-green-500 flex-shrink-0 mt-1" />
                    	<span>Defined resources (PEA/PFS/FS complete)</span>
                  	</li>
                  	<li className="flex items-start">
                    	<Check className="w-4 h-4 mr-2 text-green-500 flex-shrink-0 mt-1" />
                    	<span>Clear path to production (2-4 years)</span>
                  	</li>
                  	<li className="flex items-start">
                    	<Check className="w-4 h-4 mr-2 text-green-500 flex-shrink-0 mt-1" />
                    	<span>Permitted or advancing permitting</span>
                  	</li>
                  	<li className="flex items-start">
                    	<Check className="w-4 h-4 mr-2 text-green-500 flex-shrink-0 mt-1" />
                    	<span>Strategic investor interest</span>
                  	</li>
                  	<li className="flex items-start">
                    	<AlertCircle className="w-4 h-4 mr-2 text-yellow-500 flex-shrink-0 mt-1" />
                    	<span>Financing risk remains key consideration</span>
                  	</li>
                	</ul>
              	</div>
              	<div>
                	<h4 className="font-semibold text-gray-200 mb-3">Investment Thesis:</h4>
                	<p className="text-gray-300 mb-3">
                  	Developers offer 3-10x return potential as projects move toward production. The key is identifying fully-funded projects in safe jurisdictions. Current high metal prices make previously marginal projects highly profitable.
                	</p>
                	<p className="text-sm text-gray-400">
                  	<strong>Notable Examples:</strong> Artemis Gold (ARTG), Marathon Gold (MOZ), Orla Mining (OLA)
                	</p>
              	</div>
            	</div>
            	<div className="mt-4 p-4 bg-navy-900/50 rounded-lg">
              	<p className="text-sm text-gray-300">
                	<strong className="text-cyan-400">Current Opportunity:</strong> Projects with sub-$1,000 AISC coming online in 2025-2027 could see dramatic re-ratings. Focus on fully-permitted projects with major shareholder backing.
              	</p>
            	</div>
          	</CardContent>
      	</Card>

      	{/* Junior Explorers */}
      	<Card className="bg-navy-800/70 border-navy-700 backdrop-blur-sm">
        	<CardHeader className="bg-navy-700/30 border-b border-navy-600">
          	<CardTitle className="text-xl font-bold text-cyan-400">Junior Explorers ({'<'} $100M Market Cap)</CardTitle>
        	</CardHeader>
        	<CardContent className="space-y-4 pt-6">
          	<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            	<div>
              	<h4 className="font-semibold text-gray-200 mb-3">Characteristics:</h4>
              	<ul className="space-y-2 text-gray-300">
                	<li className="flex items-start">
                  	<Check className="w-4 h-4 mr-2 text-green-500 flex-shrink-0 mt-1" />
                  	<span>Early-stage exploration focus</span>
                	</li>
                	<li className="flex items-start">
                  	<Check className="w-4 h-4 mr-2 text-green-500 flex-shrink-0 mt-1" />
                  	<span>High-impact drill programs</span>
                	</li>
                	<li className="flex items-start">
                  	<AlertCircle className="w-4 h-4 mr-2 text-yellow-500 flex-shrink-0 mt-1" />
                  	<span>Limited resources, high cash burn</span>
                	</li>
                	<li className="flex items-start">
                  	<AlertCircle className="w-4 h-4 mr-2 text-yellow-500 flex-shrink-0 mt-1" />
                  	<span>Frequent equity dilution</span>
                	</li>
                	<li className="flex items-start">
                  	<Check className="w-4 h-4 mr-2 text-green-500 flex-shrink-0 mt-1" />
                  	<span>10-100x potential on discoveries</span>
                	</li>
              	</ul>
            	</div>
            	<div>
              	<h4 className="font-semibold text-gray-200 mb-3">Investment Thesis:</h4>
              	<p className="text-gray-300 mb-3">
                	Juniors are venture capital plays on new discoveries. Success rates are low ({'<'} 5%), but winners can return 50-100x. The key is strong technical teams, proven geology, and adequate funding through discovery.
              	</p>
              	<p className="text-sm text-gray-400">
                	<strong>Evaluation Focus:</strong> Management track record, project geology, cash runway, share structure
              	</p>
            	</div>
          	</div>
          	<div className="mt-4 p-4 bg-yellow-900/20 rounded-lg border border-yellow-600/30">
            	<p className="text-sm text-gray-300">
              	<strong className="text-yellow-400">⚠ Risk Warning:</strong> Juniors are extremely high risk. Never invest more than 5-10% of your precious metals allocation in this category. Focus on companies with experienced teams who have made previous discoveries.
            	</p>
          	</div>
        	</CardContent>
      	</Card>
    	</section>

    	{/* Comprehensive Key Metrics Section */}
    	<section id="key-metrics" className="space-y-6">
    	  <h2 className="text-3xl font-bold text-gray-100 flex items-center">
    	  	<Check className="w-8 h-8 mr-3 text-yellow-500" />
    	  	Essential Metrics for Mining Stock Analysis
    	  </h2>
    	  <p className="text-gray-300 text-lg">
    	  	Professional investors rely on specific metrics to identify undervalued opportunities and avoid value traps. Here's your complete toolkit for mining stock analysis:
    	  </p>

    	  {/* Reserve and Resource Metrics */}
    	  <Card className="bg-navy-800/70 border-navy-700 backdrop-blur-sm">
    	  	<CardHeader className="bg-gradient-to-r from-yellow-900/20 to-transparent border-b border-navy-600">
    	  	  <CardTitle className="text-xl font-bold text-cyan-400 flex items-center">
    	  	  	<Gem className="w-6 h-6 mr-2" />
    	  	  	Reserve and Resource Metrics
    	  	  </CardTitle>
    	  	</CardHeader>
    	  	<CardContent className="space-y-6 pt-6">
    	  	  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    	  	  	<div>
    	  	  	  <h4 className="font-semibold text-gray-200 mb-3">Proven & Probable Reserves (P&P)</h4>
    	  	  	  <p className="text-gray-300 mb-3">
    	  	  	  	<strong>Definition:</strong> Economically mineable material with highest confidence level (measured/indicated resources + economic studies).
    	  	  	  </p>
    	  	  	  <ul className="space-y-2 text-sm text-gray-300">
    	  	  	  	<li>• <strong>Excellent:</strong> {'>'} 10M oz Au equivalent</li>
    	  	  	  	<li>• <strong>Good:</strong> 3-10M oz Au equivalent</li>
    	  	  	  	<li>• <strong>Adequate:</strong> 1-3M oz Au equivalent</li>
    	  	  	  	<li>• <strong>Concerning:</strong> {'<'} 1M oz Au equivalent</li>
    	  	  	  </ul>
    	  	  	  <p className="text-sm text-gray-400 mt-3">
    	  	  	  	<em>Database field: mineral_estimates.reserves_total_aueq_moz</em>
    	  	  	  </p>
    	  	  	</div>
    	  	  	<div>
    	  	  	  <h4 className="font-semibold text-gray-200 mb-3">Reserve Life</h4>
    	  	  	  <p className="text-gray-300 mb-3">
    	  	  	  	<strong>Calculation:</strong> Total reserves ÷ annual production
    	  	  	  </p>
    	  	  	  <ul className="space-y-2 text-sm text-gray-300">
    	  	  	  	<li>• <strong>Excellent:</strong> {'>'} 15 years</li>
    	  	  	  	<li>• <strong>Good:</strong> 10-15 years</li>
    	  	  	  	<li>• <strong>Adequate:</strong> 7-10 years</li>
    	  	  	  	<li>• <strong>Concerning:</strong> {'<'} 7 years (without exploration upside)</li>
    	  	  	  </ul>
    	  	  	  <p className="text-sm text-gray-400 mt-3">
    	  	  	  	<em>Database field: production.reserve_life</em>
    	  	  	  </p>
    	  	  	</div>
    	  	  </div>
    	  	</CardContent>
    	  </Card>

    	  {/* Financial Metrics */}
    	  <Card className="bg-navy-800/70 border-navy-700 backdrop-blur-sm">
    	  	<CardHeader className="bg-gradient-to-r from-yellow-900/20 to-transparent border-b border-navy-600">
    	  	  <CardTitle className="text-xl font-bold text-cyan-400 flex items-center">
    	  	  	<DollarSign className="w-6 h-6 mr-2" />
    	  	  	Financial Metrics
    	  	  </CardTitle>
    	  	</CardHeader>
    	  	<CardContent className="space-y-6 pt-6">
    	  	  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    	  	  	<div>
    	  	  	  <h4 className="font-semibold text-gray-200 mb-3">All-In Sustaining Costs (AISC)</h4>
    	  	  	  <p className="text-gray-300 mb-3">
    	  	  	  	<strong>Definition:</strong> Total cost to produce an ounce of gold, including operating costs, sustaining capital, and corporate expenses.
    	  	  	  </p>
    	  	  	  <ul className="space-y-2 text-sm text-gray-300">
    	  	  	  	<li>• <strong>Excellent:</strong> {'<'} $1,000/oz</li>
    	  	  	  	<li>• <strong>Good:</strong> $1,000-$1,200/oz</li>
    	  	  	  	<li>• <strong>Adequate:</strong> $1,200-$1,500/oz</li>
    	  	  	  	<li>• <strong>Concerning:</strong> {'>'} $1,500/oz</li>
    	  	  	  </ul>
    	  	  	  <p className="text-sm text-gray-400 mt-3">
    	  	  	  	<em>Database field: costs.aisc_per_oz</em>
    	  	  	  </p>
    	  	  	</div>
    	  	  	<div>
    	  	  	  <h4 className="font-semibold text-gray-200 mb-3">Free Cash Flow (FCF)</h4>
    	  	  	  <p className="text-gray-300 mb-3">
    	  	  	  	<strong>Definition:</strong> Cash generated after capital expenditures, a key indicator of financial health.
    	  	  	  </p>
    	  	  	  <ul className="space-y-2 text-sm text-gray-300">
    	  	  	  	<li>• <strong>Excellent:</strong> Positive and growing</li>
    	  	  	  	<li>• <strong>Good:</strong> Positive but stable</li>
    	  	  	  	<li>• <strong>Adequate:</strong> Breakeven or slightly negative</li>
    	  	  	  	<li>• <strong>Concerning:</strong> Consistently negative</li>
    	  	  	  </ul>
    	  	  	  <p className="text-sm text-gray-400 mt-3">
    	  	  	  	<em>Database field: financials.free_cash_flow</em>
    	  	  	  </p>
    	  	  	</div>
    	  	  </div>
    	  	</CardContent>
    	  </Card>
    	</section>

    	{/* Valuation Methods Section */}
    	<section id="valuation-methods" className="space-y-6">
    	  <h2 className="text-3xl font-bold text-gray-100 flex items-center">
    	  	<Check className="w-8 h-8 mr-3 text-yellow-500" />
    	  	Professional Valuation Techniques
    	  </h2>
    	  <p className="text-gray-300 text-lg">
    	  	Valuation is both an art and a science in the mining sector. Here are the most reliable methods used by institutional investors:
    	  </p>

    	  <Card className="bg-navy-800/70 border-navy-700 backdrop-blur-sm">
    	  	<CardHeader className="bg-gradient-to-r from-yellow-900/20 to-transparent border-b border-navy-600">
    	  	  <CardTitle className="text-xl font-bold text-cyan-400 flex items-center">
    	  	  	<Book className="w-6 h-6 mr-2" />
    	  	  	Price-to-Net Asset Value (P/NAV)
    	  	  </CardTitle>
    	  	</CardHeader>
    	  	<CardContent className="space-y-4 pt-6">
    	  	  <p className="text-gray-300">
    	  	  	P/NAV compares market capitalization to the net present value of a company's reserves and resources. It's particularly useful for assessing undervaluation.
    	  	  </p>
    	  	  <ul className="space-y-2 text-sm text-gray-300">
    	  	  	<li>• <strong>Undervalued:</strong> P/NAV {'<'} 1.0</li>
    	  	  	<li>• <strong>Fair Value:</strong> P/NAV 1.0-1.5</li>
    	  	  	<li>• <strong>Overvalued:</strong> P/NAV {'>'} 1.5</li>
    	  	  </ul>
    	  	  <p className="text-sm text-gray-400 mt-3">
    	  	  	<em>Database field: valuation.p_nav_ratio</em>
    	  	  </p>
    	  	</CardContent>
    	  </Card>

    	  <Card className="bg-navy-800/70 border-navy-700 backdrop-blur-sm">
    	  	<CardHeader className="bg-gradient-to-r from-yellow-900/20 to-transparent border-b border-navy-600">
    	  	  <CardTitle className="text-xl font-bold text-cyan-400 flex items-center">
    	  	  	<TrendingUp className="w-6 h-6 mr-2" />
    	  	  	Enterprise Value-to-Resource (EV/R)
    	  	  </CardTitle>
    	  	</CardHeader>
    	  	<CardContent className="space-y-4 pt-6">
    	  	  <p className="text-gray-300">
    	  	  	EV/R measures the cost per ounce of resource, accounting for debt and cash positions. It's ideal for early-stage companies.
    	  	  </p>
    	  	  <ul className="space-y-2 text-sm text-gray-300">
    	  	  	<li>• <strong>Attractive:</strong> EV/R {'<'} $50/oz</li>
    	  	  	<li>• <strong>Reasonable:</strong> EV/R $50-$100/oz</li>
    	  	  	<li>• <strong>Expensive:</strong> EV/R {'>'} $100/oz</li>
    	  	  </ul>
    	  	  <p className="text-sm text-gray-400 mt-3">
    	  	  	<em>Database field: valuation.ev_per_resource_oz</em>
    	  	  </p>
    	  	</CardContent>
    	  </Card>
    	</section>

    	{/* Red Flags Section */}
    	<section id="red-flags" className="space-y-6">
    	  <h2 className="text-3xl font-bold text-gray-100 flex items-center">
    	  	<AlertCircle className="w-8 h-8 mr-3 text-yellow-500" />
    	  	Red Flags to Avoid in Mining Investments
    	  </h2>
    	  <p className="text-gray-300 text-lg">
    	  	Even the most promising mining stocks can turn into value traps. Watch for these warning signs:
    	  </p>

    	  <Card className="bg-navy-800/70 border-navy-700 backdrop-blur-sm">
    	  	<CardHeader className="bg-gradient-to-r from-yellow-900/20 to-transparent border-b border-navy-600">
    	  	  <CardTitle className="text-xl font-bold text-cyan-400 flex items-center">
    	  	  	<Shield className="w-6 h-6 mr-2" />
    	  	  	Jurisdiction Risk
    	  	  </CardTitle>
    	  	</CardHeader>
    	  	<CardContent className="space-y-4 pt-6">
    	  	  <p className="text-gray-300">
    	  	  	Mining operations in high-risk jurisdictions can face expropriation, regulatory changes, or civil unrest.
    	  	  </p>
    	  	  <ul className="space-y-2 text-sm text-gray-300">
    	  	  	<li>• <strong>High Risk:</strong> Venezuela, Zimbabwe, Democratic Republic of Congo</li>
    	  	  	<li>• <strong>Moderate Risk:</strong> Peru, Mexico, Papua New Guinea</li>
    	  	  	<li>• <strong>Low Risk:</strong> Canada, USA, Australia, Scandinavia</li>
    	  	  </ul>
    	  	  <p className="text-sm text-gray-400 mt-3">
    	  	  	<em>Database field: company.jurisdiction_risk_score</em>
    	  	  </p>
    	  	</CardContent>
    	  </Card>

    	  <Card className="bg-navy-800/70 border-navy-700 backdrop-blur-sm">
    	  	<CardHeader className="bg-gradient-to-r from-yellow-900/20 to-transparent border-b border-navy-600">
    	  	  <CardTitle className="text-xl font-bold text-cyan-400 flex items-center">
    	  	  	<Clock className="w-6 h-6 mr-2" />
    	  	  	Excessive Cash Burn
      	  	  </CardTitle>
      	  	</CardHeader>
      	  	<CardContent className="space-y-4 pt-6">
      	  	  <p className="text-gray-300">
      	  	  	Companies burning through cash without progress toward production or discovery are at risk of dilution or failure.
      	  	  </p>
      	  	  <ul className="space-y-2 text-sm text-gray-300">
      	  	  	<li>• <strong>Concern:</strong> Cash runway {'<'} 12 months</li>
      	  	  	<li>• <strong>Warning:</strong> Negative free cash flow for {'>'} 2 years</li>
      	  	  	<li>• <strong>Critical:</strong> Multiple equity financings in short period</li>
      	  	  </ul>
      	  	  <p className="text-sm text-gray-400 mt-3">
      	  	  	<em>Database fields: financials.cash_runway, financials.free_cash_flow_trend</em>
      	  	  </p>
      	  	</CardContent>
      	  </Card>

      	  <Card className="bg-navy-800/70 border-navy-700 backdrop-blur-sm">
      	  	<CardHeader className="bg-gradient-to-r from-yellow-900/20 to-transparent border-b border-navy-600">
      	  	  <CardTitle className="text-xl font-bold text-cyan-400 flex items-center">
      	  	  	<Target className="w-6 h-6 mr-2" />
      	  	  	Unclear Development Path
      	  	  </CardTitle>
      	  	</CardHeader>
      	  	<CardContent className="space-y-4 pt-6">
      	  	  <p className="text-gray-300">
      	  	  	Lack of milestones or feasibility studies indicates potential delays or project risks.
      	  	  </p>
      	  	  <ul className="space-y-2 text-sm text-gray-300">
      	  	  	<li>• <strong>Red Flag:</strong> No PFS/FS completed</li>
      	  	  	<li>• <strong>Warning:</strong> Permitting delays {'>'} 2 years</li>
      	  	  	<li>• <strong>Critical:</strong> No clear financing plan</li>
      	  	  </ul>
      	  	  <p className="text-sm text-gray-400 mt-3">
      	  	  	<em>Database fields: project.development_stage, project.permitting_status</em>
      	  	  </p>
      	  	</CardContent>
      	  </Card>
    	</section>

    	{/* Investment Strategies Section */}
    	<section id="investment-strategies" className="space-y-6">
    	  <h2 className="text-3xl font-bold text-gray-100 flex items-center">
    	  	<Target className="w-8 h-8 mr-3 text-yellow-500" />
    	  	Investment Strategies & Portfolio Building
    	  </h2>
    	  <p className="text-gray-300 text-lg">
    	  	Successful mining investment requires a balanced approach. Here are proven strategies:
    	  </p>

    	  <Card className="bg-navy-800/70 border-navy-700 backdrop-blur-sm">
    	  	<CardHeader className="bg-gradient-to-r from-yellow-900/20 to-transparent border-b border-navy-600">
    	  	  <CardTitle className="text-xl font-bold text-cyan-400">Core-Satellite Approach</CardTitle>
    	  	</CardHeader>
    	  	<CardContent className="space-y-4 pt-6">
    	  	  <p className="text-gray-300">
    	  	  	Allocate 70-80% to major and mid-tier producers for stability, 20-30% to developers and juniors for growth.
    	  	  </p>
    	  	  <ul className="space-y-2 text-sm text-gray-300">
    	  	  	<li>• <strong>Core:</strong> Newmont, Agnico Eagle, Franco-Nevada</li>
    	  	  	<li>• <strong>Satellite:</strong> Artemis Gold, Calibre Mining, Victoria Gold</li>
    	  	  </ul>
    	  	</CardContent>
    	  </Card>

    	  <Card className="bg-navy-800/70 border-navy-700 backdrop-blur-sm">
    	  	<CardHeader className="bg-gradient-to-r from-yellow-900/20 to-transparent border-b border-navy-600">
    	  	  <CardTitle className="text-xl font-bold text-cyan-400">Thematic Investing</CardTitle>
    	  	</CardHeader>
    	  	<CardContent className="space-y-4 pt-6">
    	  	  <p className="text-gray-300">
    	  	  	Focus on specific themes like jurisdictional safety, low-cost production, or exploration potential.
    	  	  </p>
    	  	  <ul className="space-y-2 text-sm text-gray-300">
    	  	  	<li>• <strong>Safe Havens:</strong> Canadian and Australian miners</li>
    	  	  	<li>• <strong>Low Cost:</strong> Companies with AISC {'<'} $1,000/oz</li>
    	  	  	<li>• <strong>Exploration:</strong> Juniors with strong geological targets</li>
    	  	  </ul>
    	  	</CardContent>
    	  </Card>
    	</section>

    	{/* Market Timing Section */}
    	<section id="market-timing" className="space-y-6">
    	  <h2 className="text-3xl font-bold text-gray-100 flex items-center">
    	  	<Clock className="w-8 h-8 mr-3 text-yellow-500" />
    	  	Market Timing & Cycles
    	  </h2>
    	  <p className="text-gray-300 text-lg">
    	  	Understanding market cycles is crucial for maximizing returns in mining stocks.
    	  </p>

    	  <Card className="bg-navy-800/70 border-navy-700 backdrop-blur-sm">
    	  	<CardHeader className="bg-gradient-to-r from-yellow-900/20 to-transparent border-b border-navy-600">
    	  	  <CardTitle className="text-xl font-bold text-cyan-400">Current Cycle Position</CardTitle>
    	  	</CardHeader>
    	  	<CardContent className="space-y-4 pt-6">
    	  	  <p className="text-gray-300">
      	  	  	We're in the early stages of a precious metals bull market, characterized by:
      	  	  </p>
      	  	  <ul className="space-y-2 text-sm text-gray-300">
      	  	  	<li>• Rising gold and silver prices</li>
      	  	  	<li>• Underowned mining stocks</li>
      	  	  	<li>• Increasing institutional interest</li>
      	  	  	<li>• Potential for M&A activity</li>
      	  	  </ul>
      	  	  <p className="text-gray-300 mt-4">
      	  	  	Focus on quality companies with strong balance sheets and growth potential.
      	  	  </p>
      	  	</CardContent>
      	  </Card>
    	</section>

    	{/* Case Studies Section */}
    	<section id="case-studies" className="space-y-6">
    	  <h2 className="text-3xl font-bold text-gray-100 flex items-center">
    	  	<Book className="w-8 h-8 mr-3 text-yellow-500" />
    	  	Real-World Case Studies
    	  </h2>
    	  <p className="text-gray-300 text-lg">
    	  	Learn from past successes and failures in the mining sector.
    	  </p>

    	  <Card className="bg-navy-800/70 border-navy-700 backdrop-blur-sm">
    	  	<CardHeader className="bg-gradient-to-r from-yellow-900/20 to-transparent border-b border-navy-600">
    	  	  <CardTitle className="text-xl font-bold text-cyan-400">Great Bear Resources</CardTitle>
    	  	</CardHeader>
    	  	<CardContent className="space-y-4 pt-6">
    	  	  <p className="text-gray-300">
    	  	  	<strong>Story:</strong> Discovered high-grade gold at Dixie Project, leading to acquisition by Kinross for C$1.8 billion (100x return for early investors).
    	  	  </p>
    	  	  <ul className="space-y-2 text-sm text-gray-300">
    	  	  	<li>• <strong>Key Metric:</strong> 14M oz inferred resource</li>
    	  	  	<li>• <strong>Lesson:</strong> High-grade discoveries in safe jurisdictions can lead to massive returns</li>
    	  	  </ul>
    	  	</CardContent>
    	  </Card>

    	  <Card className="bg-navy-800/70 border-navy-700 backdrop-blur-sm">
    	  	<CardHeader className="bg-gradient-to-r from-yellow-900/20 to-transparent border-b border-navy-600">
    	  	  <CardTitle className="text-xl font-bold text-cyan-400">Newmont's Acquisition of Newcrest</CardTitle>
    	  	</CardHeader>
    	  	<CardContent className="space-y-4 pt-6">
    	  	  <p className="text-gray-300">
    	  	  	<strong>Story:</strong> Newmont acquired Newcrest at a 31% premium, highlighting the value of quality assets in bull markets.
    	  	  </p>
    	  	  <ul className="space-y-2 text-sm text-gray-300">
    	  	  	<li>• <strong>Key Metric:</strong> 70M oz gold equivalent reserves</li>
    	  	  	<li>• <strong>Lesson:</strong> Major producers often acquire undervalued mid-tiers during upcycles</li>
    	  	  </ul>
    	  	</CardContent>
    	  </Card>
    	</section>

    	{/* Call to Action */}
		<section className="text-center py-16">
		  <h2 className="text-3xl font-bold text-gray-100 mb-6">
			Ready to Invest in Precious Metals Mining?
		  </h2>
		  <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-8">
			Use ScatterScore™ to analyze mining stocks with precision. Our proprietary metrics and expert insights help you make informed decisions.
		  </p>
		  <div className="flex flex-col sm:flex-row gap-4 justify-center">
			<Button
			  onClick={() => navigate('/subscribe')}
			  className="bg-yellow-600 hover:bg-yellow-700 text-white text-lg px-8 py-3"
			>
			  Start Your Free Trial <ArrowRight className="ml-2" />
			</Button>
			<Button
			  variant="outline"
			  className="border-gray-600 text-gray-300 hover:bg-gray-800 text-lg px-8 py-3 relative group"
			  onClick={() => {
				navigator.clipboard.writeText('support@mapleaurum.com');
				setTimeout(() => alert('Copied'), 100); // Simple feedback, can be replaced with custom UI
			  }}
			>
			  <span className="group-hover:hidden">Contact Us for More Information</span>
			  <span className="hidden group-hover:inline">Copy Contact Email</span>
			</Button>
		  </div>
		</section>
      </div> {/* This div closes the "relative z-0 space-y-12" container */}
    </div> {/* This div closes the "relative isolate" container */}
  </PageContainer>
);
}


