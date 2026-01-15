import { pgTable, varchar, timestamp, text, jsonb, pgEnum } from 'drizzle-orm/pg-core';
import { createId } from '@paralleldrive/cuid2';
import { organizations } from './organizations';
import { users } from './users';

export const assetTypeEnum = pgEnum('asset_type', ['image', 'video_clip', 'voiceover', 'music']);

export const assetLibraryTypeEnum = pgEnum('asset_library_type', [
  'images',
  'music',
  'video_clips',
  'mixed',
]);

export const assetLibraries = pgTable('asset_libraries', {
  id: varchar('id', { length: 255 })
    .primaryKey()
    .$defaultFn(() => createId()),
  organizationId: varchar('organizationId', { length: 255 })
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  type: assetLibraryTypeEnum('type').notNull(),
  createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date' }).$onUpdate(() => new Date()),
});

export const libraryAssets = pgTable('library_assets', {
  id: varchar('id', { length: 255 })
    .primaryKey()
    .$defaultFn(() => createId()),
  libraryId: varchar('libraryId', { length: 255 })
    .notNull()
    .references(() => assetLibraries.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  url: text('url').notNull(),
  type: assetTypeEnum('type').notNull(),
  metadata: jsonb('metadata'),
  thumbnailUrl: varchar('thumbnailUrl', { length: 2048 }),
  createdById: varchar('createdById', { length: 255 }).references(() => users.id, {
    onDelete: 'set null',
  }),
  createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date' }).$onUpdate(() => new Date()),
  deletedAt: timestamp('deletedAt', { mode: 'date' }),
});
