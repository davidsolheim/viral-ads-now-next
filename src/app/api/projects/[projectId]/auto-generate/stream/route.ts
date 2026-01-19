import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { getProject } from '@/lib/db-queries';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { projectId } = await params;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let isClosed = false;
      let lastPayload = '';

      const send = (payload: any) => {
        const data = `data: ${JSON.stringify(payload)}\n\n`;
        controller.enqueue(encoder.encode(data));
      };

      const emit = async () => {
        if (isClosed) return;
        try {
          const project = await getProject(projectId);
          const autoGenerate = (project?.settings as any)?.autoGenerate || {};
          const payload = {
            step: autoGenerate.step || project?.currentStep,
            status: autoGenerate.status || project?.status,
            message: autoGenerate.message,
            totalScenes: autoGenerate.totalScenes,
            completedImages: autoGenerate.completedImages,
            completedVideos: autoGenerate.completedVideos,
            hasVoiceover: autoGenerate.hasVoiceover,
            updatedAt: autoGenerate.updatedAt || project?.updatedAt?.toISOString(),
          };
          const serialized = JSON.stringify(payload);
          if (serialized !== lastPayload) {
            lastPayload = serialized;
            send(payload);
          }
        } catch (error) {
          send({ status: 'error', message: 'Failed to load progress.' });
        }
      };

      await emit();
      const interval = setInterval(emit, 1000);

      request.signal.addEventListener('abort', () => {
        isClosed = true;
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
