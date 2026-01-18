import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getOrCreateCustomer, createCheckoutSession } from '@/lib/services/stripe';
import { getSubscriptionPlan, checkUserOrganizationAccess } from '@/lib/db-queries';
import { z } from 'zod';

const checkoutSchema = z.object({
  organizationId: z.string(),
  planSlug: z.string(),
  billingCycle: z.enum(['monthly', 'annual']),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { organizationId, planSlug, billingCycle } = checkoutSchema.parse(body);

    // Verify user has access to organization
    const member = await checkUserOrganizationAccess(session.user.id, organizationId);
    if (!member) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get subscription plan
    const plan = await getSubscriptionPlan(planSlug);
    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    // Get or create Stripe customer
    const customer = await getOrCreateCustomer(
      organizationId,
      session.user.email || undefined,
      undefined // Name can be retrieved from organization if needed
    );

    // Determine price ID based on billing cycle
    // Note: You'll need to set up Stripe prices for monthly/annual and store them
    // For now, we'll use a placeholder - you should store price IDs in the plan or as environment variables
    const priceId = billingCycle === 'annual' 
      ? process.env[`STRIPE_PRICE_ID_${planSlug.toUpperCase()}_ANNUAL`]
      : process.env[`STRIPE_PRICE_ID_${planSlug.toUpperCase()}_MONTHLY`];

    if (!priceId) {
      return NextResponse.json(
        { error: `Price ID not configured for ${planSlug} ${billingCycle}` },
        { status: 500 }
      );
    }

    // Get base URL
    const baseUrl = process.env.NEXTAUTH_URL || request.headers.get('origin') || 'http://localhost:3000';

    // Create checkout session
    const checkoutSession = await createCheckoutSession({
      organizationId,
      planId: plan.id,
      priceId,
      successUrl: `${baseUrl}/dashboard?checkout=success`,
      cancelUrl: `${baseUrl}/pricing?checkout=cancelled`,
      customerId: customer.id,
    });

    return NextResponse.json({ 
      sessionId: checkoutSession.id,
      url: checkoutSession.url,
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
