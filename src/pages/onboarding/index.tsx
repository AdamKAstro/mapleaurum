// src/pages/onboarding/index.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { PageContainer } from '../../components/ui/page-container';
import { Typography } from '../../components/ui/typography';
import { Button } from '../../components/ui/button';
import { useAuth } from '../../contexts/auth-context';
import { useSubscription } from '../../contexts/subscription-context';
import { supabase } from '../../lib/supabaseClient';
import { 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  Table2, 
  LogIn as LogInIcon, 
  UserPlus, 
  Mail,
  CreditCard,
  Sparkles 
} from 'lucide-react';
import { Alert, AlertDescription } from '../../components/ui/alert';

interface OnboardingState {
  status: 'loading' | 'success' | 'error' | 'requires-auth';
  message: string;
  details?: {
    email?: string;
    planName?: string;
    isTrialing?: boolean;
    subscriptionId?: string;
  };
}

export function OnboardingPage() {
  const { session, user, isLoading: isAuthLoading } = useAuth();
  const { refreshSubscriptionStatus, currentUserSubscriptionTier } = useSubscription();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [state, setState] = useState<OnboardingState>({
    status: 'loading',
    message: 'Verifying your subscription...'
  });

  useEffect(() => {
    const processOnboarding = async () => {
      const searchParams = new URLSearchParams(location.search);
      const stripeSessionId = searchParams.get('session_id');
      const tier = searchParams.get('tier');
      const trial = searchParams.get('trial');
      const planName = searchParams.get('plan_name');

      console.log('[OnboardingPage] Processing:', { 
        stripeSessionId, 
        tier, 
        trial, 
        planName,
        isAuthLoading,
        userId: user?.id 
      });

      // Wait for auth to stabilize
      if (isAuthLoading) {
        setState({
          status: 'loading',
          message: 'Initializing your session...'
        });
        return;
      }

      // Case 1: Logged in user returning from Stripe
      if (user && session) {
        setState({
          status: 'loading',
          message: 'Activating your subscription...'
        });

        try {
          await refreshSubscriptionStatus();
          
          setState({
            status: 'success',
            message: planName 
              ? `Your ${planName} subscription is now active!`
              : 'Subscription successfully activated!',
            details: {
              planName: planName || tier || currentUserSubscriptionTier,
              isTrialing: trial === 'true'
            }
          });
        } catch (error) {
          console.error('[OnboardingPage] Error refreshing subscription:', error);
          setState({
            status: 'error',
            message: 'We couldn\'t confirm your subscription immediately. Please check your account or contact support.'
          });
        }
        return;
      }

      // Case 2: New customer from Stripe (not logged in)
      if (stripeSessionId && !user) {
        setState({
          status: 'loading',
          message: 'Retrieving your payment details...'
        });

        try {
          const { data, error } = await supabase.functions.invoke('get-stripe-session-details', {
            body: { checkoutSessionId: stripeSessionId }
          });

          if (error) throw error;

          if (data?.customerEmail) {
            setState({
              status: 'requires-auth',
              message: `Payment successful! Create an account or sign in with ${data.customerEmail} to access your subscription.`,
              details: {
                email: data.customerEmail,
                planName: data.planName || planName || tier,
                subscriptionId: data.subscriptionId
              }
            });
          } else {
            throw new Error('Could not retrieve payment details');
          }
        } catch (error) {
          console.error('[OnboardingPage] Error fetching Stripe session:', error);
          setState({
            status: 'error',
            message: 'There was an issue confirming your payment. Please contact support if you were charged.'
          });
        }
        return;
      }

      // Case 3: Direct navigation without context
      if (!stripeSessionId && !user) {
        console.log('[OnboardingPage] No session or user, redirecting to subscribe');
        navigate('/subscribe', { replace: true });
        return;
      }

      // Case 4: Logged in user without Stripe session
      setState({
        status: 'success',
        message: 'Welcome to MapleAurum!',
        details: {
          planName: currentUserSubscriptionTier
        }
      });
    };

    processOnboarding();
  }, [isAuthLoading, user, session, location.search, navigate, refreshSubscriptionStatus, currentUserSubscriptionTier]);

  const renderContent = () => {
    switch (state.status) {
      case 'loading':
        return (
          <div className="text-center">
            <Loader2 className="h-16 w-16 text-cyan-300 animate-spin mx-auto mb-6" />
            <Typography variant="h3" className="text-white mb-2">
              {state.message}
            </Typography>
            <Typography variant="body" className="text-gray-300">
              This may take a few moments...
            </Typography>
          </div>
        );

      case 'success':
        return (
          <div className="text-center">
            <CheckCircle className="h-16 w-16 text-emerald-500 mx-auto mb-6" />
            <Typography variant="h2" className="text-2xl sm:text-3xl font-bold text-white mb-4">
              {state.message}
            </Typography>
            {state.details?.isTrialing && (
              <Alert className="mb-6 border-purple-600/50 bg-purple-900/20">
                <Sparkles className="h-4 w-4 text-purple-400" />
                <AlertDescription className="text-purple-200">
                  Your trial period has started. Explore all premium features!
                </AlertDescription>
              </Alert>
            )}
            <div className="space-y-4">
              <Button
                onClick={() => navigate('/companies')}
                size="lg"
                className="w-full bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700"
              >
                <Table2 className="mr-2 h-5 w-5" />
                Start Exploring Data
              </Button>
              <Typography variant="bodySmall" className="text-gray-400">
                You can manage your subscription anytime from your account settings.
              </Typography>
            </div>
          </div>
        );

      case 'requires-auth':
        return (
          <div className="text-center">
            <CreditCard className="h-16 w-16 text-cyan-400 mx-auto mb-6" />
            <Typography variant="h2" className="text-2xl sm:text-3xl font-bold text-white mb-4">
              Payment Successful!
            </Typography>
            <Typography variant="body" className="text-gray-300 mb-6">
              {state.message}
            </Typography>
            {state.details?.email && (
              <Alert className="mb-6 border-blue-600/50 bg-blue-900/20">
                <Mail className="h-4 w-4 text-blue-400" />
                <AlertDescription className="text-blue-200">
                  Please use <strong>{state.details.email}</strong> when creating your account
                </AlertDescription>
              </Alert>
            )}
            <div className="space-y-3">
              <Button
                onClick={() => navigate(`/login?action=signup&email=${encodeURIComponent(state.details?.email || '')}&plan_name=${encodeURIComponent(state.details?.planName || '')}`)}
                size="lg"
                className="w-full bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700"
              >
                <UserPlus className="mr-2 h-5 w-5" />
                Create New Account
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate(`/login?email=${encodeURIComponent(state.details?.email || '')}`)}
                size="lg"
                className="w-full border-cyan-600 text-cyan-300 hover:bg-cyan-700/20"
              >
                <LogInIcon className="mr-2 h-5 w-5" />
                I Already Have an Account
              </Button>
            </div>
          </div>
        );

      case 'error':
        return (
          <div className="text-center">
            <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-6" />
            <Typography variant="h2" className="text-2xl sm:text-3xl font-bold text-white mb-4">
              Something Went Wrong
            </Typography>
            <Typography variant="body" className="text-gray-300 mb-6">
              {state.message}
            </Typography>
            <div className="space-y-3">
              <Button
                onClick={() => navigate('/subscribe')}
                variant="outline"
                size="lg"
                className="w-full border-red-500 text-red-300 hover:bg-red-700/20"
              >
                Return to Plans
              </Button>
              <Typography variant="bodySmall" className="text-gray-400">
                Contact support at{' '}
                <a href="mailto:support@mapleaurum.com" className="text-cyan-400 hover:underline">
                  support@mapleaurum.com
                </a>
              </Typography>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <PageContainer 
      title="Setting Up Your Account" 
      description="Just a moment while we prepare everything for you"
      className="relative min-h-screen w-full overflow-hidden bg-gradient-to-b from-navy-900 via-navy-800 to-navy-900"
    >
      <div className="absolute inset-0 bg-cover bg-center opacity-30 -z-10" 
           style={{ backgroundImage: `url('/og-image.jpg')` }} 
           aria-hidden="true" />
      <div className="absolute inset-0 bg-noise opacity-20 -z-10" aria-hidden="true" />
      
      <div className="relative z-0 flex items-center justify-center min-h-[calc(100vh-150px)] px-4">
        <div className="max-w-lg w-full bg-navy-800/80 backdrop-blur-md shadow-xl rounded-lg p-6 sm:p-8">
          {renderContent()}
        </div>
      </div>
    </PageContainer>
  );
}