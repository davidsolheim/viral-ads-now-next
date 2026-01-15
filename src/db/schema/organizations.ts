import { pgTable, varchar, timestamp, primaryKey, pgEnum } from 'drizzle-orm/pg-core';
import { createId } from '@paralleldrive/cuid2';
import { users } from './users';

// Organization role enum
export const organizationRoleEnum = pgEnum('organization_role', ['owner', 'admin', 'member']);

// Invitation status enum
export const invitationStatusEnum = pgEnum('invitation_status', [
  'pending',
  'accepted',
  'declined',
  'expired',
]);

// Organizations table
export const organizations = pgTable('organizations', {
  id: varchar('id', { length: 255 })
    .primaryKey()
    .$defaultFn(() => createId()),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  ownerId: varchar('ownerId', { length: 255 })
    .notNull()
    .references(() => users.id),
  stripeCustomerId: varchar('stripeCustomerId', { length: 255 }),
  createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date' }).$onUpdate(() => new Date()),
  deletedAt: timestamp('deletedAt', { mode: 'date' }),
});

// Organization members table (junction table)
export const organizationMembers = pgTable(
  'organization_members',
  {
    userId: varchar('userId', { length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    organizationId: varchar('organizationId', { length: 255 })
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    role: organizationRoleEnum('role').notNull().default('member'),
  },
  (om) => ({
    compoundKey: primaryKey({ columns: [om.userId, om.organizationId] }),
  })
);

// Invitations table
export const invitations = pgTable('invitations', {
  id: varchar('id', { length: 255 })
    .primaryKey()
    .$defaultFn(() => createId()),
  email: varchar('email', { length: 255 }).notNull(),
  organizationId: varchar('organizationId', { length: 255 })
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  role: organizationRoleEnum('role').notNull().default('member'),
  status: invitationStatusEnum('status').notNull().default('pending'),
  token: varchar('token', { length: 255 }).notNull().unique(),
  invitedById: varchar('invitedById', { length: 255 })
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
  expiresAt: timestamp('expiresAt', { mode: 'date' }),
});
