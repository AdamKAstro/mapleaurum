// src/App.tsx
import React from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Helmet, HelmetProvider } from 'react-helmet-async'; // Updated import
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
import { ConfirmEmailPage } from './pages/confirm-email';
import { CompaniesPage } from './pages/companies';
import { SubscribePage } from './pages/subscribe';
import { ScatterChartPage } from './pages/scatter-chart';
import { FilterPage } from './pages/filter';
import AdvScoringPage from './pages/scoring-advanced';
import { ScatterScoreProPage } from './pages/scatter-score-pro';
import { HelpLandingPage } from './pages/help/index';
import { HelpMetricsPage } from './pages/help/metrics';
import { HelpFiltersPage } from './pages/help/filters-guide';
import { HelpScoringPage } from './pages/help/scoring-guide';
import { HelpScatterPage } from './pages/help/scatter-guide';
import { HelpScatterScorePage } from './pages/help/scatter-score-guide';
import { HelpTiersPage } from './pages/help/tiers';
import { HelpGeneralPage } from './pages/help/general';
import { AdminSendEmailPage } from './pages/admin/send-email';
import { GlassCustomizationPage } from './pages/glass-customization';
import CompanyDetailPage from './pages/company-detail';

function NotFoundPage() {
  return (
    <div className="flex items-center justify-center h-screen p-10 bg-navy-900 text-white">
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
                  <title>MapleAurum | Canadian Mining Analytics</title>
                  <meta name="description" content={jsonLd.description} />
                  <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
                </Helmet>
                <Routes>
                  <Route element={<FilteredLayout />}>
                    <Route path="/" element={<Hero />} />
                    <Route path="/companies" element={<CompaniesPage />} />
                    <Route path="/glass-customization" element={<GlassCustomizationPage />} />
                    <Route path="/filter" element={<FilterPage />} />
                    <Route path="/scoring-advanced" element={<AdvScoringPage />} />
                    <Route path="/scatter-chart" element={<ScatterChartPage />} />
                    <Route path="/scatter-score-pro" element={<ScatterScoreProPage />} />
                    <Route path="/subscribe" element={<SubscribePage />} />
                    <Route path="/hook-filtered" element={<HookUIPage useGlobalFavorites />} />
                    <Route path="/company/:id" element={<CompanyDetailPage />} />
                  </Route>
                  <Route path="/hook" element={<HookUIPage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/auth" element={<Navigate to="/login" replace />} />
                  <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                  <Route path="/reset-password" element={<ResetPasswordPage />} />
                  <Route path="/onboarding" element={<OnboardingPage />} />
                  <Route path="/confirm-email" element={<ConfirmEmailPage />} />
                  <Route path="/help" element={<HelpLandingPage />} />
                  <Route path="/help/metrics" element={<HelpMetricsPage />} />
                  <Route path="/help/filters" element={<HelpFiltersPage />} />
                  <Route path="/help/scoring" element={<HelpScoringPage />} />
                  <Route path="/help/scatter-chart" element={<HelpScatterPage />} />
                  <Route path="/help/scatter-score-pro" element={<HelpScatterScorePage />} />
                  <Route path="/help/tiers" element={<HelpTiersPage />} />
                  <Route path="/help/general" element={<HelpGeneralPage />} />
                  <Route path="/admin/send-email" element={<AdminSendEmailPage />} />
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