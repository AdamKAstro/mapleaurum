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

  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object;
    console.log('Checkout completed:', JSON.stringify(session));

    const { data, error } = await supabase
      .from('users')
      .update({ subscription_status: 'active', stripe_customer_id: session.customer })
      .eq('email', session.customer_email);

    if (error) {
      console.error('Supabase update error:', error.message);
      return { statusCode: 500, body: JSON.stringify({ error: `Supabase error: ${error.message}` }) };
    }
    console.log('User updated:', JSON.stringify(data));
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ received: true }),
  };
};