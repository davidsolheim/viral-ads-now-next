import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getProductsByUser,
  getProductsByOrganization,
  checkUserOrganizationAccess,
  getProductById,
  archiveProduct,
  unarchiveProduct,
  updateProduct,
  getProductsWithVideoInfo,
} from '@/lib/db-queries';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');
    const includeArchived = searchParams.get('includeArchived') === 'true';

    let products = [];

    // Get user's own products
    const userProducts = await getProductsByUser(session.user.id, includeArchived);
    products.push(...userProducts);

    // If organizationId is provided, also get shared products from that organization
    if (organizationId) {
      // Check if user has access to the organization
      const member = await checkUserOrganizationAccess(session.user.id, organizationId);
      if (member) {
        const orgProducts = await getProductsByOrganization(organizationId, includeArchived);
        products.push(...orgProducts);
      }
    }

    // Remove duplicates (in case a product is both user's and shared)
    const uniqueProducts = products.filter(
      (product, index, self) => index === self.findIndex((p) => p.id === product.id)
    );

    // Sort by creation date (newest first)
    uniqueProducts.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });

    // Enrich products with video information
    const productIds = uniqueProducts.map((p) => p.id);
    const videoInfo = await getProductsWithVideoInfo(productIds);

    // Add video info to each product
    const enrichedProducts = uniqueProducts.map((product) => {
      const info = videoInfo[product.id] || { hasVideo: false };
      return {
        ...product,
        hasVideo: info.hasVideo,
        latestVideo: info.latestVideo,
        latestProject: info.latestProject,
      };
    });

    return NextResponse.json({ products: enrichedProducts }, { status: 200 });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch products' },
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

    const body = await request.json();
  const { productId, action, name } = body;

  if (!productId || !action) {
    return NextResponse.json({ error: 'productId and action are required' }, { status: 400 });
    }

  if (!['archive', 'unarchive', 'rename'].includes(action)) {
    return NextResponse.json(
      { error: 'action must be "archive", "unarchive", or "rename"' },
      { status: 400 }
    );
    }

    // Get product to verify ownership
    const product = await getProductById(productId);
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Verify user owns the product or has organization access
    const ownsProduct = product.userId === session.user.id;
    let hasOrgAccess = false;

    if (product.organizationId) {
      const member = await checkUserOrganizationAccess(session.user.id, product.organizationId);
      hasOrgAccess = !!member;
    }

    if (!ownsProduct && !hasOrgAccess) {
      return NextResponse.json({ error: 'Forbidden - You do not have access to this product' }, { status: 403 });
    }

    // Perform archive/unarchive action
  let updatedProduct;
  if (action === 'rename') {
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }
    updatedProduct = await updateProduct(productId, { name: name.trim() });
  } else if (action === 'archive') {
    updatedProduct = await archiveProduct(productId);
  } else {
    updatedProduct = await unarchiveProduct(productId);
  }

    return NextResponse.json({ product: updatedProduct }, { status: 200 });
  } catch (error) {
    console.error('Error archiving/unarchiving product:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to archive/unarchive product' },
      { status: 500 }
    );
  }
}
