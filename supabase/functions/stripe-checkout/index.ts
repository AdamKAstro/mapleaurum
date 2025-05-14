// supabase/functions/stripe-checkout/index.ts
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0'; 
import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2.49.1';

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

const STRIPE_MODE_ENV = Deno.env.get('STRIPE_MODE')?.toLowerCase() || 'live';
const logPrefix = `[stripe-checkout][${STRIPE_MODE_ENV.toUpperCase()}]`;

console.log(`${logPrefix} INFO: Function initializing in '${STRIPE_MODE_ENV}' mode.`);

const LIVE_STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY');
const TEST_STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEYT');
const STRIPE_KEY_TO_USE = STRIPE_MODE_ENV === 'test' ? TEST_STRIPE_SECRET_KEY : LIVE_STRIPE_SECRET_KEY;

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const PRODUCTION_FRONTEND_URL = Deno.env.get('LIVE_FRONTEND_URL'); // Your https://mapleaurum.com
const DEV_FRONTEND_URL_PRIMARY = Deno.env.get('FRONTEND_URL_DEVELOPMENT') || 'http://localhost:3000';
const DEV_FRONTEND_URL_ALTERNATE = 'http://localhost:5173';

if (!STRIPE_KEY_TO_USE) throw new Error(`${logPrefix} FATAL: Stripe secret key for mode '${STRIPE_MODE_ENV}' is MISSING.`);
if (!supabaseUrl) throw new Error(`${logPrefix} FATAL: Missing SUPABASE_URL.`);
if (!supabaseServiceRoleKey) throw new Error(`${logPrefix} FATAL: Missing SUPABASE_SERVICE_ROLE_KEY.`);
if (STRIPE_MODE_ENV === 'live' && !PRODUCTION_FRONTEND_URL) {
    console.warn(`${logPrefix} WARN: LIVE_FRONTEND_URL env var is not set for production CORS.`);
}

const supabaseAdmin: SupabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey);
const stripe = new Stripe(STRIPE_KEY_TO_USE, {
  apiVersion: '2024-06-20',
  typescript: true,
  appInfo: { name: 'MapleAurum/stripe-checkout', version: '1.3.3' },
});

function createJsonResponse(req: Request, body: object | null, status = 200, extraHeaders = {}): Response {
    const requestOrigin = req.headers.get('Origin');
    let accessControlAllowOrigin = '';
    const isNetlifyPreview = requestOrigin && requestOrigin.includes('.netlify.app');
    const allowedLocalhostPorts = [DEV_FRONTEND_URL_PRIMARY, DEV_FRONTEND_URL_ALTERNATE];

    if (STRIPE_MODE_ENV === 'live') {
        if (requestOrigin && requestOrigin === PRODUCTION_FRONTEND_URL) {
            accessControlAllowOrigin = PRODUCTION_FRONTEND_URL;
        } else {
            accessControlAllowOrigin = PRODUCTION_FRONTEND_URL || ''; 
            if (requestOrigin && requestOrigin !== PRODUCTION_FRONTEND_URL) {
                 console.warn(`${logPrefix} CORS WARN (LIVE): Req from '${requestOrigin}' != allowed '${PRODUCTION_FRONTEND_URL}'. ACAOrigin: '${accessControlAllowOrigin}'.`);
            }
        }
    } else { // TEST mode
        if (requestOrigin) {
            if (requestOrigin === PRODUCTION_FRONTEND_URL || // Allow testing prod URL against test Stripe
                allowedLocalhostPorts.includes(requestOrigin) || 
                requestOrigin.startsWith('http://localhost:') || // General localhost
                isNetlifyPreview) {
                accessControlAllowOrigin = requestOrigin; 
            } else {
                accessControlAllowOrigin = PRODUCTION_FRONTEND_URL || DEV_FRONTEND_URL_PRIMARY; // Fallback
                console.warn(`${logPrefix} CORS WARN (TEST): Req from '${requestOrigin}' not in allow list. ACAOrigin: '${accessControlAllowOrigin}'.`);
            }
        } else { // No origin header (e.g. direct tool call)
             accessControlAllowOrigin = PRODUCTION_FRONTEND_URL || DEV_FRONTEND_URL_PRIMARY; // Default for test if no origin
        }
    }
    
    if (!accessControlAllowOrigin && requestOrigin) {
        console.error(`${logPrefix} CORS CRITICAL: No ACAOrigin set for origin '${requestOrigin}', mode '${STRIPE_MODE_ENV}'.`);
    } else {
        console.log(`${logPrefix} CORS Final: Req Origin: '${requestOrigin}', Mode: '${STRIPE_MODE_ENV}', ACAOrigin: '${accessControlAllowOrigin}'`);
    }

    const headers = {
        'Access-Control-Allow-Origin': accessControlAllowOrigin,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, accept',
        'Content-Type': 'application/json', 'Vary': 'Origin', ...extraHeaders,
    };
    return new Response(status === 204 ? null : JSON.stringify(body), { status, headers });
}

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
  } return undefined;
}

Deno.serve(async (req: Request) => {
    console.log(`${logPrefix} INFO: Method: ${req.method}, URL: ${req.url}`);
    try {
        const headersObject: Record<string, string> = {};
        req.headers.forEach((value, key) => { headersObject[key] = value; });
        console.log(`${logPrefix} INFO: Incoming Request Headers:`, JSON.stringify(headersObject).substring(0, 1000));
    } catch (e) { console.warn(`${logPrefix} WARN: Could not stringify all request headers:`, e.message); }

    if (req.method === 'OPTIONS') {
        return createJsonResponse(req, {}, 204);
    }
    if (req.method !== 'POST') {
        return createJsonResponse(req, { error: 'Method Not Allowed.' }, 405);
    }

    let requestBody: CheckoutRequestBody;
    let rawBodyForLogging = "[Reading body failed or was empty]";
    try {
        const rawBody = await req.text(); // Attempt to read the raw body
        rawBodyForLogging = rawBody;     // Store it for logging regardless of emptiness

        if (!rawBody || rawBody.trim() === '') {
            console.error(`${logPrefix} ERROR: Request body is effectively empty. Raw body received: "${rawBody}"`);
            return createJsonResponse(req, { error: 'Invalid request: Request body is empty or contains only whitespace.' }, 400);
        }
        requestBody = JSON.parse(rawBody); // Now parse
        console.info(`${logPrefix} INFO: Successfully parsed request body. Plan: ${requestBody.plan_name || 'N/A'}, Price ID: ${requestBody.price_id}`);
    } catch (parseError: any) {
        console.error(`${logPrefix} ERROR: Failed to parse JSON request body. Raw body snippet: "${rawBodyForLogging.substring(0, 500)}". Error:`, parseError.message);
        return createJsonResponse(req, { error: 'Invalid request: Could not parse JSON body.', details: parseError.message }, 400);
    }
    
    const requiredParams: (keyof CheckoutRequestBody)[] = ['price_id', 'success_url', 'cancel_url', 'mode'];
    for (const param of requiredParams) {
        if (!requestBody[param] || (typeof requestBody[param] === 'string' && String(requestBody[param]).trim() === '')) {
            return createJsonResponse(req, { error: `Missing required parameter: ${param}` }, 400);
        }
    }
    const optionalValidationError = validateOptionalParams(requestBody, {
        mode: { values: ['payment', 'subscription'] }, plan_name: 'string', interval: { values: ['month', 'year'] }
    });
    if (optionalValidationError) return createJsonResponse(req, { error: `Invalid input: ${optionalValidationError}` }, 400);

    const { price_id, success_url, cancel_url, mode, plan_name: clientPlanName, interval: clientInterval } = requestBody;

    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) return createJsonResponse(req, { error: 'Auth header missing.' }, 401);
        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
        if (authError || !user) return createJsonResponse(req, { error: `Auth failed: ${authError?.message || 'User not found.'}` }, authError?.status || 401);
        console.info(`${logPrefix} User ${user.id} (${user.email}) authenticated.`);

        let fetchedPrice: Stripe.Price;
        let derivedPlanName = clientPlanName || 'Selected Plan';
        let derivedInterval = clientInterval;
        try {
            fetchedPrice = await stripe.prices.retrieve(price_id, { expand: ['product'] });
            if (!fetchedPrice?.active) throw new Error(`Price ID ${price_id} inactive/invalid.`);
            if (fetchedPrice.product && typeof fetchedPrice.product === 'object' && 'name' in fetchedPrice.product) {
                derivedPlanName = clientPlanName || (fetchedPrice.product as Stripe.Product).name || derivedPlanName;
            }
            derivedInterval = clientInterval || fetchedPrice.recurring?.interval as ('month' | 'year' | undefined);
        } catch (priceErr: any) {
            return createJsonResponse(req, { error: `Invalid product price. Details: ${priceErr.message}` }, 400);
        }
        console.info(`${logPrefix} Price ${price_id} validated. Product: "${derivedPlanName}", Interval: ${derivedInterval}.`);

        let stripeCustomerId: string | undefined;
        const { data: custMap, error: dbCustErr } = await supabaseAdmin.from('stripe_customers').select('customer_id').eq('user_id', user.id).maybeSingle();
        if (dbCustErr) throw new Error(`DB error fetching customer: ${dbCustErr.message}`);
        if (custMap?.customer_id) {
            try {
                const stripeCust = await stripe.customers.retrieve(custMap.customer_id);
                if (stripeCust && !(stripeCust as Stripe.DeletedCustomer).deleted) stripeCustomerId = stripeCust.id;
            } catch (e) { console.warn(`${logPrefix} WARN: Retrieving Stripe customer ${custMap.customer_id} failed. New one will be created.`); }
        }
        if (!stripeCustomerId) {
            const customer = await stripe.customers.create({ email: user.email!, name: user.user_metadata?.full_name || user.email!, metadata: { supabaseUserId: user.id } });
            stripeCustomerId = customer.id;
            await supabaseAdmin.from('stripe_customers').upsert({ user_id: user.id, customer_id: stripeCustomerId, email: user.email, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
              .then(({error: upsertErr}) => { if(upsertErr) console.error(`${logPrefix} ERROR: Upserting customer map:`, upsertErr.message )});
        }
        
        const metadataForStripe = { supabaseUserId: user.id, priceId: price_id, planName: derivedPlanName, interval: derivedInterval || '' };
        const checkoutSessionParams: Stripe.Checkout.SessionCreateParams = {
            customer: stripeCustomerId, payment_method_types: ['card'], line_items: [{ price: price_id, quantity: 1 }],
            mode: mode, success_url: success_url, cancel_url: cancel_url, metadata: metadataForStripe,
        };
        if (mode === 'subscription') checkoutSessionParams.subscription_data = { metadata: metadataForStripe };

        const stripeCheckoutSession = await stripe.checkout.sessions.create(checkoutSessionParams);
        console.info(`${logPrefix} Stripe Checkout session ${stripeCheckoutSession.id} created.`);
        return createJsonResponse(req, { sessionId: stripeCheckoutSession.id, url: stripeCheckoutSession.url } as CheckoutSuccessResponse, 200);

    } catch (error: any) {
        console.error(`${logPrefix} ERROR: Unhandled in main logic:`, error.message, error.stack);
        return createJsonResponse(req, { error: 'Internal Server Error.', details: error.message }, 500);
    }
});