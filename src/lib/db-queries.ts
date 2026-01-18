/**
 * Database Queries
 * Reusable database query functions with proper error handling
 */

import {
  projects,
  products,
  scripts,
  scenes,
  mediaAssets,
  finalVideos,
  organizations,
  organizationMembers,
  invitations,
  users,
  subscriptions,
  subscriptionPlans,
  credits,
  creditTransactions,
  invoices,
  usageRecords,
  tiktokShopProducts,
  tiktokShopVideos,
  tiktokShopLiveStreams,
  tiktokShopCreators,
  tiktokShopEngagement,
  tiktokShopRefreshQueue,
} from '@/db/schema';
import { eq, and, desc, isNull, or, sql, gte, lte, lt } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';

// Lazy import to avoid database initialization during build
let db: any = null;
const getDb = async () => {
  if (!db) {
    const { db: dbInstance } = await import('@/db');
    db = dbInstance;
  }
  return db;
};

// Project Queries

export async function createProject(data: {
  name: string;
  organizationId: string;
  creatorId: string;
}) {
  const db = await getDb();
  const [project] = await db.insert(projects).values({
    id: createId(),
    name: data.name,
    organizationId: data.organizationId,
    creatorId: data.creatorId,
    currentStep: 'product',
    createdAt: new Date(),
  }).returning();

  return project;
}

export async function ensureDefaultOrganization(
  userId: string,
  organizationId: string
) {
  if (organizationId !== 'default-org') {
    return;
  }

  const db = await getDb();
  const [organization] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);

  if (!organization) {
    await db.insert(organizations).values({
      id: organizationId,
      name: 'Default Organization',
      slug: 'default-org',
      ownerId: userId,
      createdAt: new Date(),
    });
  }

  const [member] = await db
    .select()
    .from(organizationMembers)
    .where(and(
      eq(organizationMembers.userId, userId),
      eq(organizationMembers.organizationId, organizationId)
    ))
    .limit(1);

  if (!member) {
    await db.insert(organizationMembers).values({
      userId,
      organizationId,
      role: 'owner',
    });
  }
}

// Onboarding Helpers

export async function needsOnboarding(userId: string): Promise<boolean> {
  const db = await getDb();
  const [user] = await db
    .select({
      name: users.name,
      activeOrganizationId: users.activeOrganizationId,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    return false;
  }

  // User needs onboarding if they have no name OR have default-org as active organization
  return !user.name || user.activeOrganizationId === 'default-org';
}

export async function completeOnboarding(
  userId: string,
  name: string,
  organizationName: string
) {
  const db = await getDb();

  // Generate slug from organization name (same logic as create organization API)
  let slug = organizationName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  // If slug is empty after cleaning, generate a fallback
  if (!slug) {
    slug = `org-${createId().slice(0, 8)}`;
  }

  // Check if slug already exists and append a number if needed
  let finalSlug = slug;
  let counter = 1;
  while (true) {
    const [existing] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.slug, finalSlug))
      .limit(1);

    if (!existing) {
      break;
    }
    finalSlug = `${slug}-${counter}`;
    counter++;
  }

  // Update user's name
  await db
    .update(users)
    .set({ name, updatedAt: new Date() })
    .where(eq(users.id, userId));

  // Create new organization
  const [organization] = await db.insert(organizations).values({
    id: createId(),
    name: organizationName,
    slug: finalSlug,
    ownerId: userId,
    createdAt: new Date(),
  }).returning();

  // Add owner as member with 'owner' role
  await db.insert(organizationMembers).values({
    userId,
    organizationId: organization.id,
    role: 'owner',
  });

  // Migrate any projects from default-org to new organization
  await db
    .update(projects)
    .set({
      organizationId: organization.id,
      updatedAt: new Date(),
    })
    .where(eq(projects.organizationId, 'default-org'));

  // Switch user's active organization to the new one
  await db
    .update(users)
    .set({
      activeOrganizationId: organization.id,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  return organization;
}

export async function getProject(projectId: string) {
  const db = await getDb();
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  return project;
}

export async function getProjectsByOrganization(organizationId: string) {
  const db = await getDb();
  return await db
    .select()
    .from(projects)
    .where(eq(projects.organizationId, organizationId))
    .orderBy(desc(projects.createdAt));
}

export async function updateProjectStep(projectId: string, step: string) {
  const db = await getDb();
  const [updated] = await db
    .update(projects)
    .set({ currentStep: step, updatedAt: new Date() })
    .where(eq(projects.id, projectId))
    .returning();

  return updated;
}

export async function updateProjectStyle(projectId: string, style: string) {
  const db = await getDb();
  const [updated] = await db
    .update(projects)
    .set({ adStyle: style as any, updatedAt: new Date() })
    .where(eq(projects.id, projectId))
    .returning();

  return updated;
}

export async function updateProjectSettings(projectId: string, settings: any) {
  const db = await getDb();
  const [updated] = await db
    .update(projects)
    .set({ settings, updatedAt: new Date() })
    .where(eq(projects.id, projectId))
    .returning();

  return updated;
}

export async function updateProjectProductUrl(projectId: string, productUrl: string) {
  const db = await getDb();
  const [updated] = await db
    .update(projects)
    .set({ productUrl, updatedAt: new Date() })
    .where(eq(projects.id, projectId))
    .returning();

  return updated;
}

// Product Queries

/**
 * Parse price string to number or null
 * Handles "N/A", empty strings, and invalid values
 */
function parsePrice(price?: string): string | null {
  if (!price) return null;
  
  // Remove common currency symbols and whitespace
  const cleaned = price.trim().replace(/[$€£¥,]/g, '');
  
  // Check for invalid values
  if (cleaned === '' || cleaned.toUpperCase() === 'N/A' || cleaned.toUpperCase() === 'NA' || cleaned === '-') {
    return null;
  }
  
  // Try to parse as number
  const parsed = parseFloat(cleaned);
  if (isNaN(parsed) || !isFinite(parsed)) {
    return null;
  }
  
  // Return as string with 2 decimal places for decimal field
  return parsed.toFixed(2);
}

export async function createProduct(data: {
  projectId: string;
  name: string;
  description?: string;
  price?: string;
  originalPrice?: string;
  currency?: string;
  category?: string;
  soldCount?: number;
  images?: string[];
  features?: string[];
  benefits?: string[];
  url?: string;
}) {
  const db = await getDb();
  
  // Ensure all fields from LLM extraction are properly saved
  // Description: preserve empty strings (they're valid), only null if undefined
  // Features/Benefits: save arrays if they have items, null if empty/undefined
  const [product] = await db.insert(products).values({
    id: createId(),
    projectId: data.projectId,
    name: data.name,
    // Preserve description - save empty string if provided, null only if undefined
    description: data.description !== undefined ? (data.description || null) : null,
    price: parsePrice(data.price),
    originalPrice: parsePrice(data.originalPrice),
    currency: data.currency || null,
    category: data.category || null,
    soldCount: data.soldCount || null,
    // Save arrays if they have content, null if empty or undefined
    // This ensures all LLM-extracted features and benefits are preserved
    images: data.images !== undefined ? (data.images.length > 0 ? data.images : null) : null,
    features: data.features !== undefined ? (data.features.length > 0 ? data.features : null) : null,
    benefits: data.benefits !== undefined ? (data.benefits.length > 0 ? data.benefits : null) : null,
    url: data.url || null,
  }).returning();

  return product;
}

export async function updateProductByProject(
  projectId: string,
  data: {
    name?: string;
    description?: string;
    price?: string;
    originalPrice?: string;
    currency?: string;
    category?: string;
    soldCount?: number;
    images?: string[];
    features?: string[];
    benefits?: string[];
    url?: string;
  }
) {
  const db = await getDb();
  
  // Process data to handle empty arrays for JSONB fields and price parsing
  const updateData: any = {
    ...data,
    updatedAt: new Date(),
  };
  
  // Parse price fields if provided
  if (updateData.price !== undefined) {
    updateData.price = parsePrice(updateData.price);
  }
  if (updateData.originalPrice !== undefined) {
    updateData.originalPrice = parsePrice(updateData.originalPrice);
  }
  
  // Convert empty arrays to null for JSONB fields
  if (updateData.images !== undefined) {
    updateData.images = updateData.images && updateData.images.length > 0 ? updateData.images : null;
  }
  if (updateData.features !== undefined) {
    updateData.features = updateData.features && updateData.features.length > 0 ? updateData.features : null;
  }
  if (updateData.benefits !== undefined) {
    updateData.benefits = updateData.benefits && updateData.benefits.length > 0 ? updateData.benefits : null;
  }
  
  const [product] = await db
    .update(products)
    .set(updateData)
    .where(eq(products.projectId, projectId))
    .returning();

  return product;
}

export async function getProductByProject(projectId: string) {
  const db = await getDb();
  const [product] = await db
    .select()
    .from(products)
    .where(eq(products.projectId, projectId))
    .limit(1);

  return product;
}

// Script Queries

export async function createScript(data: {
  projectId: string;
  content: string;
  isSelected?: boolean;
}) {
  const db = await getDb();
  const [script] = await db.insert(scripts).values({
    id: createId(),
    projectId: data.projectId,
    content: data.content,
    isSelected: data.isSelected ?? false,
    createdAt: new Date(),
  }).returning();

  return script;
}

export async function getScriptsByProject(projectId: string) {
  const db = await getDb();
  return await db
    .select()
    .from(scripts)
    .where(eq(scripts.projectId, projectId))
    .orderBy(desc(scripts.createdAt));
}

export async function getSelectedScriptByProject(projectId: string) {
  const db = await getDb();
  const [script] = await db
    .select()
    .from(scripts)
    .where(and(eq(scripts.projectId, projectId), eq(scripts.isSelected, true)))
    .limit(1);

  return script;
}

export async function getScriptById(projectId: string, scriptId: string) {
  const db = await getDb();
  const [script] = await db
    .select()
    .from(scripts)
    .where(and(eq(scripts.projectId, projectId), eq(scripts.id, scriptId)))
    .limit(1);

  return script;
}

export async function selectScript(scriptId: string, projectId: string) {
  const db = await getDb();
  // Deselect all scripts for this project
  await db
    .update(scripts)
    .set({ isSelected: false })
    .where(eq(scripts.projectId, projectId));

  // Select the chosen script
  const [selected] = await db
    .update(scripts)
    .set({ isSelected: true })
    .where(eq(scripts.id, scriptId))
    .returning();

  return selected;
}

export async function updateScript(scriptId: string, data: { isSelected?: boolean; metadata?: any }) {
  const db = await getDb();
  const [updated] = await db
    .update(scripts)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(scripts.id, scriptId))
    .returning();

  return updated;
}

// Scene Queries

export async function createScene(data: {
  projectId: string;
  sceneNumber: number;
  scriptText: string;
  visualDescription: string;
  scriptId?: string;
}) {
  const db = await getDb();
  const [scene] = await db.insert(scenes).values({
    id: createId(),
    projectId: data.projectId,
    sceneNumber: data.sceneNumber,
    scriptText: data.scriptText,
    visualDescription: data.visualDescription,
    scriptId: data.scriptId || null,
    createdAt: new Date(),
  }).returning();

  return scene;
}

export async function getScenesByProject(projectId: string) {
  const db = await getDb();
  return await db
    .select()
    .from(scenes)
    .where(eq(scenes.projectId, projectId))
    .orderBy(scenes.sceneNumber);
}

export async function deleteScenesByProject(projectId: string) {
  const db = await getDb();
  await db.delete(scenes).where(eq(scenes.projectId, projectId));
}

export async function getScenesByScript(projectId: string, scriptId: string | null) {
  const db = await getDb();
  if (scriptId) {
    return await db
      .select()
      .from(scenes)
      .where(and(
        eq(scenes.projectId, projectId),
        eq(scenes.scriptId, scriptId)
      ))
      .orderBy(scenes.sceneNumber);
  } else {
    return await db
      .select()
      .from(scenes)
      .where(eq(scenes.projectId, projectId))
      .orderBy(scenes.sceneNumber);
  }
}

// Media Asset Queries

export async function createMediaAsset(data: {
  projectId: string;
  sceneId?: string;
  type: 'image' | 'video_clip' | 'voiceover' | 'music';
  url: string;
  metadata?: any;
}) {
  const db = await getDb();
  const [asset] = await db.insert(mediaAssets).values({
    id: createId(),
    projectId: data.projectId,
    sceneId: data.sceneId,
    type: data.type,
    url: data.url,
    metadata: data.metadata,
    createdAt: new Date(),
  }).returning();

  return asset;
}

export async function getMediaAssetsByProject(projectId: string, type?: string) {
  const db = await getDb();
  if (type) {
    return await db
      .select()
      .from(mediaAssets)
      .where(and(
        eq(mediaAssets.projectId, projectId),
        eq(mediaAssets.type, type as any)
      ))
      .orderBy(desc(mediaAssets.createdAt));
  }

  return await db
    .select()
    .from(mediaAssets)
    .where(eq(mediaAssets.projectId, projectId))
    .orderBy(desc(mediaAssets.createdAt));
}

export async function getMediaAssetsByScene(sceneId: string) {
  const db = await getDb();
  return await db
    .select()
    .from(mediaAssets)
    .where(eq(mediaAssets.sceneId, sceneId!))
    .orderBy(desc(mediaAssets.createdAt));
}

// Final Video Queries

export async function createFinalVideo(data: {
  projectId: string;
  url: string;
  durationSeconds?: number;
  resolution?: string;
  metadata?: any;
}) {
  const db = await getDb();
  const [video] = await db.insert(finalVideos).values({
    id: createId(),
    projectId: data.projectId,
    url: data.url,
    durationSeconds: data.durationSeconds,
    resolution: data.resolution,
    metadata: data.metadata,
    createdAt: new Date(),
  }).returning();

  return video;
}

export async function getFinalVideosByProject(projectId: string) {
  const db = await getDb();
  return await db
    .select()
    .from(finalVideos)
    .where(eq(finalVideos.projectId, projectId))
    .orderBy(desc(finalVideos.createdAt));
}

export async function getFinalVideo(videoId: string) {
  const db = await getDb();
  const [video] = await db
    .select({
      id: finalVideos.id,
      projectId: finalVideos.projectId,
      variantOf: finalVideos.variantOf,
      url: finalVideos.url,
      durationSeconds: finalVideos.durationSeconds,
      resolution: finalVideos.resolution,
      metadata: finalVideos.metadata,
      createdAt: finalVideos.createdAt,
      updatedAt: finalVideos.updatedAt,
      project: {
        id: projects.id,
        name: projects.name,
        organizationId: projects.organizationId,
        status: projects.status,
        currentStep: projects.currentStep,
      },
    })
    .from(finalVideos)
    .innerJoin(projects, eq(finalVideos.projectId, projects.id))
    .where(
      and(
        eq(finalVideos.id, videoId),
        isNull(finalVideos.deletedAt),
        isNull(projects.deletedAt)
      )
    )
    .limit(1);

  return video || null;
}

export async function getFinalVideosByOrganization(organizationId: string) {
  const db = await getDb();
  return await db
    .select({
      id: finalVideos.id,
      projectId: finalVideos.projectId,
      variantOf: finalVideos.variantOf,
      url: finalVideos.url,
      durationSeconds: finalVideos.durationSeconds,
      resolution: finalVideos.resolution,
      metadata: finalVideos.metadata,
      createdAt: finalVideos.createdAt,
      updatedAt: finalVideos.updatedAt,
      project: {
        id: projects.id,
        name: projects.name,
        organizationId: projects.organizationId,
        status: projects.status,
        currentStep: projects.currentStep,
      },
    })
    .from(finalVideos)
    .innerJoin(projects, eq(finalVideos.projectId, projects.id))
    .where(
      and(
        eq(projects.organizationId, organizationId),
        isNull(finalVideos.deletedAt),
        isNull(projects.deletedAt)
      )
    )
    .orderBy(desc(finalVideos.createdAt));
}

// Organization Queries

export async function getUserOrganizations(userId: string) {
  const db = await getDb();
  return await db
    .select({
      organization: organizations,
      role: organizationMembers.role,
    })
    .from(organizationMembers)
    .innerJoin(organizations, eq(organizationMembers.organizationId, organizations.id))
    .where(eq(organizationMembers.userId, userId))
    .orderBy(desc(organizations.createdAt));
}

export async function getOrganizationMembers(organizationId: string) {
  const db = await getDb();
  return await db
    .select()
    .from(organizationMembers)
    .where(eq(organizationMembers.organizationId, organizationId));
}

export async function checkUserOrganizationAccess(userId: string, organizationId: string) {
  const db = await getDb();
  const [member] = await db
    .select()
    .from(organizationMembers)
    .where(and(
      eq(organizationMembers.userId, userId),
      eq(organizationMembers.organizationId, organizationId)
    ))
    .limit(1);

  return member;
}

// Organization Management Queries

export async function createOrganization(data: {
  name: string;
  slug: string;
  ownerId: string;
}) {
  const db = await getDb();
  
  // Create organization
  const [organization] = await db.insert(organizations).values({
    id: createId(),
    name: data.name,
    slug: data.slug,
    ownerId: data.ownerId,
    createdAt: new Date(),
  }).returning();

  // Add owner as member with 'owner' role
  await db.insert(organizationMembers).values({
    userId: data.ownerId,
    organizationId: organization.id,
    role: 'owner',
  });

  return organization;
}

export async function getOrganizationById(organizationId: string) {
  const db = await getDb();
  const [organization] = await db
    .select()
    .from(organizations)
    .where(and(
      eq(organizations.id, organizationId),
      isNull(organizations.deletedAt)
    ))
    .limit(1);

  return organization;
}

export async function getOrganizationWithMembers(organizationId: string) {
  const db = await getDb();
  
  const [organization] = await db
    .select()
    .from(organizations)
    .where(and(
      eq(organizations.id, organizationId),
      isNull(organizations.deletedAt)
    ))
    .limit(1);

  if (!organization) return null;

  const membersList = await db
    .select({
      userId: organizationMembers.userId,
      role: organizationMembers.role,
      user: {
        id: users.id,
        name: users.name,
        email: users.email,
        image: users.image,
      },
    })
    .from(organizationMembers)
    .innerJoin(users, eq(organizationMembers.userId, users.id))
    .where(eq(organizationMembers.organizationId, organizationId));

  return {
    organization,
    members: membersList,
  };
}

export async function updateOrganization(organizationId: string, data: {
  name?: string;
  slug?: string;
}) {
  const db = await getDb();
  const [updated] = await db
    .update(organizations)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(organizations.id, organizationId))
    .returning();

  return updated;
}

export async function deleteOrganization(organizationId: string) {
  const db = await getDb();
  const [deleted] = await db
    .update(organizations)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(organizations.id, organizationId))
    .returning();

  return deleted;
}

export async function addOrganizationMember(data: {
  userId: string;
  organizationId: string;
  role: 'owner' | 'admin' | 'member';
}) {
  const db = await getDb();
  
  // Check if member already exists
  const [existing] = await db
    .select()
    .from(organizationMembers)
    .where(and(
      eq(organizationMembers.userId, data.userId),
      eq(organizationMembers.organizationId, data.organizationId)
    ))
    .limit(1);

  if (existing) {
    throw new Error('User is already a member of this organization');
  }

  const [member] = await db.insert(organizationMembers).values({
    userId: data.userId,
    organizationId: data.organizationId,
    role: data.role,
  }).returning();

  return member;
}

export async function removeOrganizationMember(userId: string, organizationId: string) {
  const db = await getDb();
  await db
    .delete(organizationMembers)
    .where(and(
      eq(organizationMembers.userId, userId),
      eq(organizationMembers.organizationId, organizationId)
    ));
}

export async function updateMemberRole(
  userId: string,
  organizationId: string,
  role: 'owner' | 'admin' | 'member'
) {
  const db = await getDb();
  const [updated] = await db
    .update(organizationMembers)
    .set({ role })
    .where(and(
      eq(organizationMembers.userId, userId),
      eq(organizationMembers.organizationId, organizationId)
    ))
    .returning();

  return updated;
}

export async function createInvitation(data: {
  email: string;
  organizationId: string;
  role: 'owner' | 'admin' | 'member';
  invitedById: string;
  expiresAt?: Date;
}) {
  const db = await getDb();
  
  // Generate unique token
  const token = createId();
  
  const [invitation] = await db.insert(invitations).values({
    id: createId(),
    email: data.email,
    organizationId: data.organizationId,
    role: data.role,
    token,
    invitedById: data.invitedById,
    status: 'pending',
    expiresAt: data.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days default
    createdAt: new Date(),
  }).returning();

  return invitation;
}

export async function getInvitationsByOrganization(organizationId: string, status?: 'pending' | 'accepted' | 'declined' | 'expired') {
  const db = await getDb();
  const conditions = [eq(invitations.organizationId, organizationId)];
  
  if (status) {
    conditions.push(eq(invitations.status, status));
  }
  
  return await db
    .select()
    .from(invitations)
    .where(and(...conditions))
    .orderBy(desc(invitations.createdAt));
}

export async function getInvitationByToken(token: string) {
  const db = await getDb();
  const [invitation] = await db
    .select()
    .from(invitations)
    .where(eq(invitations.token, token))
    .limit(1);

  return invitation;
}

export async function acceptInvitation(token: string, userId: string) {
  const db = await getDb();
  
  const [invitation] = await db
    .select()
    .from(invitations)
    .where(and(
      eq(invitations.token, token),
      eq(invitations.status, 'pending')
    ))
    .limit(1);

  if (!invitation) {
    throw new Error('Invitation not found or already used');
  }

  // Check if invitation is expired
  if (invitation.expiresAt && invitation.expiresAt < new Date()) {
    await db
      .update(invitations)
      .set({ status: 'expired' })
      .where(eq(invitations.id, invitation.id));
    throw new Error('Invitation has expired');
  }

  // Check if user is already a member
  const [existingMember] = await db
    .select()
    .from(organizationMembers)
    .where(and(
      eq(organizationMembers.userId, userId),
      eq(organizationMembers.organizationId, invitation.organizationId)
    ))
    .limit(1);

  if (existingMember) {
    // Mark invitation as accepted even if user is already a member
    await db
      .update(invitations)
      .set({ status: 'accepted' })
      .where(eq(invitations.id, invitation.id));
    return existingMember;
  }

  // Add user as member
  const [member] = await db.insert(organizationMembers).values({
    userId,
    organizationId: invitation.organizationId,
    role: invitation.role,
  }).returning();

  // Update invitation status
  await db
    .update(invitations)
    .set({ status: 'accepted' })
    .where(eq(invitations.id, invitation.id));

  return member;
}

export async function declineInvitation(token: string) {
  const db = await getDb();
  const [updated] = await db
    .update(invitations)
    .set({ status: 'declined' })
    .where(and(
      eq(invitations.token, token),
      eq(invitations.status, 'pending')
    ))
    .returning();

  return updated;
}

export async function cancelInvitation(invitationId: string) {
  const db = await getDb();
  await db
    .delete(invitations)
    .where(eq(invitations.id, invitationId));
}

export async function switchActiveOrganization(userId: string, organizationId: string) {
  const db = await getDb();
  
  // Verify user is a member
  const [member] = await db
    .select()
    .from(organizationMembers)
    .where(and(
      eq(organizationMembers.userId, userId),
      eq(organizationMembers.organizationId, organizationId)
    ))
    .limit(1);

  if (!member) {
    throw new Error('User is not a member of this organization');
  }

  // Update user's active organization
  const [updated] = await db
    .update(users)
    .set({ activeOrganizationId: organizationId, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning();

  return updated;
}

export async function getOrganizationOwnerCount(organizationId: string) {
  const db = await getDb();
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(organizationMembers)
    .where(and(
      eq(organizationMembers.organizationId, organizationId),
      eq(organizationMembers.role, 'owner')
    ));

  return result[0]?.count || 0;
}

// ============================================================================
// Billing Queries
// ============================================================================

/**
 * Get active subscription for an organization
 */
export async function getSubscriptionByOrganizationId(organizationId: string) {
  const db = await getDb();
  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.organizationId, organizationId),
        or(
          eq(subscriptions.status, 'active'),
          eq(subscriptions.status, 'trialing'),
          eq(subscriptions.status, 'past_due')
        )
      )
    )
    .orderBy(desc(subscriptions.createdAt))
    .limit(1);

  return subscription || null;
}

/**
 * Get subscription plan by ID or slug
 */
export async function getSubscriptionPlan(planIdOrSlug: string) {
  const db = await getDb();
  const [plan] = await db
    .select()
    .from(subscriptionPlans)
    .where(
      or(
        eq(subscriptionPlans.id, planIdOrSlug),
        eq(subscriptionPlans.slug, planIdOrSlug)
      )
    )
    .limit(1);

  return plan || null;
}

/**
 * Create or update subscription from Stripe data
 */
export async function createOrUpdateSubscription(data: {
  organizationId: string;
  planId: string;
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'paused';
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd?: boolean;
  canceledAt?: Date;
  trialEndsAt?: Date;
}) {
  const db = await getDb();

  // Check if subscription already exists
  const [existing] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.stripeSubscriptionId, data.stripeSubscriptionId))
    .limit(1);

  if (existing) {
    const [updated] = await db
      .update(subscriptions)
      .set({
        planId: data.planId,
        status: data.status,
        stripeCustomerId: data.stripeCustomerId,
        currentPeriodStart: data.currentPeriodStart,
        currentPeriodEnd: data.currentPeriodEnd,
        cancelAtPeriodEnd: data.cancelAtPeriodEnd ?? false,
        canceledAt: data.canceledAt,
        trialEndsAt: data.trialEndsAt,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, existing.id))
      .returning();

    return updated;
  } else {
    const [created] = await db
      .insert(subscriptions)
      .values({
        id: createId(),
        organizationId: data.organizationId,
        planId: data.planId,
        stripeSubscriptionId: data.stripeSubscriptionId,
        stripeCustomerId: data.stripeCustomerId,
        status: data.status,
        currentPeriodStart: data.currentPeriodStart,
        currentPeriodEnd: data.currentPeriodEnd,
        cancelAtPeriodEnd: data.cancelAtPeriodEnd ?? false,
        canceledAt: data.canceledAt,
        trialEndsAt: data.trialEndsAt,
        createdAt: new Date(),
      })
      .returning();

    return created;
  }
}

/**
 * Get credit balance for an organization
 */
export async function getCreditBalance(organizationId: string) {
  const db = await getDb();
  const [credit] = await db
    .select()
    .from(credits)
    .where(eq(credits.organizationId, organizationId))
    .limit(1);

  if (!credit) {
    // Create default credit record
    const [created] = await db
      .insert(credits)
      .values({
        id: createId(),
        organizationId,
        balance: '0',
        lifetimePurchased: '0',
        lifetimeUsed: '0',
      })
      .returning();

    return created;
  }

  return credit;
}

/**
 * Create a credit transaction
 */
export async function createCreditTransaction(data: {
  organizationId: string;
  userId?: string;
  type: 'purchase' | 'usage' | 'refund' | 'adjustment' | 'bonus';
  amount: string; // Decimal as string
  description?: string;
  relatedUsageRecordId?: string;
  stripePaymentIntentId?: string;
}) {
  const db = await getDb();

  // Get current balance
  const credit = await getCreditBalance(data.organizationId);
  const currentBalance = parseFloat(credit.balance || '0');
  const amount = parseFloat(data.amount);
  
  // Calculate new balance based on transaction type
  let newBalance = currentBalance;
  if (data.type === 'purchase' || data.type === 'refund' || data.type === 'adjustment' || data.type === 'bonus') {
    newBalance = currentBalance + amount;
  } else if (data.type === 'usage') {
    newBalance = Math.max(0, currentBalance - amount); // Don't go negative
  }

  // Update credit balance
  const updateData: any = {
    balance: newBalance.toString(),
    updatedAt: new Date(),
  };

  if (data.type === 'purchase' || data.type === 'refund' || data.type === 'adjustment' || data.type === 'bonus') {
    updateData.lifetimePurchased = (parseFloat(credit.lifetimePurchased || '0') + Math.max(0, amount)).toString();
  }

  if (data.type === 'usage') {
    updateData.lifetimeUsed = (parseFloat(credit.lifetimeUsed || '0') + amount).toString();
  }

  await db
    .update(credits)
    .set(updateData)
    .where(eq(credits.id, credit.id));

  // Create transaction record
  const [transaction] = await db
    .insert(creditTransactions)
    .values({
      id: createId(),
      organizationId: data.organizationId,
      userId: data.userId,
      type: data.type,
      amount: data.amount,
      balanceAfter: newBalance.toString(),
      description: data.description,
      relatedUsageRecordId: data.relatedUsageRecordId,
      stripePaymentIntentId: data.stripePaymentIntentId,
      createdAt: new Date(),
    })
    .returning();

  return transaction;
}

/**
 * Update credit balance directly (for atomic operations)
 */
export async function updateCreditBalance(
  organizationId: string,
  amount: number,
  operation: 'add' | 'subtract' | 'set'
) {
  const db = await getDb();
  const credit = await getCreditBalance(organizationId);

  let newBalance: number;
  if (operation === 'add') {
    newBalance = parseFloat(credit.balance || '0') + amount;
  } else if (operation === 'subtract') {
    newBalance = Math.max(0, parseFloat(credit.balance || '0') - amount);
  } else {
    newBalance = amount;
  }

  await db
    .update(credits)
    .set({
      balance: newBalance.toString(),
      updatedAt: new Date(),
    })
    .where(eq(credits.id, credit.id));

  return newBalance;
}

/**
 * Get usage records for an organization within a date range
 */
export async function getUsageRecords(
  organizationId: string,
  startDate?: Date,
  endDate?: Date,
  type?: string
) {
  const db = await getDb();

  const conditions = [eq(usageRecords.organizationId, organizationId)];

  if (startDate) {
    conditions.push(gte(usageRecords.createdAt, startDate));
  }

  if (endDate) {
    conditions.push(lte(usageRecords.createdAt, endDate));
  }

  if (type) {
    conditions.push(eq(usageRecords.type, type as any));
  }

  const records = await db
    .select()
    .from(usageRecords)
    .where(and(...conditions))
    .orderBy(desc(usageRecords.createdAt));

  return records;
}

/**
 * Create a usage record
 */
export async function createUsageRecord(data: {
  organizationId: string;
  projectId?: string;
  userId: string;
  type: 'script_generation' | 'image_generation' | 'video_generation' | 'voiceover_generation' | 'video_render';
  units: number;
  cost?: string; // Decimal as string
  provider?: string;
  metadata?: any;
}) {
  const db = await getDb();

  const [record] = await db
    .insert(usageRecords)
    .values({
      id: createId(),
      organizationId: data.organizationId,
      projectId: data.projectId,
      userId: data.userId,
      type: data.type,
      units: data.units,
      cost: data.cost,
      provider: data.provider as any,
      metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      createdAt: new Date(),
    })
    .returning();

  return record;
}

/**
 * Check if usage is within subscription limits
 */
export async function checkSubscriptionLimits(organizationId: string) {
  const subscription = await getSubscriptionByOrganizationId(organizationId);
  
  if (!subscription) {
    return {
      hasSubscription: false,
      withinLimits: false,
      limits: null,
    };
  }

  const plan = await getSubscriptionPlan(subscription.planId);
  
  if (!plan || !plan.limits) {
    return {
      hasSubscription: true,
      withinLimits: true,
      limits: null,
      subscription,
      plan,
    };
  }

  const limits = plan.limits as any;
  const periodStart = subscription.currentPeriodStart || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default to 30 days ago
  const periodEnd = subscription.currentPeriodEnd || new Date();

  // Get usage for current period
  const usageRecords = await getUsageRecords(organizationId, periodStart, periodEnd);
  
  // Calculate total usage by type
  const usageByType: Record<string, number> = {};
  usageRecords.forEach(record => {
    usageByType[record.type] = (usageByType[record.type] || 0) + record.units;
  });

  // Check against limits (if limits are defined)
  const withinLimits = !limits.videos || !limits.videos.max || 
    (usageByType['video_render'] || 0) <= limits.videos.max;

  return {
    hasSubscription: true,
    withinLimits,
    limits,
    usage: usageByType,
    subscription,
    plan,
    periodStart,
    periodEnd,
  };
}

/**
 * Create or update invoice from Stripe data
 */
export async function createOrUpdateInvoice(data: {
  organizationId: string;
  subscriptionId?: string;
  stripeInvoiceId: string;
  number?: string;
  status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';
  amountDue?: string;
  amountPaid?: string;
  currency?: string;
  periodStart?: Date;
  periodEnd?: Date;
  dueDate?: Date;
  paidAt?: Date;
  hostedInvoiceUrl?: string;
  invoicePdf?: string;
  lineItems?: any;
}) {
  const db = await getDb();

  const [existing] = await db
    .select()
    .from(invoices)
    .where(eq(invoices.stripeInvoiceId, data.stripeInvoiceId))
    .limit(1);

  if (existing) {
    const [updated] = await db
      .update(invoices)
      .set({
        subscriptionId: data.subscriptionId,
        number: data.number,
        status: data.status,
        amountDue: data.amountDue,
        amountPaid: data.amountPaid,
        currency: data.currency,
        periodStart: data.periodStart,
        periodEnd: data.periodEnd,
        dueDate: data.dueDate,
        paidAt: data.paidAt,
        hostedInvoiceUrl: data.hostedInvoiceUrl,
        invoicePdf: data.invoicePdf,
        lineItems: data.lineItems ? JSON.stringify(data.lineItems) : null,
      })
      .where(eq(invoices.id, existing.id))
      .returning();

    return updated;
  } else {
    const [created] = await db
      .insert(invoices)
      .values({
        id: createId(),
        organizationId: data.organizationId,
        subscriptionId: data.subscriptionId,
        stripeInvoiceId: data.stripeInvoiceId,
        number: data.number,
        status: data.status,
        amountDue: data.amountDue,
        amountPaid: data.amountPaid,
        currency: data.currency || 'USD',
        periodStart: data.periodStart,
        periodEnd: data.periodEnd,
        dueDate: data.dueDate,
        paidAt: data.paidAt,
        hostedInvoiceUrl: data.hostedInvoiceUrl,
        invoicePdf: data.invoicePdf,
        lineItems: data.lineItems ? JSON.stringify(data.lineItems) : null,
        createdAt: new Date(),
      })
      .returning();

    return created;
  }
}

/**
 * Get invoices for an organization
 */
export async function getInvoicesByOrganization(organizationId: string, limit: number = 50) {
  const db = await getDb();

  const invoiceList = await db
    .select()
    .from(invoices)
    .where(eq(invoices.organizationId, organizationId))
    .orderBy(desc(invoices.createdAt))
    .limit(limit);

  return invoiceList;
}

/**
 * Get credit transactions for an organization
 */
export async function getCreditTransactionsByOrganization(organizationId: string, limit: number = 50) {
  const db = await getDb();

  const transactions = await db
    .select()
    .from(creditTransactions)
    .where(eq(creditTransactions.organizationId, organizationId))
    .orderBy(desc(creditTransactions.createdAt))
    .limit(limit);

  return transactions;
}

// TikTok Shop Queries

export async function createTikTokShopProduct(data: {
  tiktokProductId: string;
  name: string;
  description?: string;
  price?: string;
  originalPrice?: string;
  currency?: string;
  tiktokShopUrl: string;
  sellerId?: string;
  sellerName?: string;
  category?: string;
  images?: string[];
  totalViews?: number;
  totalSales?: number;
  engagementRate?: string;
  metadata?: any;
}) {
  const db = await getDb();

  const [product] = await db
    .insert(tiktokShopProducts)
    .values({
      id: createId(),
      tiktokProductId: data.tiktokProductId,
      name: data.name,
      description: data.description || null,
      price: data.price || null,
      originalPrice: data.originalPrice || null,
      currency: data.currency || 'USD',
      tiktokShopUrl: data.tiktokShopUrl,
      sellerId: data.sellerId || null,
      sellerName: data.sellerName || null,
      category: data.category || null,
      images: data.images || null,
      totalViews: data.totalViews || 0,
      totalSales: data.totalSales || 0,
      engagementRate: data.engagementRate || null,
      metadata: data.metadata || null,
      lastUpdated: new Date(),
    })
    .onConflictDoUpdate({
      target: tiktokShopProducts.tiktokProductId,
      set: {
        name: sql`EXCLUDED.name`,
        description: sql`EXCLUDED.description`,
        price: sql`EXCLUDED.price`,
        originalPrice: sql`EXCLUDED.originalPrice`,
        currency: sql`EXCLUDED.currency`,
        sellerId: sql`EXCLUDED.seller_id`,
        sellerName: sql`EXCLUDED.seller_name`,
        category: sql`EXCLUDED.category`,
        images: sql`EXCLUDED.images`,
        totalViews: sql`EXCLUDED.total_views`,
        totalSales: sql`EXCLUDED.total_sales`,
        engagementRate: sql`EXCLUDED.engagement_rate`,
        metadata: sql`EXCLUDED.metadata`,
        lastUpdated: new Date(),
        updatedAt: new Date(),
      },
    })
    .returning();

  return product;
}

export async function updateTikTokShopProduct(
  tiktokProductId: string,
  data: {
    name?: string;
    description?: string;
    price?: string;
    originalPrice?: string;
    totalViews?: number;
    totalSales?: number;
    engagementRate?: string;
    trendingScore?: string;
    metadata?: any;
  }
) {
  const db = await getDb();

  const [product] = await db
    .update(tiktokShopProducts)
    .set({
      ...data,
      lastUpdated: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(tiktokShopProducts.tiktokProductId, tiktokProductId))
    .returning();

  return product;
}

export async function getTrendingProducts(limit: number = 20) {
  const db = await getDb();

  const products = await db
    .select()
    .from(tiktokShopProducts)
    .orderBy(desc(tiktokShopProducts.trendingScore))
    .limit(limit);

  return products;
}

export async function addToRefreshQueue(data: {
  itemType: 'product' | 'video' | 'live_stream' | 'creator';
  itemId: string;
  priority?: number;
  metadata?: any;
}) {
  const db = await getDb();

  // Check if already in queue
  const existing = await db
    .select()
    .from(tiktokShopRefreshQueue)
    .where(
      and(
        eq(tiktokShopRefreshQueue.itemType, data.itemType),
        eq(tiktokShopRefreshQueue.itemId, data.itemId),
        eq(tiktokShopRefreshQueue.status, 'pending')
      )
    )
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  const [queueItem] = await db
    .insert(tiktokShopRefreshQueue)
    .values({
      id: createId(),
      itemType: data.itemType,
      itemId: data.itemId,
      priority: data.priority || 0,
      status: 'pending',
      metadata: data.metadata || null,
    })
    .returning();

  return queueItem;
}

export async function getRefreshQueueItems(limit: number = 10) {
  const db = await getDb();

  const items = await db
    .select()
    .from(tiktokShopRefreshQueue)
    .where(eq(tiktokShopRefreshQueue.status, 'pending'))
    .orderBy(desc(tiktokShopRefreshQueue.priority), desc(tiktokShopRefreshQueue.queuedAt))
    .limit(limit);

  return items;
}

export async function markItemRefreshed(queueId: string, itemType: string, itemId: string) {
  const db = await getDb();

  // Update queue item
  const [queueItem] = await db
    .update(tiktokShopRefreshQueue)
    .set({
      status: 'completed',
      completedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(tiktokShopRefreshQueue.id, queueId))
    .returning();

  // Update the actual item's lastUpdated timestamp
  const now = new Date();
  switch (itemType) {
    case 'product':
      await db
        .update(tiktokShopProducts)
        .set({ lastUpdated: now, updatedAt: now })
        .where(eq(tiktokShopProducts.id, itemId));
      break;
    case 'video':
      await db
        .update(tiktokShopVideos)
        .set({ lastUpdated: now, updatedAt: now })
        .where(eq(tiktokShopVideos.id, itemId));
      break;
    case 'live_stream':
      await db
        .update(tiktokShopLiveStreams)
        .set({ lastUpdated: now, updatedAt: now })
        .where(eq(tiktokShopLiveStreams.id, itemId));
      break;
    case 'creator':
      await db
        .update(tiktokShopCreators)
        .set({ lastUpdated: now, updatedAt: now })
        .where(eq(tiktokShopCreators.id, itemId));
      break;
  }

  return queueItem;
}

export async function findStaleTikTokShopData() {
  const db = await getDb();

  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Find stale products
  const staleProducts = await db
    .select()
    .from(tiktokShopProducts)
    .where(lt(tiktokShopProducts.lastUpdated, twentyFourHoursAgo))
    .limit(100);

  // Find stale videos
  const staleVideos = await db
    .select()
    .from(tiktokShopVideos)
    .where(lt(tiktokShopVideos.lastUpdated, twentyFourHoursAgo))
    .limit(100);

  // Find stale live streams
  const staleStreams = await db
    .select()
    .from(tiktokShopLiveStreams)
    .where(lt(tiktokShopLiveStreams.lastUpdated, twentyFourHoursAgo))
    .limit(100);

  // Find stale creators
  const staleCreators = await db
    .select()
    .from(tiktokShopCreators)
    .where(lt(tiktokShopCreators.lastUpdated, twentyFourHoursAgo))
    .limit(100);

  return {
    products: staleProducts,
    videos: staleVideos,
    liveStreams: staleStreams,
    creators: staleCreators,
  };
}

export async function createTikTokShopEngagement(data: {
  entityType: 'product' | 'video' | 'live_stream' | 'creator';
  entityId: string;
  views?: number;
  likes?: number;
  shares?: number;
  comments?: number;
  saves?: number;
  sales?: number;
  viewsGrowth?: string;
  likesGrowth?: string;
  salesGrowth?: string;
  metadata?: any;
}) {
  const db = await getDb();

  const [engagement] = await db
    .insert(tiktokShopEngagement)
    .values({
      id: createId(),
      entityType: data.entityType,
      entityId: data.entityId,
      views: data.views || null,
      likes: data.likes || null,
      shares: data.shares || null,
      comments: data.comments || null,
      saves: data.saves || null,
      sales: data.sales || null,
      viewsGrowth: data.viewsGrowth || null,
      likesGrowth: data.likesGrowth || null,
      salesGrowth: data.salesGrowth || null,
      metadata: data.metadata || null,
      measuredAt: new Date(),
    })
    .returning();

  return engagement;
}

export async function getTikTokShopProductByTikTokId(tiktokProductId: string) {
  const db = await getDb();

  const [product] = await db
    .select()
    .from(tiktokShopProducts)
    .where(eq(tiktokShopProducts.tiktokProductId, tiktokProductId))
    .limit(1);

  return product;
}
