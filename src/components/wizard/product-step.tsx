'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loading } from '@/components/ui/loading';
import { ProductNameLoading } from '@/components/ui/product-name-loading';
import { useExtractProduct } from '@/hooks/use-projects';

interface ProductStepProps {
  projectId: string;
  onNext: () => void;
  readOnly?: boolean;
}

interface ProductFormState {
  name: string;
  description: string;
  price: string;
  originalPrice: string;
  category: string;
  soldCount: string;
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

export function ProductStep({ projectId, onNext, readOnly = false }: ProductStepProps) {
  const [url, setUrl] = useState('');
  const [product, setProduct] = useState<ProductFormState | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [flowType, setFlowType] = useState<'manual' | 'automatic'>('manual');
  const [projectFlowType, setProjectFlowType] = useState<'manual' | 'automatic' | null>(null);
  const [savedProducts, setSavedProducts] = useState<any[]>([]);
  const [showSavedProducts, setShowSavedProducts] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isExtractingName, setIsExtractingName] = useState(false);

  const extractProduct = useExtractProduct(projectId);

  // Load existing product data and project settings on mount
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
                category: existingProduct.category || '',
                soldCount: existingProduct.soldCount ? String(existingProduct.soldCount) : '',
                featuresText: toTextBlock(existingProduct.features),
                benefitsText: toTextBlock(existingProduct.benefits),
                images: existingProduct.images || [],
              });
            }
            // Set URL from product or project (if product doesn't exist yet but project has productUrl)
            setUrl(existingProduct.url || '');
          }
        }

        // Load project to get flowType and organizationId
        const projectResponse = await fetch(`/api/projects/${projectId}`);
        if (projectResponse.ok) {
          const projectData = await projectResponse.json();
          const project = projectData.project;
          const currentFlowType = (project?.settings as any)?.flowType || 'manual';
          setFlowType(currentFlowType);
          setProjectFlowType(currentFlowType);
          setOrganizationId(project.organizationId);
          
          // Load saved products
          if (project.organizationId) {
            const productsResponse = await fetch(`/api/products?organizationId=${project.organizationId}`);
            if (productsResponse.ok) {
              const productsData = await productsResponse.json();
              setSavedProducts(productsData.products || []);
            }
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

  const handleExtract = async () => {
    setIsExtractingName(true);
    try {
      const result = await extractProduct.mutateAsync({ url });
      const extracted = result.product;

      setProduct({
        name: extracted.name || '',
        description: extracted.description || '',
        price: extracted.price || '',
        originalPrice: extracted.originalPrice || '',
        category: extracted.category || '',
        soldCount: extracted.soldCount ? String(extracted.soldCount) : '',
        featuresText: toTextBlock(extracted.features),
        benefitsText: toTextBlock(extracted.benefits),
        images: extracted.images || [],
      });
    } finally {
      setIsExtractingName(false);
    }
  };

  const handleSelectSavedProduct = async (savedProduct: any) => {
    setSelectedProductId(savedProduct.id);
    setProduct({
      name: savedProduct.name || '',
      description: savedProduct.description || '',
      price: savedProduct.price ? String(savedProduct.price) : '',
      originalPrice: savedProduct.originalPrice ? String(savedProduct.originalPrice) : '',
      category: savedProduct.category || '',
      soldCount: savedProduct.soldCount ? String(savedProduct.soldCount) : '',
      featuresText: toTextBlock(savedProduct.features),
      benefitsText: toTextBlock(savedProduct.benefits),
      images: savedProduct.images || [],
    });
    setUrl(savedProduct.url || '');
    setShowSavedProducts(false);
  };

  const handleSave = async () => {
    if (!product) return;

    setIsSaving(true);
    try {
      // If a saved product was selected, link it to the project
      if (selectedProductId) {
        const response = await fetch(`/api/projects/${projectId}/product`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            product: {
              name: product.name,
              description: product.description || undefined,
              price: product.price || undefined,
              originalPrice: product.originalPrice || undefined,
              category: product.category || undefined,
              soldCount: product.soldCount ? parseInt(product.soldCount, 10) : undefined,
              features: toList(product.featuresText),
              benefits: toList(product.benefitsText),
              images: product.images,
              url,
            },
            flowType: flowType,
            productId: selectedProductId,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to save product data');
        }
      } else {
        // Update product normally
        const response = await fetch(`/api/projects/${projectId}/product`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            product: {
              name: product.name,
              description: product.description || undefined,
              price: product.price || undefined,
              originalPrice: product.originalPrice || undefined,
              category: product.category || undefined,
              soldCount: product.soldCount ? parseInt(product.soldCount, 10) : undefined,
              features: toList(product.featuresText),
              benefits: toList(product.benefitsText),
              images: product.images,
              url,
            },
            flowType: flowType,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to save product data');
        }
      }

      toast.success('Product details saved!');
      onNext();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save product data');
    } finally {
      setIsSaving(false);
    }
  };

  // Only allow changing flow type before product is saved
  const canChangeFlowType = !product;

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check if file is WebP, AVIF, or HEIC
    const isWebP = file.type === 'image/webp';
    const isAVIF = file.type === 'image/avif';
    const isHEIC = file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif');

    if (!isWebP && !isAVIF && !isHEIC && !file.type.startsWith('image/')) {
      toast.error('Please upload a valid image file');
      return;
    }

    setIsUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch(`/api/projects/${projectId}/product/images`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload image');
      }

      const result = await response.json();
      const newImageUrl = result.url;

      setProduct((prev) =>
        prev ? { ...prev, images: [...prev.images, newImageUrl] } : prev
      );

      toast.success('Image uploaded successfully!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to upload image');
    } finally {
      setIsUploadingImage(false);
      // Reset input
      event.target.value = '';
    }
  };

  const handleRemoveImage = (index: number) => {
    setProduct((prev) =>
      prev ? { ...prev, images: prev.images.filter((_, i) => i !== index) } : prev
    );
  };

  if (readOnly && isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loading size="lg" text="Loading product data..." />
      </div>
    );
  }

  if (readOnly) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-foreground">Product Details</h2>
        <p className="mt-2 text-muted">AI extracted these product details.</p>
        <div className="mt-6 space-y-4">
          <div className="rounded-xl border border-border bg-surface p-4">
            <div className="text-sm text-subtle">Name</div>
            <div className="text-base text-foreground">{product?.name || 'Not available'}</div>
          </div>
          <div className="rounded-xl border border-border bg-surface p-4">
            <div className="text-sm text-subtle">Description</div>
            <div className="text-sm text-foreground whitespace-pre-wrap">
              {product?.description || 'Not available'}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-surface p-4">
              <div className="text-sm text-subtle">Price</div>
              <div className="text-base text-foreground">{product?.price || '—'}</div>
            </div>
            <div className="rounded-xl border border-border bg-surface p-4">
              <div className="text-sm text-subtle">Original Price</div>
              <div className="text-base text-foreground">{product?.originalPrice || '—'}</div>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-surface p-4">
            <div className="text-sm text-subtle">Category</div>
            <div className="text-base text-foreground">{product?.category || '—'}</div>
          </div>
          <div className="rounded-xl border border-border bg-surface p-4">
            <div className="text-sm text-subtle">Features</div>
            <div className="text-sm text-foreground whitespace-pre-wrap">
              {product?.featuresText || '—'}
            </div>
          </div>
          <div className="rounded-xl border border-border bg-surface p-4">
            <div className="text-sm text-subtle">Benefits</div>
            <div className="text-sm text-foreground whitespace-pre-wrap">
              {product?.benefitsText || '—'}
            </div>
          </div>
          {product?.images?.length ? (
            <div>
              <div className="text-sm font-medium text-foreground">Images</div>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {product.images.map((img, index) => (
                  <div
                    key={`${img}-${index}`}
                    className="aspect-square overflow-hidden rounded-lg border border-border bg-surface"
                  >
                    <img src={img} alt="Product" className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-foreground">Product Details</h2>
      <p className="mt-2 text-muted">
        Paste a product URL and we will extract the key details automatically.
      </p>

      {/* Flow Type Toggle */}
      <div className="mt-6 rounded-xl border border-border bg-surface-muted p-4">
        <label className="mb-3 block text-sm font-medium text-foreground">
          Project Flow Type
        </label>
        <div className="space-y-2">
          <label className={`flex items-center space-x-3 cursor-pointer ${!canChangeFlowType ? 'opacity-60' : ''}`}>
            <input
              type="radio"
              name="flowType"
              value="manual"
              checked={flowType === 'manual'}
              onChange={(e) => setFlowType(e.target.value as 'manual' | 'automatic')}
              disabled={!canChangeFlowType}
              className="h-4 w-4 border-border text-brand focus:ring-brand/30 disabled:cursor-not-allowed"
            />
            <div>
              <span className="text-sm font-medium text-foreground">Manual Flow</span>
              <p className="text-xs text-subtle">
                Full control - choose and tweak everything step by step
              </p>
            </div>
          </label>
          <label className={`flex items-center space-x-3 cursor-pointer ${!canChangeFlowType ? 'opacity-60' : ''}`}>
            <input
              type="radio"
              name="flowType"
              value="automatic"
              checked={flowType === 'automatic'}
              onChange={(e) => setFlowType(e.target.value as 'manual' | 'automatic')}
              disabled={!canChangeFlowType}
              className="h-4 w-4 border-border text-brand focus:ring-brand/30 disabled:cursor-not-allowed"
            />
            <div>
              <span className="text-sm font-medium text-foreground">Automatic Flow</span>
              <p className="text-xs text-subtle">
                After selecting product, style, and concept, everything else is generated automatically
              </p>
            </div>
          </label>
        </div>
        {!canChangeFlowType && (
          <p className="mt-2 text-xs text-subtle">
            Flow type cannot be changed after product details are saved.
          </p>
        )}
      </div>

      <div className="mt-6 space-y-6">
        {isLoading && (
          <Loading size="lg" text="Loading product data..." />
        )}

        {!isLoading && (
          <>
            {savedProducts.length > 0 && (
              <div className="rounded-xl border border-border bg-surface-muted p-4">
                <div className="mb-3 flex items-center justify-between">
                  <label className="block text-sm font-medium text-foreground">
                    Or select from saved products
                  </label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSavedProducts(!showSavedProducts)}
                  >
                    {showSavedProducts ? 'Hide' : 'Show'} Saved Products
                  </Button>
                </div>
                {showSavedProducts && (
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 max-h-64 overflow-y-auto">
                    {savedProducts.map((savedProduct) => (
                      <button
                        key={savedProduct.id}
                        onClick={() => handleSelectSavedProduct(savedProduct)}
                        className={`text-left rounded-lg border p-3 transition-colors ${
                          selectedProductId === savedProduct.id
                            ? 'border-brand bg-brand-50'
                            : 'border-border bg-white hover:border-border-strong'
                        }`}
                      >
                        <p className="truncate text-sm font-medium text-foreground">
                          {savedProduct.name}
                        </p>
                        {savedProduct.price && (
                          <p className="mt-1 text-xs text-muted">${savedProduct.price}</p>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
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
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  Product Name
                </label>
                {isExtractingName ? (
                  <div className="block w-full rounded-xl border border-border px-3 py-2 text-sm bg-surface-muted">
                    <ProductNameLoading />
                  </div>
                ) : (
                  <input
                    type="text"
                    value={product.name}
                    onChange={(event) =>
                      setProduct((prev) =>
                        prev ? { ...prev, name: event.target.value } : prev
                      )
                    }
                    className="block w-full rounded-xl border border-border px-3 py-2 text-sm text-foreground shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                  />
                )}
              </div>
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
              <Input
                label="Category"
                value={product.category}
                onChange={(event) =>
                  setProduct((prev) =>
                    prev ? { ...prev, category: event.target.value } : prev
                  )
                }
                placeholder="e.g., Electronics, Fashion, Home & Garden"
              />
              <Input
                label="Sold Count"
                type="number"
                value={product.soldCount}
                onChange={(event) =>
                  setProduct((prev) =>
                    prev ? { ...prev, soldCount: event.target.value } : prev
                  )
                }
                placeholder="Number of units sold"
              />
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  Description
                </label>
                <textarea
                  className="block w-full rounded-xl border border-border px-3 py-2 text-sm text-foreground shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
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
                <label className="mb-1 block text-sm font-medium text-foreground">
                  Features (one per line)
                </label>
                <textarea
                  className="block w-full rounded-xl border border-border px-3 py-2 text-sm text-foreground shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
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
                <label className="mb-1 block text-sm font-medium text-foreground">
                  Benefits (one per line)
                </label>
                <textarea
                  className="block w-full rounded-xl border border-border px-3 py-2 text-sm text-foreground shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
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

            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-gray-900">Product Images</p>
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={isUploadingImage}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isUploadingImage}
                    onClick={() => (document.querySelector('input[type="file"]') as HTMLInputElement)?.click()}
                  >
                    {isUploadingImage ? 'Uploading...' : 'Upload Image'}
                  </Button>
                </label>
              </div>
              {product.images.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {product.images.map((imageUrl, index) => (
                    <div
                      key={imageUrl}
                      className="relative overflow-hidden rounded-lg border border-gray-200 group"
                    >
                      <img
                        src={imageUrl}
                        alt={`Product ${index + 1}`}
                        className="h-32 w-full object-cover"
                      />
                      <button
                        onClick={() => handleRemoveImage(index)}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="Remove image"
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
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No images uploaded yet</p>
              )}
            </div>

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
