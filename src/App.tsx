// src/App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Helmet } from 'react-helmet';

// Providers
import { AuthProvider } from './contexts/auth-context';
import { SubscriptionProvider } from './contexts/subscription-context';
import { CurrencyProvider } from './contexts/currency-context';
import { ThemeProvider } from './contexts/theme-context';
import { FilterProvider } from './contexts/filter-context';

// Layout Components
import { Header } from './components/ui/header';
import { Sidebar } from './components/ui/sidebar';
import ErrorBoundary from './components/ErrorBoundary';

// Page Components
import { LoginPage } from './pages/login';
import { ForgotPasswordPage } from './pages/forgot-password'; // <-- Import Forgot Password Page
import { ResetPasswordPage } from './pages/reset-password'; // <-- Import Reset Password Page
import { CompaniesPage } from './pages/companies';
import { SubscribePage } from './pages/subscribe';
import { SuccessPage } from './pages/success';
import { ScatterChartPage } from './pages/scatter-chart';
import { FilterPage } from './pages/filter';
import ScoringPage from './pages/scoring';
import { Hero } from './components/ui/hero';

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
import { DebugTierSelector } from './components/ui/DebugTierSelector';

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

function App() {
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": "MapleAurum",
        "url": "https://mapleaurum.com",
        "description": "Financial data and analytics for Canadian precious metals companies.",
        "publisher": {
            "@type": "Organization",
            "name": "MapleAurum",
            "email": "support@mapleaurum.com" // Make sure this email exists
        },
        "potentialAction": {
            "@type": "SearchAction",
            "target": "https://mapleaurum.com/companies?search={search_term_string}",
            "query-input": "required name=search_term_string"
        }
    };

    // Check if DebugTierSelector exists and if in development mode
    const showDebugSelector = process.env.NODE_ENV === 'development' && typeof DebugTierSelector !== 'undefined';

    return (
        <Router>
            <ThemeProvider>
                <AuthProvider>
                    <SubscriptionProvider>
                        <CurrencyProvider>
                            <FilterProvider>
                                <ErrorBoundary fallback={<div>Something went terribly wrong! Please reload.</div>}>
                                    <Helmet>
                                        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
                                    </Helmet>
                                    <div className="flex flex-col min-h-screen">
                                        <Header />
                                        <div className="flex flex-1 overflow-hidden">
                                            <Sidebar />
                                            <main className="flex-1 overflow-y-auto bg-navy-900/50 relative isolate">
                                                {/* Backgrounds */}
                                                <div className="absolute inset-0 bg-cover bg-center bg-fixed -z-10 opacity-[0.03]" style={{ backgroundImage: `url('/Background2.jpg')` }} aria-hidden="true" />
                                                <div className="absolute inset-0 bg-noise opacity-[0.07] -z-10" aria-hidden="true" />

                                                <ErrorBoundary fallback={<div>Error loading this page section.</div>}>
                                                    <Routes>
                                                        {/* Core Pages */}
                                                        <Route path="/" element={<Hero />} />
                                                        <Route path="/login" element={<LoginPage />} />
                                                        <Route path="/forgot-password" element={<ForgotPasswordPage />} /> {/* <-- Added */}
                                                        <Route path="/reset-password" element={<ResetPasswordPage />} /> {/* <-- Added */}
                                                        <Route path="/companies" element={<CompaniesPage />} />
                                                        <Route path="/scatter-chart" element={<ScatterChartPage />} />
                                                        <Route path="/subscribe" element={<SubscribePage />} />
                                                        <Route path="/subscribe/success" element={<SuccessPage />} />
                                                        <Route path="/filter" element={<FilterPage />} />
                                                        <Route path="/scoring" element={<ScoringPage />} />

                                                        {/* Help Pages */}
                                                        <Route path="/help" element={<HelpLandingPage />} />
                                                        <Route path="/help/metrics" element={<HelpMetricsPage />} />
                                                        <Route path="/help/filters" element={<HelpFiltersPage />} />
                                                        <Route path="/help/scoring" element={<HelpScoringPage />} />
                                                        <Route path="/help/scatter-chart" element={<HelpScatterPage />} />
                                                        <Route path="/help/tiers" element={<HelpTiersPage />} />
                                                        <Route path="/help/general" element={<HelpGeneralPage />} />

                                                        {/* Catch All */}
                                                        <Route path="*" element={<NotFoundPage />} />
                                                    </Routes>
                                                </ErrorBoundary>
                                            </main>
                                        </div>
                                    </div>
                                    {/* Optional Debug Tier Selector - Render only if component exists and in dev mode */}
                                    <DebugTierSelector />
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