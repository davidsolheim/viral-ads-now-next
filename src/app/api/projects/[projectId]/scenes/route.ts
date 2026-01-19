import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  createScene,
  deleteScenesByProject,
  getProject,
  getScriptById,
  getSelectedScriptByProject,
  updateProjectStep,
  getScenesByProject,
  updateProjectSettings,
} from '@/lib/db-queries';
import { breakdownIntoScenes } from '@/lib/services/openai';
import { z } from 'zod';

const generateScenesSchema = z.object({
  scriptId: z.string().optional(),
  targetScenes: z.number().min(3).max(5).optional(),
  imageModel: z.string().optional(),
  videoModel: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await auth();
    const { projectId } = await params;

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get project
    const project = await getProject(projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // TODO: Check if user has access to the project's organization

    const body = await request.json();
    const options = generateScenesSchema.parse(body);

    // Get the selected script
    const selectedScript = options.scriptId
      ? await getScriptById(projectId, options.scriptId)
      : await getSelectedScriptByProject(projectId);

    if (!selectedScript) {
      return NextResponse.json(
        { error: 'No script selected. Please generate a script first.' },
        { status: 400 }
      );
    }

    // Generate scene breakdown using OpenAI
    const sceneData = await breakdownIntoScenes({
      script: selectedScript.content,
      targetScenes: options.targetScenes,
    });

    // Delete existing scenes for this project
    await deleteScenesByProject(projectId);

    // Save scenes to database with image prompts
    const scenes = await Promise.all(
      sceneData.map((scene) =>
        createScene({
          projectId,
          sceneNumber: scene.sceneNumber,
          scriptText: scene.scriptText,
          visualDescription: scene.visualDescription,
          imagePrompt: scene.visualDescription, // Use visual description as initial image prompt
        })
      )
    );

    // Update project settings with model selections if provided
    if (options.imageModel || options.videoModel) {
      const currentSettings = (project.settings as any) || {};
      await updateProjectSettings(projectId, {
        ...currentSettings,
        image_model: options.imageModel || currentSettings.image_model,
        video_model: options.videoModel || currentSettings.video_model,
      });
    }

    // Update project step
    await updateProjectStep(projectId, 'images');

    return NextResponse.json({ scenes }, { status: 201 });
  } catch (error) {
    console.error('Error generating scenes:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate scenes' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await auth();
    const { projectId } = await params;

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const project = await getProject(projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const scenes = await getScenesByProject(projectId);

    return NextResponse.json({ scenes }, { status: 200 });
  } catch (error) {
    console.error('Error fetching scenes:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch scenes' },
      { status: 500 }
    );
  }
}
