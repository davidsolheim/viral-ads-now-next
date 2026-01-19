 import { NextRequest, NextResponse } from 'next/server';
 import { auth } from '@/lib/auth';
 import {
   getProject,
   checkUserOrganizationAccess,
   updateProjectName,
   archiveProject,
   unarchiveProject,
 } from '@/lib/db-queries';
 import { z } from 'zod';

 const projectActionSchema = z.object({
   action: z.enum(['rename', 'archive', 'unarchive']),
   name: z.string().min(1).max(255).optional(),
 });

 export async function PATCH(
   request: NextRequest,
   { params }: { params: Promise<{ projectId: string }> }
 ) {
   try {
     const session = await auth();
     const { projectId } = await params;

     if (!session?.user?.id) {
       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
     }

     const body = await request.json();
     const validated = projectActionSchema.parse(body);

     const project = await getProject(projectId);
     if (!project) {
       return NextResponse.json({ error: 'Project not found' }, { status: 404 });
     }

     const member = await checkUserOrganizationAccess(session.user.id, project.organizationId);
     if (!member) {
       return NextResponse.json({ error: 'Access denied' }, { status: 403 });
     }

     if (validated.action === 'rename') {
       if (!validated.name) {
         return NextResponse.json({ error: 'name is required' }, { status: 400 });
       }
       const updated = await updateProjectName(projectId, validated.name.trim());
       return NextResponse.json({ project: updated }, { status: 200 });
     }

     if (validated.action === 'archive') {
       const archived = await archiveProject(projectId);
       return NextResponse.json({ project: archived }, { status: 200 });
     }

     const unarchived = await unarchiveProject(projectId);
     return NextResponse.json({ project: unarchived }, { status: 200 });
   } catch (error) {
     console.error('Error updating project:', error);
     if (error instanceof z.ZodError) {
       return NextResponse.json(
         { error: 'Invalid request data', details: error.issues },
         { status: 400 }
       );
     }
     return NextResponse.json(
       { error: error instanceof Error ? error.message : 'Failed to update project' },
       { status: 500 }
     );
   }
 }
