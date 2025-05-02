const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
const endpointSecret = process.env.STRIPE_TEST_WEBHOOK_SECRET;

exports.handler = async (event) => {
  const sig = event.headers['stripe-signature'];
  const body = event.body;

  let stripeEvent;
  try {
    stripeEvent = stripe.webhooks.constructEvent(body, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: `Webhook error: ${err.message}` }),
    };
  }

  // Handle events
  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object;
    console.log('Checkout completed:', JSON.stringify(session));

    // Verify customer_email exists
    if (!session.customer_email) {
      console.error('No customer_email in session');
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'No customer_email in session' }),
      };
    }

    // Check if user exists
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('email', session.customer_email)
      .single();

    if (fetchError) {
      console.error('Supabase fetch error:', fetchError.message);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: `Supabase fetch error: ${fetchError.message}` }),
      };
    }

    if (!user) {
      console.error('No user found with email:', session.customer_email);
      return {
        statusCode: 404,
        body: JSON.stringify({ error: `No user found with email: ${session.customer_email}` }),
      };
    }

    // Update user
    const { data, error } = await supabase
      .from('users')
      .update({ subscription_status: 'active', stripe_customer_id: session.customer })
      .eq('email', session.customer_email);

    if (error) {
      console.error('Supabase update error:', error.message);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: `Supabase update error: ${error.message}` }),
      };
    }
    console.log('User updated:', JSON.stringify(data));
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ received: true }),
  };
};