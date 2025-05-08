//supabase/functions/stripe-webhook/index.ts
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2.49.1';

// --- Environment Variable Validation ---
const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY');
const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const frontendUrl = Deno.env.get('FRONTEND_URL') ?? 'https://mapleaurum.com';

if (!stripeSecret) throw new Error('Missing environment variable: STRIPE_SECRET_KEY');
if (!stripeWebhookSecret) throw new Error('Missing environment variable: STRIPE_WEBHOOK_SECRET');
if (!supabaseUrl) throw new Error('Missing environment variable: SUPABASE_URL');
if (!supabaseServiceRoleKey) throw new Error('Missing environment variable: SUPABASE_SERVICE_ROLE_KEY');

// --- Initialize Clients ---
const stripe = new Stripe(stripeSecret, {
  apiVersion: '2024-06-20',
  typescript: true,
  appInfo: {
    name: 'MapleAurum Subscription Webhook',
    version: '1.0.0',
  },
});

const supabaseAdmin: SupabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey);

// --- CORS Helper ---
function createCorsResponse(body: object | null, status = 200): Response {
  const headers = {
    'Access-Control-Allow-Origin': frontendUrl,
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
  console.log(`[stripe-webhook] Received request: ${req.method} ${req.url}`);

  try {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      console.info('[stripe-webhook] Handling OPTIONS preflight request');
      return createCorsResponse(null, 204);
    }

    if (req.method !== 'POST') {
      console.warn(`[stripe-webhook] Received non-POST request: ${req.method}`);
      return createCorsResponse({ error: 'Method Not Allowed' }, 405);
    }

    // Get and verify signature
    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      console.error('[stripe-webhook] No stripe-signature header provided');
      return createCorsResponse({ error: 'No signature provided' }, 400);
    }

    // Get raw body
    const body = await req.text();
    console.log('[stripe-webhook] Raw request body length:', body.length);

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, stripeWebhookSecret);
      console.info(`[stripe-webhook] Received Stripe event: ${event.type} (ID: ${event.id})`);
    } catch (error: any) {
      console.error(`[stripe-webhook] Webhook signature verification failed: ${error.message}`);
      return createCorsResponse({ error: `Webhook signature verification failed: ${error.message}` }, 400);
    }

    // Process event asynchronously
    EdgeRuntime.waitUntil(handleEvent(event));

    return createCorsResponse({ received: true }, 200);
  } catch (error: any) {
    console.error('[stripe-webhook] Error processing webhook:', error);
    return createCorsResponse({ error: `Internal server error: ${error.message}` }, 500);
  }
});

// --- Event Handler ---
async function handleEvent(event: Stripe.Event) {
  const stripeData = event?.data?.object ?? {};

  if (!stripeData || !('customer' in stripeData)) {
    console.warn(`[stripe-webhook] No customer data in event: ${event.type}`);
    return;
  }

  const { customer: customerId } = stripeData as Stripe.Checkout.Session;

  if (!customerId || typeof customerId !== 'string') {
    console.error(`[stripe-webhook] Invalid customer ID in event: ${event.type}`);
    return;
  }

  // Validate customer existence in Stripe
  try {
    await stripe.customers.retrieve(customerId);
    console.info(`[stripe-webhook] Confirmed customer ${customerId} exists in Stripe`);
  } catch (error: any) {
    if (error.code === 'resource_missing') {
      console.error(`[stripe-webhook] Customer ${customerId} not found in Stripe for event: ${event.type}`);
      // Update stripe_subscriptions to reflect invalid customer
      const { error: updateError } = await supabaseAdmin
        .from('stripe_subscriptions')
        .update({
          subscription_status: 'invalid_customer',
          updated_at: new Date().toISOString(),
        })
        .eq('customer_id', customerId);
      if (updateError) {
        console.error(`[stripe-webhook] Failed to update subscription status for invalid customer ${customerId}:`, updateError);
      }
      return;
    }
    console.error(`[stripe-webhook] Error verifying customer ${customerId}:`, error);
    throw error;
  }

  // Handle subscription-related events
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = stripeData as Stripe.Checkout.Session;
      if (session.mode !== 'subscription') {
        console.info(`[stripe-webhook] Ignoring non-subscription checkout session: ${session.id}`);
        return;
      }
      console.info(`[stripe-webhook] Processing subscription checkout session for customer: ${customerId}`);
      await syncCustomerFromStripe(customerId);
      break;
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      console.info(`[stripe-webhook] Processing subscription event: ${event.type} for customer: ${customerId}`);
      await syncCustomerFromStripe(customerId);
      break;
    }

    default:
      console.info(`[stripe-webhook] Unhandled event type: ${event.type}`);
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
      console.info(`[stripe-webhook] No subscriptions found for customer: ${customerId}`);
      const { error } = await supabaseAdmin
        .from('stripe_subscriptions')
        .upsert(
          {
            customer_id: customerId,
            subscription_status: 'not_started',
            updated_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
          },
          { onConflict: 'customer_id' }
        );

      if (error) {
        console.error(`[stripe-webhook] Error updating subscription status to not_started for customer ${customerId}:`, error);
        throw new Error('Failed to update subscription status in database');
      }
      return;
    }

    // Process the latest subscription
    const subscription = subscriptions.data[0];
    const { error } = await supabaseAdmin
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
            subscription.default_payment_method && typeof subscription.default_payment_method !== 'string'
              ? subscription.default_payment_method.card?.brand ?? null
              : null,
          payment_method_last4:
            subscription.default_payment_method && typeof subscription.default_payment_method !== 'string'
              ? subscription.default_payment_method.card?.last4 ?? null
              : null,
          updated_at: new Date().toISOString(),
          created_at: new Date().toISOString(), // Set on insert, preserved on update
        },
        { onConflict: 'customer_id' }
      );

    if (error) {
      console.error(`[stripe-webhook] Error syncing subscription for customer ${customerId}:`, error);
      throw new Error('Failed to sync subscription in database');
    }

    console.info(`[stripe-webhook] Successfully synced subscription ${subscription.id} for customer: ${customerId}`);
  } catch (error: any) {
    console.error(`[stripe-webhook] Failed to sync subscription for customer ${customerId}:`, error);
    throw error;
  }
}