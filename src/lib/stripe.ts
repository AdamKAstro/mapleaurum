// src/lib/stripe.ts
import { supabase } from './supabaseClient';

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
): Promise<string> { // Return type is string (the URL)
  console.log('[createCheckoutSession] Attempting to create session...');
  try {
    // 1. Get current session for auth token
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

    // 2. Prepare payload for Edge Function
    const bodyPayload = {
        price_id: priceId,
        mode,
        success_url: successUrl,
        cancel_url: cancelUrl,
    };
    console.log('[createCheckoutSession] Invoking stripe-checkout Edge Function with body:', bodyPayload);

    // 3. Invoke the Edge Function
    // --- CHANGED: Pass bodyPayload object directly ---
    const { data, error: invokeError } = await supabase.functions.invoke('stripe-checkout', {
      method: 'POST', // Explicitly set method
      headers: {
        // 'Content-Type': 'application/json', // Let the client set this based on the body type
        Authorization: `Bearer ${session.access_token}`,
      },
      body: bodyPayload, // Pass the object directly
    });
    // --- END CHANGE ---

    // 4. Handle Edge Function errors
    if (invokeError) {
      console.error('[createCheckoutSession] Edge Function invocation error:', invokeError);
      let details = invokeError.message;
      if (invokeError instanceof Error && 'context' in invokeError && typeof invokeError.context === 'object' && invokeError.context !== null && 'message' in invokeError.context) {
          details = `${invokeError.message} - ${invokeError.context.message}`;
      }
      // Check specifically for 400 errors which might indicate validation failure inside the function
      if (details.toLowerCase().includes('non-2xx status code') && invokeError.context?.status === 400) {
          details += " (Check Edge Function logs for validation errors on received data)";
      }
      throw new Error(`Subscription service error: ${details}`);
    }

    // 5. Handle missing URL in response
    if (!data?.url) {
      console.error('[createCheckoutSession] No checkout URL in Edge Function response:', data);
      throw new Error('Subscription service did not return a checkout URL.');
    }

    // 6. Return the checkout URL
    console.log('[createCheckoutSession] Success, received checkout URL.');
    return data.url;

  } catch (error: unknown) { // Catch unknown type
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
    const { data, error } = await supabase
      .from('stripe_user_subscriptions') // Querying the view
      .select(`
        customer_id,
        subscription_id,
        subscription_status,
        price_id
      `) // Selecting only essential columns for tier check
      .maybeSingle(); // Expect 0 or 1 row due to RLS/view logic

    if (error) {
      console.error('[getSubscriptionStatus] Database query error:', error);
      throw new Error(`Database error fetching subscription: ${error.message}`);
    }

    console.log('[getSubscriptionStatus] Raw subscription status data:', data);
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