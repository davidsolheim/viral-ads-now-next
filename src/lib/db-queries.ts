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
} from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
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

export async function updateProjectSettings(projectId: string, settings: any) {
  const db = await getDb();
  const [updated] = await db
    .update(projects)
    .set({ settings, updatedAt: new Date() })
    .where(eq(projects.id, projectId))
    .returning();

  return updated;
}

// Product Queries

export async function createProduct(data: {
  projectId: string;
  name: string;
  description?: string;
  price?: string;
  originalPrice?: string;
  category?: string;
  soldCount?: number;
  images?: string[];
  features?: string[];
  benefits?: string[];
}) {
  const db = await getDb();
  const [product] = await db.insert(products).values({
    id: createId(),
    projectId: data.projectId,
    name: data.name,
    description: data.description,
    price: data.price,
    originalPrice: data.originalPrice,
    category: data.category,
    soldCount: data.soldCount,
    images: data.images,
    features: data.features,
    benefits: data.benefits,
  }).returning();

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

// Scene Queries

export async function createScene(data: {
  projectId: string;
  sceneNumber: number;
  scriptText: string;
  visualDescription: string;
}) {
  const db = await getDb();
  const [scene] = await db.insert(scenes).values({
    id: createId(),
    projectId: data.projectId,
    sceneNumber: data.sceneNumber,
    scriptText: data.scriptText,
    visualDescription: data.visualDescription,
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
