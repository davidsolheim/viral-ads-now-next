import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getProject,
  getScriptById,
  getScenesByScript,
  selectScript,
  updateProjectStep,
} from '@/lib/db-queries';
import { z } from 'zod';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; conceptId: string }> }
) {
  try {
    const session = await auth();
    const { projectId, conceptId } = await params;

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get project
    const project = await getProject(projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Get the selected script
    const script = await getScriptById(projectId, conceptId);
    if (!script) {
      return NextResponse.json({ error: 'Concept not found' }, { status: 404 });
    }

    // Mark this script as selected (deselects all others)
    await selectScript(conceptId, projectId);

    // Get scenes for this script (they should already exist from concept generation)
    const existingScenes = await getScenesByScript(projectId, conceptId);

    // If scenes don't exist, we need to recreate them from the concept data
    // For now, we'll assume they exist from the concept generation
    if (existingScenes.length === 0) {
      return NextResponse.json(
        { error: 'No scenes found for this concept. Please regenerate concepts.' },
        { status: 400 }
      );
    }

    // Delete scenes from other concepts (unselected scripts)
    // We'll keep only the selected script's scenes
    const allScenes = await getScenesByScript(projectId, null); // Get all scenes
    const scenesToDelete = allScenes.filter((s: any) => s.scriptId !== conceptId);
    
    // Note: We'll keep the scenes for now and just mark the script as selected
    // The cleanup can happen later or during final generation

    // Update project step based on flow type
    // For automatic flow, auto-generate will update to compile
    // For manual flow, proceed to script step
    const flowType = (project.settings as any)?.flowType || 'manual';
    if (flowType === 'automatic') {
      // Keep at concept step - auto-generate will update to compile
      await updateProjectStep(projectId, 'concept');
    } else {
      await updateProjectStep(projectId, 'script');
    }

    return NextResponse.json(
      {
        success: true,
        script: {
          id: script.id,
          content: script.content,
        },
        scenes: existingScenes.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error selecting concept:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to select concept' },
      { status: 500 }
    );
  }
}
