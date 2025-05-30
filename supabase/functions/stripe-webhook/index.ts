import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';
import sgMail from 'npm:@sendgrid/mail@8.1.3'; // <-- ADDED THIS IMPORT
// --- Environment Configuration & Validation ---
const STRIPE_MODE_ENV = Deno.env.get('STRIPE_MODE')?.toLowerCase() || 'live'; // Default to 'live' for safety
const logPrefix = `[stripe-webhook][${STRIPE_MODE_ENV.toUpperCase()}]`;
console.log(`${logPrefix} INFO: Function initializing in '${STRIPE_MODE_ENV}' mode.`);
const LIVE_STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY');
const TEST_STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEYT');
const LIVE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET');
const TEST_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET_TEST');
const STRIPE_API_KEY_TO_USE = STRIPE_MODE_ENV === 'test' ? TEST_STRIPE_SECRET_KEY : LIVE_STRIPE_SECRET_KEY;
const WEBHOOK_SIGNING_SECRET_TO_USE = STRIPE_MODE_ENV === 'test' ? TEST_WEBHOOK_SECRET : LIVE_WEBHOOK_SECRET;
const supabaseAPIUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceRoleAPIKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const sendgridApiKey = Deno.env.get('SENDGRID_API_KEY');
if (!STRIPE_API_KEY_TO_USE) {
  throw new Error(`${logPrefix} FATAL: Stripe API secret key for mode '${STRIPE_MODE_ENV}' is MISSING. Ensure STRIPE_SECRET_KEY (for live) or STRIPE_SECRET_KEYT (for test) is configured.`);
}
if (!WEBHOOK_SIGNING_SECRET_TO_USE) {
  throw new Error(`${logPrefix} FATAL: Stripe webhook signing secret for mode '${STRIPE_MODE_ENV}' is MISSING. Ensure STRIPE_WEBHOOK_SECRET (for live) or STRIPE_WEBHOOK_SECRET_TEST (for test) is set.`);
}
if (!supabaseAPIUrl) throw new Error(`${logPrefix} FATAL: Missing SUPABASE_URL env variable.`);
if (!supabaseServiceRoleAPIKey) throw new Error(`${logPrefix} FATAL: Missing SUPABASE_SERVICE_ROLE_KEY env variable.`);
// --- Initialize Stripe Client ---
const stripe = new Stripe(STRIPE_API_KEY_TO_USE, {
  apiVersion: '2024-06-20',
  typescript: true,
  appInfo: {
    name: 'MapleAurum/stripe-webhook',
    version: '1.3.2' // Version bump for this fix
  }
});
// --- Initialize Supabase Admin Client ---
const supabaseAdmin = createClient(supabaseAPIUrl, supabaseServiceRoleAPIKey);
// --- Initialize SendGrid Client ---
if (sendgridApiKey) {
  sgMail.setApiKey(sendgridApiKey); // sgMail is now defined from the import
  console.log(`${logPrefix} INFO: SendGrid API key configured.`);
} else {
  console.warn(`${logPrefix} WARN: SENDGRID_API_KEY is not set. Welcome/Notification emails will not be sent.`);
}
// --- Standardized JSON Response ---
function createStandardResponse(body, status = 200) {
  return new Response(status === 204 ? null : JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json'
    }
  });
}
// --- Helper: Get Supabase User ID from Stripe Customer ID ---
async function getSupabaseUserIdFromStripeCustomerId(stripeCustomerId) {
  if (!stripeCustomerId) {
    console.warn(`${logPrefix} WARN: getSupabaseUserIdFromStripeCustomerId called with null/empty stripeCustomerId.`);
    return null;
  }
  console.log(`${logPrefix} INFO: Looking up Supabase user ID for Stripe Customer ID: ${stripeCustomerId}`);
  const { data: customerMapping, error } = await supabaseAdmin.from('stripe_customers').select('user_id').eq('customer_id', stripeCustomerId).maybeSingle();
  if (error) {
    console.error(`${logPrefix} ERROR: Database error fetching user_id for Stripe customer ${stripeCustomerId}:`, error.message);
    return null;
  }
  if (customerMapping?.user_id) {
    console.info(`${logPrefix} INFO: Found Supabase user ID '${customerMapping.user_id}' for Stripe Customer ID '${stripeCustomerId}'.`);
    return customerMapping.user_id;
  } else {
    console.info(`${logPrefix} INFO: No Supabase user ID found in stripe_customers for Stripe Customer ID '${stripeCustomerId}'.`);
    return null;
  }
}
// --- Core Logic: Synchronize Stripe Subscription Data to Supabase DB ---
async function syncSubscriptionDataToSupabase(stripeCustomerIdFromEvent, stripeSubscriptionId, knownSupabaseUserIdFromMeta) {
  console.info(`${logPrefix} SYNC_SUB: Initiating for StripeSubID: ${stripeSubscriptionId}, EventStripeCustID: ${stripeCustomerIdFromEvent}, KnownSupabaseUserID: ${knownSupabaseUserIdFromMeta || 'N/A'}`);
  try {
    const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId, {
      expand: [
        'items.data.price.product',
        'customer'
      ]
    });
    if (!subscription || !subscription.customer || typeof subscription.customer === 'string' || subscription.customer.deleted) {
      console.warn(`${logPrefix} WARN SYNC_SUB: Stripe Subscription ${stripeSubscriptionId} or its full customer object not found/valid/not-deleted during sync.`);
      // Optionally update local status if subscription is known but Stripe data is problematic
      // await supabaseAdmin.from('stripe_subscriptions').update({ status: 'sync_error_stripe_data_missing', updated_at: new Date().toISOString() }).eq('subscription_id', stripeSubscriptionId);
      return;
    }
    const liveStripeCustomer = subscription.customer;
    const liveStripeCustomerId = liveStripeCustomer.id;
    const stripeCustomerEmail = liveStripeCustomer.email;
    if (liveStripeCustomerId !== stripeCustomerIdFromEvent) {
      console.warn(`${logPrefix} WARN SYNC_SUB: Customer ID mismatch! Event had '${stripeCustomerIdFromEvent}', subscription object has '${liveStripeCustomerId}'. Using actual ID from subscription: '${liveStripeCustomerId}'.`);
    }
    let supabaseUserIdToUse = knownSupabaseUserIdFromMeta;
    if (!supabaseUserIdToUse && liveStripeCustomerId) {
      console.info(`${logPrefix} INFO SYNC_SUB: Known Supabase User ID missing from metadata. Looking up via Stripe Customer ID '${liveStripeCustomerId}'.`);
      supabaseUserIdToUse = await getSupabaseUserIdFromStripeCustomerId(liveStripeCustomerId);
    }
    if (!supabaseUserIdToUse && stripeCustomerEmail) {
      console.info(`${logPrefix} INFO SYNC_SUB: Still no Supabase User ID. Attempting lookup by Stripe email '${stripeCustomerEmail}'.`);
      const { data: userByEmail, error: emailLookupError } = await supabaseAdmin.from('auth.users') // ENSURE this is your correct auth users table
      .select('id').eq('email', stripeCustomerEmail).single();
      if (emailLookupError && emailLookupError.code !== 'PGRST116') {
        console.error(`${logPrefix} ERROR SYNC_SUB: DB error looking up user by email '${stripeCustomerEmail}':`, emailLookupError.message);
      } else if (userByEmail) {
        supabaseUserIdToUse = userByEmail.id;
        console.info(`${logPrefix} INFO SYNC_SUB: Found Supabase User ID '${supabaseUserIdToUse}' by matching email '${stripeCustomerEmail}'.`);
      } else {
        console.warn(`${logPrefix} WARN SYNC_SUB: No Supabase user found for email '${stripeCustomerEmail}'. Subscription may not be linked yet.`);
      }
    }
    if (supabaseUserIdToUse && liveStripeCustomerId) {
      const { error: customerUpsertError } = await supabaseAdmin.from('stripe_customers').upsert({
        user_id: supabaseUserIdToUse,
        customer_id: liveStripeCustomerId,
        // email: stripeCustomerEmail, // 'email' column might not exist in your 'stripe_customers' table, add if it does
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id' // Assuming user_id is unique constraint for upsert
      }).select();
      if (customerUpsertError) console.error(`${logPrefix} ERROR SYNC_SUB: Upserting stripe_customers for user ${supabaseUserIdToUse}:`, customerUpsertError.message);
      else console.info(`${logPrefix} INFO SYNC_SUB: Ensured stripe_customers mapping for user ${supabaseUserIdToUse}.`);
    }
    const priceData = subscription.items.data[0]?.price;
    const planNameFromMetadata = subscription.metadata?.planName || (priceData?.product && typeof priceData.product === 'object' ? priceData.product.name : 'Unknown Plan');
	


    const subscriptionDataForDatabase = {
      subscription_id: subscription.id,
      customer_id: liveStripeCustomerId,
      user_id: supabaseUserIdToUse || null,
      price_id: priceData?.id || null,
      status: subscription.status,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
      canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
      ended_at: subscription.ended_at ? new Date(subscription.ended_at * 1000).toISOString() : null,
      trial_start: subscription.trial_start ? new Date(subscription.trial_start * 1000).toISOString() : null, // <-- ADD THIS
      trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,       // <-- ADD THIS
      metadata: {
        planName: planNameFromMetadata,
        stripePriceId: priceData?.id,
        ...subscription.metadata || {}
      },
      updated_at: new Date().toISOString()
    };	

    if (!subscriptionDataForDatabase.user_id) {
      console.warn(`${logPrefix} WARN SYNC_SUB: The 'user_id' field in the database record for subscription ${subscription.id} is null. It will not be linked to a Supabase user directly in the stripe_subscriptions table.`);
    }
    console.info(`${logPrefix} INFO SYNC_SUB: Upserting subscription ${subscription.id} into DB. User: ${supabaseUserIdToUse || 'Not Linked'}, Price ID: ${subscriptionDataForDatabase.price_id}, Status: ${subscriptionDataForDatabase.status}.`);
    const { error: subUpsertError } = await supabaseAdmin.from('stripe_subscriptions').upsert(subscriptionDataForDatabase, {
      onConflict: 'subscription_id' // Make sure 'subscription_id' is a unique key in your table
    });
    if (subUpsertError) {
      console.error(`${logPrefix} ERROR SYNC_SUB: Failed to upsert Stripe subscription ${subscription.id} (User: ${supabaseUserIdToUse || 'N/A'}) into DB:`, subUpsertError.message, subUpsertError.details);
      throw new Error(`Database error syncing subscription ${subscription.id}: ${subUpsertError.message}`);
    }
    console.info(`${logPrefix} INFO SYNC_SUB: Successfully synced Stripe subscription ${subscription.id} (User: ${supabaseUserIdToUse || 'Not Linked'}).`);
  } catch (error) {
    console.error(`${logPrefix} ERROR SYNC_SUB: Top-level error in syncSubscriptionDataToSupabase for sub ${stripeSubscriptionId}:`, error.message, error.stack);
  // Avoid throwing here to ensure webhook always returns 200 to Stripe if possible, unless it's a signature error.
  }
}
// --- Main Webhook Event Handler Logic ---
async function handleWebhookEvent(event) {
  const eventObject = event.data.object; // Use 'as any' or define more specific types
  const supabaseUserIdFromMetadata = eventObject.metadata?.supabaseUserId || eventObject.subscription_details?.metadata?.supabaseUserId || // For checkout.session with embedded subscription details
  eventObject.subscription_data?.metadata?.supabaseUserId || // For older checkout session structures
  eventObject.client_reference_id || // If you pass user_id as client_reference_id
  null;
  console.log(`${logPrefix} Handling event type: ${event.type}, Event ID: ${event.id}, Supabase User from Meta/Ref: ${supabaseUserIdFromMetadata || 'N/A'}`);
  switch(event.type){
    case 'checkout.session.completed':
      const session = eventObject; // Type assertion
      console.info(`${logPrefix} Event: 'checkout.session.completed' for Session ID: ${session.id}, Mode: ${session.mode}`);
      if (session.mode === 'subscription' && session.subscription && session.customer) {
        const stripeCustomerId = typeof session.customer === 'string' ? session.customer : session.customer.id;
        const stripeSubscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription.id;
        if (!stripeSubscriptionId) {
          console.error(`${logPrefix} ERROR: 'checkout.session.completed' for session ${session.id} missing critical subscription ID.`);
          return; // Stop processing if essential ID is missing
        }
        // Try to get email from customer_details first, then expanded customer object if needed
        const customerEmail = session.customer_details?.email; // Often available directly
        const planName = session.metadata?.planName || 'your selected plan';
        if (customerEmail && sendgridApiKey) {
          try {
            const msg = {
              to: customerEmail,
              from: {
                email: 'support@mapleaurum.com',
                name: 'MapleAurum Support'
              },
              subject: `Welcome to MapleAurum - Your ${planName} Plan is Active!`,
              html: `<p>Thank you for subscribing to MapleAurum's <strong>${planName}</strong>!</p><p>Your account is now active, and your premium features should be available shortly after you log in or refresh your session.</p><p>Start exploring: <a href="https://mapleaurum.com/companies">mapleaurum.com/companies</a></p><p>If you're new and need to complete your account setup (e.g., set a password if you haven't already), please visit our <a href="https://mapleaurum.com/login">login/signup page</a>. Your subscription is linked to this email address: ${customerEmail}.</p><p>Questions? Contact us at <a href="mailto:support@mapleaurum.com">support@mapleaurum.com</a>.</p>`
            };
            await sgMail.send(msg);
            console.info(`${logPrefix} INFO: Welcome email sent to ${customerEmail} for session ${session.id}.`);
          } catch (emailError) {
            console.error(`${logPrefix} ERROR: Failed to send welcome email to ${customerEmail}. Code: ${emailError.code}, Message: ${emailError.message}`, emailError.response?.body?.errors || emailError);
          }
        } else if (!customerEmail) {
          console.warn(`${logPrefix} WARN: No customer email in session ${session.id}. Cannot send welcome email.`);
        } else if (!sendgridApiKey) {
          console.warn(`${logPrefix} WARN: SendGrid API key not configured. Welcome email to ${customerEmail} not sent.`);
        }
        await syncSubscriptionDataToSupabase(stripeCustomerId, stripeSubscriptionId, supabaseUserIdFromMetadata || session.client_reference_id);
      } else {
        console.info(`${logPrefix} INFO: Ignoring 'checkout.session.completed' (mode: ${session.mode}, subscription field: ${session.subscription ? 'present' : 'absent'}, customer field: ${session.customer ? 'present' : 'absent'}).`);
      }
      break;
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      // For these events, the eventObject is the subscription itself
      const subscriptionEventObject = eventObject;
      const subIdForDirectEvent = subscriptionEventObject.id;
      const custIdForDirectEvent = typeof subscriptionEventObject.customer === 'string' ? subscriptionEventObject.customer : subscriptionEventObject.customer.id; // customer is an expanded object for these
      if (subIdForDirectEvent && custIdForDirectEvent) {
        console.info(`${logPrefix} INFO: Handling direct subscription event '${event.type}' for Sub ID: ${subIdForDirectEvent}, Cust ID: ${custIdForDirectEvent}.`);
        await syncSubscriptionDataToSupabase(custIdForDirectEvent, subIdForDirectEvent, supabaseUserIdFromMetadata || subscriptionEventObject.metadata?.supabaseUserId);
      } else {
        console.warn(`${logPrefix} WARN: Could not extract relevant subscription/customer ID from direct subscription event type '${event.type}'. SubID: ${subIdForDirectEvent}, CustID: ${custIdForDirectEvent}`);
      }
      break;
    case 'invoice.payment_succeeded':
    case 'invoice.payment_failed':
      // The eventObject is an Invoice. The subscription ID is on `eventObject.subscription`
      const invoiceEventObject = eventObject;
      const subIdFromInvoice = invoiceEventObject.subscription; // Can be null for one-off invoices
      const custIdFromInvoice = invoiceEventObject.customer;
      if (subIdFromInvoice && custIdFromInvoice) {
        console.info(`${logPrefix} INFO: Handling invoice event '${event.type}' for Sub ID: ${subIdFromInvoice}, Cust ID: ${custIdFromInvoice}.`);
        // Use metadata from the invoice itself if available, or pass null to let sync function retrieve from subscription
        const userIdFromInvoiceMeta = invoiceEventObject.subscription_details?.metadata?.supabaseUserId || invoiceEventObject.metadata?.supabaseUserId;
        await syncSubscriptionDataToSupabase(custIdFromInvoice, subIdFromInvoice, supabaseUserIdFromMetadata || userIdFromInvoiceMeta);
      } else {
        console.warn(`${logPrefix} WARN: Invoice event '${event.type}' (ID: ${invoiceEventObject.id}) is not linked to a subscription or customer. Ignoring. SubID: ${subIdFromInvoice}, CustID: ${custIdFromInvoice}`);
      }
      break;
    default:
      console.info(`${logPrefix} INFO: Received unhandled Stripe event type: ${event.type}`);
  }
}
// --- Deno Serve Entry Point ---
Deno.serve(async (req)=>{
  const requestUrl = new URL(req.url);
  console.log(`${logPrefix} INFO: Webhook request received: ${req.method} ${requestUrl.pathname}`);
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Stripe-Signature, Authorization' // Add any other headers Stripe might send
      }
    });
  }
  if (req.method !== 'POST') {
    return createStandardResponse({
      error: 'Method Not Allowed.'
    }, 405);
  }
  const signature = req.headers.get('Stripe-Signature');
  if (!signature) {
    console.warn(`${logPrefix} WARN: Missing Stripe-Signature header.`);
    return createStandardResponse({
      error: 'Missing Stripe-Signature.'
    }, 400);
  }
  const requestBodyText = await req.text();
  let stripeEvent;
  try {
    stripeEvent = await stripe.webhooks.constructEventAsync(requestBodyText, signature, WEBHOOK_SIGNING_SECRET_TO_USE);
    console.info(`${logPrefix} INFO: Event (ID: ${stripeEvent.id}, Type: ${stripeEvent.type}) verified using ${STRIPE_MODE_ENV} secret.`);
  } catch (err) {
    console.error(`${logPrefix} ERROR: Webhook signature verification failed:`, err.message);
    return createStandardResponse({
      error: `Webhook error (signature verification): ${err.message}`
    }, 400);
  }
  try {
    // Process the event asynchronously without holding up the response to Stripe
    EdgeRuntime.waitUntil(handleWebhookEvent(stripeEvent));
    return createStandardResponse({
      received: true,
      eventId: stripeEvent.id,
      message: "Event received, processing scheduled."
    }, 200);
  } catch (e) {
    // This catch is unlikely to be hit if waitUntil is used correctly,
    // as errors in handleWebhookEvent will be handled within its own try/catch or as unhandled promise rejections.
    console.error(`${logPrefix} ERROR: Scheduling event processing (or immediate error before waitUntil):`, e.message);
    return createStandardResponse({
      error: 'Error scheduling event processing.'
    }, 500);
  }
});
