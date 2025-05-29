// src/pages/subscribe/index.tsx - COMPLETE WORKING VERSION
import React, { useState, useEffect } from 'react';
import { Star, Crown, Check, Loader2, Gift } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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
  onSubscribe: (productKey: ProductKey, isYearly: boolean) => void;
  onFreeTrialSubscribe?: (productKey: ProductKey, isYearly: boolean, couponId: string) => void;
  isProcessing: boolean;
  isLoggedIn: boolean;
}

function PlanCard({ 
  productKey, 
  isFree = false, 
  isYearly, 
  currentTier, 
  onSubscribe, 
  onFreeTrialSubscribe,
  isProcessing, 
  isLoggedIn 
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

  const Icon = productKey === 'pro' ? Star : Crown;
  const isPopular = product.popular;

  return (
    <div className={cn('relative transform transition-all duration-300 hover:scale-[1.015] flex', isPopular && 'shadow-cyan-900/20 shadow-lg')}>
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 transform z-10">
          <span className="inline-flex items-center rounded-full bg-gradient-to-r from-teal-500 to-cyan-600 px-3 py-0.5 text-xs font-semibold text-white shadow-sm">
            Most Popular
          </span>
        </div>
      )}
      
      <div className={cn(
        'relative flex flex-col h-full rounded-xl border p-6 w-full backdrop-blur-sm',
        isPopular ? 'bg-navy-700/50 border-cyan-700/50' : 'bg-navy-800/60 border-navy-700/50'
      )}>
        <div className="flex items-center gap-3 mb-4">
          <Icon className={cn('h-7 w-7', productKey === 'premium' ? 'text-accent-yellow' : 'text-accent-teal')} />
          <h3 className={cn('text-lg font-semibold', isPopular ? 'text-cyan-300' : 'text-white')}>
            {product.name}
          </h3>
        </div>
        
        <div className="mt-2 flex items-baseline gap-x-1">
          <span className="text-3xl font-bold tracking-tight text-white">
            ${price.amount}
          </span>
          <span className="text-sm font-semibold leading-6 text-gray-400">
            /{price.interval}
          </span>
        </div>
        
        {savings && (
          <div className="mt-2 text-sm text-emerald-400 font-medium">
            Save ${savings.amount} ({savings.percentage}%) yearly
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
        
        <div className="mt-8 space-y-2">
          <Button
            onClick={buttonAction}
            disabled={buttonDisabled}
            size="lg"
            variant={isCurrentPlan || buttonDisabled ? 'secondary' : (isPopular ? 'primary' : 'outline')}
            className={cn(
              'w-full font-semibold',
              buttonDisabled && 'opacity-60 cursor-not-allowed',
              isPopular && !isCurrentPlan && !buttonDisabled && 'bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white'
            )}
          >
            {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {buttonText}
          </Button>

          {/* Free trial button for testing */}
          {canUpgrade && isLoggedIn && onFreeTrialSubscribe && (
            <Button
              onClick={() => {
                const couponId = productKey === 'pro' ? 'PRO_TRIAL_1M' : 'PREMIUM_TRIAL_1M';
                onFreeTrialSubscribe(productKey, isYearly, couponId);
              }}
              disabled={buttonDisabled}
              size="sm"
              variant="outline"
              className="w-full text-xs border-emerald-500 text-emerald-400 hover:bg-emerald-900/20"
            >
              Try Free for 1 Month
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// Admin free trial section
function FreeTrialSection() {
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [isGranting, setIsGranting] = useState(false);
  const [message, setMessage] = useState('');
  
  const grantFreeTrial = async () => {
    if (!email) return;
    
    setIsGranting(true);
    try {
      // This would call your admin function - for now just show message
      setMessage(`✅ Would grant free Premium trial to ${email} (admin function not implemented yet)`);
      setEmail('');
    } catch (err: any) {
      setMessage(`❌ Error: ${err.message}`);
    } finally {
      setIsGranting(false);
    }
  };

  // Only show to admin users
  if (user?.email !== 'adamkiil@outlook.com' && user?.email !== 'adamkiil79@gmail.com') {
    return null;
  }

  return (
    <div className="max-w-md mx-auto mb-8 p-6 bg-emerald-700/20 border border-emerald-600/50 rounded-lg backdrop-blur-sm">
      <div className="flex items-center gap-2 mb-4">
        <Gift className="h-5 w-5 text-emerald-400" />
        <Typography variant="h3" className="text-lg font-bold text-emerald-300">
          Admin: Grant Free Trial
        </Typography>
      </div>
      
      {message && (
        <div className={cn(
          'mb-4 p-2 rounded text-sm',
          message.startsWith('✅') ? 'bg-emerald-900/30 text-emerald-300' : 'bg-red-900/30 text-red-300'
        )}>
          {message}
        </div>
      )}
      
      <div className="flex gap-2">
        <input
          type="email"
          placeholder="User email for free trial"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1 px-3 py-2 bg-navy-600/80 border border-navy-500 rounded text-white placeholder-gray-400 text-sm"
        />
        <Button
          onClick={grantFreeTrial}
          disabled={isGranting || !email}
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          {isGranting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Grant'}
        </Button>
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

  useEffect(() => {
    if (!isAuthLoading && session) {
      refreshSubscriptionStatus().catch(console.error);
    }
  }, [session, isAuthLoading, refreshSubscriptionStatus]);

  // Regular subscription checkout
  const handleSubscribe = async (productKey: ProductKey, yearly: boolean) => {
    if (!user || !session?.access_token) {
      navigate(`/login?action=login&plan=${productKey}&yearly=${yearly}`);
      return;
    }

    setIsProcessing(true);
    
    const priceId = getPriceId(productKey, yearly ? 'yearly' : 'monthly');
    const product = getProduct(productKey);
    
    try {
      const { data, error } = await supabase.functions.invoke('stripe-checkout', {
        body: {
          price_id: priceId,
          success_url: `${product.successUrl}&tier=${productKey}`,
          cancel_url: product.cancelUrl,
          mode: 'subscription',
          plan_name: product.name,
          interval: yearly ? 'year' : 'month'
        }
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

  // ✅ FREE TRIAL CHECKOUT - This is where you use coupons!
  const handleFreeTrialSubscribe = async (productKey: ProductKey, yearly: boolean, couponId: string) => {
    if (!user || !session?.access_token) {
      navigate(`/login?action=login&plan=${productKey}&yearly=${yearly}`);
      return;
    }

    setIsProcessing(true);
    
    const priceId = getPriceId(productKey, yearly ? 'yearly' : 'monthly');
    const product = getProduct(productKey);
    
    try {
      const { data, error } = await supabase.functions.invoke('stripe-checkout', {
        body: {
          price_id: priceId,
          success_url: `${product.successUrl}&tier=${productKey}&trial=true`,
          cancel_url: product.cancelUrl,
          mode: 'subscription',
          plan_name: `${product.name} (Free Trial)`,
          interval: yearly ? 'year' : 'month',
          coupon_id: couponId  // ✅ This applies the 100% off coupon
        }
      });

      if (error) {
        console.error('Free trial checkout error:', error);
        alert(`Free trial setup failed: ${error.message || 'Please try again'}`);
        return;
      }

      if (data?.url) {
        window.location.href = data.url;
      } else {
        alert('Could not create free trial session. Please try again.');
      }
    } catch (error: any) {
      console.error('Free trial error:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const isLoading = isAuthLoading || isSubscriptionLoading;
  const currentTier = currentUserSubscriptionTier || 'free';
  const isLoggedIn = !!(session && user);

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

        {/* Admin Free Trial Section */}
        <FreeTrialSection />

        {/* Plans Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 max-w-5xl mx-auto px-4">
          <PlanCard
            isFree
            isYearly={isYearly}
            currentTier={currentTier}
            onSubscribe={handleSubscribe}
            onFreeTrialSubscribe={handleFreeTrialSubscribe}
            isProcessing={isProcessing}
            isLoggedIn={isLoggedIn}
          />
          
          <PlanCard
            productKey="pro"
            isYearly={isYearly}
            currentTier={currentTier}
            onSubscribe={handleSubscribe}
            onFreeTrialSubscribe={handleFreeTrialSubscribe}
            isProcessing={isProcessing}
            isLoggedIn={isLoggedIn}
          />
          
          <PlanCard
            productKey="premium"
            isYearly={isYearly}
            currentTier={currentTier}
            onSubscribe={handleSubscribe}
            onFreeTrialSubscribe={handleFreeTrialSubscribe}
            isProcessing={isProcessing}
            isLoggedIn={isLoggedIn}
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