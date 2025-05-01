// src/lib/stripe.ts
import { supabase } from './supabaseClient';
import { products } from '../stripe-config';

export async function createCheckoutSession(
  priceId: string,
  mode: 'subscription' | 'payment',
  successUrl: string,
  cancelUrl: string
) {
  try {
    const { data, error } = await supabase.functions.invoke('stripe-checkout', {
      body: {
        price_id: priceId,
        mode,
        success_url: successUrl,
        cancel_url: cancelUrl,
      },
    });

    if (error) throw error;
    if (!data?.url) throw new Error('No checkout URL returned');

    return data.url;
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    throw new Error(error.message || 'Failed to create checkout session');
  }
}

export async function getSubscriptionStatus() {
  try {
    const { data, error } = await supabase
      .from('stripe_user_subscriptions')
      .select('*')
      .maybeSingle();

    if (error) throw error;

    return data;
  } catch (error: any) {
    console.error('Error fetching subscription status:', error);
    throw new Error(error.message || 'Failed to fetch subscription status');
  }
}

export async function getOrderHistory() {
  try {
    const { data, error } = await supabase
      .from('stripe_user_orders')
      .select('*')
      .order('order_date', { ascending: false });

    if (error) throw error;

    return data;
  } catch (error: any) {
    console.error('Error fetching order history:', error);
    throw new Error(error.message || 'Failed to fetch order history');
  }
}