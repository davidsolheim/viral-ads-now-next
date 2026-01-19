'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Loading } from '@/components/ui/loading';

interface SocialAccount {
  id: string;
  platform: 'tiktok' | 'instagram_reels' | 'youtube_shorts' | 'facebook' | 'twitter';
  accountName: string;
  accountId: string;
  isActive: boolean;
}

interface SocialPost {
  id: string;
  platform: 'tiktok' | 'instagram_reels' | 'youtube_shorts' | 'facebook' | 'twitter';
  title?: string;
  description?: string;
  hashtags?: string[];
  scheduledAt?: string;
  status: 'draft' | 'scheduled' | 'published' | 'failed';
}

interface SocialStepProps {
  projectId: string;
  onNext: () => void;
  readOnly?: boolean;
}

const platforms = [
  { id: 'tiktok', name: 'TikTok', color: 'bg-black text-white' },
  { id: 'instagram_reels', name: 'Instagram Reels', color: 'bg-pink-500 text-white' },
  { id: 'youtube_shorts', name: 'YouTube Shorts', color: 'bg-red-500 text-white' },
  { id: 'facebook', name: 'Facebook', color: 'bg-blue-500 text-white' },
  { id: 'twitter', name: 'Twitter/X', color: 'bg-gray-900 text-white' },
] as const;

export function SocialStep({ projectId, onNext, readOnly = false }: SocialStepProps) {
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPosting, setIsPosting] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [postingErrors, setPostingErrors] = useState<Record<string, string>>({});

  const loadAccounts = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/social/accounts`);
      if (response.ok) {
        const data = await response.json();
        setAccounts(data.accounts || []);
      }
    } catch (error) {
      console.error('Error loading accounts:', error);
    }
  };

  const loadPosts = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/social/post`);
      if (response.ok) {
        const data = await response.json();
        setPosts(data.posts || []);
      }
    } catch (error) {
      console.error('Error loading posts:', error);
    }
  };

  useEffect(() => {
    Promise.all([loadAccounts(), loadPosts()]).finally(() => setIsLoading(false));
  }, [projectId]);

  const handleConnectPlatform = async (platform: string) => {
    try {
      // Redirect to OAuth authorization URL
      const { getAuthorizationUrl } = await import('@/lib/social-oauth');
      const authUrl = getAuthorizationUrl(platform, `project=${projectId}`);
      window.location.href = authUrl;
    } catch (error) {
      console.error('Error initiating OAuth flow:', error);
      toast.error('Failed to connect account. Please try again.');
    }
  };

  const handleCreatePosts = async () => {
    if (selectedPlatforms.length === 0) {
      toast.error('Please select at least one platform');
      return;
    }

    const activeAccounts = accounts.filter(account =>
      selectedPlatforms.includes(account.platform) && account.isActive
    );

    if (activeAccounts.length === 0) {
      toast.error('No active accounts found for selected platforms');
      return;
    }

    setIsPosting(true);
    setPostingErrors({});

    try {
      const scheduledAt = scheduledDate && scheduledTime
        ? new Date(`${scheduledDate}T${scheduledTime}`).toISOString()
        : undefined;

      const results = await Promise.allSettled(
        activeAccounts.map(async (account) => {
          try {
            const response = await fetch(`/api/projects/${projectId}/social/post`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                socialAccountId: account.id,
                platform: account.platform,
                scheduledAt,
              }),
            });

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              throw new Error(errorData.error || `Failed to create post for ${account.platform}`);
            }

            return await response.json();
          } catch (error) {
            throw { platform: account.platform, error };
          }
        })
      );

      const errors: Record<string, string> = {};
      let successCount = 0;

      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          successCount++;
        } else {
          const { platform, error } = result.reason;
          errors[platform] = error instanceof Error ? error.message : 'Unknown error';
        }
      });

      setPostingErrors(errors);

      if (successCount > 0) {
        await loadPosts(); // Refresh posts list
        if (successCount === activeAccounts.length) {
          toast.success(`Posts ${scheduledAt ? 'scheduled' : 'created'} successfully!`);
          onNext();
        } else {
          toast.success(`${successCount} posts ${scheduledAt ? 'scheduled' : 'created'} successfully. ${Object.keys(errors).length} failed.`);
        }
      } else {
        toast.error('All posts failed to create. Please check the errors below.');
      }
    } catch (error) {
      console.error('Error creating posts:', error);
      toast.error('An unexpected error occurred while creating posts');
    } finally {
      setIsPosting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loading size="lg" text="Loading social accounts..." />
      </div>
    );
  }

  const connectedPlatforms = accounts.filter(account => account.isActive).map(account => account.platform);
  const disconnectedPlatforms = platforms.filter(platform => !connectedPlatforms.includes(platform.id));

  return (
    <div>
      <h2 className="text-2xl font-bold text-foreground">Social Media Posting</h2>
      <p className="mt-2 text-muted">Connect your accounts and schedule posts across multiple platforms.</p>

      <div className="mt-6 space-y-6">
        {/* Connected Accounts */}
        {accounts.filter(account => account.isActive).length > 0 && (
          <div>
            <h3 className="text-lg font-medium text-foreground mb-3">Connected Accounts</h3>
            <div className="grid gap-3">
              {accounts.filter(account => account.isActive).map((account) => (
                <div key={account.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                      platforms.find(p => p.id === account.platform)?.color
                    }`}>
                      {account.platform}
                    </div>
                    <div>
                      <div className="font-medium">{account.accountName}</div>
                      <div className="text-sm text-muted">@{account.accountId}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-green-600">Connected</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Connect New Accounts */}
        {disconnectedPlatforms.length > 0 && (
          <div>
            <h3 className="text-lg font-medium text-foreground mb-3">Connect Accounts</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {disconnectedPlatforms.map((platform) => (
                <button
                  key={platform.id}
                  onClick={() => handleConnectPlatform(platform.id)}
                  className={`p-4 border border-border rounded-lg hover:border-brand transition-colors text-left ${
                    readOnly ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  disabled={readOnly}
                >
                  <div className={`inline-flex px-3 py-1 rounded-full text-sm font-medium mb-2 ${platform.color}`}>
                    {platform.name}
                  </div>
                  <div className="text-sm text-muted">
                    Connect your {platform.name.toLowerCase()} account
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Post Scheduling */}
        {accounts.filter(account => account.isActive).length > 0 && (
          <div>
            <h3 className="text-lg font-medium text-foreground mb-3">Create Posts</h3>

            <div className="space-y-4">
              {/* Platform Selection */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Select Platforms
                </label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {accounts.filter(account => account.isActive).map((account) => (
                    <label key={account.id} className="flex items-center gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-surface-muted">
                      <input
                        type="checkbox"
                        checked={selectedPlatforms.includes(account.platform)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedPlatforms(prev => [...prev, account.platform]);
                          } else {
                            setSelectedPlatforms(prev => prev.filter(p => p !== account.platform));
                          }
                        }}
                        className="rounded"
                        disabled={readOnly}
                      />
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${platforms.find(p => p.id === account.platform)?.color}`}>
                        {account.platform}
                      </div>
                      <span className="text-sm">{account.accountName}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Scheduling */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Schedule Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg"
                    min={new Date().toISOString().split('T')[0]}
                    disabled={readOnly}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Schedule Time (Optional)
                  </label>
                  <input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg"
                    disabled={readOnly}
                  />
                </div>
              </div>

              <Button
                onClick={handleCreatePosts}
                disabled={selectedPlatforms.length === 0 || isPosting || readOnly}
                className="w-full"
              >
                {isPosting ? 'Creating Posts...' : scheduledDate && scheduledTime ? 'Schedule Posts' : 'Post Now'}
              </Button>

              {/* Error Display */}
              {Object.keys(postingErrors).length > 0 && (
                <div className="mt-4 p-4 border border-red-200 bg-red-50 rounded-lg">
                  <h4 className="text-sm font-medium text-red-800 mb-2">Posting Errors:</h4>
                  <ul className="text-sm text-red-700 space-y-1">
                    {Object.entries(postingErrors).map(([platform, error]) => (
                      <li key={platform}>
                        <strong>{platform}:</strong> {error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Existing Posts */}
        {posts.length > 0 && (
          <div>
            <h3 className="text-lg font-medium text-foreground mb-3">Scheduled Posts</h3>
            <div className="space-y-3">
              {posts.map((post) => (
                <div key={post.id} className="p-4 border border-border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${platforms.find(p => p.id === post.platform)?.color}`}>
                      {post.platform}
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs ${
                      post.status === 'published' ? 'bg-green-100 text-green-800' :
                      post.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                      post.status === 'failed' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {post.status}
                    </div>
                  </div>
                  {post.scheduledAt && (
                    <div className="text-sm text-muted">
                      Scheduled: {new Date(post.scheduledAt).toLocaleString()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}