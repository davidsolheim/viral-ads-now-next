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
  foreignKey,
  index,
} from 'drizzle-orm/pg-core';
import { createId } from '@paralleldrive/cuid2';
import { organizations } from './organizations';
import { users } from './users';
import { assetTypeEnum, libraryAssets } from './assets';

// Music category enum
export const musicCategoryEnum = pgEnum('music_category', [
  'upbeat',
  'calm',
  'dramatic',
  'corporate',
  'electronic',
  'acoustic',
  'other',
]);

export const musicLicenseEnum = pgEnum('music_license', ['royalty_free', 'licensed', 'custom']);

export const adStyleEnum = pgEnum('ad_style', [
  'conversational',
  'energetic',
  'professional',
  'casual',
  'sex_appeal',
]);

export const projectStepEnum = pgEnum('project_step', [
  'product',
  'style',
  'concept',
  'script',
  'scenes',
  'images',
  'video',
  'voiceover',
  'music',
  'captions',
  'compile',
  'complete',
  'failed',
]);

export const projectStatusEnum = pgEnum('project_status', ['draft', 'in_progress', 'completed', 'failed']);

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
  productId: varchar('productId', { length: 255 }).references(() => products.id, {
    onDelete: 'set null',
  }),
  productUrl: text('productUrl'),
  adStyle: adStyleEnum('adStyle'),
  currentStep: projectStepEnum('currentStep').notNull().default('product'),
  status: projectStatusEnum('status').notNull().default('draft'),
  settings: jsonb('settings'), // Stores settings like music volume, caption styles, etc.
  deletedAt: timestamp('deletedAt', { mode: 'date' }),
  createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date' }).$onUpdate(() => new Date()),
});

// Captions configuration table
export const captions = pgTable('captions', {
  id: varchar('id', { length: 255 })
    .primaryKey()
    .$defaultFn(() => createId()),
  projectId: varchar('projectId', { length: 255 })
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  sceneId: varchar('sceneId', { length: 255 }).references(() => scenes.id, { onDelete: 'cascade' }),
  text: text('text'),
  fontFamily: varchar('fontFamily', { length: 100 }).default('Inter'),
  fontSize: integer('fontSize').default(48),
  fontColor: varchar('fontColor', { length: 20 }).default('#FFFFFF'),
  backgroundColor: varchar('backgroundColor', { length: 20 }),
  position: varchar('position', { length: 20 }).default('bottom'), // top, center, bottom
  style: varchar('style', { length: 50 }).default('default'), // default, highlight, karaoke
  animation: varchar('animation', { length: 50 }), // fade, pop, slide
  createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date' }).$onUpdate(() => new Date()),
  deletedAt: timestamp('deletedAt', { mode: 'date' }),
});

// Products table
export const products = pgTable(
  'products',
  {
    id: varchar('id', { length: 255 })
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: varchar('userId', { length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    organizationId: varchar('organizationId', { length: 255 }).references(() => organizations.id, {
      onDelete: 'set null',
    }),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    price: decimal('price', { precision: 10, scale: 2 }),
    originalPrice: decimal('originalPrice', { precision: 10, scale: 2 }),
    currency: varchar('currency', { length: 10 }).default('USD'),
    category: varchar('category', { length: 255 }),
    soldCount: integer('soldCount'),
    images: jsonb('images'), // Array of image URLs
    features: jsonb('features'), // Array of text features
    benefits: jsonb('benefits'), // Array of text benefits
    url: text('url'),
    createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updatedAt', { mode: 'date' }).$onUpdate(() => new Date()),
    deletedAt: timestamp('deletedAt', { mode: 'date' }),
  },
  (table) => ({
    userIdUrlIdx: index('products_user_id_url_idx').on(table.userId, table.url),
    userIdIdx: index('products_user_id_idx').on(table.userId),
    organizationIdIdx: index('products_organization_id_idx').on(table.organizationId),
  })
);

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
  metadata: jsonb('metadata'),
  createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date' }).$onUpdate(() => new Date()),
  deletedAt: timestamp('deletedAt', { mode: 'date' }),
});

// Scenes table
export const scenes = pgTable('scenes', {
  id: varchar('id', { length: 255 })
    .primaryKey()
    .$defaultFn(() => createId()),
  projectId: varchar('projectId', { length: 255 })
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  scriptId: varchar('scriptId', { length: 255 }).references(() => scripts.id, { onDelete: 'set null' }),
  sceneNumber: integer('sceneNumber').notNull(),
  scriptText: text('scriptText').notNull(),
  visualDescription: text('visualDescription').notNull(),
  imagePrompt: text('imagePrompt'),
  durationSeconds: integer('durationSeconds').default(5),
  metadata: jsonb('metadata'),
  createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date' }).$onUpdate(() => new Date()),
  deletedAt: timestamp('deletedAt', { mode: 'date' }),
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
  libraryAssetId: varchar('libraryAssetId', { length: 255 }).references(() => libraryAssets.id, {
    onDelete: 'set null',
  }),
  type: assetTypeEnum('type').notNull(),
  url: text('url').notNull(),
  fileName: varchar('fileName', { length: 255 }),
  sizeBytes: integer('sizeBytes'),
  metadata: jsonb('metadata'), // e.g., { voice: 'alloy', duration: 30.5 }
  deletedAt: timestamp('deletedAt', { mode: 'date' }),
  createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date' }).$onUpdate(() => new Date()),
});

// Music tracks library (system or organization-specific)
export const musicTracks = pgTable('music_tracks', {
  id: varchar('id', { length: 255 })
    .primaryKey()
    .$defaultFn(() => createId()),
  name: varchar('name', { length: 255 }).notNull(),
  url: text('url').notNull(),
  durationSeconds: integer('durationSeconds'),
  category: musicCategoryEnum('category'),
  bpm: integer('bpm'),
  isDefault: boolean('isDefault').default(false),
  license: musicLicenseEnum('license').default('royalty_free'),
  licenseDetails: jsonb('licenseDetails'),
  tags: jsonb('tags'),
  deletedAt: timestamp('deletedAt', { mode: 'date' }),
  organizationId: varchar('organizationId', { length: 255 }).references(() => organizations.id, {
    onDelete: 'cascade',
  }),
  createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date' }).$onUpdate(() => new Date()),
});

// Final videos table
export const finalVideos = pgTable(
  'final_videos',
  {
    id: varchar('id', { length: 255 })
      .primaryKey()
      .$defaultFn(() => createId()),
    projectId: varchar('projectId', { length: 255 })
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    variantOf: varchar('variantOf', { length: 255 }),
    url: text('url').notNull(),
    durationSeconds: integer('durationSeconds'),
    resolution: varchar('resolution', { length: 20 }), // e.g., '1080p'
    metadata: jsonb('metadata'), // e.g., { tiktok_title: '...', tiktok_hashtags: [...] }
    deletedAt: timestamp('deletedAt', { mode: 'date' }),
    createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updatedAt', { mode: 'date' }).$onUpdate(() => new Date()),
  },
  (table) => ({
    variantOfReference: foreignKey({
      columns: [table.variantOf],
      foreignColumns: [table.id],
    }).onDelete('set null'),
  })
);
