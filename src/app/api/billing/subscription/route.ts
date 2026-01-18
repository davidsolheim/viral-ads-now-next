import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getSubscriptionByOrganizationId, getSubscriptionPlan } from '@/lib/db-queries';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');

    if (!organizationId) {
      return NextResponse.json(
        { error: 'organizationId is required' },
        { status: 400 }
      );
    }

    const subscription = await getSubscriptionByOrganizationId(organizationId);
    
    if (!subscription) {
      return NextResponse.json({ subscription: null });
    }

    const plan = await getSubscriptionPlan(subscription.planId);

    return NextResponse.json({
      subscription,
      plan,
    });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscription' },
      { status: 500 }
    );
  }
}
