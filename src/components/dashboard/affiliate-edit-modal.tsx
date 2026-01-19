'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';

interface AffiliateEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  referrerId: string;
}

interface ReferralDetail {
  id: string;
  referralCode: string;
  status: 'pending' | 'claimed' | 'rewarded';
  rewardCreditAmount: number | null;
  claimedAt: Date | null;
  rewardedAt: Date | null;
  createdAt: Date;
  referredUser: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  } | null;
}

interface ReferralData {
  referral: {
    id: string;
    referrerId: string;
    referralCode: string;
    status: 'pending' | 'claimed' | 'rewarded';
    rewardCreditAmount: number | null;
    createdAt: Date;
  };
  affiliateReferrals: ReferralDetail[];
}

export function AffiliateEditModal({ isOpen, onClose, referrerId }: AffiliateEditModalProps) {
  const [data, setData] = useState<ReferralData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingReferralId, setEditingReferralId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<'pending' | 'claimed' | 'rewarded'>('pending');
  const [editReward, setEditReward] = useState<number>(0);

  useEffect(() => {
    if (isOpen && referrerId) {
      fetchReferralData();
    }
  }, [isOpen, referrerId]);

  const fetchReferralData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/affiliates/referrer/${referrerId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch affiliate details');
      }

      const result = await response.json();
      setData({
        referral: result.referral,
        affiliateReferrals: result.affiliateReferrals,
      });
    } catch (error) {
      console.error('Error fetching referral data:', error);
      toast.error('Failed to load affiliate details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateReferral = async (referralId: string) => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/admin/affiliates/${referralId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: editStatus,
          rewardCreditAmount: editReward,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update referral');
      }

      toast.success('Referral updated successfully');
      setEditingReferralId(null);
      fetchReferralData();
    } catch (error) {
      console.error('Error updating referral:', error);
      toast.error('Failed to update referral');
    } finally {
      setIsSaving(false);
    }
  };

  const startEdit = (referral: ReferralDetail) => {
    setEditingReferralId(referral.id);
    setEditStatus(referral.status);
    setEditReward(referral.rewardCreditAmount || 0);
  };

  const cancelEdit = () => {
    setEditingReferralId(null);
  };

  if (!data) {
    return null;
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Affiliate Details" size="xl">
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="text-gray-500">Loading...</div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Affiliate Info */}
          <div className="border-b border-gray-200 pb-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Affiliate Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Referral Code</label>
                <code className="text-sm font-mono text-gray-900 bg-gray-100 px-2 py-1 rounded">
                  {data.referral.referralCode}
                </code>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Created</label>
                <div className="text-sm text-gray-900">
                  {new Date(data.referral.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>

          {/* Referred Users List */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              Referred Users ({data.affiliateReferrals.length})
            </h3>
            <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      User
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Reward
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Date
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.affiliateReferrals.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-4 text-center text-sm text-gray-500">
                        No referrals yet
                      </td>
                    </tr>
                  ) : (
                    data.affiliateReferrals.map((referral) => (
                      <tr key={referral.id}>
                        {editingReferralId === referral.id ? (
                          <>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {referral.referredUser?.name || referral.referredUser?.email || 'N/A'}
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <select
                                value={editStatus}
                                onChange={(e) => setEditStatus(e.target.value as typeof editStatus)}
                                className="text-sm rounded border border-gray-300 px-2 py-1"
                              >
                                <option value="pending">Pending</option>
                                <option value="claimed">Claimed</option>
                                <option value="rewarded">Rewarded</option>
                              </select>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <Input
                                type="number"
                                value={editReward}
                                onChange={(e) => setEditReward(parseInt(e.target.value) || 0)}
                                className="w-20"
                                min={0}
                              />
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                              {new Date(referral.createdAt).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="primary"
                                  onClick={() => handleUpdateReferral(referral.id)}
                                  isLoading={isSaving}
                                >
                                  Save
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={cancelEdit}
                                  disabled={isSaving}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex items-center">
                                {referral.referredUser?.image ? (
                                  <img
                                    className="h-8 w-8 rounded-full mr-2"
                                    src={referral.referredUser.image}
                                    alt={referral.referredUser.name || 'User'}
                                  />
                                ) : (
                                  <div className="mr-2 flex h-8 w-8 items-center justify-center rounded-full bg-brand text-xs font-medium text-white">
                                    {(referral.referredUser?.name || referral.referredUser?.email || 'U').charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <div>
                                  <div className="text-sm font-medium text-foreground">
                                    {referral.referredUser?.name || 'Unknown'}
                                  </div>
                                  <div className="text-xs text-subtle">
                                    {referral.referredUser?.email || 'N/A'}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span
                                className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  referral.status === 'pending'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : referral.status === 'claimed'
                                    ? 'bg-brand-100 text-brand-700'
                                    : 'bg-green-100 text-green-800'
                                }`}
                              >
                                {referral.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-foreground">
                              {referral.rewardCreditAmount || 0}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-subtle">
                              {new Date(referral.createdAt).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => startEdit(referral)}
                              >
                                Edit
                              </Button>
                            </td>
                          </>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Close Button */}
          <div className="flex justify-end pt-4 border-t border-gray-200">
            <Button variant="primary" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
