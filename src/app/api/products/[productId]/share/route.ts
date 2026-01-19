import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getProductById, shareProductWithOrganization, checkUserOrganizationAccess } from '@/lib/db-queries';
import { z } from 'zod';

const shareProductSchema = z.object({
  organizationId: z.string(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const session = await auth();
    const { productId } = await params;

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { organizationId } = shareProductSchema.parse(body);

    // Verify product exists and belongs to user
    const product = await getProductById(productId);
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    if (product.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'You can only share your own products' },
        { status: 403 }
      );
    }

    // Check if user has access to the organization
    const member = await checkUserOrganizationAccess(session.user.id, organizationId);
    if (!member) {
      return NextResponse.json(
        { error: 'You do not have access to this organization' },
        { status: 403 }
      );
    }

    const updatedProduct = await shareProductWithOrganization(productId, organizationId);

    return NextResponse.json({ product: updatedProduct }, { status: 200 });
  } catch (error) {
    console.error('Error sharing product:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to share product' },
      { status: 500 }
    );
  }
}
