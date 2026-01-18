import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getOrCreateCustomer, createPaymentIntent } from '@/lib/services/stripe';
import { checkUserOrganizationAccess } from '@/lib/db-queries';
import { z } from 'zod';

const paymentIntentSchema = z.object({
  organizationId: z.string(),
  amount: z.number().positive(), // Amount in dollars
  currency: z.string().default('usd'),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { organizationId, amount, currency } = paymentIntentSchema.parse(body);

    // Verify user has access to organization
    const member = await checkUserOrganizationAccess(session.user.id, organizationId);
    if (!member) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get or create Stripe customer
    const customer = await getOrCreateCustomer(
      organizationId,
      session.user.email || undefined
    );

    // Convert dollars to cents
    const amountInCents = Math.round(amount * 100);

    // Create payment intent
    const paymentIntent = await createPaymentIntent({
      organizationId,
      amount: amountInCents,
      currency,
      customerId: customer.id,
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create payment intent' },
      { status: 500 }
    );
  }
}
