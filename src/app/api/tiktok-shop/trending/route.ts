import { NextRequest, NextResponse } from 'next/server';
import { getTrendingProducts as getTrendingProductsFromLib, getRecommendedProducts } from '@/lib/tiktok-shop/recommendations';
import { z } from 'zod';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const category = searchParams.get('category') || undefined;
    const minTrendingScore = parseFloat(searchParams.get('minTrendingScore') || '10');
    const maxPrice = searchParams.get('maxPrice') ? parseFloat(searchParams.get('maxPrice')!) : undefined;
    const categories = searchParams.get('categories')?.split(',') || undefined;

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

    // Determine if we should use recommendations or simple trending
    const useRecommendations = categories || maxPrice !== undefined;

    let products;
    if (useRecommendations) {
      products = await getRecommendedProducts(limit, {
        categories,
        maxPrice,
        minTrendingScore,
      });
    } else {
      products = await getTrendingProductsFromLib(limit, category, minTrendingScore);
    }

    return NextResponse.json({
      success: true,
      data: products,
      count: products.length,
    });
  } catch (error) {
    console.error('Error fetching trending products:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to fetch trending products',
      },
      { status: 500 }
    );
  }
}
