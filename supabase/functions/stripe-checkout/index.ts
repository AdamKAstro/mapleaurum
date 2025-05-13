// supabase/functions/stripe-checkout/index.ts
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0'; // Or your preferred/latest compatible version
import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2.49.1'; // Or your current version

interface CheckoutRequestBody {
  price_id: string;
  success_url: string;
  cancel_url: string;
  mode: 'subscription' | 'payment';
  plan_name?: string;
  interval?: 'month' | 'year';
}

interface CheckoutSuccessResponse {
  sessionId: string;
  url: string | null;
}

// --- Environment Configuration ---
const STRIPE_MODE_ENV = Deno.env.get('STRIPE_MODE')?.toLowerCase() || 'live'; // Default to 'live' if not set
const logPrefix = `[stripe-checkout][${STRIPE_MODE_ENV.toUpperCase()}]`;

console.log(`${logPrefix} INFO: Function initializing in '${STRIPE_MODE_ENV}' mode.`);

const LIVE_STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY');
const TEST_STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEYT'); // Your test key

const STRIPE_SECRET_KEY_TO_USE = STRIPE_MODE_ENV === 'test' ? TEST_STRIPE_SECRET_KEY : LIVE_STRIPE_SECRET_KEY;

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const PROD_FRONTEND_DOMAIN = Deno.env.get('FRONTEND_URL_PRODUCTION'); // e.g., https://mapleaurum.com
const DEV_FRONTEND_ORIGIN_PRIMARY = Deno.env.get('FRONTEND_URL_DEVELOPMENT') || 'http://localhost:3000'; // Primary dev URL
const DEV_FRONTEND_ORIGIN_ALTERNATE = 'http://localhost:5173'; // Common Vite port

// Validate essential environment variables
if (!STRIPE_SECRET_KEY_TO_USE) throw new Error(`${logPrefix} FATAL: Stripe secret key for mode '${STRIPE_MODE_ENV}' is MISSING. Check STRIPE_SECRET_KEY (for live) or STRIPE_SECRET_KEYT (for test).`);
if (!supabaseUrl) throw new Error(`${logPrefix} FATAL: Missing SUPABASE_URL env variable.`);
if (!supabaseServiceRoleKey) throw new Error(`${logPrefix} FATAL: Missing SUPABASE_SERVICE_ROLE_KEY env variable.`);
if (STRIPE_MODE_ENV === 'live' && !PROD_FRONTEND_DOMAIN) {
    console.warn(`${logPrefix} WARN: FRONTEND_URL_PRODUCTION is not set. CORS might be overly restrictive or permissive in production.`);
}


const supabaseAdmin: SupabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey);
const stripe = new Stripe(STRIPE_SECRET_KEY_TO_USE, {
  apiVersion: '2024-06-20',
  typescript: true,
  appInfo: { name: 'MapleAurum/stripe-checkout', version: '1.3.0' }, // Version bump
});

// --- CORS Helper ---
function createJsonResponse(
    req: Request, 
    body: object | null, 
    status = 200, 
    extraHeaders = {}
): Response {
    const requestOrigin = req.headers.get('Origin');
    let accessControlAllowOrigin = '';

    const allowedProdOrigin = PROD_FRONTEND_DOMAIN;
    const allowedDevOrigins = [DEV_FRONTEND_ORIGIN_PRIMARY, DEV_FRONTEND_ORIGIN_ALTERNATE].filter(Boolean);

    if (STRIPE_MODE_ENV === 'production') {
        if (requestOrigin && requestOrigin === allowedProdOrigin) {
            accessControlAllowOrigin = allowedProdOrigin;
        } else {
            // In production, if origin doesn't match, we don't set it, or set it to the prod one.
            // Browser will block if it's a mismatch. This is more secure.
            accessControlAllowOrigin = allowedProdOrigin || ''; // Fallback to empty if prod url not set
            if (requestOrigin !== allowedProdOrigin) {
                 console.warn(`${logPrefix} CORS WARN (PROD): Request from '${requestOrigin}' does not match allowed '${allowedProdOrigin}'. Responding with '${accessControlAllowOrigin}'.`);
            }
        }
    } else { // Test or Development mode
        if (requestOrigin && (allowedDevOrigins.includes(requestOrigin) || requestOrigin.startsWith('http://localhost:'))) {
            accessControlAllowOrigin = requestOrigin; // Reflect dev origin
        } else {
            accessControlAllowOrigin = DEV_FRONTEND_ORIGIN_PRIMARY; // Fallback for dev
            console.warn(`${logPrefix} CORS WARN (DEV): Request from '${requestOrigin}' not in explicit dev list. Responding with primary dev origin '${DEV_FRONTEND_ORIGIN_PRIMARY}'.`);
        }
    }
    
    console.log(`${logPrefix} CORS Final: Request Origin: ${requestOrigin}, Access-Control-Allow-Origin: ${accessControlAllowOrigin}`);

    const headers = {
        'Access-Control-Allow-Origin': accessControlAllowOrigin,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, accept',
        'Content-Type': 'application/json',
        'Vary': 'Origin',
        ...extraHeaders,
    };
    return new Response(status === 204 ? null : JSON.stringify(body), { status, headers });
}

// --- Parameter Validation Helper (user's version) ---
type ExpectedParamType = 'string' | { values: ReadonlyArray<string> };
type ParamExpectations<T> = { [K in keyof T]?: ExpectedParamType };
function validateOptionalParams<T extends Record<string, any>>(values: T, expected: ParamExpectations<T>): string | undefined {
  for (const parameter in expected) {
    if (values[parameter] == null) continue;
    const expectation = expected[parameter]!; const value = values[parameter];
    if (typeof expectation === 'string') {
      if (typeof value !== 'string' || value.trim() === '') return `Optional parameter ${parameter} must be a non-empty string if provided, got: ${JSON.stringify(value)}`;
    } else {
      if (!expectation.values.includes(value)) return `Optional parameter ${parameter} must be one of: ${expectation.values.join(', ')} if provided. Got: ${value}`;
    }
  }
  return undefined;
}

// --- Main Edge Function Logic ---
Deno.serve(async (req: Request) => {
    console.log(`${logPrefix} INFO: Method: ${req.method}, URL: ${req.url}`);

    if (req.method === 'OPTIONS') {
        console.info(`${logPrefix} INFO: Handling OPTIONS preflight.`);
        return createJsonResponse(req, {}, 204);
    }
    if (req.method !== 'POST') {
        return createJsonResponse(req, { error: 'Method Not Allowed. Only POST requests are accepted.' }, 405);
    }

    let requestBody: CheckoutRequestBody;
    try {
        const rawBody = await req.text();
        if (!rawBody) throw new Error('Request body is empty.');
        requestBody = JSON.parse(rawBody);
    } catch (parseError) {
        console.error(`${logPrefix} ERROR: Failed to parse request body:`, parseError.message);
        return createJsonResponse(req, { error: 'Invalid request: Could not parse JSON body.', details: parseError.message }, 400);
    }
    console.info(`${logPrefix} INFO: Parsed request body (plan_name: ${requestBody.plan_name || 'N/A'}, price_id: ${requestBody.price_id}).`);


    const requiredParams: (keyof CheckoutRequestBody)[] = ['price_id', 'success_url', 'cancel_url', 'mode'];
    for (const param of requiredParams) {
        if (!requestBody[param] || (typeof requestBody[param] === 'string' && String(requestBody[param]).trim() === '')) {
             const errorMsg = `Invalid input: Missing or empty required parameter: ${param}`;
            console.warn(`${logPrefix} WARN: ${errorMsg}`);
            return createJsonResponse(req, { error: errorMsg }, 400);
        }
    }
    
    const optionalValidationError = validateOptionalParams(requestBody, {
        mode: { values: ['payment', 'subscription'] }, plan_name: 'string', interval: { values: ['month', 'year'] }
    });
    if (optionalValidationError) {
        console.warn(`${logPrefix} WARN: Request body validation failed:`, optionalValidationError);
        return createJsonResponse(req, { error: `Invalid input: ${optionalValidationError}` }, 400);
    }

    const { price_id, success_url, cancel_url, mode, plan_name: clientPlanName, interval: clientInterval } = requestBody;

    try {
        console.info(`${logPrefix} Authenticating Supabase user...`);
        const authHeader = req.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return createJsonResponse(req, { error: 'Authentication required: Missing or invalid Authorization header.' }, 401);
        }
        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

        if (authError || !user) {
            console.error(`${logPrefix} ERROR: Supabase auth error:`, authError?.message || 'User not found.');
            return createJsonResponse(req, { error: `Authentication failed: ${authError?.message || 'User not found.'}` }, authError?.status || 401);
        }
        console.info(`${logPrefix} User ${user.id} (${user.email}) authenticated.`);

        let fetchedPrice: Stripe.Price;
        let derivedPlanName = clientPlanName || 'Selected Plan';
        let derivedInterval = clientInterval;

        try {
            fetchedPrice = await stripe.prices.retrieve(price_id, { expand: ['product'] });
            if (!fetchedPrice?.active) throw new Error(`Price ID ${price_id} is inactive or does not exist in Stripe.`);
            if (fetchedPrice.product && typeof fetchedPrice.product === 'object' && 'name' in fetchedPrice.product) {
                derivedPlanName = clientPlanName || (fetchedPrice.product as Stripe.Product).name || derivedPlanName;
            }
            derivedInterval = clientInterval || fetchedPrice.recurring?.interval as ('month' | 'year' | undefined);
        } catch (priceErr: any) {
            console.error(`${logPrefix} ERROR: Invalid Stripe Price ID ${price_id}:`, priceErr.message);
            return createJsonResponse(req, { error: `Invalid product price. Please check the Price ID. Details: ${priceErr.message}` }, 400);
        }
        console.info(`${logPrefix} Stripe Price ${price_id} validated. Product: "${derivedPlanName}", Interval: ${derivedInterval}.`);

        let stripeCustomerId: string | undefined;
        const { data: customerMapping, error: dbCustomerError } = await supabaseAdmin
            .from('stripe_customers').select('customer_id').eq('user_id', user.id).maybeSingle();

        if (dbCustomerError) throw new Error(`Database error fetching Stripe customer mapping: ${dbCustomerError.message}`);

        if (customerMapping?.customer_id) {
            try {
                const existingStripeCustomer = await stripe.customers.retrieve(customerMapping.customer_id);
                if (existingStripeCustomer && !(existingStripeCustomer as Stripe.DeletedCustomer).deleted) {
                    stripeCustomerId = existingStripeCustomer.id;
                } else console.warn(`${logPrefix} WARN: Stripe customer ${customerMapping.customer_id} from DB is deleted/invalid. Will create anew.`);
            } catch (e: any) { console.warn(`${logPrefix} WARN: Failed to retrieve Stripe customer ${customerMapping.customer_id}. Will create anew. Error: ${e.message}`); }
        }

        if (!stripeCustomerId) {
            console.info(`${logPrefix} Creating new Stripe customer for user ${user.id} (${user.email}).`);
            const customer = await stripe.customers.create({
                email: user.email!,
                name: user.user_metadata?.full_name || user.email!, // Use full_name from metadata if available
                metadata: { supabaseUserId: user.id }, // Link Supabase user ID
            });
            stripeCustomerId = customer.id;
            console.info(`${logPrefix} Created Stripe customer ${stripeCustomerId}. Storing mapping in DB.`);
            const { error: upsertError } = await supabaseAdmin.from('stripe_customers').upsert(
                { user_id: user.id, customer_id: stripeCustomerId, email: user.email, updated_at: new Date().toISOString() },
                { onConflict: 'user_id' }
            ).select();
            if (upsertError) console.error(`${logPrefix} ERROR: Failed to upsert Stripe customer mapping for user ${user.id}:`, upsertError.message);
        }
        
        // Metadata to be passed to Stripe Checkout and potentially to webhooks
        const metadataForStripe = {
            supabaseUserId: user.id,
            priceId: price_id,
            planName: derivedPlanName,
            interval: derivedInterval || '', // Ensure it's always a string
        };

        const checkoutSessionParams: Stripe.Checkout.SessionCreateParams = {
            customer: stripeCustomerId,
            payment_method_types: ['card'],
            line_items: [{ price: price_id, quantity: 1 }],
            mode: mode,
            success_url: success_url, // Ensure these are fully qualified URLs
            cancel_url: cancel_url,   // Ensure these are fully qualified URLs
            metadata: metadataForStripe, // Pass metadata to the Checkout Session
        };

        // For subscriptions, Stripe recommends putting metadata on the subscription itself too
        if (mode === 'subscription') {
            checkoutSessionParams.subscription_data = { metadata: metadataForStripe };
        }

        const stripeCheckoutSession = await stripe.checkout.sessions.create(checkoutSessionParams);
        console.info(`${logPrefix} Stripe Checkout session ${stripeCheckoutSession.id} created successfully.`);
        return createJsonResponse(req, { sessionId: stripeCheckoutSession.id, url: stripeCheckoutSession.url } as CheckoutSuccessResponse, 200);

    } catch (error: any) {
        console.error(`${logPrefix} ERROR: Unhandled error in main try block:`, error.message, error.stack);
        return createJsonResponse(req, { error: 'Internal Server Error. Please try again later or contact support.', details: error.message }, 500);
    }
});