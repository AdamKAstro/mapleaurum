//supabase/functions/stripe-checkout/index.tsx
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0'; // Use a specific version
import { createClient, SupabaseClient, User } from 'npm:@supabase/supabase-js@2.49.1'; // Use specific version and import types

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
  url: string | null; // url can be null according to Stripe types
}

interface ErrorResponse {
  error: string;
}

// --- Environment Variable Validation ---
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
const frontendUrl = Deno.env.get('FRONTEND_URL') ?? 'https://mapleaurum.com'; // Default or get from env

if (!supabaseUrl) throw new Error("Missing environment variable: SUPABASE_URL");
if (!supabaseServiceRoleKey) throw new Error("Missing environment variable: SUPABASE_SERVICE_ROLE_KEY");
if (!stripeSecretKey) throw new Error("Missing environment variable: STRIPE_SECRET_KEY");
// --- End Environment Variable Validation ---


// Initialize Supabase client with Service Role Key
// Needed for database operations like creating customer/subscription records
const supabaseAdmin: SupabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey);

// Initialize Stripe client
const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2024-06-20', // Pin the API version
  typescript: true, // Enable TypeScript support if available in the version
  appInfo: {
    name: 'MapleAurum Stripe Integration', // Updated App Name
    version: '1.0.0',
  },
});

// Helper function to create responses with specific CORS headers
function createCorsResponse(body: object | null, status = 200): Response {
  // Allow requests only from your frontend domain in production
  const allowedOrigin = frontendUrl; // Use the variable set above

  const headers = {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS', // Only allow POST and OPTIONS
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', // Be specific
  };

  if (status === 204) {
    return new Response(null, { status, headers });
  }

  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...headers,
      'Content-Type': 'application/json',
      'Vary': 'Origin', // Add Vary header for CORS
    },
  });
}

// Helper for parameter validation (using explicit types)
type ExpectedType = 'string' | { values: string[] };
type Expectations<T> = { [K in keyof T]: ExpectedType };

function validateParameters<T extends Record<string, any>>(values: T, expected: Expectations<T>): string | undefined {
    for (const parameter in expected) { // Iterate over expected keys
        const expectation = expected[parameter];
        const value = values[parameter];

        if (typeof expectation === 'string') { // Expecting a string
            if (value == null) { // Check for null or undefined
                return `Missing required parameter: ${parameter}`;
            }
            if (typeof value !== 'string' || value.trim() === '') { // Check type and non-empty
                return `Expected parameter ${parameter} to be a non-empty string, got: ${JSON.stringify(value)}`;
            }
        } else { // Expecting one of specific values
             if (!expectation.values.includes(value)) {
                return `Expected parameter ${parameter} to be one of: ${expectation.values.join(', ')}. Got: ${value}`;
            }
        }
    }
    return undefined; // No errors
}


// --- Main Edge Function Logic ---
Deno.serve(async (req: Request) => {
  // 1. Handle CORS Preflight Request
  if (req.method === 'OPTIONS') {
    console.info("Handling OPTIONS preflight request");
    return createCorsResponse({}, 204);
  }

  // 2. Check Request Method
  if (req.method !== 'POST') {
     console.warn(`Received non-POST request: ${req.method}`);
    return createCorsResponse({ error: 'Method Not Allowed' }, 405);
  }

  // 3. Parse and Validate Request Body
  let requestBody: CheckoutRequestBody;
  try {
    requestBody = await req.json();
    console.info("Received request body:", requestBody);
  } catch (parseError) {
    console.error("Failed to parse request body:", parseError);
    return createCorsResponse({ error: 'Invalid request body: Could not parse JSON.' }, 400);
  }

  const validationError = validateParameters<CheckoutRequestBody>(requestBody, {
    price_id: 'string',
    success_url: 'string',
    cancel_url: 'string',
    mode: { values: ['payment', 'subscription'] },
  });

  if (validationError) {
    console.warn("Request body validation failed:", validationError);
    return createCorsResponse({ error: `Invalid input: ${validationError}` }, 400);
  }

  const { price_id, success_url, cancel_url, mode } = requestBody;

  try {
    // 4. Authenticate Supabase User
    console.info("Authenticating user...");
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.warn("Missing or invalid Authorization header");
        return createCorsResponse({ error: 'Missing or invalid Authorization header' }, 401);
    }
    const token = authHeader.replace('Bearer ', '');

    const { data: { user }, error: getUserError } = await supabaseAdmin.auth.getUser(token);

    if (getUserError) {
      console.error("Supabase auth error:", getUserError);
      return createCorsResponse({ error: `Authentication failed: ${getUserError.message}` }, 401);
    }
    if (!user) {
       console.warn("User not found for provided token.");
      return createCorsResponse({ error: 'User not found' }, 404);
    }
    console.info(`User ${user.id} authenticated successfully.`);

    // 5. Get or Create Stripe Customer and DB Records
    let customerId: string;
    console.info(`Looking up customer for user ${user.id}...`);

    const { data: customerData, error: getCustomerError } = await supabaseAdmin
      .from('stripe_customers')
      .select('customer_id')
      .eq('user_id', user.id)
      .is('deleted_at', null) // Ensure customer not marked as deleted
      .maybeSingle();

    if (getCustomerError) {
      console.error(`Database error fetching customer for user ${user.id}:`, getCustomerError);
      return createCorsResponse({ error: 'Database error fetching customer information.' }, 500);
    }

    if (!customerData?.customer_id) {
      console.info(`No existing Stripe customer found for user ${user.id}. Creating new one...`);
      // Create Stripe Customer
      const newStripeCustomer = await stripe.customers.create({
        email: user.email,
        metadata: { userId: user.id }, // Link Supabase user ID in Stripe metadata
        name: user.email, // Optionally add name
      });
      customerId = newStripeCustomer.id;
      console.info(`Created new Stripe customer ${customerId} for user ${user.id}.`);

      // Insert into DB: stripe_customers
      const { error: insertCustomerError } = await supabaseAdmin
        .from('stripe_customers')
        .insert({ user_id: user.id, customer_id: customerId });

      if (insertCustomerError) {
        console.error(`Failed to insert customer mapping for user ${user.id}, customer ${customerId}:`, insertCustomerError);
        // Attempt cleanup - Best effort
        try { await stripe.customers.del(customerId); console.warn(`Cleaned up Stripe customer ${customerId} due to DB insert failure.`); }
        catch (delErr) { console.error(`Failed cleanup for Stripe customer ${customerId}:`, delErr); }
        return createCorsResponse({ error: 'Database error creating customer mapping.' }, 500);
      }
      console.info(`Successfully inserted customer mapping for user ${user.id}.`);

      // Insert placeholder subscription record if mode is 'subscription'
      if (mode === 'subscription') {
        console.info(`Creating placeholder subscription record for new customer ${customerId}...`);
        const { error: insertSubError } = await supabaseAdmin
          .from('stripe_subscriptions')
          .insert({ customer_id: customerId, status: 'incomplete' }); // Use 'incomplete' or similar initial status

        if (insertSubError) {
          console.error(`Failed to insert placeholder subscription for customer ${customerId}:`, insertSubError);
          // Note: Cleanup is harder here, customer already created. Log error.
          return createCorsResponse({ error: 'Database error creating initial subscription record.' }, 500);
        }
         console.info(`Successfully inserted placeholder subscription record for customer ${customerId}.`);
      }

    } else {
      customerId = customerData.customer_id;
      console.info(`Found existing Stripe customer ${customerId} for user ${user.id}.`);
      // Optional: Ensure subscription placeholder exists if needed (logic seems fine)
      if (mode === 'subscription') {
         const { data: subData, error: getSubError } = await supabaseAdmin
            .from('stripe_subscriptions')
            .select('status') // Select minimal data needed
            .eq('customer_id', customerId)
            .is('deleted_at', null) // Ensure not deleted
            .maybeSingle();

         if (getSubError) {
             console.error(`Database error fetching subscription for customer ${customerId}:`, getSubError);
             return createCorsResponse({ error: 'Database error fetching subscription information.' }, 500);
         }
         if (!subData) {
             console.info(`No existing subscription record found for existing customer ${customerId}. Creating placeholder...`);
             const { error: insertSubError } = await supabaseAdmin
                .from('stripe_subscriptions')
                .insert({ customer_id: customerId, status: 'incomplete' }); // Use 'incomplete'

             if (insertSubError) {
                 console.error(`Failed to insert placeholder subscription for existing customer ${customerId}:`, insertSubError);
                 return createCorsResponse({ error: 'Database error creating subscription record for existing customer.' }, 500);
             }
              console.info(`Successfully inserted placeholder subscription record for existing customer ${customerId}.`);
         }
      }
    }

    // 6. Create Stripe Checkout Session
    console.info(`Creating Stripe Checkout session for customer ${customerId}, price ${price_id}, mode ${mode}...`);
    const stripeSessionCreateParams: Stripe.Checkout.SessionCreateParams = {
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [{ price: price_id, quantity: 1 }],
        mode: mode,
        success_url: success_url, // Ensure these are valid URLs
        cancel_url: cancel_url,   // Ensure these are valid URLs
        // Optionally add metadata
        metadata: {
            supabaseUserId: user.id,
        },
        // Optionally allow promotion codes
        // allow_promotion_codes: true,
    };

    const stripeSession: Stripe.Checkout.Session = await stripe.checkout.sessions.create(stripeSessionCreateParams);
    console.info(`Successfully created Stripe Checkout session ${stripeSession.id} for customer ${customerId}.`);

    // 7. Return Success Response
    const responseBody: CheckoutSuccessResponse = {
        sessionId: stripeSession.id,
        url: stripeSession.url,
    };
    return createCorsResponse(responseBody, 200);

  } catch (error: unknown) {
    // 8. Handle Unexpected Errors
    console.error("Unhandled error in checkout function:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected internal server error occurred.";
    return createCorsResponse({ error: `Internal Server Error: ${errorMessage}` }, 500);
  }
});

