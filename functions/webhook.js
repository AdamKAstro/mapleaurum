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
    console.log('Checkout completed:', JSON.stringify(session, null, 2));

    // Determine customer ID
    let customerId = session.customer;
    if (!customerId && session.customer_email) {
      console.log('No customer ID, attempting to fetch or create customer with email:', session.customer_email);
      try {
        const customers = await stripe.customers.list({
          email: session.customer_email,
          limit: 1,
        });
        if (customers.data.length > 0) {
          customerId = customers.data[0].id;
          console.log('Found existing customer:', customerId);
        } else {
          const newCustomer = await stripe.customers.create({
            email: session.customer_email,
            metadata: { source: 'webhook_checkout_session' },
          });
          customerId = newCustomer.id;
          console.log('Created new customer:', customerId);
        }
      } catch (err) {
        console.error('Stripe customer fetch/create error:', err.message);
        return {
          statusCode: 500,
          body: JSON.stringify({ error: `Stripe customer fetch/create error: ${err.message}` }),
        };
      }
    }

    if (!customerId) {
      console.error('No customer ID or email in session');
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'No customer ID or email in session' }),
      };
    }

    // Fetch or create stripe_customers record
    let customerRecord;
    const { data: customer, error: fetchError } = await supabase
      .from('stripe_customers')
      .select('*')
      .eq('customer_id', customerId)
      .is('deleted_at', null)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Supabase fetch error (stripe_customers):', fetchError.message);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: `Supabase fetch error: ${fetchError.message}` }),
      };
    }

    if (!customer) {
      const { data: newCustomer, error: insertError } = await supabase
        .from('stripe_customers')
        .insert({
          customer_id: customerId,
          user_id: '00000000-0000-0000-0000-000000000000', // Placeholder UUID
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          deleted_at: null,
        })
        .select()
        .single();

      if (insertError) {
        console.error('Supabase insert error (stripe_customers):', insertError.message);
        return {
          statusCode: 500,
          body: JSON.stringify({ error: `Supabase insert error: ${insertError.message}` }),
        };
      }
      customerRecord = newCustomer;
      console.log('Stripe customer created:', JSON.stringify(customerRecord, null, 2));
    } else {
      customerRecord = customer;
      console.log('Stripe customer found:', JSON.stringify(customerRecord, null, 2));
    }

    // Handle one-time payment or subscription
    if (session.mode === 'payment') {
      // Store payment details in stripe_orders
      const orderData = {
        customer_id: customerId,
        checkout_session_id: session.id,
        payment_intent_id: session.payment_intent,
        amount_subtotal: session.amount_subtotal,
        amount_total: session.amount_total,
        currency: session.currency,
        payment_status: session.payment_status,
        status: session.status,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
      };

      const { data: order, error: orderInsertError } = await supabase
        .from('stripe_orders')
        .insert(orderData)
        .select()
        .single();

      if (orderInsertError) {
        console.error('Supabase insert error (stripe_orders):', orderInsertError.message);
        return {
          statusCode: 500,
          body: JSON.stringify({ error: `Supabase insert error (stripe_orders): ${orderInsertError.message}` }),
        };
      }
      console.log('Stripe order created:', JSON.stringify(order, null, 2));
    } else if (session.mode === 'subscription' && session.subscription) {
      // Existing subscription logic
      let subscriptionData = {};
      try {
        const subscription = await stripe.subscriptions.retrieve(session.subscription);
        subscriptionData = {
          subscription_id: subscription.id,
          status: subscription.status,
          price_id: subscription.items.data[0]?.price.id || null,
          payment_method_brand: null,
          payment_method_last4: null,
          cancel_at_period_end: subscription.cancel_at_period_end,
          current_period_start: subscription.current_period_start,
          current_period_end: subscription.current_period_end,
          deleted_at: null,
        };

        if (subscription.default_payment_method) {
          const paymentMethod = await stripe.paymentMethods.retrieve(subscription.default_payment_method);
          subscriptionData.payment_method_brand = paymentMethod.card?.brand || null;
          subscriptionData.payment_method_last4 = paymentMethod.card?.last4 || null;
        }

        console.log('Fetched subscription:', JSON.stringify(subscriptionData, null, 2));
      } catch (err) {
        console.error('Stripe subscription fetch error:', err.message);
        return {
          statusCode: 500,
          body: JSON.stringify({ error: `Stripe subscription fetch error: ${err.message}` }),
        };
      }

      const { data: subscription, error: subFetchError } = await supabase
        .from('stripe_subscriptions')
        .select('*')
        .eq('customer_id', customerId)
        .is('deleted_at', null)
        .single();

      if (subFetchError && subFetchError.code !== 'PGRST116') {
        console.error('Supabase fetch error (stripe_subscriptions):', subFetchError.message);
        return {
          statusCode: 500,
          body: JSON.stringify({ error: `Supabase fetch error: ${subFetchError.message}` }),
        };
      }

      if (!subscription) {
        const { data: newSubscription, error: subInsertError } = await supabase
          .from('stripe_subscriptions')
          .insert({
            customer_id: customerId,
            ...subscriptionData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
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
        console.log('Stripe subscription created:', JSON.stringify(newSubscription, null, 2));
      } else {
        const { data: updatedSubscription, error: subUpdateError } = await supabase
          .from('stripe_subscriptions')
          .update({
            ...subscriptionData,
            updated_at: new Date().toISOString(),
          })
          .eq('customer_id', customerId)
          .is('deleted_at', null)
          .select()
          .single();

        if (subUpdateError) {
          console.error('Supabase update error (stripe_subscriptions):', subUpdateError.message);
          return {
            statusCode: 500,
            body: JSON.stringify({ error: `Supabase update error: ${subUpdateError.message}` }),
          };
        }
        console.log('Stripe subscription updated:', JSON.stringify(updatedSubscription, null, 2));
      }
    } else {
      console.warn('No subscription or payment mode detected, skipping further processing');
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ received: true }),
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ received: true }),
  };
};