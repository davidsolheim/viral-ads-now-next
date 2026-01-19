import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getProject, getProductByProject, getScriptById, updateScript } from '@/lib/db-queries';
import { generateScript } from '@/lib/services/openai';
import { trackUsageAndCheckLimits } from '@/lib/middleware/usage-tracking';
import { z } from 'zod';

const regenerateScriptSchema = z.object({
  style: z.enum(['conversational', 'energetic', 'professional', 'casual']).optional(),
  duration: z.number().min(15).max(60).optional(),
  platform: z.enum(['tiktok', 'instagram', 'youtube']).optional(),
  specialRequest: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; scriptId: string }> }
) {
  try {
    const session = await auth();
    const { projectId, scriptId } = await params;

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const project = await getProject(projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const product = await getProductByProject(projectId);
    if (!product) {
      return NextResponse.json(
        { error: 'Product data not found. Please complete the product step first.' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const options = regenerateScriptSchema.parse(body);

    // Check usage limits
    const usageCheck = await trackUsageAndCheckLimits({
      organizationId: project.organizationId,
      userId: session.user.id,
      projectId,
      usageType: 'script_generation',
      units: 1,
      cost: 0.001,
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

    if (options.specialRequest) {
      productData.description = `${productData.description || ''}\n\nSpecial Request: ${options.specialRequest}`.trim();
    }

    // Generate new script
    const scriptContent = await generateScript({
      product: productData,
      style: options.style,
      duration: options.duration,
      platform: options.platform,
    });

    // Update the script
    const updatedScript = await updateScript(scriptId, {
      content: scriptContent,
    });

    return NextResponse.json({ script: updatedScript }, { status: 200 });
  } catch (error) {
    console.error('Error regenerating script:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to regenerate script' },
      { status: 500 }
    );
  }
}
