import { NextRequest, NextResponse } from 'next/server';
import { markItemRefreshed } from '@/lib/db-queries';
import { z } from 'zod';

const refreshSchema = z.object({
  queueId: z.string().min(1),
  itemType: z.enum(['product', 'video', 'live_stream', 'creator']),
  itemId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = refreshSchema.parse(body);

    const queueItem = await markItemRefreshed(
      validated.queueId,
      validated.itemType,
      validated.itemId
    );

    if (!queueItem) {
      return NextResponse.json(
        {
          error: 'Queue item not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: queueItem,
      message: 'Item marked as refreshed successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    console.error('Error marking item as refreshed:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to mark item as refreshed',
      },
      { status: 500 }
    );
  }
}
