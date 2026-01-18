import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createCustomerPortalSession } from '@/lib/services/stripe';
import { getSubscriptionByOrganizationId, checkUserOrganizationAccess } from '@/lib/db-queries';
import { z } from 'zod';

const customerPortalSchema = z.object({
  organizationId: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { organizationId } = customerPortalSchema.parse(body);

    // Verify user has access to organization
    const member = await checkUserOrganizationAccess(session.user.id, organizationId);
    if (!member) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get subscription to find Stripe customer ID
    const subscription = await getSubscriptionByOrganizationId(organizationId);
    if (!subscription?.stripeCustomerId) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 404 }
      );
    }

    // Get base URL
    const baseUrl = process.env.NEXTAUTH_URL || request.headers.get('origin') || 'http://localhost:3000';

    // Create customer portal session
    const portalSession = await createCustomerPortalSession({
      customerId: subscription.stripeCustomerId,
      returnUrl: `${baseUrl}/settings/billing`,
    });

    return NextResponse.json({
      url: portalSession.url,
    });
  } catch (error) {
    console.error('Error creating customer portal session:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create customer portal session' },
      { status: 500 }
    );
  }
}
