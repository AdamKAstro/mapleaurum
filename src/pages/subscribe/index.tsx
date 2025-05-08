// src/pages/subscribe/index.tsx
import React, { useState, useMemo, useEffect } from 'react';
import { Check, Crown, Star, Loader2, AlertCircle, Lock } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Typography } from '../../components/ui/typography';
import { cn } from '../../lib/utils';
import { PageContainer } from '../../components/ui/page-container';
import { useAuth } from '../../contexts/auth-context';
import { useSubscription } from '../../contexts/subscription-context';
import type { SubscriptionTier } from '../../lib/types';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { createCheckoutSession } from '../../lib/stripe';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import { Switch } from '../../components/ui/switch';
import { Label } from '../../components/ui/label';

// --- Define Actual Stripe Price IDs ---
const PRO_MONTHLY_PRICE_ID = 'price_1RMJ31Ast4LlpL7pauoVPwpm';
const PRO_YEARLY_PRICE_ID = 'price_1RMIBuAst4LlpL7pf1EFTmlk';
const PREMIUM_MONTHLY_PRICE_ID = 'price_1RMJ3pAst4LlpL7pXTO1bVli';
const PREMIUM_YEARLY_PRICE_ID = 'price_1RMIDFAst4LlpL7p8UInqh9P';

// --- Define Plan Data Structures ---
interface PlanIntervalDetail {
  priceId: string;
  priceString: string;
  priceSuffix: string;
  savePercent?: number;
}

interface PlanDetail {
  name: string;
  description: string;
  is_popular: boolean;
  features: string[];
  monthly: PlanIntervalDetail | null;
  yearly: PlanIntervalDetail | null;
  icon?: React.ElementType;
  color?: string;
}

// Map plan names to SubscriptionTier type for comparison
const planNameToTier: Record<string, SubscriptionTier> = {
  Free: 'free',
  Pro: 'medium',
  Premium: 'premium',
};

// Map SubscriptionTier to a numeric level for easier comparison
const tierLevel: Record<SubscriptionTier, number> = {
  free: 0,
  medium: 1,
  premium: 2,
};

// Helper function to calculate approximate yearly savings
const calculateSavings = (monthlyPrice: number, yearlyPrice: number): number | undefined => {
  if (!monthlyPrice || !yearlyPrice || monthlyPrice <= 0 || yearlyPrice <= 0) return undefined;
  const totalMonthlyCost = monthlyPrice * 12;
  if (totalMonthlyCost <= yearlyPrice) return undefined;
  const savings = ((totalMonthlyCost - yearlyPrice) / totalMonthlyCost) * 100;
  return Math.round(savings);
};

const yearlyProSavings = calculateSavings(40, 420);
const yearlyPremiumSavings = calculateSavings(90, 960);

// Define the plan data using the interfaces and price IDs
const plansData: PlanDetail[] = [
  {
    name: 'Free',
    description: 'Basic access to company data',
    is_popular: false,
    features: ['Basic company information', 'Limited financial metrics', 'Public company profiles', 'Daily updates'],
    monthly: { priceId: '', priceString: '$0', priceSuffix: '' },
    yearly: null,
    icon: undefined,
    color: 'gray',
  },
  {
    name: 'Pro',
    description: 'Advanced analytics and insights',
    is_popular: true,
    features: ['Financial metrics', 'Resource estimates', 'Production data', 'Custom watchlists (coming)'],
    monthly: { priceId: PRO_MONTHLY_PRICE_ID, priceString: '$40', priceSuffix: '/month' },
    yearly: { priceId: PRO_YEARLY_PRICE_ID, priceString: '$420', priceSuffix: '/year', savePercent: yearlyProSavings },
    icon: Star,
    color: 'accent-teal',
  },
  {
    name: 'Premium',
    description: 'Complete access and premium features',
    is_popular: false,
    features: [
      'All Pro features',
      'Priority support',
      'Basic company information',
      'Public company profiles',
      'Advanced financial metrics',
      'Resource estimates',
      'Production data',
      'Custom watchlists (coming)',
      'Real-time alerts (coming)',
      'API access (coming)',
      'Cost metrics',
      'Valuation models',
    ],
    monthly: { priceId: PREMIUM_MONTHLY_PRICE_ID, priceString: '$90', priceSuffix: '/month' },
    yearly: { priceId: PREMIUM_YEARLY_PRICE_ID, priceString: '$960', priceSuffix: '/year', savePercent: yearlyPremiumSavings },
    icon: Crown,
    color: 'accent-yellow',
  },
];

// --- Subscribe Page Component ---
export function SubscribePage() {
  const backgroundImageUrl = '/Background2.jpg';
  const auth = useAuth();
  const { session, user, isLoading: isAuthLoading } = auth;
  const { getEffectiveTier, isLoading: isSubLoading } = useSubscription();
  const navigate = useNavigate();
  const location = useLocation();
  const [loadingPriceId, setLoadingPriceId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly');
  const [isAutoCheckoutTriggered, setIsAutoCheckoutTriggered] = useState(false);
  const [isAutoCheckoutLoading, setIsAutoCheckoutLoading] = useState(false);

  // Log auth state changes for debugging
  useEffect(() => {
    console.log(`[SubscribePage Effect] Auth State Update: session=${!!session}, user=${!!user}, isAuthLoading=${isAuthLoading}`);
  }, [session, user, isAuthLoading]);

  // Determine the user's current tier, considering loading states
  const currentUserTier = useMemo(() => {
    if (isSubLoading || isAuthLoading) {
      console.log(`[SubscribePage currentUserTier] Undefined because: isSubLoading=${isSubLoading}, isAuthLoading=${isAuthLoading}`);
      return undefined;
    }
    const tier = getEffectiveTier();
    console.log(`[SubscribePage currentUserTier] Determined tier: ${tier}`);
    return tier;
  }, [getEffectiveTier, isSubLoading, isAuthLoading]);

  // Handle redirect from auth with plan and interval
  useEffect(() => {
    if (isAutoCheckoutTriggered || isAuthLoading || isSubLoading || !session || !user) {
      return;
    }

    const searchParams = new URLSearchParams(location.search);
    const planName = searchParams.get('plan');
    const interval = searchParams.get('interval') as 'monthly' | 'yearly' | null;
    const fromState = (location.state as { from?: string })?.from;
    let statePlan: string | null = null;
    let stateInterval: 'monthly' | 'yearly' | null = null;
    if (fromState) {
      const stateParams = new URLSearchParams(fromState.split('?')[1] || '');
      statePlan = stateParams.get('plan');
      stateInterval = stateParams.get('interval') as 'monthly' | 'yearly' | null;
    }

    const targetPlan = planName || statePlan;
    const targetInterval = interval || stateInterval || 'monthly';

    if (!targetPlan || !plansData.some((plan) => plan.name === targetPlan)) {
      console.log('[SubscribePage AutoCheckout] No valid plan specified in query params or state.');
      return;
    }

    if (targetInterval !== 'monthly' && targetInterval !== 'yearly') {
      console.log('[SubscribePage AutoCheckout] Invalid interval specified, defaulting to monthly.');
      setError('Invalid billing interval specified.');
      return;
    }

    const plan = plansData.find((p) => p.name === targetPlan);
    if (!plan) {
      console.error('[SubscribePage AutoCheckout] Plan not found:', targetPlan);
      setError('Selected plan is not available.');
      return;
    }

    const intervalDetails = targetInterval === 'yearly' && plan.yearly ? plan.yearly : plan.monthly;
    const priceId = intervalDetails?.priceId;

    if (!priceId) {
      console.error('[SubscribePage AutoCheckout] No priceId for plan:', targetPlan, targetInterval);
      setError('Selected plan configuration is not available.');
      return;
    }

    if (currentUserTier && planNameToTier[targetPlan] === currentUserTier) {
      console.log(`[SubscribePage AutoCheckout] Plan ${targetPlan} is already the current tier: ${currentUserTier}`);
      return;
    }

    setBillingInterval(targetInterval);
    setIsAutoCheckoutLoading(true);

    console.log(`[SubscribePage AutoCheckout] Initiating checkout for plan: ${targetPlan}, interval: ${targetInterval}, priceId: ${priceId}`);
    handleSubscribe(priceId, targetPlan);

    setIsAutoCheckoutTriggered(true);
    setIsAutoCheckoutLoading(false);
    navigate('/subscribe', { replace: true });
  }, [session, user, isAuthLoading, isSubLoading, location, navigate, currentUserTier]);

  // Function to handle clicks on "Get Plan" / "Upgrade" / "Switch" buttons
  const handleSubscribe = async (priceId: string | null, planName: string) => {
    if (!priceId) {
      console.warn('[SubscribePage handleSubscribe] Called with null priceId.');
      return;
    }
    setError(null);
    setLoadingPriceId(priceId);

    try {
      const successUrl = `${window.location.origin}/onboarding?session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${window.location.origin}/subscribe`;

      console.log(`[SubscribePage handleSubscribe] Calling createCheckoutSession with priceId: ${priceId}`);
      const checkoutUrl = await createCheckoutSession(priceId, 'subscription', successUrl, cancelUrl);
      console.log(`[SubscribePage handleSubscribe] createCheckoutSession returned URL: ${checkoutUrl}`);

      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      } else {
        throw new Error('Could not retrieve checkout session URL.');
      }
    } catch (err: any) {
      console.error('[SubscribePage handleSubscribe] Subscription Error:', err);
      let displayError = 'Failed to initiate subscription. Please try again.';
      if (err.message) {
        if (
          err.message.toLowerCase().includes('edge function') ||
          err.message.toLowerCase().includes('failed to fetch') ||
          err.message.toLowerCase().includes('non-2xx status code')
        ) {
          displayError = `Failed to connect to the subscription service. Please contact support. (Details: ${err.message})`;
        } else {
          displayError = err.message;
        }
      }
      setError(displayError);
      setLoadingPriceId(null);
      setIsAutoCheckoutLoading(false);
    }
  };

  return (
    <PageContainer
      title="Subscription Plans"
      description="Choose the plan that best fits your mining analytics needs."
      className="relative min-h-screen w-full overflow-hidden bg-gradient-to-b from-navy-400 via-navy-300 to-navy-400"
    >
      {/* Backgrounds */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-50 -z-10"
        style={{ backgroundImage: `url('${backgroundImageUrl}')` }}
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-noise opacity-30 -z-10" aria-hidden="true" />

      <div className="relative z-0 pt-8 pb-12">
        {/* Page Header */}
        <div className="text-center mb-10 md:mb-12">
          <Typography variant="h2" className="text-surface-white text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
            Choose Your Plan
          </Typography>
          <Typography variant="body" className="mt-3 max-w-2xl mx-auto text-surface-white/70 text-sm sm:text-base">
            Unlock powerful analytics for Canadian miners with MapleAurum.
          </Typography>
        </div>

        {/* Auto-Checkout Loading State */}
        {isAutoCheckoutLoading && (
          <div className="text-center py-4 max-w-5xl mx-auto mb-8 px-4">
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-teal-400" />
            <Typography variant="body" className="mt-2 text-surface-white">
              Redirecting to checkout...
            </Typography>
          </div>
        )}

        {/* Monthly/Yearly Toggle */}
        <div className="flex items-center justify-center space-x-4 mb-10 md:mb-12 text-sm font-medium text-surface-white/80">
          <Label htmlFor="billing-toggle" className={cn('cursor-pointer', billingInterval === 'monthly' && 'text-surface-white font-semibold')}>
            Monthly
          </Label>
          <Switch
            id="billing-toggle"
            checked={billingInterval === 'yearly'}
            onCheckedChange={(checked) => setBillingInterval(checked ? 'yearly' : 'monthly')}
            aria-label="Toggle billing interval"
          />
          <Label htmlFor="billing-toggle" className={cn('cursor-pointer', billingInterval === 'yearly' && 'text-surface-white font-semibold')}>
            Yearly
            {(yearlyProSavings || yearlyPremiumSavings) && (
              <span className="ml-2 text-xs text-accent-teal">
                (Save up to {Math.max(yearlyProSavings ?? 0, yearlyPremiumSavings ?? 0)}%)
              </span>
            )}
          </Label>
        </div>

        {/* Global Error Alert */}
        {error && (
          <div className="max-w-5xl mx-auto mb-8 px-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Subscription Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        )}

        {/* Plan Cards Grid */}
        <div className="grid grid-cols-1 gap-6 sm:gap-8 lg:grid-cols-3 max-w-5xl mx-auto px-4">
          {plansData.map((plan) => {
            const Icon = plan.icon;
            const intervalDetails = billingInterval === 'yearly' && plan.yearly ? plan.yearly : plan.monthly;
            const planTier = planNameToTier[plan.name] ?? 'free';
            const isCurrentPlan = currentUserTier !== undefined && planTier === currentUserTier;
            const isUpgrade = currentUserTier !== undefined && tierLevel[planTier] > tierLevel[currentUserTier];
            const isDowngrade = currentUserTier !== undefined && tierLevel[planTier] < tierLevel[currentUserTier];
            const isFree = plan.name === 'Free';

            const currentPrice = isFree ? '$0' : intervalDetails?.priceString ?? '';
            const currentSuffix = isFree ? '' : intervalDetails?.priceSuffix ?? '';
            const currentPriceId = isFree ? null : intervalDetails?.priceId ?? null;
            const isPlanLoading = loadingPriceId === currentPriceId;

            let buttonText: string;
            if (isFree) {
              buttonText = 'Free Plan';
            } else if (isCurrentPlan) {
              buttonText = 'Current Plan';
            } else if (!session || !user) {
              buttonText = `Get ${plan.name}${billingInterval === 'yearly' ? ' Yearly' : ' Monthly'}`;
            } else if (isUpgrade) {
              buttonText = `Upgrade to ${plan.name}`;
            } else if (isDowngrade) {
              buttonText = `Switch to ${plan.name}`;
            } else {
              buttonText = `Get ${plan.name}${billingInterval === 'yearly' ? ' Yearly' : ' Monthly'}`;
            }

            const isDisabled = isFree || isCurrentPlan || isPlanLoading || isAuthLoading || isSubLoading;

            return (
              <div
                key={plan.name + billingInterval}
                className={cn(
                  'relative transform transition-all duration-300 hover:scale-[1.015] flex',
                  plan.is_popular ? 'shadow-cyan-900/20 shadow-lg' : 'shadow-md shadow-navy-900/10'
                )}
              >
                {plan.is_popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 transform z-10">
                    <span className="inline-flex items-center rounded-full bg-gradient-to-r from-teal-500 to-cyan-600 px-3 py-0.5 text-xs font-semibold text-white shadow-sm">
                      Most Popular
                    </span>
                  </div>
                )}
                {billingInterval === 'yearly' && intervalDetails?.savePercent && (
                  <div
                    className={cn(
                      'absolute z-10 px-2.5 py-0.5 rounded-full text-xs font-semibold text-white',
                      plan.is_popular ? '-top-7 right-2' : '-top-3 right-2',
                      'bg-gradient-to-r from-emerald-500 to-green-600'
                    )}
                  >
                    Save {intervalDetails.savePercent}%
                  </div>
                )}

                <div
                  className={cn(
                    'relative flex flex-col h-full rounded-xl border p-6 w-full pt-8',
                    plan.is_popular ? 'bg-navy-700/50 border-cyan-700/50' : 'bg-navy-800/60 border-navy-700/50',
                    'backdrop-blur-sm'
                  )}
                >
                  <div className="flex items-center gap-3 mb-4">
                    {Icon && <Icon className={cn('h-7 w-7', plan.color === 'accent-yellow' ? 'text-accent-yellow' : 'text-accent-teal')} />}
                    <h3 className={cn('text-lg font-semibold', plan.is_popular ? 'text-cyan-300' : 'text-white')}>{plan.name}</h3>
                  </div>
                  <div className="mt-2 flex items-baseline gap-x-1">
                    <span className="text-3xl font-bold tracking-tight text-white">{currentPrice}</span>
                    {currentSuffix && <span className="text-sm font-semibold leading-6 text-gray-400">{currentSuffix}</span>}
                  </div>
                  <p className="mt-4 text-sm leading-6 text-gray-300">{plan.description}</p>
                  <ul role="list" className="mt-6 space-y-3 text-sm leading-6 text-gray-200 flex-grow">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex gap-x-3">
                        {feature.startsWith('All ') ? (
                          <span className="w-5 h-6"></span>
                        ) : (
                          <Check className="h-6 w-5 flex-none text-teal-400" aria-hidden="true" />
                        )}
                        <span className={cn(feature.startsWith('All ') ? 'font-medium text-gray-400 -ml-5' : '')}>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-8">
                    <Button
                      disabled={isDisabled}
                      size="lg"
                      variant={isCurrentPlan || isFree ? 'secondary' : plan.is_popular ? 'primary' : 'outline'}
                      onClick={() => {
                        const clickSession = auth.session;
                        const clickUser = auth.user;
                        const clickAuthLoading = auth.isLoading;
                        console.log(
                          `[SubscribePage Button onClick] Auth State: session=${!!clickSession}, user=${!!clickUser}, isAuthLoading=${clickAuthLoading}`
                        );

                        if (clickAuthLoading) {
                          setError('Authentication status is still loading, please wait.');
                        } else if (!clickSession || !clickUser) {
                          console.log('[SubscribePage Button onClick] No session/user. Redirecting to auth.');
                          // Combine path and query parameters in the 'to' string
                          navigate(`/auth?signup=true&plan=${plan.name}&interval=${billingInterval}`, {
                            state: { from: `/subscribe?plan=${plan.name}&interval=${billingInterval}` },
                          });
                        } else if (currentPriceId) {
                          handleSubscribe(currentPriceId, plan.name);
                        } else if (!isFree) {
                          console.error(`[SubscribePage Button onClick] Missing priceId for non-free plan: ${plan.name}`);
                          setError(`Configuration error for ${plan.name} plan.`);
                        }
                      }}
                      className={cn(
                        'w-full font-semibold flex items-center justify-center',
                        isCurrentPlan && 'bg-gray-600/50 border-gray-500 text-gray-300 cursor-default',
                        !isCurrentPlan && !isFree && plan.is_popular && 'bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white',
                        !isCurrentPlan && !isFree && !plan.is_popular && 'border-cyan-700/50 text-cyan-300 hover:bg-cyan-900/20 hover:border-cyan-600',
                        isDisabled && !isPlanLoading && 'opacity-60 cursor-not-allowed',
                        isPlanLoading && 'opacity-75 cursor-wait',
                        isFree && 'opacity-60 cursor-not-allowed'
                      )}
                      aria-label={buttonText}
                    >
                      {isPlanLoading ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          {!session && !user && !isFree && <Lock className="h-4 w-4 mr-2" />}
                          {buttonText}
                        </>
                      )}
                    </Button>
                    {!session && !user && !isFree && (
                      <Typography variant="caption" className="mt-2 text-center text-gray-400 text-xs">
                        <Link
                          to={`/auth?signup=true&plan=${plan.name}&interval=${billingInterval}`}
                          state={{ from: `/subscribe?plan=${plan.name}&interval=${billingInterval}` }}
                          className="text-cyan-400 hover:underline"
                        >
                          Sign up
                        </Link>{' '}
                        or{' '}
                        <Link
                          to={`/auth?plan=${plan.name}&interval=${billingInterval}`}
                          state={{ from: `/subscribe?plan=${plan.name}&interval=${billingInterval}` }}
                          className="text-cyan-400 hover:underline"
                        >
                          log in
                        </Link>{' '}
                        to subscribe
                      </Typography>
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