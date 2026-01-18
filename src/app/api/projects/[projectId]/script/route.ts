import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getProject, getProductByProject, createScript, updateProjectStep } from '@/lib/db-queries';
import { generateScript } from '@/lib/services/openai';
import { trackUsageAndCheckLimits } from '@/lib/middleware/usage-tracking';
import { z } from 'zod';

const generateScriptSchema = z.object({
  style: z.enum(['conversational', 'energetic', 'professional', 'casual']).optional(),
  duration: z.number().min(15).max(60).optional(),
  platform: z.enum(['tiktok', 'instagram', 'youtube']).optional(),
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

    // Check usage limits before generating
    const usageCheck = await trackUsageAndCheckLimits({
      organizationId: project.organizationId,
      userId: session.user.id,
      projectId,
      usageType: 'script_generation',
      units: 1,
      cost: 0.001, // Approximate cost per script generation (adjust based on actual costs)
      provider: 'openai',
    });

    if (!usageCheck.allowed) {
      return NextResponse.json(
        { error: usageCheck.reason || 'Usage limit exceeded' },
        { status: 403 }
      );
    }

    // Generate script using OpenAI
    const scriptContent = await generateScript({
      product: {
        name: product.name,
        description: product.description || undefined,
        price: product.price || undefined,
        originalPrice: product.originalPrice || undefined,
        features: (product.features as string[]) || undefined,
        benefits: (product.benefits as string[]) || undefined,
      },
      style: options.style,
      duration: options.duration,
      platform: options.platform,
    });

    // Save script to database
    const script = await createScript({
      projectId,
      content: scriptContent,
      isSelected: true, // Auto-select the first generated script
    });

    // Update project step
    await updateProjectStep(projectId, 'scenes');

    return NextResponse.json({ script }, { status: 201 });
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
