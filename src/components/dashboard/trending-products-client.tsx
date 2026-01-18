'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loading } from '@/components/ui/loading';
import toast from 'react-hot-toast';
import { TrendingProduct } from '@/lib/tiktok-shop/recommendations';

type SortOption = 'trending' | 'views' | 'sales' | 'price-asc' | 'price-desc';

export function TrendingProductsClient() {
  const [products, setProducts] = useState<TrendingProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minTrendingScore, setMinTrendingScore] = useState('10');
  const [sortBy, setSortBy] = useState<SortOption>('trending');
  const [limit, setLimit] = useState(20);

  // Fetch products from API
  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('limit', limit.toString());
      
      if (category) {
        params.set('category', category);
      }
      
      if (maxPrice) {
        params.set('maxPrice', maxPrice);
      }
      
      if (minTrendingScore) {
        params.set('minTrendingScore', minTrendingScore);
      }

      const response = await fetch(`/api/tiktok-shop/trending?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch trending products');
      }
      
      const data = await response.json();
      
      if (data.success && data.data) {
        setProducts(data.data);
      } else {
        setProducts([]);
      }
    } catch (error) {
      console.error('Error fetching trending products:', error);
      toast.error('Failed to load trending products');
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [category, maxPrice, minTrendingScore, limit]);

  // Filter and sort products
  const filteredAndSortedProducts = useMemo(() => {
    let filtered = [...products];

    // Apply search filter (client-side)
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (product) =>
          product.name.toLowerCase().includes(query) ||
          product.description?.toLowerCase().includes(query) ||
          product.sellerName?.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'trending': {
          const scoreA = parseFloat(a.trendingScore || '0');
          const scoreB = parseFloat(b.trendingScore || '0');
          return scoreB - scoreA;
        }
        case 'views':
          return b.totalViews - a.totalViews;
        case 'sales':
          return b.totalSales - a.totalSales;
        case 'price-asc': {
          const priceA = parseFloat(a.price || '0');
          const priceB = parseFloat(b.price || '0');
          return priceA - priceB;
        }
        case 'price-desc': {
          const priceA = parseFloat(a.price || '0');
          const priceB = parseFloat(b.price || '0');
          return priceB - priceA;
        }
        default:
          return 0;
      }
    });

    return filtered;
  }, [products, searchQuery, sortBy]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setCategory('');
    setMaxPrice('');
    setMinTrendingScore('10');
    setSortBy('trending');
    setLimit(20);
  };

  const formatPrice = (price: string | null, currency: string | null) => {
    if (!price) return 'N/A';
    const numPrice = parseFloat(price);
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(numPrice);
    return formatted;
  };

  const getUniqueCategories = useMemo(() => {
    const categories = new Set<string>();
    products.forEach((product) => {
      if (product.category) {
        categories.add(product.category);
      }
    });
    return Array.from(categories).sort();
  }, [products]);

  if (isLoading && products.length === 0) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex h-64 items-center justify-center">
          <Loading size="lg" text="Loading trending products..." />
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Trending TikTok Products</h1>
        <p className="mt-2 text-gray-600">
          Discover trending products from TikTok Shop with engagement metrics and insights
        </p>
      </div>

      {/* Filters Section */}
      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {/* Search */}
          <div className="xl:col-span-2">
            <Input
              label="Search Products"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, description, or seller..."
            />
          </div>

          {/* Category */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All Categories</option>
              {getUniqueCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Max Price */}
          <div>
            <Input
              label="Max Price"
              type="number"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              placeholder="Any"
              min="0"
              step="0.01"
            />
          </div>

          {/* Min Trending Score */}
          <div>
            <Input
              label="Min Trending Score"
              type="number"
              value={minTrendingScore}
              onChange={(e) => setMinTrendingScore(e.target.value)}
              placeholder="10"
              min="0"
            />
          </div>

          {/* Sort */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Sort By
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="trending">Trending Score</option>
              <option value="views">Most Views</option>
              <option value="sales">Most Sales</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
            </select>
          </div>
        </div>

        {/* Filter Actions */}
        <div className="mt-4 flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetFilters}
          >
            Reset Filters
          </Button>
          <div className="text-sm text-gray-600">
            Showing {filteredAndSortedProducts.length} of {products.length} products
          </div>
        </div>
      </div>

      {/* Products Grid */}
      {filteredAndSortedProducts.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-white">
          <svg
            className="h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">No products found</h3>
          <p className="mt-2 text-sm text-gray-600 text-center max-w-md">
            {searchQuery || category || maxPrice || minTrendingScore !== '10'
              ? 'Try adjusting your filters to see more products.'
              : 'No trending products available at the moment. Check back later!'}
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredAndSortedProducts.map((product) => (
              <div
                key={product.id}
                className="group relative overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-all hover:border-blue-500 hover:shadow-md"
              >
                {/* Product Image */}
                <div className="relative aspect-square bg-gray-100">
                  {product.images && product.images.length > 0 ? (
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect fill="%23e5e7eb" width="400" height="400"/%3E%3Ctext fill="%239ca3af" font-family="sans-serif" font-size="18" x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle"%3ENo Image%3C/text%3E%3C/svg%3E';
                      }}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-gray-400">
                      <svg
                        className="h-12 w-12"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                        />
                      </svg>
                    </div>
                  )}
                  {/* Trending Score Badge */}
                  {product.trendingScore && (
                    <div className="absolute top-2 left-2 rounded-full bg-blue-600 px-2 py-1 text-xs font-semibold text-white">
                      🔥 {parseFloat(product.trendingScore).toFixed(0)}
                    </div>
                  )}
                  {/* Category Badge */}
                  {product.category && (
                    <div className="absolute top-2 right-2 rounded-full bg-gray-900/70 px-2 py-1 text-xs font-medium text-white">
                      {product.category}
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div className="p-4">
                  <h3 className="mb-2 text-sm font-semibold text-gray-900 line-clamp-2 min-h-[2.5rem]">
                    {product.name}
                  </h3>

                  {/* Price */}
                  <div className="mb-3 flex items-baseline gap-2">
                    {product.price ? (
                      <>
                        <span className="text-lg font-bold text-gray-900">
                          {formatPrice(product.price, product.currency)}
                        </span>
                        {product.originalPrice &&
                          parseFloat(product.originalPrice) > parseFloat(product.price) && (
                            <span className="text-sm text-gray-500 line-through">
                              {formatPrice(product.originalPrice, product.currency)}
                            </span>
                          )}
                      </>
                    ) : (
                      <span className="text-sm text-gray-500">Price not available</span>
                    )}
                  </div>

                  {/* Metrics */}
                  <div className="mb-3 grid grid-cols-2 gap-2 text-xs text-gray-600">
                    <div>
                      <span className="font-medium">Views:</span>{' '}
                      {product.totalViews.toLocaleString()}
                    </div>
                    <div>
                      <span className="font-medium">Sales:</span>{' '}
                      {product.totalSales.toLocaleString()}
                    </div>
                  </div>

                  {/* Seller */}
                  {product.sellerName && (
                    <p className="mb-3 text-xs text-gray-500">
                      Sold by: {product.sellerName}
                    </p>
                  )}

                  {/* View on TikTok Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => window.open(product.tiktokShopUrl, '_blank', 'noopener,noreferrer')}
                  >
                    <svg
                      className="mr-2 h-4 w-4"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-.88-.05 6.33 6.33 0 0 0-5.23 2.84 6.05 6.05 0 0 0 .86 8.35 5.89 5.89 0 0 0 4.15 1.68 6.33 6.33 0 0 0 5.93-4.11 6.05 6.05 0 0 0 .29-1.85V7.44a4.85 4.85 0 0 0 3.78 4.28v-3.4a4.84 4.84 0 0 1-1-.63z"/>
                    </svg>
                    View on TikTok
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Load More */}
          {products.length >= limit && (
            <div className="mt-8 flex justify-center">
              <Button
                variant="outline"
                onClick={() => setLimit((prev) => Math.min(prev + 20, 100))}
                disabled={limit >= 100}
              >
                Load More Products
              </Button>
            </div>
          )}
        </>
      )}
    </main>
  );
}