// src/App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Helmet } from 'react-helmet';

// --- Providers ---
// AuthProvider should wrap other providers that might need auth state
import { AuthProvider } from './contexts/auth-context';
import { SubscriptionProvider } from './contexts/subscription-context';
import { CurrencyProvider } from './contexts/currency-context';
import { ThemeProvider } from './contexts/theme-context';
import { FilterProvider } from './contexts/filter-context';

// --- Layout Components ---
import { Header } from './components/ui/header';
import { Sidebar } from './components/ui/sidebar';
import ErrorBoundary from './components/ErrorBoundary'; // Global error boundary

// --- Page Components ---
// Core Pages
import { Hero } from './components/ui/hero'; // Home page
import { LoginPage } from './pages/login';
import { ForgotPasswordPage } from './pages/forgot-password';
import { ResetPasswordPage } from './pages/reset-password';
import { AuthPage } from './pages/auth'; // Combined Login/Signup page
import { OnboardingPage } from './pages/onboarding'; // Post-subscription page
import { CompaniesPage } from './pages/companies';
import { SubscribePage } from './pages/subscribe';
import { SuccessPage } from './pages/success'; // Note: May be replaced by OnboardingPage flow
import { ScatterChartPage } from './pages/scatter-chart';
import { FilterPage } from './pages/filter';
import ScoringPage from './pages/scoring';
// Help Pages
import { HelpLandingPage } from './pages/help/index';
import { HelpMetricsPage } from './pages/help/metrics';
import { HelpFiltersPage } from './pages/help/filters-guide';
import { HelpScoringPage } from './pages/help/scoring-guide';
import { HelpScatterPage } from './pages/help/scatter-guide';
import { HelpTiersPage } from './pages/help/tiers';
import { HelpGeneralPage } from './pages/help/general';
// Debug Component (Optional - Renders only in dev)
// Import it only if the file exists and you intend to use it
import { DebugTierSelector } from './components/ui/DebugTierSelector'; // Assuming this component exists

// --- Fallback 404 Page ---
function NotFoundPage() {
    return (
        <div className="flex items-center justify-center h-full p-10 text-white">
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

// --- Main App Component ---
function App() {
    // JSON-LD for SEO
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": "MapleAurum",
        "url": "https://mapleaurum.com",
        "description": "Financial data and analytics for Canadian precious metals companies.",
        "publisher": {
            "@type": "Organization",
            "name": "MapleAurum",
            "email": "support@mapleaurum.com" // Ensure this email exists and is monitored
        },
        "potentialAction": {
            "@type": "SearchAction",
            "target": "https://mapleaurum.com/companies?search={search_term_string}",
            "query-input": "required name=search_term_string"
        }
    };

    // Check if DebugTierSelector should be shown (only in development)
    const showDebugSelector = process.env.NODE_ENV === 'development' && typeof DebugTierSelector !== 'undefined';

    return (
        <Router>
            {/* ThemeProvider likely wraps everything */}
            <ThemeProvider>
                {/* AuthProvider wraps providers needing auth state */}
                <AuthProvider>
                    {/* SubscriptionProvider needs auth state */}
                    <SubscriptionProvider>
                        {/* CurrencyProvider might be independent or used within others */}
                        <CurrencyProvider>
                            {/* FilterProvider needs auth and subscription state */}
                            <FilterProvider>
                                {/* Global Error Boundary for catching unexpected errors */}
                                <ErrorBoundary fallback={<div className="flex items-center justify-center h-screen text-red-500">Something went terribly wrong! Please reload the page.</div>}>
                                    <Helmet>
                                        <title>MapleAurum | Canadian Mining Analytics</title> {/* Default Title */}
                                        <meta name="description" content={jsonLd.description} />
                                        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
                                        {/* Add other meta tags as needed */}
                                    </Helmet>
                                    {/* Main Layout Structure */}
                                    <div className="flex flex-col min-h-screen bg-navy-900"> {/* Added base bg */}
                                        <Header /> {/* Header uses Auth and Subscription */}
                                        <div className="flex flex-1 overflow-hidden">
                                            <Sidebar /> {/* Sidebar might need auth/sub later for conditional items */}
                                            {/* Main Content Area */}
                                            <main className="flex-1 overflow-y-auto relative isolate">
                                                {/* Backgrounds (ensure they don't block content) */}
                                                <div className="absolute inset-0 bg-cover bg-center bg-fixed -z-20 opacity-[0.03]" style={{ backgroundImage: `url('/Background2.jpg')` }} aria-hidden="true" />
                                                <div className="absolute inset-0 bg-noise opacity-[0.07] -z-10" aria-hidden="true" />

                                                {/* Page Specific Error Boundary */}
                                                <ErrorBoundary fallback={<div className="p-6 text-red-400">Error loading this page section.</div>}>
                                                    <Routes>
                                                        {/* --- Core & Auth Routes --- */}
                                                        <Route path="/" element={<Hero />} />
                                                        <Route path="/login" element={<LoginPage />} />
                                                        <Route path="/auth" element={<AuthPage />} /> {/* Combined Auth Page */}
                                                        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                                                        <Route path="/reset-password" element={<ResetPasswordPage />} />
                                                        <Route path="/subscribe" element={<SubscribePage />} />
                                                        <Route path="/subscribe/success" element={<SuccessPage />} /> {/* Or redirect this to onboarding */}
                                                        <Route path="/onboarding" element={<OnboardingPage />} /> {/* Post-Subscription Page */}

                                                        {/* --- Feature Pages --- */}
                                                        <Route path="/companies" element={<CompaniesPage />} />
                                                        <Route path="/scatter-chart" element={<ScatterChartPage />} />
                                                        <Route path="/filter" element={<FilterPage />} />
                                                        <Route path="/scoring" element={<ScoringPage />} />
                                                        {/* Add future dashboard/account pages here */}
                                                        {/* <Route path="/dashboard" element={<DashboardPage />} /> */}
                                                        {/* <Route path="/account" element={<AccountPage />} /> */}


                                                        {/* --- Help Pages --- */}
                                                        <Route path="/help" element={<HelpLandingPage />} />
                                                        <Route path="/help/metrics" element={<HelpMetricsPage />} />
                                                        <Route path="/help/filters" element={<HelpFiltersPage />} />
                                                        <Route path="/help/scoring" element={<HelpScoringPage />} />
                                                        <Route path="/help/scatter-chart" element={<HelpScatterPage />} />
                                                        <Route path="/help/tiers" element={<HelpTiersPage />} />
                                                        <Route path="/help/general" element={<HelpGeneralPage />} />

                                                        {/* --- Catch All 404 Route --- */}
                                                        <Route path="*" element={<NotFoundPage />} />
                                                    </Routes>
                                                </ErrorBoundary>
                                            </main>
                                        </div>
                                    </div>
                                    {/* Optional Debug Tier Selector - Renders only if component exists and in dev mode */}
                                    {showDebugSelector && <DebugTierSelector />}
                                </ErrorBoundary>
                            </FilterProvider>
                        </CurrencyProvider>
                    </SubscriptionProvider>
                </AuthProvider>
            </ThemeProvider>
        </Router>
    );
}

export default App;
