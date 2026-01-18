import { NextRequest, NextResponse } from 'next/server';
import { findStaleTikTokShopData, addToRefreshQueue, getTikTokShopProductByTikTokId } from '@/lib/db-queries';
import { tiktokShopVideos, tiktokShopLiveStreams, tiktokShopCreators } from '@/db/schema';
import { eq } from 'drizzle-orm';

// Lazy import to avoid database initialization during build
let db: any = null;
const getDb = async () => {
  if (!db) {
    const { db: dbInstance } = await import('@/db');
    db = dbInstance;
  }
  return db;
};

/**
 * Background job endpoint to identify and queue stale data (>24h old)
 * This should be called periodically (e.g., via cron job or scheduled task)
 * Can be triggered manually or automatically
 */
export async function POST(request: NextRequest) {
  try {
    const staleData = await findStaleTikTokShopData();
    
    const queuedItems = [];
    const errors = [];

    // Queue stale products
    for (const product of staleData.products) {
      try {
        // Calculate priority based on engagement
        const priority =
          (product.totalViews || 0) +
          (product.totalSales || 0) * 10 +
          (parseFloat(product.trendingScore || '0') || 0);

        const queueItem = await addToRefreshQueue({
          itemType: 'product',
          itemId: product.id,
          priority: Math.floor(priority),
        });
        
        queuedItems.push({
          type: 'product',
          id: product.id,
          queueId: queueItem.id,
        });
      } catch (error) {
        errors.push({
          type: 'product',
          id: product.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Queue stale videos
    for (const video of staleData.videos) {
      try {
        // Calculate priority based on engagement
        const priority = (video.views || 0) + (video.likes || 0) * 2 + (video.comments || 0) * 5;

        const queueItem = await addToRefreshQueue({
          itemType: 'video',
          itemId: video.id,
          priority: Math.floor(priority),
        });
        
        queuedItems.push({
          type: 'video',
          id: video.id,
          queueId: queueItem.id,
        });
      } catch (error) {
        errors.push({
          type: 'video',
          id: video.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Queue stale live streams
    for (const stream of staleData.liveStreams) {
      try {
        // Calculate priority based on engagement
        const priority =
          (stream.peakViewerCount || 0) +
          (stream.totalViewers || 0) +
          (stream.likes || 0) * 2;

        const queueItem = await addToRefreshQueue({
          itemType: 'live_stream',
          itemId: stream.id,
          priority: Math.floor(priority),
        });
        
        queuedItems.push({
          type: 'live_stream',
          id: stream.id,
          queueId: queueItem.id,
        });
      } catch (error) {
        errors.push({
          type: 'live_stream',
          id: stream.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Queue stale creators
    for (const creator of staleData.creators) {
      try {
        // Calculate priority based on follower count and engagement
        const priority =
          (creator.followerCount || 0) +
          (creator.averageViews || 0) / 1000 +
          (parseFloat(creator.engagementRate || '0') || 0) * 1000000;

        const queueItem = await addToRefreshQueue({
          itemType: 'creator',
          itemId: creator.id,
          priority: Math.floor(priority),
        });
        
        queuedItems.push({
          type: 'creator',
          id: creator.id,
          queueId: queueItem.id,
        });
      } catch (error) {
        errors.push({
          type: 'creator',
          id: creator.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Queued ${queuedItems.length} stale items for refresh`,
      data: {
        queued: queuedItems,
        errors: errors.length > 0 ? errors : undefined,
        summary: {
          products: staleData.products.length,
          videos: staleData.videos.length,
          liveStreams: staleData.liveStreams.length,
          creators: staleData.creators.length,
          queued: queuedItems.length,
          failed: errors.length,
        },
      },
    });
  } catch (error) {
    console.error('Error queueing stale data:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to queue stale data',
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check status without actually queueing
 */
export async function GET(request: NextRequest) {
  try {
    const staleData = await findStaleTikTokShopData();

    return NextResponse.json({
      success: true,
      data: {
        stale: {
          products: staleData.products.length,
          videos: staleData.videos.length,
          liveStreams: staleData.liveStreams.length,
          creators: staleData.creators.length,
        },
        total: {
          products: staleData.products.length,
          videos: staleData.videos.length,
          liveStreams: staleData.liveStreams.length,
          creators: staleData.creators.length,
        },
      },
      message: 'Use POST to queue these items for refresh',
    });
  } catch (error) {
    console.error('Error checking stale data:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to check stale data',
      },
      { status: 500 }
    );
  }
}
