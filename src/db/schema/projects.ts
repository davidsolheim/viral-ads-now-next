import { pgTable, varchar, timestamp, text, decimal, integer, boolean, jsonb, pgEnum } from 'drizzle-orm/pg-core';
import { createId } from '@paralleldrive/cuid2';
import { organizations } from './organizations';
import { users } from './users';

// Asset type enum
export const assetTypeEnum = pgEnum('asset_type', ['image', 'video_clip', 'voiceover', 'music']);

// Projects table
export const projects = pgTable('projects', {
  id: varchar('id', { length: 255 })
    .primaryKey()
    .$defaultFn(() => createId()),
  name: varchar('name', { length: 255 }).notNull(),
  organizationId: varchar('organizationId', { length: 255 })
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  creatorId: varchar('creatorId', { length: 255 })
    .notNull()
    .references(() => users.id),
  productId: varchar('productId', { length: 255 }),
  currentStep: varchar('currentStep', { length: 50 }).notNull().default('product'),
  settings: jsonb('settings'), // Stores settings like music volume, caption styles, etc.
  createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date' }).$onUpdate(() => new Date()),
});

// Products table
export const products = pgTable('products', {
  id: varchar('id', { length: 255 })
    .primaryKey()
    .$defaultFn(() => createId()),
  projectId: varchar('projectId', { length: 255 })
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  price: decimal('price', { precision: 10, scale: 2 }),
  originalPrice: decimal('originalPrice', { precision: 10, scale: 2 }),
  category: varchar('category', { length: 255 }),
  soldCount: integer('soldCount'),
  images: jsonb('images'), // Array of image URLs
  features: jsonb('features'), // Array of text features
  benefits: jsonb('benefits'), // Array of text benefits
});

// Scripts table
export const scripts = pgTable('scripts', {
  id: varchar('id', { length: 255 })
    .primaryKey()
    .$defaultFn(() => createId()),
  projectId: varchar('projectId', { length: 255 })
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  isSelected: boolean('isSelected').default(false),
  createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
});

// Scenes table
export const scenes = pgTable('scenes', {
  id: varchar('id', { length: 255 })
    .primaryKey()
    .$defaultFn(() => createId()),
  projectId: varchar('projectId', { length: 255 })
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  sceneNumber: integer('sceneNumber').notNull(),
  scriptText: text('scriptText').notNull(),
  visualDescription: text('visualDescription').notNull(),
  createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
});

// Media assets table (polymorphic for images, video clips, voiceovers, music)
export const mediaAssets = pgTable('media_assets', {
  id: varchar('id', { length: 255 })
    .primaryKey()
    .$defaultFn(() => createId()),
  projectId: varchar('projectId', { length: 255 })
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  sceneId: varchar('sceneId', { length: 255 }).references(() => scenes.id), // Nullable for project-level assets
  type: assetTypeEnum('type').notNull(),
  url: text('url').notNull(),
  metadata: jsonb('metadata'), // e.g., { voice: 'alloy', duration: 30.5 }
  createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
});

// Final videos table
export const finalVideos = pgTable('final_videos', {
  id: varchar('id', { length: 255 })
    .primaryKey()
    .$defaultFn(() => createId()),
  projectId: varchar('projectId', { length: 255 })
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  durationSeconds: integer('durationSeconds'),
  resolution: varchar('resolution', { length: 20 }), // e.g., '1080p'
  metadata: jsonb('metadata'), // e.g., { tiktok_title: '...', tiktok_hashtags: [...] }
  createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
});
