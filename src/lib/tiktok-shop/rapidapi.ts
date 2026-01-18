/**
 * RapidAPI TikTok Creative Center API Service
 * Fetches trending products data from RapidAPI and stores images in Wasabi
 */

import { uploadFromUrl } from '@/lib/services/wasabi';

const RAPIDAPI_BASE_URL = 'https://tiktok-creative-center-api.p.rapidapi.com';
const RAPIDAPI_HOST = 'tiktok-creative-center-api.p.rapidapi.com';

export interface RapidAPIFetchOptions {
  page?: number; // Page number for pagination
  last?: number; // Number of days to look back (e.g., 7)
  order_by?: string; // Order by field (e.g., "post", "views", "likes")
  order_type?: 'asc' | 'desc'; // Order direction
  country?: string; // Optional country filter (if supported)
  limit?: number; // Optional limit (if supported)
}

export interface RapidAPIProductItem {
  id?: string;
  productId?: string;
  name?: string;
  title?: string;
  description?: string;
  seller?: {
    name?: string;
    id?: string;
    username?: string;
  };
  advertiser?: {
    name?: string;
    id?: string;
    country?: string;
  };
  images?: string[];
  imageUrls?: string[];
  thumbnail?: string;
  cover_url?: string; // Category cover image
  productUrl?: string;
  shopUrl?: string;
  url_title?: string; // Category URL title (e.g., "Perfume", "T-Shirts")
  metrics?: {
    views?: number;
    likes?: number;
    comments?: number;
    shares?: number;
    saves?: number;
    sales?: number;
    engagement?: number;
    impression?: number; // API uses 'impression' instead of 'views'
    like?: number; // API uses 'like' instead of 'likes'
    comment?: number; // API uses 'comment' instead of 'comments'
    share?: number; // API uses 'share' instead of 'shares'
    post?: number; // Number of posts for this category
  };
  // Category hierarchy from API
  first_ecom_category?: {
    id?: string;
    label?: string;
    value?: string;
  };
  second_ecom_category?: {
    id?: string;
    label?: string;
    parent_id?: string;
    value?: string;
  };
  third_ecom_category?: {
    id?: string;
    label?: string;
    parent_id?: string;
    value?: string;
  };
  // Engagement metrics from API
  impression?: number;
  like?: number;
  comment?: number;
  share?: number;
  post?: number;
  post_change?: number;
  cpa?: number;
  ctr?: number;
  cvr?: number;
  play_six_rate?: number;
  cost?: number;
  ecom_type?: string;
  price?: string;
  originalPrice?: string;
  currency?: string;
  category?: string;
  tags?: string[];
  hashtags?: string[];
  rating?: number;
  reviewCount?: number;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any; // Allow additional fields
}

export interface RapidAPIResponse {
  code?: number;
  msg?: string;
  request_id?: string;
  data?: {
    list?: RapidAPIProductItem[]; // Actual API uses 'list'
    items?: RapidAPIProductItem[];
    products?: RapidAPIProductItem[];
    pagination?: {
      page?: number;
      pageSize?: number;
      hasMore?: boolean;
      cursor?: string;
      total?: number;
    };
  };
  status?: string;
  message?: string;
}

export interface ProcessedProduct {
  tiktokProductId: string;
  name: string;
  description?: string;
  price?: string;
  originalPrice?: string;
  currency?: string;
  tiktokShopUrl: string;
  sellerId?: string;
  sellerName?: string;
  category?: string;
  images: string[]; // Wasabi URLs
  totalViews?: number;
  totalSales?: number;
  engagementRate?: string;
  metadata: any;
}

/**
 * Fetch trending products from RapidAPI TikTok Creative Center API
 */
export async function fetchTrendingProducts(
  options: RapidAPIFetchOptions = {}
): Promise<RapidAPIResponse> {
  const apiKey = process.env.RAPID_API_KEY;
  if (!apiKey) {
    throw new Error('RAPID_API_KEY is not configured');
  }

  const {
    page = 1,
    last = 7,
    order_by = 'post',
    order_type = 'desc',
    country,
    limit,
  } = options;

  // Use the actual endpoint: /api/trending/top-products
  const url = new URL(`${RAPIDAPI_BASE_URL}/api/trending/top-products`);
  url.searchParams.set('page', page.toString());
  url.searchParams.set('last', last.toString());
  url.searchParams.set('order_by', order_by);
  url.searchParams.set('order_type', order_type);
  
  // Optional parameters
  if (country) {
    url.searchParams.set('country', country);
  }
  if (limit) {
    url.searchParams.set('limit', limit.toString());
  }

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': RAPIDAPI_HOST,
      },
    });

    if (!response.ok) {
      // Try to get error message from response body
      let errorMessage = `RapidAPI request failed: ${response.status} ${response.statusText}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
        console.error('RapidAPI error response:', errorData);
      } catch {
        // If response is not JSON, use status text
        const text = await response.text().catch(() => '');
        if (text) {
          console.error('RapidAPI error response (text):', text);
        }
      }
      
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        throw new Error(
          `Rate limit exceeded. Retry after ${retryAfter || 'some time'} seconds.`
        );
      }
      
      throw new Error(errorMessage);
    }

    const data: RapidAPIResponse = await response.json();
    
    // Log response structure for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log('RapidAPI raw response structure:', {
        code: data.code,
        msg: data.msg,
        hasData: !!data.data,
        hasList: !!data.data?.list,
        hasItems: !!data.data?.items,
        hasProducts: !!data.data?.products,
        isArray: Array.isArray(data.data),
        topLevelKeys: Object.keys(data),
        dataKeys: data.data ? Object.keys(data.data) : [],
        listCount: data.data?.list?.length || 0,
      });
    }
    
    return data;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to fetch trending products from RapidAPI');
  }
}

/**
 * Download and store images from RapidAPI URLs to Wasabi
 * Returns array of Wasabi URLs
 */
export async function downloadAndStoreImages(
  imageUrls: string[],
  productId: string
): Promise<{ wasabiUrls: string[]; failed: number }> {
  if (!imageUrls || imageUrls.length === 0) {
    return { wasabiUrls: [], failed: 0 };
  }

  const wasabiUrls: string[] = [];
  let failed = 0;

  // Process images in batches of 5 to avoid overwhelming Wasabi
  const batchSize = 5;
  for (let i = 0; i < imageUrls.length; i += batchSize) {
    const batch = imageUrls.slice(i, i + batchSize);
    
    const uploadPromises = batch.map(async (imageUrl, index) => {
      try {
        // Extract filename from URL or generate one
        const urlPath = new URL(imageUrl).pathname;
        const originalFileName = urlPath.split('/').pop() || `image-${i + index}.jpg`;
        const fileName = originalFileName.includes('.') 
          ? originalFileName 
          : `${originalFileName}.jpg`;

        const uploadResult = await uploadFromUrl(imageUrl, {
          folder: `tiktok-shop/products/${productId}/images/`,
          fileName,
          contentType: 'image/jpeg',
          metadata: {
            source: 'rapidapi_seed',
            originalUrl: imageUrl,
            productId: productId,
          },
          fetchHeaders: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
            'Referer': 'https://tiktok.com',
          },
        });

        return uploadResult.url;
      } catch (error) {
        console.error(`Failed to upload image ${imageUrl} for product ${productId}:`, error);
        failed++;
        return null;
      }
    });

    const results = await Promise.all(uploadPromises);
    wasabiUrls.push(...results.filter((url): url is string => url !== null));
  }

  return { wasabiUrls, failed };
}

/**
 * Extract image URLs from RapidAPI product item
 */
function extractImageUrls(item: RapidAPIProductItem): string[] {
  const imageUrls: string[] = [];

  // Extract from direct image fields (most common for products)
  if (item.images && Array.isArray(item.images)) {
    imageUrls.push(...item.images);
  }
  if (item.imageUrls && Array.isArray(item.imageUrls)) {
    imageUrls.push(...item.imageUrls);
  }
  if (item.thumbnail) {
    imageUrls.push(item.thumbnail);
  }
  
  // Category cover image (for category-based data)
  if (item.cover_url) {
    imageUrls.push(item.cover_url);
  }

  // Extract from creative object (fallback for ads-based responses)
  if (item.creative) {
    if (item.creative.thumbnail) {
      imageUrls.push(item.creative.thumbnail);
    }
    if (item.creative.imageUrl) {
      imageUrls.push(item.creative.imageUrl);
    }
    if (item.creative.url && item.creative.type === 'image') {
      imageUrls.push(item.creative.url);
    }
  }

  // Remove duplicates
  return [...new Set(imageUrls.filter(Boolean))];
}

/**
 * Extract TikTok product ID from RapidAPI response
 * For category-based data, generates a unique ID from category hierarchy
 */
function extractTikTokProductId(item: RapidAPIProductItem): string | null {
  // Try various fields that might contain the TikTok product ID
  const possibleIds = [
    item.productId,
    item.id,
    item.metadata?.productId,
    item.metadata?.tiktokProductId,
    item.metadata?.id,
    // Extract from product URL if available
    item.productUrl ? extractIdFromUrl(item.productUrl) : null,
    item.shopUrl ? extractIdFromUrl(item.shopUrl) : null,
  ].filter(Boolean) as string[];

  // Return the first valid ID found
  if (possibleIds.length > 0) {
    return possibleIds[0];
  }

  // For category-based data (trending categories), generate ID from category hierarchy
  // This creates a unique identifier based on the category structure
  const firstCatId = item.first_ecom_category?.id;
  const secondCatId = item.second_ecom_category?.id;
  const thirdCatId = item.third_ecom_category?.id;
  
  if (firstCatId || secondCatId || thirdCatId) {
    const categoryIds = [firstCatId, secondCatId, thirdCatId].filter(Boolean) as string[];
    
    if (categoryIds.length > 0) {
      // Create a unique ID from category hierarchy + url_title if available
      const baseId = categoryIds.join('_');
      const urlTitle = item.url_title ? `_${item.url_title.replace(/[^a-zA-Z0-9]/g, '-')}` : '';
      const generatedId = `category_${baseId}${urlTitle}`;
      
      if (process.env.NODE_ENV === 'development') {
        console.log('Generated category ID:', generatedId, 'from categories:', { firstCatId, secondCatId, thirdCatId, urlTitle: item.url_title });
      }
      
      return generatedId;
    }
  }

  // Last resort: use url_title if available (for category-based entries)
  if (item.url_title) {
    // Create a hash-based ID from url_title and category
    const categoryId = thirdCatId || secondCatId || firstCatId || 'unknown';
    const generatedId = `trending_${categoryId}_${item.url_title.replace(/[^a-zA-Z0-9]/g, '-')}`;
    
    if (process.env.NODE_ENV === 'development') {
      console.log('Generated trending ID from url_title:', generatedId);
    }
    
    return generatedId;
  }

  if (process.env.NODE_ENV === 'development') {
    console.warn('Could not generate product ID. Item structure:', {
      hasFirstCat: !!firstCatId,
      hasSecondCat: !!secondCatId,
      hasThirdCat: !!thirdCatId,
      hasUrlTitle: !!item.url_title,
      keys: Object.keys(item),
    });
  }

  return null;
}

/**
 * Extract product ID from TikTok Shop URL
 */
function extractIdFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    // Common patterns in TikTok Shop URLs:
    // - /product/{id}
    // - /shop/product/{id}
    // - ?product_id={id}
    // - /item/{id}
    
    const pathMatch = urlObj.pathname.match(/\/(?:product|item)\/([^\/\?]+)/);
    if (pathMatch) {
      return pathMatch[1];
    }

    const queryMatch = urlObj.searchParams.get('product_id') || urlObj.searchParams.get('id');
    if (queryMatch) {
      return queryMatch;
    }

    // Try to extract any numeric/alphanumeric ID from path
    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    const lastPart = pathParts[pathParts.length - 1];
    if (lastPart && /^[a-zA-Z0-9_-]+$/.test(lastPart) && lastPart.length > 5) {
      return lastPart;
    }
  } catch {
    // Invalid URL, return null
  }

  return null;
}

/**
 * Map RapidAPI product item to product data structure
 * This function processes the product and downloads images to Wasabi
 */
export async function mapRapidAPIResponseToProduct(
  item: RapidAPIProductItem
): Promise<ProcessedProduct | null> {
  // Extract TikTok product ID - this is critical for duplicate prevention
  const tiktokProductId = extractTikTokProductId(item);
  
  // If we can't find a valid TikTok product ID, skip this product
  if (!tiktokProductId) {
    console.warn('Skipping product - no valid TikTok product ID found:', item);
    return null;
  }

  // Extract image URLs from the product item
  const originalImageUrls = extractImageUrls(item);

  // Download and store images in Wasabi
  const { wasabiUrls, failed } = await downloadAndStoreImages(originalImageUrls, tiktokProductId);

  // Calculate engagement rate
  // Handle both metrics object and direct fields (API uses direct fields)
  const views = item.metrics?.views || item.metrics?.impression || item.impression || 0;
  const likes = item.metrics?.likes || item.metrics?.like || item.like || 0;
  const comments = item.metrics?.comments || item.metrics?.comment || item.comment || 0;
  const shares = item.metrics?.shares || item.metrics?.share || item.share || 0;
  const engagementRate = views > 0 
    ? ((likes + comments + shares) / views).toFixed(4)
    : '0';

  // Extract price if available
  let price: string | undefined;
  let originalPrice: string | undefined;
  let currency = item.currency || 'USD';
  
  if (item.price) {
    // If price is already a string with currency, parse it
    if (typeof item.price === 'string') {
      const priceMatch = item.price.match(/([\d,]+\.?\d*)/);
      if (priceMatch) {
        price = priceMatch[1].replace(/,/g, '');
      }
      // Try to extract currency
      const currencyMatch = item.price.match(/[A-Z]{3}/);
      if (currencyMatch) {
        currency = currencyMatch[0];
      }
    } else {
      price = item.price.toString();
    }
  }
  
  if (item.originalPrice) {
    if (typeof item.originalPrice === 'string') {
      const priceMatch = item.originalPrice.match(/([\d,]+\.?\d*)/);
      if (priceMatch) {
        originalPrice = priceMatch[1].replace(/,/g, '');
      }
    } else {
      originalPrice = item.originalPrice.toString();
    }
  }

  // Build TikTok Shop URL
  // For category-based data, create a search URL
  const categoryName = item.url_title || item.third_ecom_category?.value || item.second_ecom_category?.value || item.first_ecom_category?.value;
  const tiktokShopUrl = item.productUrl || 
    item.shopUrl || 
    item.creative?.url || 
    (categoryName 
      ? `https://www.tiktok.com/shop/search?q=${encodeURIComponent(categoryName)}`
      : `https://www.tiktok.com/shop/product/${tiktokProductId}`);

  // Store original image URLs in metadata for reference
  const metadata = {
    ...item,
    originalImageUrls,
    imageUploadFailed: failed,
    rapidapiSource: true,
    fetchedAt: new Date().toISOString(),
  };

  // Determine product name - use category name for category-based data
  const productName = item.name || 
    item.title || 
    item.third_ecom_category?.value || 
    item.second_ecom_category?.value || 
    item.first_ecom_category?.value ||
    item.url_title ||
    item.description || 
    'Untitled Product';

  // Determine category - use the most specific category
  const productCategory = item.third_ecom_category?.value || 
    item.second_ecom_category?.value || 
    item.first_ecom_category?.value ||
    item.category || 
    item.tags?.[0] || 
    undefined;

  // For category-based data, use post count as a proxy for "sales" (number of product posts)
  const sales = item.metrics?.sales || item.post || 0;

  return {
    tiktokProductId,
    name: productName,
    description: item.description || `Trending ${productCategory || 'product'} category with ${sales} posts`,
    price,
    originalPrice,
    currency,
    tiktokShopUrl,
    sellerId: item.seller?.id || item.advertiser?.id,
    sellerName: item.seller?.name || item.advertiser?.name,
    category: productCategory,
    images: wasabiUrls, // Store Wasabi URLs
    totalViews: views,
    totalSales: sales,
    engagementRate,
    metadata,
  };
}

/**
 * Process multiple RapidAPI product items into products
 */
export async function processRapidAPIProducts(
  items: RapidAPIProductItem[]
): Promise<{
  products: ProcessedProduct[];
  imagesUploaded: number;
  imagesFailed: number;
  skipped: number;
}> {
  const products: ProcessedProduct[] = [];
  let totalImagesUploaded = 0;
  let totalImagesFailed = 0;
  let skipped = 0;

  for (const item of items) {
    try {
      const product = await mapRapidAPIResponseToProduct(item);
      
      // Skip if product ID extraction failed
      if (!product) {
        skipped++;
        continue;
      }
      
      products.push(product);
      
      // Count images
      totalImagesUploaded += product.images.length;
      const failed = product.metadata?.imageUploadFailed || 0;
      totalImagesFailed += failed;
    } catch (error) {
      console.error('Error processing RapidAPI product item:', error);
      skipped++;
      // Continue processing other items
    }
  }

  return {
    products,
    imagesUploaded: totalImagesUploaded,
    imagesFailed: totalImagesFailed,
    skipped,
  };
}

// Deprecated: Use fetchTrendingProducts instead
/** @deprecated Use fetchTrendingProducts instead */
export const fetchTrendingAds = fetchTrendingProducts;

// Deprecated: Use processRapidAPIProducts instead
/** @deprecated Use processRapidAPIProducts instead */
export const processRapidAPIAds = processRapidAPIProducts;
