import { relations } from 'drizzle-orm';
import { accounts, sessions, users, verificationTokens } from './users';
import { invitations, organizationMembers, organizations } from './organizations';
import {
  captions,
  finalVideos,
  mediaAssets,
  musicTracks,
  products,
  projects,
  scenes,
  scripts,
} from './projects';
import { usageRecords } from './usage';
import { socialAccounts, socialPosts, postAnalytics, postScheduleQueue } from './social';
import {
  credits,
  creditTransactions,
  invoices,
  paymentMethods,
  subscriptionPlans,
  subscriptions,
} from './billing';
import { organizationSettings, templateUsage, templates, userPreferences } from './preferences';
import {
  abTests,
  abTestVariants,
  projectAssignments,
  projectComments,
  sceneVersions,
  scriptVersions,
  workflowLogs,
} from './workflow';
import { assetLibraries, libraryAssets } from './assets';
import { analyticsReports, apiKeys, auditLogs, dataRetentionPolicies, notifications } from './analytics';
import { integrationConfigs, referrals, resourceTags, tags, webhookDeliveries, webhooks } from './extensions';

export const usersRelations = relations(users, ({ many, one }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  organizationMembers: many(organizationMembers),
  ownedOrganizations: many(organizations, { relationName: 'ownedOrganizations' }),
  invitationsSent: many(invitations, { relationName: 'invitationsSent' }),
  projectsCreated: many(projects, { relationName: 'projectsCreated' }),
  userPreferences: one(userPreferences),
  creditTransactions: many(creditTransactions),
  projectComments: many(projectComments),
  projectAssignments: many(projectAssignments),
  scriptVersions: many(scriptVersions),
  sceneVersions: many(sceneVersions),
  workflowLogs: many(workflowLogs),
  auditLogs: many(auditLogs),
  notifications: many(notifications),
  apiKeys: many(apiKeys),
  referralsMade: many(referrals, { relationName: 'referralsMade' }),
  referralsReceived: many(referrals, { relationName: 'referralsReceived' }),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const organizationsRelations = relations(organizations, ({ many, one }) => ({
  owner: one(users, { fields: [organizations.ownerId], references: [users.id], relationName: 'ownedOrganizations' }),
  members: many(organizationMembers),
  invitations: many(invitations),
  projects: many(projects),
  subscriptions: many(subscriptions),
  paymentMethods: many(paymentMethods),
  invoices: many(invoices),
  credits: many(credits),
  usageRecords: many(usageRecords),
  socialAccounts: many(socialAccounts),
  organizationSettings: many(organizationSettings),
  templates: many(templates),
  assetLibraries: many(assetLibraries),
  analyticsReports: many(analyticsReports),
  auditLogs: many(auditLogs),
  apiKeys: many(apiKeys),
  dataRetentionPolicies: many(dataRetentionPolicies),
  webhooks: many(webhooks),
  integrationConfigs: many(integrationConfigs),
  musicTracks: many(musicTracks),
  tags: many(tags),
}));

export const organizationMembersRelations = relations(organizationMembers, ({ one }) => ({
  user: one(users, { fields: [organizationMembers.userId], references: [users.id] }),
  organization: one(organizations, { fields: [organizationMembers.organizationId], references: [organizations.id] }),
}));

export const invitationsRelations = relations(invitations, ({ one }) => ({
  organization: one(organizations, { fields: [invitations.organizationId], references: [organizations.id] }),
  invitedBy: one(users, {
    fields: [invitations.invitedById],
    references: [users.id],
    relationName: 'invitationsSent',
  }),
}));

export const projectsRelations = relations(projects, ({ many, one }) => ({
  organization: one(organizations, { fields: [projects.organizationId], references: [organizations.id] }),
  creator: one(users, { fields: [projects.creatorId], references: [users.id], relationName: 'projectsCreated' }),
  products: many(products),
  scripts: many(scripts),
  scenes: many(scenes),
  mediaAssets: many(mediaAssets),
  captions: many(captions),
  finalVideos: many(finalVideos),
  usageRecords: many(usageRecords),
  templateUsage: many(templateUsage),
  projectComments: many(projectComments),
  projectAssignments: many(projectAssignments),
  scriptVersions: many(scriptVersions),
  sceneVersions: many(sceneVersions),
  workflowLogs: many(workflowLogs),
  abTests: many(abTests),
}));

export const productsRelations = relations(products, ({ one }) => ({
  project: one(projects, { fields: [products.projectId], references: [projects.id] }),
}));

export const scriptsRelations = relations(scripts, ({ many, one }) => ({
  project: one(projects, { fields: [scripts.projectId], references: [projects.id] }),
  scenes: many(scenes),
  versions: many(scriptVersions),
}));

export const scenesRelations = relations(scenes, ({ many, one }) => ({
  project: one(projects, { fields: [scenes.projectId], references: [projects.id] }),
  script: one(scripts, { fields: [scenes.scriptId], references: [scripts.id] }),
  mediaAssets: many(mediaAssets),
  versions: many(sceneVersions),
  captions: many(captions),
}));

export const captionsRelations = relations(captions, ({ one }) => ({
  project: one(projects, { fields: [captions.projectId], references: [projects.id] }),
  scene: one(scenes, { fields: [captions.sceneId], references: [scenes.id] }),
}));

export const mediaAssetsRelations = relations(mediaAssets, ({ one }) => ({
  project: one(projects, { fields: [mediaAssets.projectId], references: [projects.id] }),
  scene: one(scenes, { fields: [mediaAssets.sceneId], references: [scenes.id] }),
  libraryAsset: one(libraryAssets, { fields: [mediaAssets.libraryAssetId], references: [libraryAssets.id] }),
}));

export const musicTracksRelations = relations(musicTracks, ({ one }) => ({
  organization: one(organizations, { fields: [musicTracks.organizationId], references: [organizations.id] }),
}));

export const finalVideosRelations = relations(finalVideos, ({ many, one }) => ({
  project: one(projects, { fields: [finalVideos.projectId], references: [projects.id] }),
  variantOf: one(finalVideos, { fields: [finalVideos.variantOf], references: [finalVideos.id], relationName: 'videoVariants' }),
  variants: many(finalVideos, { relationName: 'videoVariants' }),
  socialPosts: many(socialPosts),
  abTestVariants: many(abTestVariants),
}));

export const usageRecordsRelations = relations(usageRecords, ({ one }) => ({
  organization: one(organizations, { fields: [usageRecords.organizationId], references: [organizations.id] }),
  project: one(projects, { fields: [usageRecords.projectId], references: [projects.id] }),
  user: one(users, { fields: [usageRecords.userId], references: [users.id] }),
}));

export const socialAccountsRelations = relations(socialAccounts, ({ many, one }) => ({
  organization: one(organizations, { fields: [socialAccounts.organizationId], references: [organizations.id] }),
  socialPosts: many(socialPosts),
}));

export const socialPostsRelations = relations(socialPosts, ({ many, one }) => ({
  finalVideo: one(finalVideos, { fields: [socialPosts.finalVideoId], references: [finalVideos.id] }),
  socialAccount: one(socialAccounts, { fields: [socialPosts.socialAccountId], references: [socialAccounts.id] }),
  analytics: many(postAnalytics),
  scheduleQueue: many(postScheduleQueue),
}));

export const postAnalyticsRelations = relations(postAnalytics, ({ one }) => ({
  socialPost: one(socialPosts, { fields: [postAnalytics.socialPostId], references: [socialPosts.id] }),
}));

export const postScheduleQueueRelations = relations(postScheduleQueue, ({ one }) => ({
  socialPost: one(socialPosts, { fields: [postScheduleQueue.socialPostId], references: [socialPosts.id] }),
}));

export const subscriptionPlansRelations = relations(subscriptionPlans, ({ many }) => ({
  subscriptions: many(subscriptions),
}));

export const subscriptionsRelations = relations(subscriptions, ({ many, one }) => ({
  organization: one(organizations, { fields: [subscriptions.organizationId], references: [organizations.id] }),
  plan: one(subscriptionPlans, { fields: [subscriptions.planId], references: [subscriptionPlans.id] }),
  invoices: many(invoices),
}));

export const paymentMethodsRelations = relations(paymentMethods, ({ one }) => ({
  organization: one(organizations, { fields: [paymentMethods.organizationId], references: [organizations.id] }),
}));

export const invoicesRelations = relations(invoices, ({ one }) => ({
  organization: one(organizations, { fields: [invoices.organizationId], references: [organizations.id] }),
  subscription: one(subscriptions, { fields: [invoices.subscriptionId], references: [subscriptions.id] }),
}));

export const creditsRelations = relations(credits, ({ one }) => ({
  organization: one(organizations, { fields: [credits.organizationId], references: [organizations.id] }),
}));

export const creditTransactionsRelations = relations(creditTransactions, ({ one }) => ({
  organization: one(organizations, {
    fields: [creditTransactions.organizationId],
    references: [organizations.id],
  }),
  user: one(users, { fields: [creditTransactions.userId], references: [users.id] }),
  usageRecord: one(usageRecords, {
    fields: [creditTransactions.relatedUsageRecordId],
    references: [usageRecords.id],
  }),
}));

export const userPreferencesRelations = relations(userPreferences, ({ one }) => ({
  user: one(users, { fields: [userPreferences.userId], references: [users.id] }),
}));

export const organizationSettingsRelations = relations(organizationSettings, ({ one }) => ({
  organization: one(organizations, {
    fields: [organizationSettings.organizationId],
    references: [organizations.id],
  }),
}));

export const templatesRelations = relations(templates, ({ many, one }) => ({
  organization: one(organizations, { fields: [templates.organizationId], references: [organizations.id] }),
  usage: many(templateUsage),
}));

export const templateUsageRelations = relations(templateUsage, ({ one }) => ({
  template: one(templates, { fields: [templateUsage.templateId], references: [templates.id] }),
  project: one(projects, { fields: [templateUsage.projectId], references: [projects.id] }),
}));

export const scriptVersionsRelations = relations(scriptVersions, ({ one }) => ({
  script: one(scripts, { fields: [scriptVersions.scriptId], references: [scripts.id] }),
  project: one(projects, { fields: [scriptVersions.projectId], references: [projects.id] }),
  createdBy: one(users, { fields: [scriptVersions.createdById], references: [users.id] }),
}));

export const sceneVersionsRelations = relations(sceneVersions, ({ one }) => ({
  scene: one(scenes, { fields: [sceneVersions.sceneId], references: [scenes.id] }),
  project: one(projects, { fields: [sceneVersions.projectId], references: [projects.id] }),
  createdBy: one(users, { fields: [sceneVersions.createdById], references: [users.id] }),
}));

export const projectCommentsRelations = relations(projectComments, ({ one, many }) => ({
  project: one(projects, { fields: [projectComments.projectId], references: [projects.id] }),
  user: one(users, { fields: [projectComments.userId], references: [users.id] }),
  parent: one(projectComments, {
    fields: [projectComments.parentCommentId],
    references: [projectComments.id],
    relationName: 'commentThreads',
  }),
  replies: many(projectComments, { relationName: 'commentThreads' }),
}));

export const projectAssignmentsRelations = relations(projectAssignments, ({ one }) => ({
  project: one(projects, { fields: [projectAssignments.projectId], references: [projects.id] }),
  user: one(users, { fields: [projectAssignments.userId], references: [users.id] }),
}));

export const workflowLogsRelations = relations(workflowLogs, ({ one }) => ({
  project: one(projects, { fields: [workflowLogs.projectId], references: [projects.id] }),
  user: one(users, { fields: [workflowLogs.userId], references: [users.id] }),
}));

export const abTestsRelations = relations(abTests, ({ many, one }) => ({
  project: one(projects, { fields: [abTests.projectId], references: [projects.id] }),
  variants: many(abTestVariants),
}));

export const abTestVariantsRelations = relations(abTestVariants, ({ one }) => ({
  abTest: one(abTests, { fields: [abTestVariants.abTestId], references: [abTests.id] }),
  finalVideo: one(finalVideos, { fields: [abTestVariants.finalVideoId], references: [finalVideos.id] }),
}));

export const assetLibrariesRelations = relations(assetLibraries, ({ many, one }) => ({
  organization: one(organizations, { fields: [assetLibraries.organizationId], references: [organizations.id] }),
  assets: many(libraryAssets),
}));

export const libraryAssetsRelations = relations(libraryAssets, ({ many, one }) => ({
  library: one(assetLibraries, { fields: [libraryAssets.libraryId], references: [assetLibraries.id] }),
  createdBy: one(users, { fields: [libraryAssets.createdById], references: [users.id] }),
  mediaAssets: many(mediaAssets),
}));

export const analyticsReportsRelations = relations(analyticsReports, ({ one }) => ({
  organization: one(organizations, { fields: [analyticsReports.organizationId], references: [organizations.id] }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  organization: one(organizations, { fields: [auditLogs.organizationId], references: [organizations.id] }),
  user: one(users, { fields: [auditLogs.userId], references: [users.id] }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
}));

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  organization: one(organizations, { fields: [apiKeys.organizationId], references: [organizations.id] }),
  createdBy: one(users, { fields: [apiKeys.createdById], references: [users.id] }),
}));

export const dataRetentionPoliciesRelations = relations(dataRetentionPolicies, ({ one }) => ({
  organization: one(organizations, {
    fields: [dataRetentionPolicies.organizationId],
    references: [organizations.id],
  }),
}));

export const tagsRelations = relations(tags, ({ many, one }) => ({
  organization: one(organizations, { fields: [tags.organizationId], references: [organizations.id] }),
  resourceTags: many(resourceTags),
}));

export const resourceTagsRelations = relations(resourceTags, ({ one }) => ({
  tag: one(tags, { fields: [resourceTags.tagId], references: [tags.id] }),
}));

export const referralsRelations = relations(referrals, ({ one }) => ({
  referrer: one(users, {
    fields: [referrals.referrerId],
    references: [users.id],
    relationName: 'referralsMade',
  }),
  referredUser: one(users, {
    fields: [referrals.referredUserId],
    references: [users.id],
    relationName: 'referralsReceived',
  }),
}));

export const webhooksRelations = relations(webhooks, ({ many, one }) => ({
  organization: one(organizations, { fields: [webhooks.organizationId], references: [organizations.id] }),
  deliveries: many(webhookDeliveries),
}));

export const webhookDeliveriesRelations = relations(webhookDeliveries, ({ one }) => ({
  webhook: one(webhooks, { fields: [webhookDeliveries.webhookId], references: [webhooks.id] }),
}));

export const integrationConfigsRelations = relations(integrationConfigs, ({ one }) => ({
  organization: one(organizations, {
    fields: [integrationConfigs.organizationId],
    references: [organizations.id],
  }),
}));

export const verificationTokensRelations = relations(verificationTokens, () => ({}));
