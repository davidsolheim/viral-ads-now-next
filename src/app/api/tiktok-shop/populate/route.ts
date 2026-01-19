import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { rateLimit as checkRateLimit, getRateLimitHeaders } from '@/lib/middleware/rate-limit';
import {
  fetchIndividualProducts,
  fetchTrendingCategories,
  fetchTrendingProducts,
  processRapidAPIProducts,
} from '@/lib/tiktok-shop/rapidapi';
import { createTikTokShopProduct, getTikTokShopProductByTikTokId } from '@/lib/db-queries';
import { z } from 'zod';

type PopulateStrategy =
  | 'individual-products'
  | 'category-trends'
  | 'mixed'
  | 'targeted-categories'
  | 'fresh-only'
  | 'bulk-update';

const populateRequestSchema = z.object({
  strategy: z.enum(['individual-products', 'fresh-only', 'bulk-update']),
  batchSize: z.number().int().min(10).max(100).optional().default(50),
  maxBatches: z.number().int().min(1).max(10).optional().default(1),
  country: z.string().optional().default('US'),
  minTrendingScore: z.number().int().min(0).max(100).optional().default(0),
  includeImages: z.boolean().optional().default(true),
  skipDuplicates: z.boolean().optional().default(true),
  previewMode: z.boolean().optional().default(false),
});

export async function POST(request: NextRequest) {
  const startTime = Date.now();

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
          details: 'The RapidAPI key is required to fetch trending products from TikTok APIs.',
        },
        { status: 500 }
      );
    }

    // Parse and validate request body
    const body = await request.json().catch(() => ({}));
    const validated = populateRequestSchema.parse(body);

    const {
      strategy,
      batchSize,
      maxBatches,
      country,
      minTrendingScore,
      includeImages,
      skipDuplicates,
      previewMode,
    } = validated;

    console.log(`Starting population with strategy: ${strategy}`, {
      batchSize,
      maxBatches,
      country,
      previewMode,
    });

    let totalFetched = 0;
    let totalCreated = 0;
    let totalUpdated = 0;
    let totalErrors = 0;
    let totalSkipped = 0;
    let totalImagesUploaded = 0;
    let totalImagesFailed = 0;

    // Process batches
    for (let batch = 0; batch < maxBatches; batch++) {
      console.log(`Processing batch ${batch + 1}/${maxBatches}`);

      let productItems: any[] = [];

      // Fetch data - for now, we only use the individual products API since it's working reliably
      try {
        const individualResponse = await fetchIndividualProducts({
          per_page: batchSize,
          region: country,
        });
        productItems = individualResponse.data;

        console.log(`Batch ${batch + 1}: Fetched ${productItems.length} items`);

        if (productItems.length === 0) {
          console.log(`No more items in batch ${batch + 1}, stopping`);
          break;
        }

        totalFetched += productItems.length;

        // Process products (unless in preview mode)
        if (!previewMode) {
          const { products, imagesUploaded, imagesFailed, skipped } = await processRapidAPIProducts(
            productItems
          );

          totalImagesUploaded += imagesUploaded;
          totalImagesFailed += imagesFailed;
          totalSkipped += skipped;

          // Store products in database
          const processedProductIds = new Set<string>();

          for (const product of products) {
            try {
              // Skip duplicates if requested
              if (skipDuplicates && processedProductIds.has(product.tiktokProductId)) {
                totalSkipped++;
                continue;
              }

              // Check if product already exists
              const existing = await getTikTokShopProductByTikTokId(product.tiktokProductId);

              // Handle different strategies
              if (strategy === 'fresh-only' && existing) {
                // Skip existing products for fresh-only strategy
                totalSkipped++;
                continue;
              }

              if (strategy === 'bulk-update' && !existing) {
                // Skip new products for bulk-update strategy (only update existing)
                totalSkipped++;
                continue;
              }

              // Create or update product
              await createTikTokShopProduct(product);
              processedProductIds.add(product.tiktokProductId);

              if (existing) {
                totalUpdated++;
              } else {
                totalCreated++;
              }
            } catch (error) {
              console.error(`Error storing product ${product.tiktokProductId}:`, error);
              totalErrors++;
            }
          }
        } else {
          // In preview mode, just count what would be processed
          console.log(`Preview mode: Would process ${productItems.length} items`);
        }

        // Small delay between batches to be respectful to the API
        if (batch < maxBatches - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

      } catch (error) {
        console.error(`Error in batch ${batch + 1}:`, error);
        totalErrors++;
      }
    }

    const duration = Date.now() - startTime;

    return NextResponse.json(
      {
        success: true,
        data: {
          fetched: totalFetched,
          created: totalCreated,
          updated: totalUpdated,
          errors: totalErrors,
          skipped: totalSkipped,
          imagesUploaded: totalImagesUploaded,
          imagesFailed: totalImagesFailed,
          strategy,
          duration,
        },
        message: previewMode
          ? `Preview: Would process ${totalFetched} products`
          : `Successfully processed ${totalFetched} products using ${strategy} strategy`,
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

    console.error('Error populating TikTok products:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Failed to populate TikTok products',
      },
      { status: 500 }
    );
  }
}