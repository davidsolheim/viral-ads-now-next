// Social Media OAuth Integration
// This provides a foundation for OAuth flows with various social platforms

interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  authorizationUrl: string;
  tokenUrl: string;
  scopes: string[];
  redirectUri: string;
}

interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  scopes?: string[];
}

// Platform-specific OAuth configurations
export const oauthConfigs: Record<string, OAuthConfig> = {
  tiktok: {
    clientId: process.env.TIKTOK_CLIENT_ID || '',
    clientSecret: process.env.TIKTOK_CLIENT_SECRET || '',
    authorizationUrl: 'https://www.tiktok.com/auth/authorize/',
    tokenUrl: 'https://open-api.tiktok.com/oauth/access_token/',
    scopes: ['user.info.basic', 'video.publish', 'video.upload'],
    redirectUri: `${process.env.AUTH_URL || 'http://localhost:3000'}/api/auth/callback/tiktok`,
  },
  instagram: {
    clientId: process.env.INSTAGRAM_CLIENT_ID || '',
    clientSecret: process.env.INSTAGRAM_CLIENT_SECRET || '',
    authorizationUrl: 'https://api.instagram.com/oauth/authorize',
    tokenUrl: 'https://api.instagram.com/oauth/access_token',
    scopes: ['user_profile', 'user_media'],
    redirectUri: `${process.env.AUTH_URL || 'http://localhost:3000'}/api/auth/callback/instagram`,
  },
  youtube: {
    clientId: process.env.YOUTUBE_CLIENT_ID || '',
    clientSecret: process.env.YOUTUBE_CLIENT_SECRET || '',
    authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: ['https://www.googleapis.com/auth/youtube.upload', 'https://www.googleapis.com/auth/youtube.readonly'],
    redirectUri: `${process.env.AUTH_URL || 'http://localhost:3000'}/api/auth/callback/youtube`,
  },
};

export function getAuthorizationUrl(platform: string, state?: string): string {
  const config = oauthConfigs[platform];
  if (!config) {
    throw new Error(`Unsupported platform: ${platform}`);
  }

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: config.scopes.join(' '),
    response_type: 'code',
    ...(state && { state }),
  });

  return `${config.authorizationUrl}?${params.toString()}`;
}

export async function exchangeCodeForTokens(
  platform: string,
  code: string,
  codeVerifier?: string
): Promise<OAuthTokens> {
  const config = oauthConfigs[platform];
  if (!config) {
    throw new Error(`Unsupported platform: ${platform}`);
  }

  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: config.redirectUri,
      ...(codeVerifier && { code_verifier: codeVerifier }),
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to exchange code for tokens: ${response.statusText}`);
  }

  const data = await response.json();

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
    scopes: data.scope ? data.scope.split(' ') : undefined,
  };
}

export async function refreshAccessToken(
  platform: string,
  refreshToken: string
): Promise<OAuthTokens> {
  const config = oauthConfigs[platform];
  if (!config) {
    throw new Error(`Unsupported platform: ${platform}`);
  }

  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to refresh access token: ${response.statusText}`);
  }

  const data = await response.json();

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken, // Some platforms return new refresh token
    expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
    scopes: data.scope ? data.scope.split(' ') : undefined,
  };
}

// Platform-specific user info fetching
export async function getUserInfo(platform: string, accessToken: string): Promise<{
  id: string;
  name: string;
  username?: string;
}> {
  switch (platform) {
    case 'tiktok':
      return getTikTokUserInfo(accessToken);
    case 'instagram':
      return getInstagramUserInfo(accessToken);
    case 'youtube':
      return getYouTubeUserInfo(accessToken);
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}

async function getTikTokUserInfo(accessToken: string) {
  const response = await fetch('https://open-api.tiktok.com/user/info/', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch TikTok user info');
  }

  const data = await response.json();
  return {
    id: data.data.user.open_id,
    name: data.data.user.display_name,
    username: data.data.user.username,
  };
}

async function getInstagramUserInfo(accessToken: string) {
  const response = await fetch(`https://graph.instagram.com/me?fields=id,username&access_token=${accessToken}`);

  if (!response.ok) {
    throw new Error('Failed to fetch Instagram user info');
  }

  const data = await response.json();
  return {
    id: data.id,
    name: data.username,
    username: data.username,
  };
}

async function getYouTubeUserInfo(accessToken: string) {
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch YouTube user info');
  }

  const data = await response.json();
  return {
    id: data.id,
    name: data.name,
    username: data.email, // YouTube uses email as username
  };
}