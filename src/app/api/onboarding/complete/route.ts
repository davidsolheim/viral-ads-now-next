import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { completeOnboarding } from '@/lib/db-queries';
import { z } from 'zod';

const completeOnboardingSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name must be 255 characters or less'),
  organizationName: z.string().min(1, 'Organization name is required').max(255, 'Organization name must be 255 characters or less'),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const data = completeOnboardingSchema.parse(body);

    const organization = await completeOnboarding(
      session.user.id,
      data.name,
      data.organizationName
    );

    return NextResponse.json({
      success: true,
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
      },
    });
  } catch (error) {
    console.error('Error completing onboarding:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    // Handle unique constraint violation (duplicate slug)
    if (error instanceof Error && error.message.includes('unique')) {
      return NextResponse.json(
        { error: 'An organization with this name already exists. Please try a different name.' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to complete onboarding' },
      { status: 500 }
    );
  }
}