import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { rateLimit as checkRateLimit, getRateLimitHeaders } from '@/lib/middleware/rate-limit';
import {
  fetchTrendingProducts,
  processRapidAPIProducts,
  type RapidAPIFetchOptions,
} from '@/lib/tiktok-shop/rapidapi';
import { createTikTokShopProduct, getTikTokShopProductByTikTokId } from '@/lib/db-queries';
import { z } from 'zod';

const seedRequestSchema = z.object({
  page: z.number().int().min(1).optional(),
  last: z.number().int().min(1).max(30).optional(),
  order_by: z.string().optional(),
  order_type: z.enum(['asc', 'desc']).optional(),
  country: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        {
          error: 'Unauthorized',
          message: 'You must be authenticated to use this endpoint',
        },
        { status: 401 }
      );
    }

    // Rate limit check (1 request per 5 minutes to prevent abuse)
    const rateLimitResult = checkRateLimit(request, 1, 5 * 60 * 1000);

    if (rateLimitResult && !rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: `Please wait ${rateLimitResult.retryAfter} seconds before sending another request.`,
        },
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult),
        }
      );
    }

    // Validate RAPID_API_KEY
    if (!process.env.RAPID_API_KEY) {
      return NextResponse.json(
        {
          error: 'Configuration error',
          message: 'RAPID_API_KEY is not configured. Please add RAPID_API_KEY to your environment variables.',
          details: 'The RapidAPI key is required to fetch trending products from TikTok Creative Center API.',
        },
        { status: 500 }
      );
    }

    // Parse and validate request body
    const body = await request.json().catch(() => ({}));
    const validated = seedRequestSchema.parse(body);

    // Build fetch options
    const fetchOptions: RapidAPIFetchOptions = {
      page: validated.page || 1,
      last: validated.last || 7,
      order_by: validated.order_by || 'post',
      order_type: validated.order_type || 'desc',
      country: validated.country,
      limit: validated.limit,
    };

    // Fetch trending products from RapidAPI
    const rapidAPIResponse = await fetchTrendingProducts(fetchOptions);

    // Log response for debugging (remove sensitive data)
    console.log('RapidAPI Response:', {
      code: rapidAPIResponse.code,
      msg: rapidAPIResponse.msg,
      hasData: !!rapidAPIResponse.data,
      listCount: rapidAPIResponse.data?.list?.length || 0,
      itemsCount: rapidAPIResponse.data?.items?.length || 0,
      productsCount: rapidAPIResponse.data?.products?.length || 0,
    });

    // Handle different response formats: 'list', 'items', 'products', or direct array
    const productItems = 
      rapidAPIResponse.data?.list ||  // Actual API uses 'list'
      rapidAPIResponse.data?.items || 
      rapidAPIResponse.data?.products || 
      (Array.isArray(rapidAPIResponse.data) ? rapidAPIResponse.data : []) ||
      (Array.isArray(rapidAPIResponse) ? rapidAPIResponse : []);

    if (productItems.length === 0) {
      return NextResponse.json(
        {
          success: true,
          data: {
            fetched: 0,
            created: 0,
            updated: 0,
            errors: 0,
            skipped: 0,
            imagesUploaded: 0,
            imagesFailed: 0,
          },
          message: rapidAPIResponse.message || 'No products found in API response',
          debug: process.env.NODE_ENV === 'development' ? {
            responseStructure: {
              code: rapidAPIResponse.code,
              msg: rapidAPIResponse.msg,
              hasData: !!rapidAPIResponse.data,
              hasList: !!rapidAPIResponse.data?.list,
              hasItems: !!rapidAPIResponse.data?.items,
              hasProducts: !!rapidAPIResponse.data?.products,
              isArray: Array.isArray(rapidAPIResponse.data),
              keys: rapidAPIResponse.data ? Object.keys(rapidAPIResponse.data) : [],
              listCount: rapidAPIResponse.data?.list?.length || 0,
            },
          } : undefined,
        },
        {
          status: 200,
          headers: rateLimitResult ? getRateLimitHeaders(rateLimitResult) : {},
        }
      );
    }

    // Process products and download images to Wasabi
    const { products, imagesUploaded, imagesFailed, skipped } = await processRapidAPIProducts(
      productItems
    );

    // Store products in database
    // Note: createTikTokShopProduct uses onConflictDoUpdate, so duplicates are automatically handled
    let created = 0;
    let updated = 0;
    let errors = 0;
    const processedProductIds = new Set<string>(); // Track processed IDs to avoid duplicates in batch

    for (const product of products) {
      try {
        // Skip if we've already processed this product ID in this batch
        if (processedProductIds.has(product.tiktokProductId)) {
          console.warn(`Skipping duplicate product ID in batch: ${product.tiktokProductId}`);
          continue;
        }

        // Check if product already exists in database
        const existing = await getTikTokShopProductByTikTokId(product.tiktokProductId);

        // createTikTokShopProduct will update if tiktokProductId already exists (upsert)
        await createTikTokShopProduct(product);
        
        // Mark as processed
        processedProductIds.add(product.tiktokProductId);
        
        if (existing) {
          updated++;
        } else {
          created++;
        }
      } catch (error) {
        console.error(`Error storing product ${product.tiktokProductId}:`, error);
        errors++;
      }
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          fetched: productItems.length,
          created,
          updated,
          errors,
          skipped,
          imagesUploaded,
          imagesFailed,
        },
        message: `Successfully processed ${products.length} products`,
      },
      {
        status: 200,
        headers: rateLimitResult ? getRateLimitHeaders(rateLimitResult) : {},
      }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: error.issues,
        },
        { status: 400 }
      );
    }

    console.error('Error seeding TikTok products from RapidAPI:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Failed to seed TikTok products',
      },
      { status: 500 }
    );
  }
}
