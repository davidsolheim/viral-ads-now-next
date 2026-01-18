import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getAffiliatePerformanceMetrics } from '@/lib/db-queries';

// Super admin emails (comma-separated) from environment variable
const SUPER_ADMIN_EMAILS = process.env.SUPER_ADMIN_EMAILS?.split(',').map(e => e.trim().toLowerCase()) || [];

function isSuperAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return SUPER_ADMIN_EMAILS.includes(email.toLowerCase());
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is super admin
    if (!isSuperAdmin(session.user?.email)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const metrics = await getAffiliatePerformanceMetrics();

    return NextResponse.json(metrics, { status: 200 });
  } catch (error) {
    console.error('Error fetching affiliate metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch affiliate metrics' },
      { status: 500 }
    );
  }
}
