//supabase/functions/stripe-checkout/index.ts
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2.49.1';

// Define expected request body structure
interface CheckoutRequestBody {
  price_id: string;
  success_url: string;
  cancel_url: string;
  mode: 'subscription' | 'payment';
}

// Define expected response structure
interface CheckoutSuccessResponse {
  sessionId: string;
  url: string | null;
}

interface ErrorResponse {
  error: string;
  statusCode: number;
  details?: string;
}

// --- Environment Variable Validation ---
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
const frontendUrl = Deno.env.get('FRONTEND_URL') ?? 'https://mapleaurum.com';

if (!supabaseUrl) throw new Error('Missing environment variable: SUPABASE_URL');
if (!supabaseServiceRoleKey) throw new Error('Missing environment variable: SUPABASE_SERVICE_ROLE_KEY');
if (!stripeSecretKey) throw new Error('Missing environment variable: STRIPE_SECRET_KEY');

// --- Initialize Clients ---
const supabaseAdmin: SupabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey);
const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2024-06-20',
  typescript: true,
  appInfo: {
    name: 'MapleAurum Stripe Integration',
    version: '1.0.0',
  },
});

// --- Helper Functions ---
function createCorsResponse(body: object | null, status = 200): Response {
  const headers = {
    'Access-Control-Allow-Origin': frontendUrl,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Content-Type': 'application/json',
    'Vary': 'Origin',
  };
  if (status === 204) {
    return new Response(null, { status, headers });
  }
  return new Response(JSON.stringify(body), { status, headers });
}

type ExpectedType = 'string' | { values: string[] };
type Expectations<T> = { [K in keyof T]: ExpectedType };

function validateParameters<T extends Record<string, any>>(values: T, expected: Expectations<T>): string | undefined {
  for (const parameter in expected) {
    const expectation = expected[parameter];
    const value = values[parameter];
    if (typeof expectation === 'string') {
      if (value == null) return `Missing required parameter: ${parameter}`;
      if (typeof value !== 'string' || value.trim() === '') return `Expected parameter ${parameter} to be a non-empty string, got: ${JSON.stringify(value)}`;
    } else {
      if (!expectation.values.includes(value)) return `Expected parameter ${parameter} to be one of: ${expectation.values.join(', ')}. Got: ${value}`;
    }
  }
  return undefined;
}

// --- Main Edge Function Logic ---
Deno.serve(async (req: Request) => {
  console.log(`[stripe-checkout] Received request: ${req.method} ${req.url}`);

  // 1. Handle CORS Preflight Request
  if (req.method === 'OPTIONS') {
    console.info('[stripe-checkout] Handling OPTIONS preflight request');
    return createCorsResponse({}, 204);
  }

  // 2. Check Request Method
  if (req.method !== 'POST') {
    console.warn(`[stripe-checkout] Received non-POST request: ${req.method}`);
    return createCorsResponse({ error: 'Method Not Allowed', statusCode: 405 }, 405);
  }

  // 3. Parse and Validate Request Body
  let rawBody: string | null = null;
  try {
    rawBody = await req.text();
    console.log('[stripe-checkout] Raw request body:', rawBody);
  } catch (bodyReadError) {
    console.error('[stripe-checkout] Failed to read request body:', bodyReadError);
    return createCorsResponse({ error: 'Failed to read request body.', statusCode: 500, details: bodyReadError.message }, 500);
  }

  let requestBody: CheckoutRequestBody;
  try {
    if (!rawBody) throw new Error('Request body is empty.');
    requestBody = JSON.parse(rawBody);
    console.info('[stripe-checkout] Parsed request body:', requestBody);
  } catch (parseError) {
    console.error('[stripe-checkout] Failed to parse request body:', parseError, 'Raw body was:', rawBody);
    return createCorsResponse({ error: 'Invalid request body: Could not parse JSON.', statusCode: 400, details: parseError.message }, 400);
  }

  const validationError = validateParameters<CheckoutRequestBody>(requestBody, {
    price_id: 'string',
    success_url: 'string',
    cancel_url: 'string',
    mode: { values: ['payment', 'subscription'] },
  });

  if (validationError) {
    console.warn('[stripe-checkout] Request body validation failed:', validationError);
    return createCorsResponse({ error: `Invalid input: ${validationError}`, statusCode: 400 }, 400);
  }

  const { price_id, success_url, cancel_url, mode } = requestBody;

  try {
    // 4. Authenticate Supabase User
    console.info('[stripe-checkout] Authenticating user...');
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.warn('[stripe-checkout] Missing or invalid Authorization header');
      return createCorsResponse({ error: 'Missing or invalid Authorization header', statusCode: 401 }, 401);
    }
    const token = authHeader.replace('Bearer ', '');

    const { data: { user }, error: getUserError } = await supabaseAdmin.auth.getUser(token);
    if (getUserError) {
      console.error('[stripe-checkout] Supabase auth error:', getUserError);
      return createCorsResponse({ error: `Authentication failed: ${getUserError.message}`, statusCode: 401, details: getUserError.message }, 401);
    }
    if (!user) {
      console.warn('[stripe-checkout] User not found for provided token.');
      return createCorsResponse({ error: 'User not found', statusCode: 404 }, 404);
    }
    console.info(`[stripe-checkout] User ${user.id} authenticated successfully.`);

    // 5. Validate Price ID
    console.info(`[stripe-checkout] Validating price ID ${price_id}...`);
    try {
      const price = await stripe.prices.retrieve(price_id);
      console.info(`[stripe-checkout] Price ID ${price_id} is valid:`, price);
    } catch (stripeError: any) {
      console.error(`[stripe-checkout] Invalid price ID ${price_id}:`, stripeError);
      return createCorsResponse({ error: `Invalid price ID: ${stripeError.message}`, statusCode: 400, details: stripeError.message }, 400);
    }

    // 6. Get or Create Stripe Customer
    let customerId: string;
    console.info(`[stripe-checkout] Looking up customer for user ${user.id}...`);
    const { data: customerData, error: getCustomerError } = await supabaseAdmin
      .from('stripe_customers')
      .select('customer_id')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .maybeSingle();

    if (getCustomerError) {
      console.error(`[stripe-checkout] Database error fetching customer for user ${user.id}:`, getCustomerError);
      return createCorsResponse({ error: 'Database error fetching customer information.', statusCode: 500, details: getCustomerError.message }, 500);
    }

    if (customerData?.customer_id) {
      // Verify customer exists in Stripe
      try {
        const stripeCustomer = await stripe.customers.retrieve(customerData.customer_id);
        customerId = stripeCustomer.id;
        console.info(`[stripe-checkout] Found existing Stripe customer ${customerId} for user ${user.id}.`);
      } catch (stripeError: any) {
        if (stripeError.code === 'resource_missing') {
          console.warn(`[stripe-checkout] Customer ${customerData.customer_id} not found in Stripe. Marking as invalid and creating new customer...`);
          // Mark invalid customer_id as NULL
          const { error: updateCustomerError } = await supabaseAdmin
            .from('stripe_customers')
            .update({ customer_id: null, updated_at: new Date().toISOString() })
            .eq('user_id', user.id);
          if (updateCustomerError) {
            console.error(`[stripe-checkout] Failed to update customer mapping for user ${user.id}:`, updateCustomerError);
            return createCorsResponse({ error: 'Database error updating customer mapping.', statusCode: 500, details: updateCustomerError.message }, 500);
          }
          console.info(`[stripe-checkout] Marked invalid customer ${customerData.customer_id} as NULL for user ${user.id}.`);
          // Create new customer
          const newStripeCustomer = await stripe.customers.create({
            email: user.email,
            metadata: { userId: user.id },
            name: user.email,
          });
          customerId = newStripeCustomer.id;
          // Update stripe_customers with new customer_id
          const { error: updateNewCustomerError } = await supabaseAdmin
            .from('stripe_customers')
            .update({ customer_id: customerId, updated_at: new Date().toISOString() })
            .eq('user_id', user.id);
          if (updateNewCustomerError) {
            console.error(`[stripe-checkout] Failed to update new customer mapping for user ${user.id}, customer ${customerId}:`, updateNewCustomerError);
            return createCorsResponse({ error: 'Database error updating new customer mapping.', statusCode: 500, details: updateNewCustomerError.message }, 500);
          }
          console.info(`[stripe-checkout] Successfully updated customer mapping to new customer ${customerId} for user ${user.id}.`);
        } else {
          console.error(`[stripe-checkout] Stripe error verifying customer ${customerData.customer_id}:`, stripeError);
          return createCorsResponse({ error: `Stripe error: ${stripeError.message}`, statusCode: 500, details: stripeError.message }, 500);
        }
      }
    } else {
      console.info(`[stripe-checkout] No existing Stripe customer found for user ${user.id}. Creating new one...`);
      const newStripeCustomer = await stripe.customers.create({
        email: user.email,
        metadata: { userId: user.id },
        name: user.email,
      });
      customerId = newStripeCustomer.id;
      console.info(`[stripe-checkout] Created new Stripe customer ${customerId} for user ${user.id}.`);
      const { error: insertCustomerError } = await supabaseAdmin
        .from('stripe_customers')
        .upsert(
          {
            user_id: user.id,
            customer_id: customerId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );
      if (insertCustomerError) {
        console.error(`[stripe-checkout] Failed to insert customer mapping for user ${user.id}, customer ${customerId}:`, insertCustomerError);
        return createCorsResponse({ error: 'Database error creating customer mapping.', statusCode: 500, details: insertCustomerError.message }, 500);
      }
      console.info(`[stripe-checkout] Successfully inserted customer mapping for user ${user.id}.`);
    }

    // 7. Handle Subscription Placeholder
    if (mode === 'subscription') {
      console.info(`[stripe-checkout] Checking subscription record for customer ${customerId}...`);
      const { data: subData, error: getSubError } = await supabaseAdmin
        .from('stripe_subscriptions')
        .select('status, subscription_id')
        .eq('customer_id', customerId)
        .is('deleted_at', null)
        .maybeSingle();
      if (getSubError) {
        console.error(`[stripe-checkout] Database error fetching subscription for customer ${customerId}:`, getSubError);
        return createCorsResponse({ error: 'Database error fetching subscription information.', statusCode: 500, details: getSubError.message }, 500);
      }
      if (subData && subData.subscription_id && subData.status === 'active') {
        console.info(`[stripe-checkout] Found active subscription ${subData.subscription_id} for customer ${customerId}. Updating...`);
        try {
          await stripe.subscriptions.update(subData.subscription_id, {
            items: [{ price: price_id }],
            proration_behavior: 'create_prorations',
          });
          console.info(`[stripe-checkout] Successfully updated subscription ${subData.subscription_id} to price ${price_id}.`);
        } catch (stripeError: any) {
          console.error(`[stripe-checkout] Failed to update subscription ${subData.subscription_id}:`, stripeError);
          return createCorsResponse({ error: `Failed to update subscription: ${stripeError.message}`, statusCode: 500, details: stripeError.message }, 500);
        }
      } else if (!subData) {
        console.info(`[stripe-checkout] No existing subscription record found for customer ${customerId}. Creating placeholder...`);
        const { error: insertSubError } = await supabaseAdmin
          .from('stripe_subscriptions')
          .insert({
            customer_id: customerId,
            status: 'incomplete',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        if (insertSubError) {
          console.error(`[stripe-checkout] Failed to insert placeholder subscription for customer ${customerId}:`, insertSubError);
          return createCorsResponse({ error: 'Database error creating subscription record.', statusCode: 500, details: insertSubError.message }, 500);
        }
        console.info(`[stripe-checkout] Successfully inserted placeholder subscription record for customer ${customerId}.`);
      }
    }

    // 8. Create Stripe Checkout Session
    console.info(`[stripe-checkout] Creating Stripe Checkout session for customer ${customerId}, price ${price_id}, mode ${mode}...`);
    const stripeSessionCreateParams: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: price_id, quantity: 1 }],
      mode: mode,
      success_url: success_url,
      cancel_url: cancel_url,
      metadata: { supabaseUserId: user.id },
    };

    try {
      const stripeSession: Stripe.Checkout.Session = await stripe.checkout.sessions.create(stripeSessionCreateParams);
      console.info(`[stripe-checkout] Successfully created Stripe Checkout session ${stripeSession.id} for customer ${customerId}.`);

      // 9. Return Success Response
      const responseBody: CheckoutSuccessResponse = {
        sessionId: stripeSession.id,
        url: stripeSession.url,
      };
      return createCorsResponse(responseBody, 200);
    } catch (stripeError: any) {
      console.error(`[stripe-checkout] Failed to create Stripe Checkout session:`, stripeError);
      return createCorsResponse({ error: `Failed to create checkout session: ${stripeError.message}`, statusCode: 500, details: stripeError.message }, 500);
    }
  } catch (error: unknown) {
    console.error('[stripe-checkout] Unhandled error in checkout function:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected internal server error occurred.';
    const errorDetails = error instanceof Error && error.stack ? error.stack : String(error);
    return createCorsResponse({ error: `Internal Server Error: ${errorMessage}`, statusCode: 500, details: errorDetails }, 500);
  }
});