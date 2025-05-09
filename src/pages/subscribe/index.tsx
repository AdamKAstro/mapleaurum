// src/pages/subscribe/index.tsx
import React, { useState, useEffect } from 'react';
import { Star, Crown, Check } from 'lucide-react';
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
const STRIPE_PUBLISHABLE_KEY = 'pk_live_51RJVXdAst4LlpL7p6PwW4fSy6xd4odAXMtaL59TcauHIIdRPgMPazyV3BYCMpJ0Bi5YUTNJuMA4aLK11gM9ZEOBz00rDGfp32u';

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
  tier: SubscriptionTier;
  // For your stripe-checkout Edge Function (logged-in users)
  priceIdMonthly: string;
  priceIdYearly: string;
  // For <stripe-buy-button> (non-logged-in users)
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
    // Free plan doesn't have payment IDs
    priceIdMonthly: '', priceIdYearly: '', buyButtonIdMonthly: '', buyButtonIdYearly: '',
  },
  {
    name: 'Pro',
    priceMonthlyDisplay: '$40', priceYearlyDisplay: '$420', periodMonthly: '/month', periodYearly: '/year',
    description: 'Advanced analytics and insights',
    features: ['Financial metrics', 'Resource estimates', 'Production data', 'Custom watchlists (coming)'],
    icon: Star, color: 'accent-teal', popular: true, tier: 'pro',
    priceIdMonthly: 'price_1RMJ31Ast4LlpL7pauoVPwpm',    // Pro Monthly Price ID
    priceIdYearly: 'price_1RMIBuAst4LlpL7pf1EFTmlk',     // Pro Yearly Price ID
    buyButtonIdMonthly: 'buy_btn_1RMiAYAst4LlpL7p3EmJcw7q', // Pro Monthly Buy Button ID
    buyButtonIdYearly: 'buy_btn_1RMiCHAst4LlpL7psqG9PSg1',  // Pro Yearly Buy Button ID
  },
  {
    name: 'Premium',
    priceMonthlyDisplay: '$90', priceYearlyDisplay: '$960', periodMonthly: '/month', periodYearly: '/year',
    description: 'Complete access and premium features',
    features: [
      'All Pro features', 'Priority support', 'Basic company information', 'Public company profiles',
      'Advanced financial metrics', 'Resource estimates', 'Production data', 'Custom watchlists (coming)',
      'Real-time alerts (coming)', 'API access (coming)', 'Cost metrics', 'Valuation models',
    ],
    icon: Crown, color: 'accent-yellow', popular: false, tier: 'premium',
    priceIdMonthly: 'price_1RMJ3pAst4LlpL7pXTO1bVli',    // Premium Monthly Price ID
    priceIdYearly: 'price_1RMIDFAst4LlpL7p8UInqh9P',     // Premium Yearly Price ID
    buyButtonIdMonthly: 'buy_btn_1RMi24Ast4LlpL7p77zMG5SG', // Premium Monthly Buy Button ID
    buyButtonIdYearly: 'buy_btn_1RMiBSAst4LlpL7pAoueiu4V',   // Premium Yearly Buy Button ID
  },
];

export function SubscribePage() {
  const { session, user, isLoading: isAuthLoading } = useAuth();
  const { currentUserSubscriptionTier, isLoading: isSubscriptionLoading, refreshSubscriptionStatus } = useSubscription();
  const [isYearly, setIsYearly] = useState(false);
  const [isProcessing, setIsProcessing] = useState<string | null>(null); // Tracks which plan button is clicked
  const navigate = useNavigate();
  const backgroundImageUrl = '/Background2.jpg';

  useEffect(() => {
    // Refresh subscription status when auth state changes or component mounts with a session
    if (!isAuthLoading && session) {
      console.log("[SubscribePage] Session active, refreshing subscription status.");
      refreshSubscriptionStatus();
    }
  }, [session, isAuthLoading, refreshSubscriptionStatus]);

  const handlePaymentForLoggedInUser = async (plan: PlanDisplayData) => {
    if (!user || !session) {
      console.error("Attempted subscription by non-logged-in user through protected handler.");
      navigate('/auth?signup=true'); // Should not happen if UI is correct
      return;
    }
    if (plan.tier === 'free') return; // Free plan doesn't use this

    const priceIdToUse = isYearly ? plan.priceIdYearly : plan.priceIdMonthly;
    if (!priceIdToUse) {
      console.error(`Stripe Price ID is missing for ${plan.name} (${isYearly ? 'Yearly' : 'Monthly'}).`);
      alert("Sorry, this plan is currently unavailable. Please contact support."); // User-facing error
      return;
    }

    setIsProcessing(plan.name + (isYearly ? 'Yearly' : 'Monthly'));
    console.log(`[SubscribePage] Calling 'stripe-checkout' for user ${user.id}, priceId: ${priceIdToUse}`);

    try {
      // IMPORTANT: Ensure your 'stripe-checkout' Edge Function is configured to receive these parameters
      // and adds `supabaseUserId` to the Stripe Session metadata.
      const { data, error: functionError } = await supabase.functions.invoke('stripe-checkout', {
        body: {
          price_id: priceIdToUse,
          success_url: `${FRONTEND_URL}/onboarding?session_id={CHECKOUT_SESSION_ID}`, // Stripe appends the ID
          cancel_url: `${FRONTEND_URL}/subscribe`,
          mode: 'subscription', // Or 'payment' if it's a one-time purchase
          // Pass customer_email if your function uses it and user is logged in,
          // Stripe will often use the authenticated Supabase user's email if linked via customer ID.
          // customer_email: user.email, 
          // metadata: { // Your 'stripe-checkout' function MUST handle this metadata
          //   supabaseUserId: user.id, 
          //   planName: plan.name,
          //   interval: isYearly ? 'year' : 'month'
          // }
        },
      });

      if (functionError) {
        console.error('[SubscribePage] Supabase Function Error:', functionError.message);
        throw new Error(`Checkout initialization failed: ${functionError.message}`);
      }

      if (data && data.url) {
        console.log("[SubscribePage] Received checkout URL, redirecting:", data.url);
        window.location.href = data.url; // Redirect to Stripe Checkout
      } else {
        console.error('[SubscribePage] Failed to get Stripe Checkout session URL from function. Response:', data);
        throw new Error('Could not retrieve a valid checkout session. Please try again.');
      }
    } catch (error: any) {
      console.error('[SubscribePage] Error during handlePaymentForLoggedInUser:', error.message);
      alert(`An error occurred: ${error.message}. Please try again or contact support.`); // User-facing error
      setIsProcessing(null);
    }
    // No finally setIsProcessing(null) here, as successful redirect means page unloads
  };

  const isLoadingOverall = isAuthLoading || isSubscriptionLoading;

  return (
    <PageContainer
      title="Subscription Plans"
      description="Choose the plan that best fits your mining analytics needs."
      className="relative min-h-screen w-full overflow-hidden bg-gradient-to-b from-navy-400 via-navy-300 to-navy-400"
    >
      <script async src="https://js.stripe.com/v3/buy-button.js"></script>
      <div className="absolute inset-0 bg-cover bg-center opacity-50 -z-10" style={{ backgroundImage: `url('${backgroundImageUrl}')` }} aria-hidden="true" />
      <div className="absolute inset-0 bg-noise opacity-30 -z-10" aria-hidden="true" />
      <div className="relative z-0 pt-8 pb-12">
        <div className="flex justify-center mb-6">
          <div className="flex items-center space-x-2 p-1 bg-navy-900/30 rounded-lg backdrop-blur-sm">
            <Label htmlFor="billing-cycle-switch" className="px-2 text-white">Monthly</Label>
            <Switch id="billing-cycle-switch" checked={isYearly} onCheckedChange={setIsYearly} disabled={isLoadingOverall} />
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

            let buttonText: string;
            let isButtonDisabled: boolean = isLoadingOverall || isButtonProcessing;
            let actionHandler: (() => void) | null = null;
            let showStripeBuyButtonForGuest = false;

            if (plan.tier === 'free') {
              if (session && currentUserSubscriptionTier === 'free') {
                buttonText = 'Current Plan';
                isButtonDisabled = true;
              } else if (session && currentUserSubscriptionTier !== 'free') {
                buttonText = 'N/A'; // Cannot select Free if on a paid plan
                isButtonDisabled = true;
              } else { // Not logged in
                buttonText = 'Sign Up Free';
                actionHandler = () => navigate('/auth?signup=true&plan=Free');
              }
            } else { // Paid plans
              if (session && user) { // Logged-in user
                if (currentUserSubscriptionTier === plan.tier) {
                  buttonText = 'Current Plan';
                  isButtonDisabled = true;
                } else if (currentUserSubscriptionTier === 'free') {
                  buttonText = `Get ${plan.name}`;
                  actionHandler = () => handlePaymentForLoggedInUser(plan);
                } else if (currentUserSubscriptionTier === 'pro' && plan.tier === 'premium') {
                  buttonText = `Upgrade to Premium`;
                  actionHandler = () => handlePaymentForLoggedInUser(plan);
                } else { // e.g. Premium user looking at Pro (downgrade) or Pro looking at Pro (already handled)
                  buttonText = 'Manage Subscription'; // Or 'N/A' - Downgrades often via portal
                  isButtonDisabled = true; // Simplification: No direct downgrade buttons
                }
              } else { // Guest user - will use Stripe Buy Button
                buttonText = `Choose ${plan.name}`; // Placeholder, Stripe button shows its own text
                showStripeBuyButtonForGuest = true;
                // No actionHandler for guest, Stripe Buy Button handles it.
              }
            }
             if (isButtonProcessing) buttonText = 'Processing...';


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
                    ) : (actionHandler || plan.tier === 'free') ? ( // Show custom button if there's an action or it's the free plan button for guests
                      <Button
                        onClick={actionHandler || undefined} // Only add onClick if actionHandler exists
                        disabled={isButtonDisabled}
                        size="lg"
                        variant={isCurrentPlan || (isButtonDisabled && plan.tier !=='free') ? 'secondary' : (plan.popular ? 'primary' : 'outline')}
                        className={cn('w-full font-semibold', (isButtonDisabled || isButtonProcessing) && 'opacity-60 cursor-not-allowed', plan.popular && !isCurrentPlan && !isButtonDisabled && 'bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white')}
                      >
                        {buttonText}
                      </Button>
                    ): ( // Case for logged-in user, plan is not current, no direct upgrade path (e.g. premium looking at pro)
                         <Button
                            disabled
                            size="lg"
                            variant="secondary"
                            className="w-full font-semibold opacity-60 cursor-not-allowed"
                        >
                            {currentUserSubscriptionTier === plan.tier ? 'Current Plan' : 'N/A'}
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