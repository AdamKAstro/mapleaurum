// src/pages/subscribe/index.tsx
import React, { useState, useMemo } from 'react';
import { Check, Crown, Star, Loader2, AlertCircle, Lock } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Typography } from '../../components/ui/typography';
import { cn } from '../../lib/utils';
import { PageContainer } from '../../components/ui/page-container';
import { useAuth } from '../../contexts/auth-context';
import { useSubscription } from '../../contexts/subscription-context';
import { getTierLabel } from '../../lib/tier-utils';
import type { SubscriptionTier } from '../../lib/types';
import { useNavigate } from 'react-router-dom';
import { createCheckoutSession } from '../../lib/stripe';
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert';
import { Switch } from '../../components/ui/switch';
import { Label } from '../../components/ui/label';

// --- Define Price IDs from your CSV ---
const PRO_MONTHLY_PRICE_ID = 'price_1RMJ31Ast4LlpL7pauoVPwpm';
const PRO_YEARLY_PRICE_ID = 'price_1RMIBuAst4LlpL7pf1EFTmlk';
const PREMIUM_MONTHLY_PRICE_ID = 'price_1RMJ3pAst4LlpL7pXTO1bVli';
const PREMIUM_YEARLY_PRICE_ID = 'price_1RMIDFAst4LlpL7p8UInqh9P';
// --- End Price IDs ---

// Map plan names to SubscriptionTier type for comparison
const planNameToTier: Record<string, SubscriptionTier> = {
    "Free": "free",
    "Pro": "medium",
    "Premium": "premium",
};

// Map SubscriptionTier to a level for comparison
const tierLevel: Record<SubscriptionTier, number> = {
    "free": 0,
    "medium": 1,
    "premium": 2,
};

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
        name: "Free",
        description: "Basic access to company data",
        is_popular: false,
        features: ["Basic company information", "Limited financial metrics", "Public company profiles", "Daily updates"],
        monthly: { priceId: '', priceString: "$0", priceSuffix: "" },
        yearly: null,
        icon: undefined,
        color: 'gray',
    },
    {
        name: "Pro",
        description: "Advanced analytics and insights",
        is_popular: true,
        features: ["Financial metrics", "Resource estimates", "Production data", "Custom watchlists (coming)"],
        monthly: { priceId: PRO_MONTHLY_PRICE_ID, priceString: "$40", priceSuffix: "/month" },
        yearly: { priceId: PRO_YEARLY_PRICE_ID, priceString: "$420", priceSuffix: "/year", savePercent: yearlyProSavings },
        icon: Star,
        color: 'accent-teal',
    },
    {
        name: "Premium",
        description: "Complete access and premium features",
        is_popular: false,
        features: [
            "All Pro features", "Priority support", "Basic company information", "Public company profiles",
            "Advanced financial metrics", "Resource estimates", "Production data", "Custom watchlists (coming)",
            "Real-time alerts (coming)", "API access (coming)", "Cost metrics", "Valuation models"
        ],
        monthly: { priceId: PREMIUM_MONTHLY_PRICE_ID, priceString: "$90", priceSuffix: "/month" },
        yearly: { priceId: PREMIUM_YEARLY_PRICE_ID, priceString: "$960", priceSuffix: "/year", savePercent: yearlyPremiumSavings },
        icon: Crown,
        color: 'accent-yellow',
    }
];

export function SubscribePage() {
    const backgroundImageUrl = '/Background2.jpg';
    const { session, user, isLoading: isAuthLoading } = useAuth(); // Get auth session and loading state
    const { getEffectiveTier, isLoading: isSubLoading } = useSubscription();
    const navigate = useNavigate();
    const [loadingPriceId, setLoadingPriceId] = useState<string | null>(null); // Store price_id of loading plan
    const [error, setError] = useState<string | null>(null);
    const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly');

    // Memoize tier only when subscription is not loading
    const currentUserTier = useMemo(() => {
        if (isSubLoading || isAuthLoading) return undefined; // Return undefined while loading
        return getEffectiveTier();
    }, [getEffectiveTier, isSubLoading, isAuthLoading]);

    const handleSubscribe = async (priceId: string | null, planName: string) => {
        if (!priceId) return; // Don't proceed if no price ID (e.g., for Free plan attempt)
        setError(null);

        console.log(`[SubscribePage] handleSubscribe called for plan: ${planName}, priceId: ${priceId}`);
        console.log(`[SubscribePage] Auth state: session=${!!session}, user=${!!user}, isAuthLoading=${isAuthLoading}`);

        // Check for session/user *after* confirming it's not the free plan button
        if (!session || !user) {
            console.log('[SubscribePage] No active session or user found. Redirecting to login.');
            navigate('/login', { state: { from: `/subscribe?plan=${planName}&interval=${billingInterval}` } });
            return;
        }

        setLoadingPriceId(priceId); // Set loading specifically for this button

        try {
            const successUrl = `${window.location.origin}/subscribe/success?session_id={CHECKOUT_SESSION_ID}`;
            const cancelUrl = `${window.location.origin}/subscribe`;

            console.log(`[SubscribePage] Calling createCheckoutSession with priceId: ${priceId}`);
            const checkoutUrl = await createCheckoutSession(priceId, 'subscription', successUrl, cancelUrl);
            console.log(`[SubscribePage] createCheckoutSession returned URL: ${checkoutUrl}`);

            if (checkoutUrl) {
                window.location.href = checkoutUrl; // Redirect to Stripe
            } else {
                // This case might occur if the function resolves but returns no URL
                throw new Error('Could not retrieve checkout session URL.');
            }
            // No need to setLoadingPriceId(null) on success due to redirect
        } catch (err: any) {
            console.error('[SubscribePage] Subscription Error:', err);
            let displayError = 'Failed to initiate subscription. Please try again.';
            // Check if the error is specifically about the Edge Function invocation
            if (err.message) {
                 if (err.message.toLowerCase().includes('edge function') || err.message.toLowerCase().includes('failed to fetch')) {
                    displayError = `Failed to connect to the subscription service. Please check your internet connection and try again. If the problem persists, contact support. (Details: ${err.message})`;
                 } else {
                    displayError = err.message; // Show the specific error message if available
                 }
            }
            setError(displayError);
            setLoadingPriceId(null); // Reset loading state on error
        }
    };

    return (
        <PageContainer
            title="Subscription Plans"
            description="Choose the plan that best fits your mining analytics needs."
            className="relative min-h-screen w-full overflow-hidden bg-gradient-to-b from-navy-400 via-navy-300 to-navy-400"
        >
            <div className="absolute inset-0 bg-cover bg-center opacity-50 -z-10" style={{ backgroundImage: `url('${backgroundImageUrl}')` }} aria-hidden="true" />
            <div className="absolute inset-0 bg-noise opacity-30 -z-10" aria-hidden="true" />

            <div className="relative z-0 pt-8 pb-12">
                {/* Header Text */}
                <div className="text-center mb-10 md:mb-12">
                    {/* ... Typography ... */}
                     <Typography variant="h2" className="text-surface-white text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight"> Choose Your Plan </Typography>
                     <Typography variant="body" className="mt-3 max-w-2xl mx-auto text-surface-white/70 text-sm sm:text-base"> Unlock powerful analytics and gain deeper insights into the mining sector. </Typography>
                </div>

                {/* Monthly/Yearly Toggle */}
                <div className="flex items-center justify-center space-x-4 mb-10 md:mb-12 text-sm font-medium text-surface-white/80">
                    {/* ... Labels and Switch ... */}
                     <Label htmlFor="billing-toggle" className={cn(billingInterval === 'monthly' && 'text-surface-white font-semibold')}> Monthly </Label>
                     <Switch id="billing-toggle" checked={billingInterval === 'yearly'} onCheckedChange={(checked) => setBillingInterval(checked ? 'yearly' : 'monthly')} aria-label="Toggle billing interval" />
                     <Label htmlFor="billing-toggle" className={cn(billingInterval === 'yearly' && 'text-surface-white font-semibold')}> Yearly {(yearlyProSavings || yearlyPremiumSavings) && (<span className="ml-2 text-xs text-accent-teal">(Save up to {Math.max(yearlyProSavings ?? 0, yearlyPremiumSavings ?? 0)}%)</span>)} </Label>
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

                {/* Plan Cards */}
                <div className="grid grid-cols-1 gap-6 sm:gap-8 lg:grid-cols-3 max-w-5xl mx-auto px-4">
                    {plansData.map((plan) => {
                        const Icon = plan.icon;
                        const intervalDetails = billingInterval === 'yearly' && plan.yearly ? plan.yearly : plan.monthly;
                        const planTier = planNameToTier[plan.name] ?? 'free';
                        const isCurrentPlan = currentUserTier !== undefined && planTier === currentUserTier; // Check only if currentUserTier is known
                        const isUpgrade = currentUserTier !== undefined && tierLevel[planTier] > tierLevel[currentUserTier];
                        const isDowngrade = currentUserTier !== undefined && tierLevel[planTier] < tierLevel[currentUserTier];
                        const isFree = plan.name === "Free";

                        const currentPrice = isFree ? "$0" : intervalDetails?.priceString ?? '';
                        const currentSuffix = isFree ? '' : intervalDetails?.priceSuffix ?? '';
                        const currentPriceId = isFree ? null : intervalDetails?.priceId ?? null;
                        const isPlanLoading = loadingPriceId === currentPriceId; // Check if THIS button's checkout is loading

                        // Determine button text based on current plan and upgrade/downgrade status
                        let buttonText = `Get ${plan.name}`;
                        if (!isFree) {
                            buttonText += billingInterval === 'yearly' ? ' Yearly' : ' Monthly';
                        }
                        if (isCurrentPlan) buttonText = "Current Plan";
                        else if (isUpgrade) buttonText = `Upgrade to ${plan.name}`;
                        else if (isDowngrade) buttonText = `Switch to ${plan.name}`; // Changed text for downgrade

                        // Determine button disabled state
                        // Disable Free plan, Current plan, or if THIS button is loading.
                        // Allow downgrade clicks for now, handle logic in Stripe portal or backend if needed.
                        const isDisabled = isFree || isCurrentPlan || isPlanLoading;

                        return (
                            <div key={plan.name + billingInterval} className={/* ... positioning classes ... */ cn('relative transform transition-all duration-300 hover:scale-[1.015] flex', plan.is_popular ? 'shadow-cyan-900/20 shadow-lg' : 'shadow-md shadow-navy-900/10')}>
                                {/* Popular Badge */}
                                {plan.is_popular && ( <div className="absolute -top-3 left-1/2 -translate-x-1/2 transform z-10"><span className="inline-flex items-center rounded-full bg-gradient-to-r from-teal-500 to-cyan-600 px-3 py-0.5 text-xs font-semibold text-white shadow-sm">Most Popular</span></div> )}
                                {/* Savings Badge */}
                                {billingInterval === 'yearly' && intervalDetails?.savePercent && ( <div className={cn("absolute z-10 px-2.5 py-0.5 rounded-full text-xs font-semibold text-white", plan.is_popular ? "-top-7 right-2" : "-top-3 right-2", "bg-gradient-to-r from-emerald-500 to-green-600")}>Save {intervalDetails.savePercent}%</div> )}

                                <div className={/* ... card styles ... */ cn('relative flex flex-col h-full rounded-xl border p-6 w-full pt-8', plan.is_popular ? 'bg-navy-700/50 border-cyan-700/50' : 'bg-navy-800/60 border-navy-700/50', 'backdrop-blur-sm')}>
                                    {/* Plan Header */}
                                    <div className="flex items-center gap-3 mb-4">
                                        {Icon && (<Icon className={cn('h-7 w-7', plan.color === 'accent-yellow' ? 'text-accent-yellow' : 'text-accent-teal')} />)}
                                        <h3 className={cn('text-lg font-semibold', plan.is_popular ? 'text-cyan-300' : 'text-white')}>{plan.name}</h3>
                                    </div>
                                    {/* Price */}
                                    <div className="mt-2 flex items-baseline gap-x-1">
                                        <span className="text-3xl font-bold tracking-tight text-white">{currentPrice}</span>
                                        {currentSuffix && (<span className="text-sm font-semibold leading-6 text-gray-400">{currentSuffix}</span>)}
                                    </div>
                                    {/* Description */}
                                    <p className="mt-4 text-sm leading-6 text-gray-300">{plan.description}</p>
                                    {/* Features */}
                                    <ul role="list" className="mt-6 space-y-3 text-sm leading-6 text-gray-200 flex-grow">
                                        {plan.features.map((feature) => (
                                            <li key={feature} className="flex gap-x-3">
                                                {feature.startsWith('All ') ? (<span className="w-5 h-6"></span>) : (<Check className="h-6 w-5 flex-none text-teal-400" aria-hidden="true" />)}
                                                <span className={cn(feature.startsWith('All ') ? 'font-medium text-gray-400 -ml-5' : '')}>{feature}</span>
                                            </li>
                                        ))}
                                    </ul>
                                    {/* Subscribe Button */}
                                    <Button
                                        disabled={isDisabled} // Use updated isDisabled logic
                                        size="lg"
                                        variant={isCurrentPlan || isFree ? 'secondary' : plan.is_popular ? 'primary' : 'outline'}
                                        onClick={() => handleSubscribe(currentPriceId, plan.name)} // Removed !isFree check here, handleSubscribe checks priceId
                                        className={cn(
                                            'mt-8 w-full font-semibold flex items-center justify-center',
                                            // Specific styles based on state
                                            isCurrentPlan && 'bg-gray-600/50 border-gray-500 text-gray-300 cursor-default', // Style for current plan
                                            !isCurrentPlan && !isFree && plan.is_popular && 'bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white',
                                            !isCurrentPlan && !isFree && !plan.is_popular && 'border-cyan-700/50 text-cyan-300 hover:bg-cyan-900/20 hover:border-cyan-600',
                                            // General disabled/loading styles
                                            isDisabled && !isPlanLoading && 'opacity-60 cursor-not-allowed', // General disabled style
                                            isPlanLoading && 'opacity-75 cursor-wait'
                                        )}
                                    >
                                        {/* Content: Loader or Text */}
                                        {isPlanLoading ? (
                                            <>
                                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                                Processing...
                                            </>
                                        ) : (
                                            // Show static text for Free plan even if disabled
                                            isFree ? "Current Plan" : buttonText
                                        )}
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </PageContainer>
    );
}
