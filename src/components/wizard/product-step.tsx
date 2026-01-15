'use client';

import { useState } from 'react';
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

export function ProductStep({ projectId, onNext }: ProductStepProps) {
  const [url, setUrl] = useState('');
  const [product, setProduct] = useState<ProductFormState | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const extractProduct = useExtractProduct(projectId);

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

        {product && (
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Features (one per line)
                </label>
                <textarea
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Benefits (one per line)
                </label>
                <textarea
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                <p className="text-sm font-medium text-gray-700 mb-3">Product Images</p>
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
                {isSaving ? 'Saving...' : 'Continue to Script'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
