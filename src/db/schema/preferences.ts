import { pgTable, varchar, timestamp, jsonb, pgEnum, boolean, text } from 'drizzle-orm/pg-core';
import { createId } from '@paralleldrive/cuid2';
import { users } from './users';
import { organizations } from './organizations';
import { projects } from './projects';

export const themeEnum = pgEnum('theme', ['light', 'dark', 'system']);

export const userPreferences = pgTable('user_preferences', {
  id: varchar('id', { length: 255 })
    .primaryKey()
    .$defaultFn(() => createId()),
  userId: varchar('userId', { length: 255 })
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' })
    .unique(),
  theme: themeEnum('theme').notNull().default('system'),
  language: varchar('language', { length: 20 }).default('en'),
  timezone: varchar('timezone', { length: 100 }),
  defaultCaptionStyle: jsonb('defaultCaptionStyle'),
  defaultVoice: varchar('defaultVoice', { length: 100 }),
  emailNotifications: jsonb('emailNotifications'),
  createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date' }).$onUpdate(() => new Date()),
});

export const organizationSettings = pgTable('organization_settings', {
  id: varchar('id', { length: 255 })
    .primaryKey()
    .$defaultFn(() => createId()),
  organizationId: varchar('organizationId', { length: 255 })
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' })
    .unique(),
  defaultLanguage: varchar('defaultLanguage', { length: 20 }).default('en'),
  defaultVoice: varchar('defaultVoice', { length: 100 }),
  brandingAssets: jsonb('brandingAssets'),
  defaultCaptionStyle: jsonb('defaultCaptionStyle'),
  createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date' }).$onUpdate(() => new Date()),
});

export const templates = pgTable('templates', {
  id: varchar('id', { length: 255 })
    .primaryKey()
    .$defaultFn(() => createId()),
  organizationId: varchar('organizationId', { length: 255 }).references(() => organizations.id, {
    onDelete: 'cascade',
  }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  category: varchar('category', { length: 100 }),
  scriptStructure: jsonb('scriptStructure'),
  captionDefaults: jsonb('captionDefaults'),
  sceneDefaults: jsonb('sceneDefaults'),
  thumbnailUrl: varchar('thumbnailUrl', { length: 2048 }),
  isPublic: boolean('isPublic').notNull().default(false),
  isDefault: boolean('isDefault').notNull().default(false),
  createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date' }).$onUpdate(() => new Date()),
});

export const templateUsage = pgTable('template_usage', {
  id: varchar('id', { length: 255 })
    .primaryKey()
    .$defaultFn(() => createId()),
  templateId: varchar('templateId', { length: 255 })
    .notNull()
    .references(() => templates.id, { onDelete: 'cascade' }),
  projectId: varchar('projectId', { length: 255 })
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  usedAt: timestamp('usedAt', { mode: 'date' }).defaultNow().notNull(),
});
