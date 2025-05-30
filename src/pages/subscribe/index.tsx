// src/pages/subscribe/index.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { Star, Crown, Check, Loader2, Gift, Link as LinkIcon, Copy, Zap } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../../components/ui/button'; // Assuming path
import { Typography } from '../../components/ui/typography'; // Assuming path
import { PageContainer } from '../../components/ui/page-container'; // Assuming path
import { Label } from '../../components/ui/label'; // Assuming path
import { Switch } from '../../components/ui/switch'; // Assuming path
import { useAuth } from '../../contexts/auth-context'; // Assuming path
import { useSubscription } from '../../contexts/subscription-context'; // Assuming path
import { cn } from '../../lib/utils'; // Assuming path
import { supabase } from '../../lib/supabaseClient'; // Assuming path
import { 
  products, 
  getPriceId, 
  getProduct, 
  getPrice,
  getYearlySavings,
  generateStripeCouponLink,
  FREE_TRIAL_COUPONS,
  APP_TRIAL_PROMO_CODES,      // New
  isValidAppTrialPromoCode, // New
  generateAppTrialLink,       // New
  type AppTrialPromoCodeKey,  // New
  type ProductKey,
  type SubscriptionTier 
} from '../../stripe-config'; // Ensure path is correct

// Free plan configuration
const FREE_PLAN = {
  name: 'Free',
  description: 'Basic access to company data. Perfect for getting started.',
  features: [
    'Basic company information',
    'Limited financial metrics', 
    'Public company profiles',
    'Daily market updates'
  ],
  tier: 'free' as const, // Explicitly type as 'free'
  price: { amount: 0, currency: 'CAD' }
};

interface PlanCardProps {
  productKey?: Exclude<ProductKey, 'free'>;
  isFree?: boolean;
  isYearly: boolean;
  currentTier: SubscriptionTier;
  onSubscribeStripe: (productKey: Exclude<ProductKey, 'free'>, isYearly: boolean, stripeCouponId?: string) => void;
  onActivateAppTrial: (promoCode: AppTrialPromoCodeKey) => Promise<void>;
  isProcessing: boolean;
  isLoggedIn: boolean;
  
  activeStripeCouponId?: string | null; // The Stripe coupon ID from URL if applicable to this card
  activeAppPromoCode?: AppTrialPromoCodeKey | null; // The App promo code from URL if applicable
  planFromUrl?: Exclude<ProductKey, 'free'> | null; // Plan targeted by URL param
}

function PlanCard({ 
  productKey, 
  isFree = false, 
  isYearly, 
  currentTier, 
  onSubscribeStripe,
  onActivateAppTrial,
  isProcessing, 
  isLoggedIn,
  activeStripeCouponId,
  activeAppPromoCode,
  planFromUrl,
}: PlanCardProps) {
  const navigate = useNavigate();
  
  if (isFree) {
    const isCurrentPlan = currentTier === 'free';
    return (
      <div className="relative flex flex-col h-full rounded-xl border p-6 w-full bg-navy-800/60 border-navy-700/50 backdrop-blur-sm">
        <div className="flex items-center gap-3 mb-4">
          <h3 className="text-lg font-semibold text-white">{FREE_PLAN.name}</h3>
        </div>
        <div className="mt-2 flex items-baseline gap-x-1">
          <span className="text-3xl font-bold tracking-tight text-white">$0</span>
          <span className="text-sm font-semibold leading-6 text-gray-400">forever</span>
        </div>
        <p className="mt-4 text-sm leading-6 text-gray-300 h-12">{FREE_PLAN.description}</p>
        <ul role="list" className="mt-6 space-y-3 text-sm leading-6 text-gray-200 flex-grow">
          {FREE_PLAN.features.map((feature) => (
            <li key={feature} className="flex gap-x-3">
              <Check className="h-6 w-5 flex-none text-teal-400" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
        <div className="mt-8">
          <Button
            onClick={() => isLoggedIn ? undefined : navigate(`/login?action=signup&plan=${FREE_PLAN.tier}`)}
            disabled={isCurrentPlan || isProcessing}
            size="lg"
            variant="secondary"
            className="w-full font-semibold"
          >
            {isLoggedIn ? (isCurrentPlan ? 'Current Plan' : 'Included') : 'Sign Up Free'}
          </Button>
        </div>
      </div>
    );
  }

  if (!productKey) return null;
  
  const product = getProduct(productKey);
  const price = getPrice(productKey, isYearly ? 'yearly' : 'monthly');
  const savings = isYearly ? getYearlySavings(productKey) : null;
  
  const isCurrentActivePlan = currentTier === productKey;
  const canUpgradeGenerally = !isCurrentActivePlan && (currentTier === 'free' || (currentTier === 'pro' && productKey === 'premium'));

  // Determine if this specific card is targeted by an app trial promo code from the URL
  const isAppTrialOfferForThisCard = !!(activeAppPromoCode && isValidAppTrialPromoCode(activeAppPromoCode) && APP_TRIAL_PROMO_CODES[activeAppPromoCode].tier === productKey);
  const appTrialDetails = isAppTrialOfferForThisCard ? APP_TRIAL_PROMO_CODES[activeAppPromoCode!] : null;

  // Determine if this specific card is targeted by a Stripe coupon from the URL (and not overridden by an app trial for this card)
  const hasStripeCouponForThisCard = !!(activeStripeCouponId && !isAppTrialOfferForThisCard && (planFromUrl === productKey || !planFromUrl) );
  const stripeCouponInfo = hasStripeCouponForThisCard ? FREE_TRIAL_COUPONS[activeStripeCouponId!] : null;

  let buttonText = `Get ${product.name}`;
  let buttonAction: () => void = () => onSubscribeStripe(productKey, isYearly);
  let buttonDisabled = isProcessing || isCurrentActivePlan;
  let buttonVariant: any = product.popular ? 'primary' : 'outline';
  let showPrice = true;
  let cardHighlightType: 'none' | 'popular' | 'stripe_trial' | 'app_trial' = product.popular ? 'popular' : 'none';

  if (isAppTrialOfferForThisCard && canUpgradeGenerally) {
    buttonText = `Activate ${appTrialDetails!.description}`;
    buttonAction = () => onActivateAppTrial(activeAppPromoCode!);
    buttonVariant = 'default'; // Special variant for app trials
    showPrice = false;
    cardHighlightType = 'app_trial';
    if (!isLoggedIn) {
        buttonText = `Sign Up for ${appTrialDetails!.description}`;
        buttonAction = () => navigate(`/login?action=signup&plan=${productKey}&yearly=${isYearly}&promo_code=${activeAppPromoCode}`);
    }
  } else if (hasStripeCouponForThisCard && canUpgradeGenerally) {
    buttonText = `Get ${product.name} with ${stripeCouponInfo || 'Stripe Trial'}`;
    buttonAction = () => onSubscribeStripe(productKey, isYearly, activeStripeCouponId!);
    buttonVariant = 'default'; // Special variant for Stripe trials
    cardHighlightType = 'stripe_trial';
    if (!isLoggedIn) {
        buttonText = `Sign Up for FREE ${product.name}! (${stripeCouponInfo || 'Stripe Trial'})`;
        buttonAction = () => navigate(`/login?action=signup&plan=${productKey}&yearly=${isYearly}&coupon=${activeStripeCouponId}`);
    }
  } else if (isCurrentActivePlan) {
    buttonText = 'Current Plan';
    buttonDisabled = true;
    buttonVariant = 'secondary';
    cardHighlightType = 'none';
  } else if (!canUpgradeGenerally) {
    buttonText = 'Manage Subscription';
    buttonDisabled = true; 
    buttonAction = () => navigate('/account'); // Assuming you have an account page
    buttonVariant = 'secondary';
    cardHighlightType = 'none';
  } else if (!isLoggedIn) {
    buttonText = `Sign Up for ${product.name}`;
    buttonAction = () => navigate(`/login?action=signup&plan=${productKey}&yearly=${isYearly}`);
  }
  // If logged in and can upgrade without any coupon/promo, default buttonAction and text are already set

  const Icon = productKey === 'pro' ? Star : Crown;

  return (
    <div className={cn(
      'relative transform transition-all duration-300 hover:scale-[1.015] flex',
      cardHighlightType === 'popular' && 'shadow-cyan-900/20 shadow-lg',
      cardHighlightType === 'app_trial' && 'ring-2 ring-purple-500 shadow-purple-500/20',
      cardHighlightType === 'stripe_trial' && 'ring-2 ring-emerald-500 shadow-emerald-500/20'
    )}>
      {cardHighlightType === 'popular' && (
         <div className="absolute -top-3 left-1/2 -translate-x-1/2 transform z-10">
           <span className="inline-flex items-center rounded-full bg-gradient-to-r from-teal-500 to-cyan-600 px-3 py-0.5 text-xs font-semibold text-white shadow-sm">Most Popular</span>
         </div>
      )}
      {cardHighlightType === 'app_trial' && (
         <div className="absolute -top-3 left-1/2 -translate-x-1/2 transform z-10">
           <span className="inline-flex items-center rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 px-3 py-0.5 text-xs font-semibold text-white shadow-sm">
             <Zap className="h-3 w-3 mr-1" /> Special Offer
           </span>
         </div>
      )}
      {cardHighlightType === 'stripe_trial' && (
         <div className="absolute -top-3 left-1/2 -translate-x-1/2 transform z-10">
           <span className="inline-flex items-center rounded-full bg-gradient-to-r from-emerald-500 to-green-600 px-3 py-0.5 text-xs font-semibold text-white shadow-sm">
             🎁 FREE Trial (Stripe)
           </span>
         </div>
      )}
      
      <div className={cn(
        'relative flex flex-col h-full rounded-xl border p-6 w-full backdrop-blur-sm',
        cardHighlightType === 'popular' ? 'bg-navy-700/50 border-cyan-700/50' : 
        cardHighlightType === 'app_trial' ? 'bg-purple-900/20 border-purple-600/50' :
        cardHighlightType === 'stripe_trial' ? 'bg-emerald-900/20 border-emerald-600/50' :
        'bg-navy-800/60 border-navy-700/50'
      )}>
        <div className="flex items-center gap-3 mb-4">
          <Icon className={cn('h-7 w-7', productKey === 'premium' ? 'text-accent-yellow' : 'text-accent-teal')} />
          <h3 className={cn('text-lg font-semibold', 
            cardHighlightType === 'popular' || cardHighlightType === 'app_trial' || cardHighlightType === 'stripe_trial' ? 'text-cyan-300' : 'text-white'
          )}>
            {product.name}
          </h3>
        </div>
        
        {showPrice && (
          <div className="mt-2 flex items-baseline gap-x-1">
            <span className={cn(
              'text-3xl font-bold tracking-tight',
              cardHighlightType === 'stripe_trial' ? 'line-through text-gray-400' : 'text-white'
            )}>
              ${price.amount}
            </span>
            <span className="text-sm font-semibold leading-6 text-gray-400">
              /{price.interval}
            </span>
            {cardHighlightType === 'stripe_trial' && (
              <div className="ml-2">
                <span className="text-3xl font-bold tracking-tight text-emerald-400">FREE</span>
                <div className="text-xs text-emerald-300">for 1 month (via Stripe)</div>
              </div>
            )}
          </div>
        )}
        {!showPrice && cardHighlightType === 'app_trial' && appTrialDetails && (
            <div className="mt-2">
                <span className="text-3xl font-bold tracking-tight text-purple-400">FREE Access</span>
                <div className="text-xs text-purple-300">{appTrialDetails.description}</div>
            </div>
        )}
        
        {savings && !isAppTrialOfferForThisCard && !hasStripeCouponForThisCard && (
          <div className="mt-2 text-sm text-emerald-400 font-medium">
            Save ${savings.amount} ({savings.percentage}%) yearly
          </div>
        )}
        
        {stripeCouponMessage && !isAppTrialOfferForThisCard && (
          <div className="mt-2 text-sm text-emerald-300 font-medium bg-emerald-900/30 p-2 rounded">
            🎁 {stripeCouponMessage}
          </div>
        )}
        
        <p className="mt-4 text-sm leading-6 text-gray-300 h-12 overflow-y-auto">
          {product.description}
        </p>
        
        <ul role="list" className="mt-6 space-y-3 text-sm leading-6 text-gray-200 flex-grow">
          {product.features.map((feature) => (
            <li key={feature} className="flex gap-x-3">
              <Check className="h-6 w-5 flex-none text-teal-400" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
        
        <div className="mt-8">
          <Button
            onClick={buttonAction}
            disabled={buttonDisabled}
            size="lg"
            variant={buttonVariant}
            className={cn(
              'w-full font-semibold',
              buttonDisabled && 'opacity-60 cursor-not-allowed',
              cardHighlightType === 'app_trial' && !buttonDisabled && 'bg-gradient-to-r from-purple-600 to-indigo-700 hover:from-purple-700 hover:to-indigo-800 text-white',
              cardHighlightType === 'stripe_trial' && !buttonDisabled && 'bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white',
              cardHighlightType === 'popular' && !buttonDisabled && 'bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white'
            )}
          >
            {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {buttonText}
          </Button>
        </div>
      </div>
    </div>
  );
}

// --- MODIFIED AdminCouponPanel ---
function AdminCouponPanel() {
  const { user } = useAuth();
  const [generatedStripeLinks, setGeneratedStripeLinks] = useState<{pro: string, premium: string}>({pro: '', premium: ''});
  const [generatedAppTrialLinks, setGeneratedAppTrialLinks] = useState<Record<AppTrialPromoCodeKey, string>>({} as Record<AppTrialPromoCodeKey, string>);
  const [copyStatus, setCopyStatus] = useState<string>('');
  
  const adminEmails = ['adamkiil@outlook.com', 'adamkiil79@gmail.com', 'adamkiil@yahoo.co.uk']; // Make sure these are correct
  const isAdmin = user?.email && adminEmails.includes(user.email);
  
  if (!isAdmin) return null;

  const generateStripeLinks = () => {
    const proLink = generateStripeCouponLink('pro', 'trial');
    const premiumLink = generateStripeCouponLink('premium', 'trial');
    setGeneratedStripeLinks({ pro: proLink, premium: premiumLink });
  };

  const generateAppLinks = () => {
    const links = {} as Record<AppTrialPromoCodeKey, string>;
    (Object.keys(APP_TRIAL_PROMO_CODES) as AppTrialPromoCodeKey[]).forEach(codeKey => {
      if (isValidAppTrialPromoCode(codeKey)) { // Type guard
          links[codeKey] = generateAppTrialLink(codeKey);
      }
    });
    setGeneratedAppTrialLinks(links);
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopyStatus(`${type} link copied!`);
    setTimeout(() => setCopyStatus(''), 2000);
  };

  return (
    <div className="max-w-2xl mx-auto mb-8 p-6 bg-gray-800/30 border border-gray-700/50 rounded-lg backdrop-blur-sm shadow-xl">
      <div className="flex items-center gap-2 mb-4">
        <Gift className="h-5 w-5 text-purple-400" />
        <Typography variant="h3" className="text-lg font-bold text-purple-300">
          Admin: Generate Trial Links
        </Typography>
      </div>
      
      <div className="space-y-6">
        {/* Stripe Coupon Links */}
        <div>
            <h4 className="text-md font-semibold text-gray-200 mb-2">Stripe Trial Links (Card Usually Required)</h4>
            <Button onClick={generateStripeLinks} className="bg-teal-600 hover:bg-teal-700 text-white w-full sm:w-auto">
            <LinkIcon className="mr-2 h-4 w-4" /> Generate Stripe Coupon Links
            </Button>
            {generatedStripeLinks.pro && (
            <div className="mt-3 space-y-3">
                {(Object.keys(generatedStripeLinks) as Array<'pro' | 'premium'>).map(planKey => (
                    <div key={planKey} className="p-3 bg-gray-700/50 rounded border border-gray-600/30">
                        <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-teal-300">{products[planKey].name} Stripe Trial:</span>
                        <Button size="sm" variant="outline" onClick={() => copyToClipboard(generatedStripeLinks[planKey], `${products[planKey].name} Stripe Trial`)} className="border-teal-500 text-teal-300 hover:bg-teal-700/20">
                            <Copy className="h-3 w-3 mr-1" /> Copy
                        </Button>
                        </div>
                        <code className="text-xs text-gray-300 break-all block bg-gray-800/50 p-2 rounded">
                        {generatedStripeLinks[planKey]}
                        </code>
                    </div>
                ))}
            </div>
            )}
        </div>

        {/* App Trial Links (No Card) */}
        <div>
            <h4 className="text-md font-semibold text-gray-200 mb-2">In-App Trial Links (No Card Required)</h4>
            <Button onClick={generateAppLinks} className="bg-indigo-600 hover:bg-indigo-700 text-white w-full sm:w-auto">
            <Zap className="mr-2 h-4 w-4" /> Generate In-App Access Links
            </Button>
            {Object.keys(generatedAppTrialLinks).length > 0 && (
                 <div className="mt-3 space-y-3">
                    {(Object.keys(generatedAppTrialLinks) as AppTrialPromoCodeKey[]).map((codeKey) => (
                        <div key={codeKey} className="p-3 bg-gray-700/50 rounded border border-gray-600/30">
                        <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-indigo-300">{APP_TRIAL_PROMO_CODES[codeKey].description}:</span>
                            <Button size="sm" variant="outline" onClick={() => copyToClipboard(generatedAppTrialLinks[codeKey], APP_TRIAL_PROMO_CODES[codeKey].description)} className="border-indigo-500 text-indigo-300 hover:bg-indigo-700/20">
                            <Copy className="h-3 w-3 mr-1" /> Copy
                            </Button>
                        </div>
                        <code className="text-xs text-gray-300 break-all block bg-gray-800/50 p-2 rounded">
                            {generatedAppTrialLinks[codeKey]}
                        </code>
                        </div>
                    ))}
                </div>
            )}
        </div>

        {copyStatus && (
          <div className="text-sm text-emerald-400 bg-emerald-900/30 p-3 rounded-md text-center">
            ✅ {copyStatus}
          </div>
        )}
        <div className="text-xs text-gray-400 pt-2 border-t border-gray-700/50">
          💡 Stripe links apply coupons for trials (card usually needed). In-App links activate access directly (no card).
        </div>
      </div>
    </div>
  );
}

// --- MODIFIED SubscribePage Component ---
export function SubscribePage() {
  const { session, user, isLoading: isAuthLoading } = useAuth();
  const { currentUserSubscriptionTier, isLoading: isSubscriptionLoading, refreshSubscriptionStatus } = useSubscription();
  const [isYearly, setIsYearly] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false); // Shared processing state
  const navigate = useNavigate();
  const location = useLocation();

  const urlParams = new URLSearchParams(location.search);
  const stripeCouponIdParam = urlParams.get('coupon'); // For Stripe coupons
  const appPromoCodeParam = urlParams.get('promo_code') as AppTrialPromoCodeKey | null; // For app trials
  const planFromUrlParam = urlParams.get('plan') as Exclude<ProductKey, 'free'> | null;

  useEffect(() => {
    if (!isAuthLoading && session) {
      refreshSubscriptionStatus().catch(console.error);
    }
  }, [session, isAuthLoading, refreshSubscriptionStatus]);

  const handleStripeSubscribe = useCallback(async (productKey: Exclude<ProductKey, 'free'>, yearly: boolean, stripeCouponIdForCheckout?: string) => {
    if (!user || !session?.access_token) {
      const loginParams = new URLSearchParams();
      loginParams.set('action', 'login');
      loginParams.set('plan', productKey);
      loginParams.set('yearly', String(yearly));
      if (stripeCouponIdForCheckout) loginParams.set('coupon', stripeCouponIdForCheckout);
      // If an appPromoCode was in URL but user chose Stripe path, don't carry appPromoCode
      navigate(`/login?${loginParams.toString()}`);
      return;
    }
    
    setIsProcessing(true);
    const priceId = getPriceId(productKey, yearly ? 'yearly' : 'monthly');
    const productDetails = getProduct(productKey);
    try {
        const checkoutBody: Record<string, any> = {
            price_id: priceId,
            success_url: `${productDetails.successUrl}&tier=${productKey}`,
            cancel_url: productDetails.cancelUrl,
            mode: 'subscription',
            plan_name: productDetails.name,
            interval: yearly ? 'year' : 'month',
            client_reference_id: user.id 
        };

        if (stripeCouponIdForCheckout) {
            checkoutBody.discounts = [{ coupon: stripeCouponIdForCheckout }];
            checkoutBody.plan_name = `${productDetails.name} (Stripe Trial)`;
            checkoutBody.success_url = `${productDetails.successUrl}&tier=${productKey}&trial=true`;
        }

        const { data, error } = await supabase.functions.invoke('stripe-checkout', {
            body: checkoutBody
        });
        
        if (error) throw error;
        if (data?.url) {
            window.location.href = data.url;
        } else {
            throw new Error('Could not create checkout session.');
        }
    } catch (error: any) {
        console.error('Stripe Subscription error:', error);
        alert(`Stripe Checkout Error: ${error.message || 'Please try again.'}`);
    } finally {
        setIsProcessing(false);
    }
  }, [user, session, navigate, supabase]); // Added supabase to dependencies
  
  const handleActivateAppTrial = useCallback(async (promoCodeToActivate: AppTrialPromoCodeKey) => {
    if (!user || !session?.access_token) {
      const trialDetails = APP_TRIAL_PROMO_CODES[promoCodeToActivate];
      navigate(`/login?action=login&promo_code=${promoCodeToActivate}&plan=${trialDetails.tier}`);
      return;
    }
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('activate-app-trial', {
        body: { promo_code: promoCodeToActivate }
      });

      if (error) {
        throw error; // Let catch block handle it
      }

      if (data) {
        alert(data.message || 'Trial activated successfully!');
        await refreshSubscriptionStatus(); 
        navigate('/companies'); 
      } else {
        throw new Error('Failed to activate trial. No data returned from server.');
      }
    } catch (err: any) {
      console.error('App trial activation error:', err);
      const errorMessage = err.context?.error_description || err.message || 'An unexpected error occurred while activating the trial.';
      alert(`Trial Activation Error: ${errorMessage}`);
    } finally {
      setIsProcessing(false);
    }
  }, [user, session, navigate, refreshSubscriptionStatus, supabase]); // Added supabase

  const isLoading = isAuthLoading || isSubscriptionLoading;
  const currentTier = currentUserSubscriptionTier || 'free';
  const isLoggedIn = !!(session && user);

  // Message for Stripe coupons, only if no app trial is active for the plan via URL
  const getStripeCouponMessage = (productKeyToCheck: Exclude<ProductKey, 'free'>) => {
    if (!stripeCouponIdParam) return '';
    const appTrialForThisPlan = appPromoCodeParam && isValidAppTrialPromoCode(appPromoCodeParam) && APP_TRIAL_PROMO_CODES[appPromoCodeParam].tier === productKeyToCheck;
    if (appTrialForThisPlan) return ''; // App trial takes precedence for display

    const couponName = FREE_TRIAL_COUPONS[stripeCouponIdParam as keyof typeof FREE_TRIAL_COUPONS];
    if (!couponName || (planFromUrlParam && planFromUrlParam !== productKeyToCheck)) return ''; // Only show if coupon targets this plan or all plans
    
    return `Stripe Offer: ${couponName}`;
  };

  return (
    <PageContainer
      title="Choose Your Plan"
      description="Select the perfect plan for your mining analytics needs"
      className="relative min-h-screen w-full overflow-hidden bg-gradient-to-b from-navy-900 via-navy-800 to-navy-900"
    >
      <div className="absolute inset-0 bg-cover bg-center opacity-20 -z-10" style={{ backgroundImage: "url('/Background2.jpg')" }} />
      
      {isLoading && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="text-center p-6 bg-navy-800 rounded-lg shadow-xl">
            <Loader2 className="h-12 w-12 text-teal-400 animate-spin mx-auto" />
            <p className="mt-4 text-white font-semibold">Loading plans & subscription...</p>
          </div>
        </div>
      )}

      <div className="relative z-0 pt-8 pb-12">
        <div className="flex justify-center mb-8"> {/* Billing Toggle */}
          {/* ... Switch for Yearly/Monthly ... */}
        </div>

        <AdminCouponPanel />

        {/* Notification for active URL parameters */}
        {stripeCouponIdParam && !(appPromoCodeParam && isValidAppTrialPromoCode(appPromoCodeParam) && APP_TRIAL_PROMO_CODES[appPromoCodeParam].tier === planFromUrlParam) && (
          <div className="max-w-lg mx-auto mb-8 p-4 bg-emerald-900/40 border border-emerald-600/60 rounded-lg backdrop-blur-sm text-center shadow-lg">
            <div className="text-emerald-300 font-medium">
              🎁 Stripe Trial Coupon <code className="text-xs bg-emerald-700/50 px-1 py-0.5 rounded">{stripeCouponIdParam}</code> applied! Select your plan. (Card may be required)
            </div>
          </div>
        )}
        {appPromoCodeParam && isValidAppTrialPromoCode(appPromoCodeParam) && APP_TRIAL_PROMO_CODES[appPromoCodeParam].tier === planFromUrlParam && (
          <div className="max-w-lg mx-auto mb-8 p-4 bg-purple-900/40 border border-purple-600/60 rounded-lg backdrop-blur-sm text-center shadow-lg">
            <div className="text-purple-300 font-medium">
              <Zap className="inline h-5 w-5 mr-1" /> Special In-App Access Offer <code className="text-xs bg-purple-700/50 px-1 py-0.5 rounded">{appPromoCodeParam}</code> applied! Select the '{APP_TRIAL_PROMO_CODES[appPromoCodeParam].tier}' plan to activate. (No card required)
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 max-w-5xl mx-auto px-4">
          <PlanCard
            isFree
            isYearly={isYearly}
            currentTier={currentTier}
            onSubscribeStripe={handleStripeSubscribe} // Wont be called
            onActivateAppTrial={handleActivateAppTrial} // Wont be called
            isProcessing={isProcessing}
            isLoggedIn={isLoggedIn}
          />
          
          {(['pro', 'premium'] as Exclude<ProductKey, 'free'>[]).map((pKey) => {
            const isAppTrialOfferForThisPlan = !!(appPromoCodeParam && isValidAppTrialPromoCode(appPromoCodeParam) && APP_TRIAL_PROMO_CODES[appPromoCodeParam].tier === pKey);
            const stripeCouponIdForThisPlan = (stripeCouponIdParam && !isAppTrialOfferForThisPlan && (planFromUrlParam === pKey || !planFromUrlParam)) ? stripeCouponIdParam : null;

            return (
              <PlanCard
                key={pKey}
                productKey={pKey}
                isYearly={isYearly}
                currentTier={currentTier}
                onSubscribeStripe={handleStripeSubscribe}
                onActivateAppTrial={handleActivateAppTrial}
                isProcessing={isProcessing}
                isLoggedIn={isLoggedIn}
                
                activeStripeCouponId={stripeCouponIdForThisPlan}
                activeAppPromoCode={isAppTrialOfferForThisPlan ? appPromoCodeParam : null}
                planFromUrl={planFromUrlParam} // Pass this to help PlanCard decide if a general coupon applies

                // For display purposes inside PlanCard (optional, can be derived)
                // stripeCouponMessage={getStripeCouponMessage(pKey)}
                // appTrialDescription={isAppTrialOfferForThisPlan ? APP_TRIAL_PROMO_CODES[appPromoCodeParam!].description : undefined}
              />
            );
          })}
        </div>

        <div className="text-center mt-12 px-4"> {/* Support Section */}
          {/* ... Support email ... */}
        </div>
      </div>
    </PageContainer>
  );
}