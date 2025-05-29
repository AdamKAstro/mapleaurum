// src/pages/onboarding/index.tsx - SECURITY FIX
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { PageContainer } from '../../components/ui/page-container';
import { Typography } from '../../components/ui/typography';
import { Button } from '../../components/ui/button';
import { useAuth } from '../../contexts/auth-context';
import { useSubscription } from '../../contexts/subscription-context';
import { supabase } from '../../lib/supabaseClient';
import { Loader2, CheckCircle, AlertCircle, Table2, LogIn as LogInIcon, UserPlus } from 'lucide-react';

export function OnboardingPage() {
    const { session, user, isLoading: isAuthLoading } = useAuth();
    const { refreshSubscriptionStatus } = useSubscription();
    const navigate = useNavigate();
    const location = useLocation();
    const backgroundImageUrl = '/og-image.jpg';

    const [statusMessage, setStatusMessage] = useState<string>('Verifying your subscription...');
    const [errorOccurred, setErrorOccurred] = useState<boolean>(false);
    const [isLoadingPage, setIsLoadingPage] = useState<boolean>(true);
    const [planName, setPlanName] = useState<string | null>(null);
    const [stripeCheckoutEmail, setStripeCheckoutEmail] = useState<string | null>(null);
    const [requiresAuthAction, setRequiresAuthAction] = useState<boolean>(false);

    useEffect(() => {
        const searchParams = new URLSearchParams(location.search);
        const stripeSessionId = searchParams.get('session_id');
        const queryPlanName = searchParams.get('plan_name');
        
        console.log(`[OnboardingPage] Mount/Update. Auth Loading: ${isAuthLoading}, User: ${user ? user.id : 'null'}, Stripe SessionId: ${stripeSessionId}, QueryPlanName: ${queryPlanName}`);

        if (queryPlanName) setPlanName(queryPlanName);

        if (isAuthLoading) {
            console.log("[OnboardingPage] Auth context is loading. Waiting...");
            setStatusMessage('Initializing your session...');
            return; 
        }

        // Scenario 1: User is already logged in
        if (user && session) {
            console.log(`[OnboardingPage] User ${user.id} is logged in. Refreshing subscription status.`);
            setIsLoadingPage(true); 
            refreshSubscriptionStatus().then(() => {
                setStatusMessage(queryPlanName ? `Your ${queryPlanName} subscription is now active!` : 'Subscription successfully activated!');
                console.log(`[OnboardingPage] Subscription status refreshed for logged-in user.`);
            }).catch(err => {
                console.error("[OnboardingPage] Error refreshing subscription for logged-in user:", err);
                setStatusMessage("We couldn't confirm your subscription update immediately. Please check your account or contact support.");
                setErrorOccurred(true);
            }).finally(() => {
                setIsLoadingPage(false);
            });
            return; 
        }
        
        // Scenario 2: New customer from Stripe checkout - USE SECURE EDGE FUNCTION
        if (stripeSessionId && !user) {
            console.log(`[OnboardingPage] No Supabase session. Fetching Stripe session '${stripeSessionId}' via secure Edge Function.`);
            setIsLoadingPage(true);
            setStatusMessage('Finalizing your new subscription...');
            
            const fetchStripeSessionSecurely = async () => {
                try {
                    // ✅ SECURE: Use Edge Function instead of client-side Stripe API call
                    const { data, error } = await supabase.functions.invoke('get-stripe-session-details', {
                        body: { checkoutSessionId: stripeSessionId }
                    });

                    if (error) {
                        console.error('[OnboardingPage] Edge function error:', error);
                        throw new Error(error.message || 'Failed to retrieve session details');
                    }

                    if (data && data.customerEmail) {
                        const emailFromStripe = data.customerEmail;
                        setStripeCheckoutEmail(emailFromStripe);
                        const effectivePlanName = data.planName || queryPlanName || 'your new';
                        setPlanName(effectivePlanName);
                        
                        setStatusMessage(`Payment for your ${effectivePlanName} plan was successful! Please create an account or log in with ${emailFromStripe} to access it.`);
                        setRequiresAuthAction(true); 
                        console.log(`[OnboardingPage] Stripe session success for new customer. Email: ${emailFromStripe}`);
                    } else {
                        throw new Error('Could not retrieve customer details from session.');
                    }
                } catch (err: any) {
                    console.error('[OnboardingPage] Error fetching Stripe session via Edge Function:', err);
                    setStatusMessage('There was an issue confirming your payment. Please contact support if your payment was processed but access is not granted.');
                    setErrorOccurred(true);
                } finally {
                    setIsLoadingPage(false);
                }
            };
            fetchStripeSessionSecurely();
        } else if (!stripeSessionId && !user && !isAuthLoading) {
            console.warn('[OnboardingPage] No Stripe session ID and no user. Redirecting to subscription page.');
            navigate('/subscribe', { replace: true });
        } else if (user && session && !stripeSessionId && !isAuthLoading){
            console.log('[OnboardingPage] User logged in but no Stripe session ID in URL. Showing generic welcome.');
            setStatusMessage(planName ? `Welcome to your ${planName} plan!` : 'Welcome! Your account is ready.');
            setIsLoadingPage(false);
        }

    }, [isAuthLoading, user, session, location.search, navigate, refreshSubscriptionStatus]);

    const titleToDisplay = errorOccurred ? "Onboarding Problem" : (planName ? `${planName} Plan Activated!` : "Welcome to MapleAurum!");
    const descriptionToDisplay = errorOccurred 
        ? "We encountered an issue while setting up your subscription access."
        : (planName ? `Your access to MapleAurum ${planName} features is ready.` : "Your account is set up and ready to use.");

    if (isLoadingPage) { 
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-navy-900 via-navy-800 to-navy-900 p-4 text-white">
                <Loader2 className="h-12 w-12 animate-spin text-cyan-300 mb-4" />
                <Typography variant="h3" className="text-white">{statusMessage || "Loading..."}</Typography>
            </div>
        );
    }
    
    return (
        <PageContainer title={titleToDisplay} description={descriptionToDisplay} className="relative min-h-screen w-full overflow-hidden">
            <div className="absolute inset-0 bg-cover bg-center opacity-30 -z-10" style={{ backgroundImage: `url('${backgroundImageUrl}')` }} aria-hidden="true" />
            <div className="absolute inset-0 bg-noise opacity-20 -z-10" aria-hidden="true" />
            
            <div className="relative z-0 flex items-center justify-center min-h-[calc(100vh-150px)] px-4">
                <div className="max-w-lg w-full bg-navy-800/80 backdrop-blur-md shadow-xl rounded-lg p-6 sm:p-8 text-center">
                    {errorOccurred ? (
                        <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4 sm:mb-6" />
                    ) : (
                        <CheckCircle className="h-16 w-16 text-emerald-500 mx-auto mb-4 sm:mb-6" />
                    )}

                    <Typography variant="h2" className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-3">
                        {errorOccurred ? "Onboarding Problem" : (planName ? `Welcome to your ${planName} Plan!` : "Account Ready!")}
                    </Typography>
                    
                    <Typography variant="body" className="mb-6 sm:mb-8 text-gray-300 text-base sm:text-lg">
                        {statusMessage || (errorOccurred ? "Please contact support." : "Your setup is complete.")}
                    </Typography>

                    {requiresAuthAction && stripeCheckoutEmail && !errorOccurred && (
                        <div className="space-y-3">
                            <Typography variant="body" className="text-gray-200">
                                To access your new features, please create an account or log in using the email: <strong>{stripeCheckoutEmail}</strong>.
                            </Typography>
                            <Button
                                onClick={() => navigate(`/login?action=signup&email=${encodeURIComponent(stripeCheckoutEmail)}&plan_name=${encodeURIComponent(planName || 'Subscribed Plan')}`)}
                                className="w-full bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white py-2.5 sm:py-3 text-base"
                            >
                                <UserPlus className="mr-2 h-5 w-5" /> Create Account
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => navigate(`/login?email=${encodeURIComponent(stripeCheckoutEmail)}&plan_name=${encodeURIComponent(planName || 'Subscribed Plan')}`)}
                                className="w-full border-cyan-600 text-cyan-300 hover:bg-cyan-700/20 hover:text-cyan-200 py-2.5 sm:py-3 text-base"
                            >
                                <LogInIcon className="mr-2 h-5 w-5" /> I Already Have an Account
                            </Button>
                        </div>
                    )}

                    {user && !errorOccurred && (
                        <Button
                            onClick={() => navigate('/companies')}
                            className="w-full bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 text-white py-2.5 sm:py-3 text-base"
                        >
                            <Table2 className="mr-2 h-5 w-5" />
                            Start Exploring Data
                        </Button>
                    )}

                    {errorOccurred && (
                         <Button
                            onClick={() => navigate('/subscribe')}
                            variant="outline"
                            className="w-full mt-6 border-red-500 text-red-300 hover:bg-red-700/20 hover:text-red-200 py-2.5 sm:py-3 text-base"
                        >
                            Return to Subscription Plans
                        </Button>
                    )}
                     <Typography variant="bodySmall" className="mt-8 text-xs text-gray-500">
                        If you encounter any issues, please contact <a href="mailto:support@mapleaurum.com" className="underline hover:text-cyan-400">support@mapleaurum.com</a>.
                    </Typography>
                </div>
            </div>
        </PageContainer>
    );
}