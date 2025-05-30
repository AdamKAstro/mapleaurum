// supabase/functions/activate-app-trial/index.ts
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1'; // Ensure this is your Supabase client version

// MODIFIED IMPORT using the import_map.json alias "shared/"
import { APP_TRIAL_PROMO_CODES, isValidAppTrialPromoCode, ProductKey } from 'shared/app-config.ts';

const logPrefix = '[activate-app-trial]';

// Standardized JSON Response
function createJsonResponse(body: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  const frontendUrl = Deno.env.get('FRONTEND_URL') || '*'; // Get from env for CORS

  const commonHeaders: Record<string, string> = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, accept', // Added accept
    'Content-Type': 'application/json',
  };
  
  // Dynamically set Access-Control-Allow-Origin
  // For local development, you might use '*' or a specific localhost port.
  // For production, set FRONTEND_URL in your Supabase project's environment variables.
  commonHeaders['Access-Control-Allow-Origin'] = frontendUrl;
  if (frontendUrl !== '*') {
    commonHeaders['Vary'] = 'Origin'; // Important for CORS when not using '*'
  }

  return new Response(status === 204 ? null : JSON.stringify(body), {
    status,
    headers: { ...commonHeaders, ...extraHeaders },
  });
}

Deno.serve(async (req) => {
  console.log(`${logPrefix} INFO: Method: ${req.method}, URL: ${req.url}`);
  
  const responseHeaders: Record<string, string> = {};
  const frontendUrlEnv = Deno.env.get('FRONTEND_URL');
  const requestOrigin = req.headers.get('Origin');

  if (frontendUrlEnv) {
    // If FRONTEND_URL is set, only allow requests from that origin.
    // This is important for production.
    if (requestOrigin === frontendUrlEnv) {
      responseHeaders['Access-Control-Allow-Origin'] = frontendUrlEnv;
    } else {
      // Origin not allowed - let createJsonResponse handle the default or '*' if frontendUrlEnv wasn't specific
      // Or, you could return an error here if the origin is mandatory and not matching
      console.warn(`${logPrefix} CORS WARN: Request from origin '${requestOrigin}' does not match FRONTEND_URL '${frontendUrlEnv}'.`);
      // For now, createJsonResponse will use Deno.env.get('FRONTEND_URL') or '*'
    }
  } else {
    // Fallback for local development if FRONTEND_URL is not set in env.
    // Be cautious with '*' in production.
    responseHeaders['Access-Control-Allow-Origin'] = requestOrigin || '*';
  }
  if (responseHeaders['Access-Control-Allow-Origin'] !== '*') {
      responseHeaders['Vary'] = 'Origin';
  }


  if (req.method === 'OPTIONS') {
    return new Response(null, { 
        status: 204, 
        headers: {
            ...responseHeaders, // Use dynamically determined Allow-Origin
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, accept',
        }
    });
  }
  // Use createJsonResponse which now incorporates dynamic CORS headers based on FRONTEND_URL
  if (req.method !== 'POST') {
    return createJsonResponse({ error: 'Method Not Allowed.' }, 405);
  }

  let requestBody;
  try {
    const rawBody = await req.text();
    if (!rawBody) throw new Error('Request body is empty.');
    requestBody = JSON.parse(rawBody);
  } catch (parseError) {
    console.error(`${logPrefix} ERROR: Failed to parse JSON request body.`, parseError.message);
    return createJsonResponse({ error: 'Invalid request: Could not parse JSON body.' }, 400);
  }

  const { promo_code } = requestBody;

  if (!promo_code || typeof promo_code !== 'string') {
    return createJsonResponse({ error: 'Missing or invalid required parameter: promo_code (string)' }, 400);
  }

  if (!isValidAppTrialPromoCode(promo_code)) {
    console.warn(`${logPrefix} WARN: Invalid promo_code received: ${promo_code}`);
    return createJsonResponse({ error: 'Invalid or expired promo code.' }, 400);
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.warn(`${logPrefix} WARN: Auth header missing or invalid.`);
      return createJsonResponse({ error: 'Auth header missing or invalid.' }, 401);
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      console.error(`${logPrefix} ERROR: Supabase auth failed:`, authError?.message || 'User not found');
      const status = authError?.status || 401;
      return createJsonResponse({ error: `Auth failed: ${authError?.message || 'User not found.'}` }, status);
    }
    console.info(`${logPrefix} User ${user.id} (${user.email}) authenticated.`);

    const { data: existingStripeSub, error: stripeSubError } = await supabaseAdmin
      .from('stripe_subscriptions')
      .select('status, price_id')
      .eq('user_id', user.id)
      .in('status', ['active', 'trialing'])
      .maybeSingle();

    if (stripeSubError) {
      console.error(`${logPrefix} ERROR: DB error checking existing Stripe subscriptions:`, stripeSubError.message);
      throw new Error(`DB error checking Stripe subs: ${stripeSubError.message}`);
    }
    if (existingStripeSub) {
      console.warn(`${logPrefix} WARN: User ${user.id} already has an active/trialing Stripe subscription. Cannot apply app trial.`);
      return createJsonResponse({ error: 'You already have an active subscription.' }, 400);
    }
    
    const { data: existingAppTrial, error: appTrialCheckError } = await supabaseAdmin
      .from('user_app_trials')
      .select('id, expires_at')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (appTrialCheckError) {
      console.error(`${logPrefix} ERROR: DB error checking existing app trials:`, appTrialCheckError.message);
      throw new Error(`DB error checking app trials: ${appTrialCheckError.message}`);
    }
    if (existingAppTrial) {
      console.warn(`${logPrefix} WARN: User ${user.id} already has an active app trial. Cannot apply another.`);
      return createJsonResponse({ error: 'You already have an active trial.' }, 400);
    }

    const trialDetails = APP_TRIAL_PROMO_CODES[promo_code];
    const now = new Date();
    const expiresAt = new Date(new Date().setDate(now.getDate() + trialDetails.durationDays));

    const { data: newTrial, error: insertError } = await supabaseAdmin
      .from('user_app_trials')
      .insert({
        user_id: user.id,
        tier: trialDetails.tier,
        expires_at: expiresAt.toISOString(),
        promo_code_used: promo_code,
        is_active: true,
      })
      .select('tier, expires_at')
      .single();

    if (insertError) {
      console.error(`${logPrefix} ERROR: Failed to insert app trial for user ${user.id}:`, insertError.message, insertError.details);
      throw new Error(`Could not activate trial: ${insertError.message}`);
    }

    console.info(`${logPrefix} INFO: App trial for tier '${trialDetails.tier}' activated for user ${user.id}. Expires: ${expiresAt.toISOString()}.`);
    return createJsonResponse({
      message: `Trial for ${trialDetails.description} activated!`,
      tier: newTrial.tier,
      expires_at: newTrial.expires_at,
    }, 200);

  } catch (error) {
    console.error(`${logPrefix} ERROR: Unhandled exception:`, error.message, error.stack);
    return createJsonResponse({ error: 'Internal Server Error.', details: error.message }, 500);
  }
});