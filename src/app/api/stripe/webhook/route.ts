import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/services/stripe';
import {
  createOrUpdateSubscription,
  createOrUpdateInvoice,
  createCreditTransaction,
  getCreditBalance,
} from '@/lib/db-queries';
import Stripe from 'stripe';

// Disable body parsing, we need the raw body for webhook signature verification
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    );
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error('STRIPE_WEBHOOK_SECRET is not configured');
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    const error = err as Error;
    console.error('Webhook signature verification failed:', error.message);
    return NextResponse.json(
      { error: `Webhook Error: ${error.message}` },
      { status: 400 }
    );
  }

  try {
    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        
        // Only handle subscription checkouts
        if (session.mode === 'subscription' && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string,
            { expand: ['default_payment_method'] }
          );

          await handleSubscriptionCreated(subscription, session.metadata);
        }
        
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionCreated(subscription, subscription.metadata);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaid(invoice);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentFailed(invoice);
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentIntentSucceeded(paymentIntent);
        break;
      }

      case 'customer.created': {
        const customer = event.data.object as Stripe.Customer;
        // Customer is already linked via getOrCreateCustomer, but we can log this
        console.log('Customer created:', customer.id);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error handling webhook:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

async function handleSubscriptionCreated(
  subscription: Stripe.Subscription,
  metadata?: Record<string, string>
) {
  const organizationId = metadata?.organizationId;
  const planId = metadata?.planId;

  if (!organizationId || !planId) {
    console.error('Missing organizationId or planId in subscription metadata');
    return;
  }

  const customerId = typeof subscription.customer === 'string' 
    ? subscription.customer 
    : subscription.customer.id;

  // Map Stripe status to our status enum
  let status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'paused' = 'active';
  if (subscription.status === 'trialing') {
    status = 'trialing';
  } else if (subscription.status === 'past_due') {
    status = 'past_due';
  } else if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
    status = 'canceled';
  } else if (subscription.status === 'paused') {
    status = 'paused';
  }

  await createOrUpdateSubscription({
    organizationId,
    planId,
    stripeSubscriptionId: subscription.id,
    stripeCustomerId: customerId,
    status,
    currentPeriodStart: new Date(subscription.current_period_start * 1000),
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : undefined,
    trialEndsAt: subscription.trial_end ? new Date(subscription.trial_end * 1000) : undefined,
  });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const organizationId = subscription.metadata?.organizationId;
  const planId = subscription.metadata?.planId;

  if (!organizationId || !planId) {
    console.error('Missing organizationId or planId in subscription metadata');
    return;
  }

  const customerId = typeof subscription.customer === 'string' 
    ? subscription.customer 
    : subscription.customer.id;

  await createOrUpdateSubscription({
    organizationId,
    planId,
    stripeSubscriptionId: subscription.id,
    stripeCustomerId: customerId,
    status: 'canceled',
    currentPeriodStart: new Date(subscription.current_period_start * 1000),
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    cancelAtPeriodEnd: false,
    canceledAt: new Date(),
    trialEndsAt: subscription.trial_end ? new Date(subscription.trial_end * 1000) : undefined,
  });
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const organizationId = invoice.metadata?.organizationId;
  const subscriptionId = invoice.subscription 
    ? (typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription.id)
    : undefined;

  if (!organizationId) {
    console.error('Missing organizationId in invoice metadata');
    return;
  }

  // Update invoice in database
  await createOrUpdateInvoice({
    organizationId,
    subscriptionId,
    stripeInvoiceId: invoice.id,
    number: invoice.number || undefined,
    status: 'paid',
    amountDue: (invoice.amount_due / 100).toString(),
    amountPaid: (invoice.amount_paid / 100).toString(),
    currency: invoice.currency,
    periodStart: invoice.period_start ? new Date(invoice.period_start * 1000) : undefined,
    periodEnd: invoice.period_end ? new Date(invoice.period_end * 1000) : undefined,
    dueDate: invoice.due_date ? new Date(invoice.due_date * 1000) : undefined,
    paidAt: new Date(),
    hostedInvoiceUrl: invoice.hosted_invoice_url || undefined,
    invoicePdf: invoice.invoice_pdf || undefined,
    lineItems: invoice.lines?.data || undefined,
  });

  // If this is a credit purchase (check metadata or line items)
  if (invoice.metadata?.type === 'credit_purchase') {
    const amount = invoice.amount_paid / 100; // Convert from cents to dollars
    
    // Calculate credits: $4 per video credit
    const creditsAmount = amount / 4;

    await createCreditTransaction({
      organizationId,
      type: 'purchase',
      amount: creditsAmount.toString(),
      description: `Credit purchase via invoice ${invoice.number}`,
      stripePaymentIntentId: typeof invoice.payment_intent === 'string' 
        ? invoice.payment_intent 
        : invoice.payment_intent?.id,
    });
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const organizationId = invoice.metadata?.organizationId;
  const subscriptionId = invoice.subscription 
    ? (typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription.id)
    : undefined;

  if (!organizationId) {
    console.error('Missing organizationId in invoice metadata');
    return;
  }

  await createOrUpdateInvoice({
    organizationId,
    subscriptionId,
    stripeInvoiceId: invoice.id,
    number: invoice.number || undefined,
    status: 'open', // Keep as open for retry
    amountDue: (invoice.amount_due / 100).toString(),
    amountPaid: (invoice.amount_paid / 100).toString(),
    currency: invoice.currency,
    periodStart: invoice.period_start ? new Date(invoice.period_start * 1000) : undefined,
    periodEnd: invoice.period_end ? new Date(invoice.period_end * 1000) : undefined,
    dueDate: invoice.due_date ? new Date(invoice.due_date * 1000) : undefined,
    hostedInvoiceUrl: invoice.hosted_invoice_url || undefined,
    invoicePdf: invoice.invoice_pdf || undefined,
    lineItems: invoice.lines?.data || undefined,
  });
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  const organizationId = paymentIntent.metadata?.organizationId;

  if (!organizationId) {
    console.error('Missing organizationId in payment intent metadata');
    return;
  }

  // If this is a credit purchase
  if (paymentIntent.metadata?.type === 'credit_purchase') {
    const amount = paymentIntent.amount / 100; // Convert from cents to dollars
    
    // Calculate credits: $4 per video credit
    const creditsAmount = amount / 4;

    await createCreditTransaction({
      organizationId,
      type: 'purchase',
      amount: creditsAmount.toString(),
      description: `Credit purchase via payment ${paymentIntent.id}`,
      stripePaymentIntentId: paymentIntent.id,
    });
  }
}
