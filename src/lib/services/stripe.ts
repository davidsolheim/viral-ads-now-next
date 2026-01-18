/**
 * Stripe Service
 * Handles all Stripe API interactions including customers, subscriptions, payments, and webhooks
 */

import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not configured');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
  typescript: true,
});

/**
 * Create or retrieve a Stripe customer for an organization
 */
export async function getOrCreateCustomer(organizationId: string, email?: string, name?: string): Promise<Stripe.Customer> {
  // First check if customer exists in database
  const { db } = await import('@/db');
  const { organizations } = await import('@/db/schema');
  const { eq } = await import('drizzle-orm');

  const [org] = await db.select().from(organizations).where(eq(organizations.id, organizationId)).limit(1);

  if (org?.stripeCustomerId) {
    try {
      const customer = await stripe.customers.retrieve(org.stripeCustomerId);
      if (customer && !customer.deleted) {
        return customer as Stripe.Customer;
      }
    } catch (error) {
      // Customer doesn't exist in Stripe, create new one
      console.warn(`Stripe customer ${org.stripeCustomerId} not found, creating new one`);
    }
  }

  // Create new customer
  const customer = await stripe.customers.create({
    email,
    name,
    metadata: {
      organizationId,
    },
  });

  // Update organization with Stripe customer ID
  await db
    .update(organizations)
    .set({
      stripeCustomerId: customer.id,
      updatedAt: new Date(),
    })
    .where(eq(organizations.id, organizationId));

  return customer;
}

/**
 * Create a checkout session for subscription
 */
export async function createCheckoutSession({
  organizationId,
  planId,
  priceId,
  successUrl,
  cancelUrl,
  customerId,
}: {
  organizationId: string;
  planId: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  customerId?: string;
}): Promise<Stripe.Checkout.Session> {
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      organizationId,
      planId,
    },
    subscription_data: {
      metadata: {
        organizationId,
        planId,
      },
    },
  });

  return session;
}

/**
 * Create a payment intent for one-time credit purchases
 */
export async function createPaymentIntent({
  organizationId,
  amount,
  currency = 'usd',
  customerId,
}: {
  organizationId: string;
  amount: number; // Amount in cents
  currency?: string;
  customerId?: string;
}): Promise<Stripe.PaymentIntent> {
  const paymentIntent = await stripe.paymentIntents.create({
    amount,
    currency,
    customer: customerId,
    metadata: {
      organizationId,
      type: 'credit_purchase',
    },
    automatic_payment_methods: {
      enabled: true,
    },
  });

  return paymentIntent;
}

/**
 * Create a customer portal session
 */
export async function createCustomerPortalSession({
  customerId,
  returnUrl,
}: {
  customerId: string;
  returnUrl: string;
}): Promise<Stripe.BillingPortal.Session> {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return session;
}

/**
 * Retrieve a subscription
 */
export async function getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
  return await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ['default_payment_method', 'customer'],
  });
}

/**
 * Cancel a subscription
 */
export async function cancelSubscription(
  subscriptionId: string,
  cancelAtPeriodEnd: boolean = true
): Promise<Stripe.Subscription> {
  if (cancelAtPeriodEnd) {
    return await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
  } else {
    return await stripe.subscriptions.cancel(subscriptionId);
  }
}

/**
 * Update subscription (e.g., change plan)
 */
export async function updateSubscription({
  subscriptionId,
  priceId,
  prorationBehavior = 'create_prorations',
}: {
  subscriptionId: string;
  priceId: string;
  prorationBehavior?: 'create_prorations' | 'none' | 'always_invoice';
}): Promise<Stripe.Subscription> {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  return await stripe.subscriptions.update(subscriptionId, {
    items: [
      {
        id: subscription.items.data[0].id,
        price: priceId,
      },
    ],
    proration_behavior: prorationBehavior,
  });
}

/**
 * Create usage record for metered billing (usage-based billing)
 */
export async function createUsageRecord({
  subscriptionItemId,
  quantity,
  timestamp,
}: {
  subscriptionItemId: string;
  quantity: number;
  timestamp?: number;
}): Promise<Stripe.UsageRecord> {
  return await stripe.subscriptionItems.createUsageRecord(subscriptionItemId, {
    quantity,
    timestamp: timestamp || Math.floor(Date.now() / 1000),
  });
}

/**
 * Create an invoice for overage charges
 */
export async function createInvoice({
  customerId,
  amount,
  currency = 'usd',
  description,
  metadata,
}: {
  customerId: string;
  amount: number; // Amount in cents
  currency?: string;
  description: string;
  metadata?: Record<string, string>;
}): Promise<Stripe.Invoice> {
  // Create invoice item
  await stripe.invoiceItems.create({
    customer: customerId,
    amount,
    currency,
    description,
    metadata,
  });

  // Create and finalize invoice
  const invoice = await stripe.invoices.create({
    customer: customerId,
    auto_advance: true,
    metadata,
  });

  const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id);

  return finalizedInvoice;
}

/**
 * Retrieve customer payment methods
 */
export async function getPaymentMethods(customerId: string): Promise<Stripe.PaymentMethod[]> {
  const paymentMethods = await stripe.paymentMethods.list({
    customer: customerId,
    type: 'card',
  });

  return paymentMethods.data;
}

/**
 * Set default payment method for a customer
 */
export async function setDefaultPaymentMethod(
  customerId: string,
  paymentMethodId: string
): Promise<Stripe.Customer> {
  return await stripe.customers.update(customerId, {
    invoice_settings: {
      default_payment_method: paymentMethodId,
    },
  });
}
