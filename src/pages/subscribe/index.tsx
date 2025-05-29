// src/pages/subscribe/index.tsx - FIXED VERSION (No public trial buttons)
import React, { useState, useEffect } from 'react';
import { Star, Crown, Check, Loader2, Gift, Link as LinkIcon, Copy } from 'lucide-react';
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
  generateCouponLink,
  FREE_TRIAL_COUPONS,
  type ProductKey,
  type SubscriptionTier 
} from '../../stripe-config';

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
  productKey?: ProductKey;
  isFree?: boolean;
  isYearly: boolean;
  currentTier: SubscriptionTier;
  onSubscribe: (productKey: ProductKey, isYearly: boolean, couponId?: string) => void;
  isProcessing: boolean;
  isLoggedIn: boolean;
  hasCoupon?: boolean;
  couponMessage?: string;
}

function PlanCard({ 
  productKey, 
  isFree = false, 
  isYearly, 
  currentTier, 
  onSubscribe, 
  isProcessing, 
  isLoggedIn,
  hasCoupon = false,
  couponMessage
}: PlanCardProps) {
  const navigate = useNavigate();
  
  // Free plan card
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
            onClick={() => isLoggedIn ? undefined : navigate('/login?action=signup&plan=free')}
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
  const isCurrentPlan = currentTier === productKey;
  const canUpgrade = currentTier === 'free' || (currentTier === 'pro' && productKey === 'premium');
  
  let buttonText = `Get ${product.name}`;
  let buttonDisabled = isProcessing;
  let buttonAction = () => onSubscribe(productKey, isYearly);
  
  if (isCurrentPlan) {
    buttonText = 'Current Plan';
    buttonDisabled = true;
    buttonAction = () => {};
  } else if (!canUpgrade) {
    buttonText = 'Manage Subscription';
    buttonDisabled = true;  
    buttonAction = () => {};
  } else if (!isLoggedIn) {
    buttonText = `Sign Up for ${product.name}`;
    buttonAction = () => navigate(`/login?action=signup&plan=${productKey}&yearly=${isYearly}`);
  }

  // ✅ Special coupon handling
  if (hasCoupon && canUpgrade) {
    buttonText = `Get ${product.name} - FREE TRIAL!`;
    if (!isLoggedIn) {
      buttonText = `Sign Up for FREE ${product.name}!`;
    }
  }

  const Icon = productKey === 'pro' ? Star : Crown;
  const isPopular = product.popular;

  return (
    <div className={cn(
      'relative transform transition-all duration-300 hover:scale-[1.015] flex',
      isPopular && 'shadow-cyan-900/20 shadow-lg',
      hasCoupon && 'ring-2 ring-emerald-500 shadow-emerald-500/20'
    )}>
      {isPopular && !hasCoupon && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 transform z-10">
          <span className="inline-flex items-center rounded-full bg-gradient-to-r from-teal-500 to-cyan-600 px-3 py-0.5 text-xs font-semibold text-white shadow-sm">
            Most Popular
          </span>
        </div>
      )}

      {hasCoupon && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 transform z-10">
          <span className="inline-flex items-center rounded-full bg-gradient-to-r from-emerald-500 to-green-600 px-3 py-0.5 text-xs font-semibold text-white shadow-sm">
            🎁 FREE TRIAL
          </span>
        </div>
      )}
      
      <div className={cn(
        'relative flex flex-col h-full rounded-xl border p-6 w-full backdrop-blur-sm',
        isPopular && !hasCoupon ? 'bg-navy-700/50 border-cyan-700/50' : 'bg-navy-800/60 border-navy-700/50',
        hasCoupon && 'bg-emerald-900/20 border-emerald-600/50'
      )}>
        <div className="flex items-center gap-3 mb-4">
          <Icon className={cn('h-7 w-7', productKey === 'premium' ? 'text-accent-yellow' : 'text-accent-teal')} />
          <h3 className={cn('text-lg font-semibold', isPopular || hasCoupon ? 'text-cyan-300' : 'text-white')}>
            {product.name}
          </h3>
        </div>
        
        <div className="mt-2 flex items-baseline gap-x-1">
          <span className={cn(
            'text-3xl font-bold tracking-tight',
            hasCoupon ? 'line-through text-gray-400' : 'text-white'
          )}>
            ${price.amount}
          </span>
          <span className="text-sm font-semibold leading-6 text-gray-400">
            /{price.interval}
          </span>
          {hasCoupon && (
            <div className="ml-2">
              <span className="text-3xl font-bold tracking-tight text-emerald-400">FREE</span>
              <div className="text-xs text-emerald-300">for 1 month</div>
            </div>
          )}
        </div>
        
        {savings && !hasCoupon && (
          <div className="mt-2 text-sm text-emerald-400 font-medium">
            Save ${savings.amount} ({savings.percentage}%) yearly
          </div>
        )}
        
        {couponMessage && (
          <div className="mt-2 text-sm text-emerald-300 font-medium bg-emerald-900/30 p-2 rounded">
            🎁 {couponMessage}
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
            variant={isCurrentPlan || buttonDisabled ? 'secondary' : (hasCoupon ? 'default' : (isPopular ? 'primary' : 'outline'))}
            className={cn(
              'w-full font-semibold',
              buttonDisabled && 'opacity-60 cursor-not-allowed',
              hasCoupon && !isCurrentPlan && !buttonDisabled && 'bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white',
              isPopular && !hasCoupon && !isCurrentPlan && !buttonDisabled && 'bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white'
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

// ✅ Admin panel for generating coupon links
function AdminCouponPanel() {
  const { user } = useAuth();
  const [generatedLinks, setGeneratedLinks] = useState<{pro: string, premium: string}>({pro: '', premium: ''});
  const [copyStatus, setCopyStatus] = useState<string>('');
  
  // ✅ FIXED: Check admin emails properly
  const adminEmails = ['adamkiil@outlook.com', 'adamkiil79@gmail.com', 'adamkiil@yahoo.co.uk'];
  const isAdmin = user?.email && adminEmails.includes(user.email);
  
  if (!isAdmin) return null;

  const generateLinks = () => {
    const proLink = generateCouponLink('pro', 'trial');
    const premiumLink = generateCouponLink('premium', 'trial');
    setGeneratedLinks({ pro: proLink, premium: premiumLink });
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopyStatus(`${type} link copied!`);
    setTimeout(() => setCopyStatus(''), 2000);
  };

  return (
    <div className="max-w-2xl mx-auto mb-8 p-6 bg-purple-900/20 border border-purple-600/50 rounded-lg backdrop-blur-sm">
      <div className="flex items-center gap-2 mb-4">
        <Gift className="h-5 w-5 text-purple-400" />
        <Typography variant="h3" className="text-lg font-bold text-purple-300">
          Admin: Generate Free Trial Links
        </Typography>
      </div>
      
      <div className="space-y-4">
        <Button
          onClick={generateLinks}
          className="bg-purple-600 hover:bg-purple-700 text-white"
        >
          <LinkIcon className="mr-2 h-4 w-4" />
          Generate Trial Links
        </Button>

        {generatedLinks.pro && (
          <div className="space-y-3">
            <div className="p-3 bg-navy-800/60 rounded border border-purple-500/30">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-purple-300">Pro Trial Link:</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(generatedLinks.pro, 'Pro')}
                  className="border-purple-500 text-purple-300 hover:bg-purple-900/20"
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Copy
                </Button>
              </div>
              <code className="text-xs text-gray-300 break-all block bg-navy-900/50 p-2 rounded">
                {generatedLinks.pro}
              </code>
            </div>

            <div className="p-3 bg-navy-800/60 rounded border border-purple-500/30">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-purple-300">Premium Trial Link:</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(generatedLinks.premium, 'Premium')}
                  className="border-purple-500 text-purple-300 hover:bg-purple-900/20"
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Copy
                </Button>
              </div>
              <code className="text-xs text-gray-300 break-all block bg-navy-900/50 p-2 rounded">
                {generatedLinks.premium}
              </code>
            </div>
          </div>
        )}

        {copyStatus && (
          <div className="text-sm text-emerald-400 bg-emerald-900/30 p-2 rounded">
            ✅ {copyStatus}
          </div>
        )}

        <div className="text-xs text-gray-400">
          💡 Share these links with testers to give them free 1-month trials. The coupon will be applied automatically.
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

  // ✅ Check for coupon in URL parameters
  const urlParams = new URLSearchParams(location.search);
  const couponId = urlParams.get('coupon');
  const planFromUrl = urlParams.get('plan') as ProductKey | null;
  const isAdminAccess = urlParams.get('admin') === 'true';

  useEffect(() => {
    if (!isAuthLoading && session) {
      refreshSubscriptionStatus().catch(console.error);
    }
  }, [session, isAuthLoading, refreshSubscriptionStatus]);

  // Regular subscription checkout
  const handleSubscribe = async (productKey: ProductKey, yearly: boolean, applyCouponId?: string) => {
    if (!user || !session?.access_token) {
      // Preserve coupon in login redirect
      const loginUrl = couponId 
        ? `/login?action=login&plan=${productKey}&yearly=${yearly}&coupon=${couponId}`
        : `/login?action=login&plan=${productKey}&yearly=${yearly}`;
      navigate(loginUrl);
      return;
    }

    setIsProcessing(true);
    
    const priceId = getPriceId(productKey, yearly ? 'yearly' : 'monthly');
    const product = getProduct(productKey);
    
    try {
      const checkoutBody: any = {
        price_id: priceId,
        success_url: `${product.successUrl}&tier=${productKey}`,
        cancel_url: product.cancelUrl,
        mode: 'subscription',
        plan_name: product.name,
        interval: yearly ? 'year' : 'month'
      };

      // ✅ Apply coupon if provided
      if (applyCouponId || couponId) {
        checkoutBody.coupon_id = applyCouponId || couponId;
        checkoutBody.plan_name = `${product.name} (Free Trial)`;
        checkoutBody.success_url = `${product.successUrl}&tier=${productKey}&trial=true`;
      }

      const { data, error } = await supabase.functions.invoke('stripe-checkout', {
        body: checkoutBody
      });

      if (error) {
        console.error('Checkout error:', error);
        alert(`Checkout failed: ${error.message || 'Please try again'}`);
        return;
      }

      if (data?.url) {
        window.location.href = data.url;
      } else {
        alert('Could not create checkout session. Please try again.');
      }
    } catch (error: any) {
      console.error('Subscription error:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const isLoading = isAuthLoading || isSubscriptionLoading;
  const currentTier = currentUserSubscriptionTier || 'free';
  const isLoggedIn = !!(session && user);

  // ✅ Determine which plan has the coupon applied
  const getCouponMessage = (productKey: ProductKey) => {
    if (!couponId) return '';
    
    const couponName = FREE_TRIAL_COUPONS[couponId as keyof typeof FREE_TRIAL_COUPONS];
    if (!couponName) return '';
    
    return `Special offer: ${couponName}`;
  };

  return (
    <PageContainer
      title="Choose Your Plan"
      description="Select the perfect plan for your mining analytics needs"
      className="relative min-h-screen w-full overflow-hidden bg-gradient-to-b from-navy-900 via-navy-800 to-navy-900"
    >
      <div className="absolute inset-0 bg-cover bg-center opacity-20 -z-10" 
           style={{ backgroundImage: "url('/Background2.jpg')" }} />
      
      {isLoading && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="text-center">
            <Loader2 className="h-12 w-12 text-white animate-spin mx-auto" />
            <p className="mt-4 text-white">Loading plans...</p>
          </div>
        </div>
      )}

      <div className="relative z-0 pt-8 pb-12">
        {/* Billing Toggle */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center space-x-3 p-2 bg-navy-900/40 rounded-lg backdrop-blur-sm">
            <Label className="text-white">Monthly</Label>
            <Switch 
              checked={isYearly} 
              onCheckedChange={setIsYearly}
              disabled={isLoading || isProcessing}
            />
            <Label className="text-white">
              Yearly <span className="text-emerald-400 text-sm font-medium">(Save up to 27%)</span>
            </Label>
          </div>
        </div>

        {/* ✅ Admin Panel - Only for admins */}
        <AdminCouponPanel />

        {/* Coupon notification */}
        {couponId && (
          <div className="max-w-md mx-auto mb-8 p-4 bg-emerald-900/30 border border-emerald-600/50 rounded-lg backdrop-blur-sm text-center">
            <div className="text-emerald-300 font-medium">
              🎁 You have a special offer! Select your plan below to activate your free trial.
            </div>
          </div>
        )}

        {/* Plans Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 max-w-5xl mx-auto px-4">
          <PlanCard
            isFree
            isYearly={isYearly}
            currentTier={currentTier}
            onSubscribe={handleSubscribe}
            isProcessing={isProcessing}
            isLoggedIn={isLoggedIn}
          />
          
          <PlanCard
            productKey="pro"
            isYearly={isYearly}
            currentTier={currentTier}
            onSubscribe={handleSubscribe}
            isProcessing={isProcessing}
            isLoggedIn={isLoggedIn}
            hasCoupon={!!(couponId && (planFromUrl === 'pro' || !planFromUrl))}
            couponMessage={getCouponMessage('pro')}
          />
          
          <PlanCard
            productKey="premium"
            isYearly={isYearly}
            currentTier={currentTier}
            onSubscribe={handleSubscribe}
            isProcessing={isProcessing}
            isLoggedIn={isLoggedIn}
            hasCoupon={!!(couponId && (planFromUrl === 'premium' || !planFromUrl))}
            couponMessage={getCouponMessage('premium')}
          />
        </div>

        {/* Support Section */}
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