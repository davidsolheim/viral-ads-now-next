import {
  pgTable,
  varchar,
  timestamp,
  text,
  integer,
  boolean,
  jsonb,
  pgEnum,
  foreignKey,
} from 'drizzle-orm/pg-core';
import { createId } from '@paralleldrive/cuid2';
import { projects, scripts, scenes, finalVideos, projectStepEnum } from './projects';
import { users } from './users';

export const projectAssignmentTaskEnum = pgEnum('project_assignment_task', [
  'script_review',
  'visual_approval',
  'final_approval',
]);

export const projectAssignmentStatusEnum = pgEnum('project_assignment_status', [
  'pending',
  'in_progress',
  'completed',
]);

export const workflowEventTypeEnum = pgEnum('workflow_event_type', [
  'step_started',
  'step_completed',
  'step_failed',
  'api_error',
  'retry',
]);

export const workflowProviderEnum = pgEnum('workflow_provider', [
  'openai',
  'replicate',
  'shotstack',
  'wasabi',
]);

export const abTestStatusEnum = pgEnum('ab_test_status', ['draft', 'active', 'completed']);

export const scriptVersions = pgTable('script_versions', {
  id: varchar('id', { length: 255 })
    .primaryKey()
    .$defaultFn(() => createId()),
  scriptId: varchar('scriptId', { length: 255 })
    .notNull()
    .references(() => scripts.id, { onDelete: 'cascade' }),
  projectId: varchar('projectId', { length: 255 })
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  versionNumber: integer('versionNumber').notNull(),
  content: text('content').notNull(),
  changeDescription: text('changeDescription'),
  createdById: varchar('createdById', { length: 255 }).references(() => users.id, {
    onDelete: 'set null',
  }),
  createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
});

export const sceneVersions = pgTable('scene_versions', {
  id: varchar('id', { length: 255 })
    .primaryKey()
    .$defaultFn(() => createId()),
  sceneId: varchar('sceneId', { length: 255 })
    .notNull()
    .references(() => scenes.id, { onDelete: 'cascade' }),
  projectId: varchar('projectId', { length: 255 })
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  versionNumber: integer('versionNumber').notNull(),
  scriptText: text('scriptText').notNull(),
  visualDescription: text('visualDescription').notNull(),
  createdById: varchar('createdById', { length: 255 }).references(() => users.id, {
    onDelete: 'set null',
  }),
  createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
});

export const projectComments = pgTable(
  'project_comments',
  {
    id: varchar('id', { length: 255 })
      .primaryKey()
      .$defaultFn(() => createId()),
    projectId: varchar('projectId', { length: 255 })
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    userId: varchar('userId', { length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    parentCommentId: varchar('parentCommentId', { length: 255 }),
    content: text('content').notNull(),
    resolvedAt: timestamp('resolvedAt', { mode: 'date' }),
    resolvedById: varchar('resolvedById', { length: 255 }).references(() => users.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updatedAt', { mode: 'date' }).$onUpdate(() => new Date()),
  },
  (table) => ({
    parentCommentReference: foreignKey({
      columns: [table.parentCommentId],
      foreignColumns: [table.id],
    }).onDelete('cascade'),
  })
);

export const projectAssignments = pgTable('project_assignments', {
  id: varchar('id', { length: 255 })
    .primaryKey()
    .$defaultFn(() => createId()),
  projectId: varchar('projectId', { length: 255 })
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  userId: varchar('userId', { length: 255 })
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  task: projectAssignmentTaskEnum('task').notNull(),
  status: projectAssignmentStatusEnum('status').notNull().default('pending'),
  dueAt: timestamp('dueAt', { mode: 'date' }),
  completedAt: timestamp('completedAt', { mode: 'date' }),
  createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
});

export const workflowLogs = pgTable('workflow_logs', {
  id: varchar('id', { length: 255 })
    .primaryKey()
    .$defaultFn(() => createId()),
  projectId: varchar('projectId', { length: 255 })
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  userId: varchar('userId', { length: 255 }).references(() => users.id, { onDelete: 'set null' }),
  eventType: workflowEventTypeEnum('eventType').notNull(),
  step: projectStepEnum('step'),
  provider: workflowProviderEnum('provider'),
  errorCode: varchar('errorCode', { length: 100 }),
  errorMessage: text('errorMessage'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
});

export const abTests = pgTable('ab_tests', {
  id: varchar('id', { length: 255 })
    .primaryKey()
    .$defaultFn(() => createId()),
  projectId: varchar('projectId', { length: 255 })
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  status: abTestStatusEnum('status').notNull().default('draft'),
  startedAt: timestamp('startedAt', { mode: 'date' }),
  endedAt: timestamp('endedAt', { mode: 'date' }),
  createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
});

export const abTestVariants = pgTable('ab_test_variants', {
  id: varchar('id', { length: 255 })
    .primaryKey()
    .$defaultFn(() => createId()),
  abTestId: varchar('abTestId', { length: 255 })
    .notNull()
    .references(() => abTests.id, { onDelete: 'cascade' }),
  finalVideoId: varchar('finalVideoId', { length: 255 })
    .notNull()
    .references(() => finalVideos.id, { onDelete: 'cascade' }),
  variantName: varchar('variantName', { length: 20 }).notNull(),
  weight: integer('weight').default(50),
  isControl: boolean('isControl').notNull().default(false),
  createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
});
