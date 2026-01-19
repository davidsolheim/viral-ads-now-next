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
  musicTracks,
  tiktokShopProducts,
  tiktokShopVideos,
  tiktokShopLiveStreams,
  tiktokShopCreators,
  tiktokShopEngagement,
  tiktokShopRefreshQueue,
  referrals,
} from '@/db/schema';
import { eq, and, desc, isNull, or, sql, gte, lte, lt, count, like, asc, inArray } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { calculateTrendingScore } from '@/lib/tiktok-shop/recommendations';

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
  productUrl?: string;
  productId?: string;
  flowType?: 'manual' | 'automatic';
}) {
  const db = await getDb();
  const [project] = await db.insert(projects).values({
    id: createId(),
    name: data.name,
    organizationId: data.organizationId,
    creatorId: data.creatorId,
    productUrl: data.productUrl,
    productId: data.productId,
    currentStep: 'product',
    settings: {
      flowType: data.flowType || 'manual',
    },
    createdAt: new Date(),
  }).returning();

  return project;
}

export async function createProjectFromProduct(data: {
  productId: string;
  name: string;
  organizationId: string;
  creatorId: string;
  flowType?: 'manual' | 'automatic';
}) {
  const db = await getDb();
  
  // Get the product
  const product = await getProductById(data.productId);
  if (!product) {
    throw new Error('Product not found');
  }
  
  // Create project with product linked
  const project = await createProject({
    name: data.name,
    organizationId: data.organizationId,
    creatorId: data.creatorId,
    productId: data.productId,
    productUrl: product.url || undefined,
    flowType: data.flowType || 'manual',
  });
  
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
    .where(and(eq(projects.organizationId, organizationId), isNull(projects.deletedAt)))
    .orderBy(desc(projects.createdAt));
}

export async function updateProjectName(projectId: string, name: string) {
  const db = await getDb();
  const [updated] = await db
    .update(projects)
    .set({ name, updatedAt: new Date() })
    .where(eq(projects.id, projectId))
    .returning();

  return updated;
}

export async function archiveProject(projectId: string) {
  const db = await getDb();
  const [archived] = await db
    .update(projects)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(projects.id, projectId))
    .returning();

  return archived;
}

export async function unarchiveProject(projectId: string) {
  const db = await getDb();
  const [unarchived] = await db
    .update(projects)
    .set({ deletedAt: null, updatedAt: new Date() })
    .where(eq(projects.id, projectId))
    .returning();

  return unarchived;
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

export async function updateProjectStatus(
  projectId: string,
  status: 'draft' | 'in_progress' | 'completed' | 'failed'
) {
  const db = await getDb();
  const [updated] = await db
    .update(projects)
    .set({ status, updatedAt: new Date() })
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

export async function updateProjectProductId(projectId: string, productId: string | null) {
  const db = await getDb();
  const [updated] = await db
    .update(projects)
    .set({ productId, updatedAt: new Date() })
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
  userId: string;
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
  organizationId?: string;
}) {
  const db = await getDb();
  
  // Ensure all fields from LLM extraction are properly saved
  // Description: preserve empty strings (they're valid), only null if undefined
  // Features/Benefits: save arrays if they have items, null if empty/undefined
  const [product] = await db.insert(products).values({
    id: createId(),
    userId: data.userId,
    organizationId: data.organizationId || null,
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
    createdAt: new Date(),
  }).returning();

  return product;
}

export async function updateProduct(productId: string, data: {
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
}) {
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
    .where(eq(products.id, productId))
    .returning();

  return product;
}

// Legacy function for backward compatibility
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
  
  // Get product via project
  const project = await getProject(projectId);
  if (!project?.productId) {
    return null;
  }
  
  return updateProduct(project.productId, data);
}

export async function getProductByProject(projectId: string) {
  const db = await getDb();
  const project = await getProject(projectId);
  if (!project?.productId) {
    return null;
  }
  
  const [product] = await db
    .select()
    .from(products)
    .where(eq(products.id, project.productId))
    .limit(1);

  return product;
}

export async function getProductById(productId: string) {
  const db = await getDb();
  const [product] = await db
    .select()
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);

  return product;
}

export async function archiveProduct(productId: string) {
  const db = await getDb();
  const [archived] = await db
    .update(products)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(products.id, productId))
    .returning();

  return archived;
}

export async function unarchiveProduct(productId: string) {
  const db = await getDb();
  const [unarchived] = await db
    .update(products)
    .set({ deletedAt: null, updatedAt: new Date() })
    .where(eq(products.id, productId))
    .returning();

  return unarchived;
}

export async function archiveFinalVideo(videoId: string) {
  const db = await getDb();
  const [archived] = await db
    .update(finalVideos)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(finalVideos.id, videoId))
    .returning();

  return archived;
}

export async function unarchiveFinalVideo(videoId: string) {
  const db = await getDb();
  const [unarchived] = await db
    .update(finalVideos)
    .set({ deletedAt: null, updatedAt: new Date() })
    .where(eq(finalVideos.id, videoId))
    .returning();

  return unarchived;
}

export async function getProductsWithVideoInfo(productIds: string[]) {
  const db = await getDb();
  if (productIds.length === 0) return {};

  // Get all projects for these products
  const productProjects = await db
    .select({
      productId: projects.productId,
      projectId: projects.id,
      projectName: projects.name,
      projectStatus: projects.status,
      projectCreatedAt: projects.createdAt,
      projectUpdatedAt: projects.updatedAt,
    })
    .from(projects)
    .where(
      and(
        inArray(projects.productId, productIds),
        isNull(projects.deletedAt)
      )
    );

  if (productProjects.length === 0) {
    // Return empty result for all productIds
    const result: Record<string, {
      hasVideo: boolean;
      latestVideo?: { id: string; url: string; createdAt: Date | null };
      latestProject?: { id: string; name: string; status: string; updatedAt: Date | null };
    }> = {};
    for (const productId of productIds) {
      result[productId] = { hasVideo: false };
    }
    return result;
  }

  const projectIds = productProjects.map((p: { projectId: string }) => p.projectId);

  // Get all final videos for these projects
  const projectVideos = await db
    .select({
      projectId: finalVideos.projectId,
      videoId: finalVideos.id,
      videoUrl: finalVideos.url,
      videoCreatedAt: finalVideos.createdAt,
    })
    .from(finalVideos)
    .where(
      and(
        inArray(finalVideos.projectId, projectIds),
        isNull(finalVideos.deletedAt)
      )
    )
    .orderBy(desc(finalVideos.createdAt));

  // Group by productId
  const result: Record<string, {
    hasVideo: boolean;
    latestVideo?: { id: string; url: string; createdAt: Date | null };
    latestProject?: { id: string; name: string; status: string; updatedAt: Date | null };
  }> = {};

  // Initialize all productIds
  for (const productId of productIds) {
    result[productId] = {
      hasVideo: false,
    };
  }

  // Map projects to products
  for (const project of productProjects) {
    if (project.productId) {
      if (!result[project.productId]) {
        result[project.productId] = { hasVideo: false };
      }
      const currentLatest = result[project.productId].latestProject;
      if (!currentLatest ||
          (project.projectUpdatedAt && currentLatest.updatedAt &&
           project.projectUpdatedAt > currentLatest.updatedAt)) {
        result[project.productId].latestProject = {
          id: project.projectId,
          name: project.projectName,
          status: project.projectStatus,
          updatedAt: project.projectUpdatedAt,
        };
      }
    }
  }

  // Map videos to projects to products
  for (const video of projectVideos) {
    const project = productProjects.find((p: { projectId: string }) => p.projectId === video.projectId);
    if (project?.productId) {
      if (!result[project.productId]) {
        result[project.productId] = { hasVideo: false };
      }
      result[project.productId].hasVideo = true;
      const currentLatest = result[project.productId].latestVideo;
      if (!currentLatest ||
          (video.videoCreatedAt && currentLatest.createdAt &&
           video.videoCreatedAt > currentLatest.createdAt)) {
        result[project.productId].latestVideo = {
          id: video.videoId,
          url: video.videoUrl,
          createdAt: video.videoCreatedAt,
        };
      }
    }
  }

  return result;
}

export async function getProductsByUser(userId: string, includeArchived: boolean = false) {
  const db = await getDb();
  const conditions = [eq(products.userId, userId)];
  if (!includeArchived) {
    conditions.push(isNull(products.deletedAt));
  }
  return await db
    .select()
    .from(products)
    .where(and(...conditions))
    .orderBy(desc(products.createdAt));
}

export async function getProductsByOrganization(organizationId: string, includeArchived: boolean = false) {
  const db = await getDb();
  const conditions = [eq(products.organizationId, organizationId)];
  if (!includeArchived) {
    conditions.push(isNull(products.deletedAt));
  }
  return await db
    .select()
    .from(products)
    .where(and(...conditions))
    .orderBy(desc(products.createdAt));
}

export async function getProductByUrl(userId: string, url: string) {
  const db = await getDb();
  const [product] = await db
    .select()
    .from(products)
    .where(and(eq(products.userId, userId), eq(products.url, url), isNull(products.deletedAt)))
    .limit(1);

  return product;
}

export async function getVideosByProduct(productId: string) {
  const db = await getDb();
  return await db
    .select({
      video: finalVideos,
      project: projects,
    })
    .from(finalVideos)
    .innerJoin(projects, eq(finalVideos.projectId, projects.id))
    .where(and(eq(projects.productId, productId), isNull(finalVideos.deletedAt)))
    .orderBy(desc(finalVideos.createdAt));
}

export async function shareProductWithOrganization(productId: string, organizationId: string) {
  const db = await getDb();
  const [product] = await db
    .update(products)
    .set({ organizationId, updatedAt: new Date() })
    .where(eq(products.id, productId))
    .returning();

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

export async function updateScript(scriptId: string, data: { content?: string; isSelected?: boolean; metadata?: any }) {
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
  imagePrompt?: string;
}) {
  const db = await getDb();
  const [scene] = await db.insert(scenes).values({
    id: createId(),
    projectId: data.projectId,
    sceneNumber: data.sceneNumber,
    scriptText: data.scriptText,
    visualDescription: data.visualDescription,
    imagePrompt: data.imagePrompt || null,
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

export async function deleteScriptsByProject(projectId: string) {
  const db = await getDb();
  await db.delete(scripts).where(eq(scripts.projectId, projectId));
}

export async function updateScene(sceneId: string, data: {
  imagePrompt?: string;
  videoPrompt?: string;
  metadata?: any;
}) {
  const db = await getDb();
  const updateData: any = {};
  if (data.imagePrompt !== undefined) updateData.imagePrompt = data.imagePrompt;
  if (data.videoPrompt !== undefined) {
    // Store videoPrompt in metadata if not in schema
    const currentScene = await db.select().from(scenes).where(eq(scenes.id, sceneId)).limit(1);
    const currentMetadata = (currentScene[0]?.metadata as any) || {};
    updateData.metadata = { ...currentMetadata, videoPrompt: data.videoPrompt };
  }
  if (data.metadata !== undefined) {
    const currentScene = await db.select().from(scenes).where(eq(scenes.id, sceneId)).limit(1);
    const currentMetadata = (currentScene[0]?.metadata as any) || {};
    updateData.metadata = { ...currentMetadata, ...data.metadata };
  }
  
  const [updated] = await db
    .update(scenes)
    .set(updateData)
    .where(eq(scenes.id, sceneId))
    .returning();

  return updated;
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

export async function updateMediaAsset(assetId: string, data: { metadata?: any }) {
  const db = await getDb();
  const [updated] = await db
    .update(mediaAssets)
    .set({
      metadata: data.metadata,
    })
    .where(eq(mediaAssets.id, assetId))
    .returning();

  return updated;
}

export async function getMusicTracksByOrganization(organizationId: string) {
  const db = await getDb();
  return await db
    .select()
    .from(musicTracks)
    .where(or(eq(musicTracks.organizationId, organizationId), eq(musicTracks.isDefault, true)))
    .orderBy(desc(musicTracks.createdAt));
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
  usageRecords.forEach((record: { type: string; units: number }) => {
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
  averageRating?: string | number;
  totalReviews?: number;
  ratingDistribution?: Record<string, number>;
  metadata?: any;
}) {
  const db = await getDb();

  // Calculate trending score before insert/update
  const productDataForScore = {
    engagementRate: data.engagementRate || '0',
    totalViews: data.totalViews || 0,
    totalSales: data.totalSales || 0,
    lastUpdated: new Date(),
  };
  const trendingScore = calculateTrendingScore(productDataForScore).toFixed(2);

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
      trendingScore: trendingScore,
      averageRating: data.averageRating ? (typeof data.averageRating === 'string' ? data.averageRating : data.averageRating.toString()) : null,
      totalReviews: data.totalReviews || 0,
      ratingDistribution: data.ratingDistribution || null,
      metadata: data.metadata || null,
      lastUpdated: new Date(),
    })
    .onConflictDoUpdate({
      target: tiktokShopProducts.tiktokProductId,
      set: {
        name: sql`EXCLUDED.name`,
        description: sql`EXCLUDED.description`,
        price: sql`EXCLUDED.price`,
        originalPrice: sql`EXCLUDED."originalPrice"`,
        currency: sql`EXCLUDED.currency`,
        sellerId: sql`EXCLUDED."sellerId"`,
        sellerName: sql`EXCLUDED."sellerName"`,
        category: sql`EXCLUDED.category`,
        images: sql`EXCLUDED.images`,
        totalViews: sql`EXCLUDED."totalViews"`,
        totalSales: sql`EXCLUDED."totalSales"`,
        engagementRate: sql`EXCLUDED."engagementRate"`,
        trendingScore: trendingScore,
        averageRating: data.averageRating !== undefined 
          ? (typeof data.averageRating === 'string' ? data.averageRating : data.averageRating.toString())
          : sql`EXCLUDED."averageRating"`,
        totalReviews: data.totalReviews !== undefined ? data.totalReviews : sql`EXCLUDED."totalReviews"`,
        ratingDistribution: data.ratingDistribution !== undefined ? data.ratingDistribution : sql`EXCLUDED."ratingDistribution"`,
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
    averageRating?: string | number;
    totalReviews?: number;
    ratingDistribution?: Record<string, number>;
    metadata?: any;
  }
) {
  const db = await getDb();

  // Get existing product to calculate trending score with updated data
  const [existingProduct] = await db
    .select()
    .from(tiktokShopProducts)
    .where(eq(tiktokShopProducts.tiktokProductId, tiktokProductId))
    .limit(1);

  if (!existingProduct) {
    throw new Error(`Product with tiktokProductId ${tiktokProductId} not found`);
  }

  // Merge existing data with update data for score calculation
  const productDataForScore = {
    engagementRate: data.engagementRate ?? existingProduct.engagementRate ?? '0',
    totalViews: data.totalViews ?? existingProduct.totalViews ?? 0,
    totalSales: data.totalSales ?? existingProduct.totalSales ?? 0,
    lastUpdated: new Date(),
  };
  
  // Calculate trending score (unless explicitly provided)
  const trendingScore = data.trendingScore ?? calculateTrendingScore(productDataForScore).toFixed(2);

  // Convert averageRating to string if provided as number
  const updateData: any = {
    ...data,
    trendingScore: trendingScore,
    lastUpdated: new Date(),
    updatedAt: new Date(),
  };
  
  if (data.averageRating !== undefined) {
    updateData.averageRating = typeof data.averageRating === 'string' 
      ? data.averageRating 
      : data.averageRating.toString();
  }

  const [product] = await db
    .update(tiktokShopProducts)
    .set(updateData)
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

// Referral Queries

/**
 * Get or create a referral code for a user
 */
export async function getOrCreateUserReferralCode(userId: string) {
  const db = await getDb();

  // Check if user already has a referral code
  const existingReferral = await db
    .select()
    .from(referrals)
    .where(eq(referrals.referrerId, userId))
    .limit(1);

  if (existingReferral.length > 0) {
    return existingReferral[0];
  }

  // Generate a unique referral code
  let referralCode: string;
  let attempts = 0;
  const maxAttempts = 10;

  do {
    // Generate code: REF-{first 8 chars of userId}
    referralCode = `REF-${userId.slice(0, 8).toUpperCase()}`;
    attempts++;

    // Check if code already exists
    const existing = await db
      .select()
      .from(referrals)
      .where(eq(referrals.referralCode, referralCode))
      .limit(1);

    if (existing.length === 0) {
      break;
    }

    // If code exists, add random suffix
    if (attempts < maxAttempts) {
      referralCode = `REF-${userId.slice(0, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    } else {
      // Fallback to full random code
      referralCode = `REF-${createId().slice(0, 12).toUpperCase()}`;
    }
  } while (attempts < maxAttempts);

  // Create new referral record
  const [newReferral] = await db
    .insert(referrals)
    .values({
      id: createId(),
      referrerId: userId,
      referralCode,
      status: 'pending',
      createdAt: new Date(),
    })
    .returning();

  return newReferral;
}

/**
 * Get referral by code
 */
export async function getReferralByCode(code: string) {
  const db = await getDb();

  const [referral] = await db
    .select()
    .from(referrals)
    .where(eq(referrals.referralCode, code))
    .limit(1);

  return referral || null;
}

/**
 * Update user's referral code
 */
export async function updateUserReferralCode(userId: string, newCode: string) {
  const db = await getDb();

  // Check if code is already taken by another user
  const existingReferral = await getReferralByCode(newCode);
  if (existingReferral && existingReferral.referrerId !== userId) {
    throw new Error('Referral code is already taken');
  }

  // Get user's current referral
  const [userReferral] = await db
    .select()
    .from(referrals)
    .where(eq(referrals.referrerId, userId))
    .limit(1);

  if (!userReferral) {
    throw new Error('Referral not found');
  }

  // Update the referral code
  const [updated] = await db
    .update(referrals)
    .set({
      referralCode: newCode,
    })
    .where(eq(referrals.id, userReferral.id))
    .returning();

  return updated;
}

/**
 * Create a referral record when someone signs up with a referral code
 */
export async function createReferralRecord(data: {
  referrerId: string;
  referredUserId: string;
  referralCode: string;
}) {
  const db = await getDb();

  // Check if referral record already exists
  const existing = await db
    .select()
    .from(referrals)
    .where(
      and(
        eq(referrals.referrerId, data.referrerId),
        eq(referrals.referredUserId, data.referredUserId)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  // Create new referral record
  const [newReferral] = await db
    .insert(referrals)
    .values({
      id: createId(),
      referrerId: data.referrerId,
      referredUserId: data.referredUserId,
      referralCode: data.referralCode,
      status: 'pending',
      createdAt: new Date(),
    })
    .returning();

  return newReferral;
}

/**
 * Process ongoing referral reward when referred user makes a purchase or subscription payment
 * Awards 20% of the purchase amount as credits to the referrer
 * Works for both one-time purchases and recurring subscription payments
 */
export async function processReferralReward(
  referredUserId: string,
  purchaseAmount: number, // Amount in dollars
  organizationId: string, // Organization that made the purchase
  description?: string,
  isSubscriptionPayment?: boolean // True if this is a recurring subscription payment
) {
  const db = await getDb();

  // Find referral for this user (can be pending, claimed, or rewarded - we process ongoing rewards)
  const [referral] = await db
    .select()
    .from(referrals)
    .where(eq(referrals.referredUserId, referredUserId))
    .limit(1);

  if (!referral) {
    return null; // No referral found
  }

  // For subscription payments, check if the referred user has an active subscription
  if (isSubscriptionPayment) {
    const subscription = await getSubscriptionByOrganizationId(organizationId);
    if (!subscription || (subscription.status !== 'active' && subscription.status !== 'trialing' && subscription.status !== 'past_due')) {
      return null; // User doesn't have active subscription, no reward
    }
  }

  // Calculate 20% reward (in credits, assuming $0.01 per credit)
  // If purchaseAmount is in dollars, convert to credits first, then take 20%
  const creditsFromPurchase = purchaseAmount * 100; // $0.01 per credit (1 penny = 1 credit)
  const rewardCredits = Math.floor(creditsFromPurchase * 0.2); // 20% of credits

  if (rewardCredits <= 0) {
    return null; // No reward if amount is too small
  }

  // Get referrer's organization
  const referrerOrgs = await getUserOrganizations(referral.referrerId);
  if (referrerOrgs.length === 0) {
    return null; // Referrer has no organization
  }

  const referrerOrgId = referrerOrgs[0].organization.id;

  // Update referral record - accumulate total rewards
  const currentRewardAmount = referral.rewardCreditAmount || 0;
  const newTotalReward = currentRewardAmount + rewardCredits;

  // Update status: pending -> claimed (first reward), keep as claimed/rewarded for ongoing
  let newStatus = referral.status;
  if (referral.status === 'pending') {
    newStatus = 'claimed';
    await db
      .update(referrals)
      .set({
        status: 'claimed',
        rewardCreditAmount: newTotalReward,
        claimedAt: new Date(),
      })
      .where(eq(referrals.id, referral.id));
  } else {
    // Ongoing reward - update total and mark as rewarded if not already
    await db
      .update(referrals)
      .set({
        rewardCreditAmount: newTotalReward,
        status: 'rewarded',
        rewardedAt: new Date(),
      })
      .where(eq(referrals.id, referral.id));
  }

  // Award credits to referrer's organization
  await createCreditTransaction({
    organizationId: referrerOrgId,
    userId: referral.referrerId,
    type: 'bonus',
    amount: rewardCredits.toString(),
    description: description || `Referral reward: 20% of $${purchaseAmount.toFixed(2)} ${isSubscriptionPayment ? 'subscription payment' : 'purchase'}`,
  });

  return {
    referralId: referral.id,
    rewardCredits,
    totalRewards: newTotalReward,
    referrerOrgId,
  };
}

/**
 * Update referral status
 */
export async function updateReferralStatus(
  referralId: string,
  status: 'pending' | 'claimed' | 'rewarded'
) {
  const db = await getDb();

  const updateData: any = {
    status,
  };

  if (status === 'claimed') {
    updateData.claimedAt = new Date();
  } else if (status === 'rewarded') {
    updateData.rewardedAt = new Date();
  }

  const [updated] = await db
    .update(referrals)
    .set(updateData)
    .where(eq(referrals.id, referralId))
    .returning();

  return updated;
}

/**
 * Get user referral statistics
 */
export async function getUserReferralStats(userId: string) {
  const db = await getDb();

  // Get user's referral code
  const userReferral = await db
    .select()
    .from(referrals)
    .where(eq(referrals.referrerId, userId))
    .limit(1);

  if (userReferral.length === 0) {
    return {
      referralCode: null,
      totalReferrals: 0,
      pendingCount: 0,
      claimedCount: 0,
      rewardedCount: 0,
      totalRewards: 0,
    };
  }

  const referralId = userReferral[0].id;

  // Count referrals by status
  const [pendingResult] = await db
    .select({ count: count() })
    .from(referrals)
    .where(and(eq(referrals.referrerId, userId), eq(referrals.status, 'pending')));

  const [claimedResult] = await db
    .select({ count: count() })
    .from(referrals)
    .where(and(eq(referrals.referrerId, userId), eq(referrals.status, 'claimed')));

  const [rewardedResult] = await db
    .select({ count: count() })
    .from(referrals)
    .where(and(eq(referrals.referrerId, userId), eq(referrals.status, 'rewarded')));

  // Get total rewards (sum of all rewardCreditAmount, including ongoing rewards)
  const rewardsResult = await db
    .select({
      total: sql<number>`COALESCE(SUM(${referrals.rewardCreditAmount}), 0)`,
    })
    .from(referrals)
    .where(
      and(
        eq(referrals.referrerId, userId),
        sql`${referrals.rewardCreditAmount} IS NOT NULL`
      )
    );

  const totalRewards = Number(rewardsResult[0]?.total || 0);

  return {
    referralCode: userReferral[0].referralCode,
    totalReferrals: pendingResult.count + claimedResult.count + rewardedResult.count,
    pendingCount: pendingResult.count,
    claimedCount: claimedResult.count,
    rewardedCount: rewardedResult.count,
    totalRewards,
  };
}

/**
 * Get all affiliates with pagination and filtering (Admin)
 */
export async function getAllAffiliates(filters?: {
  page?: number;
  limit?: number;
  status?: 'pending' | 'claimed' | 'rewarded';
  search?: string;
  sortBy?: 'createdAt' | 'referralsCount' | 'rewards';
  sortOrder?: 'asc' | 'desc';
}) {
  const db = await getDb();

  const page = filters?.page || 1;
  const limit = filters?.limit || 20;
  const offset = (page - 1) * limit;

  // First, get all unique referrer IDs
  let referrerIds: string[] = [];

  if (filters?.search) {
    // Search by referral code
    const codeMatches = await db
      .selectDistinct({ referrerId: referrals.referrerId })
      .from(referrals)
      .where(like(referrals.referralCode, `%${filters.search}%`));

    // Search by user name/email
    const matchingUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(
        or(
          like(users.name, `%${filters.search}%`),
          like(users.email, `%${filters.search}%`)
        )
      );

    const matchingUserIds = matchingUsers.map((u: { id: string }) => u.id);

    if (matchingUserIds.length > 0) {
      const userMatches = await db
        .selectDistinct({ referrerId: referrals.referrerId })
        .from(referrals)
        .where(sql`${referrals.referrerId} IN (${sql.join(matchingUserIds.map((id: string) => sql`${id}`), sql`, `)})`);

      const allMatches = [...codeMatches, ...userMatches];
      referrerIds = Array.from(new Set(allMatches.map((r: { referrerId: string }) => r.referrerId)));
    } else {
      referrerIds = codeMatches.map((r: { referrerId: string }) => r.referrerId);
    }
  } else {
    // Get all unique referrer IDs
    const referrerIdsResult = await db
      .selectDistinct({ referrerId: referrals.referrerId })
      .from(referrals);
    
    referrerIds = referrerIdsResult.map((r: { referrerId: string }) => r.referrerId);
  }

  if (referrerIds.length === 0) {
    return {
      affiliates: [],
      pagination: {
        page,
        limit,
        total: 0,
        totalPages: 0,
      },
    };
  }

  // Get stats for each referrer
  const affiliatesData = await Promise.all(
    referrerIds.map(async (referrerId: string) => {
      // Get first referral (for code and created date)
      const [firstReferral] = await db
        .select()
        .from(referrals)
        .where(eq(referrals.referrerId, referrerId))
        .orderBy(asc(referrals.createdAt))
        .limit(1);

      // Count total referrals
      const [totalCount] = await db
        .select({ count: count() })
        .from(referrals)
        .where(eq(referrals.referrerId, referrerId));

      // Count by status
      const statusCounts = await db
        .select({
          status: referrals.status,
          count: sql<number>`COUNT(*)`,
        })
        .from(referrals)
        .where(eq(referrals.referrerId, referrerId))
        .groupBy(referrals.status);

      // Get total rewards
      const [rewardsResult] = await db
        .select({
          total: sql<number>`COALESCE(SUM(${referrals.rewardCreditAmount}), 0)`,
        })
        .from(referrals)
        .where(and(eq(referrals.referrerId, referrerId), eq(referrals.status, 'rewarded')));

      // Get user info
      const [user] = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          image: users.image,
        })
        .from(users)
        .where(eq(users.id, referrerId))
        .limit(1);

      const statusBreakdown: Record<string, number> = {};
      statusCounts.forEach((item: { status: string; count: number }) => {
        statusBreakdown[item.status] = item.count;
      });

      return {
        referrerId,
        referralCode: firstReferral?.referralCode || '',
        createdAt: firstReferral?.createdAt || new Date(),
        referralsCount: Number(totalCount?.count || 0),
        totalRewards: Number(rewardsResult?.total || 0),
        user: user || null,
        statusBreakdown,
      };
    })
  );

  // Apply status filter if provided
  let filteredData = affiliatesData;
  if (filters?.status) {
    filteredData = affiliatesData.filter((affiliate) => {
      return affiliate.statusBreakdown[filters.status!] > 0;
    });
  }

  // Sort
  const sortBy = filters?.sortBy || 'createdAt';
  const sortOrder = filters?.sortOrder || 'desc';

  filteredData.sort((a, b) => {
    let comparison = 0;
    if (sortBy === 'createdAt') {
      comparison = a.createdAt.getTime() - b.createdAt.getTime();
    } else if (sortBy === 'referralsCount') {
      comparison = a.referralsCount - b.referralsCount;
    } else if (sortBy === 'rewards') {
      comparison = a.totalRewards - b.totalRewards;
    }

    return sortOrder === 'asc' ? comparison : -comparison;
  });

  // Paginate
  const total = filteredData.length;
  const paginatedData = filteredData.slice(offset, offset + limit);

  return {
    affiliates: paginatedData,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Update affiliate commission/reward amount
 */
export async function updateAffiliateCommission(referralId: string, amount: number) {
  const db = await getDb();

  const [updated] = await db
    .update(referrals)
    .set({
      rewardCreditAmount: amount,
    })
    .where(eq(referrals.id, referralId))
    .returning();

  return updated;
}

/**
 * Get affiliate performance metrics (Admin)
 */
export async function getAffiliatePerformanceMetrics() {
  const db = await getDb();

  // Total affiliates
  const [totalAffiliatesResult] = await db
    .select({ count: sql<number>`COUNT(DISTINCT ${referrals.referrerId})` })
    .from(referrals);

  // Active affiliates (those with at least one referral)
  const [activeAffiliatesResult] = await db
    .select({ count: sql<number>`COUNT(DISTINCT ${referrals.referrerId})` })
    .from(referrals)
    .where(sql`${referrals.referredUserId} IS NOT NULL`);

  // Total referrals
  const [totalReferralsResult] = await db
    .select({ count: count() })
    .from(referrals)
    .where(sql`${referrals.referredUserId} IS NOT NULL`);

  // Total rewards paid
  const [totalRewardsResult] = await db
    .select({
      total: sql<number>`COALESCE(SUM(${referrals.rewardCreditAmount}), 0)`,
    })
    .from(referrals)
    .where(eq(referrals.status, 'rewarded'));

  // Status breakdown
  const statusBreakdown = await db
    .select({
      status: referrals.status,
      count: sql<number>`COUNT(*)`,
    })
    .from(referrals)
    .groupBy(referrals.status);

  return {
    totalAffiliates: Number(totalAffiliatesResult?.count || 0),
    activeAffiliates: Number(activeAffiliatesResult?.count || 0),
    totalReferrals: Number(totalReferralsResult?.count || 0),
    totalRewardsPaid: Number(totalRewardsResult?.total || 0),
    statusBreakdown: statusBreakdown.reduce((acc: Record<string, number>, item: { status: string; count: number }) => {
      acc[item.status] = item.count;
      return acc;
    }, {} as Record<string, number>),
  };
}

/**
 * Get all referrals for a specific affiliate
 */
export async function getAffiliateReferrals(referrerId: string) {
  const db = await getDb();

  const affiliateReferrals = await db
    .select()
    .from(referrals)
    .where(eq(referrals.referrerId, referrerId))
    .orderBy(desc(referrals.createdAt));

  // Enrich with referred user data
  const enriched = await Promise.all(
    affiliateReferrals.map(async (referral: { id: string; referrerId: string; referredUserId: string | null; referralCode: string; status: 'pending' | 'claimed' | 'rewarded'; rewardCreditAmount: number | null; claimedAt: Date | null; rewardedAt: Date | null; createdAt: Date }) => {
      if (!referral.referredUserId) {
        return {
          ...referral,
          referredUser: null,
        };
      }

      const [referredUser] = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          image: users.image,
        })
        .from(users)
        .where(eq(users.id, referral.referredUserId))
        .limit(1);

      return {
        ...referral,
        referredUser: referredUser || null,
      };
    })
  );

  return enriched;
}
