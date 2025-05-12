// src/pages/subscribe/index.tsx
import React, { useState, useEffect } from 'react';
import { Star, Crown, Check, Loader2 } from 'lucide-react'; // Added Loader2
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Typography } from '../../components/ui/typography';
import { PageContainer } from '../../components/ui/page-container';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { useAuth } from '../../contexts/auth-context';
import { useSubscription } from '../../contexts/subscription-context';
import { cn } from '../../lib/utils';
import { SubscriptionTier } from '../../lib/types';
import { supabase } from '../../lib/supabaseClient'; // For calling Edge Functions

// Ensure this is set in your .env file (e.g., VITE_FRONTEND_URL)
const FRONTEND_URL = import.meta.env.VITE_FRONTEND_URL || 'http://localhost:3000'; // Default for local dev
const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_YOUR_STRIPE_PUBLISHABLE_KEY'; // Ensure this is set via env var

interface PlanDisplayData {
  name: string;
  priceMonthlyDisplay: string;
  priceYearlyDisplay: string;
  periodMonthly: string;
  periodYearly: string;
  description: string;
  features: string[];
  icon: React.ComponentType<{ className?: string }> | null;
  color: string;
  popular: boolean;
  tier: SubscriptionTier; // This is 'free' | 'pro' | 'premium'
  priceIdMonthly: string;
  priceIdYearly: string;
  buyButtonIdMonthly: string;
  buyButtonIdYearly: string;
}

const plansData: PlanDisplayData[] = [
  {
    name: 'Free',
    priceMonthlyDisplay: '$0', priceYearlyDisplay: '$0', periodMonthly: '', periodYearly: '',
    description: 'Basic access to company data',
    features: ['Basic company information', 'Limited financial metrics', 'Public company profiles', 'Daily updates'],
    icon: null, color: 'gray', popular: false, tier: 'free',
    priceIdMonthly: '', priceIdYearly: '', buyButtonIdMonthly: '', buyButtonIdYearly: '',
  },
  {
    name: 'Pro', // Matches SubscriptionTier 'pro'
    priceMonthlyDisplay: '$40', priceYearlyDisplay: '$420', periodMonthly: '/month', periodYearly: '/year',
    description: 'Advanced analytics and insights',
    features: ['Financial metrics', 'Resource estimates', 'Production data', 'Custom watchlists (coming)'],
    icon: Star, color: 'accent-teal', popular: true, tier: 'pro',
    priceIdMonthly: 'price_1RMJ31Ast4LlpL7pauoVPwpm', // Pro Monthly Price ID (Ensure these are correct and from ENV for production)
    priceIdYearly: 'price_1RMIBuAst4LlpL7pf1EFTmlk',   // Pro Yearly Price ID
    buyButtonIdMonthly: 'buy_btn_1RMiAYAst4LlpL7p3EmJcw7q', // Pro Monthly Buy Button ID
    buyButtonIdYearly: 'buy_btn_1RMiCHAst4LlpL7psqG9PSg1',  // Pro Yearly Buy Button ID
  },
  {
    name: 'Premium', // Matches SubscriptionTier 'premium'
    priceMonthlyDisplay: '$90', priceYearlyDisplay: '$960', periodMonthly: '/month', periodYearly: '/year',
    description: 'Complete access and premium features',
    features: [
      'All Pro features', 'Priority support', 'Basic company information', 'Public company profiles',
      'Advanced financial metrics', 'Resource estimates', 'Production data', 'Custom watchlists (coming)',
      'Real-time alerts (coming)', 'API access (coming)', 'Cost metrics', 'Valuation models',
    ],
    icon: Crown, color: 'accent-yellow', popular: false, tier: 'premium',
    priceIdMonthly: 'price_1RMJ3pAst4LlpL7pXTO1bVli',   // Premium Monthly Price ID
    priceIdYearly: 'price_1RMIDFAst4LlpL7p8UInqh9P',    // Premium Yearly Price ID
    buyButtonIdMonthly: 'buy_btn_1RMi24Ast4LlpL7p77zMG5SG', // Premium Monthly Buy Button ID
    buyButtonIdYearly: 'buy_btn_1RMiBSAst4LlpL7pAoueiu4V',  // Premium Yearly Buy Button ID
  },
];

export function SubscribePage() {
  const { session, user, isLoading: isAuthLoading } = useAuth();
  const { currentUserSubscriptionTier, isLoading: isSubscriptionLoading, refreshSubscriptionStatus } = useSubscription();
  const [isYearly, setIsYearly] = useState(false);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const navigate = useNavigate();
  const backgroundImageUrl = '/Background2.jpg'; // Ensure this image is in your public folder

  useEffect(() => {
    if (!isAuthLoading && session) {
      console.log("[SubscribePage] Session active, refreshing subscription status.");
      refreshSubscriptionStatus();
    }
  }, [session, isAuthLoading, refreshSubscriptionStatus]);

  const handlePaymentForLoggedInUser = async (plan: PlanDisplayData) => {
    if (!user || !session) {
      console.error("[SubscribePage] Attempted subscription by non-logged-in user through protected handler.");
      navigate('/auth?signup=true');
      return;
    }
    if (plan.tier === 'free') return;

    const priceIdToUse = isYearly ? plan.priceIdYearly : plan.priceIdMonthly;
    if (!priceIdToUse) {
      console.error(`[SubscribePage] Stripe Price ID is missing for ${plan.name} (${isYearly ? 'Yearly' : 'Monthly'}).`);
      alert("Sorry, this plan is currently unavailable. Please contact support.");
      return;
    }

    const processingKey = plan.name + (isYearly ? 'Yearly' : 'Monthly');
    setIsProcessing(processingKey);
    console.log(`[SubscribePage] User ${user.id} attempting to subscribe/upgrade to ${plan.tier} (${isYearly ? 'Yearly' : 'Monthly'}). Price ID: ${priceIdToUse}`);

    try {
      const { data, error: functionError } = await supabase.functions.invoke('stripe-checkout', {
        body: {
          price_id: priceIdToUse,
          success_url: `${FRONTEND_URL}/onboarding?session_id={CHECKOUT_SESSION_ID}&plan_name=${plan.name}`,
          cancel_url: `${FRONTEND_URL}/subscribe`,
          mode: 'subscription',
          // Metadata should be handled by your edge function based on the authenticated user
          // It's generally safer to not pass user_id from client if edge function can get it from session
        },
      });

      if (functionError) {
        console.error('[SubscribePage] Supabase Function Error:', functionError.message, functionError);
        throw new Error(`Checkout initialization failed: ${functionError.message}`);
      }

      if (data && data.url) {
        console.log("[SubscribePage] Received checkout URL, redirecting:", data.url);
        window.location.href = data.url;
      } else {
        console.error('[SubscribePage] Failed to get Stripe Checkout session URL. Response:', data);
        throw new Error('Could not retrieve a valid checkout session. Please try again.');
      }
    } catch (error: any) {
      console.error('[SubscribePage] Error during handlePaymentForLoggedInUser:', error.message, error);
      alert(`An error occurred: ${error.message}. Please try again or contact support.`);
      setIsProcessing(null);
    }
  };

  const isLoadingOverall = isAuthLoading || isSubscriptionLoading;

  return (
    <PageContainer
      title="Subscription Plans"
      description="Choose the plan that best fits your mining analytics needs."
      className="relative min-h-screen w-full overflow-hidden bg-gradient-to-b from-navy-400 via-navy-300 to-navy-400"
    >
      {/* Stripe Buy Button script */}
      <script async src="https://js.stripe.com/v3/buy-button.js"></script>

      {/* Loading Overlay */}
      {isLoadingOverall && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
          <Loader2 className="h-12 w-12 text-white animate-spin" />
          <span className="ml-4 text-white text-lg">Loading plans...</span>
        </div>
      )}

      <div className="absolute inset-0 bg-cover bg-center opacity-50 -z-10" style={{ backgroundImage: `url('${backgroundImageUrl}')` }} aria-hidden="true" />
      <div className="absolute inset-0 bg-noise opacity-30 -z-10" aria-hidden="true" />
      <div className="relative z-0 pt-8 pb-12">
        <div className="flex justify-center mb-6">
          <div className="flex items-center space-x-2 p-1 bg-navy-900/30 rounded-lg backdrop-blur-sm">
            <Label htmlFor="billing-cycle-switch" className="px-2 text-white">Monthly</Label>
            <Switch id="billing-cycle-switch" checked={isYearly} onCheckedChange={setIsYearly} disabled={isLoadingOverall || !!isProcessing} />
            <Label htmlFor="billing-cycle-switch" className="px-2 text-white">Yearly (Save up to 16%)</Label>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:gap-8 lg:grid-cols-3 max-w-5xl mx-auto">
          {plansData.map((plan) => {
            const Icon = plan.icon;
            const displayPrice = isYearly ? plan.priceYearlyDisplay : plan.priceMonthlyDisplay;
            const displayPeriod = isYearly ? plan.periodYearly : plan.periodMonthly;
            
            const uniqueProcessingKey = plan.name + (isYearly ? 'Yearly' : 'Monthly');
            const isButtonProcessing = isProcessing === uniqueProcessingKey;
            const isCurrentPlanActive = currentUserSubscriptionTier === plan.tier;

            let buttonText: string;
            let isButtonDisabled: boolean = isLoadingOverall || isButtonProcessing; // Base disabled state
            let actionHandler: (() => void) | null = null;
            let showStripeBuyButtonForGuest = false;

            if (plan.tier === 'free') {
              if (session) { // Logged in
                if (isCurrentPlanActive) {
                  buttonText = 'Current Plan';
                  isButtonDisabled = true;
                } else { // On Pro or Premium, cannot select Free
                  buttonText = 'N/A (On Paid Plan)';
                  isButtonDisabled = true;
                }
              } else { // Not logged in
                buttonText = 'Sign Up Free';
                actionHandler = () => { 
                 console.log("[SubscribePage] Guest navigating to signup for Free plan.");
                  navigate('/auth?signup=true&plan=Free');
                }
              }
            } else { // Paid plans ('pro', 'premium')
              if (session && user) { // Logged-in user
                if (isCurrentPlanActive) {
                  buttonText = 'Current Plan';
                  isButtonDisabled = true;
                } else if (currentUserSubscriptionTier === 'free' || 
                           (currentUserSubscriptionTier === 'pro' && plan.tier === 'premium')) {
                  // User is on Free (can upgrade to Pro or Premium)
                  // OR User is on Pro (can upgrade to Premium)
                  buttonText = currentUserSubscriptionTier === 'free' ? `Get ${plan.name}` : `Upgrade to ${plan.name}`;
                  actionHandler = () => handlePaymentForLoggedInUser(plan);
                  console.log(`[SubscribePage] Button state for ${plan.name}: Text='${buttonText}', Disabled=${isButtonDisabled}, CurrentTier=${currentUserSubscriptionTier}`);
                } else { 
                  // Handles cases like Premium user looking at Pro (downgrade), or other non-upgrade paths.
                  // For simplicity, these are often handled via a customer portal.
                  buttonText = 'Manage Subscription'; // Or "N/A" if no portal link yet
                  isButtonDisabled = true; 
                  // actionHandler = () => navigateToCustomerPortal(); // If you have one
                  console.log(`[SubscribePage] Button state for ${plan.name}: Text='${buttonText}', Disabled=${isButtonDisabled} (Manage/Downgrade), CurrentTier=${currentUserSubscriptionTier}`);
                }
              } else { // Guest user - will use Stripe Buy Button
                buttonText = `Choose ${plan.name}`; // This text won't show if buy button renders
                showStripeBuyButtonForGuest = true;
                console.log(`[SubscribePage] Button state for ${plan.name}: Guest user, showing Stripe Buy Button.`);
              }
            }
            
            if (isButtonProcessing) {
              buttonText = 'Processing...';
            }

            return (
              <div key={uniqueProcessingKey} className={cn('relative transform transition-all duration-300 hover:scale-[1.015] flex', plan.popular ? 'shadow-cyan-900/20 shadow-lg' : 'shadow-md shadow-navy-900/10')}>
                {plan.popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2 transform z-10"><span className="inline-flex items-center rounded-full bg-gradient-to-r from-teal-500 to-cyan-600 px-3 py-0.5 text-xs font-semibold text-white shadow-sm">Most Popular</span></div>}
                <div className={cn('relative flex flex-col h-full rounded-xl border p-6 w-full', plan.popular ? 'bg-navy-700/50 border-cyan-700/50' : 'bg-navy-800/60 border-navy-700/50', 'backdrop-blur-sm')}>
                  <div className="flex items-center gap-3 mb-4">
                    {Icon && <Icon className={cn('h-7 w-7', plan.color === 'accent-yellow' ? 'text-accent-yellow' : 'text-accent-teal')} />}
                    <h3 className={cn('text-lg font-semibold', plan.popular ? 'text-cyan-300' : 'text-white')}>{plan.name}</h3>
                  </div>
                  <div className="mt-2 flex items-baseline gap-x-1">
                    <span className="text-3xl font-bold tracking-tight text-white">{displayPrice}</span>
                    {displayPeriod && <span className="text-sm font-semibold leading-6 text-gray-400">{displayPeriod}</span>}
                  </div>
                  <p className="mt-4 text-sm leading-6 text-gray-300 flex-shrink-0">{plan.description}</p>
                  <ul role="list" className="mt-6 space-y-3 text-sm leading-6 text-gray-200 flex-grow">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex gap-x-3">
                        {feature.startsWith('All ') ? <span className="w-5 h-6"></span> : <Check className="h-6 w-5 flex-none text-teal-400" aria-hidden="true" />}
                        <span className={cn(feature.startsWith('All ') ? 'font-medium text-gray-400 -ml-5' : '')}>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-8">
                    {showStripeBuyButtonForGuest && STRIPE_PUBLISHABLE_KEY && (isYearly ? plan.buyButtonIdYearly : plan.buyButtonIdMonthly) ? (
                      <stripe-buy-button
                        buy-button-id={isYearly ? plan.buyButtonIdYearly : plan.buyButtonIdMonthly}
                        publishable-key={STRIPE_PUBLISHABLE_KEY}
                      >
                      </stripe-buy-button>
                    ) : (actionHandler || (plan.tier === 'free' && !session)) ? ( // Show custom button if there's an action or it's the free plan button for guests
                      <Button
                        onClick={actionHandler || undefined}
                        disabled={isButtonDisabled || isButtonProcessing}
                        size="lg"
                        variant={isCurrentPlanActive || (isButtonDisabled && plan.tier !== 'free' && !isButtonProcessing) ? 'secondary' : (plan.popular ? 'primary' : 'outline')}
                        className={cn(
                          'w-full font-semibold', 
                          (isButtonDisabled || isButtonProcessing) && 'opacity-60 cursor-not-allowed', 
                          plan.popular && !isCurrentPlanActive && !isButtonDisabled && !isButtonProcessing && 'bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white'
                        )}
                      >
                        {isButtonProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {buttonText}
                      </Button>
                    ) : ( // Catch-all for other states, typically disabled buttons for logged-in users where action is not available
                      <Button
                        disabled // This button is for states like "Current Plan" or "Manage Subscription"
                        size="lg"
                        variant="secondary"
                        className="w-full font-semibold opacity-60 cursor-not-allowed"
                      >
                        {isButtonProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {buttonText}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </PageContainer>
  );
}