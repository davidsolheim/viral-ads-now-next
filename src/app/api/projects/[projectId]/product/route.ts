import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { InferSelectModel } from 'drizzle-orm';
import { products } from '@/db/schema/projects';
import {
  createProduct,
  createMediaAsset,
  getProductByProject,
  getProject,
  updateProjectProductUrl,
  updateProjectProductId,
  updateProductByProject,
  updateProduct,
  updateProjectStep,
  updateProjectSettings,
  updateProjectName,
  getProductByUrl,
  getProductsByOrganization,
  checkUserOrganizationAccess,
  getProductById,
} from '@/lib/db-queries';
import { extractProductFromUrl } from '@/lib/services/openai';

type Product = InferSelectModel<typeof products>;
import { uploadFromUrl } from '@/lib/services/wasabi';

const extractProductSchema = z.object({
  url: z.string().url(),
});

const updateProductSchema = z.object({
  product: z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    price: z.string().optional(),
    originalPrice: z.string().optional(),
    currency: z.string().optional(),
    category: z.string().optional(),
    soldCount: z.number().int().optional(),
    images: z.array(z.string().url()).optional(),
    features: z.array(z.string()).optional(),
    benefits: z.array(z.string()).optional(),
    url: z.string().url().optional(),
  }),
  flowType: z.enum(['manual', 'automatic']).optional(),
  productId: z.string().optional(), // For linking existing product
});

const stripHtml = (html: string) => {
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?>[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const decodeHtmlEntities = (value: string) => {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
};

const extractImageUrls = (html: string, baseUrl: string): string[] => {
  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  const metaOgRegex = /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["'][^>]*>/gi;
  const images: string[] = [];
  let match;

  while ((match = imgRegex.exec(html)) !== null) {
    let imageUrl = decodeHtmlEntities(match[1]);

    // Convert relative URLs to absolute URLs
    try {
      if (imageUrl.startsWith('//')) {
        imageUrl = `https:${imageUrl}`;
      } else if (!imageUrl.startsWith('http')) {
        imageUrl = new URL(imageUrl, baseUrl).href;
      }
      images.push(imageUrl);
    } catch (error) {
      // Skip invalid URLs
      console.warn('Skipping invalid image URL:', imageUrl);
    }
  }

  while ((match = metaOgRegex.exec(html)) !== null) {
    let imageUrl = decodeHtmlEntities(match[1]);
    try {
      if (imageUrl.startsWith('//')) {
        imageUrl = `https:${imageUrl}`;
      } else if (!imageUrl.startsWith('http')) {
        imageUrl = new URL(imageUrl, baseUrl).href;
      }
      images.push(imageUrl);
    } catch (error) {
      console.warn('Skipping invalid OG image URL:', imageUrl);
    }
  }

  // Filter out very small images, data URLs, and tracking pixels
  const filtered = images.filter((url) => {
    try {
      // Skip data URLs, very small images, tracking pixels
      if (
        url.startsWith('data:') ||
        url.includes('1x1') ||
        url.includes('pixel') ||
        url.includes('spacer') ||
        url.includes('tracking') ||
        url.includes('analytics')
      ) {
        return false;
      }
      return true;
    } catch {
      return false;
    }
  });

  const unique = Array.from(new Set(filtered));
  return unique.slice(0, 10); // Limit to first 10 images
};

const shouldUpdateProjectName = (currentName: string | null | undefined) => {
  const normalized = currentName?.trim().toLowerCase() ?? '';
  if (!normalized) return true;
  if (normalized === 'new project' || normalized === 'product' || normalized === 'item') return true;
  const compact = normalized.replace(/[^a-z0-9]/g, '');
  const hasLetters = /[a-z]/.test(compact);
  if (!hasLetters && compact.length >= 6) return true;
  if (compact.length >= 24 && !normalized.includes(' ')) return true;
  return false;
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await auth();
    const { projectId } = await params;

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const project = await getProject(projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const product = await getProductByProject(projectId);

    if (!product) {
      // If no product exists yet, return the project's productUrl if available
      return NextResponse.json({ 
        product: project.productUrl ? { url: project.productUrl } : null 
      }, { status: 200 });
    }

    return NextResponse.json({ product }, { status: 200 });
  } catch (error) {
    console.error('Error fetching product data:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch product data' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await auth();
    const { projectId } = await params;

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const project = await getProject(projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const body = await request.json();
    const { url } = extractProductSchema.parse(body);

    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch URL: ${response.statusText}` },
        { status: 400 }
      );
    }

    const html = await response.text();
    const cleaned = stripHtml(html).slice(0, 12000);

    // Extract actual image URLs from HTML
    const imageUrls = extractImageUrls(html, url);
    console.log(`Found ${imageUrls.length} image URLs in HTML:`, imageUrls.slice(0, 5)); // Log first 5

    const extracted = await extractProductFromUrl(cleaned, url, imageUrls);

    if (!extracted?.name) {
      return NextResponse.json(
        { error: 'Unable to extract product name from URL' },
        { status: 422 }
      );
    }

    // Log extracted data to verify all fields are present
    console.log('Extracted product data:', {
      name: extracted.name,
      hasDescription: extracted.description !== undefined,
      descriptionLength: extracted.description?.length || 0,
      hasPrice: extracted.price !== undefined,
      hasOriginalPrice: extracted.originalPrice !== undefined,
      hasCurrency: extracted.currency !== undefined,
      featuresCount: extracted.features?.length || 0,
      benefitsCount: extracted.benefits?.length || 0,
      imagesCount: extracted.images?.length || 0,
    });

    // Process and upload product images to Wasabi
    let processedImages: string[] = [];
    const imageCandidates = extracted.images || [];
    if (imageCandidates.length > 0) {
      const imageUploadPromises = imageCandidates.map(async (imageUrl: string, index: number) => {
        try {
          // Convert relative URLs to absolute URLs if needed
          let absoluteImageUrl: string;
          try {
            // Try to create URL object - will throw if relative
            new URL(imageUrl);
            absoluteImageUrl = imageUrl;
          } catch {
            // If relative, resolve against the product page URL
            absoluteImageUrl = new URL(imageUrl, url).href;
          }

          // Decode HTML entities if present
          absoluteImageUrl = decodeHtmlEntities(absoluteImageUrl);

          // Extract filename from URL or generate one
          const urlPath = new URL(absoluteImageUrl).pathname;
          const fileName = urlPath.split('/').pop() || `product-image-${index + 1}.jpg`;
          // Ensure filename has extension
          const finalFileName = fileName.includes('.') ? fileName : `${fileName}.jpg`;

          // Upload image to Wasabi with proper headers for image fetching
          const uploadResult = await uploadFromUrl(absoluteImageUrl, {
            organizationId: project.organizationId,
            projectId,
            assetType: 'images',
            fileName: finalFileName,
            metadata: {
              source: 'product_extraction',
              originalUrl: imageUrl,
              index: index.toString(),
            },
            fetchHeaders: {
              'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
              'Referer': url, // Use product page URL as referer
            },
          });

          // Create mediaAsset record
          await createMediaAsset({
            projectId,
            type: 'image',
            url: uploadResult.url,
            metadata: {
              source: 'product_extraction',
              originalUrl: imageUrl,
              fileName: finalFileName,
              sizeBytes: uploadResult.size,
              contentType: uploadResult.contentType,
            },
          });

          return uploadResult.url;
        } catch (error) {
          console.error(`Failed to upload image ${index + 1} (${imageUrl}):`, error);
          return null;
        }
      });

      // Wait for all uploads to complete (with fallbacks for failures)
      processedImages = (await Promise.all(imageUploadPromises)).filter(
        (imageUrl): imageUrl is string => Boolean(imageUrl)
      );
    }

    if (imageCandidates.length > 0 && processedImages.length === 0) {
      return NextResponse.json(
        { error: 'Failed to upload product images to storage. Please try again.' },
        { status: 502 }
      );
    }

    // Use processed images (Wasabi URLs)
    const finalImages = processedImages;

    // Check if product with this URL already exists for user or shared in organization
    let product = await getProductByUrl(session.user.id, url);
    
    // Also check shared products in the organization
    if (!product) {
      const orgProducts = await getProductsByOrganization(project.organizationId);
      product = orgProducts.find((p: Product) => p.url === url) || null;
    }

    if (product) {
      // Reuse existing product
      // Update product with any new extracted data (in case it was improved)
      const updateData: any = {};
      if (extracted.name && extracted.name !== product.name) updateData.name = extracted.name;
      if (extracted.description !== undefined) updateData.description = extracted.description;
      if (extracted.price) updateData.price = extracted.price;
      if (extracted.originalPrice) updateData.originalPrice = extracted.originalPrice;
      if (extracted.currency) updateData.currency = extracted.currency;
      if (finalImages.length > 0) updateData.images = finalImages;
      if (extracted.features) updateData.features = extracted.features;
      if (extracted.benefits) updateData.benefits = extracted.benefits;

      if (Object.keys(updateData).length > 0) {
        product = await updateProduct(product.id, updateData);
      }
    } else {
      // Create new product
      const productData = {
        userId: session.user.id,
        organizationId: undefined, // Not shared by default
        name: extracted.name,
        description: extracted.description,
        price: extracted.price,
        originalPrice: extracted.originalPrice,
        currency: extracted.currency,
        images: finalImages,
        features: extracted.features,
        benefits: extracted.benefits,
        url,
      };

      // Log what we're about to save
      console.log('Creating new product:', {
        name: productData.name,
        hasDescription: productData.description !== undefined,
        description: productData.description?.substring(0, 100) || '(empty)',
        featuresCount: productData.features?.length || 0,
        benefitsCount: productData.benefits?.length || 0,
        imagesCount: productData.images?.length || 0,
      });

      product = await createProduct(productData);
    }

    // Link product to project
    await updateProjectProductId(projectId, product.id);
    await updateProjectProductUrl(projectId, url);
    await updateProjectStep(projectId, 'style');

    if (extracted.name && shouldUpdateProjectName(project.name)) {
      await updateProjectName(projectId, extracted.name.trim());
    }

    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    console.error('Error extracting product data:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to extract product data' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await auth();
    const { projectId } = await params;

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const project = await getProject(projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const body = await request.json();
    const { product, flowType, productId: existingProductId } = updateProductSchema.parse(body);

    let updated;

    // If productId is provided, link existing product to project
    if (existingProductId) {
      // Verify product exists and user has access
      const existingProduct = await getProductById(existingProductId);
      if (!existingProduct) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      }

      // Check if user owns the product or it's shared with their organization
      const ownsProduct = existingProduct.userId === session.user.id;
      const isSharedWithOrg =
        existingProduct.organizationId === project.organizationId &&
        (await checkUserOrganizationAccess(session.user.id, project.organizationId));

      if (!ownsProduct && !isSharedWithOrg) {
        return NextResponse.json(
          { error: 'You do not have access to this product' },
          { status: 403 }
        );
      }

      // Link product to project
      await updateProjectProductId(projectId, existingProductId);
      if (existingProduct.url) {
        await updateProjectProductUrl(projectId, existingProduct.url);
      }

      // Update product data if provided
      if (product && Object.keys(product).length > 0) {
        updated = await updateProduct(existingProductId, product);
      } else {
        updated = existingProduct;
      }
    } else {
      // Update or create product normally
      updated = await updateProductByProject(projectId, product);

      if (!updated) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      }

      if (product.url) {
        await updateProjectProductUrl(projectId, product.url);
      }
    }

    // Update flowType in project settings if provided
    if (flowType) {
      await updateProjectSettings(projectId, {
        ...(project.settings || {}),
        flowType,
      });
    }

    // Update step to style after product is saved
    await updateProjectStep(projectId, 'style');

    return NextResponse.json({ product: updated }, { status: 200 });
  } catch (error) {
    console.error('Error updating product data:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update product data' },
      { status: 500 }
    );
  }
}
