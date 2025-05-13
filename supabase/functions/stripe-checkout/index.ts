// supabase/functions/stripe-checkout/index.ts
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2.49.1';

// --- Define Expected Request Body Structure ---
interface CheckoutRequestBody {
  price_id: string;
  success_url: string;
  cancel_url: string;
  mode: 'subscription' | 'payment';
  plan_name?: string;
  interval?: 'month' | 'year';
}

// --- Define Expected Response Structure ---
interface CheckoutSuccessResponse {
  sessionId: string;
  url: string | null;
}

// --- Environment Variable Validation & Client Initialization ---
const STRIPE_MODE = Deno.env.get('STRIPE_MODE') || 'live';
const STRIPE_SECRET_KEY = STRIPE_MODE === 'test'
  ? Deno.env.get('STRIPE_SECRET_KEYT')!
  : Deno.env.get('STRIPE_SECRET_KEY')!;

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const frontendAppUrl = Deno.env.get('FRONTEND_URL') ?? 'http://localhost:3000';

if (!supabaseUrl) throw new Error('FATAL [stripe-checkout]: Missing SUPABASE_URL environment variable.');
if (!supabaseServiceRoleKey) throw new Error('FATAL [stripe-checkout]: Missing SUPABASE_SERVICE_ROLE_KEY environment variable.');
if (!STRIPE_SECRET_KEY) throw new Error(`FATAL [stripe-checkout]: Missing STRIPE_SECRET_KEY${STRIPE_MODE === 'test' ? 'T' : ''} environment variable.`);

const supabaseAdmin: SupabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey);
const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
  typescript: true,
  appInfo: { name: 'MapleAurum/stripe-checkout', version: '1.1.0' },
});

// --- CORS Helper ---
function createJsonResponse(body: object | null, status = 200, extraHeaders = {}): Response {
  const headers = {
    'Access-Control-Allow-Origin': frontendAppUrl,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Content-Type': 'application/json',
    'Vary': 'Origin',
    ...extraHeaders,
  };
  return new Response(status === 204 ? null : JSON.stringify(body), { status, headers });
}

// --- Parameter Validation Helper ---
type ExpectedParamType = 'string' | { values: ReadonlyArray<string> };
type ParamExpectations<T> = { [K in keyof T]?: ExpectedParamType };

function validateOptionalParams<T extends Record<string, any>>(
  values: T,
  expected: ParamExpectations<T>
): string | undefined {
  for (const parameter in expected) {
    if (values[parameter] == null) continue;

    const expectation = expected[parameter]!;
    const value = values[parameter];

    if (typeof expectation === 'string') {
      if (typeof value !== 'string' || value.trim() === '') {
        return `Optional parameter ${parameter} must be a non-empty string if provided, got: ${JSON.stringify(value)}`;
      }
    } else {
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
    console.info(`${logPrefix} INFO: Parsed request body:`, JSON.stringify(requestBody));
  } catch (parseError) {
    console.error(`${logPrefix} ERROR: Failed to parse request body:`, parseError.message);
    return createJsonResponse({ error: 'Invalid request: Could not parse JSON body.', details: parseError.message }, 400);
  }

  const requiredParams: (keyof CheckoutRequestBody)[] = ['price_id', 'success_url', 'cancel_url', 'mode'];
  for (const param of requiredParams) {
    if (!requestBody[param] || (typeof requestBody[param] === 'string' && (requestBody[param] as string).trim() === '')) {
      const errorMsg = `Invalid input: Missing or empty required parameter: ${param}`;
      console.warn(`${logPrefix} WARN: ${errorMsg}`);
      return createJsonResponse({ error: errorMsg }, 400);
    }
  }

  const optionalValidationError = validateOptionalParams<CheckoutRequestBody>(
    requestBody,
    {
      mode: { values: ['payment', 'subscription'] },
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

    let fetchedPrice: Stripe.Price;
    let derivedPlanName: string = 'Unknown Plan';
    let derivedInterval: 'month' | 'year' | undefined = undefined;

    try {
      console.info(`${logPrefix} INFO: Retrieving Stripe Price object for ID ${price_id} to validate and get product details.`);
      fetchedPrice = await stripe.prices.retrieve(price_id, { expand: ['product'] });
      if (!fetchedPrice || !fetchedPrice.active) {
        throw new Error(`Price ID ${price_id} is not active or does not exist in Stripe.`);
      }
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

    const finalPlanNameForMetadata = clientPlanName || derivedPlanName;
    const finalIntervalForMetadata = clientInterval || derivedInterval;

    let stripeCustomerId: string;
    console.info(`${logPrefix} INFO: Looking up Stripe customer for Supabase user ${user.id}.`);
    const { data: customerMapping, error: dbCustomerError } = await supabaseAdmin
      .from('stripe_customers')
      .select('customer_id')
      .eq('user_id', user.id)
      .maybeSingle();

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
        }
      } catch (stripeCustError: any) {
        console.warn(`${logPrefix} WARN: Stripe customer ${customerMapping.customer_id} (from DB for user ${user.id}) not valid in Stripe (${stripeCustError.message}). Creating a new one.`);
      }
    }

    if (!stripeCustomerId!) {
      console.info(`${logPrefix} INFO: Creating new Stripe customer for user ${user.id} (${user.email}).`);
      const customerCreateParams: Stripe.CustomerCreateParams = {
        email: user.email!,
        name: user.user_metadata?.full_name || user.email!,
        metadata: { supabaseUserId: user.id },
      };
      const newStripeCustomer = await stripe.customers.create(customerCreateParams);
      stripeCustomerId = newStripeCustomer.id;
      console.info(`${logPrefix} INFO: Created new Stripe customer ${stripeCustomerId}. Storing mapping in DB.`);

      const { error: upsertError } = await supabaseAdmin
        .from('stripe_customers')
        .upsert(
          { user_id: user.id, customer_id: stripeCustomerId, updated_at: new Date().toISOString() },
          { onConflict: 'user_id' }
        );
      if (upsertError) {
        console.error(`${logPrefix} ERROR: Failed to upsert Stripe customer mapping for user ${user.id}:`, upsertError.message);
      }
    }

    if (mode === 'subscription') {
      console.info(`${logPrefix} INFO: Checking for existing *active* subscriptions for customer ${stripeCustomerId}.`);
      const { data: existingSubscriptions, error: listSubError } = await stripe.subscriptions.list({
        customer: stripeCustomerId,
        status: 'active',
        limit: 1,
      });

      if (listSubError) {
        console.error(`${logPrefix} ERROR: Failed to list subscriptions for customer ${stripeCustomerId}:`, listSubError.message);
      }

      if (existingSubscriptions && existingSubscriptions.data.length > 0) {
        console.warn(`${logPrefix} WARN: Customer ${stripeCustomerId} (User ${user.id}) already has an active subscription(s). Current checkout will create a new, additional subscription. ID of one active sub: ${existingSubscriptions.data[0].id}. Plan changes should ideally be handled via Stripe Customer Portal or a dedicated upgrade/downgrade flow.`);
      }
    }

    console.info(`${logPrefix} INFO: Creating Stripe Checkout session for Stripe customer ${stripeCustomerId}, price ${price_id}, mode ${mode}.`);
    const checkoutSessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      line_items: [{ price: price_id, quantity: 1 }],
      mode: mode,
      success_url: success_url,
      cancel_url: cancel_url,
      metadata: {
        supabaseUserId: user.id,
        priceId: price_id,
        planName: finalPlanNameForMetadata,
        interval: finalIntervalForMetadata,
      },
    };

    const stripeCheckoutSession: Stripe.Checkout.Session = await stripe.checkout.sessions.create(checkoutSessionParams);
    console.info(`${logPrefix} INFO: Stripe Checkout session ${stripeCheckoutSession.id} created successfully.`);

    return createJsonResponse({ sessionId: stripeCheckoutSession.id, url: stripeCheckoutSession.url } as CheckoutSuccessResponse, 200);

  } catch (error: any) {
    console.error(`${logPrefix} ERROR: Unhandled error in main try block:`, error.message, error.stack);
    return createJsonResponse({ error: 'Internal Server Error. Please try again later or contact support.', details: error.message }, 500);
  }
});