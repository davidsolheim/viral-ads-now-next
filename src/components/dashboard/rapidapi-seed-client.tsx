'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import toast from 'react-hot-toast';

interface SeedResponse {
  success: boolean;
  data: {
    fetched: number;
    created: number;
    updated: number;
    errors: number;
    skipped: number;
    imagesUploaded: number;
    imagesFailed: number;
  };
  message?: string;
  error?: string;
}

// Common country codes for TikTok
const COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'IT', name: 'Italy' },
  { code: 'ES', name: 'Spain' },
  { code: 'BR', name: 'Brazil' },
  { code: 'MX', name: 'Mexico' },
  { code: 'IN', name: 'India' },
  { code: 'JP', name: 'Japan' },
  { code: 'KR', name: 'South Korea' },
  { code: 'CN', name: 'China' },
];

export function RapidAPISeedClient() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<SeedResponse['data'] | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [showDebug, setShowDebug] = useState(false);
  
  // Form state
  const [page, setPage] = useState(1);
  const [last, setLast] = useState(7);
  const [orderBy, setOrderBy] = useState('post');
  const [orderType, setOrderType] = useState<'asc' | 'desc'>('desc');
  const [country, setCountry] = useState('');
  const [limit, setLimit] = useState<number | undefined>(undefined);

  const handleSeed = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isLoading) return;

    setIsLoading(true);
    setResults(null);

    try {
      const response = await fetch('/api/tiktok-shop/seed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          page,
          last,
          order_by: orderBy,
          order_type: orderType,
          ...(country && { country }),
          ...(limit && { limit }),
        }),
      });

      const data: SeedResponse = await response.json();

      if (!response.ok) {
        // Provide more helpful error messages
        let errorMessage = data.error || data.message || 'Failed to seed data';
        
        if (data.error === 'Configuration error' || errorMessage.includes('RAPID_API_KEY') || errorMessage.includes('RAPIDAPI_KEY')) {
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
          // Show warning if no products were fetched
          toast.error(
            data.message || 'No products were fetched from the API. Check the API response or try different parameters.',
            { duration: 5000 }
          );
          
          // Show debug info if available
          if (data.debug) {
            setShowDebug(true);
            console.log('Debug info:', data.debug);
          }
        } else {
          toast.success(
            `Successfully processed ${data.data.fetched} products! ` +
            `Created: ${data.data.created}, Updated: ${data.data.updated}`
          );
          setShowDebug(false);
        }
      } else {
        throw new Error(data.message || 'Seed operation failed');
      }
    } catch (error) {
      console.error('Error seeding data:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to seed data');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            RapidAPI TikTok Seed Data
          </h1>
          <p className="text-sm text-gray-600">
            Fetch and load trending TikTok products from RapidAPI Creative Center API.
            Images will be automatically downloaded and stored in Wasabi.
          </p>
        </div>

        <form onSubmit={handleSeed} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Page */}
            <div>
              <Input
                type="number"
                label="Page"
                min={1}
                value={page}
                onChange={(e) => setPage(parseInt(e.target.value) || 1)}
                disabled={isLoading}
                helperText="Page number for pagination"
              />
            </div>

            {/* Last (Days) */}
            <div>
              <Input
                type="number"
                label="Last (Days)"
                min={1}
                max={30}
                value={last}
                onChange={(e) => setLast(parseInt(e.target.value) || 7)}
                disabled={isLoading}
                helperText="Number of days to look back (1-30)"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Order By */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Order By
              </label>
              <select
                value={orderBy}
                onChange={(e) => setOrderBy(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                disabled={isLoading}
              >
                <option value="post">Post</option>
                <option value="views">Views</option>
                <option value="likes">Likes</option>
                <option value="comments">Comments</option>
                <option value="shares">Shares</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Field to order results by
              </p>
            </div>

            {/* Order Type */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Order Type
              </label>
              <select
                value={orderType}
                onChange={(e) => setOrderType(e.target.value as 'asc' | 'desc')}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                disabled={isLoading}
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Sort direction
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Country Selection (Optional) */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Country (Optional)
              </label>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                disabled={isLoading}
              >
                <option value="">All Countries</option>
                {COUNTRIES.map((countryOption) => (
                  <option key={countryOption.code} value={countryOption.code}>
                    {countryOption.name} ({countryOption.code})
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Optional: Filter by country
              </p>
            </div>

            {/* Limit (Optional) */}
            <div>
              <Input
                type="number"
                label="Limit (Optional)"
                min={1}
                max={100}
                value={limit || ''}
                onChange={(e) => setLimit(e.target.value ? parseInt(e.target.value) : undefined)}
                disabled={isLoading}
                helperText="Optional: Max number of products to fetch"
                placeholder="Leave empty for default"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex items-center gap-4">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isLoading}
              disabled={isLoading}
            >
              {isLoading ? 'Fetching Data...' : 'Fetch & Load Data'}
            </Button>
            
            {results && (
              <div className="text-sm text-gray-600">
                Last run: {new Date().toLocaleTimeString()}
              </div>
            )}
          </div>
        </form>

        {/* Results Display */}
        {results && (
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Results
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-sm text-blue-600 font-medium">Fetched</div>
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
                <div className="text-sm text-purple-600 font-medium">Images Uploaded</div>
                <div className="text-2xl font-bold text-purple-900">{results.imagesUploaded}</div>
              </div>
              <div className="bg-red-50 rounded-lg p-4">
                <div className="text-sm text-red-600 font-medium">Errors</div>
                <div className="text-2xl font-bold text-red-900">{results.errors}</div>
              </div>
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

            {results.errors > 0 && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">
                  ⚠️ {results.errors} product(s) failed to process. Check the server logs for details.
                </p>
              </div>
            )}

            {results.skipped > 0 && (
              <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-sm text-gray-800">
                  ℹ️ {results.skipped} product(s) were skipped (missing TikTok product ID or duplicates).
                </p>
              </div>
            )}

            {results.imagesFailed > 0 && (
              <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <p className="text-sm text-orange-800">
                  ⚠️ {results.imagesFailed} image(s) failed to upload. Original URLs are stored in metadata.
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
            <p className="mt-2 text-xs text-gray-500">
              This information can help diagnose why no products were fetched. Check the response structure.
            </p>
          </div>
        )}

        {/* Info Section */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">How it works</h3>
          <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
            <li>Fetches trending products from RapidAPI TikTok Creative Center API</li>
            <li>Downloads product images and stores them in Wasabi storage</li>
            <li>Creates or updates products in the database</li>
            <li>Calculates trending scores based on engagement metrics</li>
            <li>Rate limited to 1 request per 5 minutes</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
