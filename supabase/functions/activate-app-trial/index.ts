// supabase/functions/activate-app-trial/index.ts
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1'; // Ensure this is your Supabase client version

// Corrected import from the new backend-specific shared file
import { APP_TRIAL_PROMO_CODES, isValidAppTrialPromoCode, ProductKey } from '../_shared/app-config.ts';

const logPrefix = '[activate-app-trial]';

// Standardized JSON Response
function createJsonResponse(body: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  // Ensure your actual frontend URL is used for CORS in production
  const frontendUrl = Deno.env.get('FRONTEND_URL') || '*'; // Get from env or allow all for dev

  const commonHeaders = {
    'Access-Control-Allow-Origin': frontendUrl,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Content-Type': 'application/json',
    'Vary': 'Origin', // Important for CORS with varying origins
  };
  return new Response(status === 204 ? null : JSON.stringify(body), {
    status,
    headers: { ...commonHeaders, ...extraHeaders },
  });
}

Deno.serve(async (req) => {
  console.log(`${logPrefix} INFO: Method: ${req.method}, URL: ${req.url}`);

  const requestOrigin = req.headers.get('Origin');
  const allowedOrigins = [Deno.env.get('FRONTEND_URL')]; // Add other allowed origins if needed
  // In development, you might allow 'http://localhost:xxxx' or '*' broadly
  // For production, be specific.

  let corsHeaders: Record<string, string> = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    corsHeaders['Access-Control-Allow-Origin'] = requestOrigin;
  } else if (!allowedOrigins.some(o => o) && Deno.env.get("NETLIFY_DEV") === "true") { // Example for local Netlify dev
    corsHeaders['Access-Control-Allow-Origin'] = requestOrigin || '*'; // More permissive for local dev
  } else if (allowedOrigins.some(o => o)) {
    corsHeaders['Access-Control-Allow-Origin'] = allowedOrigins[0]!; // Default to first allowed
  } else {
     corsHeaders['Access-Control-Allow-Origin'] = '*'; // Fallback, be careful in production
  }


  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return createJsonResponse({ error: 'Method Not Allowed.' }, 405, corsHeaders);
  }

  let requestBody;
  try {
    const rawBody = await req.text();
    if (!rawBody) throw new Error('Request body is empty.');
    requestBody = JSON.parse(rawBody);
  } catch (parseError) {
    console.error(`${logPrefix} ERROR: Failed to parse JSON request body.`, parseError.message);
    return createJsonResponse({ error: 'Invalid request: Could not parse JSON body.' }, 400, corsHeaders);
  }

  const { promo_code } = requestBody;

  if (!promo_code || typeof promo_code !== 'string') {
    return createJsonResponse({ error: 'Missing or invalid required parameter: promo_code (string)' }, 400, corsHeaders);
  }

  if (!isValidAppTrialPromoCode(promo_code)) {
    console.warn(`${logPrefix} WARN: Invalid promo_code received: ${promo_code}`);
    return createJsonResponse({ error: 'Invalid or expired promo code.' }, 400, corsHeaders);
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.warn(`${logPrefix} WARN: Auth header missing or invalid.`);
      return createJsonResponse({ error: 'Auth header missing or invalid.' }, 401, corsHeaders);
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      console.error(`${logPrefix} ERROR: Supabase auth failed:`, authError?.message || 'User not found');
      const status = authError?.status || (user ? 401 : 404); // Be more specific if user object is null due to no user vs auth error
      return createJsonResponse({ error: `Auth failed: ${authError?.message || 'User not found.'}` }, status, corsHeaders);
    }
    console.info(`${logPrefix} User ${user.id} (${user.email}) authenticated.`);

    // Check if user already has an active Stripe subscription
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
      return createJsonResponse({ error: 'You already have an active subscription.' }, 400, corsHeaders);
    }
    
    // Check for existing active app trials
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
      return createJsonResponse({ error: 'You already have an active trial.' }, 400, corsHeaders);
    }

    const trialDetails = APP_TRIAL_PROMO_CODES[promo_code]; // promo_code is already validated by isValidAppTrialPromoCode
    const now = new Date();
    const expiresAt = new Date(new Date().setDate(now.getDate() + trialDetails.durationDays)); // Correct way to add days

    const { data: newTrial, error: insertError } = await supabaseAdmin
      .from('user_app_trials')
      .insert({
        user_id: user.id,
        tier: trialDetails.tier,
        expires_at: expiresAt.toISOString(),
        promo_code_used: promo_code,
        is_active: true,
      })
      .select('tier, expires_at') // Select only what you need to return
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
    }, 200, corsHeaders);

  } catch (error) {
    console.error(`${logPrefix} ERROR: Unhandled exception:`, error.message, error.stack);
    return createJsonResponse({ error: 'Internal Server Error.', details: error.message }, 500, corsHeaders);
  }
});