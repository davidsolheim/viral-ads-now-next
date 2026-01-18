import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { updateReferralStatus, updateAffiliateCommission, getAffiliateReferrals } from '@/lib/db-queries';
import { z } from 'zod';
import { db } from '@/db';
import { referrals } from '@/db/schema';
import { eq } from 'drizzle-orm';

// Super admin emails (comma-separated) from environment variable
const SUPER_ADMIN_EMAILS = process.env.SUPER_ADMIN_EMAILS?.split(',').map(e => e.trim().toLowerCase()) || [];

function isSuperAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return SUPER_ADMIN_EMAILS.includes(email.toLowerCase());
}

const updateReferralSchema = z.object({
  status: z.enum(['pending', 'claimed', 'rewarded']).optional(),
  rewardCreditAmount: z.number().int().min(0).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ referralId: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is super admin
    if (!isSuperAdmin(session.user?.email)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { referralId } = await params;

    // Get referral details
    const [referral] = await db
      .select()
      .from(referrals)
      .where(eq(referrals.id, referralId))
      .limit(1);

    if (!referral) {
      return NextResponse.json({ error: 'Referral not found' }, { status: 404 });
    }

    // Get all referrals for this affiliate
    const affiliateReferrals = await getAffiliateReferrals(referral.referrerId);

    return NextResponse.json({
      referral,
      affiliateReferrals,
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching referral details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch referral details' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ referralId: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is super admin
    if (!isSuperAdmin(session.user?.email)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { referralId } = await params;
    const body = await request.json();
    const validatedData = updateReferralSchema.parse(body);

    // Check if referral exists
    const [referral] = await db
      .select()
      .from(referrals)
      .where(eq(referrals.id, referralId))
      .limit(1);

    if (!referral) {
      return NextResponse.json({ error: 'Referral not found' }, { status: 404 });
    }

    // Update status if provided
    if (validatedData.status) {
      await updateReferralStatus(referralId, validatedData.status);
    }

    // Update commission if provided
    if (validatedData.rewardCreditAmount !== undefined) {
      await updateAffiliateCommission(referralId, validatedData.rewardCreditAmount);
    }

    // Get updated referral
    const [updated] = await db
      .select()
      .from(referrals)
      .where(eq(referrals.id, referralId))
      .limit(1);

    return NextResponse.json({ referral: updated }, { status: 200 });
  } catch (error) {
    console.error('Error updating referral:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update referral' },
      { status: 500 }
    );
  }
}
