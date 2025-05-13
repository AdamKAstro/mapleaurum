// src/pages/subscribe/index.tsx
import React, { useState, useEffect, FormEvent } from 'react';
import { Star, Crown, Check, Loader2, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Typography } from '../../components/ui/typography';
import { PageContainer } from '../../components/ui/page-container';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { Input } from '../../components/ui/input';
import { useAuth } from '../../contexts/auth-context';
import { useSubscription } from '../../contexts/subscription-context';
import { cn } from '../../lib/utils';
import { SubscriptionTier } from '../../lib/types';
import { supabase } from '../../lib/supabaseClient';

const FRONTEND_URL = import.meta.env.VITE_FRONTEND_URL || 'http://localhost:3000';
const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

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
  priceIdMonthly: string;
  priceIdYearly: string;
  buyButtonIdMonthly: string;
  buyButtonIdYearly: string;
}

const plansData: PlanDisplayData[] = [
  {
    name: 'Free',
    priceMonthlyDisplay: '$0',
    priceYearlyDisplay: '$0',
    periodMonthly: '',
    periodYearly: '',
    description: 'Basic access to company data. All users start here.',
    features: ['Basic company information', 'Limited financial metrics', 'Public company profiles', 'Daily updates'],
    icon: null,
    color: 'gray',
    popular: false,
    tier: 'free',
    priceIdMonthly: '',
    priceIdYearly: '',
    buyButtonIdMonthly: '',
    buyButtonIdYearly: '',
  },
  {
    name: 'Pro',
    priceMonthlyDisplay: '$40',
    priceYearlyDisplay: '$420',
    periodMonthly: '/month',
    periodYearly: '/year',
    description: 'Advanced analytics and insights',
    features: ['Financial metrics', 'Resource estimates', 'Production data', 'Custom watchlists (coming)'],
    icon: Star,
    color: 'accent-teal',
    popular: true,
    tier: 'pro',
    priceIdMonthly: import.meta.env.VITE_STRIPE_PRO_MONTHLY_PRICE_ID || 'price_1RMJ31Ast4LlpL7pauoVPwpm',
    priceIdYearly: import.meta.env.VITE_STRIPE_PRO_YEARLY_PRICE_ID || 'price_1RMIBuAst4LlpL7pf1EFTmlk',
    buyButtonIdMonthly: import.meta.env.VITE_STRIPE_PRO_MONTHLY_BUY_BUTTON_ID || 'buy_btn_1RMiAYAst4LlpL7p3EmJcw7q',
    buyButtonIdYearly: import.meta.env.VITE_STRIPE_PRO_YEARLY_BUY_BUTTON_ID || 'buy_btn_1RMiCHAst4LlpL7psqG9PSg1',
  },
  {
    name: 'Premium',
    priceMonthlyDisplay: '$90',
    priceYearlyDisplay: '$960',
    periodMonthly: '/month',
    periodYearly: '/year',
    description: 'Complete access and premium features',
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
    icon: Crown,
    color: 'accent-yellow',
    popular: false,
    tier: 'premium',
    priceIdMonthly: import.meta.env.VITE_STRIPE_PREMIUM_MONTHLY_PRICE_ID || 'price_1RMJ3pAst4LlpL7pXTO1bVli',
    priceIdYearly: import.meta.env.VITE_STRIPE_PREMIUM_YEARLY_PRICE_ID || 'price_1RMIDFAst4LlpL7p8UInqh9P',
    buyButtonIdMonthly: import.meta.env.VITE_STRIPE_PREMIUM_MONTHLY_BUY_BUTTON_ID || 'buy_btn_1RMi24Ast4LlpL7p77zMG5SG',
    buyButtonIdYearly: import.meta.env.VITE_STRIPE_PREMIUM_YEARLY_BUY_BUTTON_ID || 'buy_btn_1RMiBSAst4LlpL7pAoueiu4V',
  },
];

export function SubscribePage() {
  const { session, user, isLoading: isAuthLoading } = useAuth();
  const { currentUserSubscriptionTier, isLoading: isSubscriptionLoading, refreshSubscriptionStatus } = useSubscription();
  const [isYearly, setIsYearly] = useState(false);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [testEmail, setTestEmail] = useState('');
  const [testSubject, setTestSubject] = useState('Test Email from MapleAurum');
  const [testMessage, setTestMessage] = useState('This is a test email sent from the MapleAurum Subscribe page.');
  const [emailStatus, setEmailStatus] = useState<string | null>(null);
  const [isEmailSending, setIsEmailSending] = useState(false);
  const navigate = useNavigate();
  const backgroundImageUrl = '/Background2.jpg';

  const isAdmin = user?.email === 'adamkiil@outlook.com' || user?.email === 'adamkiil79@gmail.com';

  useEffect(() => {
    if (!isAuthLoading && session) {
      console.log('[SubscribePage] Session active, refreshing subscription status.');
      refreshSubscriptionStatus();
    }
  }, [session, isAuthLoading, refreshSubscriptionStatus]);

  const handlePaymentForLoggedInUser = async (plan: PlanDisplayData) => {
    if (!user || !session) {
      console.error('[SubscribePage] Attempted subscription by non-logged-in user.');
      navigate('/auth?signup=true');
      return;
    }
    if (plan.tier === 'free') {
      console.log('[SubscribePage] Free plan selected, no action needed.');
      return;
    }

    const priceIdToUse = isYearly ? plan.priceIdYearly : plan.priceIdMonthly;
    if (!priceIdToUse) {
      console.error(`[SubscribePage] Stripe Price ID missing for ${plan.name} (${isYearly ? 'Yearly' : 'Monthly'}).`);
      alert('Sorry, this plan is currently unavailable. Please contact support.');
      return;
    }

    const processingKey = plan.name + (isYearly ? 'Yearly' : 'Monthly');
    setIsProcessing(processingKey);
    console.log(`[SubscribePage] User ${user.id} subscribing to ${plan.tier} (${isYearly ? 'Yearly' : 'Monthly'}). Price ID: ${priceIdToUse}`);

    try {
      const { data, error: functionError } = await supabase.functions.invoke('stripe-checkout', {
        body: {
          price_id: priceIdToUse,
          success_url: `${FRONTEND_URL}/onboarding?session_id={CHECKOUT_SESSION_ID}&plan_name=${plan.name}`,
          cancel_url: `${FRONTEND_URL}/subscribe`,
          mode: 'subscription',
        },
      });

      if (functionError) {
        console.error('[SubscribePage] Supabase Function Error:', functionError.message, functionError);
        throw new Error(`Checkout initialization failed: ${functionError.message}`);
      }

      if (data && data.url) {
        console.log('[SubscribePage] Redirecting to checkout URL:', data.url);
        window.location.href = data.url;
      } else {
        console.error('[SubscribePage] No valid checkout URL. Response:', data);
        throw new Error('Could not retrieve a valid checkout session. Please try again.');
      }
    } catch (error: any) {
      console.error('[SubscribePage] Error in handlePaymentForLoggedInUser:', error.message, error);
      alert(`Error: ${error.message}. Please try again or contact support.`);
    } finally {
      setIsProcessing(null);
    }
  };

  const handleSendTestEmail = async (e: FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      setEmailStatus('Unauthorized: Admin access required.');
      return;
    }
    if (!testEmail) {
      setEmailStatus('Please enter a recipient email.');
      return;
    }

    setIsEmailSending(true);
    setEmailStatus(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        throw new Error('No authentication token available');
      }

      console.log('[SubscribePage] Sending email with token:', token);
      const response = await fetch('https://dvagrllvivewyxolrhsh.supabase.co/functions/v1/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          to: testEmail,
          subject: testSubject,
          message: testMessage,
        }),
      });

      console.log('[SubscribePage] Fetch response:', response);
      if (!response.ok) {
        const errorData = await response.json();
        console.error('[SubscribePage] Fetch error response:', errorData);
        throw new Error(errorData.error || `Failed to send email: ${response.statusText}`);
      }

      const result = await response.json();
      setEmailStatus('Test email sent successfully!');
      setTestEmail('');
      setTestSubject('Test Email from MapleAurum');
      setTestMessage('This is a test email sent from the MapleAurum Subscribe page.');
    } catch (error: any) {
      console.error('[SubscribePage] Error sending test email:', error.message);
      setEmailStatus(`Error: ${error.message}`);
    } finally {
      setIsEmailSending(false);
    }
  };

  const isLoadingOverall = isAuthLoading || isSubscriptionLoading;

  return (
    <PageContainer
      title="Subscription Plans"
      description="Choose the plan that best fits your mining analytics needs."
      className="relative min-h-screen w-full overflow-hidden bg-gradient-to-b from-navy-400 via-navy-300 to-navy-400"
    >
      <script async src="https://js.stripe.com/v3/buy-button.js"></script>

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

        {isAdmin && (
          <div className="max-w-md mx-auto mb-8 p-6 bg-navy-700/60 border border-navy-600/50 rounded-lg backdrop-blur-sm">
            <Typography variant="h3" className="text-xl font-bold text-cyan-300 mb-4">
              Admin: Send Test Email
            </Typography>
            {emailStatus && (
              <Typography
                variant="body"
                className={`mb-4 ${emailStatus.includes('Error') || emailStatus.includes('Unauthorized') ? 'text-red-500' : 'text-green-500'}`}
              >
                {emailStatus}
              </Typography>
            )}
            <form onSubmit={handleSendTestEmail} className="space-y-4">
              <div>
                <Label htmlFor="test-email" className="text-gray-300">Recipient Email</Label>
                <Input
                  id="test-email"
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="e.g., sendgridtesting@gmail.com"
                  required
                  disabled={isEmailSending}
                  className="bg-navy-600/80 border-navy-500 text-white"
                />
              </div>
              <div>
                <Label htmlFor="test-subject" className="text-gray-300">Subject</Label>
                <Input
                  id="test-subject"
                  type="text"
                  value={testSubject}
                  onChange={(e) => setTestSubject(e.target.value)}
                  placeholder="Test Email from MapleAurum"
                  required
                  disabled={isEmailSending}
                  className="bg-navy-600/80 border-navy-500 text-white"
                />
              </div>
              <div>
                <Label htmlFor="test-message" className="text-gray-300">Message</Label>
                <Input
                  id="test-message"
                  type="text"
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  placeholder="This is a test email."
                  required
                  disabled={isEmailSending}
                  className="bg-navy-600/80 border-navy-500 text-white"
                />
              </div>
              <Button
                type="submit"
                disabled={isEmailSending}
                className="w-full bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700"
              >
                {isEmailSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                {isEmailSending ? 'Sending...' : 'Send Test Email'}
              </Button>
            </form>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 sm:gap-8 lg:grid-cols-3 max-w-5xl mx-auto">
          {plansData.map((plan) => {
            const Icon = plan.icon;
            const displayPrice = isYearly ? plan.priceYearlyDisplay : plan.priceMonthlyDisplay;
            const displayPeriod = isYearly ? plan.periodYearly : plan.periodMonthly;
            const uniqueProcessingKey = plan.name + (isYearly ? 'Yearly' : 'Monthly');
            const isButtonProcessing = isProcessing === uniqueProcessingKey;
            const actualUserTier = currentUserSubscriptionTier || 'free';
            const isCurrentPlanActive = actualUserTier === plan.tier;

            let buttonText: string;
            let isButtonDisabled: boolean = isLoadingOverall || isButtonProcessing;
            let actionHandler: (() => void) | null = null;
            let showStripeBuyButtonForGuest = false;
            let isStaticButton = false;

            if (plan.tier === 'free') {
              isStaticButton = true;
              isButtonDisabled = true;
              actionHandler = null;
              if (session) {
                buttonText = actualUserTier === 'free' ? 'Current Plan' : 'N/A (Access Included)';
              } else {
                buttonText = 'Free Access';
              }
            } else {
              if (session && user) {
                if (isCurrentPlanActive) {
                  buttonText = 'Current Plan';
                  isButtonDisabled = true;
                } else if (actualUserTier === 'free' || (actualUserTier === 'pro' && plan.tier === 'premium')) {
                  buttonText = actualUserTier === 'free' ? `Get ${plan.name}` : `Upgrade to ${plan.name}`;
                  if (!isButtonProcessing) isButtonDisabled = isLoadingOverall;
                  actionHandler = () => handlePaymentForLoggedInUser(plan);
                } else {
                  buttonText = 'Manage Subscription';
                  isButtonDisabled = true;
                }
              } else {
                buttonText = `Choose ${plan.name}`;
                showStripeBuyButtonForGuest = true;
                isButtonDisabled = isLoadingOverall || !!isProcessing;
              }
            }

            if (isButtonProcessing && !isStaticButton) {
              buttonText = 'Processing...';
              isButtonDisabled = true;
            }

            return (
              <div
                key={uniqueProcessingKey}
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
                        className={cn('h-7 w-7', plan.color === 'accent-yellow' ? 'text-accent-yellow' : 'text-accent-teal')}
                      />
                    )}
                    <h3 className={cn('text-lg font-semibold', plan.popular ? 'text-cyan-300' : 'text-white')}>
                      {plan.name}
                    </h3>
                  </div>
                  <div className="mt-2 flex items-baseline gap-x-1">
                    <span className="text-3xl font-bold tracking-tight text-white">{displayPrice}</span>
                    {displayPeriod && (
                      <span className="text-sm font-semibold leading-6 text-gray-400">{displayPeriod}</span>
                    )}
                  </div>
                  <p className="mt-4 text-sm leading-6 text-gray-300 flex-shrink-0">{plan.description}</p>
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
                  <div className="mt-8">
                    {showStripeBuyButtonForGuest && STRIPE_PUBLISHABLE_KEY && (isYearly ? plan.buyButtonIdYearly : plan.buyButtonIdMonthly) ? (
                      <stripe-buy-button
                        buy-button-id={isYearly ? plan.buyButtonIdYearly : plan.buyButtonIdMonthly}
                        publishable-key={STRIPE_PUBLISHABLE_KEY}
                      />
                    ) : (
                      <Button
                        onClick={isStaticButton ? undefined : actionHandler || undefined}
                        disabled={isButtonDisabled}
                        size="lg"
                        variant={
                          isCurrentPlanActive || isStaticButton || (isButtonDisabled && !isButtonProcessing)
                            ? 'secondary'
                            : plan.popular
                            ? 'primary'
                            : 'outline'
                        }
                        className={cn(
                          'w-full font-semibold',
                          (isButtonDisabled || isStaticButton) && 'opacity-60 cursor-not-allowed',
                          plan.popular &&
                            !isCurrentPlanActive &&
                            !isButtonDisabled &&
                            !isStaticButton &&
                            'bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white'
                        )}
                        style={isStaticButton ? { pointerEvents: 'none' } : {}}
                      >
                        {isButtonProcessing && !isStaticButton && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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