// supabase/functions/stripe-webhook/index.ts
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0'; // Ensure this version is compatible with your needs
import { createClient, SupabaseClient, PostgrestError } from 'npm:@supabase/supabase-js@2.49.1'; // Or your current version
import { Client as SendGridClient, MailDataRequired } from 'npm:@sendgrid/mail@8.1.3';

// --- Environment Configuration & Validation ---
const STRIPE_MODE_ENV = Deno.env.get('STRIPE_MODE')?.toLowerCase() || 'live'; // Default to 'live' for safety
const logPrefix = `[stripe-webhook][${STRIPE_MODE_ENV.toUpperCase()}]`;

console.log(`${logPrefix} INFO: Function initializing in '${STRIPE_MODE_ENV}' mode.`);

const LIVE_STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY');
const TEST_STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEYT'); // User's variable name for test key

const LIVE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET');
const TEST_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET_TEST'); // User needs to ensure this is set

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

if (!sendgridApiKey) {
    console.warn(`${logPrefix} WARN: SENDGRID_API_KEY is not set. Welcome/Notification emails will not be sent.`);
}

const stripe = new Stripe(STRIPE_API_KEY_TO_USE, {
  apiVersion: '2024-06-20', 
  typescript: true,
  appInfo: { name: 'MapleAurum/stripe-webhook', version: '1.3.1' } // Version bump for this fix
});

const supabaseAdmin: SupabaseClient = createClient(supabaseAPIUrl, supabaseServiceRoleAPIKey);

const sgMail = new SendGridClient();
if (sendgridApiKey) {
  sgMail.setApiKey(sendgridApiKey);
}

// --- Standardized JSON Response ---
function createStandardResponse(body: object | null, status = 200): Response {
  return new Response(status === 204 ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

// --- Helper: Get Supabase User ID from Stripe Customer ID ---
async function getSupabaseUserIdFromStripeCustomerId(stripeCustomerId: string): Promise<string | null> {
  if (!stripeCustomerId) {
    console.warn(`${logPrefix} WARN: getSupabaseUserIdFromStripeCustomerId called with null/empty stripeCustomerId.`);
    return null;
  }
  console.log(`${logPrefix} INFO: Looking up Supabase user ID for Stripe Customer ID: ${stripeCustomerId}`);
  const { data: customerMapping, error } = await supabaseAdmin
    .from('stripe_customers')
    .select('user_id')
    .eq('customer_id', stripeCustomerId)
    .maybeSingle();

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
async function syncSubscriptionDataToSupabase(
    stripeCustomerIdFromEvent: string, 
    stripeSubscriptionId: string, 
    knownSupabaseUserIdFromMeta?: string | null 
) {
  console.info(`${logPrefix} SYNC_SUB: Initiating for StripeSubID: ${stripeSubscriptionId}, EventStripeCustID: ${stripeCustomerIdFromEvent}, KnownSupabaseUserID: ${knownSupabaseUserIdFromMeta || 'N/A'}`);
  
  try {
    const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId, {
      expand: ['items.data.price.product', 'customer']
    });

    if (!subscription || !subscription.customer || typeof subscription.customer === 'string') {
      console.warn(`${logPrefix} WARN SYNC_SUB: Stripe Subscription ${stripeSubscriptionId} or its full customer object not found/valid during sync.`);
      await supabaseAdmin.from('stripe_subscriptions')
        .update({ status: 'sync_error_stripe_data_missing', updated_at: new Date().toISOString() })
        .eq('subscription_id', stripeSubscriptionId);
      return;
    }

    const liveStripeCustomer = subscription.customer as Stripe.Customer;
    const liveStripeCustomerId = liveStripeCustomer.id;
    const stripeCustomerEmail = liveStripeCustomer.email;

    if (liveStripeCustomerId !== stripeCustomerIdFromEvent) {
      console.warn(`${logPrefix} WARN SYNC_SUB: Customer ID mismatch! Event had '${stripeCustomerIdFromEvent}', subscription object has '${liveStripeCustomerId}'. Using actual ID from subscription: '${liveStripeCustomerId}'.`);
    }

    let supabaseUserIdToUse = knownSupabaseUserIdFromMeta;
    if (!supabaseUserIdToUse) {
      console.info(`${logPrefix} INFO SYNC_SUB: Known Supabase User ID missing from metadata. Looking up via Stripe Customer ID '${liveStripeCustomerId}'.`);
      supabaseUserIdToUse = await getSupabaseUserIdFromStripeCustomerId(liveStripeCustomerId);
    }
    
    if (!supabaseUserIdToUse && stripeCustomerEmail) {
        console.info(`${logPrefix} INFO SYNC_SUB: Still no Supabase User ID. Attempting lookup by Stripe email '${stripeCustomerEmail}'.`);
        const { data: userByEmail, error: emailLookupError } = await supabaseAdmin
            .from('users') // Assuming your auth users table is 'users'. Adjust if 'auth.users'.
            .select('id')
            .eq('email', stripeCustomerEmail)
            .single(); 
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
      const { error: customerUpsertError } = await supabaseAdmin.from('stripe_customers').upsert(
        { user_id: supabaseUserIdToUse, customer_id: liveStripeCustomerId, email: stripeCustomerEmail, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' } 
      ).select();
      if (customerUpsertError) console.error(`${logPrefix} ERROR SYNC_SUB: Upserting stripe_customers for user ${supabaseUserIdToUse}:`, customerUpsertError.message);
      else console.info(`${logPrefix} INFO SYNC_SUB: Ensured stripe_customers mapping for user ${supabaseUserIdToUse}.`);
    }
    
    const priceData = subscription.items.data[0]?.price;
    const planNameFromMetadata = subscription.metadata?.planName || 
                               (priceData?.product && typeof priceData.product === 'object' ? (priceData.product as Stripe.Product).name : 'Unknown Plan');

    const subscriptionDataForDatabase: any = {
      subscription_id: subscription.id,
      customer_id: liveStripeCustomerId, 
      user_id: supabaseUserIdToUse || null, 
      price_id: priceData?.id || null,
      status: subscription.status, // Your database column name for subscription status
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
      canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
      ended_at: subscription.ended_at ? new Date(subscription.ended_at * 1000).toISOString() : null,
      metadata: { 
          planName: planNameFromMetadata,
          stripePriceId: priceData?.id,
          ...(subscription.metadata || {}) 
      },
      updated_at: new Date().toISOString(),
    };
    
    // ***** THIS IS THE CORRECTED LOG LINE *****
    if (!subscriptionDataForDatabase.user_id) {
        console.warn(`${logPrefix} WARN SYNC_SUB: The 'user_id' field in the database record for subscription ${subscription.id} is null. It will not be linked to a Supabase user directly in the stripe_subscriptions table.`);
    }

    console.info(`${logPrefix} INFO SYNC_SUB: Upserting subscription ${subscription.id} into DB. User: ${supabaseUserIdToUse || 'Not Linked'}.`);
    const { error: subUpsertError } = await supabaseAdmin.from('stripe_subscriptions')
      .upsert(subscriptionDataForDatabase, { onConflict: 'subscription_id' });
    
    if (subUpsertError) {
      console.error(`${logPrefix} ERROR SYNC_SUB: Failed to upsert Stripe subscription ${subscription.id} (User: ${supabaseUserIdToUse || 'N/A'}) into DB:`, subUpsertError.message, subUpsertError.details);
      throw new Error(`Database error syncing subscription ${subscription.id}: ${subUpsertError.message}`);
    }
    console.info(`${logPrefix} INFO SYNC_SUB: Successfully synced Stripe subscription ${subscription.id} (User: ${supabaseUserIdToUse || 'Not Linked'}).`);

  } catch (error: any) {
    console.error(`${logPrefix} ERROR SYNC_SUB: Top-level error in syncSubscriptionDataToSupabase for sub ${stripeSubscriptionId}:`, error.message, error.stack);
  }
}

// --- Main Webhook Event Handler Logic ---
async function handleWebhookEvent(event: Stripe.Event) {
  const eventObject = event.data.object as any; 
  const supabaseUserIdFromMetadata = 
    eventObject.metadata?.supabaseUserId || 
    (eventObject.subscription_details?.metadata?.supabaseUserId) || 
    (eventObject.subscription_data?.metadata?.supabaseUserId) ||   
    null;

  console.log(`${logPrefix} Handling event type: ${event.type}, Event ID: ${event.id}, Supabase User from Meta: ${supabaseUserIdFromMetadata || 'N/A'}`);

  switch (event.type) {
    case 'checkout.session.completed':
      const session = eventObject as Stripe.Checkout.Session;
      console.info(`${logPrefix} Event: 'checkout.session.completed' for Session ID: ${session.id}, Mode: ${session.mode}`);
      if (session.mode === 'subscription' && session.subscription && session.customer) {
        const stripeCustomerId = typeof session.customer === 'string' ? session.customer : session.customer.id;
        const stripeSubscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription.id;
        
        if (!stripeSubscriptionId) { console.error(`${logPrefix} ERROR: 'checkout.session.completed' for session ${session.id} missing critical subscription ID.`); return; }
        
        const customerEmail = session.customer_details?.email;
        const planName = session.metadata?.planName || 
                         (session.subscription_details?.metadata as Stripe.SubscriptionUpdateParams.Metadata)?.planName || 
                         'your selected plan';

        if (customerEmail && sendgridApiKey) {
          try {
            const msg: MailDataRequired = {
              to: customerEmail,
              from: { email: 'support@mapleaurum.com', name: 'MapleAurum Support' },
              subject: `Welcome to MapleAurum - Your ${planName} Plan is Active!`,
              html: `<p>Thank you for subscribing to MapleAurum's <strong>${planName}</strong>!</p><p>Your account is now active, and your premium features should be available shortly after you log in or refresh your session.</p><p>Start exploring: <a href="https://mapleaurum.com/companies">mapleaurum.com/companies</a></p><p>If you're new and need to complete your account setup (e.g., set a password if you haven't already), please visit our <a href="https://mapleaurum.com/login">login/signup page</a>. Your subscription is linked to this email address: ${customerEmail}.</p><p>Questions? Contact us at <a href="mailto:support@mapleaurum.com">support@mapleaurum.com</a>.</p>`
            };
            await sgMail.send(msg);
            console.info(`${logPrefix} INFO: Welcome email sent to ${customerEmail} for session ${session.id}.`);
          } catch (emailError: any) {
            console.error(`${logPrefix} ERROR: Failed to send welcome email to ${customerEmail}. Code: ${emailError.code}, Message: ${emailError.message}`, emailError.response?.body?.errors);
          }
        } else if (!customerEmail) console.warn(`${logPrefix} WARN: No customer email in session ${session.id}. Cannot send welcome email.`);
        
        await syncSubscriptionDataToSupabase(stripeCustomerId, stripeSubscriptionId, supabaseUserIdFromMetadata);
      } else console.info(`${logPrefix} INFO: Ignoring 'checkout.session.completed' (mode: ${session.mode}, subscription field: ${session.subscription ? 'present' : 'absent'}).`);
      break;

    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': 
    case 'invoice.payment_succeeded':     
    case 'invoice.payment_failed':        
      let subIdToSync: string | null = null;
      let custIdForSync: string | null = null;

      if ('subscription' in eventObject && eventObject.subscription) { 
        subIdToSync = typeof eventObject.subscription === 'string' ? eventObject.subscription : eventObject.subscription.id;
        custIdForSync = typeof eventObject.customer === 'string' ? eventObject.customer : eventObject.customer?.id;
      } else if ('id' in eventObject && 'customer' in eventObject) { 
        subIdToSync = eventObject.id;
        custIdForSync = typeof eventObject.customer === 'string' ? eventObject.customer : eventObject.customer.id;
      }

      if (subIdToSync && custIdForSync) {
        console.info(`${logPrefix} INFO: Handling '${event.type}' for Sub ID: ${subIdToSync}, Cust ID: ${custIdForSync}.`);
        await syncSubscriptionDataToSupabase(custIdForSync, subIdToSync, supabaseUserIdFromMetadata);
      } else console.warn(`${logPrefix} WARN: Could not extract relevant subscription/customer ID from event type '${event.type}'.`);
      break;

    default:
      console.info(`${logPrefix} INFO: Received unhandled Stripe event type: ${event.type}`);
  }
}

// --- Deno Serve Entry Point ---
Deno.serve(async (req: Request) => {
  console.log(`${logPrefix} INFO: Webhook request received: ${req.method} ${req.url}`);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204, 
      headers: { 
        'Access-Control-Allow-Origin': '*', 
        'Access-Control-Allow-Methods': 'POST, OPTIONS', 
        'Access-Control-Allow-Headers': 'Content-Type, Stripe-Signature, Authorization'
      }
    });
  }

  if (req.method !== 'POST') return createStandardResponse({ error: 'Method Not Allowed.' }, 405);

  const signature = req.headers.get('Stripe-Signature');
  if (!signature) return createStandardResponse({ error: 'Missing Stripe-Signature.' }, 400);
  
  const requestBodyText = await req.text();
  let stripeEvent: Stripe.Event;
  try {
    stripeEvent = await stripe.webhooks.constructEventAsync(
        requestBodyText, 
        signature, 
        WEBHOOK_SIGNING_SECRET_TO_USE! 
    );
    console.info(`${logPrefix} INFO: Event (ID: ${stripeEvent.id}, Type: ${stripeEvent.type}) verified using ${STRIPE_MODE_ENV} secret.`);
  } catch (err: any) {
    console.error(`${logPrefix} ERROR: Webhook signature verification failed:`, err.message);
    return createStandardResponse({ error: `Webhook error (signature verification): ${err.message}` }, 400);
  }

  try {
    EdgeRuntime.waitUntil(handleWebhookEvent(stripeEvent)); 
    return createStandardResponse({ received: true, eventId: stripeEvent.id, message: "Event received, processing scheduled." }, 200);
  } catch (e: any) {
    console.error(`${logPrefix} ERROR: Scheduling event processing:`, e.message);
    return createStandardResponse({ error: 'Error scheduling event processing.' }, 500);
  }
});