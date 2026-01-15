import { pgTable, varchar, timestamp, text, jsonb, pgEnum, integer, boolean } from 'drizzle-orm/pg-core';
import { createId } from '@paralleldrive/cuid2';
import { organizations } from './organizations';
import { users } from './users';

export const reportTypeEnum = pgEnum('report_type', [
  'usage_summary',
  'cost_breakdown',
  'video_performance',
  'team_activity',
]);

export const reportPeriodEnum = pgEnum('report_period', ['daily', 'weekly', 'monthly']);

export const auditActionEnum = pgEnum('audit_action', [
  'create',
  'update',
  'delete',
  'login',
  'logout',
  'invite_sent',
  'role_changed',
  'export',
  'api_key_created',
]);

export const notificationTypeEnum = pgEnum('notification_type', [
  'project_complete',
  'invite_received',
  'comment_mention',
  'payment_failed',
  'usage_warning',
]);

export const analyticsReports = pgTable('analytics_reports', {
  id: varchar('id', { length: 255 })
    .primaryKey()
    .$defaultFn(() => createId()),
  organizationId: varchar('organizationId', { length: 255 })
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  reportType: reportTypeEnum('reportType').notNull(),
  period: reportPeriodEnum('period').notNull(),
  periodStart: timestamp('periodStart', { mode: 'date' }).notNull(),
  periodEnd: timestamp('periodEnd', { mode: 'date' }).notNull(),
  data: jsonb('data'),
  generatedAt: timestamp('generatedAt', { mode: 'date' }).defaultNow().notNull(),
});

export const auditLogs = pgTable('audit_logs', {
  id: varchar('id', { length: 255 })
    .primaryKey()
    .$defaultFn(() => createId()),
  organizationId: varchar('organizationId', { length: 255 }).references(() => organizations.id, {
    onDelete: 'set null',
  }),
  userId: varchar('userId', { length: 255 }).references(() => users.id, { onDelete: 'set null' }),
  action: auditActionEnum('action').notNull(),
  resourceType: varchar('resourceType', { length: 100 }),
  resourceId: varchar('resourceId', { length: 255 }),
  changes: jsonb('changes'),
  ipAddress: varchar('ipAddress', { length: 100 }),
  userAgent: text('userAgent'),
  createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
});

export const notifications = pgTable('notifications', {
  id: varchar('id', { length: 255 })
    .primaryKey()
    .$defaultFn(() => createId()),
  userId: varchar('userId', { length: 255 })
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  type: notificationTypeEnum('type').notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message'),
  resourceType: varchar('resourceType', { length: 100 }),
  resourceId: varchar('resourceId', { length: 255 }),
  readAt: timestamp('readAt', { mode: 'date' }),
  createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
});

export const apiKeys = pgTable('api_keys', {
  id: varchar('id', { length: 255 })
    .primaryKey()
    .$defaultFn(() => createId()),
  organizationId: varchar('organizationId', { length: 255 })
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  keyHash: varchar('keyHash', { length: 255 }).notNull(),
  keyPrefix: varchar('keyPrefix', { length: 20 }).notNull(),
  permissions: jsonb('permissions'),
  lastUsedAt: timestamp('lastUsedAt', { mode: 'date' }),
  expiresAt: timestamp('expiresAt', { mode: 'date' }),
  createdById: varchar('createdById', { length: 255 }).references(() => users.id, {
    onDelete: 'set null',
  }),
  revokedAt: timestamp('revokedAt', { mode: 'date' }),
  createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
});

export const dataRetentionPolicies = pgTable('data_retention_policies', {
  id: varchar('id', { length: 255 })
    .primaryKey()
    .$defaultFn(() => createId()),
  organizationId: varchar('organizationId', { length: 255 })
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' })
    .unique(),
  retainProjectsDays: integer('retainProjectsDays'),
  retainVideosDays: integer('retainVideosDays'),
  retainLogsDays: integer('retainLogsDays'),
  autoDeleteEnabled: boolean('autoDeleteEnabled').notNull().default(false),
  lastCleanupAt: timestamp('lastCleanupAt', { mode: 'date' }),
  createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date' }).$onUpdate(() => new Date()),
});
