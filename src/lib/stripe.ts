// src/lib/stripe.ts
import { supabase } from './supabaseClient';
// Removed: import type { Database } from './database.types';

// Define the expected shape using basic types
type SubscriptionStatusData = {
    customer_id: string | null;
    subscription_id: string | null;
    subscription_status: string | null; // Using string | null instead of specific enum
    price_id: string | null;
    current_period_start?: number | null;
    current_period_end?: number | null;
    cancel_at_period_end?: boolean | null;
    payment_method_brand?: string | null;
    payment_method_last4?: string | null;
} | null;

type OrderHistoryItem = {
    id: number | string; // Allow string if it might be UUID
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
  console.log('[createCheckoutSession] Attempting to create session...');
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.error('[createCheckoutSession] Session retrieval error:', sessionError);
      throw new Error(`Authentication error: ${sessionError.message}`);
    }
    if (!session?.access_token) {
      console.error('[createCheckoutSession] No valid session or access token found.');
      throw new Error('User must be logged in to create a checkout session.');
    }
    console.log('[createCheckoutSession] Session retrieved successfully.');

    const bodyPayload = {
        price_id: priceId,
        mode,
        success_url: successUrl,
        cancel_url: cancelUrl,
    };
    console.log('[createCheckoutSession] Invoking stripe-checkout Edge Function with body:', bodyPayload);

    const { data, error: invokeError } = await supabase.functions.invoke('stripe-checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(bodyPayload),
    });

    if (invokeError) {
      console.error('[createCheckoutSession] Edge Function invocation error:', invokeError);
      let details = invokeError.message;
      // Supabase FunctionError often has more details in context
      if (invokeError instanceof Error && 'context' in invokeError && typeof invokeError.context === 'object' && invokeError.context !== null && 'message' in invokeError.context) {
          details = `${invokeError.message} - ${invokeError.context.message}`;
      }
      throw new Error(`Subscription service error: ${details}`);
    }

    if (!data?.url) {
      console.error('[createCheckoutSession] No checkout URL in Edge Function response:', data);
      throw new Error('Subscription service did not return a checkout URL.');
    }

    console.log('[createCheckoutSession] Success, received checkout URL.');
    return data.url;

  } catch (error: unknown) {
    console.error('[createCheckoutSession] Unexpected error:', error);
    if (error instanceof Error) {
        throw new Error(error.message || 'Failed to create checkout session due to an unexpected error.');
    } else {
        throw new Error('Failed to create checkout session due to an unexpected error.');
    }
  }
}

export async function getSubscriptionStatus(): Promise<SubscriptionStatusData> {
  try {
    console.log('[getSubscriptionStatus] Fetching subscription status from view...');
    // Select the specific columns needed by SubscriptionProvider
    const { data, error } = await supabase
      .from('stripe_user_subscriptions') // Querying the view
      .select(`
        customer_id,
        subscription_id,
        subscription_status,
        price_id
      `) // Selecting only essential columns for tier check
      .maybeSingle();

    if (error) {
      console.error('[getSubscriptionStatus] Database query error:', error);
      throw new Error(`Database error fetching subscription: ${error.message}`);
    }

    console.log('[getSubscriptionStatus] Raw subscription status data:', data);
    // No specific casting needed now, but ensure the shape matches SubscriptionStatusData
    return data as SubscriptionStatusData;

  } catch (error: unknown) {
    console.error('[getSubscriptionStatus] Error fetching subscription status:', error);
     if (error instanceof Error) {
        throw new Error(error.message || 'Failed to fetch subscription status due to an unexpected error.');
    } else {
        throw new Error('Failed to fetch subscription status due to an unexpected error.');
    }
  }
}

export async function getOrderHistory(): Promise<OrderHistoryItem[]> {
  try {
    console.log('[getOrderHistory] Fetching order history...');
    const { data, error } = await supabase
      .from('stripe_user_orders') // Ensure this view/table exists and has RLS
      .select(`
        id,
        customer_id,
        order_id,
        amount,
        currency,
        order_date,
        status
      `) // Select relevant columns
      .order('order_date', { ascending: false });

    if (error) {
      console.error('[getOrderHistory] Database query error:', error);
      throw new Error(`Database error fetching order history: ${error.message}`);
    }

    console.log(`[getOrderHistory] Found ${data?.length ?? 0} order history items.`);
    return (data as OrderHistoryItem[]) ?? []; // Return data or empty array

  } catch (error: unknown) {
    console.error('[getOrderHistory] Error fetching order history:', error);
     if (error instanceof Error) {
        throw new Error(error.message || 'Failed to fetch order history due to an unexpected error.');
    } else {
        throw new Error('Failed to fetch order history due to an unexpected error.');
    }
  }
}
