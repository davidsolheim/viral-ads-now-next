/**
 * TikTok Shop RapidAPI Integration - Clean Implementation
 * Supports both category trends and individual products APIs
 */

// Base URLs for different APIs
const CATEGORY_API_BASE_URL = 'https://tiktok-creative-center-api.p.rapidapi.com';
const PRODUCTS_API_BASE_URL = 'https://tiktok-shop-analysis.p.rapidapi.com';

// Use the products API host for now since we're prioritizing individual products
const RAPIDAPI_HOST = 'tiktok-shop-analysis.p.rapidapi.com';

// For now, we'll only use the products API since the category API endpoint seems to be unavailable
// const CATEGORY_API_BASE_URL = PRODUCTS_API_BASE_URL;

export interface RapidAPIFetchOptions {
  page?: number;
  last?: number;
  order_by?: string;
  order_type?: 'asc' | 'desc';
  country?: string;
  limit?: number;
}

export interface RapidAPIResponse {
  status?: number;
  code?: number;
  msg?: string;
  data?: {
    list?: RapidAPIProductItem[];
    items?: RapidAPIProductItem[];
    products?: RapidAPIProductItem[];
    pagination?: any;
  } | RapidAPIProductItem[];
}

// Union type to handle both category data and individual product data
export type RapidAPIProductItem =
  // Individual product data (from products API)
  | {
      product_id: string;
      product_name: string;
      product_name_slug: string;
      product_trans1?: string;
      product_trans2?: string;
      cover_url: string;
      category: string;
      categories: string[];
      region: string;
      real_price: string;
      avg_price: string;
      min_price: string;
      max_price: string;
      avg_price_fz: string;
      min_price_fz: string;
      max_price_fz: string;
      sale_props?: Array<{
        prop_name: string;
        has_image: boolean;
        prop_id: string;
        sale_prop_values: Array<{
          image?: string;
          prop_value_id: string;
          prop_value: string;
        }>;
      }>;
      skus: Record<string, {
        sku_id: string;
        sale_prop_value_ids: string;
        real_price: {
          price_str: string;
          price_val: string;
          currency: string;
          original_price?: string;
          price_format: string;
        };
        stock: number;
      }>;
      specs_count: number;
      seller: {
        seller_id: string;
        seller_name: string;
        cover_url: string;
        total_sale_cnt: string;
        total_sale_gmv_amt: string;
        total_sale_gmv_amt_fz: string;
      };
      commission: string;
      product_rating: string;
      review_count: string;
      influencers_count: number;
      total_video_cnt: number;
      total_video_sale_cnt: number;
      sale_cnt: number;
      total_sale_cnt: string;
      total_gmv_amt: string;
      total_sale_gmv_amt: string;
      total_gmv_amt_fz: string;
      total_sale_gmv_amt_fz: string;
      conversion_rate: string;
      collect_status: {
        id: number;
        name: string;
        key: string;
      };
      is_s_shop: number;
      is_mall_recommended: number;
    }
  // Category trend data (from category API)
  | {
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
      cover_url?: string;
      productUrl?: string;
      shopUrl?: string;
      url_title?: string;
      metrics?: {
        views?: number;
        likes?: number;
        comments?: number;
        shares?: number;
        saves?: number;
        sales?: number;
        engagement?: number;
        impression?: number;
        like?: number;
        comment?: number;
        share?: number;
        post?: number;
      };
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
      [key: string]: any;
    };

export interface ProcessedProduct {
  tiktokProductId: string;
  name: string;
  description?: string;
  price?: string;
  originalPrice?: string;
  currency: string;
  tiktokShopUrl: string;
  sellerId?: string;
  sellerName?: string;
  category?: string;
  images: string[];
  totalViews: number;
  totalSales: number;
  engagementRate: string;
  averageRating?: number;
  totalReviews?: number;
  metadata: any;
}

/**
 * Fetch individual products from RapidAPI TikTok Shop Analysis API
 */
export async function fetchIndividualProducts(
  options: {
    per_page?: number;
    region?: string;
  } = {}
): Promise<{
  status: number;
  data: RapidAPIProductItem[];
}> {
  const apiKey = process.env.RAPID_API_KEY;
  if (!apiKey) {
    throw new Error('RAPID_API_KEY is not configured');
  }

  const { per_page = 20, region = 'US' } = options;

  // Use the individual products endpoint
  const url = new URL(`${PRODUCTS_API_BASE_URL}/product/top/trending`);
  url.searchParams.set('per_page', per_page.toString());
  url.searchParams.set('region', region);

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': RAPIDAPI_HOST,
      },
    });

    if (!response.ok) {
      let errorMessage = `RapidAPI request failed: ${response.status} ${response.statusText}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch {
        const text = await response.text().catch(() => '');
        if (text) {
          console.error('RapidAPI error response (text):', text);
        }
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();

    // Transform to consistent format
    return {
      status: data.status || 200,
      data: data.data || [],
    };

  } catch (error) {
    console.error('Error fetching individual products:', error);
    throw error;
  }
}

/**
 * Fetch trending categories from RapidAPI TikTok Creative Center API
 */
export async function fetchTrendingCategories(
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

  // Use the category trending endpoint
  const url = new URL(`${CATEGORY_API_BASE_URL}/api/trending/top-products`);
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
      let errorMessage = `RapidAPI request failed: ${response.status} ${response.statusText}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch {
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
    return data;

  } catch (error) {
    console.error('Error fetching trending categories:', error);
    throw error;
  }
}

/**
 * Fetch trending products using both category trends and individual products APIs
 * This combines trending category signals with actual product data
 */
export async function fetchTrendingProducts(
  options: RapidAPIFetchOptions = {}
): Promise<RapidAPIResponse> {
  try {
    // For now, prioritize individual products API since it gives us actual product data
    // In the future, we could use category trends to filter or rank the individual products
    const individualProductsResponse = await fetchIndividualProducts({
      per_page: options.limit || 20,
      region: options.country || 'US',
    });

    // Transform individual products response to match expected format
    return {
      status: individualProductsResponse.status,
      data: {
        list: individualProductsResponse.data,
        items: individualProductsResponse.data,
        products: individualProductsResponse.data,
      },
    };

  } catch (error) {
    console.error('Error in combined trending products fetch:', error);

    // Fallback to category API if individual products fail
    console.log('Falling back to category trends API...');
    return await fetchTrendingCategories(options);
  }
}

/**
 * Process RapidAPI product item into our standardized format
 */
export async function mapRapidAPIResponseToProduct(
  item: RapidAPIProductItem
): Promise<ProcessedProduct | null> {
  // Check if this is individual product data (has product_id) or category data
  const isIndividualProduct = 'product_id' in item;

  if (isIndividualProduct) {
    // Process individual product data
    const productItem = item as Extract<RapidAPIProductItem, { product_id: string }>;
    return await processIndividualProduct(productItem);
  } else {
    // Process category trend data
    const categoryItem = item as Extract<RapidAPIProductItem, { url_title?: string }>;
    return await processCategoryTrend(categoryItem);
  }
}

async function processIndividualProduct(
  item: Extract<RapidAPIProductItem, { product_id: string }>
): Promise<ProcessedProduct | null> {
  const tiktokProductId = item.product_id;

  if (!tiktokProductId) {
    console.warn('Skipping product - no product ID found:', item);
    return null;
  }

  // Extract image URLs (mainly cover_url for now)
  const originalImageUrls = [item.cover_url].filter(Boolean);

  // Download and store images in Wasabi
  const { wasabiUrls, failed } = await downloadAndStoreImages(originalImageUrls, tiktokProductId);

  // Calculate engagement metrics from available data
  const totalVideos = item.total_video_cnt || 0;
  const totalSales = parseInt(item.total_sale_cnt.replace(/,/g, '')) || 0;
  const totalVideoSales = item.total_video_sale_cnt || 0;

  // Use video count as a proxy for engagement/views
  const totalViews = totalVideos * 1000; // Rough estimate
  const engagementRate = totalSales > 0 && totalViews > 0
    ? (totalVideoSales / totalViews).toFixed(4)
    : '0';

  // Build TikTok Shop product URL
  const tiktokShopUrl = `https://shop.tiktok.com/product/${tiktokProductId}`;

  // Parse pricing information - handle API quirks with "?" characters
  let price: string | undefined;

  // Try to extract clean price from real_price first
  const realPriceMatch = item.real_price?.match(/\$?([\d,]+\.?\d*)/);
  if (realPriceMatch && realPriceMatch[1] && !realPriceMatch[1].includes('?')) {
    price = parseFloat(realPriceMatch[1].replace(/,/g, '')).toFixed(2);
  }

  // Fallback to avg_price if real_price is malformed
  if (!price && item.avg_price) {
    const avgPriceMatch = item.avg_price.match(/\$?([\d,]+\.?\d*)/);
    if (avgPriceMatch && avgPriceMatch[1] && !avgPriceMatch[1].includes('?')) {
      price = parseFloat(avgPriceMatch[1].replace(/,/g, '')).toFixed(2);
    }
  }

  // Last resort: try to get price from first SKU
  if (!price && item.skus) {
    const firstSkuKey = Object.keys(item.skus)[0];
    const firstSku = item.skus[firstSkuKey];
    if (firstSku?.real_price?.price_val && !firstSku.real_price.price_val.includes('?')) {
      const skuPriceMatch = firstSku.real_price.price_val.match(/([\d,]+\.?\d*)/);
      if (skuPriceMatch) {
        price = parseFloat(skuPriceMatch[1].replace(/,/g, '')).toFixed(2);
      }
    }
  }

  // Store original data in metadata
  const metadata = {
    ...item,
    originalImageUrls,
    imageUploadFailed: failed,
    rapidapiSource: true,
    isIndividualProduct: true,
    fetchedAt: new Date().toISOString(),
  };

  return {
    tiktokProductId,
    name: item.product_name,
    description: item.product_trans1 || item.product_name,
    price,
    originalPrice: undefined,
    currency: 'USD',
    tiktokShopUrl,
    sellerId: item.seller.seller_id,
    sellerName: item.seller.seller_name,
    category: item.category,
    images: wasabiUrls,
    totalViews,
    totalSales,
    engagementRate,
    averageRating: item.product_rating ? parseFloat(item.product_rating) : undefined,
    totalReviews: item.review_count ? parseInt(item.review_count.replace(/,/g, '')) : 0,
    metadata,
  };
}

async function processCategoryTrend(
  item: Extract<RapidAPIProductItem, { url_title?: string }>
): Promise<ProcessedProduct | null> {
  // Extract TikTok product ID - generate unique ID from category hierarchy
  const tiktokProductId = extractTikTokProductId(item);

  if (!tiktokProductId) {
    console.warn('Could not generate product ID for category trend:', item);
    return null;
  }

  // Extract image URLs from the category item
  const originalImageUrls = extractImageUrls(item);

  // Download and store images in Wasabi
  const { wasabiUrls, failed } = await downloadAndStoreImages(originalImageUrls, tiktokProductId);

  // Calculate engagement rate from category metrics
  const views = item.impression || 0;
  const likes = item.like || 0;
  const comments = item.comment || 0;
  const shares = item.share || 0;
  const engagementRate = views > 0
    ? ((likes + comments + shares) / views).toFixed(4)
    : '0';

  // Build TikTok Shop URL for category search
  const categoryName = item.url_title || item.third_ecom_category?.value || item.second_ecom_category?.value || item.first_ecom_category?.value;
  const tiktokShopUrl = categoryName
    ? `https://shop.tiktok.com/s?q=${encodeURIComponent(categoryName)}`
    : 'https://shop.tiktok.com';

  // Parse pricing information (category data might not have prices)
  const priceMatch = item.price?.match(/\$?([\d,]+\.?\d*)/);
  const price = priceMatch ? priceMatch[1].replace(/,/g, '') : undefined;

  // Store original data in metadata
  const metadata = {
    ...item,
    originalImageUrls,
    imageUploadFailed: failed,
    rapidapiSource: true,
    isCategoryTrend: true,
    fetchedAt: new Date().toISOString(),
  };

  // Determine product name - use category hierarchy
  const productName = item.third_ecom_category?.value ||
    item.second_ecom_category?.value ||
    item.first_ecom_category?.value ||
    item.url_title ||
    'Trending Category';

  // Determine category
  const productCategory = item.third_ecom_category?.value ||
    item.second_ecom_category?.value ||
    item.first_ecom_category?.value ||
    undefined;

  // Use post count as sales proxy for trending categories
  const sales = item.post || 0;

  return {
    tiktokProductId,
    name: `Trending: ${productName}`,
    description: `Trending ${productCategory || 'category'} with ${sales} posts, ${views.toLocaleString()} views, and ${(parseFloat(engagementRate) * 100).toFixed(1)}% engagement rate`,
    price,
    originalPrice: undefined,
    currency: 'USD',
    tiktokShopUrl,
    sellerId: undefined,
    sellerName: 'TikTok Shop Trends',
    category: productCategory,
    images: wasabiUrls,
    totalViews: views,
    totalSales: sales,
    engagementRate,
    metadata,
  };
}

/**
 * Extract TikTok product ID from RapidAPI response
 */
function extractTikTokProductId(item: RapidAPIProductItem): string | null {
  // The new API provides product_id directly
  return item.product_id || null;
}

/**
 * Extract image URLs from RapidAPI product item
 */
function extractImageUrls(item: RapidAPIProductItem): string[] {
  const imageUrls: string[] = [];

  // Primary image: cover_url (main product image)
  if (item.cover_url) {
    imageUrls.push(item.cover_url);
  }

  // Extract from sale props (variant images)
  if ('sale_props' in item && item.sale_props && Array.isArray(item.sale_props)) {
    item.sale_props.forEach(prop => {
      if (prop.sale_prop_values && Array.isArray(prop.sale_prop_values)) {
        prop.sale_prop_values.forEach((value: { image?: string }) => {
          if (value.image && value.image !== '') {
            imageUrls.push(value.image);
          }
        });
      }
    });
  }

  // Seller cover image as fallback
  if ('seller' in item && item.seller && 'cover_url' in item.seller && item.seller.cover_url) {
    imageUrls.push(item.seller.cover_url);
  }

  // Remove duplicates and filter out empty/invalid URLs
  return [...new Set(imageUrls)]
    .filter(url => url && typeof url === 'string' && url.trim() !== '')
    .filter(url => {
      try {
        new URL(url);
        return true;
      } catch {
        return false;
      }
    });
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

        // Generate unique filename
        const fileExtension = originalFileName.split('.').pop() || 'jpg';
        const uniqueFileName = `${productId}_${i + index}.${fileExtension}`;

        // Download and upload to Wasabi
        const { uploadFromUrl } = await import('@/lib/services/wasabi');
        const wasabiUrl = await uploadFromUrl(imageUrl, { fileName: `tiktok-shop/products/${productId}/images/${uniqueFileName}` });

        if (wasabiUrl) {
          wasabiUrls.push(wasabiUrl.url);
        } else {
          failed++;
        }
      } catch (error) {
        console.error(`Failed to upload image ${imageUrl}:`, error);
        failed++;
      }
    });

    // Wait for batch to complete
    await Promise.allSettled(uploadPromises);

    // Small delay between batches
    if (i + batchSize < imageUrls.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return { wasabiUrls, failed };
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

      // Skip if processing failed
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