const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: 'Method Not Allowed',
    };
  }
  const sig = event.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_TEST_WEBHOOK_SECRET;
  try {
    const stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      sig,
      endpointSecret
    );
    switch (stripeEvent.type) {
      case 'checkout.session.completed':
        console.log('Checkout completed:', stripeEvent.data.object);
        // TODO: Update Supabase user subscription status
        break;
      case 'payment_intent.succeeded':
        console.log('Payment succeeded:', stripeEvent.data.object);
        break;
      case 'customer.subscription.created':
        console.log('Subscription created:', stripeEvent.data.object);
        break;
      default:
        console.log(`Unhandled event: ${stripeEvent.type}`);
    }
    return {
      statusCode: 200,
      body: JSON.stringify({ received: true }),
    };
  } catch (err) {
    console.error('Webhook error:', err.message);
    return {
      statusCode: 400,
      body: `Webhook Error: ${err.message}`,
    };
  }
};