import { pgTable, varchar, timestamp, integer, decimal, jsonb, pgEnum } from 'drizzle-orm/pg-core';
import { createId } from '@paralleldrive/cuid2';
import { organizations } from './organizations';
import { projects } from './projects';
import { users } from './users';
import { integrationProviderEnum } from './extensions';

// Usage type enum
export const usageTypeEnum = pgEnum('usage_type', [
  'script_generation',
  'image_generation',
  'video_generation',
  'voiceover_generation',
  'video_render',
]);

// Usage records table (billing and analytics)
export const usageRecords = pgTable('usage_records', {
  id: varchar('id', { length: 255 })
    .primaryKey()
    .$defaultFn(() => createId()),
  organizationId: varchar('organizationId', { length: 255 })
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  projectId: varchar('projectId', { length: 255 }).references(() => projects.id, {
    onDelete: 'set null',
  }),
  userId: varchar('userId', { length: 255 })
    .notNull()
    .references(() => users.id),
  type: usageTypeEnum('type').notNull(),
  units: integer('units').notNull(), // e.g., tokens, seconds, renders
  cost: decimal('cost', { precision: 10, scale: 4 }), // USD cost
  provider: integrationProviderEnum('provider'),
  metadata: jsonb('metadata'), // Provider-specific details
  createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
});
