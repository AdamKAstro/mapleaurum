import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

// --- Environment Variables ---
const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY');
const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!stripeSecret || !stripeWebhookSecret || !supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Missing required environment variables: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, SUPABASE_URL, or SUPABASE_SERVICE_ROLE_KEY');
}

// --- Initialize Clients ---
const stripe = new Stripe(stripeSecret, {
  apiVersion: '2024-06-20',
  appInfo: {
    name: 'MapleAurum Subscription Webhook',
    version: '1.0.0',
  },
});

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

// --- CORS Helper ---
function createCorsResponse(body: object | null, status = 200): Response {
  const headers = {
    'Access-Control-Allow-Origin': Deno.env.get('FRONTEND_URL') || 'https://mapleaurum.com',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type, stripe-signature',
    'Content-Type': 'application/json',
    'Vary': 'Origin',
  };

  if (status === 204) {
    return new Response(null, { status, headers });
  }

  return new Response(JSON.stringify(body), { status, headers });
}

// --- Main Webhook Handler ---
Deno.serve(async (req) => {
  try {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      console.info('Handling OPTIONS preflight request');
      return createCorsResponse(null, 204);
    }

    if (req.method !== 'POST') {
      console.warn(`Received non-POST request: ${req.method}`);
      return createCorsResponse({ error: 'Method Not Allowed' }, 405);
    }

    // Get and verify signature
    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      console.error('No stripe-signature header provided');
      return createCorsResponse({ error: 'No signature provided' }, 400);
    }

    // Get raw body
    const body = await req.text();

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, stripeWebhookSecret);
      console.info(`Received Stripe event: ${event.type} (ID: ${event.id})`);
    } catch (error: any) {
      console.error(`Webhook signature verification failed: ${error.message}`);
      return createCorsResponse({ error: `Webhook signature verification failed: ${error.message}` }, 400);
    }

    // Process event asynchronously
    EdgeRuntime.waitUntil(handleEvent(event));

    return createCorsResponse({ received: true }, 200);
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    return createCorsResponse({ error: `Internal server error: ${error.message}` }, 500);
  }
});

// --- Event Handler ---
async function handleEvent(event: Stripe.Event) {
  const stripeData = event?.data?.object ?? {};

  if (!stripeData || !('customer' in stripeData)) {
    console.warn(`No customer data in event: ${event.type}`);
    return;
  }

  const { customer: customerId } = stripeData as Stripe.Checkout.Session;

  if (!customerId || typeof customerId !== 'string') {
    console.error(`Invalid customer ID in event: ${event.type}`);
    return;
  }

  // Handle subscription-related events
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = stripeData as Stripe.Checkout.Session;
      if (session.mode !== 'subscription') {
        console.info(`Ignoring non-subscription checkout session: ${session.id}`);
        return;
      }

      console.info(`Processing subscription checkout session for customer: ${customerId}`);
      await syncCustomerFromStripe(customerId);
      // Analytics tracking (pseudo-code, implement with your analytics provider)
      // analytics.track('Subscription Checkout Completed', { customerId, subscriptionId: session.subscription });
      break;
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      console.info(`Processing subscription event: ${event.type} for customer: ${customerId}`);
      await syncCustomerFromStripe(customerId);
      break;
    }

    default:
      console.info(`Unhandled event type: ${event.type}`);
  }
}

// --- Sync Subscription Data ---
async function syncCustomerFromStripe(customerId: string) {
  try {
    // Fetch latest subscription data from Stripe
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 1,
      status: 'all',
      expand: ['data.default_payment_method'],
    });

    if (subscriptions.data.length === 0) {
      console.info(`No subscriptions found for customer: ${customerId}`);
      const { error } = await supabase
        .from('stripe_subscriptions')
        .upsert(
          {
            customer_id: customerId,
            subscription_status: 'not_started',
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'customer_id' }
        );

      if (error) {
        console.error(`Error updating subscription status to not_started: ${error.message}`);
        throw new Error('Failed to update subscription status in database');
      }
      return;
    }

    // Process the latest subscription
    const subscription = subscriptions.data[0];
    const { error } = await supabase
      .from('stripe_subscriptions')
      .upsert(
        {
          customer_id: customerId,
          subscription_id: subscription.id,
          price_id: subscription.items.data[0]?.price.id || null,
          subscription_status: subscription.status,
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          cancel_at_period_end: subscription.cancel_at_period_end,
          payment_method_brand:
            subscription.default_payment_method &&
            typeof subscription.default_payment_method !== 'string'
              ? subscription.default_payment_method.card?.brand ?? null
              : null,
          payment_method_last4:
            subscription.default_payment_method &&
            typeof subscription.default_payment_method !== 'string'
              ? subscription.default_payment_method.card?.last4 ?? null
              : null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'customer_id' }
      );

    if (error) {
      console.error(`Error syncing subscription for customer ${customerId}: ${error.message}`);
      throw new Error('Failed to sync subscription in database');
    }

    console.info(`Successfully synced subscription ${subscription.id} for customer: ${customerId}`);
  } catch (error: any) {
    console.error(`Failed to sync subscription for customer ${customerId}: ${error.message}`);
    throw error;
  }
}