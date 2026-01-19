'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AffiliateEditModal } from './affiliate-edit-modal';
import toast from 'react-hot-toast';

interface Affiliate {
  referrerId: string;
  referralCode: string;
  createdAt: Date;
  referralsCount: number;
  totalRewards: number;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  } | null;
  statusBreakdown: Record<string, number>;
}

interface AffiliatesResponse {
  affiliates: Affiliate[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface StatsResponse {
  totalAffiliates: number;
  activeAffiliates: number;
  totalReferrals: number;
  totalRewardsPaid: number;
  statusBreakdown: Record<string, number>;
}

export function AdminAffiliatesClient() {
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [selectedAffiliate, setSelectedAffiliate] = useState<Affiliate | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Filters
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'createdAt' | 'referralsCount' | 'rewards'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  useEffect(() => {
    fetchAffiliates();
    fetchStats();
  }, [page, statusFilter, search, sortBy, sortOrder]);

  const fetchAffiliates = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sortBy,
        sortOrder,
      });

      if (statusFilter) {
        params.append('status', statusFilter);
      }

      if (search) {
        params.append('search', search);
      }

      const response = await fetch(`/api/admin/affiliates?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch affiliates');
      }

      const data: AffiliatesResponse = await response.json();
      setAffiliates(data.affiliates);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching affiliates:', error);
      toast.error('Failed to load affiliates');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    setIsLoadingStats(true);
    try {
      const response = await fetch('/api/admin/affiliates/stats');
      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }

      const data: StatsResponse = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  const handleEdit = (affiliate: Affiliate) => {
    setSelectedAffiliate(affiliate);
    setIsEditModalOpen(true);
  };

  const handleModalClose = () => {
    setIsEditModalOpen(false);
    setSelectedAffiliate(null);
    // Refresh data after edit
    fetchAffiliates();
    fetchStats();
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchAffiliates();
  };

  const exportToCSV = () => {
    if (affiliates.length === 0) {
      toast.error('No data to export');
      return;
    }

    const headers = ['User', 'Email', 'Referral Code', 'Total Referrals', 'Pending', 'Claimed', 'Rewarded', 'Total Rewards', 'Created Date'];
    const rows = affiliates.map((aff) => [
      aff.user?.name || 'N/A',
      aff.user?.email || 'N/A',
      aff.referralCode,
      aff.referralsCount.toString(),
      (aff.statusBreakdown.pending || 0).toString(),
      (aff.statusBreakdown.claimed || 0).toString(),
      (aff.statusBreakdown.rewarded || 0).toString(),
      aff.totalRewards.toString(),
      new Date(aff.createdAt).toLocaleDateString(),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `affiliates-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast.success('CSV exported successfully');
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="rounded-lg border border-border bg-surface p-6 shadow-sm">
        <div className="mb-6">
          <h1 className="mb-2 text-2xl font-bold text-foreground">
            Affiliates Management
          </h1>
          <p className="text-sm text-muted">
            Manage all affiliates, track referrals, and update commissions.
          </p>
        </div>

        {/* Stats Dashboard */}
        {stats && (
          <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="rounded-lg bg-brand-50 p-4">
              <div className="text-sm font-medium text-brand">Total Affiliates</div>
              <div className="text-2xl font-bold text-foreground">{stats.totalAffiliates}</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-sm text-green-600 font-medium">Active Affiliates</div>
              <div className="text-2xl font-bold text-green-900">{stats.activeAffiliates}</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="text-sm text-purple-600 font-medium">Total Referrals</div>
              <div className="text-2xl font-bold text-purple-900">{stats.totalReferrals}</div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4">
              <div className="text-sm text-yellow-600 font-medium">Total Rewards Paid</div>
              <div className="text-2xl font-bold text-yellow-900">{stats.totalRewardsPaid}</div>
            </div>
          </div>
        )}

        {/* Filters and Search */}
        <div className="mb-6 space-y-4">
          <form onSubmit={handleSearch} className="flex gap-4">
            <Input
              type="text"
              placeholder="Search by name, email, or referral code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1"
            />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-border px-3 py-2 text-sm text-foreground focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="claimed">Claimed</option>
              <option value="rewarded">Rewarded</option>
            </select>
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [by, order] = e.target.value.split('-');
                setSortBy(by as typeof sortBy);
                setSortOrder(order as typeof sortOrder);
              }}
              className="rounded-xl border border-border px-3 py-2 text-sm text-foreground focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            >
              <option value="createdAt-desc">Newest First</option>
              <option value="createdAt-asc">Oldest First</option>
              <option value="referralsCount-desc">Most Referrals</option>
              <option value="referralsCount-asc">Least Referrals</option>
              <option value="rewards-desc">Highest Rewards</option>
              <option value="rewards-asc">Lowest Rewards</option>
            </select>
            <Button type="submit" variant="primary">
              Search
            </Button>
            <Button type="button" variant="outline" onClick={exportToCSV}>
              Export CSV
            </Button>
          </form>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-surface-muted">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-subtle uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-subtle uppercase tracking-wider">
                  Referral Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-subtle uppercase tracking-wider">
                  Status Breakdown
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-subtle uppercase tracking-wider">
                  Total Referrals
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-subtle uppercase tracking-wider">
                  Total Rewards
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-subtle uppercase tracking-wider">
                  Created Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-subtle uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-surface divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-subtle">
                    Loading...
                  </td>
                </tr>
              ) : affiliates.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-subtle">
                    No affiliates found
                  </td>
                </tr>
              ) : (
                affiliates.map((affiliate) => (
                  <tr key={affiliate.referrerId} className="hover:bg-surface-muted">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {affiliate.user?.image ? (
                          <img
                            className="h-10 w-10 rounded-full"
                            src={affiliate.user.image}
                            alt={affiliate.user.name || 'User'}
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-sm font-medium text-white">
                            {(affiliate.user?.name || affiliate.user?.email || 'U').charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="ml-4">
                          <div className="text-sm font-medium text-foreground">
                            {affiliate.user?.name || 'Unknown'}
                          </div>
                          <div className="text-sm text-subtle">
                            {affiliate.user?.email || 'N/A'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <code className="rounded bg-surface-muted px-2 py-1 text-sm font-mono text-foreground">
                        {affiliate.referralCode}
                      </code>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex gap-2 text-xs">
                        <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                          P: {affiliate.statusBreakdown.pending || 0}
                        </span>
                        <span className="bg-brand-100 text-brand-700 px-2 py-1 rounded">
                          C: {affiliate.statusBreakdown.claimed || 0}
                        </span>
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded">
                          R: {affiliate.statusBreakdown.rewarded || 0}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                      {affiliate.referralsCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                      {affiliate.totalRewards}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-subtle">
                      {new Date(affiliate.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(affiliate)}
                      >
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
              {pagination.total} affiliates
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1 || isLoading}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages || isLoading}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {selectedAffiliate && (
        <AffiliateEditModal
          isOpen={isEditModalOpen}
          onClose={handleModalClose}
          referrerId={selectedAffiliate.referrerId}
        />
      )}
    </div>
  );
}
