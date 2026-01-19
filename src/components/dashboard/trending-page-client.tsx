'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TrendingProductsClient } from './trending-products-client';

type PlatformTab = 'tiktok' | 'amazon' | 'ebay' | 'facebook' | 'instagram' | 'shopify' | 'etsy' | 'ecommerce';

interface PlatformInfo {
  id: PlatformTab;
  name: string;
  icon?: React.ReactNode;
}

const platforms: PlatformInfo[] = [
  { id: 'tiktok', name: 'TikTok' },
  { id: 'amazon', name: 'Amazon' },
  { id: 'ebay', name: 'eBay' },
  { id: 'facebook', name: 'Facebook' },
  { id: 'instagram', name: 'Instagram' },
  { id: 'shopify', name: 'Shopify' },
  { id: 'etsy', name: 'Etsy' },
  { id: 'ecommerce', name: 'E-commerce' },
];

interface TrendingPageClientProps {
  initialPlatform?: PlatformTab;
  initialCategory?: string;
}

export function TrendingPageClient({ 
  initialPlatform = 'tiktok',
  initialCategory 
}: TrendingPageClientProps = {}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<PlatformTab>(initialPlatform);

  const ComingSoonContent = ({ platformName }: { platformName: string }) => (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex h-96 flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-white">
        <svg
          className="h-16 w-16 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <h3 className="mt-4 text-xl font-semibold text-gray-900">{platformName} Trending</h3>
        <p className="mt-2 text-sm text-gray-600">Coming soon</p>
      </div>
    </main>
  );

  return (
    <>
      {/* Tabs Navigation */}
      <div className="border-b border-border bg-surface">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            {platforms.map((platform) => (
              <button
                key={platform.id}
                onClick={() => {
                  setActiveTab(platform.id);
                  // Navigate to base trending page when switching tabs (clears category filter)
                  if (initialCategory) {
                    router.push('/dashboard/trending');
                  }
                }}
                className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium transition-colors ${
                  activeTab === platform.id
                    ? 'border-brand text-brand'
                    : 'border-transparent text-subtle hover:border-border hover:text-foreground'
                }`}
              >
                {platform.name}
                {platform.id !== 'tiktok' && (
                  <span className="ml-1 text-xs text-subtle">(Coming soon)</span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'tiktok' && <TrendingProductsClient initialCategory={initialCategory} platform={activeTab} />}
      {activeTab === 'amazon' && <ComingSoonContent platformName="Amazon" />}
      {activeTab === 'ebay' && <ComingSoonContent platformName="eBay" />}
      {activeTab === 'facebook' && <ComingSoonContent platformName="Facebook" />}
      {activeTab === 'instagram' && <ComingSoonContent platformName="Instagram" />}
      {activeTab === 'shopify' && <ComingSoonContent platformName="Shopify" />}
      {activeTab === 'etsy' && <ComingSoonContent platformName="Etsy" />}
      {activeTab === 'ecommerce' && <ComingSoonContent platformName="E-commerce" />}
    </>
  );
}
