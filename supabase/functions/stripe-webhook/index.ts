// supabase/functions/stripe-webhook/index.ts
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0'; // Consistent Stripe SDK version
import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2.49.1';

// --- Environment Variable Validation & Client Initialization ---
const stripeAPISecret = Deno.env.get('STRIPE_SECRET_KEY');
const stripeWebhookSigningSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
const supabaseAPIUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceRoleAPIKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!stripeAPISecret) throw new Error('FATAL: Missing STRIPE_SECRET_KEY environment variable.');
if (!stripeWebhookSigningSecret) throw new Error('FATAL: Missing STRIPE_WEBHOOK_SECRET environment variable.');
if (!supabaseAPIUrl) throw new Error('FATAL: Missing SUPABASE_URL environment variable.');
if (!supabaseServiceRoleAPIKey) throw new Error('FATAL: Missing SUPABASE_SERVICE_ROLE_KEY environment variable.');

const stripe = new Stripe(stripeAPISecret, {
  apiVersion: '2024-06-20',
  typescript: true,
  appInfo: { name: 'MapleAurum/stripe-webhook', version: '1.0.2' }, // Incremented version
});
const supabaseAdmin: SupabaseClient = createClient(supabaseAPIUrl, supabaseServiceRoleAPIKey);

function createStandardResponse(body: object | null, status = 200): Response {
  return new Response(status === 204 ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function getSupabaseUserIdFromStripeCustomerId(stripeCustomerId: string): Promise<string | null> {
  if (!stripeCustomerId) return null;
  const { data: customerMapping, error } = await supabaseAdmin
    .from('stripe_customers')
    .select('user_id')
    .eq('customer_id', stripeCustomerId)
    .maybeSingle();
  
  if (error) {
    console.error(`[Webhook] ERROR: DB error fetching user_id for Stripe customer ${stripeCustomerId}:`, error.message);
    return null; // Or throw, depending on how critical this lookup is for subsequent steps
  }
  return customerMapping?.user_id || null;
}

async function syncSubscriptionDataToSupabase(
  stripeCustomerId: string,
  stripeSubscriptionId: string,
  // Explicitly pass supabaseUserId when known (e.g., from checkout session metadata)
  // For other events, we might need to look it up via stripe_customers table
  knownSupabaseUserId?: string | null 
) {
  console.info(`[Webhook] Syncing: StripeSubID: ${stripeSubscriptionId}, StripeCustID: ${stripeCustomerId}, KnownSupabaseUserID: ${knownSupabaseUserId}`);

  try {
    const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId, {
      expand: ['items.data.price.product', 'customer'],
    });

    if (!subscription || !(subscription.customer as Stripe.Customer)?.id) {
      console.warn(`[Webhook] WARN: Stripe Subscription ${stripeSubscriptionId} or its customer not found/valid during sync.`);
      // Optionally mark as deleted or unknown in your DB
      const { error: updateError } = await supabaseAdmin
        .from('stripe_subscriptions')
        .update({ subscription_status: 'unknown_stripe_error', updated_at: new Date().toISOString() })
        .eq('subscription_id', stripeSubscriptionId);
      if (updateError) console.error(`[Webhook] ERROR: Failed to mark sub ${stripeSubscriptionId} as unknown:`, updateError.message);
      return;
    }
    
    const liveStripeCustomerId = (subscription.customer as Stripe.Customer).id;
    if (liveStripeCustomerId !== stripeCustomerId) {
        console.warn(`[Webhook] WARN: Mismatch! Event customer ID ${stripeCustomerId} vs Subscription's actual customer ID ${liveStripeCustomerId}. Using actual: ${liveStripeCustomerId}`);
    }

    let supabaseUserIdToUse = knownSupabaseUserId;
    if (!supabaseUserIdToUse) {
      // If Supabase User ID was not passed (e.g. not from a checkout session with metadata),
      // attempt to find it from our stripe_customers mapping.
      console.info(`[Webhook] INFO: knownSupabaseUserId not provided for sub ${subscription.id}. Attempting lookup via Stripe Customer ID ${liveStripeCustomerId}.`);
      supabaseUserIdToUse = await getSupabaseUserIdFromStripeCustomerId(liveStripeCustomerId);
       if (supabaseUserIdToUse) {
        console.info(`[Webhook] INFO: Found Supabase User ID ${supabaseUserIdToUse} from stripe_customers table for Stripe Customer ${liveStripeCustomerId}.`);
      } else {
        console.warn(`[Webhook] WARN: Could not find Supabase User ID for Stripe Customer ${liveStripeCustomerId} in stripe_customers table.`);
        // This means the subscription exists in Stripe, but we don't have a Supabase user linked to this Stripe customer yet.
        // This is okay if the user will sign up/log in later with an email that Stripe has for this customer.
        // The subscription will be saved without a user_id for now.
      }
    }
    
    // Ensure the stripe_customers table has the mapping if we determined a Supabase User ID.
    // This is especially important if the customer was created in Stripe not via your app's checkout flow.
    if (supabaseUserIdToUse && (subscription.customer as Stripe.Customer).email) {
        const { error: customerUpsertError } = await supabaseAdmin
            .from('stripe_customers')
            .upsert(
                { 
                    user_id: supabaseUserIdToUse, 
                    customer_id: liveStripeCustomerId, 
                    updated_at: new Date().toISOString() 
                },
                { onConflict: 'user_id' } 
            );
        if (customerUpsertError) {
            console.error(`[Webhook] ERROR: Failed to upsert stripe_customer mapping for user ${supabaseUserIdToUse}, Stripe customer ${liveStripeCustomerId}:`, customerUpsertError.message);
        } else {
             console.info(`[Webhook] INFO: Ensured stripe_customer mapping for user ${supabaseUserIdToUse} and Stripe customer ${liveStripeCustomerId}.`);
        }
    }


    const priceData = subscription.items.data[0]?.price;
    const subscriptionDataForDB: any = { // Use 'any' temporarily for conditional user_id
      // user_id: supabaseUserIdToUse, // Will be added conditionally
      customer_id: liveStripeCustomerId, // Use customer ID from the retrieved subscription object
      subscription_id: subscription.id,
      price_id: priceData?.id || null,
      subscription_status: subscription.status,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
      updated_at: new Date().toISOString(),
    };

    if (supabaseUserIdToUse) {
      subscriptionDataForDB.user_id = supabaseUserIdToUse;
    } else {
      // If your table's user_id column is NOT NULL and has no default,
      // this upsert will fail. Ensure your DB schema handles nullable user_id
      // or you have a default/placeholder if a user link isn't immediately available.
      // Given the ALTER TABLE made it nullable, this is fine.
      console.warn(`[Webhook] WARN: Proceeding to upsert subscription ${subscription.id} without a Supabase user_id link.`);
    }
    
    // Add created_at only on insert, not on update, if your table doesn't auto-set it.
    // The upsert will handle this if 'subscription_id' is the conflict target.
    // For 'created_at', often DB default is preferred or handle it in the upsert logic if needed.
    // The provided SQL schema sets a default for created_at.

    console.info(`[Webhook] INFO: Upserting subscription ${subscription.id} into DB with data:`, JSON.stringify(subscriptionDataForDB));
    const { error: subUpsertError } = await supabaseAdmin
      .from('stripe_subscriptions')
      .upsert(subscriptionDataForDB, { onConflict: 'subscription_id' });

    if (subUpsertError) {
      console.error(`[Webhook] ERROR: Failed to upsert Stripe subscription ${subscription.id} (Supabase User: ${supabaseUserIdToUse || 'N/A'}) into DB:`, subUpsertError.message);
      throw new Error(`Database error syncing subscription: ${subUpsertError.message}`);
    }

    console.info(`[Webhook] INFO: Successfully synced Stripe subscription ${subscription.id} (Supabase User: ${supabaseUserIdToUse || 'N/A'}) to Supabase.`);

  } catch (error: any) {
    console.error(`[Webhook] ERROR: Overall error in syncSubscriptionDataToSupabase for subscription ${stripeSubscriptionId}:`, error.message, error.stack);
  }
}

async function handleWebhookEvent(event: Stripe.Event) {
  const eventData = event.data.object as any;

  switch (event.type) {
    case 'checkout.session.completed':
      const session = eventData as Stripe.Checkout.Session;
      console.info(`[Webhook] INFO: Handling 'checkout.session.completed' for session ID: ${session.id}`);
      if (session.mode === 'subscription' && session.subscription && session.customer) {
        // CRITICAL: Extract supabaseUserId from metadata set by your stripe-checkout function
        const supabaseUserIdFromMetadata = session.metadata?.supabaseUserId || null;
        const stripeCustomerId = typeof session.customer === 'string' ? session.customer : session.customer.id;
        const stripeSubscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription.id;
        
        if (!stripeSubscriptionId) {
            console.error(`[Webhook] ERROR: 'checkout.session.completed' for session ${session.id} is missing subscription ID.`);
            return;
        }

        console.info(`[Webhook] INFO: Checkout for subscription. Supabase User from Metadata: ${supabaseUserIdFromMetadata}, Stripe Customer: ${stripeCustomerId}, Stripe Subscription: ${stripeSubscriptionId}`);
        // Pass supabaseUserIdFromMetadata to ensure it's used if available
        await syncSubscriptionDataToSupabase(stripeCustomerId, stripeSubscriptionId, supabaseUserIdFromMetadata);
      } else {
        console.info(`[Webhook] INFO: Ignoring 'checkout.session.completed' event (mode: ${session.mode}, subscription: ${session.subscription ? 'present' : 'absent'}).`);
      }
      break;

    case 'customer.subscription.created': // Usually follows checkout.session.completed if it's a new sub
    case 'customer.subscription.updated': // Handles plan changes, upgrades, downgrades, renewals
    case 'customer.subscription.deleted': // Handles cancellations (immediate or at period end), non-payment
      const subscription = eventData as Stripe.Subscription;
      console.info(`[Webhook] INFO: Handling '${event.type}' for subscription ID: ${subscription.id}`);
      if (!subscription.customer) {
          console.error(`[Webhook] ERROR: Event '${event.type}' for subscription ${subscription.id} is missing customer ID.`);
          return;
      }
      const stripeCustomerIdForSubEvent = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;
      // For these events, supabaseUserId might not be in event metadata directly.
      // syncSubscriptionDataToSupabase will attempt to look it up via stripe_customers table.
      await syncSubscriptionDataToSupabase(stripeCustomerIdForSubEvent, subscription.id);
      break;
    
    case 'invoice.payment_succeeded':
      const invoice = eventData as Stripe.Invoice;
      console.info(`[Webhook] INFO: Handling 'invoice.payment_succeeded' for invoice ID: ${invoice.id}, Subscription ID: ${invoice.subscription}`);
      if (invoice.subscription && invoice.customer) {
        const subId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription.id;
        const custId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer.id;
        // Re-sync subscription to update status or period dates if they changed.
        // The supabaseUserId will be looked up by syncSubscriptionDataToSupabase if not directly available.
        await syncSubscriptionDataToSupabase(custId, subId);
      }
      break;

    case 'invoice.payment_failed':
      const failedInvoice = eventData as Stripe.Invoice;
      console.warn(`[Webhook] WARN: Handling 'invoice.payment_failed' for invoice ID: ${failedInvoice.id}, Subscription ID: ${failedInvoice.subscription}`);
      if (failedInvoice.subscription && failedInvoice.customer) {
        const subId = typeof failedInvoice.subscription === 'string' ? failedInvoice.subscription : failedInvoice.subscription.id;
        const custId = typeof failedInvoice.customer === 'string' ? failedInvoice.customer : failedInvoice.customer.id;
        // The subscription status (e.g., 'past_due') should be updated by 'customer.subscription.updated' event.
        // Here you might trigger a notification to the user.
        // You can also re-sync to ensure your DB has the latest status from Stripe.
        await syncSubscriptionDataToSupabase(custId, subId);
      }
      break;

    default:
      console.info(`[Webhook] INFO: Unhandled Stripe event type: ${event.type}`);
  }
}

Deno.serve(async (req: Request) => {
  console.log(`[stripe-webhook] INFO: Received webhook request: ${req.method} ${req.url}`);
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Stripe-Signature' }});
  }
  if (req.method !== 'POST') {
    return createStandardResponse({ error: 'Method Not Allowed. Webhook expects POST.' }, 405);
  }

  const signature = req.headers.get('Stripe-Signature');
  if (!signature) {
    console.error('[stripe-webhook] ERROR: Missing Stripe-Signature header.');
    return createStandardResponse({ error: 'Missing Stripe signature. Ensure webhook is configured correctly.' }, 400);
  }

  const requestBodyText = await req.text();

  let stripeEvent: Stripe.Event;
  try {
    stripeEvent = await stripe.webhooks.constructEventAsync(
      requestBodyText,
      signature,
      stripeWebhookSigningSecret
    );
    console.info(`[stripe-webhook] INFO: Stripe event (ID: ${stripeEvent.id}, Type: ${stripeEvent.type}) successfully constructed and verified.`);
  } catch (err: any) {
    console.error('[stripe-webhook] ERROR: Stripe webhook signature verification failed:', err.message);
    return createStandardResponse({ error: `Webhook signature verification failed: ${err.message}` }, 400);
  }

  try {
    EdgeRuntime.waitUntil(handleWebhookEvent(stripeEvent));
    return createStandardResponse({ received: true, eventId: stripeEvent.id }, 200);
  } catch (processingError: any) {
    console.error('[stripe-webhook] ERROR: Error scheduling webhook event processing:', processingError.message);
    return createStandardResponse({ error: 'Internal error during event scheduling.' }, 500);
  }
});