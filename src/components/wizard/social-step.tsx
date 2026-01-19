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
      // Note: This API doesn't exist yet, but following the PRD it should
      const response = await fetch(`/api/projects/${projectId}/social/posts`);
      if (response.ok) {
        const data = await response.json();
        setPosts(data.posts || []);
      }
    } catch (error) {
      // Posts API doesn't exist yet, so this is expected
      console.error('Error loading posts:', error);
    }
  };

  useEffect(() => {
    Promise.all([loadAccounts(), loadPosts()]).finally(() => setIsLoading(false));
  }, [projectId]);

  const handleConnectAccount = async (platform: string) => {
    try {
      // This would typically redirect to OAuth flow
      // For now, we'll simulate the connection
      const response = await fetch(`/api/projects/${projectId}/social/accounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform }),
      });

      if (!response.ok) {
        throw new Error('Failed to connect account');
      }

      const data = await response.json();
      setAccounts(prev => [...prev, data.account]);
      toast.success(`Connected to ${platforms.find(p => p.id === platform)?.name}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to connect account');
    }
  };

  const handlePostNow = async () => {
    if (selectedPlatforms.length === 0) {
      toast.error('Please select at least one platform');
      return;
    }

    setIsPosting(true);
    try {
      const scheduledAt = scheduledDate && scheduledTime
        ? new Date(`${scheduledDate}T${scheduledTime}`).toISOString()
        : null;

      const response = await fetch(`/api/projects/${projectId}/social/post`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platforms: selectedPlatforms,
          scheduledAt,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to schedule post');
      }

      toast.success(scheduledAt ? 'Post scheduled successfully!' : 'Post published successfully!');
      onNext();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to post');
    } finally {
      setIsPosting(false);
    }
  };

  const handlePlatformToggle = (platformId: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(platformId)
        ? prev.filter(p => p !== platformId)
        : [...prev, platformId]
    );
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loading size="lg" text="Loading social media settings..." />
      </div>
    );
  }

  if (readOnly) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-foreground">Social Media</h2>
        <p className="mt-2 text-muted">Social media posting configuration.</p>
        <div className="mt-6 space-y-4">
          <div className="rounded-xl border border-border bg-surface p-4">
            <div className="text-sm font-medium text-foreground">Connected Accounts</div>
            <div className="mt-2 space-y-2">
              {accounts.length > 0 ? (
                accounts.map(account => (
                  <div key={account.id} className="flex items-center justify-between">
                    <span className="text-sm text-foreground">
                      {platforms.find(p => p.id === account.platform)?.name} - {account.accountName}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs ${
                      account.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {account.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted">No accounts connected</p>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface p-4">
            <div className="text-sm font-medium text-foreground">Scheduled Posts</div>
            <div className="mt-2 space-y-2">
              {posts.length > 0 ? (
                posts.map(post => (
                  <div key={post.id} className="flex items-center justify-between">
                    <span className="text-sm text-foreground">
                      {platforms.find(p => p.id === post.platform)?.name}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs ${
                      post.status === 'published' ? 'bg-green-100 text-green-800' :
                      post.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                      post.status === 'failed' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {post.status}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted">No posts scheduled</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-foreground">Social Media</h2>
      <p className="mt-2 text-muted">
        Connect your social media accounts and schedule posts for your video.
      </p>

      <div className="mt-6 space-y-6">
        {/* Connected Accounts */}
        <div>
          <h3 className="text-lg font-medium text-foreground mb-4">Connected Accounts</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {platforms.map(platform => {
              const connectedAccount = accounts.find(acc => acc.platform === platform.id);
              return (
                <div key={platform.id} className="rounded-xl border border-border bg-surface p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className={`px-3 py-1 rounded text-sm font-medium ${platform.color}`}>
                      {platform.name}
                    </div>
                    {connectedAccount && (
                      <span className={`px-2 py-1 rounded text-xs ${
                        connectedAccount.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {connectedAccount.isActive ? 'Connected' : 'Inactive'}
                      </span>
                    )}
                  </div>
                  {connectedAccount ? (
                    <div className="text-sm text-foreground">
                      @{connectedAccount.accountName}
                    </div>
                  ) : (
                    <Button
                      onClick={() => handleConnectAccount(platform.id)}
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      Connect Account
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Posting Options */}
        <div>
          <h3 className="text-lg font-medium text-foreground mb-4">Post to Platforms</h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">Select Platforms</label>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {platforms.map(platform => {
                  const isConnected = accounts.some(acc => acc.platform === platform.id && acc.isActive);
                  return (
                    <label
                      key={platform.id}
                      className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedPlatforms.includes(platform.id)
                          ? 'border-brand bg-brand-50'
                          : 'border-border hover:border-border-strong'
                      } ${!isConnected ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedPlatforms.includes(platform.id)}
                        onChange={() => handlePlatformToggle(platform.id)}
                        disabled={!isConnected}
                        className="h-4 w-4 border-border text-brand focus:ring-brand/30"
                      />
                      <div className={`px-2 py-1 rounded text-xs font-medium ${platform.color}`}>
                        {platform.name}
                      </div>
                      {!isConnected && (
                        <span className="text-xs text-muted">Not connected</span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Scheduling */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Schedule Date (Optional)
                </label>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="block w-full rounded-xl border border-border px-3 py-2 text-sm text-foreground shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Schedule Time (Optional)
                </label>
                <input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="block w-full rounded-xl border border-border px-3 py-2 text-sm text-foreground shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            onClick={handlePostNow}
            disabled={isPosting || selectedPlatforms.length === 0}
          >
            {isPosting
              ? 'Publishing...'
              : scheduledDate && scheduledTime
                ? 'Schedule Post'
                : 'Post Now'
            }
          </Button>
          <Button variant="outline" onClick={onNext}>
            Skip for Now
          </Button>
        </div>
      </div>
    </div>
  );
}