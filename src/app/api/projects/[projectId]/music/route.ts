import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { InferSelectModel } from 'drizzle-orm';
import { musicTracks, mediaAssets } from '@/db/schema/projects';
import {
  getProject,
  createMediaAsset,
  updateProjectStep,
  getMediaAssetsByProject,
  getMusicTracksByOrganization,
  updateProjectSettings,
} from '@/lib/db-queries';
import { generateMusicLyra, generateMusicStableAudio } from '@/lib/services/replicate';
import { uploadFromUrl } from '@/lib/services/wasabi';
import { z } from 'zod';

type MusicTrack = InferSelectModel<typeof musicTracks>;
type MediaAsset = InferSelectModel<typeof mediaAssets>;

const musicSchema = z.object({
  mode: z.enum(['preset', 'library', 'generate']),
  trackId: z.string().optional(),
  assetId: z.string().optional(),
  prompt: z.string().optional(),
  model: z.enum(['lyra-2', 'stable-audio-2-5']).optional(),
  durationSeconds: z.number().optional(),
  volume: z.number().min(0).max(100).optional(),
});

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

    const presetTracks = await getMusicTracksByOrganization(project.organizationId);
    const libraryAssets = await getMediaAssetsByProject(projectId, 'music');

    return NextResponse.json({ presetTracks, libraryAssets }, { status: 200 });
  } catch (error) {
    console.error('Error fetching music:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch music' },
      { status: 500 }
    );
  }
}

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

    const project = await getProject(projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const body = await request.json();
    const options = musicSchema.parse(body);

    let musicUrl: string | null = null;
    let metadata: any = {};

    if (options.mode === 'preset') {
      const tracks = await getMusicTracksByOrganization(project.organizationId);
      const track = tracks.find((t: MusicTrack) => t.id === options.trackId);
      if (!track) {
        return NextResponse.json({ error: 'Track not found' }, { status: 404 });
      }
      musicUrl = track.url;
      metadata = { source: 'preset', trackId: track.id, name: track.name };
    } else if (options.mode === 'library') {
      const assets = await getMediaAssetsByProject(projectId, 'music');
      const asset = assets.find((a: MediaAsset) => a.id === options.assetId);
      if (!asset) {
        return NextResponse.json({ error: 'Library asset not found' }, { status: 404 });
      }
      musicUrl = asset.url;
      metadata = { source: 'library', assetId: asset.id };
    } else if (options.mode === 'generate') {
      if (!options.prompt) {
        return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
      }
      const model = options.model || 'lyra-2';
      const duration = options.durationSeconds || (model === 'lyra-2' ? 30 : 90);
      musicUrl =
        model === 'lyra-2'
          ? await generateMusicLyra({ prompt: options.prompt, durationSeconds: duration })
          : await generateMusicStableAudio({ prompt: options.prompt, durationSeconds: duration });
      metadata = { source: 'generated', model, prompt: options.prompt, duration };
    }

    if (!musicUrl) {
      return NextResponse.json({ error: 'Failed to resolve music URL' }, { status: 500 });
    }

    const uploadResult = await uploadFromUrl(musicUrl, {
      organizationId: project.organizationId,
      projectId,
      assetType: 'audio',
      metadata: {
        source: metadata.source || 'music',
      },
    });

    const asset = await createMediaAsset({
      projectId,
      type: 'music',
      url: uploadResult.url,
      metadata,
    });

    if (options.volume !== undefined) {
      await updateProjectSettings(projectId, {
        ...(project.settings || {}),
        music_volume: options.volume,
      });
    }

    await updateProjectStep(projectId, 'captions');

    return NextResponse.json({ music: asset }, { status: 201 });
  } catch (error) {
    console.error('Error saving music:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save music' },
      { status: 500 }
    );
  }
}
