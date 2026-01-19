import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getProject, getProductByProject, createScript, updateProjectStep, deleteScriptsByProject, getScriptsByProject } from '@/lib/db-queries';
import { generateScriptCandidates, generateScript } from '@/lib/services/openai';
import { trackUsageAndCheckLimits } from '@/lib/middleware/usage-tracking';
import { z } from 'zod';

const generateScriptSchema = z.object({
  style: z.enum(['conversational', 'energetic', 'professional', 'casual']).optional(),
  duration: z.number().min(15).max(60).optional(),
  platform: z.enum(['tiktok', 'instagram', 'youtube']).optional(),
  specialRequest: z.string().optional(),
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

    // Get product data
    const product = await getProductByProject(projectId);
    if (!product) {
      return NextResponse.json(
        { error: 'Product data not found. Please complete the product step first.' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const options = generateScriptSchema.parse(body);

    // Check usage limits before generating (6 scripts)
    const usageCheck = await trackUsageAndCheckLimits({
      organizationId: project.organizationId,
      userId: session.user.id,
      projectId,
      usageType: 'script_generation',
      units: 6,
      cost: 0.006, // Approximate cost for 6 script generations
      provider: 'openai',
    });

    if (!usageCheck.allowed) {
      return NextResponse.json(
        { error: usageCheck.reason || 'Usage limit exceeded' },
        { status: 403 }
      );
    }

    // Build product data with special request if provided
    const productData = {
      name: product.name,
      description: product.description || undefined,
      price: product.price || undefined,
      originalPrice: product.originalPrice || undefined,
      features: (product.features as string[]) || undefined,
      benefits: (product.benefits as string[]) || undefined,
    };

    // Add special request to description if provided
    if (options.specialRequest) {
      productData.description = `${productData.description || ''}\n\nSpecial Request: ${options.specialRequest}`.trim();
    }

    // Generate 6 script variations using OpenAI
    const scriptContents = await generateScriptCandidates({
      product: productData,
      style: options.style,
      duration: options.duration,
      platform: options.platform,
    }, 6);

    // Delete existing scripts for this project
    await deleteScriptsByProject(projectId);

    // Save all scripts to database
    const scripts = await Promise.all(
      scriptContents.map((content, index) =>
        createScript({
          projectId,
          content,
          isSelected: index === 0, // Auto-select the first script
        })
      )
    );

    // Update project step
    await updateProjectStep(projectId, 'scenes');

    return NextResponse.json({ scripts }, { status: 201 });
  } catch (error) {
    console.error('Error generating script:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate script' },
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

    const scripts = await getScriptsByProject(projectId);

    return NextResponse.json({ scripts }, { status: 200 });
  } catch (error) {
    console.error('Error fetching scripts:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch scripts' },
      { status: 500 }
    );
  }
}
