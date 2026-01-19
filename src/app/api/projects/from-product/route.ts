import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  createProjectFromProduct,
  getProductById,
  checkUserOrganizationAccess,
} from '@/lib/db-queries';
import { z } from 'zod';

const createProjectFromProductSchema = z.object({
  productId: z.string(),
  name: z.string().min(1).max(255),
  organizationId: z.string(),
  flowType: z.enum(['manual', 'automatic']).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createProjectFromProductSchema.parse(body);

    // Verify product exists and user has access (either owns it or it's shared with their org)
    const product = await getProductById(validatedData.productId);
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Check if user owns the product or it's shared with their organization
    const ownsProduct = product.userId === session.user.id;
    const isSharedWithOrg =
      product.organizationId === validatedData.organizationId &&
      (await checkUserOrganizationAccess(session.user.id, validatedData.organizationId));

    if (!ownsProduct && !isSharedWithOrg) {
      return NextResponse.json(
        { error: 'You do not have access to this product' },
        { status: 403 }
      );
    }

    // Check if user has access to the organization
    const member = await checkUserOrganizationAccess(
      session.user.id,
      validatedData.organizationId
    );
    if (!member) {
      return NextResponse.json(
        { error: 'You do not have access to this organization' },
        { status: 403 }
      );
    }

    const project = await createProjectFromProduct({
      productId: validatedData.productId,
      name: validatedData.name,
      organizationId: validatedData.organizationId,
      creatorId: session.user.id,
      flowType: validatedData.flowType,
    });

    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    console.error('Error creating project from product:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create project' },
      { status: 500 }
    );
  }
}
