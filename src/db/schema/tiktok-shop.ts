import {
  pgTable,
  varchar,
  timestamp,
  text,
  decimal,
  integer,
  boolean,
  jsonb,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core';
import { createId } from '@paralleldrive/cuid2';

// Queue item type enum
export const queueItemTypeEnum = pgEnum('queue_item_type', [
  'product',
  'video',
  'live_stream',
  'creator',
]);

// TikTok Shop Products table
export const tiktokShopProducts = pgTable(
  'tiktok_shop_products',
  {
    id: varchar('id', { length: 255 })
      .primaryKey()
      .$defaultFn(() => createId()),
    tiktokProductId: varchar('tiktokProductId', { length: 255 }).notNull().unique(),
    name: varchar('name', { length: 500 }).notNull(),
    description: text('description'),
    price: decimal('price', { precision: 10, scale: 2 }),
    originalPrice: decimal('originalPrice', { precision: 10, scale: 2 }),
    currency: varchar('currency', { length: 10 }).default('USD'),
    tiktokShopUrl: text('tiktokShopUrl').notNull(),
    sellerId: varchar('sellerId', { length: 255 }),
    sellerName: varchar('sellerName', { length: 255 }),
    category: varchar('category', { length: 255 }),
    images: jsonb('images'), // Array of image URLs
    // Trending metrics
    totalViews: integer('totalViews').default(0),
    totalSales: integer('totalSales').default(0),
    engagementRate: decimal('engagementRate', { precision: 5, scale: 4 }), // 0.0000 to 1.0000
    trendingScore: decimal('trendingScore', { precision: 10, scale: 2 }).default('0'),
    // Review/Rating metrics
    averageRating: decimal('averageRating', { precision: 3, scale: 2 }), // 0.00 to 5.00
    totalReviews: integer('totalReviews').default(0),
    ratingDistribution: jsonb('ratingDistribution'), // Object with star counts: { 5: 100, 4: 50, 3: 10, 2: 5, 1: 2 }
    // Metadata
    metadata: jsonb('metadata'), // Additional product data
    lastUpdated: timestamp('lastUpdated', { mode: 'date' }).defaultNow().notNull(),
    createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updatedAt', { mode: 'date' }).$onUpdate(() => new Date()),
  },
  (table) => ({
    tiktokProductIdIdx: index('tiktok_product_id_idx').on(table.tiktokProductId),
    lastUpdatedIdx: index('tiktok_products_last_updated_idx').on(table.lastUpdated),
    trendingScoreIdx: index('tiktok_products_trending_score_idx').on(table.trendingScore),
  })
);

// TikTok Shop Videos table
export const tiktokShopVideos = pgTable(
  'tiktok_shop_videos',
  {
    id: varchar('id', { length: 255 })
      .primaryKey()
      .$defaultFn(() => createId()),
    tiktokVideoId: varchar('tiktokVideoId', { length: 255 }).notNull().unique(),
    url: text('url').notNull(),
    thumbnailUrl: text('thumbnailUrl'),
    productIds: jsonb('productIds'), // Array of product IDs featured in video
    creatorId: varchar('creatorId', { length: 255 }), // References tiktokShopCreators
    creatorUsername: varchar('creatorUsername', { length: 255 }),
    // Engagement metrics
    views: integer('views').default(0),
    likes: integer('likes').default(0),
    comments: integer('comments').default(0),
    shares: integer('shares').default(0),
    saves: integer('saves').default(0),
    postedAt: timestamp('postedAt', { mode: 'date' }),
    // Metadata
    description: text('description'),
    hashtags: jsonb('hashtags'), // Array of hashtags
    metadata: jsonb('metadata'),
    lastUpdated: timestamp('lastUpdated', { mode: 'date' }).defaultNow().notNull(),
    createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updatedAt', { mode: 'date' }).$onUpdate(() => new Date()),
  },
  (table) => ({
    tiktokVideoIdIdx: index('tiktok_video_id_idx').on(table.tiktokVideoId),
    creatorIdIdx: index('tiktok_videos_creator_id_idx').on(table.creatorId),
    lastUpdatedIdx: index('tiktok_videos_last_updated_idx').on(table.lastUpdated),
    postedAtIdx: index('tiktok_videos_posted_at_idx').on(table.postedAt),
  })
);

// TikTok Shop Live Streams table
export const tiktokShopLiveStreams = pgTable(
  'tiktok_shop_live_streams',
  {
    id: varchar('id', { length: 255 })
      .primaryKey()
      .$defaultFn(() => createId()),
    tiktokStreamId: varchar('tiktokStreamId', { length: 255 }).notNull().unique(),
    url: text('url'),
    productIds: jsonb('productIds'), // Array of product IDs featured in stream
    creatorId: varchar('creatorId', { length: 255 }), // References tiktokShopCreators
    creatorUsername: varchar('creatorUsername', { length: 255 }),
    // Engagement metrics
    peakViewerCount: integer('peakViewerCount').default(0),
    totalViewers: integer('totalViewers').default(0),
    likes: integer('likes').default(0),
    comments: integer('comments').default(0),
    shares: integer('shares').default(0),
    // Stream timing
    startTime: timestamp('startTime', { mode: 'date' }),
    endTime: timestamp('endTime', { mode: 'date' }),
    durationSeconds: integer('durationSeconds'),
    // Metadata
    title: varchar('title', { length: 500 }),
    description: text('description'),
    metadata: jsonb('metadata'),
    lastUpdated: timestamp('lastUpdated', { mode: 'date' }).defaultNow().notNull(),
    createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updatedAt', { mode: 'date' }).$onUpdate(() => new Date()),
  },
  (table) => ({
    tiktokStreamIdIdx: index('tiktok_stream_id_idx').on(table.tiktokStreamId),
    creatorIdIdx: index('tiktok_streams_creator_id_idx').on(table.creatorId),
    lastUpdatedIdx: index('tiktok_streams_last_updated_idx').on(table.lastUpdated),
  })
);

// TikTok Shop Creators table
export const tiktokShopCreators = pgTable(
  'tiktok_shop_creators',
  {
    id: varchar('id', { length: 255 })
      .primaryKey()
      .$defaultFn(() => createId()),
    tiktokCreatorId: varchar('tiktokCreatorId', { length: 255 }).notNull().unique(),
    username: varchar('username', { length: 255 }).notNull(),
    displayName: varchar('displayName', { length: 255 }),
    profileImageUrl: text('profileImageUrl'),
    profileUrl: text('profileUrl'),
    // Engagement metrics
    followerCount: integer('followerCount').default(0),
    followingCount: integer('followingCount').default(0),
    videoCount: integer('videoCount').default(0),
    likesCount: integer('likesCount').default(0),
    averageViews: integer('averageViews').default(0),
    engagementRate: decimal('engagementRate', { precision: 5, scale: 4 }),
    // Product promotion data
    promotedProductCategories: jsonb('promotedProductCategories'), // Array of category names
    topProductIds: jsonb('topProductIds'), // Array of top promoted product IDs
    // Metadata
    bio: text('bio'),
    metadata: jsonb('metadata'),
    lastUpdated: timestamp('lastUpdated', { mode: 'date' }).defaultNow().notNull(),
    createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updatedAt', { mode: 'date' }).$onUpdate(() => new Date()),
  },
  (table) => ({
    tiktokCreatorIdIdx: index('tiktok_creator_id_idx').on(table.tiktokCreatorId),
    usernameIdx: index('tiktok_creators_username_idx').on(table.username),
    lastUpdatedIdx: index('tiktok_creators_last_updated_idx').on(table.lastUpdated),
  })
);

// TikTok Shop Engagement Metrics table (snapshots)
export const tiktokShopEngagement = pgTable(
  'tiktok_shop_engagement',
  {
    id: varchar('id', { length: 255 })
      .primaryKey()
      .$defaultFn(() => createId()),
    // Polymorphic relationship
    entityType: varchar('entityType', { length: 50 }).notNull(), // 'product', 'video', 'live_stream', 'creator'
    entityId: varchar('entityId', { length: 255 }).notNull(),
    // Engagement metrics snapshot
    views: integer('views'),
    likes: integer('likes'),
    shares: integer('shares'),
    comments: integer('comments'),
    saves: integer('saves'),
    sales: integer('sales'),
    // Growth calculations
    viewsGrowth: decimal('viewsGrowth', { precision: 10, scale: 4 }), // Percentage change
    likesGrowth: decimal('likesGrowth', { precision: 10, scale: 4 }),
    salesGrowth: decimal('salesGrowth', { precision: 10, scale: 4 }),
    // Metadata
    measuredAt: timestamp('measuredAt', { mode: 'date' }).defaultNow().notNull(),
    metadata: jsonb('metadata'),
    createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
  },
  (table) => ({
    entityIdx: index('tiktok_engagement_entity_idx').on(table.entityType, table.entityId),
    measuredAtIdx: index('tiktok_engagement_measured_at_idx').on(table.measuredAt),
  })
);

// TikTok Shop Refresh Queue table
export const tiktokShopRefreshQueue = pgTable(
  'tiktok_shop_refresh_queue',
  {
    id: varchar('id', { length: 255 })
      .primaryKey()
      .$defaultFn(() => createId()),
    itemType: queueItemTypeEnum('itemType').notNull(),
    itemId: varchar('itemId', { length: 255 }).notNull(), // ID from the respective table
    // Queue management
    priority: integer('priority').default(0), // Higher = more important
    queuedAt: timestamp('queuedAt', { mode: 'date' }).defaultNow().notNull(),
    lastProcessedAt: timestamp('lastProcessedAt', { mode: 'date' }),
    assignedClientId: varchar('assignedClientId', { length: 255 }), // Client fingerprint tracking
    // Status tracking
    attempts: integer('attempts').default(0),
    maxAttempts: integer('maxAttempts').default(3),
    status: varchar('status', { length: 50 }).default('pending'), // 'pending', 'processing', 'completed', 'failed'
    errorMessage: text('errorMessage'),
    // Metadata
    metadata: jsonb('metadata'),
    completedAt: timestamp('completedAt', { mode: 'date' }),
    createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updatedAt', { mode: 'date' }).$onUpdate(() => new Date()),
  },
  (table) => ({
    itemIdx: index('tiktok_refresh_queue_item_idx').on(table.itemType, table.itemId),
    statusIdx: index('tiktok_refresh_queue_status_idx').on(table.status),
    priorityIdx: index('tiktok_refresh_queue_priority_idx').on(table.priority),
    queuedAtIdx: index('tiktok_refresh_queue_queued_at_idx').on(table.queuedAt),
  })
);
