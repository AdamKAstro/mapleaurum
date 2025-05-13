//  supabase/functions/stripe-webhook/index.ts
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';
import { Client as SendGridClient } from 'npm:@sendgrid/mail@8.1.3'; // Add SendGrid
// --- Environment Variable Validation & Client Initialization ---
const stripeAPISecret = Deno.env.get('STRIPE_SECRET_KEY');
const stripeWebhookSigningSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
const supabaseAPIUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceRoleAPIKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const sendgridApiKey = Deno.env.get('SENDGRID_API_KEY'); // Add SendGrid key
if (!stripeAPISecret) throw new Error('FATAL: Missing STRIPE_SECRET_KEY environment variable.');
if (!stripeWebhookSigningSecret) throw new Error('FATAL: Missing STRIPE_WEBHOOK_SECRET environment variable.');
if (!supabaseAPIUrl) throw new Error('FATAL: Missing SUPABASE_URL environment variable.');
if (!supabaseServiceRoleAPIKey) throw new Error('FATAL: Missing SUPABASE_SERVICE_ROLE_KEY environment variable.');
if (!sendgridApiKey) throw new Error('FATAL: Missing SENDGRID_API_KEY environment variable.');
const stripe = new Stripe(stripeAPISecret, {
  apiVersion: '2024-06-20',
  typescript: true,
  appInfo: {
    name: 'MapleAurum/stripe-webhook',
    version: '1.0.3'
  }
});
const supabaseAdmin = createClient(supabaseAPIUrl, supabaseServiceRoleAPIKey);
const sgMail = new SendGridClient();
sgMail.setApiKey(sendgridApiKey);
function createStandardResponse(body, status = 200) {
  return new Response(status === 204 ? null : JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json'
    }
  });
}
async function getSupabaseUserIdFromStripeCustomerId(stripeCustomerId) {
  if (!stripeCustomerId) return null;
  const { data: customerMapping, error } = await supabaseAdmin.from('stripe_customers').select('user_id').eq('customer_id', stripeCustomerId).maybeSingle();
  if (error) {
    console.error(`[Webhook] ERROR: DB error fetching user_id for Stripe customer ${stripeCustomerId}:`, error.message);
    return null;
  }
  return customerMapping?.user_id || null;
}
async function syncSubscriptionDataToSupabase(stripeCustomerId, stripeSubscriptionId, knownSupabaseUserId) {
  console.info(`[Webhook] Syncing: StripeSubID: ${stripeSubscriptionId}, StripeCustID: ${stripeCustomerId}, KnownSupabaseUserID: ${knownSupabaseUserId}`);
  try {
    const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId, {
      expand: [
        'items.data.price.product',
        'customer'
      ]
    });
    if (!subscription || !subscription.customer?.id) {
      console.warn(`[Webhook] WARN: Stripe Subscription ${stripeSubscriptionId} or its customer not found/valid during sync.`);
      const { error: updateError } = await supabaseAdmin.from('stripe_subscriptions').update({
        subscription_status: 'unknown_stripe_error',
        updated_at: new Date().toISOString()
      }).eq('subscription_id', stripeSubscriptionId);
      if (updateError) console.error(`[Webhook] ERROR: Failed to mark sub ${stripeSubscriptionId} as unknown:`, updateError.message);
      return;
    }
    const liveStripeCustomerId = subscription.customer.id;
    if (liveStripeCustomerId !== stripeCustomerId) {
      console.warn(`[Webhook] WARN: Mismatch! Event customer ID ${stripeCustomerId} vs Subscription's actual customer ID ${liveStripeCustomerId}. Using actual: ${liveStripeCustomerId}`);
    }
    let supabaseUserIdToUse = knownSupabaseUserId;
    if (!supabaseUserIdToUse) {
      console.info(`[Webhook] INFO: knownSupabaseUserId not provided for sub ${subscription.id}. Attempting lookup via Stripe Customer ID ${liveStripeCustomerId}.`);
      supabaseUserIdToUse = await getSupabaseUserIdFromStripeCustomerId(liveStripeCustomerId);
      if (supabaseUserIdToUse) {
        console.info(`[Webhook] INFO: Found Supabase User ID ${supabaseUserIdToUse} from stripe_customers table for Stripe Customer ${liveStripeCustomerId}.`);
      } else {
        console.warn(`[Webhook] WARN: Could not find Supabase User ID for Stripe Customer ${liveStripeCustomerId} in stripe_customers table.`);
      }
    }
    if (supabaseUserIdToUse && subscription.customer.email) {
      const { error: customerUpsertError } = await supabaseAdmin.from('stripe_customers').upsert({
        user_id: supabaseUserIdToUse,
        customer_id: liveStripeCustomerId,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });
      if (customerUpsertError) {
        console.error(`[Webhook] ERROR: Failed to upsert stripe_customer mapping for user ${supabaseUserIdToUse}, Stripe customer ${liveStripeCustomerId}:`, customerUpsertError.message);
      } else {
        console.info(`[Webhook] INFO: Ensured stripe_customer mapping for user ${supabaseUserIdToUse} and Stripe customer ${liveStripeCustomerId}.`);
      }
    }
    const priceData = subscription.items.data[0]?.price;
    const subscriptionDataForDB = {
      customer_id: liveStripeCustomerId,
      subscription_id: subscription.id,
      price_id: priceData?.id || null,
      subscription_status: subscription.status,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
      updated_at: new Date().toISOString()
    };
    if (supabaseUserIdToUse) {
      subscriptionDataForDB.user_id = supabaseUserIdToUse;
    }
    console.info(`[Webhook] INFO: Upserting subscription ${subscription.id} into DB with data:`, JSON.stringify(subscriptionDataForDB));
    const { error: subUpsertError } = await supabaseAdmin.from('stripe_subscriptions').upsert(subscriptionDataForDB, {
      onConflict: 'subscription_id'
    });
    if (subUpsertError) {
      console.error(`[Webhook] ERROR: Failed to upsert Stripe subscription ${subscription.id} (Supabase User: ${supabaseUserIdToUse || 'N/A'}) into DB:`, subUpsertError.message);
      throw new Error(`Database error syncing subscription: ${subUpsertError.message}`);
    }
    console.info(`[Webhook] INFO: Successfully synced Stripe subscription ${subscription.id} (Supabase User: ${supabaseUserIdToUse || 'N/A'}) to Supabase.`);
  } catch (error) {
    console.error(`[Webhook] ERROR: Overall error in syncSubscriptionDataToSupabase for subscription ${stripeSubscriptionId}:`, error.message, error.stack);
  }
}
async function handleWebhookEvent(event) {
  const eventData = event.data.object;
  switch(event.type){
    case 'checkout.session.completed':
      const session = eventData;
      console.info(`[Webhook] INFO: Handling 'checkout.session.completed' for session ID: ${session.id}`);
      if (session.mode === 'subscription' && session.subscription && session.customer) {
        const supabaseUserIdFromMetadata = session.metadata?.supabaseUserId || null;
        const stripeCustomerId = typeof session.customer === 'string' ? session.customer : session.customer.id;
        const stripeSubscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription.id;
        if (!stripeSubscriptionId) {
          console.error(`[Webhook] ERROR: 'checkout.session.completed' for session ${session.id} is missing subscription ID.`);
          return;
        }
        console.info(`[Webhook] INFO: Checkout for subscription. Supabase User from Metadata: ${supabaseUserIdFromMetadata}, Stripe Customer: ${stripeCustomerId}, Stripe Subscription: ${stripeSubscriptionId}`);
        // Send success email
        const customerEmail = session.customer_details?.email;
        if (customerEmail) {
          try {
            const msg = {
              to: customerEmail,
              from: 'support@mapleaurum.com',
              subject: 'Welcome to MapleAurum!',
              text: `Thank you for subscribing to MapleAurum's ${session.metadata?.planName || 'plan'}! Your account is now active. Visit https://mapleaurum.com/companies to start exploring.`,
              html: `<p>Thank you for subscribing to MapleAurum's <strong>${session.metadata?.planName || 'plan'}</strong>!</p><p>Your account is now active. Visit <a href="https://mapleaurum.com/companies">mapleaurum.com/companies</a> to start exploring.</p>`
            };
            await sgMail.send(msg);
            console.info(`[Webhook] INFO: Success email sent to ${customerEmail} for session ${session.id}`);
          } catch (emailError) {
            console.error(`[Webhook] ERROR: Failed to send success email to ${customerEmail}:`, emailError.message);
          }
        } else {
          console.warn(`[Webhook] WARN: No customer email found in session ${session.id}. Skipping email.`);
        }
        // Sync subscription
        await syncSubscriptionDataToSupabase(stripeCustomerId, stripeSubscriptionId, supabaseUserIdFromMetadata);
      } else {
        console.info(`[Webhook] INFO: Ignoring 'checkout.session.completed' event (mode: ${session.mode}, subscription: ${session.subscription ? 'present' : 'absent'}).`);
      }
      break;
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      const subscription = eventData;
      console.info(`[Webhook] INFO: Handling '${event.type}' for subscription ID: ${subscription.id}`);
      if (!subscription.customer) {
        console.error(`[Webhook] ERROR: Event '${event.type}' for subscription ${subscription.id} is missing customer ID.`);
        return;
      }
      const stripeCustomerIdForSubEvent = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;
      await syncSubscriptionDataToSupabase(stripeCustomerIdForSubEvent, subscription.id);
      break;
    case 'invoice.payment_succeeded':
      const invoice = eventData;
      console.info(`[Webhook] INFO: Handling 'invoice.payment_succeeded' for invoice ID: ${invoice.id}, Subscription ID: ${invoice.subscription}`);
      if (invoice.subscription && invoice.customer) {
        const subId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription.id;
        const custId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer.id;
        await syncSubscriptionDataToSupabase(custId, subId);
      }
      break;
    case 'invoice.payment_failed':
      const failedInvoice = eventData;
      console.warn(`[Webhook] WARN: Handling 'invoice.payment_failed' for invoice ID: ${failedInvoice.id}, Subscription ID: ${failedInvoice.subscription}`);
      if (failedInvoice.subscription && failedInvoice.customer) {
        const subId = typeof failedInvoice.subscription === 'string' ? failedInvoice.subscription : invoice.subscription.id;
        const custId = typeof failedInvoice.customer === 'string' ? invoice.customer : invoice.customer.id;
        await syncSubscriptionDataToSupabase(custId, subId);
      }
      break;
    default:
      console.info(`[Webhook] INFO: Unhandled Stripe event type: ${event.type}`);
  }
}
Deno.serve(async (req)=>{
  console.log(`[stripe-webhook] INFO: Received webhook request: ${req.method} ${req.url}`);
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Stripe-Signature'
      }
    });
  }
  if (req.method !== 'POST') {
    return createStandardResponse({
      error: 'Method Not Allowed. Webhook expects POST.'
    }, 405);
  }
  const signature = req.headers.get('Stripe-Signature');
  if (!signature) {
    console.error('[stripe-webhook] ERROR: Missing Stripe-Signature header.');
    return createStandardResponse({
      error: 'Missing Stripe signature. Ensure webhook is configured correctly.'
    }, 400);
  }
  const requestBodyText = await req.text();
  let stripeEvent;
  try {
    stripeEvent = await stripe.webhooks.constructEventAsync(requestBodyText, signature, stripeWebhookSigningSecret);
    console.info(`[stripe-webhook] INFO: Stripe event (ID: ${stripeEvent.id}, Type: ${stripeEvent.type}) successfully constructed and verified.`);
  } catch (err) {
    console.error('[stripe-webhook] ERROR: Stripe webhook signature verification failed:', err.message);
    return createStandardResponse({
      error: `Webhook signature verification failed: ${err.message}`
    }, 400);
  }
  try {
    EdgeRuntime.waitUntil(handleWebhookEvent(stripeEvent));
    return createStandardResponse({
      received: true,
      eventId: stripeEvent.id
    }, 200);
  } catch (processingError) {
    console.error('[stripe-webhook] ERROR: Error scheduling webhook event processing:', processingError.message);
    return createStandardResponse({
      error: 'Internal error during event scheduling.'
    }, 500);
  }
});
