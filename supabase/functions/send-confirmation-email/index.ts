// supabase/functions/send-confirmation-email/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

if (!SENDGRID_API_KEY) {
  throw new Error('SENDGRID_API_KEY is not set')
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { to, subject, html, userId, type } = await req.json()

    // Validate required fields
    if (!to || !subject || !html) {
      throw new Error('Missing required fields: to, subject, or html')
    }

    console.log(`[send-confirmation-email] Sending ${type} email to ${to}`)

    // Create the email payload for SendGrid
    const emailPayload = {
      personalizations: [{
        to: [{ email: to }],
      }],
      from: {
        email: 'noreply@mapleaurum.com', // Use a no-reply address for automated emails
        name: 'MapleAurum'
      },
      reply_to: {
        email: 'support@mapleaurum.com',
        name: 'MapleAurum Support'
      },
      subject,
      content: [
        {
          type: 'text/html',
          value: html
        }
      ],
      categories: ['confirmation-email', type || 'email-confirmation'],
      custom_args: {
        userId: userId || '',
        emailType: type || 'email-confirmation'
      }
    }

    // Send the email via SendGrid
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailPayload),
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('[send-confirmation-email] SendGrid error:', errorData)
      throw new Error(`SendGrid API error: ${response.status}`)
    }

    console.log(`[send-confirmation-email] Email sent successfully to ${to}`)

    // Log the email send event (optional)
    if (userId && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        
        await supabaseAdmin
          .from('email_logs')
          .insert({
            user_id: userId,
            email_to: to,
            email_type: type || 'email-confirmation',
            status: 'sent',
            sent_at: new Date().toISOString()
          })
      } catch (logError) {
        console.error('[send-confirmation-email] Failed to log email:', logError)
        // Don't fail the request if logging fails
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Email sent successfully' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('[send-confirmation-email] Error:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Failed to send email' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})