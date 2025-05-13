//supabase/functions/send-email/index.ts
import { serve } from 'https://deno.land/std@0.223.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY')!;
const SENDGRID_API_URL = 'https://api.sendgrid.com/v3/mail/send';

// Log environment variables to debug
console.log('[SendEmailFunction] SENDGRID_API_KEY:', SENDGRID_API_KEY ? 'Set' : 'Not set');
console.log('[SendEmailFunction] SUPABASE_URL:', Deno.env.get('SUPABASE_URL'));
console.log('[SendEmailFunction] SUPABASE_SERVICE_ROLE_KEY:', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ? 'Set' : 'Not set');

if (!SENDGRID_API_KEY) {
  throw new Error('SENDGRID_API_KEY is not set');
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req: Request) => {
  console.log('[SendEmailFunction] Received request:', req.method, req.url);

  if (req.method === 'OPTIONS') {
    console.log('[SendEmailFunction] Handling OPTIONS request');
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    console.log('[SendEmailFunction] Method not allowed:', req.method);
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Authenticate the user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.log('[SendEmailFunction] No authorization header');
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.log('[SendEmailFunction] Unauthorized user:', userError?.message);
      return new Response(JSON.stringify({ error: 'Unauthorized user' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[SendEmailFunction] Authenticated user:', user.email);
    if (user.email !== 'adamkiil@outlook.com' && user.email !== 'adamkiil79@gmail.com') {
      console.log('[SendEmailFunction] Admin access required for user:', user.email);
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { to, subject, message } = await req.json();
    if (!to || !subject || !message) {
      console.log('[SendEmailFunction] Missing required fields');
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[SendEmailFunction] Sending email to:', to);
    const emailPayload = {
      personalizations: [{ to: [{ email: to }] }],
      from: { email: 'support@mapleaurum.com' },
      subject,
      content: [
        { type: 'text/plain', value: message },
        { type: 'text/html', value: `<p>${message}</p>` },
      ],
    };

    const response = await fetch(SENDGRID_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailPayload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[SendEmailFunction] SendGrid API error:', errorData);
      throw new Error(`Failed to send email: ${response.statusText}`);
    }

    console.log('[SendEmailFunction] Email sent successfully to:', to);
    return new Response(JSON.stringify({ message: 'Email sent successfully' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('[SendEmailFunction] Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}, {
  onError: (error) => {
    console.error('[SendEmailFunction] Server error:', error.message);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});