import { NextRequest, NextResponse } from 'next/server';
import { getRefreshQueueItems } from '@/lib/db-queries';
import { z } from 'zod';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    // Validate limit
    if (limit < 1 || limit > 100) {
      return NextResponse.json(
        {
          error: 'Invalid limit',
          message: 'Limit must be between 1 and 100',
        },
        { status: 400 }
      );
    }

    const queueItems = await getRefreshQueueItems(limit);

    return NextResponse.json({
      success: true,
      data: queueItems,
      count: queueItems.length,
    });
  } catch (error) {
    console.error('Error fetching refresh queue:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to fetch refresh queue',
      },
      { status: 500 }
    );
  }
}
