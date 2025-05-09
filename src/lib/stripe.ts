// src/lib/stripe.ts
import { supabase } from './supabaseClient';

type SubscriptionStatusData = {
  customer_id: string | null;
  subscription_id: string | null;
  subscription_status: string | null;
  price_id: string | null;
  current_period_start?: number | null;
  current_period_end?: number | null;
  cancel_at_period_end?: boolean | null;
  payment_method_brand?: string | null;
  payment_method_last4?: string | null;
} | null;

type OrderHistoryItem = {
  id: number | string;
  customer_id: string | null;
  order_id: string | null;
  amount: number | null;
  currency: string | null;
  order_date: string | null;
  status: string | null;
};

export async function createCheckoutSession(
  priceId: string,
  mode: 'subscription' | 'payment',
  successUrl: string,
  cancelUrl: string
): Promise<string> {
  console.log('[createCheckoutSession] Creating session for priceId:', priceId);
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.access_token) {
      console.error('[createCheckoutSession] No valid session:', sessionError);
      throw new Error('User must be logged in to create a checkout session.');
    }

    const bodyPayload = {
      price_id: priceId,
      mode,
      success_url: successUrl,
      cancel_url: cancelUrl,
    };
    console.log('[createCheckoutSession] Invoking stripe-checkout with:', bodyPayload);

    const { data, error: invokeError } = await supabase.functions.invoke('stripe-checkout', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
      body: bodyPayload,
    });

    if (invokeError) {
      console.error('[createCheckoutSession] Edge Function error:', invokeError);
      let details = invokeError.message;
      if ('context' in invokeError && invokeError.context && 'message' in invokeError.context) {
        details = `${invokeError.message} - ${invokeError.context.message}`;
      }
      throw new Error(`Subscription service error: ${details}`);
    }

    if (!data?.url) {
      console.error('[createCheckoutSession] No checkout URL:', data);
      throw new Error('Subscription service did not return a checkout URL.');
    }

    console.log('[createCheckoutSession] Checkout URL:', data.url);
    return data.url;
  } catch (error: unknown) {
    console.error('[createCheckoutSession] Error:', error);
    throw new Error(
      error instanceof Error ? error.message : 'Failed to create checkout session.'
    );
  }
}

export async function getSubscriptionStatus(): Promise<SubscriptionStatusData> {
  try {
    console.log('[getSubscriptionStatus] Fetching status...');
    const { data, error } = await supabase
      .from('stripe_user_subscriptions')
      .select('customer_id, subscription_id, subscription_status, price_id')
      .maybeSingle();

    if (error) {
      console.error('[getSubscriptionStatus] Database error:', error);
      throw new Error(`Database error: ${error.message}`);
    }

    console.log('[getSubscriptionStatus] Status:', data);
    return data as SubscriptionStatusData;
  } catch (error: unknown) {
    console.error('[getSubscriptionStatus] Error:', error);
    throw new Error(
      error instanceof Error ? error.message : 'Failed to fetch subscription status.'
    );
  }
}

export async function getOrderHistory(): Promise<OrderHistoryItem[]> {
  try {
    console.log('[getOrderHistory] Fetching history...');
    const { data, error } = await supabase
      .from('stripe_user_orders')
      .select('id, customer_id, order_id, amount, currency, order_date, status')
      .order('order_date', { ascending: false });

    if (error) {
      console.error('[getOrderHistory] Database error:', error);
      throw new Error(`Database error: ${error.message}`);
    }

    console.log('[getOrderHistory] Items:', data?.length || 0);
    return (data as OrderHistoryItem[]) || [];
  } catch (error: unknown) {
    console.error('[getOrderHistory] Error:', error);
    throw new Error(
      error instanceof Error ? error.message : 'Failed to fetch order history.'
    );
  }
}