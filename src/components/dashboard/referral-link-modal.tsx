'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';

interface ReferralLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ReferralData {
  referralCode: string;
  referralLink: string;
  stats: {
    totalReferrals: number;
    pendingCount: number;
    claimedCount: number;
    rewardedCount: number;
    totalRewards: number;
  };
}

export function ReferralLinkModal({ isOpen, onClose }: ReferralLinkModalProps) {
  const [data, setData] = useState<ReferralData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editCode, setEditCode] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchReferralData();
    }
  }, [isOpen]);

  const fetchReferralData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/users/referral');
      if (!response.ok) {
        throw new Error('Failed to fetch referral data');
      }
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Error fetching referral data:', error);
      toast.error('Failed to load referral information');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      toast.error('Failed to copy to clipboard');
    }
  };

  const handleStartEdit = () => {
    if (data) {
      setEditCode(data.referralCode);
      setIsEditing(true);
      setError(null);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditCode('');
    setError(null);
  };

  const handleSaveCode = async () => {
    if (!data) return;

    // Validate code format
    if (editCode.length < 3 || editCode.length > 20) {
      setError('Referral code must be between 3 and 20 characters');
      return;
    }

    if (!/^[A-Za-z0-9-_]+$/.test(editCode)) {
      setError('Referral code can only contain letters, numbers, hyphens, and underscores');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/users/referral', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          referralCode: editCode,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update referral code');
      }

      const result = await response.json();
      setData(result);
      setIsEditing(false);
      toast.success('Referral code updated successfully!');
    } catch (error) {
      console.error('Error updating referral code:', error);
      setError(error instanceof Error ? error.message : 'Failed to update referral code');
      toast.error(error instanceof Error ? error.message : 'Failed to update referral code');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Your Referral Link" size="md">
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="text-subtle">Loading...</div>
        </div>
      ) : data ? (
        <div className="space-y-6">
          {/* Referral Code */}
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">
              Your Referral Code
            </label>
            {isEditing ? (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editCode}
                    onChange={(e) => {
                      setEditCode(e.target.value.toUpperCase());
                      setError(null);
                    }}
                    className="flex-1 rounded-xl border border-border px-3 py-2 text-sm font-mono text-foreground focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                    placeholder="Enter custom code"
                    maxLength={20}
                    disabled={isSaving}
                  />
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleSaveCode}
                    isLoading={isSaving}
                    disabled={isSaving}
                  >
                    Save
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancelEdit}
                    disabled={isSaving}
                  >
                    Cancel
                  </Button>
                </div>
                {error && (
                  <p className="text-sm text-red-600">{error}</p>
                )}
                <p className="text-xs text-subtle">
                  3-20 characters, letters, numbers, hyphens, and underscores only
                </p>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={data.referralCode}
                  readOnly
                  className="flex-1 rounded-xl border border-border bg-surface-muted px-3 py-2 text-sm font-mono text-foreground"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(data.referralCode)}
                >
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleStartEdit}
                  title="Customize your referral code"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                </Button>
              </div>
            )}
          </div>

          {/* Referral Link */}
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">
              Your Referral Link
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={data.referralLink}
                readOnly
                className="flex-1 rounded-xl border border-border bg-surface-muted px-3 py-2 text-sm text-foreground truncate"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(data.referralLink)}
              >
                {copied ? 'Copied!' : 'Copy'}
              </Button>
            </div>
            <p className="mt-1 text-xs text-subtle">
              Share this link with others to earn rewards when they sign up!
            </p>
          </div>

          {/* Stats */}
          <div className="border-t border-border pt-4">
            <h3 className="mb-3 text-sm font-semibold text-foreground">Your Referral Stats</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-brand-50 p-3">
                <div className="text-xs font-medium text-brand">Total Referrals</div>
                <div className="text-2xl font-bold text-foreground">{data.stats.totalReferrals}</div>
              </div>
              <div className="bg-green-50 rounded-lg p-3">
                <div className="text-xs text-green-600 font-medium">Rewarded</div>
                <div className="text-2xl font-bold text-green-900">{data.stats.rewardedCount}</div>
              </div>
              <div className="bg-yellow-50 rounded-lg p-3">
                <div className="text-xs text-yellow-600 font-medium">Pending</div>
                <div className="text-2xl font-bold text-yellow-900">{data.stats.pendingCount}</div>
              </div>
              <div className="bg-purple-50 rounded-lg p-3">
                <div className="text-xs text-purple-600 font-medium">Total Rewards</div>
                <div className="text-2xl font-bold text-purple-900">{data.stats.totalRewards}</div>
              </div>
            </div>
          </div>

          {/* Close Button */}
          <div className="flex justify-end pt-4">
            <Button variant="primary" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          Failed to load referral data
        </div>
      )}
    </Modal>
  );
}
