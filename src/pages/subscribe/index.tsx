//src/pages/subscribe/index.tsx

import React, { useState, useMemo, useEffect } from 'react';
import { Check, Crown, Star, Loader2, AlertCircle, Lock } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Typography } from '../../components/ui/typography';
import { PageContainer } from '../../components/ui/page-container';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import { Switch } from '../../components/ui/switch';
import { Label } from '../../components/ui/label';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/auth-context';
import { useSubscription } from '../../contexts/subscription-context';
import { useLocation } from 'react-router-dom';
import { createCheckoutSession } from '../../lib/stripe';
import { SubscriptionTier } from '../lib/types';

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
  icon: React.ElementType | null;
  color?: string;
}

const PRO_MONTHLY_PRICE_ID = 'price_1RMJ31Ast4LlpL7pauoVPwpm';
const PRO_YEARLY_PRICE_ID = 'price_1RMIBuAst4LlpL7pf1EFTmlk';
const PREMIUM_MONTHLY_PRICE_ID = 'price_1RMJ3pAst4LlpL7pXTO1bVli';
const PREMIUM_YEARLY_PRICE_ID = 'price_1RMIDFAst4LlpL7p8UInqh9P';

const calculateSavings = (monthlyPrice: number, yearlyPrice: number): number | undefined => {
  if (!monthlyPrice || !yearlyPrice || monthlyPrice <= 0 || yearlyPrice <= 0) return undefined;
  const totalMonthlyCost = monthlyPrice * 12;
  if (totalMonthlyCost <= yearlyPrice) return undefined;
  const savings = ((totalMonthlyCost - yearlyPrice) / totalMonthlyCost) * 100;
  return Math.round(savings);
};

const yearlyProSavings = calculateSavings(40, 420);
const yearlyPremiumSavings = calculateSavings(90, 960);

const plansData: PlanDetail[] = [
  {
    name: 'Free',
    description: 'Basic access to company data',
    is_popular: false,
    features: ['Basic company information', 'Limited financial metrics', 'Public company profiles', 'Daily updates'],
    monthly: { priceId: '', priceString: '$0', priceSuffix: '' },
    yearly: null,
    icon: null,
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
      'Advanced financial metrics',
      'Resource estimates',
      'Production data',
      'Custom watchlists (coming)',
      'Real-time alerts (coming)',
      'API access (coming)',
    ],
    monthly: { priceId: PREMIUM_MONTHLY_PRICE_ID, priceString: '$90', priceSuffix: '/month' },
    yearly: { priceId: PREMIUM_YEARLY_PRICE_ID, priceString: '$960', priceSuffix: '/year', savePercent: yearlyPremiumSavings },
    icon: Crown,
    color: 'accent-yellow',
  },
];

const planNameToTier: Record<string, SubscriptionTier> = {
  Free: 'free',
  Pro: 'medium',
  Premium: 'premium',
};

const tierLevel: Record<SubscriptionTier, number> = {
  free: 0,
  medium: 1,
  premium: 2,
};

export function SubscribePage() {
  const { session, user, isLoading: isAuthLoading } = useAuth();
  const { getEffectiveTier, isLoading: isSubLoading } = useSubscription();
  const location = useLocation();
  const [loadingPriceId, setLoadingPriceId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly');
  const [isAutoCheckoutTriggered, setIsAutoCheckoutTriggered] = useState(false);

  const currentUserTier = useMemo(() => {
    if (isSubLoading || isAuthLoading) {
      console.log('[SubscribePage] Tier undefined due to loading:', { isSubLoading, isAuthLoading });
      return undefined;
    }
    const tier = getEffectiveTier();
    console.log('[SubscribePage] Current tier:', tier);
    return tier;
  }, [getEffectiveTier, isSubLoading, isAuthLoading]);

  useEffect(() => {
    console.log('[SubscribePage] State:', {
      loadingPriceId,
      error,
      billingInterval,
      isAutoCheckoutTriggered,
      session: !!session,
      user: !!user,
      isAuthLoading,
      currentUserTier,
    });
  }, [loadingPriceId, error, billingInterval, isAutoCheckoutTriggered, session, user, isAuthLoading, currentUserTier]);

  useEffect(() => {
    if (isAutoCheckoutTriggered || isAuthLoading || isSubLoading || !session || !user) {
      console.log('[SubscribePage] Auto-checkout skipped:', {
        isAutoCheckoutTriggered,
        isAuthLoading,
        isSubLoading,
        session: !!session,
        user: !!user,
      });
      return;
    }

    const searchParams = new URLSearchParams(location.search);
    const planName = searchParams.get('plan');
    const interval = searchParams.get('interval') as 'monthly' | 'yearly' | null;

    if (!planName || !plansData.some((plan) => plan.name === planName)) {
      console.log('[SubscribePage] No valid plan in query params:', planName);
      return;
    }

    const targetInterval = interval === 'yearly' ? 'yearly' : 'monthly';
    const plan = plansData.find((p) => p.name === planName);
    if (!plan) {
      console.error('[SubscribePage] Plan not found:', planName);
      setError('Selected plan is not available.');
      return;
    }

    const intervalDetails = targetInterval === 'yearly' && plan.yearly ? plan.yearly : plan.monthly;
    const priceId = intervalDetails?.priceId;

    if (!priceId) {
      console.error('[SubscribePage] No priceId for plan:', planName, targetInterval);
      setError('Selected plan configuration is not available.');
      return;
    }

    if (currentUserTier && planNameToTier[planName] === currentUserTier) {
      console.log('[SubscribePage] Plan is current tier:', planName, currentUserTier);
      return;
    }

    setBillingInterval(targetInterval);
    console.log('[SubscribePage] Initiating auto-checkout:', { planName, targetInterval, priceId });
    handleSubscribe(priceId, planName);
    setIsAutoCheckoutTriggered(true);
  }, [session, user, isAuthLoading, isSubLoading, location, currentUserTier, isAutoCheckoutTriggered]);

  const handleSubscribe = async (priceId: string | null, planName: string) => {
    if (!priceId) {
      console.warn('[SubscribePage] handleSubscribe called with null priceId for plan:', planName);
      setError('Invalid plan configuration.');
      return;
    }
    if (isAuthLoading) {
      console.warn('[SubscribePage] Auth loading, cannot subscribe:', planName);
      setError('Authentication is still loading, please wait.');
      return;
    }
    if (!session || !user) {
      console.warn('[SubscribePage] No session/user, redirecting to auth for plan:', planName);
      window.location.href = `/auth?signup=true&plan=${planName}&interval=${billingInterval}`;
      return;
    }
    setError(null);
    setLoadingPriceId(priceId);
    try {
      console.log('[SubscribePage] Creating checkout session for priceId:', priceId);
      const successUrl = `${window.location.origin}/onboarding?session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${window.location.origin}/subscribe`;
      const checkoutUrl = await createCheckoutSession(priceId, 'subscription', successUrl, cancelUrl);
      console.log('[SubscribePage] Redirecting to checkout URL:', checkoutUrl);
      window.location.href = checkoutUrl;
    } catch (err: any) {
      console.error('[SubscribePage] handleSubscribe error:', err);
      const displayError = err.message.includes('not authenticated')
        ? 'Please log in to subscribe.'
        : err.message.includes('Invalid price ID')
        ? 'Invalid subscription plan. Please contact support.'
        : 'Failed to initiate subscription. Please try again.';
      setError(displayError);
      setLoadingPriceId(null);
    }
  };

  return (
    <PageContainer
      title="Subscription Plans"
      description="Choose the plan that best fits your mining analytics needs."
      className="relative min-h-screen w-full overflow-hidden bg-gradient-to-b from-navy-400 via-navy-300 to-navy-400"
    >
      <div
        className="absolute inset-0 bg-cover bg-center opacity-50 -z-10"
        style={{ backgroundImage: `url('/Background2.jpg')` }}
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-noise opacity-30 -z-10" aria-hidden="true" />

      <div className="relative z-0 pt-8 pb-12">
        <div className="text-center mb-10">
          <Typography variant="h2" className="text-surface-white text-3xl font-bold tracking-tight">
            Choose Your Plan
          </Typography>
          <Typography variant="body" className="mt-3 max-w-2xl mx-auto text-surface-white/70 text-base">
            Unlock powerful analytics for Canadian miners with MapleAurum.
          </Typography>
        </div>

        <div className="flex items-center justify-center space-x-4 mb-10 text-sm font-medium text-surface-white/80">
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
                (Save up to {Math.max(yearlyProSavings || 0, yearlyPremiumSavings || 0)}%)
              </span>
            )}
          </Label>
        </div>

        {error && (
          <div className="max-w-5xl mx-auto mb-8 px-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Subscription Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 max-w-5xl mx-auto px-4">
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

            const isDisabled = isFree || isCurrentPlan || isPlanLoading || isAuthLoading || isSubLoading || loadingPriceId !== null;

            return (
              <div
                key={plan.name + billingInterval}
                className={cn(
                  'relative transform transition-all duration-300 hover:scale-[1.015]',
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
                    'flex flex-col h-full rounded-xl border p-6 backdrop-blur-sm',
                    plan.is_popular ? 'bg-navy-700/50 border-cyan-700/50' : 'bg-navy-800/60 border-navy-700/50'
                  )}
                >
                  <div className="flex items-center gap-3 mb-4">
                    {Icon ? (
                      <Icon className={cn('h-7 w-7', plan.color === 'accent-yellow' ? 'text-accent-yellow' : 'text-accent-teal')} />
                    ) : null}
                    <Typography variant="h3" className="text-lg font-semibold text-white">
                      {plan.name}
                    </Typography>
                  </div>
                  <div className="mt-2 flex items-baseline gap-x-1">
                    <span className="text-3xl font-bold text-white">{currentPrice}</span>
                    {currentSuffix && <span className="text-sm font-semibold text-gray-400">{currentSuffix}</span>}
                  </div>
                  <Typography variant="body" className="mt-4 text-sm text-gray-300">
                    {plan.description}
                  </Typography>
                  <ul role="list" className="mt-6 space-y-3 text-sm text-gray-200 flex-grow">
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
                  <Button
                    disabled={isDisabled}
                    size="lg"
                    variant={isCurrentPlan || isFree ? 'secondary' : plan.is_popular ? 'primary' : 'outline'}
                    onClick={() => handleSubscribe(currentPriceId, plan.name)}
                    className={cn(
                      'mt-8 w-full font-semibold flex items-center justify-center',
                      isCurrentPlan && 'bg-gray-600/50 border-gray-500 text-gray-300 cursor-default',
                      !isCurrentPlan && !isFree && plan.is_popular && 'bg-gradient-to-r from-teal-500 to-cyan-600 text-white',
                      !isCurrentPlan && !isFree && !plan.is_popular && 'border-cyan-700/50 text-cyan-300',
                      isDisabled && !isPlanLoading && 'opacity-60 cursor-not-allowed',
                      isPlanLoading && 'opacity-75 cursor-wait'
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
                      Sign up or log in to subscribe
                    </Typography>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </PageContainer>
  );
}