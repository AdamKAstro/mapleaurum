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

    // Check if customer ID is present
    if (!session.customer) {
      console.error('No customer ID in session');
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'No customer ID in session' }),
      };
    }

    // Check if stripe_customer already exists
    const { data: customer, error: fetchError } = await supabase
      .from('stripe_customers')
      .select('*')
      .eq('customer_id', session.customer)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116: no rows found
      console.error('Supabase fetch error (stripe_customers):', fetchError.message);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: `Supabase fetch error: ${fetchError.message}` }),
      };
    }

    let customerRecord;
    if (!customer) {
      // Insert new stripe_customer record
      const { data: newCustomer, error: insertError } = await supabase
        .from('stripe_customers')
        .insert({
          customer_id: session.customer,
          user_id: '00000000-0000-0000-0000-000000000000', // Placeholder UUID (adjust if you can link to auth.users)
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) {
        console.error('Supabase insert error (stripe_customers):', insertError.message);
        return {
          statusCode: 500,
          body: JSON.stringify({ error: `Supabase insert error (stripe_customers): ${insertError.message}` }),
        };
      }
      customerRecord = newCustomer;
      console.log('Stripe customer created:', JSON.stringify(customerRecord));
    } else {
      customerRecord = customer;
      console.log('Stripe customer found:', JSON.stringify(customerRecord));
    }

    // Check if stripe_subscription already exists
    const { data: subscription, error: subFetchError } = await supabase
      .from('stripe_subscriptions')
      .select('*')
      .eq('customer_id', session.customer)
      .single();

    if (subFetchError && subFetchError.code !== 'PGRST116') {
      console.error('Supabase fetch error (stripe_subscriptions):', subFetchError.message);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: `Supabase fetch error (stripe_subscriptions): ${subFetchError.message}` }),
      };
    }

    if (!subscription) {
      // Insert new stripe_subscription record
      const { data: newSubscription, error: subInsertError } = await supabase
        .from('stripe_subscriptions')
        .insert({
          customer_id: session.customer,
          subscription_id: session.subscription || 'sub_' + Date.now(), // Fallback if no subscription ID
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          current_period_start: Math.floor(Date.now() / 1000),
          current_period_end: Math.floor((Date.now() + 30 * 24 * 60 * 60 * 1000) / 1000), // 30 days
        })
        .select()
        .single();

      if (subInsertError) {
        console.error('Supabase insert error (stripe_subscriptions):', subInsertError.message);
        return {
          statusCode: 500,
          body: JSON.stringify({ error: `Supabase insert error (stripe_subscriptions): ${subInsertError.message}` }),
        };
      }
      console.log('Stripe subscription created:', JSON.stringify(newSubscription));
    } else {
      // Update existing stripe_subscription
      const { data: updatedSubscription, error: subUpdateError } = await supabase
        .from('stripe_subscriptions')
        .update({ status: 'active', updated_at: new Date().toISOString() })
        .eq('customer_id', session.customer)
        .select()
        .single();

      if (subUpdateError) {
        console.error('Supabase update error (stripe_subscriptions):', subUpdateError.message);
        return {
          statusCode: 500,
          body: JSON.stringify({ error: `Supabase update error (stripe_subscriptions): ${subUpdateError.message}` }),
        };
      }
      console.log('Stripe subscription updated:', JSON.stringify(updatedSubscription));
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ received: true }),
  };
};