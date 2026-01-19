'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import toast from 'react-hot-toast';

interface PopulateResponse {
  success: boolean;
  data: {
    fetched: number;
    created: number;
    updated: number;
    errors: number;
    skipped: number;
    imagesUploaded: number;
    imagesFailed: number;
    strategy?: string;
    duration?: number;
  };
  message?: string;
  error?: string;
  debug?: any;
}

type PopulateStrategy =
  | 'individual-products'
  | 'fresh-only'
  | 'bulk-update';

interface StrategyConfig {
  name: string;
  description: string;
  icon: string;
  recommended: boolean;
}

const STRATEGIES: Record<PopulateStrategy, StrategyConfig> = {
  'individual-products': {
    name: 'Individual Products',
    description: 'Fetch specific trending products with direct TikTok Shop URLs',
    icon: '🛍️',
    recommended: true,
  },
  'fresh-only': {
    name: 'Fresh Content Only',
    description: 'Only add products not already in the database',
    icon: '✨',
    recommended: false,
  },
  'bulk-update': {
    name: 'Bulk Update',
    description: 'Update existing products with fresh data and images',
    icon: '🔄',
    recommended: false,
  },
};


// Common country codes for TikTok
const COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'BR', name: 'Brazil' },
  { code: 'MX', name: 'Mexico' },
  { code: 'IN', name: 'India' },
  { code: 'JP', name: 'Japan' },
  { code: 'KR', name: 'South Korea' },
];

export function TikTokShopPopulateClient() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<PopulateResponse['data'] | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [showDebug, setShowDebug] = useState(false);

  // Form state
  const [strategy, setStrategy] = useState<PopulateStrategy>('individual-products');
  const [batchSize, setBatchSize] = useState(50);
  const [maxBatches, setMaxBatches] = useState(1);
  const [country, setCountry] = useState('US');
  const [minTrendingScore, setMinTrendingScore] = useState(0);
  const [includeImages, setIncludeImages] = useState(true);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [previewMode, setPreviewMode] = useState(false);

  const handlePopulate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isLoading) return;

    setIsLoading(true);
    setResults(null);

    try {
      const payload = {
        strategy,
        batchSize,
        maxBatches,
        country,
        minTrendingScore,
        includeImages,
        skipDuplicates,
        previewMode,
      };

      const response = await fetch('/api/tiktok-shop/populate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data: PopulateResponse = await response.json();

      if (!response.ok) {
        let errorMessage = data.error || data.message || 'Failed to populate data';

        if (data.error === 'Configuration error' || errorMessage.includes('RAPID_API_KEY')) {
          errorMessage = 'RAPID_API_KEY is not configured. Please add it to your environment variables.';
        } else if (response.status === 401) {
          errorMessage = 'You must be authenticated to use this feature.';
        } else if (response.status === 429) {
          errorMessage = data.message || 'Rate limit exceeded. Please wait before trying again.';
        }

        throw new Error(errorMessage);
      }

      if (data.success) {
        setResults(data.data);
        setDebugInfo(data.debug || null);

        if (data.data.fetched === 0) {
          toast.error(
            data.message || 'No products were fetched from the API. Check the API response or try different parameters.',
            { duration: 5000 }
          );

          if (data.debug) {
            setShowDebug(true);
          }
        } else {
          const strategyName = STRATEGIES[strategy as PopulateStrategy]?.name || strategy;
          toast.success(
            `${strategyName}: Processed ${data.data.fetched} products! ` +
            `Created: ${data.data.created}, Updated: ${data.data.updated}`
          );
          setShowDebug(false);
        }
      } else {
        throw new Error(data.message || 'Populate operation failed');
      }
    } catch (error) {
      console.error('Error populating data:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to populate data');
    } finally {
      setIsLoading(false);
    }
  };


  const clearResults = () => {
    setResults(null);
    setDebugInfo(null);
    setShowDebug(false);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            TikTok Shop Data Population
          </h1>
          <p className="text-gray-600">
            Continuously populate your database with trending TikTok Shop products.
            Choose from different strategies to optimize data freshness and relevance.
          </p>
        </div>

        <form onSubmit={handlePopulate} className="space-y-8">
          {/* Strategy Selection */}
          <div>
            <label className="block text-lg font-semibold text-gray-900 mb-4">
              Population Strategy
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(STRATEGIES).map(([key, config]) => (
                <div
                  key={key}
                  className={`relative border rounded-lg p-4 cursor-pointer transition-all ${
                    strategy === key
                      ? 'border-brand bg-brand-50 ring-2 ring-brand/20'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setStrategy(key as PopulateStrategy)}
                >
                  {config.recommended && (
                    <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                      Recommended
                    </div>
                  )}
                  <div className="text-2xl mb-2">{config.icon}</div>
                  <h3 className="font-semibold text-gray-900 mb-1">{config.name}</h3>
                  <p className="text-sm text-gray-600">{config.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Population Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Batch Size */}
            <div>
              <Input
                type="number"
                label="Batch Size"
                min={10}
                max={100}
                value={batchSize}
                onChange={(e) => setBatchSize(parseInt(e.target.value) || 50)}
                disabled={isLoading}
                helperText="Products per batch (10-100)"
              />
            </div>

            {/* Max Batches */}
            <div>
              <Input
                type="number"
                label="Max Batches"
                min={1}
                max={10}
                value={maxBatches}
                onChange={(e) => setMaxBatches(parseInt(e.target.value) || 1)}
                disabled={isLoading}
                helperText="Number of batches to process (1-10)"
              />
            </div>

            {/* Country */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target Country
              </label>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                disabled={isLoading}
              >
                {COUNTRIES.map((countryOption) => (
                  <option key={countryOption.code} value={countryOption.code}>
                    {countryOption.name} ({countryOption.code})
                  </option>
                ))}
              </select>
            </div>
          </div>


          {/* Advanced Options */}
          <div>
            <label className="block text-lg font-semibold text-gray-900 mb-4">
              Advanced Options
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Min Trending Score */}
              <div>
                <Input
                  type="number"
                  label="Min Trending Score"
                  min={0}
                  max={100}
                  value={minTrendingScore}
                  onChange={(e) => setMinTrendingScore(parseInt(e.target.value) || 0)}
                  disabled={isLoading}
                  helperText="Minimum score (0-100)"
                />
              </div>

              {/* Options Checkboxes */}
              <div className="space-y-3">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={includeImages}
                    onChange={(e) => setIncludeImages(e.target.checked)}
                    className="rounded border-gray-300 text-brand focus:ring-brand"
                  />
                  <span className="text-sm text-gray-700">Include Images</span>
                </label>

                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={skipDuplicates}
                    onChange={(e) => setSkipDuplicates(e.target.checked)}
                    className="rounded border-gray-300 text-brand focus:ring-brand"
                  />
                  <span className="text-sm text-gray-700">Skip Duplicates</span>
                </label>

                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={previewMode}
                    onChange={(e) => setPreviewMode(e.target.checked)}
                    className="rounded border-gray-300 text-brand focus:ring-brand"
                  />
                  <span className="text-sm text-gray-700">Preview Mode</span>
                </label>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-4 pt-4">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isLoading}
              disabled={isLoading}
            >
              {isLoading ? 'Populating Data...' : `Populate with ${STRATEGIES[strategy].name}`}
            </Button>

            {results && (
              <Button
                type="button"
                variant="outline"
                onClick={clearResults}
              >
                Clear Results
              </Button>
            )}

            {results && (
              <div className="text-sm text-gray-500 ml-auto">
                Last run: {new Date().toLocaleTimeString()}
              </div>
            )}
          </div>
        </form>

        {/* Results Display */}
        {results && (
          <div className="mt-8 border-t border-gray-200 pt-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Population Results - {STRATEGIES[strategy]?.name}
              </h2>
              <div className="text-sm text-gray-500">
                Strategy: {strategy} | Duration: {results.duration || 'N/A'}ms
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
              <div className="rounded-lg bg-blue-50 p-4">
                <div className="text-sm font-medium text-blue-700">Fetched</div>
                <div className="text-2xl font-bold text-blue-900">{results.fetched}</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <div className="text-sm text-green-600 font-medium">Created</div>
                <div className="text-2xl font-bold text-green-900">{results.created}</div>
              </div>
              <div className="bg-yellow-50 rounded-lg p-4">
                <div className="text-sm text-yellow-600 font-medium">Updated</div>
                <div className="text-2xl font-bold text-yellow-900">{results.updated}</div>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="text-sm text-purple-600 font-medium">Images</div>
                <div className="text-2xl font-bold text-purple-900">{results.imagesUploaded}</div>
              </div>
              {results.errors > 0 && (
                <div className="bg-red-50 rounded-lg p-4">
                  <div className="text-sm text-red-600 font-medium">Errors</div>
                  <div className="text-2xl font-bold text-red-900">{results.errors}</div>
                </div>
              )}
              {results.skipped > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600 font-medium">Skipped</div>
                  <div className="text-2xl font-bold text-gray-900">{results.skipped}</div>
                </div>
              )}
              {results.imagesFailed > 0 && (
                <div className="bg-orange-50 rounded-lg p-4">
                  <div className="text-sm text-orange-600 font-medium">Images Failed</div>
                  <div className="text-2xl font-bold text-orange-900">{results.imagesFailed}</div>
                </div>
              )}
            </div>

            {/* Warnings */}
            {results.errors > 0 && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">
                  ⚠️ {results.errors} product(s) failed to process. Check server logs for details.
                </p>
              </div>
            )}

            {results.skipped > 0 && (
              <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-sm text-gray-800">
                  ℹ️ {results.skipped} product(s) were skipped (duplicates or missing data).
                </p>
              </div>
            )}

            {previewMode && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  👁️ Preview mode was enabled - no data was actually saved.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Debug Info Section */}
        {showDebug && debugInfo && (
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">Debug Information</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDebug(false)}
              >
                Hide
              </Button>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <pre className="text-xs text-gray-700 overflow-auto max-h-64">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* Help Section */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Population Strategies</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">🛍️ Individual Products</h4>
              <p className="text-sm text-gray-600 mb-2">
                Fetches specific trending products with direct TikTok Shop URLs.
              </p>
              <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                <li>Real product URLs: https://shop.tiktok.com/product/12345</li>
                <li>Complete product data and pricing</li>
                <li>High conversion potential</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-2">✨ Fresh Content Only</h4>
              <p className="text-sm text-gray-600 mb-2">
                Only adds products that don't already exist in the database.
              </p>
              <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                <li>Avoids duplicates</li>
                <li>Perfect for incremental updates</li>
                <li>Conserves database space</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-2">🔄 Bulk Update</h4>
              <p className="text-sm text-gray-600 mb-2">
                Updates existing products with fresh data and images.
              </p>
              <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                <li>Refreshes pricing and availability</li>
                <li>Updates product images</li>
                <li>Keeps data current</li>
              </ul>
            </div>
          </div>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-semibold text-gray-900 mb-2">💡 Tips for Success</h4>
            <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
              <li>Start with small batches (20-50) to test API limits</li>
              <li>Use "Preview Mode" first to see what data will be fetched</li>
              <li>Enable "Skip Duplicates" to avoid unnecessary API calls</li>
              <li>Schedule regular population runs to keep data fresh</li>
              <li>Monitor error rates and adjust strategies as needed</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}