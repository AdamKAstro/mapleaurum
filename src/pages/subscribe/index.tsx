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
const STRIPE_MODE_CLIENT = import.meta.env.VITE_STRIPE_MODE || 'live'; // Renamed to avoid conflict if STRIPE_MODE also used server-side
const STRIPE_PUBLISHABLE_KEY_TO_USE = STRIPE_MODE_CLIENT === 'test'
    ? import.meta.env.VITE_STRIPE_PUBLISHABLE_KEYT
    : import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

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

// This structure allows you to define different plans for test and live modes if needed
const plansData: PlanDisplayData[] = [
    {
        name: 'Free',
        priceMonthlyDisplay: '$0', priceYearlyDisplay: '$0', periodMonthly: '', periodYearly: '',
        description: 'Basic access to company data. All users start here.',
        features: ['Basic company information', 'Limited financial metrics', 'Public company profiles', 'Daily updates'],
        icon: null, color: 'gray', popular: false, tier: 'free',
        priceIdMonthly: '', priceIdYearly: '', buyButtonIdMonthly: '', buyButtonIdYearly: '',
    },
    ...(STRIPE_MODE_CLIENT === 'test'
        ? [ // Test Mode Plans
            {
                name: 'Premium Test', // Plan user was trying to subscribe to in logs
                priceMonthlyDisplay: '$90', priceYearlyDisplay: '$960', periodMonthly: '/month', periodYearly: '/year',
                description: 'Full-featured test plan for Premium access.',
                features: ['All Pro features (Test)', 'Priority support (Test)', 'Advanced financial metrics (Test)', 'Valuation models (Test)'],
                icon: Crown, color: 'accent-yellow', popular: true, tier: 'premium',
                priceIdMonthly: import.meta.env.VITE_STRIPE_PREMIUM_MONTHLY_PRICE_ID || 'price_1RKAGeAst4LlpL7pEjhS8E4F', // Price ID from user's log for Premium Test
                priceIdYearly: import.meta.env.VITE_STRIPE_PREMIUM_YEARLY_PRICE_ID_TEST || '', // Use specific test yearly price ID
                buyButtonIdMonthly: import.meta.env.VITE_STRIPE_PREMIUM_MONTHLY_BUY_BUTTON_ID_TEST || '',
                buyButtonIdYearly: import.meta.env.VITE_STRIPE_PREMIUM_YEARLY_BUY_BUTTON_ID_TEST || '',
            },
            // Add a Pro Test plan if needed for thorough testing
            {
                name: 'Pro Test',
                priceMonthlyDisplay: '$40', priceYearlyDisplay: '$420', periodMonthly: '/month', periodYearly: '/year',
                description: 'Test plan for Pro features',
                features: ['Financial metrics (Test)', 'Resource estimates (Test)', 'Production data (Test)'],
                icon: Star, color: 'accent-teal', popular: false, tier: 'pro',
                priceIdMonthly: import.meta.env.VITE_STRIPE_PRO_MONTHLY_PRICE_ID_TEST || 'YOUR_PRO_MONTHLY_TEST_PRICE_ID',
                priceIdYearly: import.meta.env.VITE_STRIPE_PRO_YEARLY_PRICE_ID_TEST || 'YOUR_PRO_YEARLY_TEST_PRICE_ID',
                buyButtonIdMonthly: import.meta.env.VITE_STRIPE_PRO_MONTHLY_BUY_BUTTON_ID_TEST || 'YOUR_PRO_MONTHLY_TEST_BUY_BUTTON_ID',
                buyButtonIdYearly: import.meta.env.VITE_STRIPE_PRO_YEARLY_BUY_BUTTON_ID_TEST || 'YOUR_PRO_YEARLY_TEST_BUY_BUTTON_ID',
            }
        ]
        : [ // Live Mode Plans
            {
                name: 'Pro',
                priceMonthlyDisplay: '$40', priceYearlyDisplay: '$420', periodMonthly: '/month', periodYearly: '/year',
                description: 'Advanced analytics and insights',
                features: ['Financial metrics', 'Resource estimates', 'Production data', 'Custom watchlists (coming)'],
                icon: Star, color: 'accent-teal', popular: true, tier: 'pro',
                priceIdMonthly: import.meta.env.VITE_STRIPE_PRO_MONTHLY_PRICE_ID,
                priceIdYearly: import.meta.env.VITE_STRIPE_PRO_YEARLY_PRICE_ID,
                buyButtonIdMonthly: import.meta.env.VITE_STRIPE_PRO_MONTHLY_BUY_BUTTON_ID,
                buyButtonIdYearly: import.meta.env.VITE_STRIPE_PRO_YEARLY_BUY_BUTTON_ID,
            },
            {
                name: 'Premium',
                priceMonthlyDisplay: '$90', priceYearlyDisplay: '$960', periodMonthly: '/month', periodYearly: '/year',
                description: 'Complete access and premium features',
                features: ['All Pro features', 'Priority support', /* ... other live premium features ... */ 'Valuation models'],
                icon: Crown, color: 'accent-yellow', popular: false, tier: 'premium',
                priceIdMonthly: import.meta.env.VITE_STRIPE_PREMIUM_MONTHLY_PRICE_ID,
                priceIdYearly: import.meta.env.VITE_STRIPE_PREMIUM_YEARLY_PRICE_ID,
                buyButtonIdMonthly: import.meta.env.VITE_STRIPE_PREMIUM_MONTHLY_BUY_BUTTON_ID,
                buyButtonIdYearly: import.meta.env.VITE_STRIPE_PREMIUM_YEARLY_BUY_BUTTON_ID,
            },
        ]),
];


export function SubscribePage() {
    const { session, user, isLoading: isAuthLoading } = useAuth();
    const { currentUserSubscriptionTier, isLoading: isSubscriptionLoading, refreshSubscriptionStatus } = useSubscription();
    const [isYearly, setIsYearly] = useState(false);
    const [isProcessing, setIsProcessing] = useState<string | null>(null);
    const [isRedirecting, setIsRedirecting] = useState(false);
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
            refreshSubscriptionStatus().catch((err) => {
                console.error('[SubscribePage] Failed to refresh subscription status:', err);
            });
        }
    }, [session, isAuthLoading, refreshSubscriptionStatus]);

    const handlePaymentForLoggedInUser = async (plan: PlanDisplayData) => {
        if (!user || !session) {
            console.log('[SubscribePage] User not logged in for paid plan. Redirecting to sign-up/login.');
            setIsRedirecting(true);
            // Consider adding `redirect_to` for better UX after login
            navigate('/login?action=signup&plan=' + plan.tier, { state: { from: { pathname: '/subscribe' } }, replace: true });
            return;
        }

        if (plan.tier === 'free') return;

        const priceIdToUse = isYearly ? plan.priceIdYearly : plan.priceIdMonthly;
        if (!priceIdToUse) {
            console.error(`[SubscribePage] Stripe Price ID missing for ${plan.name} (${isYearly ? 'Yearly' : 'Monthly'}).`);
            alert('Configuration error: This plan is currently unavailable. Please contact support.');
            return;
        }

        const processingKey = `${plan.name}-${isYearly ? 'Yearly' : 'Monthly'}`;
        setIsProcessing(processingKey);
        
        const checkoutBody = {
            price_id: priceIdToUse,
            success_url: `${FRONTEND_URL}/onboarding?session_id={CHECKOUT_SESSION_ID}&plan_name=${encodeURIComponent(plan.name)}&tier=${plan.tier}`,
            cancel_url: `${FRONTEND_URL}/subscribe`,
            mode: 'subscription' as 'subscription' | 'payment',
            plan_name: plan.name, // Explicitly pass plan name
            interval: isYearly ? 'year' : ('month' as 'month' | 'year'), // Explicitly pass interval
        };
        
        console.log(`[SubscribePage] Initiating checkout for user ${user.id}, plan ${plan.name} (${plan.tier}), price ID: ${priceIdToUse}. Body being sent:`, JSON.stringify(checkoutBody, null, 2));

        try {
            // **** CRITICAL FIX: Pass the object directly to 'body', do NOT JSON.stringify here ****
            // The supabase-js client library handles JSON stringification.
            const { data, error: functionError } = await supabase.functions.invoke('stripe-checkout', {
                body: checkoutBody, // Pass the object directly
                // Headers are usually set automatically by supabase-js for functions
                // including Content-Type: application/json and Authorization.
                // Explicitly setting them can sometimes cause issues if not done carefully.
                // If you need to override default headers, ensure it's correct.
                // For now, relying on supabase-js defaults for Authorization header.
            });

            console.log('[SubscribePage] Raw response from stripe-checkout invoke:', { data, functionError });

            if (functionError) {
                let displayError = 'Checkout initialization failed.';
                const errorContext = (functionError as any).context;
                if (errorContext?.error?.message) displayError += ` Server said: ${errorContext.error.message}`;
                else if (errorContext?.details) displayError += ` Server said: ${errorContext.details}`;
                else if (functionError.message) displayError += ` Message: ${functionError.message}`;
                displayError += ' Please try again or contact support at support@mapleaurum.com.';
                
                console.error('[SubscribePage] Supabase Function Error:', displayError, functionError);
                alert(displayError);
                setIsProcessing(null);
                return; 
            }

            if (data && data.url) {
                console.log('[SubscribePage] Redirecting to Stripe checkout URL:', data.url);
                window.location.href = data.url;
            } else {
                console.error('[SubscribePage] No valid checkout URL received. Response:', data);
                alert('Could not retrieve a valid checkout session. Please check console and try again or contact support.');
                setIsProcessing(null);
            }
        } catch (error: any) {
            console.error('[SubscribePage] Checkout error (outer catch):', error.message, error);
            alert(`Error: ${error.message}. Please try again or contact support at support@mapleaurum.com.`);
            setIsProcessing(null);
        }
        // setIsProcessing(null); // Removed from finally to avoid resetting during redirect
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
            const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
            if (sessionError || !sessionData.session) throw new Error(sessionError?.message || 'No active session for auth token.');
            const token = sessionData.session.access_token;

            const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ to: testEmail, subject: testSubject, message: testMessage }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || `Failed to send email: ${response.statusText}`);
            setEmailStatus('Test email sent successfully!');
            setTestEmail('');
        } catch (error: any) {
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
            {STRIPE_PUBLISHABLE_KEY_TO_USE && <script async src="https://js.stripe.com/v3/buy-button.js"></script>}
            {!STRIPE_PUBLISHABLE_KEY_TO_USE && 
                <div className="bg-red-600 text-white p-3 text-center text-sm font-medium fixed top-0 left-0 right-0 z-[100]">
                    Warning: Stripe Publishable Key for {STRIPE_MODE_CLIENT.toUpperCase()} mode is NOT configured. Payment buttons for guests will not work.
                </div>
            }

            {(isLoadingOverall || isRedirecting) && (
                <div className="fixed inset-0 bg-black/60 flex flex-col items-center justify-center z-[200] backdrop-blur-sm">
                    <Loader2 className="h-12 w-12 text-white animate-spin" />
                    <span className="mt-4 text-white text-lg">{isRedirecting ? 'Redirecting...' : 'Loading plans...'}</span>
                </div>
            )}

            <div className="absolute inset-0 bg-cover bg-center opacity-50 -z-10" style={{ backgroundImage: `url('${backgroundImageUrl}')` }} aria-hidden="true" />
            <div className="absolute inset-0 bg-noise opacity-30 -z-10" aria-hidden="true" />
            <div className="relative z-0 pt-8 pb-12">
                <div className="flex justify-center mb-6">
                    <div className="flex items-center space-x-2 p-1 bg-navy-900/30 rounded-lg backdrop-blur-sm">
                        <Label htmlFor="billing-cycle-switch" className="px-2 text-white">Monthly</Label>
                        <Switch id="billing-cycle-switch" checked={isYearly} onCheckedChange={setIsYearly} disabled={isLoadingOverall || !!isProcessing || isRedirecting} />
                        <Label htmlFor="billing-cycle-switch" className="px-2 text-white">Yearly (Save up to 16%)</Label>
                    </div>
                </div>

                {isAdmin && (
                    <div className="max-w-md mx-auto mb-8 p-6 bg-navy-700/60 border border-navy-600/50 rounded-lg backdrop-blur-sm">
                        <Typography variant="h3" className="text-xl font-bold text-cyan-300 mb-4">Admin: Send Test Email</Typography>
                        {emailStatus && <Typography variant="body" className={`mb-4 ${emailStatus.includes('Error') || emailStatus.includes('Unauthorized') ? 'text-red-400' : 'text-green-400'}`}>{emailStatus}</Typography>}
                        <form onSubmit={handleSendTestEmail} className="space-y-4">
                            <div>
                                <Label htmlFor="test-email" className="text-gray-300">Recipient Email</Label>
                                <Input id="test-email" type="email" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="e.g., recipient@example.com" required disabled={isEmailSending} className="bg-navy-600/80 border-navy-500 text-white" />
                            </div>
                            <div>
                                <Label htmlFor="test-subject" className="text-gray-300">Subject</Label>
                                <Input id="test-subject" type="text" value={testSubject} onChange={(e) => setTestSubject(e.target.value)} placeholder="Test Email Subject" required disabled={isEmailSending} className="bg-navy-600/80 border-navy-500 text-white" />
                            </div>
                            <div>
                                <Label htmlFor="test-message" className="text-gray-300">Message</Label>
                                <Input id="test-message" type="text" value={testMessage} onChange={(e) => setTestMessage(e.target.value)} placeholder="Test email body." required disabled={isEmailSending} className="bg-navy-600/80 border-navy-500 text-white" />
                            </div>
                            <Button type="submit" disabled={isEmailSending || isLoadingOverall} className="w-full bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700">
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
                        const uniqueProcessingKey = `${plan.name}-${isYearly ? 'Yearly' : 'Monthly'}`;
                        const isButtonProcessing = isProcessing === uniqueProcessingKey;
                        const actualUserTier = currentUserSubscriptionTier || 'free';
                        const isCurrentPlanActive = actualUserTier === plan.tier;

                        let buttonText: string;
                        let isButtonDisabled: boolean = isLoadingOverall || isButtonProcessing || isRedirecting;
                        let currentActionHandler: (() => void) | null = null;
                        let showStripeBuyButtonForGuest = false;

                        if (plan.tier === 'free') {
                            isButtonDisabled = true; 
                            buttonText = session ? (actualUserTier === 'free' ? 'Current Plan (Free)' : 'Free Access Included') : 'Sign Up for Free';
                            if(!session) currentActionHandler = () => navigate('/login?action=signup&plan=Free');
                        } else {
                            if (session && user) { // Logged-in user
                                if (isCurrentPlanActive) {
                                    buttonText = 'Current Plan'; isButtonDisabled = true;
                                } else if ( (actualUserTier === 'free') || (actualUserTier === 'pro' && plan.tier === 'premium') ) {
                                    buttonText = actualUserTier === 'free' ? `Get ${plan.name}` : `Upgrade to ${plan.name}`;
                                    if (!isButtonProcessing) isButtonDisabled = isLoadingOverall || isRedirecting;
                                    currentActionHandler = () => handlePaymentForLoggedInUser(plan);
                                } else { // e.g., User is Premium, looking at Pro plan
                                    buttonText = 'Manage Subscription'; isButtonDisabled = true; // Or link to customer portal
                                }
                            } else { // Guest looking at paid plans
                                buttonText = `Choose ${plan.name}`;
                                showStripeBuyButtonForGuest = true; // Enable Stripe Buy Button for guests
                                // For guests, the custom button should redirect to login/signup, then they can choose the plan.
                                currentActionHandler = () => {
                                    console.log('[SubscribePage] Guest trying to choose paid plan. Redirecting to login/signup.');
                                    setIsRedirecting(true);
                                    navigate(`/login?action=signup&plan=${plan.tier}&yearly=${isYearly}`, { state: { from: { pathname: '/subscribe' } }, replace: true });
                                };
                                if (!isButtonProcessing) isButtonDisabled = isLoadingOverall || isRedirecting;

                            }
                        }
                        if (isButtonProcessing) { buttonText = 'Processing...'; isButtonDisabled = true; }

                        const currentBuyButtonId = isYearly ? plan.buyButtonIdYearly : plan.buyButtonIdMonthly;
                        const canShowStripeBuyButton = showStripeBuyButtonForGuest && STRIPE_PUBLISHABLE_KEY_TO_USE && currentBuyButtonId;
                        
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
                                        {canShowStripeBuyButton ? (
                                            <stripe-buy-button
                                                buy-button-id={currentBuyButtonId}
                                                publishable-key={STRIPE_PUBLISHABLE_KEY_TO_USE!}
                                                client-reference-id={user ? user.id : undefined} // Optional: for guest to user linking post-purchase
                                                customer-email={user ? user.email : undefined} // Optional: prefill email for guests
                                            >
                                            </stripe-buy-button>
                                        ) : (
                                            <Button
                                                onClick={() => {
                                                    console.log(`[SubscribePage] Button clicked for: ${plan.name}. Logged in: ${!!user}. Handler exists: ${!!currentActionHandler}`);
                                                    currentActionHandler?.();
                                                }}
                                                disabled={isButtonDisabled}
                                                size="lg"
                                                variant={isCurrentPlanActive || (isButtonDisabled && !currentActionHandler && plan.tier !== 'free') ? 'secondary' : (plan.popular ? 'primary' : 'outline')}
                                                className={cn('w-full font-semibold', isButtonDisabled && 'opacity-60 cursor-not-allowed', plan.popular && !isCurrentPlanActive && !isButtonDisabled && 'bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white')}
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