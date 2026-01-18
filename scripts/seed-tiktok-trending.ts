/**
 * Seed TikTok Trending Products from RapidAPI
 * 
 * This script fetches trending ads from RapidAPI TikTok Creative Center API
 * and populates the database with product data and images stored in Wasabi.
 * 
 * Usage:
 *   bun run scripts/seed-tiktok-trending.ts
 * 
 * Environment variables required:
 *   - RAPID_API_KEY
 *   - DATABASE_URL
 *   - WASABI_ACCESS_KEY_ID
 *   - WASABI_SECRET_ACCESS_KEY
 *   - WASABI_BUCKET_NAME
 *   - WASABI_ENDPOINT
 */

import { config } from 'dotenv';
import { fetchTrendingProducts, processRapidAPIProducts, type RapidAPIFetchOptions } from '../src/lib/tiktok-shop/rapidapi';
import { createTikTokShopProduct, getTikTokShopProductByTikTokId } from '../src/lib/db-queries';

// Load environment variables
config({ path: '.env.local' });

interface SeedOptions {
  page?: number;
  last?: number;
  order_by?: string;
  order_type?: 'asc' | 'desc';
  country?: string;
  limit?: number;
  maxPages?: number;
}

async function seedTikTokTrending(options: SeedOptions = {}) {
  const {
    page: startPage = 1,
    last = 7,
    order_by = 'post',
    order_type = 'desc',
    country,
    limit,
    maxPages = 5,
  } = options;

  console.log('🚀 Starting TikTok trending products seed...');
  console.log(`   Page: ${startPage}`);
  console.log(`   Last: ${last} days`);
  console.log(`   Order by: ${order_by} (${order_type})`);
  if (country) console.log(`   Country: ${country}`);
  if (limit) console.log(`   Limit: ${limit}`);
  console.log(`   Max pages: ${maxPages}`);
  console.log('');

  // Validate environment variables
  if (!process.env.RAPID_API_KEY) {
    console.error('❌ Error: RAPID_API_KEY is not configured');
    process.exit(1);
  }

  if (!process.env.DATABASE_URL) {
    console.error('❌ Error: DATABASE_URL is not configured');
    process.exit(1);
  }

  if (!process.env.WASABI_ACCESS_KEY_ID || !process.env.WASABI_SECRET_ACCESS_KEY) {
    console.error('❌ Error: Wasabi credentials are not configured');
    process.exit(1);
  }

  let totalFetched = 0;
  let totalCreated = 0;
  let totalUpdated = 0;
  let totalErrors = 0;
  let totalSkipped = 0;
  let totalImagesUploaded = 0;
  let totalImagesFailed = 0;

  try {
    for (let page = startPage; page < startPage + maxPages; page++) {
      console.log(`📄 Fetching page ${page}...`);

      const fetchOptions: RapidAPIFetchOptions = {
        page,
        last,
        order_by,
        order_type,
        country,
        limit,
      };

      // Fetch trending products from RapidAPI
      const rapidAPIResponse = await fetchTrendingProducts(fetchOptions);

      // Handle both 'items' and 'products' response formats
      const productItems = rapidAPIResponse.data?.items || rapidAPIResponse.data?.products || [];

      if (productItems.length === 0) {
        console.log(`   No more items found on page ${page}. Stopping.`);
        break;
      }

      console.log(`   Found ${productItems.length} products`);

      // Process products and download images to Wasabi
      console.log(`   Processing products and uploading images to Wasabi...`);
      const { products, imagesUploaded, imagesFailed, skipped } = await processRapidAPIProducts(
        productItems
      );

      totalFetched += productItems.length;
      totalImagesUploaded += imagesUploaded;
      totalImagesFailed += imagesFailed;
      totalSkipped += skipped;

      console.log(`   ✅ Processed ${products.length} products`);
      if (skipped > 0) {
        console.log(`   ⚠️  Skipped ${skipped} products (missing product ID or duplicates)`);
      }
      console.log(`   📸 Uploaded ${imagesUploaded} images (${imagesFailed} failed)`);

      // Store products in database
      // Note: createTikTokShopProduct uses onConflictDoUpdate, so duplicates are automatically handled
      console.log(`   💾 Storing products in database...`);
      const processedProductIds = new Set<string>(); // Track processed IDs to avoid duplicates in batch
      
      for (const product of products) {
        try {
          // Skip if we've already processed this product ID in this batch
          if (processedProductIds.has(product.tiktokProductId)) {
            console.warn(`      ⚠️  Skipping duplicate product ID in batch: ${product.tiktokProductId}`);
            totalSkipped++;
            continue;
          }

          // Check if product already exists in database
          const existing = await getTikTokShopProductByTikTokId(product.tiktokProductId);

          // createTikTokShopProduct will update if tiktokProductId already exists (upsert)
          await createTikTokShopProduct(product);
          
          // Mark as processed
          processedProductIds.add(product.tiktokProductId);

          if (existing) {
            totalUpdated++;
            console.log(`      ✓ Updated: ${product.name}`);
          } else {
            totalCreated++;
            console.log(`      ✓ Created: ${product.name}`);
          }
        } catch (error) {
          totalErrors++;
          console.error(`      ✗ Error storing ${product.name}:`, error instanceof Error ? error.message : error);
        }
      }

      console.log('');

      // Check if there are more pages
      if (!rapidAPIResponse.data.pagination?.hasMore) {
        console.log('   No more pages available. Stopping.');
        break;
      }

      // Add a small delay between pages to be respectful to the API
      if (page < maxPages) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    // Summary
    console.log('');
    console.log('✅ Seed completed!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   Total fetched:     ${totalFetched}`);
    console.log(`   Total created:     ${totalCreated}`);
    console.log(`   Total updated:     ${totalUpdated}`);
    console.log(`   Total errors:      ${totalErrors}`);
    console.log(`   Total skipped:     ${totalSkipped}`);
    console.log(`   Images uploaded:   ${totalImagesUploaded}`);
    console.log(`   Images failed:     ${totalImagesFailed}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  } catch (error) {
    console.error('');
    console.error('❌ Seed failed with error:');
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Run the seed script
const args = process.argv.slice(2);
const options: SeedOptions = {};

// Parse command line arguments
for (let i = 0; i < args.length; i += 2) {
  const key = args[i]?.replace('--', '');
  const value = args[i + 1];

  if (key === 'page') {
    options.page = parseInt(value, 10);
  } else if (key === 'last') {
    options.last = parseInt(value, 10);
  } else if (key === 'order_by') {
    options.order_by = value;
  } else if (key === 'order_type') {
    options.order_type = value as 'asc' | 'desc';
  } else if (key === 'country') {
    options.country = value;
  } else if (key === 'limit') {
    options.limit = parseInt(value, 10);
  } else if (key === 'maxPages') {
    options.maxPages = parseInt(value, 10);
  }
}

seedTikTokTrending(options)
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
