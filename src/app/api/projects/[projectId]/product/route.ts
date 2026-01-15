import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import {
  createProduct,
  getProject,
  updateProjectProductUrl,
  updateProductByProject,
  updateProjectStep,
} from '@/lib/db-queries';
import { extractProductFromUrl } from '@/lib/services/openai';

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

    const product = await createProduct({
      projectId,
      name: extracted.name,
      description: extracted.description,
      price: extracted.price,
      originalPrice: extracted.originalPrice,
      currency: extracted.currency,
      images: extracted.images,
      features: extracted.features,
      benefits: extracted.benefits,
      url,
    });

    await updateProjectProductUrl(projectId, url);
    await updateProjectStep(projectId, 'script');

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
