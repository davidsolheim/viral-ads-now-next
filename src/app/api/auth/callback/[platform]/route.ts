import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { exchangeCodeForTokens, getUserInfo } from '@/lib/social-oauth';
import { createSocialAccount } from '@/lib/db-queries';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  try {
    const { platform } = await params;
    const { code, state, error } = Object.fromEntries(request.nextUrl.searchParams);

    if (error) {
      console.error(`OAuth error for ${platform}:`, error);
      return NextResponse.redirect(
        new URL('/dashboard?error=oauth_failed', request.url)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL('/dashboard?error=oauth_no_code', request.url)
      );
    }

    // Extract project ID from state if provided
    const projectId = state?.startsWith('project=') ? state.split('=')[1] : null;

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(platform, code);

    // Get user info
    const userInfo = await getUserInfo(platform, tokens.accessToken);

    // Get current user session
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.redirect(
        new URL('/auth/signin?error=oauth_session_required', request.url)
      );
    }

    // Find user's organization
    const { getUserOrganizations } = await import('@/lib/db-queries');
    const organizations = await getUserOrganizations(session.user.id);

    if (organizations.length === 0) {
      return NextResponse.redirect(
        new URL('/dashboard?error=no_organization', request.url)
      );
    }

    const organizationId = session.user.activeOrganizationId || organizations[0].id;

    // Create social account
    await createSocialAccount({
      organizationId,
      platform: platform as 'tiktok' | 'instagram_reels' | 'youtube_shorts' | 'facebook' | 'twitter',
      accountName: userInfo.name,
      accountId: userInfo.username || userInfo.id,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      tokenExpiresAt: tokens.expiresAt,
      scopes: tokens.scopes,
    });

    // Redirect back to dashboard or project page
    const redirectUrl = projectId
      ? `/projects/${projectId}?success=account_connected`
      : '/dashboard?success=account_connected';

    return NextResponse.redirect(new URL(redirectUrl, request.url));
  } catch (error) {
    console.error(`OAuth callback error for ${await params.then(p => p.platform)}:`, error);
    return NextResponse.redirect(
      new URL('/dashboard?error=oauth_callback_failed', request.url)
    );
  }
}