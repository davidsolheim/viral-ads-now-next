import { pgTable, varchar, timestamp, decimal, boolean, jsonb, pgEnum, integer } from 'drizzle-orm/pg-core';
import { createId } from '@paralleldrive/cuid2';
import { organizations } from './organizations';
import { users } from './users';
import { usageRecords } from './usage';

export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'active',
  'canceled',
  'past_due',
  'trialing',
  'paused',
]);

export const invoiceStatusEnum = pgEnum('invoice_status', [
  'draft',
  'open',
  'paid',
  'void',
  'uncollectible',
]);

export const paymentMethodTypeEnum = pgEnum('payment_method_type', ['card', 'bank']);

export const creditTransactionTypeEnum = pgEnum('credit_transaction_type', [
  'purchase',
  'usage',
  'refund',
  'adjustment',
  'bonus',
]);

export const subscriptionPlans = pgTable('subscription_plans', {
  id: varchar('id', { length: 255 })
    .primaryKey()
    .$defaultFn(() => createId()),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  monthlyPrice: decimal('monthlyPrice', { precision: 10, scale: 2 }),
  yearlyPrice: decimal('yearlyPrice', { precision: 10, scale: 2 }),
  limits: jsonb('limits'),
  isActive: boolean('isActive').notNull().default(true),
  createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date' }).$onUpdate(() => new Date()),
});

export const subscriptions = pgTable('subscriptions', {
  id: varchar('id', { length: 255 })
    .primaryKey()
    .$defaultFn(() => createId()),
  organizationId: varchar('organizationId', { length: 255 })
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  planId: varchar('planId', { length: 255 })
    .notNull()
    .references(() => subscriptionPlans.id),
  status: subscriptionStatusEnum('status').notNull().default('trialing'),
  stripeSubscriptionId: varchar('stripeSubscriptionId', { length: 255 }),
  stripeCustomerId: varchar('stripeCustomerId', { length: 255 }),
  currentPeriodStart: timestamp('currentPeriodStart', { mode: 'date' }),
  currentPeriodEnd: timestamp('currentPeriodEnd', { mode: 'date' }),
  cancelAtPeriodEnd: boolean('cancelAtPeriodEnd').notNull().default(false),
  canceledAt: timestamp('canceledAt', { mode: 'date' }),
  trialEndsAt: timestamp('trialEndsAt', { mode: 'date' }),
  createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { mode: 'date' }).$onUpdate(() => new Date()),
});

export const paymentMethods = pgTable('payment_methods', {
  id: varchar('id', { length: 255 })
    .primaryKey()
    .$defaultFn(() => createId()),
  organizationId: varchar('organizationId', { length: 255 })
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  stripePaymentMethodId: varchar('stripePaymentMethodId', { length: 255 }).notNull(),
  type: paymentMethodTypeEnum('type').notNull(),
  last4: varchar('last4', { length: 4 }),
  brand: varchar('brand', { length: 50 }),
  isDefault: boolean('isDefault').notNull().default(false),
  expiresAt: timestamp('expiresAt', { mode: 'date' }),
  createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
});

export const invoices = pgTable('invoices', {
  id: varchar('id', { length: 255 })
    .primaryKey()
    .$defaultFn(() => createId()),
  organizationId: varchar('organizationId', { length: 255 })
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  subscriptionId: varchar('subscriptionId', { length: 255 }).references(() => subscriptions.id, {
    onDelete: 'set null',
  }),
  stripeInvoiceId: varchar('stripeInvoiceId', { length: 255 }),
  number: varchar('number', { length: 255 }),
  status: invoiceStatusEnum('status').notNull().default('draft'),
  amountDue: decimal('amountDue', { precision: 10, scale: 2 }),
  amountPaid: decimal('amountPaid', { precision: 10, scale: 2 }),
  currency: varchar('currency', { length: 10 }).default('USD'),
  periodStart: timestamp('periodStart', { mode: 'date' }),
  periodEnd: timestamp('periodEnd', { mode: 'date' }),
  dueDate: timestamp('dueDate', { mode: 'date' }),
  paidAt: timestamp('paidAt', { mode: 'date' }),
  hostedInvoiceUrl: varchar('hostedInvoiceUrl', { length: 2048 }),
  invoicePdf: varchar('invoicePdf', { length: 2048 }),
  lineItems: jsonb('lineItems'),
  createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
});

export const credits = pgTable('credits', {
  id: varchar('id', { length: 255 })
    .primaryKey()
    .$defaultFn(() => createId()),
  organizationId: varchar('organizationId', { length: 255 })
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  balance: decimal('balance', { precision: 12, scale: 4 }).notNull().default('0'),
  lifetimePurchased: decimal('lifetimePurchased', { precision: 12, scale: 4 }).notNull().default('0'),
  lifetimeUsed: decimal('lifetimeUsed', { precision: 12, scale: 4 }).notNull().default('0'),
  updatedAt: timestamp('updatedAt', { mode: 'date' }).$onUpdate(() => new Date()),
});

export const creditTransactions = pgTable('credit_transactions', {
  id: varchar('id', { length: 255 })
    .primaryKey()
    .$defaultFn(() => createId()),
  organizationId: varchar('organizationId', { length: 255 })
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  userId: varchar('userId', { length: 255 }).references(() => users.id, { onDelete: 'set null' }),
  type: creditTransactionTypeEnum('type').notNull(),
  amount: decimal('amount', { precision: 12, scale: 4 }).notNull(),
  balanceAfter: decimal('balanceAfter', { precision: 12, scale: 4 }).notNull(),
  description: varchar('description', { length: 255 }),
  relatedUsageRecordId: varchar('relatedUsageRecordId', { length: 255 }).references(() => usageRecords.id, {
    onDelete: 'set null',
  }),
  stripePaymentIntentId: varchar('stripePaymentIntentId', { length: 255 }),
  createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
});
