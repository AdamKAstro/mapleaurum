// src/pages/subscribe/index.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { Star, Crown, Check, Loader2, Gift, Link as LinkIcon, Copy, Zap } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Typography } from '../../components/ui/typography';
import { PageContainer } from '../../components/ui/page-container';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { useAuth } from '../../contexts/auth-context';
import { useSubscription } from '../../contexts/subscription-context';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabaseClient';
import { 
  products, 
  getPriceId, 
  getProduct, 
  getPrice,
  getYearlySavings,
  generateStripeCouponLink,
  FREE_TRIAL_COUPONS,
  APP_TRIAL_PROMO_CODES,
  isValidAppTrialPromoCode,
  generateAppTrialLink,
  type AppTrialPromoCodeKey,
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
  tier: 'free' as const,
  price: { amount: 0, currency: 'CAD' }
};

interface PlanCardProps {
  productKey?: Exclude<ProductKey, 'free'>; // Product key for Pro or Premium
  isFree?: boolean; // True if this is the Free plan card
  isYearly: boolean;
  currentTier: SubscriptionTier;
  onSubscribeStripe: (productKey: Exclude<ProductKey, 'free'>, isYearly: boolean, stripeCouponId?: string) => void;
  onActivateAppTrial: (promoCode: AppTrialPromoCodeKey) => Promise<void>;
  isProcessing: boolean; // Global processing state
  isLoggedIn: boolean;
  
  // Props passed down from SubscribePage based on URL params
  activeStripeCouponIdForThisPlan?: string | null; // Stripe coupon ID if URL targets this plan
  activeAppPromoCodeForThisPlan?: AppTrialPromoCodeKey | null; // App promo code if URL targets this plan
  planFromUrl?: string | null; // Add this missing prop
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
  activeStripeCouponIdForThisPlan,
  activeAppPromoCodeForThisPlan,
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

  if (!productKey) return null; // Should only be called for Pro or Premium
  
  const product = getProduct(productKey);
  const price = getPrice(productKey, isYearly ? 'yearly' : 'monthly');
  const savings = isYearly ? getYearlySavings(productKey) : null;
  
  const isCurrentActivePlan = currentTier === productKey;
  const canUpgradeGenerally = !isCurrentActivePlan && (currentTier === 'free' || (currentTier === 'pro' && productKey === 'premium'));

  const appTrialDetails = activeAppPromoCodeForThisPlan ? APP_TRIAL_PROMO_CODES[activeAppPromoCodeForThisPlan] : null;
  const stripeCouponDetailsText = activeStripeCouponIdForThisPlan ? FREE_TRIAL_COUPONS[activeStripeCouponIdForThisPlan] : null;

  let buttonText = `Get ${product.name}`;
  let buttonAction: () => void = () => onSubscribeStripe(productKey, isYearly);
  let buttonDisabled = isProcessing || isCurrentActivePlan;
  let buttonVariant: any = product.popular ? 'primary' : 'outline';
  let showPrice = true;
  let cardHighlightType: 'none' | 'popular' | 'stripe_trial' | 'app_trial' = product.popular ? 'popular' : 'none';
  let displayMessage: string | null = null;

  if (appTrialDetails && canUpgradeGenerally) {
    buttonText = `Activate ${appTrialDetails.description}`;
    buttonAction = () => onActivateAppTrial(activeAppPromoCodeForThisPlan!);
    buttonVariant = 'default'; 
    showPrice = false;
    cardHighlightType = 'app_trial';
    if (!isLoggedIn) {
        buttonText = `Sign Up for ${appTrialDetails.description}`;
        buttonAction = () => navigate(`/login?action=signup&plan=${productKey}&yearly=${isYearly}&promo_code=${activeAppPromoCodeForThisPlan}`);
    }
  } else if (stripeCouponDetailsText && canUpgradeGenerally) {
    buttonText = `Get ${product.name} with ${stripeCouponDetailsText}`;
    buttonAction = () => onSubscribeStripe(productKey, isYearly, activeStripeCouponIdForThisPlan!);
    buttonVariant = 'default'; 
    cardHighlightType = 'stripe_trial';
    displayMessage = `🎁 Stripe Offer: ${stripeCouponDetailsText}`;
    if (!isLoggedIn) {
        buttonText = `Sign Up for FREE ${product.name}! (${stripeCouponDetailsText})`;
        buttonAction = () => navigate(`/login?action=signup&plan=${productKey}&yearly=${isYearly}&coupon=${activeStripeCouponIdForThisPlan}`);
    }
  } else if (isCurrentActivePlan) {
    buttonText = 'Current Plan';
    buttonDisabled = true;
    buttonVariant = 'secondary';
    cardHighlightType = 'none';
  } else if (!canUpgradeGenerally) {
    buttonText = 'Manage Subscription';
    buttonDisabled = true; 
    buttonAction = () => navigate('/account');
    buttonVariant = 'secondary';
    cardHighlightType = 'none';
  } else if (!isLoggedIn) {
    buttonText = `Sign Up for ${product.name}`;
    buttonAction = () => navigate(`/login?action=signup&plan=${productKey}&yearly=${isYearly}`);
  }
  // Default for logged-in user, no special offers, upgradable:
  // buttonText, buttonAction, buttonVariant already set.

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
            (cardHighlightType !== 'none') ? 'text-cyan-300' : 'text-white' // Simplified highlighting
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
        
        {savings && cardHighlightType !== 'app_trial' && cardHighlightType !== 'stripe_trial' && (
          <div className="mt-2 text-sm text-emerald-400 font-medium">
            Save ${savings.amount} ({savings.percentage}%) yearly
          </div>
        )}
        
        {/* Display message for Stripe coupon if applicable */}
        {displayMessage && cardHighlightType === 'stripe_trial' && (
          <div className="mt-2 text-sm text-emerald-300 font-medium bg-emerald-900/30 p-2 rounded">
            {displayMessage}
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

function AdminCouponPanel() {
  const { user } = useAuth();
  const [generatedStripeLinks, setGeneratedStripeLinks] = useState<{pro: string, premium: string}>({pro: '', premium: ''});
  const [generatedAppTrialLinks, setGeneratedAppTrialLinks] = useState<Record<AppTrialPromoCodeKey, string>>({} as Record<AppTrialPromoCodeKey, string>); // Corrected type
  const [copyStatus, setCopyStatus] = useState<string>('');
  
  const adminEmails = ['adamkiil@outlook.com', 'adamkiil79@gmail.com', 'adamkiil@yahoo.co.uk'];
  const isAdmin = user?.email && adminEmails.includes(user.email);
  
  if (!isAdmin) return null;

  const generateStripeLinks = () => {
    const proLink = generateStripeCouponLink('pro', 'trial');
    const premiumLink = generateStripeCouponLink('premium', 'trial');
    setGeneratedStripeLinks({ pro: proLink, premium: premiumLink });
  };

  const generateAppLinks = () => {
    const links = {} as Record<AppTrialPromoCodeKey, string>; // Corrected type
    (Object.keys(APP_TRIAL_PROMO_CODES) as AppTrialPromoCodeKey[]).forEach(codeKey => {
      if (isValidAppTrialPromoCode(codeKey)) { 
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
        <div>
            <h4 className="text-md font-semibold text-gray-200 mb-2">Stripe Trial Links (Card Usually Required)</h4>
            <Button onClick={generateStripeLinks} className="bg-teal-600 hover:bg-teal-700 text-white w-full sm:w-auto">
            <LinkIcon className="mr-2 h-4 w-4" /> Generate Stripe Coupon Links
            </Button>
            {generatedStripeLinks.pro && (
            <div className="mt-3 space-y-3">
                {(['pro', 'premium'] as const).map(planKey => ( // Use 'as const' for literal types
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

export function SubscribePage() {
  const { session, user, isLoading: isAuthLoading } = useAuth();
  const { currentUserSubscriptionTier, isLoading: isSubscriptionLoading, refreshSubscriptionStatus } = useSubscription();
  const [isYearly, setIsYearly] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const urlParams = new URLSearchParams(location.search);
  const stripeCouponIdParam = urlParams.get('coupon');
  const appPromoCodeParam = urlParams.get('promo_code') as AppTrialPromoCodeKey | null;
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

        const { data, error } = await supabase.functions.invoke('stripe-checkout', { body: checkoutBody });
        
        if (error) throw error;
        if (data?.url) {
            window.location.href = data.url;
        } else {
            throw new Error('Could not create Stripe checkout session.');
        }
    } catch (error: any) {
        console.error('Stripe Subscription error:', error);
        alert(`Stripe Checkout Error: ${error.message || 'Please try again.'}`);
    } finally {
        setIsProcessing(false);
    }
  }, [user, session, navigate]); 
  
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

      if (error) throw error; 

      if (data && data.message) { // Check if data and data.message exist
        alert(data.message);
        await refreshSubscriptionStatus(); 
        navigate('/companies'); 
      } else {
        // Handle case where data might be null or message is missing but no error thrown
        console.warn('App trial activation returned no specific message, but no error. Data:', data);
        alert('Trial processed. Please check your account.'); // Generic success
        await refreshSubscriptionStatus();
        navigate('/companies');
      }
    } catch (err: any) {
      console.error('App trial activation error:', err);
      const functionError = err.context?.body?.error || err.context?.body?.details || err.message;
      const displayMessage = typeof functionError === 'string' ? functionError : 'An unexpected error occurred while activating the trial.';
      alert(`Trial Activation Error: ${displayMessage}`);
    } finally {
      setIsProcessing(false);
    }
  }, [user, session, navigate, refreshSubscriptionStatus]);

  const isLoading = isAuthLoading || isSubscriptionLoading;
  const currentTier = currentUserSubscriptionTier || 'free';
  const isLoggedIn = !!(session && user);

  const appTrialOfferForPage = (appPromoCodeParam && isValidAppTrialPromoCode(appPromoCodeParam) && APP_TRIAL_PROMO_CODES[appPromoCodeParam].tier === planFromUrlParam)
    ? APP_TRIAL_PROMO_CODES[appPromoCodeParam]
    : null;

  const stripeCouponOfferForPage = (stripeCouponIdParam && !(appTrialOfferForPage && appTrialOfferForPage.tier === planFromUrlParam))
    ? FREE_TRIAL_COUPONS[stripeCouponIdParam as keyof typeof FREE_TRIAL_COUPONS] 
    : null;

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
        <div className="flex justify-center mb-8">
           <div className="flex items-center space-x-3 p-2 bg-navy-900/40 rounded-lg backdrop-blur-sm">
             <Label htmlFor="billing-cycle-toggle" className={cn("text-white", isYearly && "text-gray-400")}>Monthly</Label>
             <Switch 
               id="billing-cycle-toggle"
               checked={isYearly} 
               onCheckedChange={setIsYearly}
               disabled={isLoading || isProcessing}
             />
             <Label htmlFor="billing-cycle-toggle" className={cn("text-white", !isYearly && "text-gray-400")}>
               Yearly <span className="text-emerald-400 text-sm font-medium">(Save up to 27%)</span>
             </Label>
           </div>
        </div>

        <AdminCouponPanel />

        {stripeCouponOfferForPage && (
          <div className="max-w-lg mx-auto mb-8 p-4 bg-emerald-900/40 border border-emerald-600/60 rounded-lg backdrop-blur-sm text-center shadow-lg">
            <div className="text-emerald-300 font-medium">
              🎁 Stripe Trial Offer: {stripeCouponOfferForPage} for <code className="text-xs bg-emerald-700/50 px-1 py-0.5 rounded">{planFromUrlParam || "selected plan"}</code>! (Card may be required)
            </div>
          </div>
        )}
        {appTrialOfferForPage && (
          <div className="max-w-lg mx-auto mb-8 p-4 bg-purple-900/40 border border-purple-600/60 rounded-lg backdrop-blur-sm text-center shadow-lg">
            <div className="text-purple-300 font-medium">
              <Zap className="inline h-5 w-5 mr-1" /> Special Offer: {appTrialOfferForPage.description} for the '{appTrialOfferForPage.tier}' plan! (No card required)
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 max-w-5xl mx-auto px-4">
          <PlanCard
            isFree
            isYearly={isYearly}
            currentTier={currentTier}
            onSubscribeStripe={handleStripeSubscribe}
            onActivateAppTrial={handleActivateAppTrial}
            isProcessing={isProcessing}
            isLoggedIn={isLoggedIn}
          />
          
          {(Object.keys(products) as Array<Exclude<ProductKey, 'free'>>).map((pKey) => {
            const isAppTrialActiveForThisPlanCard = !!(appPromoCodeParam && isValidAppTrialPromoCode(appPromoCodeParam) && APP_TRIAL_PROMO_CODES[appPromoCodeParam].tier === pKey);
            const stripeCouponActiveForThisPlanCard = (stripeCouponIdParam && !isAppTrialActiveForThisPlanCard && (planFromUrlParam === pKey || !planFromUrlParam)) ? stripeCouponIdParam : null;

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
                activeStripeCouponIdForThisPlan={stripeCouponActiveForThisPlanCard}
                activeAppPromoCodeForThisPlan={isAppTrialActiveForThisPlanCard ? appPromoCodeParam : null}
                planFromUrl={planFromUrlParam}
              />
            );
          })}
        </div>

        <div className="text-center mt-12 px-4">
          <Typography variant="body" className="text-gray-300">
            Need help choosing? Contact us at{' '}
            <a href="mailto:support@mapleaurum.com" className="text-cyan-400 hover:underline">
              support@mapleaurum.com
            </a>
          </Typography>
        </div>
      </div>
    </PageContainer>
  );
}