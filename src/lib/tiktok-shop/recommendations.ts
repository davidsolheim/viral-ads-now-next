import { tiktokShopProducts } from '@/db/schema';
import { eq, desc, sql, gte } from 'drizzle-orm';

// Lazy import to avoid database initialization during build
let db: any = null;
const getDb = async () => {
  if (!db) {
    const { db: dbInstance } = await import('@/db');
    db = dbInstance;
  }
  return db;
};

export interface TrendingProduct {
  id: string;
  tiktokProductId: string;
  name: string;
  description: string | null;
  price: string | null;
  originalPrice: string | null;
  currency: string | null;
  tiktokShopUrl: string;
  sellerName: string | null;
  category: string | null;
  images: string[] | null;
  totalViews: number;
  totalSales: number;
  engagementRate: string | null;
  trendingScore: string | null;
  lastUpdated: Date;
}

/**
 * Calculate trending score for a product
 * Factors:
 * - Engagement rate (0.4 weight)
 * - Views growth (0.3 weight)
 * - Sales volume (0.2 weight)
 * - Recency (0.1 weight)
 */
function calculateTrendingScore(product: any): number {
  const engagementRate = parseFloat(product.engagementRate || '0');
  const views = product.totalViews || 0;
  const sales = product.totalSales || 0;
  
  // Normalize engagement rate (0-1 scale)
  const normalizedEngagement = Math.min(engagementRate, 1);
  
  // Normalize views (log scale for better distribution)
  const normalizedViews = Math.log10(views + 1) / 6; // Max ~10^6 views
  const normalizedViewsScore = Math.min(normalizedViews, 1);
  
  // Normalize sales (log scale)
  const normalizedSales = Math.log10(sales + 1) / 5; // Max ~10^5 sales
  const normalizedSalesScore = Math.min(normalizedSales, 1);
  
  // Recency score (how recent the data is)
  const lastUpdated = new Date(product.lastUpdated);
  const now = new Date();
  const hoursSinceUpdate = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60);
  const recencyScore = Math.max(0, 1 - hoursSinceUpdate / 24); // Full score if <1h, decreases over 24h
  
  // Weighted score
  const score =
    normalizedEngagement * 0.4 +
    normalizedViewsScore * 0.3 +
    normalizedSalesScore * 0.2 +
    recencyScore * 0.1;
  
  return score * 100; // Scale to 0-100
}

/**
 * Update trending scores for all products
 * Should be called periodically (e.g., via cron job)
 */
export async function updateTrendingScores() {
  const db = await getDb();
  
  // Get all products
  const products = await db.select().from(tiktokShopProducts);
  
  // Update trending scores
  for (const product of products) {
    const trendingScore = calculateTrendingScore(product).toFixed(2);
    
    await db
      .update(tiktokShopProducts)
      .set({
        trendingScore,
        updatedAt: new Date(),
      })
      .where(eq(tiktokShopProducts.id, product.id));
  }
}

/**
 * Get trending products for recommendations
 * @param limit - Maximum number of products to return
 * @param category - Optional category filter
 * @param minTrendingScore - Minimum trending score threshold
 */
export async function getTrendingProducts(
  limit: number = 20,
  category?: string,
  minTrendingScore: number = 10
): Promise<TrendingProduct[]> {
  const db = await getDb();
  
  // Build query
  let query = db
    .select()
    .from(tiktokShopProducts)
    .where(
      gte(
        sql`CAST(${tiktokShopProducts.trendingScore} AS DECIMAL)`,
        minTrendingScore.toString()
      )
    )
    .orderBy(desc(tiktokShopProducts.trendingScore))
    .limit(limit);
  
  if (category) {
    query = query.where(eq(tiktokShopProducts.category, category));
  }
  
  const products = await query;
  
  return products.map((product: any) => ({
    id: product.id,
    tiktokProductId: product.tiktokProductId,
    name: product.name,
    description: product.description,
    price: product.price,
    originalPrice: product.originalPrice,
    currency: product.currency,
    tiktokShopUrl: product.tiktokShopUrl,
    sellerName: product.sellerName,
    category: product.category,
    images: product.images as string[] | null,
    totalViews: product.totalViews || 0,
    totalSales: product.totalSales || 0,
    engagementRate: product.engagementRate,
    trendingScore: product.trendingScore,
    lastUpdated: product.lastUpdated,
  }));
}

/**
 * Get recommended products based on user preferences or trending
 * This is a simple implementation - can be enhanced with ML models
 */
export async function getRecommendedProducts(
  limit: number = 10,
  preferences?: {
    categories?: string[];
    maxPrice?: number;
    minTrendingScore?: number;
  }
): Promise<TrendingProduct[]> {
  const db = await getDb();
  
  const minScore = preferences?.minTrendingScore || 10;
  
  // Get trending products
  let products = await getTrendingProducts(limit * 2, undefined, minScore);
  
  // Filter by category if specified
  if (preferences?.categories && preferences.categories.length > 0) {
    products = products.filter((p) => p.category && preferences.categories!.includes(p.category));
  }
  
  // Filter by max price if specified
  if (preferences?.maxPrice) {
    products = products.filter((p) => {
      if (!p.price) return true;
      const price = parseFloat(p.price);
      return price <= preferences.maxPrice!;
    });
  }
  
  // Limit results
  return products.slice(0, limit);
}
