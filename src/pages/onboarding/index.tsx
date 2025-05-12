// src/pages/onboarding/index.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom'; // Added Link
import { PageContainer } from '../../components/ui/page-container';
import { Typography } from '../../components/ui/typography';
import { Button } from '../../components/ui/button';
import { useAuth } from '../../contexts/auth-context';
import { useSubscription } from '../../contexts/subscription-context';
// import { supabase } from '../../lib/supabaseClient'; // Not strictly needed if AuthContext handles user checks
import { Loader2, CheckCircle, AlertCircle, Table2, LogIn } from 'lucide-react'; // Added LogIn

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
        const queryPlanName = searchParams.get('plan_name'); // From Stripe success_url metadata
        
        if (queryPlanName) setPlanName(queryPlanName);

        if (isAuthLoading) {
            setStatusMessage('Initializing session...');
            return; // Wait for auth context
        }

        // If user is already logged in, they've completed a logged-in purchase flow
        if (user && session) {
            console.log('[OnboardingPage] User logged in. Refreshing subscription.');
            refreshSubscriptionStatus().then(() => {
                setStatusMessage(queryPlanName ? `Your ${queryPlanName} subscription is now active!` : 'Subscription successfully activated!');
                setIsLoadingPage(false);
            });
            return;
        }
        
        // If no logged-in user, but Stripe session ID is present (new customer flow)
        if (stripeSessionId && !user) {
            console.log('[OnboardingPage] No user session. Fetching Stripe session details for new customer.');
            setStatusMessage('Finalizing your new subscription...');
            const fetchStripeSession = async () => {
                try {
                    // IMPORTANT: In a real app, you'd call your OWN backend to retrieve session details securely,
                    // rather than exposing Stripe secret key to client-side or making direct Stripe API calls from client.
                    // This is simplified for example purposes.
                    const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${stripeSessionId}`, {
                        headers: { Authorization: `Bearer ${import.meta.env.VITE_STRIPE_SECRET_KEY}` },
                    });
                    const sessionData = await response.json();

                    if (response.ok && sessionData.customer_details?.email) {
                        const emailFromStripe = sessionData.customer_details.email;
                        setStripeCheckoutEmail(emailFromStripe);
                        const effectivePlanName = sessionData.metadata?.plan_name || queryPlanName || 'new';
                        setPlanName(effectivePlanName);
                        
                        // Webhook should have provisioned subscription. Now user needs to create Supabase account.
                        setStatusMessage(`Payment for your ${effectivePlanName} plan was successful! Please create your account or log in to access it.`);
                        setRequiresAuthAction(true); // Trigger UI for login/signup
                        console.log(`[OnboardingPage] Stripe session success for new customer. Email: ${emailFromStripe}. Needs account creation/login.`);
                    } else {
                        throw new Error(sessionData.error?.message || 'Could not retrieve customer email from Stripe session.');
                    }
                } catch (err: any) {
                    console.error('[OnboardingPage] Error fetching/processing Stripe session:', err);
                    setStatusMessage('There was an issue confirming your payment details. Please contact support if your subscription isn\'t active.');
                    setErrorOccurred(true);
                } finally {
                    setIsLoadingPage(false);
                }
            };
            fetchStripeSession();
        } else if (!stripeSessionId && !user) {
            // No Stripe session, no user - shouldn't be here.
            console.warn('[OnboardingPage] No Stripe session ID or user. Redirecting.');
            navigate('/subscribe');
        } else if (user && session && !stripeSessionId){
            // Logged in, but no stripe session - perhaps navigated here directly after some other action.
             setStatusMessage(planName ? `Welcome to your ${planName} plan!` : 'Welcome! Your account is ready.');
             setIsLoadingPage(false);
        }

    }, [isAuthLoading, user, session, location.search, navigate, refreshSubscriptionStatus]);

    const title = errorOccurred ? "Onboarding Issue" : (planName ? `${planName} Plan Activated!` : "Welcome to MapleAurum!");
    const description = errorOccurred 
        ? "We encountered a problem while setting up your access."
        : (planName ? `Your access to the ${planName} features is ready.` : "Your account is set up and ready to go.");

    if (isLoadingPage) { // Use isLoadingPage which accounts for auth and Stripe fetch
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-navy-900 text-white p-4">
                <Loader2 className="h-12 w-12 animate-spin text-cyan-300 mb-4" />
                <Typography variant="h3">{statusMessage}</Typography>
            </div>
        );
    }
    
    return (
        <PageContainer title={title} description={description} className="relative min-h-screen w-full overflow-hidden">
            <div className="absolute inset-0 bg-cover bg-center opacity-30 -z-10" style={{ backgroundImage: `url('${backgroundImageUrl}')` }} aria-hidden="true" />
            <div className="absolute inset-0 bg-noise opacity-20 -z-10" aria-hidden="true" />
            
            <div className="relative z-0 flex items-center justify-center min-h-[calc(100vh-150px)]">
                <div className="max-w-lg w-full bg-navy-800/80 backdrop-blur-md shadow-xl rounded-lg p-8 text-center">
                    {errorOccurred ? (
                        <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-6" />
                    ) : (
                        <CheckCircle className="h-16 w-16 text-emerald-500 mx-auto mb-6" />
                    )}

                    <Typography variant="h2" className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-4">
                        {errorOccurred ? "Onboarding Issue" : (planName ? `Welcome to ${planName}!` : "Account Ready!")}
                    </Typography>
                    
                    <Typography variant="body" className="mb-8 text-gray-300 text-lg">
                        {statusMessage}
                    </Typography>

                    {requiresAuthAction && stripeCheckoutEmail && !errorOccurred && (
                        <div className="space-y-4">
                            <Typography variant="bodySmall" className="text-gray-200">
                                Create an account or log in with <strong>{stripeCheckoutEmail}</strong> to begin.
                            </Typography>
                            <Button
                                onClick={() => navigate(`/login?action=signup&email=${encodeURIComponent(stripeCheckoutEmail)}&plan_name=${encodeURIComponent(planName || 'subscribed')}`)}
                                className="w-full bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white py-3 text-base"
                            >
                                <UserPlus className="mr-2 h-5 w-5" /> Create Account
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => navigate(`/login?email=${encodeURIComponent(stripeCheckoutEmail)}&plan_name=${encodeURIComponent(planName || 'subscribed')}`)}
                                className="w-full border-cyan-600 text-cyan-300 hover:bg-cyan-700/20 hover:text-cyan-200 py-3 text-base"
                            >
                                <LogInIcon className="mr-2 h-5 w-5" /> I Already Have an Account
                            </Button>
                        </div>
                    )}

                    {user && !errorOccurred && (
                        <Button
                            onClick={() => navigate('/companies')}
                            className="w-full bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 text-white py-3 text-base"
                        >
                            <Table2 className="mr-2 h-5 w-5" />
                            Start Exploring Data
                        </Button>
                    )}

                    {errorOccurred && (
                         <Button
                            onClick={() => navigate('/subscribe')}
                            variant="outline"
                            className="w-full mt-4 border-red-500 text-red-300 hover:bg-red-700/20 hover:text-red-200 py-3 text-base"
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