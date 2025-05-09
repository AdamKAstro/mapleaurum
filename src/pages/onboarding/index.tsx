// src/pages/onboarding/index.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { PageContainer } from '../../components/ui/page-container';
import { Typography } from '../../components/ui/typography';
import { Button } from '../../components/ui/button';
import { useAuth } from '../../contexts/auth-context';
import { supabase } from '../../lib/supabaseClient';
import { cn } from '../../lib/utils';
import { Check, Mail } from 'lucide-react';

export function OnboardingPage() {
  const { session, user, isLoading: isAuthLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const backgroundImageUrl = '/og-image.jpg';
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [stripeEmail, setStripeEmail] = useState<string | null>(null);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const sessionId = searchParams.get('session_id');
    if (isAuthLoading) return;

    if (sessionId) {
      // Fetch Stripe session to get email
      const fetchSession = async () => {
        try {
          const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
            headers: {
              Authorization: `Bearer ${import.meta.env.VITE_STRIPE_SECRET_KEY}`,
            },
          });
          const sessionData = await response.json();
          if (sessionData.customer_email) {
            setStripeEmail(sessionData.customer_email);
            setSubscriptionStatus(`Subscription confirmed: ${sessionData.metadata?.plan || 'Unknown'}`);
          }
        } catch (err) {
          console.error('[OnboardingPage] Stripe session fetch error:', err);
          setSubscriptionStatus('Error verifying subscription. Please contact support.');
        }
      };
      fetchSession();
    } else {
      navigate('/subscribe');
    }
  }, [isAuthLoading, navigate, location.search]);

  const handleComplete = async () => {
    if (!session && stripeEmail) {
      // Check if user exists in Supabase
      const { data: existingUser } = await supabase.auth.getUser(stripeEmail);
      if (!existingUser.user) {
        // Prompt sign-up
        navigate(`/auth?signup=true&email=${encodeURIComponent(stripeEmail)}`);
        return;
      }
    }
    navigate('/companies');
  };

  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-navy-900">
        <Typography variant="h3" className="text-white">Loading...</Typography>
      </div>
    );
  }

  return (
    <PageContainer
      title="Welcome to MapleAurum"
      description="Get started with your subscription"
      className="relative min-h-screen w-full overflow-hidden bg-gradient-to-b from-navy-400 via-navy-300 to-navy-400"
    >
      <div
        className="absolute inset-0 bg-cover bg-center opacity-30 -z-10"
        style={{ backgroundImage: `url('${backgroundImageUrl}')` }}
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-noise opacity-20 -z-10" aria-hidden="true" />
      <div className="relative z-0 pt-8 pb-12 max-w-3xl mx-auto text-center">
        <Typography variant="h2" className="text-surface-white text-3xl sm:text-4xl font-bold tracking-tight">
          Welcome, {user?.email || stripeEmail || 'Guest'}!
        </Typography>
        {subscriptionStatus && (
          <Typography variant="body" className="mt-4 text-surface-white/80 text-lg">
            {subscriptionStatus}
          </Typography>
        )}
        {!session && stripeEmail && (
          <div className="mt-4">
            <Typography variant="body" className="text-surface-white/80 text-lg">
              Please sign up or log in with <strong>{stripeEmail}</strong> to access your subscription.
            </Typography>
            <Button
              onClick={() => navigate(`/auth?signup=true&email=${encodeURIComponent(stripeEmail)}`)}
              className="mt-4 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white"
            >
              <Mail className="mr-2 h-4 w-4" /> Sign Up / Log In
            </Button>
          </div>
        )}
        <Typography variant="body" className="mt-4 text-surface-white/80 text-lg">
          You’re ready to explore powerful mining analytics with MapleAurum. Here’s what you can do:
        </Typography>
        <div className="mt-8 grid gap-4 text-left">
          <div className="flex items-start">
            <Check className="h-6 w-6 text-accent-teal mr-3 mt-1" />
            <div>
              <Typography variant="h4" className="text-white">Explore Company Data</Typography>
              <Typography variant="body" className="text-gray-300">
                Access detailed financial metrics and company profiles.
              </Typography>
            </div>
          </div>
          <div className="flex items-start">
            <Check className="h-6 w-6 text-accent-teal mr-3 mt-1" />
            <div>
              <Typography variant="h4" className="text-white">Analyze with Tools</Typography>
              <Typography variant="body" className="text-gray-300">
                Use advanced analytics like scatter charts and scoring.
              </Typography>
            </div>
          </div>
          <div className="flex items-start">
            <Check className="h-6 w-6 text-accent-teal mr-3 mt-1" />
            <div>
              <Typography variant="h4" className="text-white">Stay Updated</Typography>
              <Typography variant="body" className="text-gray-300">
                Get real-time alerts and daily updates (Premium).
              </Typography>
            </div>
          </div>
        </div>
        {session && (
          <Button
            onClick={handleComplete}
            className="mt-8 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white"
          >
            Start Exploring
          </Button>
        )}
      </div>
    </PageContainer>
  );
}