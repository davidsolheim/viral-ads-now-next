import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getOrCreateUserReferralCode, getUserReferralStats, updateUserReferralCode, getReferralByCode } from '@/lib/db-queries';
import { z } from 'zod';

const updateReferralCodeSchema = z.object({
  referralCode: z.string()
    .min(3, 'Referral code must be at least 3 characters')
    .max(20, 'Referral code must be at most 20 characters')
    .regex(/^[A-Za-z0-9-_]+$/, 'Referral code can only contain letters, numbers, hyphens, and underscores')
    .transform((val) => val.toUpperCase()),
});

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Get or create referral code
    const referral = await getOrCreateUserReferralCode(userId);

    // Get stats
    const stats = await getUserReferralStats(userId);

    // Generate referral link
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'http://localhost:3000';
    const referralLink = `${baseUrl}/auth/signin?ref=${referral.referralCode}`;

    return NextResponse.json(
      {
        referralCode: referral.referralCode,
        referralLink,
        stats: {
          totalReferrals: stats.totalReferrals,
          pendingCount: stats.pendingCount,
          claimedCount: stats.claimedCount,
          rewardedCount: stats.rewardedCount,
          totalRewards: stats.totalRewards,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching user referral:', error);
    return NextResponse.json(
      { error: 'Failed to fetch referral information' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const validatedData = updateReferralCodeSchema.parse(body);

    // Check if code is already taken
    const existingReferral = await getReferralByCode(validatedData.referralCode);
    if (existingReferral && existingReferral.referrerId !== userId) {
      return NextResponse.json(
        { error: 'This referral code is already taken' },
        { status: 409 }
      );
    }

    // Update the referral code
    const updated = await updateUserReferralCode(userId, validatedData.referralCode);

    // Get updated stats
    const stats = await getUserReferralStats(userId);

    // Generate updated referral link
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'http://localhost:3000';
    const referralLink = `${baseUrl}/auth/signin?ref=${updated.referralCode}`;

    return NextResponse.json(
      {
        referralCode: updated.referralCode,
        referralLink,
        stats: {
          totalReferrals: stats.totalReferrals,
          pendingCount: stats.pendingCount,
          claimedCount: stats.claimedCount,
          rewardedCount: stats.rewardedCount,
          totalRewards: stats.totalRewards,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating referral code:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid referral code format', details: error.issues },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message.includes('already taken')) {
      return NextResponse.json(
        { error: error.message },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update referral code' },
      { status: 500 }
    );
  }
}
