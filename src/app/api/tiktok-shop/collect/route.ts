import { NextRequest, NextResponse } from 'next/server';
import { rateLimit as checkRateLimit, getRateLimitHeaders } from '@/lib/middleware/rate-limit';
import {
  createTikTokShopProduct,
  getTikTokShopProductByTikTokId,
  addToRefreshQueue,
} from '@/lib/db-queries';
import { z } from 'zod';

const collectProductSchema = z.object({
  type: z.literal('product'),
  data: z.object({
    tiktokProductId: z.string().min(1),
    name: z.string().min(1),
    description: z.string().optional(),
    price: z.string().optional(),
    originalPrice: z.string().optional(),
    currency: z.string().optional(),
    tiktokShopUrl: z.string().url(),
    sellerId: z.string().optional(),
    sellerName: z.string().optional(),
    category: z.string().optional(),
    images: z.array(z.string().url()).optional(),
    totalViews: z.number().int().nonnegative().optional(),
    totalSales: z.number().int().nonnegative().optional(),
    engagementRate: z.string().optional(),
    averageRating: z.union([z.string(), z.number()]).optional(),
    totalReviews: z.number().int().nonnegative().optional(),
    ratingDistribution: z.record(z.string(), z.number()).optional(),
    metadata: z.record(z.string(), z.any()).optional(),
  }),
});

const collectVideoSchema = z.object({
  type: z.literal('video'),
  data: z.object({
    tiktokVideoId: z.string().min(1),
    url: z.string().url(),
    thumbnailUrl: z.string().url().optional(),
    productIds: z.array(z.string()).optional(),
    creatorId: z.string().optional(),
    creatorUsername: z.string().optional(),
    views: z.number().int().nonnegative().optional(),
    likes: z.number().int().nonnegative().optional(),
    comments: z.number().int().nonnegative().optional(),
    shares: z.number().int().nonnegative().optional(),
    saves: z.number().int().nonnegative().optional(),
    postedAt: z.string().datetime().optional(),
    description: z.string().optional(),
    hashtags: z.array(z.string()).optional(),
    metadata: z.record(z.string(), z.any()).optional(),
  }),
});

const collectLiveStreamSchema = z.object({
  type: z.literal('live_stream'),
  data: z.object({
    tiktokStreamId: z.string().min(1),
    url: z.string().url().optional(),
    productIds: z.array(z.string()).optional(),
    creatorId: z.string().optional(),
    creatorUsername: z.string().optional(),
    peakViewerCount: z.number().int().nonnegative().optional(),
    totalViewers: z.number().int().nonnegative().optional(),
    likes: z.number().int().nonnegative().optional(),
    comments: z.number().int().nonnegative().optional(),
    shares: z.number().int().nonnegative().optional(),
    startTime: z.string().datetime().optional(),
    endTime: z.string().datetime().optional(),
    durationSeconds: z.number().int().nonnegative().optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    metadata: z.record(z.string(), z.any()).optional(),
  }),
});

const collectCreatorSchema = z.object({
  type: z.literal('creator'),
  data: z.object({
    tiktokCreatorId: z.string().min(1),
    username: z.string().min(1),
    displayName: z.string().optional(),
    profileImageUrl: z.string().url().optional(),
    profileUrl: z.string().url().optional(),
    followerCount: z.number().int().nonnegative().optional(),
    followingCount: z.number().int().nonnegative().optional(),
    videoCount: z.number().int().nonnegative().optional(),
    likesCount: z.number().int().nonnegative().optional(),
    averageViews: z.number().int().nonnegative().optional(),
    engagementRate: z.string().optional(),
    promotedProductCategories: z.array(z.string()).optional(),
    topProductIds: z.array(z.string()).optional(),
    bio: z.string().optional(),
    metadata: z.record(z.string(), z.any()).optional(),
  }),
});

const collectSchema = z.discriminatedUnion('type', [
  collectProductSchema,
  collectVideoSchema,
  collectLiveStreamSchema,
  collectCreatorSchema,
]);

export async function POST(request: NextRequest) {
  try {
    // Rate limit check (1 request per minute per client)
    const rateLimitResult = checkRateLimit(request, 1, 60 * 1000);

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

    const body = await request.json();
    const validated = collectSchema.parse(body);

    // Handle different data types
    switch (validated.type) {
      case 'product': {
        const product = await createTikTokShopProduct(validated.data);

        // Check if product is older than 24 hours and add to queue if needed
        const existing = await getTikTokShopProductByTikTokId(validated.data.tiktokProductId);
        if (existing) {
          const lastUpdated = new Date(existing.lastUpdated);
          const now = new Date();
          const hoursSinceUpdate = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60);

          // If older than 24 hours, add to refresh queue (but only if this is an update)
          if (hoursSinceUpdate > 24) {
            await addToRefreshQueue({
              itemType: 'product',
              itemId: product.id,
              priority: Math.floor(existing.totalViews || 0) + (existing.totalSales || 0) * 10, // Higher priority for popular products
            });
          }
        }

        return NextResponse.json(
          {
            success: true,
            data: product,
            message: 'Product data collected successfully',
          },
          {
            status: 200,
            headers: rateLimitResult ? getRateLimitHeaders(rateLimitResult) : {},
          }
        );
      }

      case 'video':
      case 'live_stream':
      case 'creator':
        // TODO: Implement video, live_stream, and creator collection
        // For now, return success
        return NextResponse.json(
          {
            success: true,
            message: `${validated.type} data received (not yet fully implemented)`,
          },
          {
            status: 200,
            headers: rateLimitResult ? getRateLimitHeaders(rateLimitResult) : {},
          }
        );

      default:
        return NextResponse.json(
          { error: 'Invalid data type' },
          {
            status: 400,
            headers: rateLimitResult ? getRateLimitHeaders(rateLimitResult) : {},
          }
        );
    }
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

    console.error('Error collecting TikTok Shop data:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to collect TikTok Shop data',
      },
      { status: 500 }
    );
  }
}
