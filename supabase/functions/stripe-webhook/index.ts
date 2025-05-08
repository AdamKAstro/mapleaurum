import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient, SupabaseClient, User } from 'npm:@supabase/supabase-js@2.49.1';

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
}

// --- Environment Variable Validation ---
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
const frontendUrl = Deno.env.get('FRONTEND_URL') ?? 'https://mapleaurum.com';

if (!supabaseUrl) throw new Error("Missing environment variable: SUPABASE_URL");
if (!supabaseServiceRoleKey) throw new Error("Missing environment variable: SUPABASE_SERVICE_ROLE_KEY");
if (!stripeSecretKey) throw new Error("Missing environment variable: STRIPE_SECRET_KEY");
// --- End Environment Variable Validation ---


// Initialize Supabase client with Service Role Key
const supabaseAdmin: SupabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey);

// Initialize Stripe client
const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2024-06-20',
  typescript: true,
  appInfo: {
    name: 'MapleAurum Stripe Integration',
    version: '1.0.0',
  },
});

// Helper function to create responses with specific CORS headers
function createCorsResponse(body: object | null, status = 200): Response {
  const allowedOrigin = frontendUrl;
  const headers = {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Vary': 'Origin',
  };
  if (status === 204) {
    return new Response(null, { status, headers });
  }
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
}

// Helper for parameter validation
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
  console.log(`[stripe-checkout] Received request: ${req.method} ${req.url}`); // Log incoming request

  // 1. Handle CORS Preflight Request
  if (req.method === 'OPTIONS') {
    console.info("[stripe-checkout] Handling OPTIONS preflight request");
    return createCorsResponse({}, 204);
  }

  // 2. Check Request Method
  if (req.method !== 'POST') {
     console.warn(`[stripe-checkout] Received non-POST request: ${req.method}`);
    return createCorsResponse({ error: 'Method Not Allowed' }, 405);
  }

  // --- ADDED: Log raw body before parsing ---
  let rawBody: string | null = null;
  try {
      rawBody = await req.text(); // Read body as text first
      console.log("[stripe-checkout] Raw request body:", rawBody);
  } catch (bodyReadError) {
      console.error("[stripe-checkout] Failed to read request body:", bodyReadError);
      return createCorsResponse({ error: 'Failed to read request body.' }, 500);
  }
  // --- END ADDED LOG ---

  // 3. Parse and Validate Request Body
  let requestBody: CheckoutRequestBody;
  try {
    if (!rawBody) throw new Error("Request body is empty.");
    requestBody = JSON.parse(rawBody); // Parse the raw body text
    console.info("[stripe-checkout] Parsed request body:", requestBody);
  } catch (parseError) {
    console.error("[stripe-checkout] Failed to parse request body:", parseError, "Raw body was:", rawBody);
    return createCorsResponse({ error: 'Invalid request body: Could not parse JSON.' }, 400);
  }

  const validationError = validateParameters<CheckoutRequestBody>(requestBody, {
    price_id: 'string',
    success_url: 'string',
    cancel_url: 'string',
    mode: { values: ['payment', 'subscription'] },
  });

  if (validationError) {
    console.warn("[stripe-checkout] Request body validation failed:", validationError);
    return createCorsResponse({ error: `Invalid input: ${validationError}` }, 400); // Return 400 for validation errors
  }
  // --- END VALIDATION ---

  const { price_id, success_url, cancel_url, mode } = requestBody;

  try {
    // 4. Authenticate Supabase User
    console.info("[stripe-checkout] Authenticating user...");
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.warn("[stripe-checkout] Missing or invalid Authorization header");
        return createCorsResponse({ error: 'Missing or invalid Authorization header' }, 401);
    }
    const token = authHeader.replace('Bearer ', '');

    // Use supabaseAdmin (Service Role) client to validate the user token
    const { data: { user }, error: getUserError } = await supabaseAdmin.auth.getUser(token);

    if (getUserError) {
      console.error("[stripe-checkout] Supabase auth error:", getUserError);
      return createCorsResponse({ error: `Authentication failed: ${getUserError.message}` }, 401);
    }
    if (!user) {
       console.warn("[stripe-checkout] User not found for provided token.");
      return createCorsResponse({ error: 'User not found' }, 404);
    }
    console.info(`[stripe-checkout] User ${user.id} authenticated successfully.`);

    // 5. Get or Create Stripe Customer and DB Records
    // ... (rest of the customer/subscription lookup/create logic remains the same) ...
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
      return createCorsResponse({ error: 'Database error fetching customer information.' }, 500);
    }

    if (!customerData?.customer_id) {
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
        .insert({ user_id: user.id, customer_id: customerId });
      if (insertCustomerError) {
        console.error(`[stripe-checkout] Failed to insert customer mapping for user ${user.id}, customer ${customerId}:`, insertCustomerError);
        try { await stripe.customers.del(customerId); console.warn(`[stripe-checkout] Cleaned up Stripe customer ${customerId}.`); }
        catch (delErr) { console.error(`[stripe-checkout] Failed cleanup for Stripe customer ${customerId}:`, delErr); }
        return createCorsResponse({ error: 'Database error creating customer mapping.' }, 500);
      }
      console.info(`[stripe-checkout] Successfully inserted customer mapping for user ${user.id}.`);
      if (mode === 'subscription') {
        console.info(`[stripe-checkout] Creating placeholder subscription record for new customer ${customerId}...`);
        const { error: insertSubError } = await supabaseAdmin
          .from('stripe_subscriptions')
          .insert({ customer_id: customerId, status: 'incomplete' });
        if (insertSubError) {
          console.error(`[stripe-checkout] Failed to insert placeholder subscription for customer ${customerId}:`, insertSubError);
          return createCorsResponse({ error: 'Database error creating initial subscription record.' }, 500);
        }
         console.info(`[stripe-checkout] Successfully inserted placeholder subscription record for customer ${customerId}.`);
      }
    } else {
      customerId = customerData.customer_id;
      console.info(`[stripe-checkout] Found existing Stripe customer ${customerId} for user ${user.id}.`);
      if (mode === 'subscription') {
         const { data: subData, error: getSubError } = await supabaseAdmin
            .from('stripe_subscriptions')
            .select('status')
            .eq('customer_id', customerId)
            .is('deleted_at', null)
            .maybeSingle();
         if (getSubError) {
             console.error(`[stripe-checkout] Database error fetching subscription for customer ${customerId}:`, getSubError);
             return createCorsResponse({ error: 'Database error fetching subscription information.' }, 500);
         }
         if (!subData) {
             console.info(`[stripe-checkout] No existing subscription record found for existing customer ${customerId}. Creating placeholder...`);
             const { error: insertSubError } = await supabaseAdmin
                .from('stripe_subscriptions')
                .insert({ customer_id: customerId, status: 'incomplete' });
             if (insertSubError) {
                 console.error(`[stripe-checkout] Failed to insert placeholder subscription for existing customer ${customerId}:`, insertSubError);
                 return createCorsResponse({ error: 'Database error creating subscription record for existing customer.' }, 500);
             }
              console.info(`[stripe-checkout] Successfully inserted placeholder subscription record for existing customer ${customerId}.`);
         }
      }
    }
    // ... (end of customer/subscription lookup/create logic) ...


    // 6. Create Stripe Checkout Session
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

    const stripeSession: Stripe.Checkout.Session = await stripe.checkout.sessions.create(stripeSessionCreateParams);
    console.info(`[stripe-checkout] Successfully created Stripe Checkout session ${stripeSession.id} for customer ${customerId}.`);

    // 7. Return Success Response
    const responseBody: CheckoutSuccessResponse = {
        sessionId: stripeSession.id,
        url: stripeSession.url,
    };
    return createCorsResponse(responseBody, 200);

  } catch (error: unknown) {
    // 8. Handle Unexpected Errors
    console.error("[stripe-checkout] Unhandled error in checkout function:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected internal server error occurred.";
    return createCorsResponse({ error: `Internal Server Error: ${errorMessage}` }, 500);
  }
});
