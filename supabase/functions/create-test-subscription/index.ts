// supabase/functions/create-test-subscription/index.ts
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ADMIN_SECRET = Deno.env.get('ADMIN_SECRET_KEY') || 'change-this-in-production';

// Authorized admin emails
const ADMIN_EMAILS = [
  'adamkiil@outlook.com',
  'adamkiil79@gmail.com'
];

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

interface CreateTestSubscriptionRequest {
  userEmail: string;
  adminKey?: string;
  planType?: 'pro' | 'premium';
  durationDays?: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
      }
    });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    // Get requesting user from auth token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response('Unauthorized - missing auth', { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: requestingUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !requestingUser) {
      return new Response('Unauthorized - invalid token', { status: 401 });
    }

    // Check if requesting user is admin
    if (!ADMIN_EMAILS.includes(requestingUser.email || '')) {
      console.warn(`[create-test-subscription] Unauthorized access attempt by: ${requestingUser.email}`);
      return new Response('Unauthorized - admin access required', { status: 403 });
    }

    const { 
      userEmail, 
      adminKey, 
      planType = 'premium',
      durationDays = 30 
    }: CreateTestSubscriptionRequest = await req.json();

    // Additional security check with admin key (optional)
    if (adminKey && adminKey !== ADMIN_SECRET) {
      return new Response('Invalid admin key', { status: 401 });
    }

    if (!userEmail) {
      return new Response('User email is required', { status: 400 });
    }

    console.log(`[create-test-subscription] Admin ${requestingUser.email} granting ${planType} trial to ${userEmail}`);

    // Find target user by email
    const { data: targetUser, error: userError } = await supabaseAdmin
      .from('auth.users')
      .select('id, email')
      .eq('email', userEmail)
      .single();

    if (userError) {
      // If user doesn't exist, create a placeholder entry
      console.log(`[create-test-subscription] User ${userEmail} not found in auth.users, creating placeholder`);
      
      // Create fake customer and subscription that will be linked when user signs up
      const fakeCustomerId = `cus_trial_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const fakeSubId = `sub_trial_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Insert pending trial that will be activated when user signs up
      const { error: pendingError } = await supabaseAdmin.from('pending_trials').insert({
        email: userEmail,
        plan_type: planType,
        duration_days: durationDays,
        granted_by: requestingUser.id,
        granted_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + (durationDays * 24 * 60 * 60 * 1000)).toISOString()
      });

      if (pendingError) {
        console.error('Error creating pending trial:', pendingError);
        return new Response('Failed to create pending trial', { status: 500 });
      }

      return new Response(JSON.stringify({
        success: true,
        message: `Pending ${planType} trial created for ${userEmail}. Will activate when user signs up.`,
        type: 'pending'
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // User exists - create active subscription
    const fakeCustomerId = `cus_trial_${Date.now()}_${targetUser.id.substr(-8)}`;
    const fakeSubId = `sub_trial_${Date.now()}_${targetUser.id.substr(-8)}`;
    
    // Price IDs for the plans
    const priceIds = {
      pro: 'price_1RTylqAst4LlpL7pTIvN18rF',     // Pro Monthly
      premium: 'price_1RTyi3Ast4LlpL7pv6DnpcKS'  // Premium Monthly
    };

    // Create or update customer mapping
    const { error: customerError } = await supabaseAdmin.from('stripe_customers').upsert({
      user_id: targetUser.id,
      customer_id: fakeCustomerId,
      email: targetUser.email,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' });

    if (customerError) {
      console.error('Error upserting customer:', customerError);
      return new Response('Failed to create customer mapping', { status: 500 });
    }

    // Create trial subscription
    const trialEndDate = new Date(Date.now() + (durationDays * 24 * 60 * 60 * 1000));
    
    const { error: subError } = await supabaseAdmin.from('stripe_subscriptions').insert({
      subscription_id: fakeSubId,
      customer_id: fakeCustomerId,
      user_id: targetUser.id,
      price_id: priceIds[planType],
      status: 'active',
      current_period_start: new Date().toISOString(),
      current_period_end: trialEndDate.toISOString(),
      cancel_at_period_end: true,
      metadata: {
        planName: `Maple Aurum ${planType.charAt(0).toUpperCase() + planType.slice(1)}`,
        interval: 'month',
        trialAccount: true,
        grantedBy: requestingUser.email,
        grantedAt: new Date().toISOString(),
        trialDuration: durationDays
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    if (subError) {
      console.error('Error creating subscription:', subError);
      return new Response('Failed to create trial subscription', { status: 500 });
    }

    console.log(`[create-test-subscription] Successfully granted ${planType} trial to ${userEmail} for ${durationDays} days`);

    return new Response(JSON.stringify({
      success: true,
      message: `${planType.charAt(0).toUpperCase() + planType.slice(1)} trial granted to ${userEmail} for ${durationDays} days`,
      type: 'active',
      expiresAt: trialEndDate.toISOString()
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[create-test-subscription] Error:', error);
    return new Response('Internal server error', { status: 500 });
  }
});

// Note: You'll also need to create the pending_trials table:
/*
CREATE TABLE IF NOT EXISTS pending_trials (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  plan_type TEXT NOT NULL CHECK (plan_type IN ('pro', 'premium')),
  duration_days INTEGER NOT NULL DEFAULT 30,
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  activated_at TIMESTAMP WITH TIME ZONE NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_pending_trials_email ON pending_trials(email);
CREATE INDEX idx_pending_trials_expires_at ON pending_trials(expires_at);
*/