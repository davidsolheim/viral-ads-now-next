import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getAllAffiliates } from '@/lib/db-queries';

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

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const status = searchParams.get('status') as 'pending' | 'claimed' | 'rewarded' | null;
    const search = searchParams.get('search') || undefined;
    const sortBy = (searchParams.get('sortBy') || 'createdAt') as 'createdAt' | 'referralsCount' | 'rewards';
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';

    const result = await getAllAffiliates({
      page,
      limit,
      status: status || undefined,
      search,
      sortBy,
      sortOrder,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('Error fetching affiliates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch affiliates' },
      { status: 500 }
    );
  }
}
