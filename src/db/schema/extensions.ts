import { pgTable, varchar, timestamp, jsonb, text, pgEnum, integer, boolean } from 'drizzle-orm/pg-core';
import { createId } from '@paralleldrive/cuid2';
import { organizations } from './organizations';
import { users } from './users';

export const tagCategoryEnum = pgEnum('tag_category', ['industry', 'style', 'mood', 'platform']);

export const resourceTypeEnum = pgEnum('resource_type', [
  'project',
  'music_track',
  'final_video',
  'template',
]);

export const referralStatusEnum = pgEnum('referral_status', ['pending', 'claimed', 'rewarded']);

export const integrationProviderEnum = pgEnum('integration_provider', [
  'openai',
  'replicate',
  'shotstack',
  'wasabi',
  'custom',
]);

export const tags = pgTable('tags', {
  id: varchar('id', { length: 255 })
    .primaryKey()
    .$defaultFn(() => createId()),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull(),
  category: tagCategoryEnum('category').notNull(),
  organizationId: varchar('organizationId', { length: 255 }).references(() => organizations.id, {
    onDelete: 'cascade',
  }),
  createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
});

export const resourceTags = pgTable('resource_tags', {
  id: varchar('id', { length: 255 })
    .primaryKey()
    .$defaultFn(() => createId()),
  tagId: varchar('tagId', { length: 255 })
    .notNull()
    .references(() => tags.id, { onDelete: 'cascade' }),
  resourceType: resourceTypeEnum('resourceType').notNull(),
  resourceId: varchar('resourceId', { length: 255 }).notNull(),
  createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
});

export const referrals = pgTable('referrals', {
  id: varchar('id', { length: 255 })
    .primaryKey()
    .$defaultFn(() => createId()),
  referrerId: varchar('referrerId', { length: 255 })
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  referredUserId: varchar('referredUserId', { length: 255 }).references(() => users.id, {
    onDelete: 'set null',
  }),
  referralCode: varchar('referralCode', { length: 255 }).notNull().unique(),
  status: referralStatusEnum('status').notNull().default('pending'),
  rewardCreditAmount: integer('rewardCreditAmount'),
  claimedAt: timestamp('claimedAt', { mode: 'date' }),
  rewardedAt: timestamp('rewardedAt', { mode: 'date' }),
  createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
});

export const webhooks = pgTable('webhooks', {
  id: varchar('id', { length: 255 })
    .primaryKey()
    .$defaultFn(() => createId()),
  organizationId: varchar('organizationId', { length: 255 })
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  secret: varchar('secret', { length: 255 }).notNull(),
  events: jsonb('events'),
  isActive: boolean('isActive').notNull().default(true),
  lastTriggeredAt: timestamp('lastTriggeredAt', { mode: 'date' }),
  failureCount: integer('failureCount').notNull().default(0),
  createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date' }).$onUpdate(() => new Date()),
});

export const webhookDeliveries = pgTable('webhook_deliveries', {
  id: varchar('id', { length: 255 })
    .primaryKey()
    .$defaultFn(() => createId()),
  webhookId: varchar('webhookId', { length: 255 })
    .notNull()
    .references(() => webhooks.id, { onDelete: 'cascade' }),
  eventType: varchar('eventType', { length: 255 }).notNull(),
  payload: jsonb('payload'),
  responseStatus: integer('responseStatus'),
  responseBody: text('responseBody'),
  deliveredAt: timestamp('deliveredAt', { mode: 'date' }),
  durationMs: integer('durationMs'),
  createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
});

export const integrationConfigs = pgTable('integration_configs', {
  id: varchar('id', { length: 255 })
    .primaryKey()
    .$defaultFn(() => createId()),
  organizationId: varchar('organizationId', { length: 255 })
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  provider: integrationProviderEnum('provider').notNull(),
  credentials: jsonb('credentials'),
  settings: jsonb('settings'),
  isActive: boolean('isActive').notNull().default(true),
  createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date' }).$onUpdate(() => new Date()),
});
