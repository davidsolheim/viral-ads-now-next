/**
 * Migration script to migrate products from project-based to user-based
 * 
 * IMPORTANT: Run these scripts in order:
 * 1. Fix invalid enum values: bun run scripts/fix-storyboard-step.ts
 * 2. Generate migration: bun run db:generate
 * 3. Modify the generated migration SQL to do it in two steps:
 *    - First: Add userId and organizationId columns
 *    - Run this script: bun run scripts/migrate-products.ts
 *    - Then: Remove projectId column (in a second migration or modify the first)
 * 4. Run migration: bun run db:migrate
 * 
 * This script:
 * 1. Migrates existing products: sets userId from project.creatorId
 * 2. Updates projects to set productId from products.id where products.projectId matches
 */

import { db } from '../src/db';
import { products, projects } from '../src/db/schema';
import { eq, sql } from 'drizzle-orm';

async function migrateProducts() {
  console.log('Starting product migration...');

  try {
    // Check if projectId column still exists by trying to query it
    let productsWithProject: any[];
    try {
      // Try to select with projectId (old schema)
      const result = await db.execute(
        sql`SELECT id, "projectId" FROM products WHERE "projectId" IS NOT NULL`
      );
      productsWithProject = result.rows || [];
    } catch (error: any) {
      if (error.message?.includes('column') && error.message?.includes('projectId')) {
        console.log('projectId column already removed. Checking for products without userId...');
        // Column already removed, check for products without userId
        productsWithProject = await db
          .select()
          .from(products)
          .where(sql`${products.userId} IS NULL`);
      } else {
        throw error;
      }
    }

    if (productsWithProject.length === 0) {
      console.log('No products to migrate. Migration may have already been completed.');
      return;
    }

    console.log(`Found ${productsWithProject.length} products to migrate`);

    // If we're using raw SQL (projectId column exists), use SQL approach
    if (productsWithProject[0]?.projectId) {
      // Use raw SQL to migrate
      await db.execute(sql`
        UPDATE products p
        SET 
          "userId" = pr."creatorId",
          "organizationId" = pr."organizationId",
          "updatedAt" = NOW()
        FROM projects pr
        WHERE p."projectId" = pr.id
      `);

      // Update projects to link back to products
      await db.execute(sql`
        UPDATE projects pr
        SET 
          "productId" = p.id,
          "updatedAt" = NOW()
        FROM products p
        WHERE p."projectId" = pr.id
      `);
    } else {
      // projectId column removed, but userId is null - need to find via projects table
      // This is a fallback case - ideally this shouldn't happen
      console.log('projectId column removed. Attempting to match products via projects table...');
      
      // Get all products without userId
      const productsWithoutUserId = await db
        .select()
        .from(products)
        .where(sql`${products.userId} IS NULL`);

      // Try to match products to projects by checking if any project has this product linked
      // This is a best-effort approach
      for (const product of productsWithoutUserId) {
        // Find project that might have been linked to this product
        const matchingProjects = await db
          .select()
          .from(projects)
          .where(eq(projects.productId, product.id))
          .limit(1);

        if (matchingProjects.length > 0) {
          const project = matchingProjects[0];
          await db
            .update(products)
            .set({
              userId: project.creatorId,
              organizationId: project.organizationId,
              updatedAt: new Date(),
            })
            .where(eq(products.id, product.id));
          console.log(`Migrated product ${product.id} via project ${project.id}`);
        } else {
          console.warn(`Could not find matching project for product ${product.id}`);
        }
      }
    }

    console.log('Product migration completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Verify the migration by checking a few products in the database');
    console.log('2. Test the application to ensure products are working correctly');
  } catch (error) {
    console.error('Error during migration:', error);
    throw error;
  }
}

// Run migration
migrateProducts()
  .then(() => {
    console.log('Migration script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration script failed:', error);
    process.exit(1);
  });
