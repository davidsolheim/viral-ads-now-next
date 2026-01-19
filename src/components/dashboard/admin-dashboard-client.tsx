'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

interface AdminCardProps {
  title: string;
  description: string;
  icon: string;
  href: string;
  stats?: Array<{
    label: string;
    value: string | number;
    color: string;
  }>;
}

function AdminCard({ title, description, icon, href, stats }: AdminCardProps) {
  const router = useRouter();

  return (
    <div
      className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow cursor-pointer"
      onClick={() => router.push(href)}
    >
      <div className="mb-4">
        <div className="flex items-center gap-3">
          <div className="text-3xl">{icon}</div>
          <div>
            <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
            <p className="text-gray-600 mt-1">{description}</p>
          </div>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 gap-4 mb-4">
          {stats.map((stat, index) => (
            <div key={index} className={`p-3 rounded-lg bg-${stat.color}-50`}>
              <div className={`text-sm font-medium text-${stat.color}-700`}>{stat.label}</div>
              <div className={`text-xl font-bold text-${stat.color}-900`}>{stat.value}</div>
            </div>
          ))}
        </div>
      )}

      <Button variant="outline" className="w-full">
        Manage {title.toLowerCase()}
      </Button>
    </div>
  );
}

export function AdminDashboardClient() {
  const adminCards: AdminCardProps[] = [
    {
      title: 'Affiliates',
      description: 'Manage affiliates, track referrals, and handle commissions.',
      icon: '👥',
      href: '/dashboard/admin/affiliates',
      stats: [
        { label: 'Total Affiliates', value: '—', color: 'brand' },
        { label: 'Active Affiliates', value: '—', color: 'green' },
        { label: 'Total Referrals', value: '—', color: 'purple' },
        { label: 'Rewards Paid', value: '—', color: 'yellow' },
      ],
    },
    {
      title: 'Data Population',
      description: 'Populate and manage TikTok Shop product data.',
      icon: '🛍️',
      href: '/dashboard/admin/data-populate/tiktok-shop',
      stats: [
        { label: 'Products', value: '—', color: 'blue' },
        { label: 'Last Updated', value: '—', color: 'gray' },
        { label: 'API Status', value: '—', color: 'green' },
        { label: 'Success Rate', value: '—', color: 'purple' },
      ],
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Admin Dashboard
        </h1>
        <p className="text-gray-600">
          Manage and monitor all administrative functions for the platform.
        </p>
      </div>

      {/* Admin Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {adminCards.map((card, index) => (
          <AdminCard key={index} {...card} />
        ))}
      </div>

      {/* System Status Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          System Status
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <div>
              <div className="font-medium text-gray-900">Database</div>
              <div className="text-sm text-gray-600">Operational</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <div>
              <div className="font-medium text-gray-900">API Services</div>
              <div className="text-sm text-gray-600">Operational</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <div>
              <div className="font-medium text-gray-900">External APIs</div>
              <div className="text-sm text-gray-600">Rate limited</div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Quick Actions
        </h2>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" size="sm">
            View System Logs
          </Button>
          <Button variant="outline" size="sm">
            Export User Data
          </Button>
          <Button variant="outline" size="sm">
            Clear Cache
          </Button>
          <Button variant="outline" size="sm">
            Run Database Migration
          </Button>
        </div>
      </div>
    </div>
  );
}