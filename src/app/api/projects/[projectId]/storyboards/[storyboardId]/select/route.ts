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
  { params }: { params: Promise<{ projectId: string; storyboardId: string }> }
) {
  try {
    const session = await auth();
    const { projectId, storyboardId } = await params;

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get project
    const project = await getProject(projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Get the selected script
    const script = await getScriptById(projectId, storyboardId);
    if (!script) {
      return NextResponse.json({ error: 'Storyboard not found' }, { status: 404 });
    }

    // Mark this script as selected (deselects all others)
    await selectScript(storyboardId, projectId);

    // Get scenes for this script (they should already exist from storyboard generation)
    const existingScenes = await getScenesByScript(projectId, storyboardId);

    // If scenes don't exist, we need to recreate them from the storyboard data
    // For now, we'll assume they exist from the storyboard generation
    if (existingScenes.length === 0) {
      return NextResponse.json(
        { error: 'No scenes found for this storyboard. Please regenerate storyboards.' },
        { status: 400 }
      );
    }

    // Delete scenes from other storyboards (unselected scripts)
    // We'll keep only the selected script's scenes
    const allScenes = await getScenesByScript(projectId, null); // Get all scenes
    const scenesToDelete = allScenes.filter((s: any) => s.scriptId !== storyboardId);
    
    // Note: We'll keep the scenes for now and just mark the script as selected
    // The cleanup can happen later or during final generation

    // Update project step to proceed with automation
    await updateProjectStep(projectId, 'compile');

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
    console.error('Error selecting storyboard:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to select storyboard' },
      { status: 500 }
    );
  }
}
