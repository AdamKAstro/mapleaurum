// src/App.tsx
import React from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from './contexts/auth-context';
import { SubscriptionProvider } from './contexts/subscription-context';
import { CurrencyProvider } from './contexts/currency-context';
import { ThemeProvider } from './contexts/theme-context';
import { FilterProvider } from './contexts/filter-context';
import { Header } from './components/ui/header';
import { Sidebar } from './components/ui/sidebar';
import ErrorBoundary from './components/ErrorBoundary';
import { Hero } from './components/ui/hero';
import HookUIPage from './features/hook-ui/pages/HookUIPage';
import { LoginPage } from './pages/login';
import { ForgotPasswordPage } from './pages/forgot-password';
import { ResetPasswordPage } from './pages/reset-password';
import { OnboardingPage } from './pages/onboarding';
import { CompaniesPage } from './pages/companies';
import { SubscribePage } from './pages/subscribe';
import { ScatterChartPage } from './pages/scatter-chart';
import RPSScoringPage from './pages/RPSScoringPage/index';
import { FilterPage } from './pages/filter';
import AdvScoringPage from './pages/scoring-advanced';
import FCFScoringPage from './pages/fcf-scoring/index';
import { ScatterScoreProPage } from './pages/scatter-score-pro';
import { HelpLandingPage } from './pages/help/index';
import { HelpMetricsPage } from './pages/help/metrics';
import { HelpFiltersPage } from './pages/help/filters-guide';
import { HelpScoringPage } from './pages/help/scoring-guide';
import { HelpFCFScoringPage } from './pages/help/fcf-scoring-guide';
import { HelpScatterPage } from './pages/help/scatter-guide';
import { HelpScatterScorePage } from './pages/help/scatter-score-guide';
import { HelpTiersPage } from './pages/help/tiers';
import { HelpRPSScoringPage } from './pages/help/rps-scoring-guide';
import { HelpGeneralPage } from './pages/help/general';
import { AdminSendEmailPage } from './pages/admin/send-email';
import { GlassCustomizationPage } from './pages/glass-customization';
import CompanyDetailPage from './pages/company-detail';
import { PromoTrackingPage } from './pages/admin/promo-tracking';
import { ProfilePage } from './pages/account/profile';
import { HowToChooseMiningCompanyBlogPage } from './pages/blog/how-to-choose-a-precious-metals-mining-company-to-invest-in';
import { BlogLandingPage } from './pages/blog/index';
import { MasteringRPSBlogPage } from './pages/blog/mastering-rps-a-quick-guide';
import HGRAPHPage from './pages/HGRAPHPage'; 
import GrapheneExplorerPage from './pages/GrapheneExplorerPage'; // ADD THIS LINE


function NotFoundPage() {
    return (
        <div className="flex items-center justify-center h-screen p-10 bg-navy-900 text-white">
            <Helmet>
                <title>MapleAurum | 404 Page Not Found</title>
                <meta name="description" content="The page you are looking for does not exist on MapleAurum. Return to our homepage to explore Canadian precious metals analytics." />
                <meta name="robots" content="noindex" />
                <link rel="canonical" href="https://mapleaurum.com/404" />
            </Helmet>
            <div className="text-center">
                <h1 className="text-4xl font-bold mb-4">404</h1>
                <p className="text-xl">Page Not Found</p>
                <p className="text-gray-400 mt-2">The page you are looking for does not exist.</p>
                <a href="/" className="mt-6 inline-block px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded text-white">
                    Go Home
                </a>
            </div>
        </div>
    );
}

function FilteredLayout() {
    return (
        <FilterProvider>
            <div className="flex flex-col min-h-screen bg-navy-900">
                <Header />
                <div className="flex flex-1 overflow-hidden">
                    <Sidebar />
                    <main className="flex-1 overflow-y-auto relative isolate">
                        <div
                            className="absolute inset-0 bg-cover bg-center bg-fixed -z-20 opacity-[0.03]"
                            style={{ backgroundImage: `url('/Background2.jpg')` }}
                            aria-hidden="true"
                        />
                        <div className="absolute inset-0 bg-noise opacity-[0.07] -z-10" aria-hidden="true" />
                        <ErrorBoundary fallback={<div className="p-6 text-red-400">Error loading this page section.</div>}>
                            <Outlet />
                        </ErrorBoundary>
                    </main>
                </div>
            </div>
        </FilterProvider>
    );
}

function App() {
    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'MapleAurum',
        url: 'https://mapleaurum.com',
        description: 'Financial data and analytics for Canadian precious metals companies.',
        publisher: {
            '@type': 'Organization',
            name: 'MapleAurum',
            email: 'support@mapleaurum.com',
            sameAs: [
                'https://twitter.com/mapleaurum',
                'https://linkedin.com/company/mapleaurum',
            ],
        },
        potentialAction: {
            '@type': 'SearchAction',
            target: 'https://mapleaurum.com/companies?search={search_term_string}',
            'query-input': 'required name=search_term_string',
        },
    };

    return (
        <HelmetProvider>
            <ThemeProvider>
                <AuthProvider>
                    <SubscriptionProvider>
                        <CurrencyProvider>
                            <ErrorBoundary
                                fallback={
                                    <div className="flex items-center justify-center h-screen text-red-500 bg-navy-900">
                                        <div className="text-center">
                                            <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
                                            <p className="mb-4">We're sorry for the inconvenience. Please try refreshing the page.</p>
                                            <button
                                                onClick={() => window.location.reload()}
                                                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded text-white"
                                            >
                                                Refresh Page
                                            </button>
                                        </div>
                                    </div>
                                }
                            >
                                <Helmet>
                                    <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
                                </Helmet>
                                <Routes>
                                    <Route element={<FilteredLayout />}>
                                        <Route
                                            path="/"
                                            element={
                                                <>
                                                    <Helmet>
                                                        <title>MapleAurum | Canadian Precious Metals Analytics</title>
                                                        <meta
                                                            name="description"
                                                            content="Discover MapleAurum's advanced analytics for Canadian precious metals mining companies. Explore financial data, market insights, and investment tools."
                                                        />
                                                        <meta
                                                            name="keywords"
                                                            content="precious metals, Canadian mining, gold, silver, financial analytics, investment tools"
                                                        />
                                                        <link rel="canonical" href="https://mapleaurum.com/" />
                                                    </Helmet>
                                                    <Hero />
                                                </>
                                            }
                                        />
                                        <Route
                                            path="/companies"
                                            element={
                                                <>
                                                    <Helmet>
                                                        <title>MapleAurum | Explore Canadian Mining Companies</title>
                                                        <meta
                                                            name="description"
                                                            content="Browse and analyze Canadian precious metals mining companies with MapleAurum's comprehensive financial data and analytics tools."
                                                        />
                                                        <meta
                                                            name="keywords"
                                                            content="Canadian mining companies, precious metals, gold, silver, financial data, analytics"
                                                        />
                                                        <link rel="canonical" href="https://mapleaurum.com/companies" />
                                                        <script type="application/ld+json">
                                                            {JSON.stringify({
                                                                '@context': 'https://schema.org',
                                                                '@type': 'BreadcrumbList',
                                                                itemListElement: [
                                                                    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://mapleaurum.com/' },
                                                                    {
                                                                        '@type': 'ListItem',
                                                                        position: 2,
                                                                        name: 'Companies',
                                                                        item: 'https://mapleaurum.com/companies',
                                                                    },
                                                                ],
                                                            })}
                                                        </script>
                                                    </Helmet>
                                                    <CompaniesPage />
                                                </>
                                            }
                                        />
                                        <Route path="/glass-customization" element={<GlassCustomizationPage />} />
                                        <Route
                                            path="/filter"
                                            element={
                                                <>
                                                    <Helmet>
                                                        <title>MapleAurum | Filter Mining Companies</title>
                                                        <meta
                                                            name="description"
                                                            content="Use MapleAurum's advanced filtering tools to narrow down Canadian precious metals companies based on financial metrics and market data."
                                                        />
                                                        <meta
                                                            name="keywords"
                                                            content="filter mining companies, precious metals, Canadian mining, financial metrics, analytics"
                                                        />
                                                        <link rel="canonical" href="https://mapleaurum.com/filter" />
                                                        <script type="application/ld+json">
                                                            {JSON.stringify({
                                                                '@context': 'https://schema.org',
                                                                '@type': 'BreadcrumbList',
                                                                itemListElement: [
                                                                    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://mapleaurum.com/' },
                                                                    {
                                                                        '@type': 'ListItem',
                                                                        position: 2,
                                                                        name: 'Filter',
                                                                        item: 'https://mapleaurum.com/filter',
                                                                    },
                                                                ],
                                                            })}
                                                        </script>
                                                    </Helmet>
                                                    <FilterPage />
                                                </>
                                            }
                                        />
                                        <Route
                                            path="/scoring-advanced"
                                            element={
                                                <>
                                                    <Helmet>
                                                        <title>MapleAurum | Advanced Scoring Analytics</title>
                                                        <meta
                                                            name="description"
                                                            content="Evaluate Canadian precious metals companies with MapleAurum's advanced scoring system, leveraging detailed financial and operational metrics."
                                                        />
                                                        <meta
                                                            name="keywords"
                                                            content="advanced scoring, precious metals, Canadian mining, financial analytics, investment metrics"
                                                        />
                                                        <link rel="canonical" href="https://mapleaurum.com/scoring-advanced" />
                                                        <script type="application/ld+json">
                                                            {JSON.stringify({
                                                                '@context': 'https://schema.org',
                                                                '@type': 'BreadcrumbList',
                                                                itemListElement: [
                                                                    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://mapleaurum.com/' },
                                                                    {
                                                                        '@type': 'ListItem',
                                                                        position: 2,
                                                                        name: 'Advanced Scoring',
                                                                        item: 'https://mapleaurum.com/scoring-advanced',
                                                                    },
                                                                ],
                                                            })}
                                                        </script>
                                                    </Helmet>
                                                    <AdvScoringPage />
                                                </>
                                            }
                                        />
                                        <Route
                                            path="/fcf-scoring"
                                            element={
                                                <>
                                                    <Helmet>
                                                        <title>MapleAurum | Free Cash Flow Scoring</title>
                                                        <meta
                                                            name="description"
                                                            content="Analyze Canadian precious metals companies using MapleAurum's Free Cash Flow Scoring tool to uncover investment opportunities."
                                                        />
                                                        <meta
                                                            name="keywords"
                                                            content="free cash flow, precious metals, Canadian mining, investment analytics, scoring tool"
                                                        />
                                                        <link rel="canonical" href="https://mapleaurum.com/fcf-scoring" />
                                                        <script type="application/ld+json">
                                                            {JSON.stringify({
                                                                '@context': 'https://schema.org',
                                                                '@type': 'BreadcrumbList',
                                                                itemListElement: [
                                                                    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://mapleaurum.com/' },
                                                                    {
                                                                        '@type': 'ListItem',
                                                                        position: 2,
                                                                        name: 'FCF Scoring',
                                                                        item: 'https://mapleaurum.com/fcf-scoring',
                                                                    },
                                                                ],
                                                            })}
                                                        </script>
                                                    </Helmet>
                                                    <FCFScoringPage />
                                                </>
                                            }
                                        />
                                        <Route
                                            path="/rps-scoring"
                                            element={
                                                <>
                                                    <Helmet>
                                                        <title>MapleAurum | Relative Performance Score (RPS)</title>
                                                        <meta
                                                            name="description"
                                                            content="Analyze companies using a dynamic, multi-faceted scoring system relative to their true peers with MapleAurum's RPS tool."
                                                        />
                                                        <link rel="canonical" href="https://mapleaurum.com/rps-scoring" />
                                                    </Helmet>
                                                    <RPSScoringPage />
                                                </>
                                            }
                                        />                                        
                                        <Route
                                            path="/scatter-chart"
                                            element={
                                                <>
                                                    <Helmet>
                                                        <title>MapleAurum | Scatter Chart Analytics</title>
                                                        <meta
                                                            name="description"
                                                            content="Visualize Canadian precious metals companies with MapleAurum's scatter chart tool, comparing key financial and operational metrics."
                                                        />
                                                        <meta
                                                            name="keywords"
                                                            content="scatter chart, precious metals, Canadian mining, financial visualization, analytics"
                                                        />
                                                        <link rel="canonical" href="https://mapleaurum.com/scatter-chart" />
                                                        <script type="application/ld+json">
                                                            {JSON.stringify({
                                                                '@context': 'https://schema.org',
                                                                '@type': 'BreadcrumbList',
                                                                itemListElement: [
                                                                    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://mapleaurum.com/' },
                                                                    {
                                                                        '@type': 'ListItem',
                                                                        position: 2,
                                                                        name: 'Scatter Chart',
                                                                        item: 'https://mapleaurum.com/scatter-chart',
                                                                    },
                                                                ],
                                                            })}
                                                        </script>
                                                    </Helmet>
                                                    <ScatterChartPage />
                                                </>
                                            }
                                        />
                                        <Route
                                            path="/scatter-score-pro"
                                            element={
                                                <>
                                                    <Helmet>
                                                        <title>MapleAurum | Scatter Score Pro Analytics</title>
                                                        <meta
                                                            name="description"
                                                            content="Dive into advanced analytics with MapleAurum's Scatter Score Pro, evaluating Canadian precious metals companies with precision."
                                                        />
                                                        <meta
                                                            name="keywords"
                                                            content="scatter score pro, precious metals, Canadian mining, advanced analytics, investment tools"
                                                        />
                                                        <link rel="canonical" href="https://mapleaurum.com/scatter-score-pro" />
                                                        <script type="application/ld+json">
                                                            {JSON.stringify({
                                                                '@context': 'https://schema.org',
                                                                '@type': 'BreadcrumbList',
                                                                itemListElement: [
                                                                    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://mapleaurum.com/' },
                                                                    {
                                                                        '@type': 'ListItem',
                                                                        position: 2,
                                                                        name: 'Scatter Score Pro',
                                                                        item: 'https://mapleaurum.com/scatter-score-pro',
                                                                    },
                                                                ],
                                                            })}
                                                        </script>
                                                    </Helmet>
                                                    <ScatterScoreProPage />
                                                </>
                                            }
                                        />
                                        <Route
                                            path="/subscribe"
                                            element={
                                                <>
                                                    <Helmet>
                                                        <title>MapleAurum | Subscribe for Premium Analytics</title>
                                                        <meta
                                                            name="description"
                                                            content="Unlock premium financial analytics for Canadian precious metals companies with a MapleAurum subscription. Start today!"
                                                        />
                                                        <meta
                                                            name="keywords"
                                                            content="subscribe, precious metals, Canadian mining, premium analytics, investment tools"
                                                        />
                                                        <link rel="canonical" href="https://mapleaurum.com/subscribe" />
                                                        <script type="application/ld+json">
                                                            {JSON.stringify({
                                                                '@context': 'https://schema.org',
                                                                '@type': 'BreadcrumbList',
                                                                itemListElement: [
                                                                    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://mapleaurum.com/' },
                                                                    {
                                                                        '@type': 'ListItem',
                                                                        position: 2,
                                                                        name: 'Subscribe',
                                                                        item: 'https://mapleaurum.com/subscribe',
                                                                    },
                                                                ],
                                                            })}
                                                        </script>
                                                    </Helmet>
                                                    <SubscribePage />
                                                </>
                                            }
                                        />
                                        <Route
                                            path="/hook-filtered"
                                            element={
                                                <>
                                                    <Helmet>
                                                        <title>MapleAurum | Filtered Hook Analytics</title>
                                                        <meta
                                                            name="description"
                                                            content="Explore curated insights for Canadian precious metals companies with MapleAurum's filtered Hook UI analytics tool."
                                                        />
                                                        <meta
                                                            name="keywords"
                                                            content="hook analytics, precious metals, Canadian mining, filtered insights, investment tools"
                                                        />
                                                        <link rel="canonical" href="https://mapleaurum.com/hook-filtered" />
                                                        <script type="application/ld+json">
                                                            {JSON.stringify({
                                                                '@context': 'https://schema.org',
                                                                '@type': 'BreadcrumbList',
                                                                itemListElement: [
                                                                    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://mapleaurum.com/' },
                                                                    {
                                                                        '@type': 'ListItem',
                                                                        position: 2,
                                                                        name: 'Hook Filtered',
                                                                        item: 'https://mapleaurum.com/hook-filtered',
                                                                    },
                                                                ],
                                                            })}
                                                        </script>
                                                    </Helmet>
                                                    <HookUIPage useGlobalFavorites />
                                                </>
                                            }
                                        />
                                        <Route path="/company/:id" element={<CompanyDetailPage />} />
                                        <Route
                                            path="/help"
                                            element={
                                                <>
                                                    <Helmet>
                                                        <title>MapleAurum | Help Center</title>
                                                        <meta
                                                            name="description"
                                                            content="Find answers to your questions in MapleAurum's Help Center, covering analytics tools, metrics, and Canadian precious metals data."
                                                        />
                                                        <meta
                                                            name="keywords"
                                                            content="help center, precious metals, Canadian mining, analytics support, user guide"
                                                        />
                                                        <link rel="canonical" href="https://mapleaurum.com/help" />
                                                        <script type="application/ld+json">
                                                            {JSON.stringify({
                                                                '@context': 'https://schema.org',
                                                                '@type': 'BreadcrumbList',
                                                                itemListElement: [
                                                                    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://mapleaurum.com/' },
                                                                    { '@type': 'ListItem', position: 2, name: 'Help', item: 'https://mapleaurum.com/help' },
                                                                ],
                                                            })}
                                                        </script>
                                                    </Helmet>
                                                    <HelpLandingPage />
                                                </>
                                            }
                                        />
                                        <Route
                                            path="/help/metrics"
                                            element={
                                                <>
                                                    <Helmet>
                                                        <title>MapleAurum | Metrics Guide</title>
                                                        <meta
                                                            name="description"
                                                            content="Learn about the financial and operational metrics used in MapleAurum's analytics for Canadian precious metals companies."
                                                        />
                                                        <meta
                                                            name="keywords"
                                                            content="metrics guide, precious metals, Canadian mining, financial metrics, analytics"
                                                        />
                                                        <link rel="canonical" href="https://mapleaurum.com/help/metrics" />
                                                        <script type="application/ld+json">
                                                            {JSON.stringify({
                                                                '@context': 'https://schema.org',
                                                                '@type': 'BreadcrumbList',
                                                                itemListElement: [
                                                                    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://mapleaurum.com/' },
                                                                    { '@type': 'ListItem', position: 2, name: 'Help', item: 'https://mapleaurum.com/help' },
                                                                    {
                                                                        '@type': 'ListItem',
                                                                        position: 3,
                                                                        name: 'Metrics',
                                                                        item: 'https://mapleaurum.com/help/metrics',
                                                                    },
                                                                ],
                                                            })}
                                                        </script>
                                                    </Helmet>
                                                    <HelpMetricsPage />
                                                </>
                                            }
                                        />
                                        <Route
                                            path="/help/filters"
                                            element={
                                                <>
                                                    <Helmet>
                                                        <title>MapleAurum | Filters Guide</title>
                                                        <meta
                                                            name="description"
                                                            content="Master MapleAurum's filtering tools with our guide, helping you analyze Canadian precious metals companies by key criteria."
                                                        />
                                                        <meta
                                                            name="keywords"
                                                            content="filters guide, precious metals, Canadian mining, analytics tools, user guide"
                                                        />
                                                        <link rel="canonical" href="https://mapleaurum.com/help/filters" />
                                                        <script type="application/ld+json">
                                                            {JSON.stringify({
                                                                '@context': 'https://schema.org',
                                                                '@type': 'BreadcrumbList',
                                                                itemListElement: [
                                                                    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://mapleaurum.com/' },
                                                                    { '@type': 'ListItem', position: 2, name: 'Help', item: 'https://mapleaurum.com/help' },
                                                                    {
                                                                        '@type': 'ListItem',
                                                                        position: 3,
                                                                        name: 'Filters',
                                                                        item: 'https://mapleaurum.com/help/filters',
                                                                    },
                                                                ],
                                                            })}
                                                        </script>
                                                    </Helmet>
                                                    <HelpFiltersPage />
                                                </>
                                            }
                                        />
                                        <Route
                                            path="/help/scoring"
                                            element={
                                                <>
                                                    <Helmet>
                                                        <title>MapleAurum | Scoring Guide</title>
                                                        <meta
                                                            name="description"
                                                            content="Understand MapleAurum's scoring methodology for evaluating Canadian precious metals companies with our detailed guide."
                                                        />
                                                        <meta
                                                            name="keywords"
                                                            content="scoring guide, precious metals, Canadian mining, analytics tools, investment metrics"
                                                        />
                                                        <link rel="canonical" href="https://mapleaurum.com/help/scoring" />
                                                        <script type="application/ld+json">
                                                            {JSON.stringify({
                                                                '@context': 'https://schema.org',
                                                                '@type': 'BreadcrumbList',
                                                                itemListElement: [
                                                                    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://mapleaurum.com/' },
                                                                    { '@type': 'ListItem', position: 2, name: 'Help', item: 'https://mapleaurum.com/help' },
                                                                    {
                                                                        '@type': 'ListItem',
                                                                        position: 3,
                                                                        name: 'Scoring',
                                                                        item: 'https://mapleaurum.com/help/scoring',
                                                                    },
                                                                ],
                                                            })}
                                                        </script>
                                                    </Helmet>
                                                    <HelpScoringPage />
                                                </>
                                            }
                                        />
                                        <Route
                                            path="/help/fcf-scoring"
                                            element={
                                                <>
                                                    <Helmet>
                                                        <title>MapleAurum | Free Cash Flow Scoring Guide</title>
                                                        <meta
                                                            name="description"
                                                            content="Explore MapleAurum's Free Cash Flow Scoring guide to learn how we assess Canadian precious metals companies for investment potential."
                                                        />
                                                        <meta
                                                            name="keywords"
                                                            content="free cash flow scoring, precious metals, Canadian mining, analytics guide, investment tools"
                                                        />
                                                        <link rel="canonical" href="https://mapleaurum.com/help/fcf-scoring" />
                                                        <script type="application/ld+json">
                                                            {JSON.stringify({
                                                                '@context': 'https://schema.org',
                                                                '@type': 'BreadcrumbList',
                                                                itemListElement: [
                                                                    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://mapleaurum.com/' },
                                                                    { '@type': 'ListItem', position: 2, name: 'Help', item: 'https://mapleaurum.com/help' },
                                                                    {
                                                                        '@type': 'ListItem',
                                                                        position: 3,
                                                                        name: 'FCF Scoring',
                                                                        item: 'https://mapleaurum.com/help/fcf-scoring',
                                                                    },
                                                                ],
                                                            })}
                                                        </script>
                                                    </Helmet>
                                                    <HelpFCFScoringPage />
                                                </>
                                            }
                                        />
                                        <Route
                                            path="/help/rps-scoring"
                                            element={
                                                <>
                                                    <Helmet>
                                                        <title>MapleAurum | RPS Scoring Guide</title>
                                                        <meta
                                                            name="description"
                                                            content="Learn the methodology behind the Relative Performance Score (RPS) system for evaluating Canadian precious metals companies."
                                                        />
                                                         <link rel="canonical" href="https://mapleaurum.com/help/rps-scoring" />
                                                    </Helmet>
                                                    <HelpRPSScoringPage />
                                                </>
                                            }
                                        />                                        
                                        <Route
                                            path="/help/scatter-chart"
                                            element={
                                                <>
                                                    <Helmet>
                                                        <title>MapleAurum | Scatter Chart Guide</title>
                                                        <meta
                                                            name="description"
                                                            content="Learn how to use MapleAurum's scatter chart tool to visualize and compare Canadian precious metals companies with our guide."
                                                        />
                                                        <meta
                                                            name="keywords"
                                                            content="scatter chart guide, precious metals, Canadian mining, analytics tools, visualization guide"
                                                        />
                                                        <link rel="canonical" href="https://mapleaurum.com/help/scatter-chart" />
                                                        <script type="application/ld+json">
                                                            {JSON.stringify({
                                                                '@context': 'https://schema.org',
                                                                '@type': 'BreadcrumbList',
                                                                itemListElement: [
                                                                    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://mapleaurum.com/' },
                                                                    { '@type': 'ListItem', position: 2, name: 'Help', item: 'https://mapleaurum.com/help' },
                                                                    {
                                                                        '@type': 'ListItem',
                                                                        position: 3,
                                                                        name: 'Scatter Chart',
                                                                        item: 'https://mapleaurum.com/help/scatter-chart',
                                                                    },
                                                                ],
                                                            })}
                                                        </script>
                                                    </Helmet>
                                                    <HelpScatterPage />
                                                </>
                                            }
                                        />
                                        <Route
                                            path="/help/scatter-score-pro"
                                            element={
                                                <>
                                                    <Helmet>
                                                        <title>MapleAurum | Scatter Score Pro Guide</title>
                                                        <meta
                                                            name="description"
                                                            content="Master MapleAurum's Scatter Score Pro tool with our guide, designed for advanced analysis of Canadian precious metals companies."
                                                        />
                                                        <meta
                                                            name="keywords"
                                                            content="scatter score pro guide, precious metals, Canadian mining, advanced analytics, user guide"
                                                        />
                                                        <link rel="canonical" href="https://mapleaurum.com/help/scatter-score-pro" />
                                                        <script type="application/ld+json">
                                                            {JSON.stringify({
                                                                '@context': 'https://schema.org',
                                                                '@type': 'BreadcrumbList',
                                                                itemListElement: [
                                                                    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://mapleaurum.com/' },
                                                                    { '@type': 'ListItem', position: 2, name: 'Help', item: 'https://mapleaurum.com/help' },
                                                                    {
                                                                        '@type': 'ListItem',
                                                                        position: 3,
                                                                        name: 'Scatter Score Pro',
                                                                        item: 'https://mapleaurum.com/help/scatter-score-pro',
                                                                    },
                                                                ],
                                                            })}
                                                        </script>
                                                    </Helmet>
                                                    <HelpScatterScorePage />
                                                </>
                                            }
                                        />
                                        <Route
                                            path="/help/tiers"
                                            element={
                                                <>
                                                    <Helmet>
                                                        <title>MapleAurum | Subscription Tiers Guide</title>
                                                        <meta
                                                            name="description"
                                                            content="Understand MapleAurum's subscription tiers and their benefits for accessing premium analytics on Canadian precious metals companies."
                                                        />
                                                        <meta
                                                            name="keywords"
                                                            content="subscription tiers, precious metals, Canadian mining, premium analytics, user guide"
                                                        />
                                                        <link rel="canonical" href="https://mapleaurum.com/help/tiers" />
                                                        <script type="application/ld+json">
                                                            {JSON.stringify({
                                                                '@context': 'https://schema.org',
                                                                '@type': 'BreadcrumbList',
                                                                itemListElement: [
                                                                    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://mapleaurum.com/' },
                                                                    { '@type': 'ListItem', position: 2, name: 'Help', item: 'https://mapleaurum.com/help' },
                                                                    {
                                                                        '@type': 'ListItem',
                                                                        position: 3,
                                                                        name: 'Tiers',
                                                                        item: 'https://mapleaurum.com/help/tiers',
                                                                    },
                                                                ],
                                                            })}
                                                        </script>
                                                    </Helmet>
                                                    <HelpTiersPage />
                                                </>
                                            }
                                        />
                                        <Route
                                            path="/help/general"
                                            element={
                                                <>
                                                    <Helmet>
                                                        <title>MapleAurum | General Help Guide</title>
                                                        <meta
                                                            name="description"
                                                            content="Get started with MapleAurum's analytics platform using our general help guide for Canadian precious metals investment tools."
                                                        />
                                                        <meta
                                                            name="keywords"
                                                            content="general help, precious metals, Canadian mining, analytics platform, user guide"
                                                        />
                                                        <link rel="canonical" href="https://mapleaurum.com/help/general" />
                                                        <script type="application/ld+json">
                                                            {JSON.stringify({
                                                                '@context': 'https://schema.org',
                                                                '@type': 'BreadcrumbList',
                                                                itemListElement: [
                                                                    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://mapleaurum.com/' },
                                                                    { '@type': 'ListItem', position: 2, name: 'Help', item: 'https://mapleaurum.com/help' },
                                                                    {
                                                                        '@type': 'ListItem',
                                                                        position: 3,
                                                                        name: 'General',
                                                                        item: 'https://mapleaurum.com/help/general',
                                                                    },
                                                                ],
                                                            })}
                                                        </script>
                                                    </Helmet>
                                                    <HelpGeneralPage />
                                                </>
                                            }
                                        />
										
												
																			
										{/* New HGRAPH route */}
										<Route
										  path="/HGRAPH"
										  element={
											<>
											  <Helmet>
												<title>MapleAurum | Hydrograph (HGRAPH) Token</title>
												<meta
												  name="description"
												  content="Discover Hydrograph (HGRAPH), a cryptocurrency token for speculative investment in the precious metals analytics ecosystem, distinct from Hydrograph Clean Energy."
												/>
												<meta
												  name="keywords"
												  content="HGRAPH, Hydrograph token, cryptocurrency, precious metals, investment, MapleAurum"
												/>
												<link rel="canonical" href="https://mapleaurum.com/HGRAPH" />
												<script type="application/ld+json">
												  {JSON.stringify({
													'@context': 'https://schema.org',
													'@type': 'BreadcrumbList',
													itemListElement: [
													  { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://mapleaurum.com/' },
													  {
														'@type': 'ListItem',
														position: 2,
														name: 'HGRAPH Token',
														item: 'https://mapleaurum.com/HGRAPH',
													  },
													],
												  })}
												</script>
											  </Helmet>
											  <HGRAPHPage />
											</>
										  }
										/>
									
										
                                        <Route path="/admin/send-email" element={<AdminSendEmailPage />} />
                                        <Route path="/admin/promo-tracking" element={<PromoTrackingPage />} />
                                        <Route path="/account/profile" element={<ProfilePage />} />
                                        <Route
                                            path="/blog"
                                            element={<BlogLandingPage />}
                                        />                                        
                                        <Route
                                            path="/blog/how-to-choose-a-precious-metals-mining-company-to-invest-in"
                                            element={
                                                <>
                                                    <Helmet>
                                                        <title>MapleAurum | How to Choose a Mining Company</title>
                                                        <meta
                                                            name="description"
                                                            content="Learn how to select the best Canadian precious metals mining companies for investment with MapleAurum's expert guide."
                                                        />
                                                        <meta
                                                            name="keywords"
                                                            content="mining investment, precious metals, Canadian mining, investment guide, gold, silver"
                                                        />
                                                        <link rel="canonical" href="https://mapleaurum.com/how-to-choose-a-precious-metals-mining-company-to-invest-in" />
                                                        <script type="application/ld+json">
                                                            {JSON.stringify({
                                                                '@context': 'https://schema.org',
                                                                '@type': 'BreadcrumbList',
                                                                itemListElement: [
                                                                    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://mapleaurum.com/' },
                                                                    {
                                                                        '@type': 'ListItem',
                                                                        position: 2,
                                                                        name: 'Blog - Investment Guide',
                                                                        item: 'https://mapleaurum.com/how-to-choose-a-precious-metals-mining-company-to-invest-in',
                                                                    },
                                                                ],
                                                            })}
                                                        </script>
                                                    </Helmet>
                                                    <HowToChooseMiningCompanyBlogPage />
                                                </>
                                            }
                                        />
										<Route path="/onboarding" element={<OnboardingPage />} />
                                        {/* ADDED: Route for the new Mastering RPS blog page */}
                                        <Route
                                            path="/blog/mastering-rps-a-quick-guide"
                                            element={
                                                <>
                                                    <Helmet>
                                                        <title>MapleAurum | Mastering the RPS: A Quick Guide</title>
                                                        <meta name="description" content="A video guide and article explaining the powerful Relative Performance Score (RPS) tool for contextual, peer-based analysis of precious metals companies." />
                                                        <link rel="canonical" href="https://mapleaurum.com/blog/mastering-rps-a-quick-guide" />
                                                    </Helmet>
                                                    <MasteringRPSBlogPage />
                                                </>
                                            }
                                        />
                                    </Route>
									<Route path="/graphene-explorer" element={<GrapheneExplorerPage />} />
                                    <Route
                                        path="/hook"
                                        element={
                                            <>
                                                <Helmet>
                                                    <title>MapleAurum | Hook Analytics</title>
                                                    <meta
                                                        name="description"
                                                        content="Access MapleAurum's Hook UI for streamlined analytics on Canadian precious metals companies and investment insights."
                                                    />
                                                    <meta
                                                        name="keywords"
                                                        content="hook analytics, precious metals, Canadian mining, investment insights, analytics tool"
                                                    />
                                                    <link rel="canonical" href="https://mapleaurum.com/hook" />
                                                    <script type="application/ld+json">
                                                        {JSON.stringify({
                                                            '@context': 'https://schema.org',
                                                            '@type': 'BreadcrumbList',
                                                            itemListElement: [
                                                                { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://mapleaurum.com/' },
                                                                { '@type': 'ListItem', position: 2, name: 'Hook', item: 'https://mapleaurum.com/hook' },
                                                            ],
                                                        })}
                                                    </script>
                                                </Helmet>
                                                <HookUIPage />
                                            </>
                                        }
                                    />
                                    <Route path="/login" element={<LoginPage />} />
                                    <Route path="/auth" element={<Navigate to="/login" replace />} />
                                    <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                                    <Route path="/reset-password" element={<ResetPasswordPage />} />
                                    
                                    <Route path="*" element={<NotFoundPage />} />
                                </Routes>
                            </ErrorBoundary>
                        </CurrencyProvider>
                    </SubscriptionProvider>
                </AuthProvider>
            </ThemeProvider>
        </HelmetProvider>
    );
}

export default App;