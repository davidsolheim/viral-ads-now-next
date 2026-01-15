import { pgTable, varchar, timestamp, text, jsonb, pgEnum, integer, boolean } from 'drizzle-orm/pg-core';
import { createId } from '@paralleldrive/cuid2';
import { organizations } from './organizations';
import { finalVideos } from './projects';

// Social platform enum
export const platformEnum = pgEnum('platform', [
  'tiktok',
  'instagram_reels',
  'youtube_shorts',
  'facebook',
  'twitter',
]);

// Social post status enum
export const postStatusEnum = pgEnum('post_status', ['draft', 'scheduled', 'published', 'failed']);

export const postScheduleStatusEnum = pgEnum('post_schedule_status', [
  'pending',
  'processing',
  'completed',
  'failed',
]);

// Social accounts table
export const socialAccounts = pgTable('social_accounts', {
  id: varchar('id', { length: 255 })
    .primaryKey()
    .$defaultFn(() => createId()),
  organizationId: varchar('organizationId', { length: 255 })
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  platform: platformEnum('platform').notNull(),
  accountName: varchar('accountName', { length: 255 }),
  accountId: varchar('accountId', { length: 255 }),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  tokenExpiresAt: timestamp('tokenExpiresAt', { mode: 'date' }),
  scopes: jsonb('scopes'),
  isActive: boolean('isActive').notNull().default(true),
  lastSyncAt: timestamp('lastSyncAt', { mode: 'date' }),
  createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date' }).$onUpdate(() => new Date()),
});

// Social media posts table
export const socialPosts = pgTable('social_posts', {
  id: varchar('id', { length: 255 })
    .primaryKey()
    .$defaultFn(() => createId()),
  finalVideoId: varchar('finalVideoId', { length: 255 })
    .notNull()
    .references(() => finalVideos.id, { onDelete: 'cascade' }),
  socialAccountId: varchar('socialAccountId', { length: 255 }).references(() => socialAccounts.id, {
    onDelete: 'set null',
  }),
  platform: platformEnum('platform').notNull(),
  title: varchar('title', { length: 255 }),
  description: text('description'),
  hashtags: jsonb('hashtags'), // Array of strings
  scheduledAt: timestamp('scheduledAt', { mode: 'date' }),
  publishedAt: timestamp('publishedAt', { mode: 'date' }),
  platformPostId: varchar('platformPostId', { length: 255 }),
  status: postStatusEnum('status').notNull().default('draft'),
  metrics: jsonb('metrics'), // { views, likes, shares, comments }
  errorDetails: jsonb('errorDetails'),
  retryCount: integer('retryCount').default(0),
  createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date' }).$onUpdate(() => new Date()),
});

export const postAnalytics = pgTable('post_analytics', {
  id: varchar('id', { length: 255 })
    .primaryKey()
    .$defaultFn(() => createId()),
  socialPostId: varchar('socialPostId', { length: 255 })
    .notNull()
    .references(() => socialPosts.id, { onDelete: 'cascade' }),
  fetchedAt: timestamp('fetchedAt', { mode: 'date' }).defaultNow().notNull(),
  views: integer('views'),
  likes: integer('likes'),
  comments: integer('comments'),
  shares: integer('shares'),
  saves: integer('saves'),
  watchTime: integer('watchTime'),
  completionRate: integer('completionRate'),
  demographics: jsonb('demographics'),
  createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
});

export const postScheduleQueue = pgTable('post_schedule_queue', {
  id: varchar('id', { length: 255 })
    .primaryKey()
    .$defaultFn(() => createId()),
  socialPostId: varchar('socialPostId', { length: 255 })
    .notNull()
    .references(() => socialPosts.id, { onDelete: 'cascade' }),
  scheduledFor: timestamp('scheduledFor', { mode: 'date' }).notNull(),
  attempts: integer('attempts').notNull().default(0),
  maxAttempts: integer('maxAttempts').notNull().default(3),
  status: postScheduleStatusEnum('status').notNull().default('pending'),
  lastError: text('lastError'),
  processedAt: timestamp('processedAt', { mode: 'date' }),
  createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
});
