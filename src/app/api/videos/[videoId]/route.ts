 import { NextRequest, NextResponse } from 'next/server';
 import { auth } from '@/lib/auth';
 import {
   getFinalVideo,
   checkUserOrganizationAccess,
   archiveFinalVideo,
   unarchiveFinalVideo,
 } from '@/lib/db-queries';
 import { z } from 'zod';

 const videoActionSchema = z.object({
   action: z.enum(['archive', 'unarchive']),
 });

 export async function PATCH(
   request: NextRequest,
   { params }: { params: Promise<{ videoId: string }> }
 ) {
   try {
     const session = await auth();
     const { videoId } = await params;

     if (!session?.user?.id) {
       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
     }

     const body = await request.json();
     const validated = videoActionSchema.parse(body);

     const video = await getFinalVideo(videoId);
     if (!video) {
       return NextResponse.json({ error: 'Video not found' }, { status: 404 });
     }

     const member = await checkUserOrganizationAccess(
       session.user.id,
       video.project.organizationId
     );
     if (!member) {
       return NextResponse.json({ error: 'Access denied' }, { status: 403 });
     }

     if (validated.action === 'archive') {
       const archived = await archiveFinalVideo(videoId);
       return NextResponse.json({ video: archived }, { status: 200 });
     }

     const unarchived = await unarchiveFinalVideo(videoId);
     return NextResponse.json({ video: unarchived }, { status: 200 });
   } catch (error) {
     console.error('Error updating video:', error);
     if (error instanceof z.ZodError) {
       return NextResponse.json(
         { error: 'Invalid request data', details: error.issues },
         { status: 400 }
       );
     }
     return NextResponse.json(
       { error: error instanceof Error ? error.message : 'Failed to update video' },
       { status: 500 }
     );
   }
 }
