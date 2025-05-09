//src/pages/subscribe/index.tsx
import React, { useState } from 'react';
import { Star, Crown, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Typography } from '../../components/ui/typography';
import { PageContainer } from '../../components/ui/page-container';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { useAuth } from '../../contexts/auth-context';
import { cn } from '../../lib/utils';
import { SubscriptionTier } from '../../lib/types';

interface PricingTier {
  name: string;
  price: string;
  description: string;
  is_popular: boolean;
  features: string[];
}

interface Plan {
  name: string;
  price: string;
  period?: string;
  description: string;
  features: string[];
  icon: React.ComponentType | null;
  color: string;
  popular: boolean;
  buttonText: string;
  buttonVariant: 'primary' | 'outline' | 'secondary';
  disabled: boolean;
  buyButtonIdMonthly?: string;
  buyButtonIdYearly?: string;
  tier: SubscriptionTier;
}

const pricingTiers: PricingTier[] = [
  {
    name: 'Free',
    price: '$0',
    description: 'Basic access to company data',
    is_popular: false,
    features: [
      'Basic company information',
      'Limited financial metrics',
      'Public company profiles',
      'Daily updates',
    ],
  },
  {
    name: 'Pro',
    price: '$40/month',
    description: 'Advanced analytics and insights',
    is_popular: true,
    features: [
      'Financial metrics',
      'Resource estimates',
      'Production data',
      'Custom watchlists (coming)',
    ],
  },
  {
    name: 'Premium',
    price: '$40/month',
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
  },
];

const splitPricePeriod = (priceString: string): [string, string | undefined] => {
  if (priceString.includes('/')) {
    const parts = priceString.split('/');
    return [parts[0], `/${parts[1]}`];
  }
  return [priceString, undefined];
};

const plans: Plan[] = [
  {
    name: pricingTiers[0].name,
    price: splitPricePeriod(pricingTiers[0].price)[0],
    period: splitPricePeriod(pricingTiers[0].price)[1],
    description: pricingTiers[0].description,
    features: pricingTiers[0].features,
    icon: null,
    color: 'gray',
    popular: pricingTiers[0].is_popular,
    buttonText: 'Current Plan',
    buttonVariant: 'outline',
    disabled: true,
    tier: 'free',
  },
  {
    name: pricingTiers[1].name,
    price: '$40',
    period: '/month',
    description: pricingTiers[1].description,
    features: pricingTiers[1].features,
    icon: Star,
    color: 'accent-teal',
    popular: pricingTiers[1].is_popular,
    buttonText: 'Start Pro Trial',
    buttonVariant: 'primary',
    disabled: false,
    buyButtonIdMonthly: 'buy_btn_1RMi8CAst4LlpL7phSTE6zb2',
    buyButtonIdYearly: 'buy_btn_1RMiCHAst4LlpL7psqG9PSg1',
    tier: 'pro',
  },
  {
    name: pricingTiers[2].name,
    price: '$40',
    period: '/month',
    description: pricingTiers[2].description,
    features: pricingTiers[2].features,
    icon: Crown,
    color: 'accent-yellow',
    popular: pricingTiers[2].is_popular,
    buttonText: 'Start Premium Trial',
    buttonVariant: 'primary',
    disabled: false,
    buyButtonIdMonthly: 'buy_btn_1RMiAYAst4LlpL7p3EmJcw7q',
    buyButtonIdYearly: 'buy_btn_1RMiBSAst4LlpL7pAoueiu4V',
    tier: 'premium',
  },
];

export function SubscribePage() {
  const { session, user, isLoading: isAuthLoading, currentUserTier } = useAuth();
  const [isYearly, setIsYearly] = useState(false);
  const navigate = useNavigate();
  const backgroundImageUrl = '/Background2.jpg';
  const stripePublishableKey = 'pk_live_51RJVXdAst4LlpL7p6PwW4fSy6xd4odAXMtaL59TcauHIIdRPgMPazyV3BYCMpJ0Bi5YUTNJuMA4aLK11gM9ZEOBz00rDGfp32u';

  const isButtonDisabled = (plan: Plan) => {
    if (isAuthLoading) return true;
    if (!currentUserTier) return plan.name === 'Free';
    if (currentUserTier === 'premium') return true;
    if (currentUserTier === 'pro') return plan.tier !== 'premium';
    return plan.tier === 'free' || plan.tier === currentUserTier;
  };

  const handleAuthRedirect = (planName: string, yearly: boolean) => {
    if (isAuthLoading) return;
    if (!session || !user) {
      const query = new URLSearchParams({
        signup: 'true',
        plan: planName,
        interval: yearly ? 'yearly' : 'monthly',
      }).toString();
      navigate(`/auth?${query}`);
    }
  };

  return (
    <PageContainer
      title="Subscription Plans"
      description="Choose the plan that best fits your mining analytics needs."
      className="relative min-h-screen w-full overflow-hidden bg-gradient-to-b from-navy-400 via-navy-300 to-navy-400"
    >
      <script async src="https://js.stripe.com/v3/buy-button.js"></script>
      <div
        className="absolute inset-0 bg-cover bg-center opacity-50 -z-10"
        style={{ backgroundImage: `url('${backgroundImageUrl}')` }}
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-noise opacity-30 -z-10" aria-hidden="true" />
      <div className="relative z-0 pt-8 pb-12">
        <div className="flex justify-center mb-6">
          <div className="flex items-center space-x-2">
            <Label>Monthly</Label>
            <Switch checked={isYearly} onCheckedChange={setIsYearly} />
            <Label>Yearly (Save 10%)</Label>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:gap-8 lg:grid-cols-3 max-w-5xl mx-auto">
          {plans.map((plan) => {
            const Icon = plan.icon;
            const price = isYearly
              ? plan.name === 'Pro'
                ? '$420'
                : plan.name === 'Premium'
                ? '$960'
                : plan.price
              : plan.price;
            const buyButtonId = isYearly ? plan.buyButtonIdYearly : plan.buyButtonIdMonthly;
            return (
              <div
                key={plan.name}
                className={cn(
                  'relative transform transition-all duration-300 hover:scale-[1.015] flex',
                  plan.popular ? 'shadow-cyan-900/20 shadow-lg' : 'shadow-md shadow-navy-900/10'
                )}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 transform z-10">
                    <span className="inline-flex items-center rounded-full bg-gradient-to-r from-teal-500 to-cyan-600 px-3 py-0.5 text-xs font-semibold text-white shadow-sm">
                      Most Popular
                    </span>
                  </div>
                )}
                <div
                  className={cn(
                    'relative flex flex-col h-full rounded-xl border p-6 w-full',
                    plan.popular ? 'bg-navy-700/50 border-cyan-700/50' : 'bg-navy-800/60 border-navy-700/50',
                    'backdrop-blur-sm'
                  )}
                >
                  <div className="flex items-center gap-3 mb-4">
                    {Icon && (
                      <Icon
                        className={cn(
                          'h-7 w-7',
                          plan.color === 'accent-yellow' ? 'text-accent-yellow' : 'text-accent-teal'
                        )}
                      />
                    )}
                    <h3 className={cn('text-lg font-semibold', plan.popular ? 'text-cyan-300' : 'text-white')}>
                      {plan.name}
                    </h3>
                  </div>
                  <div className="mt-2 flex items-baseline gap-x-1">
                    <span className="text-3xl font-bold tracking-tight text-white">{price}</span>
                    {plan.period && (
                      <span className="text-sm font-semibold leading-6 text-gray-400">
                        {isYearly ? '/year' : plan.period}
                      </span>
                    )}
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
                        <span className={cn(feature.startsWith('All ') ? 'font-medium text-gray-400 -ml-5' : '')}>
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {plan.name !== 'Free' && buyButtonId ? (
                    <div className="mt-8">
                      {!session && !isAuthLoading ? (
                        <Button
                          onClick={() => handleAuthRedirect(plan.name, isYearly)}
                          className="w-full mb-2 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white"
                        >
                          Sign Up to Subscribe
                        </Button>
                      ) : null}
                      <stripe-buy-button
                        buy-button-id={buyButtonId}
                        publishable-key={stripePublishableKey}
                        disabled={isButtonDisabled(plan)}
                      ></stripe-buy-button>
                    </div>
                  ) : (
                    <Button
                      disabled={isButtonDisabled(plan)}
                      size="lg"
                      variant={isButtonDisabled(plan) ? 'secondary' : 'outline'}
                      className={cn(
                        'mt-8 w-full font-semibold',
                        isButtonDisabled(plan) && 'opacity-60 cursor-not-allowed'
                      )}
                    >
                      {plan.buttonText}
                    </Button>
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