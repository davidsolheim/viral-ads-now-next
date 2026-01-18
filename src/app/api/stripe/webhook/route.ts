import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/services/stripe';
import {
  createOrUpdateSubscription,
  createOrUpdateInvoice,
  createCreditTransaction,
  getCreditBalance,
  processReferralReward,
  getUserOrganizations,
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

          await handleSubscriptionCreated(subscription, session.metadata || undefined);
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
  const organizationId = metadata?.organizationId || subscription.metadata?.organizationId;
  const planId = metadata?.planId || subscription.metadata?.planId;

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
    currentPeriodStart:
      (subscription as any).current_period_start &&
      typeof (subscription as any).current_period_start === 'number'
        ? new Date((subscription as any).current_period_start * 1000)
        : undefined,
    currentPeriodEnd:
      (subscription as any).current_period_end &&
      typeof (subscription as any).current_period_end === 'number'
        ? new Date((subscription as any).current_period_end * 1000)
        : undefined,
    cancelAtPeriodEnd: (subscription as any).cancel_at_period_end ?? false,
    canceledAt:
      (subscription as any).canceled_at && typeof (subscription as any).canceled_at === 'number'
        ? new Date((subscription as any).canceled_at * 1000)
        : undefined,
    trialEndsAt:
      (subscription as any).trial_end && typeof (subscription as any).trial_end === 'number'
        ? new Date((subscription as any).trial_end * 1000)
        : undefined,
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
    currentPeriodStart:
      (subscription as any).current_period_start &&
      typeof (subscription as any).current_period_start === 'number'
        ? new Date((subscription as any).current_period_start * 1000)
        : undefined,
    currentPeriodEnd:
      (subscription as any).current_period_end &&
      typeof (subscription as any).current_period_end === 'number'
        ? new Date((subscription as any).current_period_end * 1000)
        : undefined,
    cancelAtPeriodEnd: false,
    canceledAt: new Date(),
    trialEndsAt:
      (subscription as any).trial_end && typeof (subscription as any).trial_end === 'number'
        ? new Date((subscription as any).trial_end * 1000)
        : undefined,
  });
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const organizationId = invoice.metadata?.organizationId;
  const invoiceAny = invoice as any;
  const subscriptionId = invoiceAny.subscription 
    ? (typeof invoiceAny.subscription === 'string' ? invoiceAny.subscription : invoiceAny.subscription.id)
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
    amountDue: invoiceAny.amount_due ? (invoiceAny.amount_due / 100).toString() : '0',
    amountPaid: invoiceAny.amount_paid ? (invoiceAny.amount_paid / 100).toString() : '0',
    currency: invoice.currency,
    periodStart: invoiceAny.period_start && typeof invoiceAny.period_start === 'number'
      ? new Date(invoiceAny.period_start * 1000)
      : undefined,
    periodEnd: invoiceAny.period_end && typeof invoiceAny.period_end === 'number'
      ? new Date(invoiceAny.period_end * 1000)
      : undefined,
    dueDate: invoiceAny.due_date && typeof invoiceAny.due_date === 'number'
      ? new Date(invoiceAny.due_date * 1000)
      : undefined,
    paidAt: new Date(),
    hostedInvoiceUrl: invoiceAny.hosted_invoice_url || undefined,
    invoicePdf: invoiceAny.invoice_pdf || undefined,
    lineItems: invoice.lines?.data || undefined,
  });

  // If this is a credit purchase (check metadata or line items)
  if (invoice.metadata?.type === 'credit_purchase') {
    const amount = invoiceAny.amount_paid ? invoiceAny.amount_paid / 100 : 0; // Convert from cents to dollars
    
    // Calculate credits: $0.01 per credit (1 penny = 1 credit)
    const creditsAmount = amount * 100;

    await createCreditTransaction({
      organizationId,
      type: 'purchase',
      amount: creditsAmount.toString(),
      description: `Credit purchase via invoice ${invoice.number}`,
      stripePaymentIntentId: invoiceAny.payment_intent
        ? (typeof invoiceAny.payment_intent === 'string' 
          ? invoiceAny.payment_intent 
          : invoiceAny.payment_intent?.id)
        : undefined,
    });

    // Process referral reward (20% of purchase)
    try {
      const { db } = await import('@/db');
      const { organizations } = await import('@/db/schema');
      const { eq } = await import('drizzle-orm');

      // Get organization owner/user ID
      const [org] = await db
        .select({ ownerId: organizations.ownerId })
        .from(organizations)
        .where(eq(organizations.id, organizationId))
        .limit(1);

      if (org?.ownerId) {
        await processReferralReward(
          org.ownerId,
          amount,
          organizationId,
          `Referral reward from credit purchase of $${amount.toFixed(2)}`,
          false // Not a subscription payment
        );
      }
    } catch (error) {
      // Log but don't fail the webhook
      console.error('Error processing referral reward:', error);
    }
  }

  // Process referral reward for subscription invoices (ongoing - every payment)
  if (subscriptionId && !invoice.metadata?.type) {
    try {
      const { db } = await import('@/db');
      const { organizations, subscriptions } = await import('@/db/schema');
      const { eq } = await import('drizzle-orm');

      // Get subscription to find organization
      const [sub] = await db
        .select({ organizationId: subscriptions.organizationId })
        .from(subscriptions)
        .where(eq(subscriptions.stripeSubscriptionId, subscriptionId))
        .limit(1);

      if (sub?.organizationId) {
        // Get organization owner/user ID
        const [org] = await db
          .select({ ownerId: organizations.ownerId })
          .from(organizations)
          .where(eq(organizations.id, sub.organizationId))
          .limit(1);

        if (org?.ownerId) {
          const amount = invoiceAny.amount_paid ? invoiceAny.amount_paid / 100 : 0;
          await processReferralReward(
            org.ownerId,
            amount,
            sub.organizationId,
            `Referral reward from subscription invoice of $${amount.toFixed(2)}`,
            true // Mark as subscription payment
          );
        }
      }
    } catch (error) {
      // Log but don't fail the webhook
      console.error('Error processing referral reward for subscription invoice:', error);
    }
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const organizationId = invoice.metadata?.organizationId;
  const invoiceAny = invoice as any;
  const subscriptionId = invoiceAny.subscription 
    ? (typeof invoiceAny.subscription === 'string' ? invoiceAny.subscription : invoiceAny.subscription.id)
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
    amountDue: invoiceAny.amount_due ? (invoiceAny.amount_due / 100).toString() : '0',
    amountPaid: invoiceAny.amount_paid ? (invoiceAny.amount_paid / 100).toString() : '0',
    currency: invoice.currency,
    periodStart: invoiceAny.period_start && typeof invoiceAny.period_start === 'number'
      ? new Date(invoiceAny.period_start * 1000)
      : undefined,
    periodEnd: invoiceAny.period_end && typeof invoiceAny.period_end === 'number'
      ? new Date(invoiceAny.period_end * 1000)
      : undefined,
    dueDate: invoiceAny.due_date && typeof invoiceAny.due_date === 'number'
      ? new Date(invoiceAny.due_date * 1000)
      : undefined,
    hostedInvoiceUrl: invoiceAny.hosted_invoice_url || undefined,
    invoicePdf: invoiceAny.invoice_pdf || undefined,
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
    
    // Calculate credits: $0.01 per credit (1 penny = 1 credit)
    const creditsAmount = amount * 100;

    await createCreditTransaction({
      organizationId,
      type: 'purchase',
      amount: creditsAmount.toString(),
      description: `Credit purchase via payment ${paymentIntent.id}`,
      stripePaymentIntentId: paymentIntent.id,
    });

    // Process referral reward (20% of purchase)
    try {
      const { db } = await import('@/db');
      const { organizations } = await import('@/db/schema');
      const { eq } = await import('drizzle-orm');

      // Get organization owner/user ID
      const [org] = await db
        .select({ ownerId: organizations.ownerId })
        .from(organizations)
        .where(eq(organizations.id, organizationId))
        .limit(1);

      if (org?.ownerId) {
        await processReferralReward(
          org.ownerId,
          amount,
          organizationId,
          `Referral reward from credit purchase of $${amount.toFixed(2)}`,
          false // Not a subscription payment
        );
      }
    } catch (error) {
      // Log but don't fail the webhook
      console.error('Error processing referral reward:', error);
    }
  }
}
