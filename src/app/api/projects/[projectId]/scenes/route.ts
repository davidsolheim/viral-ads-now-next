import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { 
  getProject, 
  getScriptsByProject, 
  createScene, 
  deleteScenesByProject,
  updateProjectStep 
} from '@/lib/db-queries';
import { breakdownIntoScenes } from '@/lib/services/openai';
import { z } from 'zod';

const generateScenesSchema = z.object({
  scriptId: z.string().optional(),
  targetScenes: z.number().min(2).max(8).optional(),
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
    const scripts = await getScriptsByProject(projectId);
    const selectedScript = options.scriptId
      ? scripts.find(s => s.id === options.scriptId)
      : scripts.find(s => s.isSelected);

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

    // Save scenes to database
    const scenes = await Promise.all(
      sceneData.map((scene) =>
        createScene({
          projectId,
          sceneNumber: scene.sceneNumber,
          scriptText: scene.scriptText,
          visualDescription: scene.visualDescription,
        })
      )
    );

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
