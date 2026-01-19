/**
 * Fix script to update projects with invalid 'storyboard' step
 * 
 * This script updates all projects with currentStep = 'storyboard' to 'scenes'
 * since storyboard was removed and scenes is the closest equivalent.
 * 
 * Run this BEFORE running the database migration:
 * bun run scripts/fix-storyboard-step.ts
 */

import { db } from '../src/db';
import { projects } from '../src/db/schema';
import { eq, sql } from 'drizzle-orm';

async function fixStoryboardStep() {
  console.log('Fixing projects with storyboard step...');

  try {
    // Update all projects with currentStep = 'storyboard' to 'scenes'
    const result = await db.execute(
      sql`UPDATE projects SET "currentStep" = 'scenes', "updatedAt" = NOW() WHERE "currentStep" = 'storyboard'`
    );

    console.log(`Updated ${result.rowCount || 0} projects from 'storyboard' to 'scenes'`);
    console.log('Fix completed successfully!');
    console.log('\nYou can now run the database migration: bun run db:migrate');
  } catch (error) {
    console.error('Error fixing storyboard step:', error);
    throw error;
  }
}

// Run fix
fixStoryboardStep()
  .then(() => {
    console.log('Fix script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fix script failed:', error);
    process.exit(1);
  });
