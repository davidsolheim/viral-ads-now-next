import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getAffiliateReferrals } from '@/lib/db-queries';
import { db } from '@/db';
import { referrals, users } from '@/db/schema';
import { eq } from 'drizzle-orm';

// Super admin emails (comma-separated) from environment variable
const SUPER_ADMIN_EMAILS = process.env.SUPER_ADMIN_EMAILS?.split(',').map(e => e.trim().toLowerCase()) || [];

function isSuperAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return SUPER_ADMIN_EMAILS.includes(email.toLowerCase());
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ referrerId: string }> }
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

    const { referrerId } = await params;

    // Get first referral for this referrer (for main referral code)
    const [firstReferral] = await db
      .select()
      .from(referrals)
      .where(eq(referrals.referrerId, referrerId))
      .limit(1);

    if (!firstReferral) {
      return NextResponse.json({ error: 'Affiliate not found' }, { status: 404 });
    }

    // Get all referrals for this affiliate
    const affiliateReferrals = await getAffiliateReferrals(referrerId);

    // Get user info
    const [user] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        image: users.image,
      })
      .from(users)
      .where(eq(users.id, referrerId))
      .limit(1);

    return NextResponse.json({
      referral: firstReferral,
      affiliateReferrals,
      user: user || null,
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching affiliate referrals:', error);
    return NextResponse.json(
      { error: 'Failed to fetch affiliate referrals' },
      { status: 500 }
    );
  }
}
