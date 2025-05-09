// supabase/functions/stripe-checkout/index.ts
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0'; // Ensure this is the version you intend to use
import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2.49.1';

// --- Define Expected Request Body Structure ---
interface CheckoutRequestBody {
  price_id: string;       // Stripe Price ID (e.g., price_xxxxxxxxxxxxxx)
  success_url: string;    // URL for successful payment redirect
  cancel_url: string;     // URL for cancelled payment redirect
  mode: 'subscription' | 'payment'; // Type of checkout session
  // Optional: Client can pass these for more explicit metadata.
  // If not passed, the function will attempt to derive them from the Stripe Price object.
  plan_name?: string;      // User-friendly plan name (e.g., "Pro", "Premium")
  interval?: 'month' | 'year'; // Billing interval
}

// --- Define Expected Response Structure ---
interface CheckoutSuccessResponse {
  sessionId: string;      // Stripe Checkout Session ID
  url: string | null;     // Stripe Checkout Session URL for redirect
}
// ErrorResponse interface is implicitly handled by createJsonResponse

// --- Environment Variable Validation & Client Initialization ---
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
const frontendAppUrl = Deno.env.get('FRONTEND_URL') ?? 'http://localhost:3000'; // Default for local dev

if (!supabaseUrl) throw new Error('FATAL [stripe-checkout]: Missing SUPABASE_URL environment variable.');
if (!supabaseServiceRoleKey) throw new Error('FATAL [stripe-checkout]: Missing SUPABASE_SERVICE_ROLE_KEY environment variable.');
if (!stripeSecretKey) throw new Error('FATAL [stripe-checkout]: Missing STRIPE_SECRET_KEY environment variable.');

const supabaseAdmin: SupabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey);
const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2024-06-20', // Use a recent, fixed API version
  typescript: true,
  appInfo: { name: 'MapleAurum/stripe-checkout', version: '1.1.0' }, // Updated version
});

// --- CORS Helper ---
function createJsonResponse(body: object | null, status = 200, extraHeaders = {}): Response {
  const headers = {
    'Access-Control-Allow-Origin': frontendAppUrl, // Restrict to your frontend URL
    'Access-Control-Allow-Methods': 'POST, OPTIONS', // This function mainly uses POST
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Content-Type': 'application/json',
    'Vary': 'Origin', // Important for CORS caching behavior
    ...extraHeaders,
  };
  return new Response(status === 204 ? null : JSON.stringify(body), { status, headers });
}

// --- Parameter Validation Helper ---
type ExpectedParamType = 'string' | { values: ReadonlyArray<string> }; // Use ReadonlyArray
type ParamExpectations<T> = { [K in keyof T]?: ExpectedParamType }; // Make properties optional for partial validation

// Required fields are now explicitly checked before this function for better clarity
function validateOptionalParams<T extends Record<string, any>>(
  values: T,
  expected: ParamExpectations<T>
): string | undefined {
  for (const parameter in expected) {
    if (values[parameter] == null) continue; // Skip validation if param is not present (it's optional here)

    const expectation = expected[parameter]!; // We know it's defined due to loop condition
    const value = values[parameter];

    if (typeof expectation === 'string') { // Expects a string type
      if (typeof value !== 'string' || value.trim() === '') {
        return `Optional parameter ${parameter} must be a non-empty string if provided, got: ${JSON.stringify(value)}`;
      }
    } else { // Expectation is { values: string[] }
      if (!expectation.values.includes(value)) {
        return `Optional parameter ${parameter} must be one of: ${expectation.values.join(', ')} if provided. Got: ${value}`;
      }
    }
  }
  return undefined;
}

// --- Main Edge Function Logic ---
Deno.serve(async (req: Request) => {
  const logPrefix = '[stripe-checkout]';
  console.log(`${logPrefix} INFO: Received request: ${req.method} ${req.url}`);

  if (req.method === 'OPTIONS') {
    console.info(`${logPrefix} INFO: Handling OPTIONS preflight request.`);
    return createJsonResponse({}, 204);
  }
  if (req.method !== 'POST') {
    console.warn(`${logPrefix} WARN: Received non-POST request: ${req.method}`);
    return createJsonResponse({ error: 'Method Not Allowed. Only POST requests are accepted.' }, 405);
  }

  let requestBody: CheckoutRequestBody;
  try {
    const rawBody = await req.text();
    if (!rawBody) throw new Error('Request body is empty.');
    requestBody = JSON.parse(rawBody);
    console.info(`${logPrefix} INFO: Parsed request body:`, JSON.stringify(requestBody)); // Stringify for better Deno log view
  } catch (parseError) {
    console.error(`${logPrefix} ERROR: Failed to parse request body:`, parseError.message);
    return createJsonResponse({ error: 'Invalid request: Could not parse JSON body.', details: parseError.message }, 400);
  }

  // Validate required parameters
  const requiredParams: (keyof CheckoutRequestBody)[] = ['price_id', 'success_url', 'cancel_url', 'mode'];
  for (const param of requiredParams) {
    if (!requestBody[param] || (typeof requestBody[param] === 'string' && (requestBody[param] as string).trim() === '')) {
      const errorMsg = `Invalid input: Missing or empty required parameter: ${param}`;
      console.warn(`${logPrefix} WARN: ${errorMsg}`);
      return createJsonResponse({ error: errorMsg }, 400);
    }
  }
  // Validate enum for 'mode' and optional parameters
  const optionalValidationError = validateOptionalParams<CheckoutRequestBody>(
    requestBody,
    {
      mode: { values: ['payment', 'subscription'] }, // Mode is required but also has enum validation
      plan_name: 'string',
      interval: { values: ['month', 'year'] }
    }
  );
  if (optionalValidationError) {
     console.warn(`${logPrefix} WARN: Request body validation failed for enums or optional fields:`, optionalValidationError);
     return createJsonResponse({ error: `Invalid input: ${optionalValidationError}` }, 400);
  }


  const { price_id, success_url, cancel_url, mode, plan_name: clientPlanName, interval: clientInterval } = requestBody;

  try {
    // 1. Authenticate Supabase User
    console.info(`${logPrefix} INFO: Authenticating Supabase user...`);
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.warn(`${logPrefix} WARN: Missing or invalid Authorization header.`);
      return createJsonResponse({ error: 'Authentication required: Missing or invalid Authorization header.' }, 401);
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError) {
      console.error(`${logPrefix} ERROR: Supabase auth error:`, authError.message);
      return createJsonResponse({ error: `Authentication failed: ${authError.message}` }, authError.status || 401);
    }
    if (!user) {
      console.warn(`${logPrefix} WARN: User not found for provided token.`);
      return createJsonResponse({ error: 'Authentication failed: User not found.' }, 401);
    }
    console.info(`${logPrefix} INFO: User ${user.id} (${user.email}) authenticated.`);

    // 2. Validate Price ID with Stripe & Get Product Info for Metadata
    let fetchedPrice: Stripe.Price;
    let derivedPlanName: string = 'Unknown Plan';
    let derivedInterval: 'month' | 'year' | undefined = undefined;

    try {
      console.info(`${logPrefix} INFO: Retrieving Stripe Price object for ID ${price_id} to validate and get product details.`);
      fetchedPrice = await stripe.prices.retrieve(price_id, { expand: ['product'] });
      if (!fetchedPrice || !fetchedPrice.active) {
        throw new Error(`Price ID ${price_id} is not active or does not exist in Stripe.`);
      }
      // Derive planName and interval from the fetched Stripe Price and Product objects
      if (fetchedPrice.product && typeof fetchedPrice.product === 'object') {
        derivedPlanName = (fetchedPrice.product as Stripe.Product).name || derivedPlanName;
      }
      if (fetchedPrice.recurring?.interval) {
        derivedInterval = fetchedPrice.recurring.interval as 'month' | 'year';
      }
      console.info(`${logPrefix} INFO: Stripe Price ID ${price_id} validated. Product: "${derivedPlanName}", Interval: ${derivedInterval}.`);
    } catch (stripePriceError: any) {
      console.error(`${logPrefix} ERROR: Invalid Stripe Price ID ${price_id}:`, stripePriceError.message);
      return createJsonResponse({ error: `Invalid product price: ${stripePriceError.message}. Please check the Price ID.`, details: stripePriceError.message }, 400);
    }
    
    // Use client-provided plan_name/interval if available, otherwise use derived values
    const finalPlanNameForMetadata = clientPlanName || derivedPlanName;
    const finalIntervalForMetadata = clientInterval || derivedInterval;

    // 3. Get or Create Stripe Customer, linking to Supabase User
    let stripeCustomerId: string;
    console.info(`${logPrefix} INFO: Looking up Stripe customer for Supabase user ${user.id}.`);
    const { data: customerMapping, error: dbCustomerError } = await supabaseAdmin
      .from('stripe_customers')
      .select('customer_id')
      .eq('user_id', user.id)
      .maybeSingle(); // Use maybeSingle to handle null or one row

    if (dbCustomerError) {
      console.error(`${logPrefix} ERROR: Database error fetching Stripe customer mapping for user ${user.id}:`, dbCustomerError.message);
      return createJsonResponse({ error: 'Database error: Could not process customer information.' }, 500);
    }

    if (customerMapping?.customer_id) {
      try {
        const existingStripeCustomer = await stripe.customers.retrieve(customerMapping.customer_id);
        if (existingStripeCustomer && !existingStripeCustomer.deleted) {
          stripeCustomerId = existingStripeCustomer.id;
          console.info(`${logPrefix} INFO: Found existing active Stripe customer ${stripeCustomerId} for user ${user.id}.`);
        } else {
          console.warn(`${logPrefix} WARN: Stripe customer ${customerMapping.customer_id} from DB is deleted or invalid in Stripe. Will create a new one.`);
          // Fall through to create a new customer by leaving stripeCustomerId undefined here
        }
      } catch (stripeCustError: any) {
        console.warn(`${logPrefix} WARN: Stripe customer ${customerMapping.customer_id} (from DB for user ${user.id}) not valid in Stripe (${stripeCustError.message}). Creating a new one.`);
        // Fall through
      }
    }

    if (!stripeCustomerId!) { // If existing customer not found or invalid
      console.info(`${logPrefix} INFO: Creating new Stripe customer for user ${user.id} (${user.email}).`);
      const customerCreateParams: Stripe.CustomerCreateParams = {
        email: user.email!,
        name: user.user_metadata?.full_name || user.email!,
        metadata: { supabaseUserId: user.id }, // Link Stripe customer TO Supabase user ID
      };
      const newStripeCustomer = await stripe.customers.create(customerCreateParams);
      stripeCustomerId = newStripeCustomer.id;
      console.info(`${logPrefix} INFO: Created new Stripe customer ${stripeCustomerId}. Storing mapping in DB.`);
      
      const { error: upsertError } = await supabaseAdmin
        .from('stripe_customers') // Your Supabase table linking users to Stripe customers
        .upsert(
          { user_id: user.id, customer_id: stripeCustomerId, updated_at: new Date().toISOString() },
          { onConflict: 'user_id' } // Assumes user_id is PK or has UNIQUE constraint
        );
      if (upsertError) {
        console.error(`${logPrefix} ERROR: Failed to upsert Stripe customer mapping for user ${user.id}:`, upsertError.message);
        // This is not necessarily fatal for the checkout session creation itself, but critical for long-term mapping.
      }
    }

    // 4. Handle existing subscriptions (Simplified: No automatic updates for this generic checkout)
    if (mode === 'subscription') {
      console.info(`${logPrefix} INFO: Checking for existing *active* subscriptions for customer ${stripeCustomerId}.`);
      const { data: existingSubscriptions, error: listSubError } = await stripe.subscriptions.list({
        customer: stripeCustomerId,
        status: 'active', // Only consider active ones
        limit: 1, // We only care if at least one active exists
      });

      if (listSubError) {
        console.error(`${logPrefix} ERROR: Failed to list subscriptions for customer ${stripeCustomerId}:`, listSubError.message);
        // Proceed with caution, might create duplicate if not handled
      }

      if (existingSubscriptions && existingSubscriptions.data.length > 0) {
        console.warn(`${logPrefix} WARN: Customer ${stripeCustomerId} (User ${user.id}) already has an active subscription(s). Current checkout will create a new, additional subscription. ID of one active sub: ${existingSubscriptions.data[0].id}. Plan changes should ideally be handled via Stripe Customer Portal or a dedicated upgrade/downgrade flow.`);
        // The old logic to update `subData.subscription_id` is removed for simplification.
        // This generic checkout endpoint will now always aim to create a new subscription if one is purchased.
        // If you want to prevent multiple active subscriptions or auto-upgrade, that logic would go here or
        // by configuring your Stripe Product/Price settings appropriately.
      }
      
      // The placeholder 'incomplete' subscription logic in your original code:
      // This was likely intended to create a DB record before Stripe confirms.
      // However, with webhooks, it's usually cleaner to let the `checkout.session.completed`
      // webhook create the definitive subscription record in your DB.
      // For now, I'm removing the pre-creation of 'incomplete' DB records here to simplify.
      // The webhook will handle DB record creation upon successful payment.
    }

    // 5. Create Stripe Checkout Session
    console.info(`${logPrefix} INFO: Creating Stripe Checkout session for Stripe customer ${stripeCustomerId}, price ${price_id}, mode ${mode}.`);
    const checkoutSessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      line_items: [{ price: price_id, quantity: 1 }],
      mode: mode,
      success_url: success_url, // e.g., `https://mapleaurum.com/onboarding?session_id={CHECKOUT_SESSION_ID}`
      cancel_url: cancel_url,   // e.g., `https://mapleaurum.com/subscribe`
      metadata: {
        supabaseUserId: user.id,          // CRITICAL for webhook linking
        priceId: price_id,                // For reference
        planName: finalPlanNameForMetadata, // Derived/passed plan name
        interval: finalIntervalForMetadata, // Derived/passed interval
      },
      // allow_promotion_codes: true, // Uncomment if you want to allow promo codes
    };

    const stripeCheckoutSession: Stripe.Checkout.Session = await stripe.checkout.sessions.create(checkoutSessionParams);
    console.info(`${logPrefix} INFO: Stripe Checkout session ${stripeCheckoutSession.id} created successfully.`);

    return createJsonResponse({ sessionId: stripeCheckoutSession.id, url: stripeCheckoutSession.url } as CheckoutSuccessResponse, 200);

  } catch (error: any) {
    console.error(`${logPrefix} ERROR: Unhandled error in main try block:`, error.message, error.stack);
    return createJsonResponse({ error: 'Internal Server Error. Please try again later or contact support.', details: error.message }, 500);
  }
});