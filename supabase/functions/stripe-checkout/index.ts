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
const PRODUCTION_FRONTEND_URL = Deno.env.get('LIVE_FRONTEND_URL'); 
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
  appInfo: { name: 'MapleAurum/stripe-checkout', version: '1.3.4' },
});

function createJsonResponse(req: Request, body: object | null, status = 200, extraHeaders = {}): Response {
    const requestOrigin = req.headers.get('Origin');
    let accessControlAllowOrigin = '';
    const isNetlifyPreview = requestOrigin && requestOrigin.includes('.netlify.app');
    const allowedLocalhostPorts = [DEV_FRONTEND_URL_PRIMARY, DEV_FRONTEND_URL_ALTERNATE].filter(Boolean);

    if (STRIPE_MODE_ENV === 'live') {
        if (requestOrigin && requestOrigin === PRODUCTION_FRONTEND_URL) {
            accessControlAllowOrigin = PRODUCTION_FRONTEND_URL;
        } else {
            accessControlAllowOrigin = PRODUCTION_FRONTEND_URL || ''; 
            if (requestOrigin && requestOrigin !== PRODUCTION_FRONTEND_URL) {
                 console.warn(`${logPrefix} CORS WARN (LIVE): Req from '${requestOrigin}' != allowed '${PRODUCTION_FRONTEND_URL}'. ACAOrigin: '${accessControlAllowOrigin}'.`);
            }
        }
    } else { 
        if (requestOrigin) {
            if (requestOrigin === PRODUCTION_FRONTEND_URL || 
                allowedLocalhostPorts.includes(requestOrigin) || 
                requestOrigin.startsWith('http://localhost:') || 
                isNetlifyPreview) {
                accessControlAllowOrigin = requestOrigin; 
            } else {
                accessControlAllowOrigin = PRODUCTION_FRONTEND_URL || DEV_FRONTEND_URL_PRIMARY; 
                console.warn(`${logPrefix} CORS WARN (TEST): Req from '${requestOrigin}' not in allow list for test. ACAOrigin: '${accessControlAllowOrigin}'.`);
            }
        } else { 
             accessControlAllowOrigin = PRODUCTION_FRONTEND_URL || DEV_FRONTEND_URL_PRIMARY; 
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
        console.log(`${logPrefix} INFO: Incoming Request Headers (first 1000 chars):`, JSON.stringify(headersObject).substring(0, 1000));
    } catch (e) { console.warn(`${logPrefix} WARN: Could not stringify all request headers:`, (e as Error).message); }

    if (req.method === 'OPTIONS') {
        return createJsonResponse(req, {}, 204);
    }
    if (req.method !== 'POST') {
        return createJsonResponse(req, { error: 'Method Not Allowed.' }, 405);
    }

    let requestBody: CheckoutRequestBody;
    let rawBodyForLogging = "[Reading body failed or was empty initially]";
    try {
        const rawBody = await req.text();
        rawBodyForLogging = rawBody; 
        if (!rawBody || rawBody.trim() === '') {
            console.error(`${logPrefix} ERROR: Request body is effectively empty. Raw body received: "${rawBody}"`);
            return createJsonResponse(req, { error: 'Invalid request: Request body is empty or contains only whitespace.' }, 400);
        }
        console.log(`${logPrefix} INFO: Received raw body (first 500 chars): "${rawBody.substring(0,500)}"`);
        requestBody = JSON.parse(rawBody); 
        console.info(`${logPrefix} INFO: Successfully parsed request body. Plan: ${requestBody.plan_name || 'N/A'}, Price ID: ${requestBody.price_id}`);
    } catch (parseError: any) {
        console.error(`${logPrefix} ERROR: Failed to parse JSON request body. Raw body snippet (first 500 chars): "${rawBodyForLogging.substring(0, 500)}". Error:`, parseError.message);
        return createJsonResponse(req, { error: 'Invalid request: Could not parse JSON body.', details: parseError.message }, 400);
    }
    
    const requiredParams: (keyof CheckoutRequestBody)[] = ['price_id', 'success_url', 'cancel_url', 'mode'];
    for (const param of requiredParams) {
        if (!requestBody[param] || (typeof requestBody[param] === 'string' && String(requestBody[param]).trim() === '')) {
            console.warn(`${logPrefix} WARN: Missing required parameter in parsed body: ${param}`);
            return createJsonResponse(req, { error: `Missing required parameter: ${param}` }, 400);
        }
    }
    const optionalValidationError = validateOptionalParams(requestBody, {
        mode: { values: ['payment', 'subscription'] }, plan_name: 'string', interval: { values: ['month', 'year'] }
    });
    if (optionalValidationError) {
        console.warn(`${logPrefix} WARN: Optional parameter validation failed: ${optionalValidationError}`);
        return createJsonResponse(req, { error: `Invalid input: ${optionalValidationError}` }, 400);
    }

    const { price_id, success_url, cancel_url, mode, plan_name: clientPlanName, interval: clientInterval } = requestBody;

    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            console.warn(`${logPrefix} WARN: Authorization header missing or invalid.`);
            return createJsonResponse(req, { error: 'Auth header missing or invalid.' }, 401);
        }
        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
        if (authError || !user) {
            console.error(`${logPrefix} ERROR: Supabase auth failed:`, authError?.message || 'User not found');
            return createJsonResponse(req, { error: `Auth failed: ${authError?.message || 'User not found.'}` }, authError?.status || 401);
        }
        console.info(`${logPrefix} User ${user.id} (${user.email}) authenticated.`);

        let fetchedPrice: Stripe.Price;
        let derivedPlanName = clientPlanName || 'Selected Plan';
        let derivedInterval = clientInterval;
        try {
            console.info(`${logPrefix} Attempting to retrieve Stripe Price ID: ${price_id}`);
            fetchedPrice = await stripe.prices.retrieve(price_id, { expand: ['product'] });
            if (!fetchedPrice?.active) {
                console.error(`${logPrefix} ERROR: Price ID ${price_id} is inactive in Stripe.`);
                throw new Error(`Price ID ${price_id} inactive/invalid in Stripe.`);
            }
            if (mode === 'subscription' && fetchedPrice.type !== 'recurring') {
                console.error(`${logPrefix} ERROR: Price ID ${price_id} is type '${fetchedPrice.type}', but checkout mode is 'subscription'. A recurring price is required.`);
                throw new Error(`Price ID ${price_id} is for a '${fetchedPrice.type}' payment, but a recurring price is required for subscriptions.`);
            }
            if (fetchedPrice.product && typeof fetchedPrice.product === 'object' && 'name' in fetchedPrice.product) {
                derivedPlanName = clientPlanName || (fetchedPrice.product as Stripe.Product).name || derivedPlanName;
            }
            derivedInterval = clientInterval || fetchedPrice.recurring?.interval as ('month' | 'year' | undefined);
            console.info(`${logPrefix} Stripe Price ${price_id} validated. Type: ${fetchedPrice.type}, Product: "${derivedPlanName}", Interval: ${derivedInterval}.`);
        } catch (priceErr: any) {
            console.error(`${logPrefix} ERROR: Problem with Stripe Price ID ${price_id}:`, priceErr.message);
            return createJsonResponse(req, { error: `Invalid product price setup. Please check the Price ID. Details: ${priceErr.message}` }, 400);
        }

        let stripeCustomerId: string | undefined;
        const { data: custMap, error: dbCustErr } = await supabaseAdmin.from('stripe_customers').select('customer_id').eq('user_id', user.id).maybeSingle();
        if (dbCustErr) { console.error(`${logPrefix} ERROR: DB error fetching customer map:`, dbCustErr.message); throw new Error(`DB error fetching customer: ${dbCustErr.message}`); }
        
        if (custMap?.customer_id) {
            try {
                const stripeCust = await stripe.customers.retrieve(custMap.customer_id);
                if (stripeCust && !(stripeCust as Stripe.DeletedCustomer).deleted) stripeCustomerId = stripeCust.id;
                else console.warn(`${logPrefix} WARN: DB Stripe customer ${custMap.customer_id} deleted/invalid in Stripe.`);
            } catch (e) { console.warn(`${logPrefix} WARN: Retrieving Stripe customer ${custMap.customer_id} failed. New one created if needed. Error: ${(e as Error).message}`); }
        }
        if (!stripeCustomerId) {
            console.info(`${logPrefix} Creating new Stripe customer for user ${user.id}.`);
            const customer = await stripe.customers.create({ email: user.email!, name: user.user_metadata?.full_name || user.email!, metadata: { supabaseUserId: user.id } });
            stripeCustomerId = customer.id;
            // Upsert without email column as it's not in stripe_customers table
            const { error: upsertError } = await supabaseAdmin.from('stripe_customers').upsert(
                { user_id: user.id, customer_id: stripeCustomerId, updated_at: new Date().toISOString() },
                { onConflict: 'user_id' }
            ).select();
            if (upsertError) console.error(`${logPrefix} ERROR: Upserting stripe_customers mapping:`, upsertError.message, upsertError.details);
            else console.info(`${logPrefix} INFO: Stripe customer mapping created/updated for user ${user.id} with Stripe customer ${stripeCustomerId}.`);
        }
        console.info(`${logPrefix} Using Stripe Customer ID: ${stripeCustomerId} for user ${user.id}.`);
        
        const metadataForStripe = { supabaseUserId: user.id, priceId: price_id, planName: derivedPlanName, interval: derivedInterval || '' };
        const checkoutSessionParams: Stripe.Checkout.SessionCreateParams = {
            customer: stripeCustomerId, payment_method_types: ['card'], line_items: [{ price: price_id, quantity: 1 }],
            mode: mode, success_url: success_url, cancel_url: cancel_url, metadata: metadataForStripe,
        };
        if (mode === 'subscription') checkoutSessionParams.subscription_data = { metadata: metadataForStripe };

        const stripeCheckoutSession = await stripe.checkout.sessions.create(checkoutSessionParams);
        console.info(`${logPrefix} Stripe Checkout session ${stripeCheckoutSession.id} created successfully.`);
        return createJsonResponse(req, { sessionId: stripeCheckoutSession.id, url: stripeCheckoutSession.url } as CheckoutSuccessResponse, 200);

    } catch (error: any) {
        console.error(`${logPrefix} ERROR: Unhandled exception in main logic:`, error.message, error.stack);
        return createJsonResponse(req, { error: 'Internal Server Error. Please try again or contact support.', details: error.message }, 500);
    }
});