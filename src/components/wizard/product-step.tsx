'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loading } from '@/components/ui/loading';
import { useExtractProduct } from '@/hooks/use-projects';

interface ProductStepProps {
  projectId: string;
  onNext: () => void;
}

interface ProductFormState {
  name: string;
  description: string;
  price: string;
  originalPrice: string;
  featuresText: string;
  benefitsText: string;
  images: string[];
}

const toTextBlock = (items?: string[]) => (items && items.length > 0 ? items.join('\n') : '');

const toList = (text: string) =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

interface TrendingProduct {
  id: string;
  tiktokProductId: string;
  name: string;
  description: string | null;
  price: string | null;
  originalPrice: string | null;
  currency: string | null;
  tiktokShopUrl: string;
  sellerName: string | null;
  category: string | null;
  images: string[] | null;
  totalViews: number;
  totalSales: number;
  trendingScore: string | null;
}

export function ProductStep({ projectId, onNext }: ProductStepProps) {
  const [url, setUrl] = useState('');
  const [product, setProduct] = useState<ProductFormState | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [trendingProducts, setTrendingProducts] = useState<TrendingProduct[]>([]);
  const [isLoadingTrending, setIsLoadingTrending] = useState(false);
  const [showTrending, setShowTrending] = useState(true);

  const extractProduct = useExtractProduct(projectId);

  // Load existing product data on mount
  useEffect(() => {
    const loadProduct = async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}/product`);
        if (response.ok) {
          const data = await response.json();
          const existingProduct = data.product;

          if (existingProduct) {
            // If product exists, convert database product to form state
            if (existingProduct.name) {
              setProduct({
                name: existingProduct.name || '',
                description: existingProduct.description || '',
                price: existingProduct.price ? String(existingProduct.price) : '',
                originalPrice: existingProduct.originalPrice ? String(existingProduct.originalPrice) : '',
                featuresText: toTextBlock(existingProduct.features),
                benefitsText: toTextBlock(existingProduct.benefits),
                images: existingProduct.images || [],
              });
            }
            // Set URL from product or project (if product doesn't exist yet but project has productUrl)
            setUrl(existingProduct.url || '');
          }
        }
      } catch (error) {
        console.error('Error loading product data:', error);
        // Don't show error toast - product might not exist yet
      } finally {
        setIsLoading(false);
      }
    };

    loadProduct();
  }, [projectId]);

  // Load trending products
  useEffect(() => {
    const loadTrendingProducts = async () => {
      setIsLoadingTrending(true);
      try {
        const response = await fetch('/api/tiktok-shop/trending?limit=6');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            setTrendingProducts(data.data);
          }
        }
      } catch (error) {
        console.error('Error loading trending products:', error);
        // Don't show error toast - trending products are optional
      } finally {
        setIsLoadingTrending(false);
      }
    };

    loadTrendingProducts();
  }, []);

  const handleExtract = async () => {
    const result = await extractProduct.mutateAsync({ url });
    const extracted = result.product;

    setProduct({
      name: extracted.name || '',
      description: extracted.description || '',
      price: extracted.price || '',
      originalPrice: extracted.originalPrice || '',
      featuresText: toTextBlock(extracted.features),
      benefitsText: toTextBlock(extracted.benefits),
      images: extracted.images || [],
    });
  };

  const handleSelectTrendingProduct = async (trendingProduct: TrendingProduct) => {
    // Set URL and trigger extraction
    setUrl(trendingProduct.tiktokShopUrl);
    
    // Create product form state from trending product
    setProduct({
      name: trendingProduct.name,
      description: trendingProduct.description || '',
      price: trendingProduct.price || '',
      originalPrice: trendingProduct.originalPrice || '',
      featuresText: '',
      benefitsText: '',
      images: trendingProduct.images || [],
    });

    // Try to extract more details
    try {
      const result = await extractProduct.mutateAsync({ url: trendingProduct.tiktokShopUrl });
      const extracted = result.product;

      setProduct({
        name: extracted.name || trendingProduct.name,
        description: extracted.description || trendingProduct.description || '',
        price: extracted.price || trendingProduct.price || '',
        originalPrice: extracted.originalPrice || trendingProduct.originalPrice || '',
        featuresText: toTextBlock(extracted.features),
        benefitsText: toTextBlock(extracted.benefits),
        images: extracted.images?.length ? extracted.images : trendingProduct.images || [],
      });
      
      toast.success('Trending product loaded!');
    } catch (error) {
      // If extraction fails, keep the basic data we have
      toast.success('Product loaded from trending list');
    }
  };

  const handleSave = async () => {
    if (!product) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/product`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product: {
            name: product.name,
            description: product.description || undefined,
            price: product.price || undefined,
            originalPrice: product.originalPrice || undefined,
            features: toList(product.featuresText),
            benefits: toList(product.benefitsText),
            images: product.images,
            url,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save product data');
      }

      toast.success('Product details saved!');
      onNext();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save product data');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900">Product Details</h2>
      <p className="mt-2 text-gray-600">
        Paste a product URL and we will extract the key details automatically.
      </p>

      <div className="mt-6 space-y-6">
        {isLoading && (
          <Loading size="lg" text="Loading product data..." />
        )}

        {!isLoading && (
          <>
            {/* Trending Products Section */}
            {showTrending && trendingProducts.length > 0 && (
              <div className="border rounded-lg p-4 bg-gray-50">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Trending Products on TikTok Shop
                  </h3>
                  <button
                    onClick={() => setShowTrending(false)}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Hide
                  </button>
                </div>
                {isLoadingTrending ? (
                  <Loading size="sm" text="Loading trending products..." />
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {trendingProducts.map((trendingProduct) => (
                      <div
                        key={trendingProduct.id}
                        className="border rounded-lg p-3 bg-white hover:border-blue-500 cursor-pointer transition-colors"
                        onClick={() => handleSelectTrendingProduct(trendingProduct)}
                      >
                        {trendingProduct.images && trendingProduct.images.length > 0 && (
                          <div className="mb-2 aspect-square overflow-hidden rounded">
                            <img
                              src={trendingProduct.images[0]}
                              alt={trendingProduct.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <h4 className="font-medium text-sm text-gray-900 line-clamp-2 mb-1">
                          {trendingProduct.name}
                        </h4>
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-semibold text-gray-900">
                            {trendingProduct.price && trendingProduct.currency
                              ? `${trendingProduct.currency} ${trendingProduct.price}`
                              : 'Price not available'}
                          </div>
                          {trendingProduct.trendingScore && (
                            <div className="text-xs text-blue-600 font-medium">
                              🔥 Trending
                            </div>
                          )}
                        </div>
                        {(trendingProduct.totalViews > 0 || trendingProduct.totalSales > 0) && (
                          <div className="text-xs text-gray-500 mt-1">
                            {trendingProduct.totalViews > 0 && (
                              <span>{trendingProduct.totalViews.toLocaleString()} views</span>
                            )}
                            {trendingProduct.totalViews > 0 && trendingProduct.totalSales > 0 && ' • '}
                            {trendingProduct.totalSales > 0 && (
                              <span>{trendingProduct.totalSales.toLocaleString()} sales</span>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {!isLoadingTrending && trendingProducts.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No trending products available at the moment.
                  </p>
                )}
              </div>
            )}

            {!showTrending && (
              <Button
                variant="outline"
                onClick={() => setShowTrending(true)}
                className="w-full"
              >
                Show Trending Products
              </Button>
            )}

            <div className="space-y-3">
              <Input
                label="Product URL"
                type="url"
                placeholder="https://example.com/products/your-item"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
              />
              <Button onClick={handleExtract} disabled={!url || extractProduct.isPending}>
                Extract Product
              </Button>
            </div>

            {extractProduct.isPending && (
              <Loading size="lg" text="Analyzing product page..." />
            )}
          </>
        )}

        {!isLoading && product && (
          <div className="space-y-6">
            <div className="grid gap-4">
              <Input
                label="Product Name"
                value={product.name}
                onChange={(event) =>
                  setProduct((prev) =>
                    prev ? { ...prev, name: event.target.value } : prev
                  )
                }
              />
              <Input
                label="Price"
                value={product.price}
                onChange={(event) =>
                  setProduct((prev) =>
                    prev ? { ...prev, price: event.target.value } : prev
                  )
                }
              />
              <Input
                label="Original Price"
                value={product.originalPrice}
                onChange={(event) =>
                  setProduct((prev) =>
                    prev ? { ...prev, originalPrice: event.target.value } : prev
                  )
                }
              />
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Description
                </label>
                <textarea
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  rows={4}
                  value={product.description}
                  onChange={(event) =>
                    setProduct((prev) =>
                      prev ? { ...prev, description: event.target.value } : prev
                    )
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Features (one per line)
                </label>
                <textarea
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  rows={4}
                  value={product.featuresText}
                  onChange={(event) =>
                    setProduct((prev) =>
                      prev ? { ...prev, featuresText: event.target.value } : prev
                    )
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Benefits (one per line)
                </label>
                <textarea
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  rows={4}
                  value={product.benefitsText}
                  onChange={(event) =>
                    setProduct((prev) =>
                      prev ? { ...prev, benefitsText: event.target.value } : prev
                    )
                  }
                />
              </div>
            </div>

            {product.images.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-900 mb-3">Product Images</p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {product.images.slice(0, 6).map((imageUrl) => (
                    <div
                      key={imageUrl}
                      className="overflow-hidden rounded-lg border border-gray-200"
                    >
                      <img
                        src={imageUrl}
                        alt="Product"
                        className="h-32 w-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleExtract}
                disabled={extractProduct.isPending}
              >
                Re-extract
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Continue to Style'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
