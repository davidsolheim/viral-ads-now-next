import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import {
  createProduct,
  createMediaAsset,
  getProductByProject,
  getProject,
  updateProjectProductUrl,
  updateProductByProject,
  updateProjectStep,
} from '@/lib/db-queries';
import { extractProductFromUrl } from '@/lib/services/openai';
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
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
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

    const extracted = await extractProductFromUrl(cleaned, url);

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
    if (extracted.images && extracted.images.length > 0) {
      const imageUploadPromises = extracted.images.map(async (imageUrl: string, index: number) => {
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
            contentType: 'image/jpeg', // Default, will be corrected if needed
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
          // Return original URL as fallback
          return imageUrl;
        }
      });

      // Wait for all uploads to complete (with fallbacks for failures)
      processedImages = await Promise.all(imageUploadPromises);
    }

    // Use processed images (Wasabi URLs) or fall back to original URLs
    const finalImages = processedImages.length > 0 ? processedImages : extracted.images || [];

    // Ensure all extracted fields are explicitly passed to createProduct
    // This guarantees that all LLM-extracted data is saved to the database
    const productData = {
      projectId,
      name: extracted.name,
      description: extracted.description, // Pass as-is (can be empty string or undefined)
      price: extracted.price,
      originalPrice: extracted.originalPrice,
      currency: extracted.currency,
      images: finalImages,
      features: extracted.features, // Pass array as-is (will be converted to null if empty)
      benefits: extracted.benefits, // Pass array as-is (will be converted to null if empty)
      url,
    };

    // Log what we're about to save
    console.log('Saving product data:', {
      name: productData.name,
      hasDescription: productData.description !== undefined,
      description: productData.description?.substring(0, 100) || '(empty)',
      featuresCount: productData.features?.length || 0,
      benefitsCount: productData.benefits?.length || 0,
      imagesCount: productData.images?.length || 0,
    });

    const product = await createProduct(productData);

    await updateProjectProductUrl(projectId, url);
    await updateProjectStep(projectId, 'style');

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
    const { product } = updateProductSchema.parse(body);

    const updated = await updateProductByProject(projectId, product);

    if (!updated) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    if (product.url) {
      await updateProjectProductUrl(projectId, product.url);
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
