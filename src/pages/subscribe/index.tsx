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
// Client-side STRIPE_MODE to decide which set of keys/plans to show
const STRIPE_MODE_CLIENT = import.meta.env.VITE_STRIPE_MODE?.toLowerCase() || 'live'; 

const STRIPE_PUBLISHABLE_KEY_TO_USE = STRIPE_MODE_CLIENT === 'test'
    ? import.meta.env.VITE_STRIPE_PUBLISHABLE_KEYT // Your TEST Stripe Publishable Key
    : import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;  // Your LIVE Stripe Publishable Key

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

// ** IMPORTANT **
// Ensure Price IDs used below are for RECURRING prices in your Stripe Dashboard
// for the corresponding mode (TEST or LIVE).
// Using a 'one_time' Price ID for a 'subscription' mode checkout will fail.
// Replace 'YOUR_...' placeholders with your actual Stripe IDs.
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
        ? [ // ------------- TEST MODE PLANS -------------
            {
                name: 'Pro Test',
                priceMonthlyDisplay: '$40', priceYearlyDisplay: '$420', periodMonthly: '/month', periodYearly: '/year',
                description: 'Test plan for Pro features. Uses TEST recurring price.',
                features: ['Financial metrics (Test)', 'Resource estimates (Test)', 'Production data (Test)'],
                icon: Star, color: 'accent-teal', popular: false, tier: 'pro',
                priceIdMonthly: import.meta.env.VITE_STRIPE_PRO_MONTHLY_PRICE_ID_TEST || 'REPLACE_WITH_YOUR_TEST_PRO_MONTHLY_RECURRING_PRICE_ID',
                priceIdYearly: import.meta.env.VITE_STRIPE_PRO_YEARLY_PRICE_ID_TEST || 'REPLACE_WITH_YOUR_TEST_PRO_YEARLY_RECURRING_PRICE_ID',
                buyButtonIdMonthly: import.meta.env.VITE_STRIPE_PRO_MONTHLY_BUY_BUTTON_ID_TEST || '', // Optional: Your TEST Pro Monthly Buy Button ID
                buyButtonIdYearly: import.meta.env.VITE_STRIPE_PRO_YEARLY_BUY_BUTTON_ID_TEST || '',   // Optional: Your TEST Pro Yearly Buy Button ID
            },
            {
                name: 'Premium Test', 
                priceMonthlyDisplay: '$90', priceYearlyDisplay: '$960', periodMonthly: '/month', periodYearly: '/year',
                description: 'Full-featured test plan for Premium access. Uses TEST recurring price.',
                features: ['All Pro features (Test)', 'Priority support (Test)', 'Advanced financial metrics (Test)', 'Valuation models (Test)'],
                icon: Crown, color: 'accent-yellow', popular: true, tier: 'premium',
                priceIdMonthly: import.meta.env.VITE_STRIPE_PREMIUM_MONTHLY_PRICE_ID_TEST || 'price_1ROT6GAst4LlpL7pRASKFwYA', // This was mentioned as a new test ID, ensure it's RECURRING
                priceIdYearly: import.meta.env.VITE_STRIPE_PREMIUM_YEARLY_PRICE_ID_TEST || 'REPLACE_WITH_YOUR_TEST_PREMIUM_YEARLY_RECURRING_PRICE_ID', 
                buyButtonIdMonthly: import.meta.env.VITE_STRIPE_PREMIUM_MONTHLY_BUY_BUTTON_ID_TEST || '', 
                buyButtonIdYearly: import.meta.env.VITE_STRIPE_PREMIUM_YEARLY_BUY_BUTTON_ID_TEST || '',   
            }
        ]
        : [ // ------------- LIVE MODE PLANS -------------
            {
                name: 'Pro',
                priceMonthlyDisplay: '$40', priceYearlyDisplay: '$420', periodMonthly: '/month', periodYearly: '/year',
                description: 'Advanced analytics and insights',
                features: ['Financial metrics', 'Resource estimates', 'Production data', 'Custom watchlists (coming)'],
                icon: Star, color: 'accent-teal', popular: true, tier: 'pro',
                priceIdMonthly: import.meta.env.VITE_STRIPE_PRO_MONTHLY_PRICE_ID!,
                priceIdYearly: import.meta.env.VITE_STRIPE_PRO_YEARLY_PRICE_ID!,
                buyButtonIdMonthly: import.meta.env.VITE_STRIPE_PRO_MONTHLY_BUY_BUTTON_ID!,
                buyButtonIdYearly: import.meta.env.VITE_STRIPE_PRO_YEARLY_BUY_BUTTON_ID!,
            },
            {
                name: 'Premium',
                priceMonthlyDisplay: '$90', priceYearlyDisplay: '$960', periodMonthly: '/month', periodYearly: '/year',
                description: 'Complete access and premium features',
                features: ['All Pro features', 'Priority support', 'Advanced financial metrics', 'Valuation models', /* ... other live premium features ... */],
                icon: Crown, color: 'accent-yellow', popular: false, tier: 'premium',
                priceIdMonthly: import.meta.env.VITE_STRIPE_PREMIUM_MONTHLY_PRICE_ID!,
                priceIdYearly: import.meta.env.VITE_STRIPE_PREMIUM_YEARLY_PRICE_ID!,
                buyButtonIdMonthly: import.meta.env.VITE_STRIPE_PREMIUM_MONTHLY_BUY_BUTTON_ID!,
                buyButtonIdYearly: import.meta.env.VITE_STRIPE_PREMIUM_YEARLY_BUY_BUTTON_ID!,
            },
        ]),
];

export function SubscribePage() {
    const { session, user, isLoading: isAuthLoading } = useAuth();
    const { currentUserSubscriptionTier, isLoading: isSubscriptionLoading, refreshSubscriptionStatus } = useSubscription();
    const [isYearly, setIsYearly] = useState(false);
    const [isProcessing, setIsProcessing] = useState<string | null>(null); // Tracks which plan button is processing
    const [isRedirecting, setIsRedirecting] = useState(false); // For feedback when navigating
    const [testEmail, setTestEmail] = useState(''); // For admin test email form
    const [testSubject, setTestSubject] = useState('Test Email from MapleAurum');
    const [testMessage, setTestMessage] = useState('This is a test email sent from the MapleAurum Subscribe page.');
    const [emailStatus, setEmailStatus] = useState<string | null>(null);
    const [isEmailSending, setIsEmailSending] = useState(false);
    const navigate = useNavigate();
    const backgroundImageUrl = '/Background2.jpg';

    const isAdmin = user?.email === 'adamkiil@outlook.com' || user?.email === 'adamkiil79@gmail.com';

    useEffect(() => {
        if (!isAuthLoading && session) {
            console.log("[SubscribePage] Session active, refreshing subscription status.");
            refreshSubscriptionStatus().catch((err) => {
                console.error('[SubscribePage] Failed to refresh subscription status:', err);
            });
        }
    }, [session, isAuthLoading, refreshSubscriptionStatus]);
  
    // Log details for Stripe buttons/keys for easier debugging
    useEffect(() => {
        console.log(`[SubscribePage] Client-side STRIPE_MODE_CLIENT: ${STRIPE_MODE_CLIENT}`);
        console.log(`[SubscribePage] Effective Stripe Publishable Key: ${STRIPE_PUBLISHABLE_KEY_TO_USE ? 'Set (' + STRIPE_PUBLISHABLE_KEY_TO_USE.substring(0,10) + '...)' : 'NOT SET - Stripe Buy Buttons will fail for guests.'}`);
        plansData.filter(p => p.tier !== 'free').forEach(plan => { // Only log for paid plans
            const priceId = isYearly ? plan.priceIdYearly : plan.priceIdMonthly;
            const buyButtonId = isYearly ? plan.buyButtonIdYearly : plan.buyButtonIdMonthly;
            console.log(`[SubscribePage] Plan Details: ${plan.name} (Tier: ${plan.tier}, Yearly: ${isYearly}) - Price ID for function call: '${priceId || 'N/A'}', Buy Button ID for Stripe Element: '${buyButtonId || 'N/A'}'`);
            if (!priceId && (session && user)) { // Price ID is critical for logged-in user flow
                 console.warn(`[SubscribePage] CRITICAL WARNING: Missing Price ID for logged-in user flow for plan "${plan.name}" (${isYearly ? 'Yearly' : 'Monthly'}). Checkout will fail.`);
            }
            if (!(session && user) && !buyButtonId) { // Buy Button ID is critical for guest flow with Stripe elements
                console.warn(`[SubscribePage] WARNING: Missing Buy Button ID for guest flow for plan "${plan.name}" (${isYearly ? 'Yearly' : 'Monthly'}). Stripe <stripe-buy-button> will not render.`);
            }
        });
    }, [isYearly, session, user]); // Re-log if these change


    const handlePaymentForLoggedInUser = async (plan: PlanDisplayData) => {
        if (!user || !session?.access_token) { // Check for access_token too
            console.log('[SubscribePage] User not logged in or session invalid. Redirecting to login.');
            setIsRedirecting(true);
            navigate('/login?action=login&from=subscribe&plan=' + plan.tier, { state: { from: { pathname: '/subscribe' } } });
            return;
        }
        if (plan.tier === 'free') return; // Should not be called for free plan

        const priceIdToUse = isYearly ? plan.priceIdYearly : plan.priceIdMonthly;
        if (!priceIdToUse) {
            console.error(`[SubscribePage] CRITICAL: Stripe Price ID is missing for plan "${plan.name}" (${isYearly ? 'Yearly' : 'Monthly'}). Cannot proceed with checkout.`);
            alert("Configuration error: This plan's Price ID is missing. Please contact support at support@mapleaurum.com.");
            return;
        }

        const processingKey = `${plan.name}-${isYearly ? 'Yearly' : 'Monthly'}`;
        setIsProcessing(processingKey);
        
        const checkoutBody = {
            price_id: priceIdToUse,
            success_url: `${FRONTEND_URL}/onboarding?session_id={CHECKOUT_SESSION_ID}&plan_name=${encodeURIComponent(plan.name)}&tier=${plan.tier}`,
            cancel_url: `${FRONTEND_URL}/subscribe`,
            mode: 'subscription' as 'subscription',
            plan_name: plan.name, // For metadata
            interval: isYearly ? 'year' : ('month' as 'month' | 'year'), // For metadata
        };
        
        console.log(`[SubscribePage] Logged-in user: Invoking 'stripe-checkout'. User ID: ${user.id}, Plan: ${plan.name} (Tier: ${plan.tier}), Price ID: ${priceIdToUse}. Body being sent:`, JSON.stringify(checkoutBody, null, 2));

        try {
            const { data, error: functionError } = await supabase.functions.invoke('stripe-checkout', {
                body: checkoutBody, // CRITICAL: Pass the JavaScript object directly
                // Supabase client handles Authorization header if session is active
            });

            console.log('[SubscribePage] Raw response from stripe-checkout (logged-in user):', { data, functionError });

            if (functionError) {
                let displayError = 'Checkout initialization failed.';
                const errorContext = (functionError as any).context;
                if (errorContext?.error?.message) displayError += ` Server Message: ${errorContext.error.message}`;
                else if (errorContext?.details) displayError += ` Server Details: ${errorContext.details}`;
                else if (functionError.message) displayError += ` Message: ${functionError.message}`; // This catches "Edge Function returned a non-2xx status code"
                else displayError += ' An unknown error occurred with the Edge Function.';
                
                console.error('[SubscribePage] Supabase Function Error:', displayError, functionError);
                alert(displayError + " Please try again or contact support at support@mapleaurum.com.");
                setIsProcessing(null); // Reset processing state on error
                return; 
            }

            if (data && data.url) {
                console.log("[SubscribePage] Received Stripe Checkout URL, redirecting:", data.url);
                window.location.href = data.url;
                // setIsProcessing(null); // Not reached if redirecting
            } else {
                console.error('[SubscribePage] Stripe Checkout URL missing in function response. Data:', data);
                alert('Could not retrieve a valid checkout session. Please check console and contact support.');
                setIsProcessing(null);
            }
        } catch (error: any) { 
            console.error('[SubscribePage] Error during "invoke" call or subsequent logic:', error.message, error);
            alert(`An unexpected error occurred during checkout: ${error.message}. Please try again or contact support at support@mapleaurum.com.`);
            setIsProcessing(null);
        }
    };

    const handleSendTestEmail = async (e: FormEvent) => { 
        e.preventDefault();
        if (!isAdmin) { setEmailStatus('Unauthorized: Admin access required.'); return; }
        if (!testEmail) { setEmailStatus('Please enter a recipient email.'); return; }
        setIsEmailSending(true); setEmailStatus(null);
        try {
            const { data: { session: currentAuthSession } , error: sessionErr } = await supabase.auth.getSession();
            if (sessionErr || !currentAuthSession?.access_token) {
                 throw new Error(sessionErr?.message || 'Authentication token not available for sending email.');
            }
            const token = currentAuthSession.access_token;
            console.log('[SubscribePage] Admin attempting to send test email.');
            const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`, { // Ensure VITE_SUPABASE_URL is correct
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ to: testEmail, subject: testSubject, message: testMessage }),
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || `Failed to send email: Server responded with status ${response.status}`);
            }
            setEmailStatus('Test email sent successfully!'); 
            setTestEmail(''); 
            // Optionally reset subject/message or keep them for further tests
        } catch (error: any) { 
            console.error('[SubscribePage] Error sending test email:', error);
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
            {/* Load Stripe.js only if a publishable key is available */}
            {STRIPE_PUBLISHABLE_KEY_TO_USE && <script async src="https://js.stripe.com/v3/buy-button.js"></script>}
            {!STRIPE_PUBLISHABLE_KEY_TO_USE && 
                <div className="bg-red-600 text-white p-3 text-center text-sm font-medium fixed top-0 left-0 right-0 z-[100] shadow-lg">
                    Warning: Stripe Publishable Key for {STRIPE_MODE_CLIENT.toUpperCase()} mode is NOT configured. Guest payment buttons will not function.
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
                    <div className="max-w-md mx-auto mb-8 p-6 bg-navy-700/60 border border-navy-600/50 rounded-lg backdrop-blur-sm shadow-lg">
                        <Typography variant="h3" className="text-xl font-bold text-cyan-300 mb-4">Admin: Send Test Email</Typography>
                        {emailStatus && <Typography variant="body" className={`mb-4 text-sm ${emailStatus.includes('Error') || emailStatus.includes('Unauthorized') ? 'text-red-400' : 'text-green-400'}`}>{emailStatus}</Typography>}
                        <form onSubmit={handleSendTestEmail} className="space-y-4">
                            <div><Label htmlFor="test-email" className="block text-sm font-medium text-gray-300 mb-1">Recipient Email</Label><Input id="test-email" type="email" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="e.g., recipient@example.com" required disabled={isEmailSending} className="bg-navy-600/80 border-navy-500 text-white placeholder-gray-400/70" /></div>
                            <div><Label htmlFor="test-subject" className="block text-sm font-medium text-gray-300 mb-1">Subject</Label><Input id="test-subject" type="text" value={testSubject} onChange={(e) => setTestSubject(e.target.value)} placeholder="Test Email Subject" required disabled={isEmailSending} className="bg-navy-600/80 border-navy-500 text-white placeholder-gray-400/70" /></div>
                            <div><Label htmlFor="test-message" className="block text-sm font-medium text-gray-300 mb-1">Message</Label><Input id="test-message" type="text" value={testMessage} onChange={(e) => setTestMessage(e.target.value)} placeholder="Test email body." required disabled={isEmailSending} className="bg-navy-600/80 border-navy-500 text-white placeholder-gray-400/70" /></div>
                            <Button type="submit" disabled={isEmailSending || isLoadingOverall} className="w-full bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 text-white">
                                {isEmailSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                                {isEmailSending ? 'Sending...' : 'Send Test Email'}
                            </Button>
                        </form>
                    </div>
                )}

                <div className="grid grid-cols-1 gap-6 sm:gap-8 lg:grid-cols-3 max-w-5xl mx-auto px-4 sm:px-0"> {/* Added padding for small screens */}
                    {plansData.map((plan) => {
                        const IconComponent = plan.icon;
                        const displayPrice = isYearly ? plan.priceYearlyDisplay : plan.priceMonthlyDisplay;
                        const displayPeriod = isYearly ? plan.periodYearly : plan.periodMonthly;
                        const uniqueProcessingKey = `${plan.name}-${isYearly ? 'Yearly' : 'Monthly'}`;
                        const isButtonCurrentlyProcessing = isProcessing === uniqueProcessingKey;
                        const actualUserTier = currentUserSubscriptionTier || 'free';
                        const isCurrentPlanActive = actualUserTier === plan.tier;

                        let buttonText: string;
                        let isButtonDisabled: boolean = isLoadingOverall || isButtonCurrentlyProcessing || isRedirecting;
                        let currentActionHandler: (() => void) | null = null;
                        let showStripeBuyButtonElement = false;

                        if (plan.tier === 'free') {
                            if (session) { // Logged in user
                                buttonText = actualUserTier === 'free' ? 'Current Plan (Free)' : 'Free Access Included';
                                isButtonDisabled = true; // Always disabled & static for logged-in user on free plan card
                                currentActionHandler = null;
                            } else { // Guest user
                                buttonText = 'Sign Up for Free';
                                if (!isButtonCurrentlyProcessing) isButtonDisabled = isLoadingOverall || isRedirecting;
                                currentActionHandler = () => navigate('/login?action=signup&plan=Free'); 
                            }
                        } else { // Paid plans
                            if (session && user) { // Logged-in user
                                if (isCurrentPlanActive) {
                                    buttonText = 'Current Plan'; isButtonDisabled = true;
                                } else if ( (actualUserTier === 'free') || (actualUserTier === 'pro' && plan.tier === 'premium') ) {
                                    buttonText = actualUserTier === 'free' ? `Get ${plan.name}` : `Upgrade to ${plan.name}`;
                                    if (!isButtonCurrentlyProcessing) isButtonDisabled = isLoadingOverall || isRedirecting;
                                    currentActionHandler = () => handlePaymentForLoggedInUser(plan);
                                } else { 
                                    buttonText = 'Manage Subscription'; isButtonDisabled = true;
                                }
                            } else { // Guest looking at paid plans
                                buttonText = `Get ${plan.name}`; // Fallback text if Stripe button fails to render
                                const currentBuyButtonIdForStripe = isYearly ? plan.buyButtonIdYearly : plan.buyButtonIdMonthly;
                                showStripeBuyButtonElement = !!(STRIPE_PUBLISHABLE_KEY_TO_USE && currentBuyButtonIdForStripe);
                                
                                if (!showStripeBuyButtonElement) { 
                                    currentActionHandler = () => {
                                        setIsRedirecting(true);
                                        navigate(`/login?action=signup&plan=${plan.tier}&yearly=${isYearly}`, { state: { from: { pathname: '/subscribe' } }});
                                    };
                                }
                                // If Stripe button is shown, the custom button path should be disabled or not primary
                                if (showStripeBuyButtonElement) isButtonDisabled = true; 
                                else if (!isButtonCurrentlyProcessing) isButtonDisabled = isLoadingOverall || isRedirecting;
                            }
                        }
                        if (isButtonCurrentlyProcessing && plan.tier !== 'free') { 
                           buttonText = 'Processing...'; isButtonDisabled = true; 
                        }
                        
                        const currentBuyButtonIdForStripeElement = isYearly ? plan.buyButtonIdYearly : plan.buyButtonIdMonthly;

                        return (
                            <div key={uniqueProcessingKey} className={cn('relative transform transition-all duration-300 hover:scale-[1.015] flex', plan.popular ? 'shadow-cyan-900/20 shadow-lg' : 'shadow-md shadow-navy-900/10')}>
                                {plan.popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2 transform z-10"><span className="inline-flex items-center rounded-full bg-gradient-to-r from-teal-500 to-cyan-600 px-3 py-0.5 text-xs font-semibold text-white shadow-sm">Most Popular</span></div>}
                                <div className={cn('relative flex flex-col h-full rounded-xl border p-6 w-full', plan.popular ? 'bg-navy-700/50 border-cyan-700/50' : 'bg-navy-800/60 border-navy-700/50', 'backdrop-blur-sm')}>
                                    <div className="flex items-center gap-3 mb-4">
                                        {IconComponent && <IconComponent className={cn('h-7 w-7', plan.color === 'accent-yellow' ? 'text-accent-yellow' : 'text-accent-teal')} />}
                                        <h3 className={cn('text-lg font-semibold', plan.popular ? 'text-cyan-300' : 'text-white')}>{plan.name}</h3>
                                    </div>
                                    <div className="mt-2 flex items-baseline gap-x-1">
                                        <span className="text-3xl font-bold tracking-tight text-white">{displayPrice}</span>
                                        {displayPeriod && <span className="text-sm font-semibold leading-6 text-gray-400">{displayPeriod}</span>}
                                    </div>
                                    <p className="mt-4 text-sm leading-6 text-gray-300 flex-shrink-0 h-12 overflow-y-auto">{plan.description}</p>
                                    <ul role="list" className="mt-6 space-y-3 text-sm leading-6 text-gray-200 flex-grow">
                                        {plan.features.map((feature) => (
                                            <li key={feature} className="flex gap-x-3">
                                                {feature.startsWith('All ') ? <span className="w-5 h-6"></span> : <Check className="h-6 w-5 flex-none text-teal-400" aria-hidden="true" />}
                                                <span className={cn(feature.startsWith('All ') ? 'font-medium text-gray-400 -ml-5' : '')}>{feature}</span>
                                            </li>
                                        ))}
                                    </ul>
                                    <div className="mt-8">
                                        {showStripeBuyButtonElement ? (
                                            <stripe-buy-button
                                                buy-button-id={currentBuyButtonIdForStripeElement!} 
                                                publishable-key={STRIPE_PUBLISHABLE_KEY_TO_USE!}
                                            >
                                            </stripe-buy-button>
                                        ) : (
                                            <Button
                                                onClick={() => { currentActionHandler?.() }}
                                                disabled={isButtonDisabled}
                                                size="lg"
                                                variant={isCurrentPlanActive || (plan.tier === 'free' && session) || (isButtonDisabled && !currentActionHandler) ? 'secondary' : (plan.popular ? 'primary' : 'outline')}
                                                className={cn('w-full font-semibold', isButtonDisabled && 'opacity-60 cursor-not-allowed', plan.popular && !isCurrentPlanActive && !isButtonDisabled && 'bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white')}
                                                style={(plan.tier === 'free' && session && actualUserTier !== 'free') || (plan.tier === 'free' && !session && !currentActionHandler) ? { pointerEvents: 'none' } : {}} // Make static if no action for free
                                            >
                                                {isButtonCurrentlyProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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