'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Loading } from '@/components/ui/loading';
import { Modal } from '@/components/ui/modal';
import { ContextMenu, useContextMenu } from '@/components/ui/context-menu';

interface Product {
  id: string;
  name: string;
  description?: string;
  price?: string;
  url?: string;
  images?: string[];
  createdAt: string;
  updatedAt?: string | null;
  deletedAt?: string | null;
  hasVideo?: boolean;
  latestVideo?: {
    id: string;
    url: string;
    createdAt: Date | string | null;
  };
  latestProject?: {
    id: string;
    name: string;
    status: string;
    updatedAt: Date | string | null;
  };
}

interface ProductLibraryClientProps {
  userId: string;
  organizationId: string;
}

export function ProductLibraryClient({ userId, organizationId }: ProductLibraryClientProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [contextProductId, setContextProductId] = useState<string | null>(null);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [productToArchive, setProductToArchive] = useState<Product | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);
  const router = useRouter();
  const contextMenu = useContextMenu();

  useEffect(() => {
    loadProducts();
  }, [organizationId, showArchived]);

  const loadProducts = async () => {
    try {
      setIsLoading(true);
      const url = `/api/products?organizationId=${organizationId}${showArchived ? '&includeArchived=true' : ''}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setProducts(data.products || []);
      } else {
        toast.error('Failed to load products');
      }
    } catch (error) {
      console.error('Error loading products:', error);
      toast.error('Failed to load products');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProject = async () => {
    if (!selectedProductId || !projectName.trim()) {
      toast.error('Please select a product and enter a project name');
      return;
    }

    try {
      setIsCreating(true);
      const response = await fetch('/api/projects/from-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProductId,
          name: projectName.trim(),
          organizationId,
          flowType: 'manual',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success('Project created successfully!');
        setIsCreateModalOpen(false);
        setProjectName('');
        setSelectedProductId(null);
        router.push(`/projects/${data.project.id}`);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to create project');
      }
    } catch (error) {
      console.error('Error creating project:', error);
      toast.error('Failed to create project');
    } finally {
      setIsCreating(false);
    }
  };

  const handleArchive = async () => {
    if (!productToArchive) return;

    try {
      setIsArchiving(true);
      const action = productToArchive.deletedAt ? 'unarchive' : 'archive';
      const response = await fetch('/api/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: productToArchive.id,
          action,
        }),
      });

      if (response.ok) {
        toast.success(action === 'archive' ? 'Product archived successfully' : 'Product unarchived successfully');
        setIsArchiveModalOpen(false);
        setProductToArchive(null);
        loadProducts();
      } else {
        const error = await response.json();
        toast.error(error.error || `Failed to ${action} product`);
      }
    } catch (error) {
      console.error(`Error ${productToArchive.deletedAt ? 'unarchiving' : 'archiving'} product:`, error);
      toast.error(`Failed to ${productToArchive.deletedAt ? 'unarchive' : 'archive'} product`);
    } finally {
      setIsArchiving(false);
    }
  };

  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const contextProduct = products.find((p) => p.id === contextProductId);

  const handleRename = async () => {
    if (!contextProductId || !renameValue.trim()) {
      toast.error('Product name is required');
      return;
    }
    try {
      const response = await fetch('/api/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: contextProductId,
          action: 'rename',
          name: renameValue.trim(),
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to rename product');
      }
      toast.success('Product renamed');
      setIsRenameModalOpen(false);
      loadProducts();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to rename product');
    }
  };

  if (isLoading) {
    return <Loading size="lg" text="Loading products..." />;
  }

  const activeProducts = products.filter((p) => !p.deletedAt);
  const archivedProducts = products.filter((p) => p.deletedAt);
  const displayedProducts = showArchived ? products : activeProducts;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Product Library</h2>
          <p className="mt-1 text-sm text-muted">
            Manage your saved products and create new videos from them
          </p>
        </div>
        <div className="flex items-center gap-3">
          {archivedProducts.length > 0 && (
            <label className="flex items-center gap-2 text-sm text-muted cursor-pointer">
              <input
                type="checkbox"
                checked={showArchived}
                onChange={(e) => setShowArchived(e.target.checked)}
                className="rounded border-border text-brand focus:ring-brand/30"
              />
              <span>Show archived ({archivedProducts.length})</span>
            </label>
          )}
          <Button onClick={() => setIsCreateModalOpen(true)}>Create Video from Product</Button>
        </div>
      </div>

      {displayedProducts.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-12 text-center">
          <p className="text-muted">
            {showArchived ? 'No archived products.' : 'No products saved yet.'}
          </p>
          <p className="mt-2 text-sm text-subtle">
            {showArchived
              ? 'Archived products will appear here when you archive them.'
              : 'Products will be saved automatically when you extract them from URLs.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {displayedProducts.map((product) => {
            const isArchived = !!product.deletedAt;
            return (
              <div
                key={product.id}
                className={`overflow-hidden rounded-xl border shadow-sm transition-shadow hover:shadow-md ${
                  isArchived
                    ? 'border-border bg-surface-muted opacity-75'
                    : 'border-border bg-surface'
                }`}
                onContextMenu={(event) => {
                  setContextProductId(product.id);
                  contextMenu.open(event);
                }}
              >
                {product.images && product.images.length > 0 && (
                  <div className="aspect-video w-full overflow-hidden bg-surface-muted">
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className={`h-full w-full object-cover ${isArchived ? 'opacity-60' : ''}`}
                    />
                  </div>
                )}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className={`truncate text-lg font-semibold ${isArchived ? 'text-subtle' : 'text-foreground'}`}>
                    {product.name}
                  </h3>
                  <div className="flex flex-shrink-0 gap-2">
                    {product.hasVideo && (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                        Video Created
                      </span>
                    )}
                    {isArchived && (
                      <span className="rounded-full bg-surface-alt px-2 py-0.5 text-xs font-medium text-muted">
                        Archived
                      </span>
                    )}
                  </div>
                </div>
                {product.description && (
                  <p className={`mt-1 line-clamp-2 text-sm ${isArchived ? 'text-subtle' : 'text-muted'}`}>
                    {product.description}
                  </p>
                )}
                {product.price && (
                  <p className={`mt-2 text-sm font-medium ${isArchived ? 'text-subtle' : 'text-foreground'}`}>
                    ${product.price}
                  </p>
                )}
                
                {/* Status and Date Info */}
                <div className="mt-3 space-y-1 text-xs text-subtle">
                  {product.latestProject && (
                    <div className="flex items-center gap-1">
                      <span>Project:</span>
                      <a
                        href={`/projects/${product.latestProject.id}`}
                        className="text-brand hover:text-brand-700 hover:underline"
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                      >
                        {product.latestProject.name}
                      </a>
                    </div>
                  )}
                  {product.latestVideo && (
                    <div className="flex items-center gap-1">
                      <span>Video:</span>
                      <a
                        href={product.latestVideo.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand hover:text-brand-700 hover:underline"
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                      >
                        View Video
                      </a>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <span>
                      {product.updatedAt && 
                       new Date(product.updatedAt).getTime() !== new Date(product.createdAt).getTime()
                        ? `Modified ${new Date(product.updatedAt).toLocaleDateString()}`
                        : `Created ${new Date(product.createdAt).toLocaleDateString()}`}
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  {!isArchived && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedProductId(product.id);
                        setProjectName(`${product.name} - Video ${new Date().toLocaleDateString()}`);
                        setIsCreateModalOpen(true);
                      }}
                      className="flex-1"
                    >
                      {product.hasVideo ? 'Create Another' : 'Create Video'}
                    </Button>
                  )}
                  <Button
                    variant={isArchived ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setProductToArchive(product);
                      setIsArchiveModalOpen(true);
                    }}
                    className={isArchived ? 'flex-1' : ''}
                  >
                    {isArchived ? 'Unarchive' : 'Archive'}
                  </Button>
                </div>
              </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setProjectName('');
          setSelectedProductId(null);
        }}
        title="Create Video from Product"
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Select Product
            </label>
            <select
              value={selectedProductId || ''}
              onChange={(e) => {
                setSelectedProductId(e.target.value);
                const product = products.find((p) => p.id === e.target.value);
                if (product) {
                  setProjectName(`${product.name} - Video ${new Date().toLocaleDateString()}`);
                }
              }}
              className="block w-full rounded-xl border border-border px-3 py-2 text-sm text-foreground shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            >
              <option value="">Select a product...</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </div>

          {selectedProduct && (
            <div className="rounded-xl border border-border bg-surface-muted p-3">
              <p className="text-sm font-medium text-foreground">{selectedProduct.name}</p>
              {selectedProduct.description && (
                <p className="mt-1 text-xs text-muted">{selectedProduct.description}</p>
              )}
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Project Name
            </label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Enter project name..."
              className="block w-full rounded-xl border border-border px-3 py-2 text-sm text-foreground shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateModalOpen(false);
                setProjectName('');
                setSelectedProductId(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateProject} isLoading={isCreating} disabled={!selectedProductId || !projectName.trim()}>
              Create Project
            </Button>
          </div>
        </div>
      </Modal>

      <ContextMenu
        items={[
          {
            id: 'rename',
            label: 'Rename',
            onSelect: () => {
              if (!contextProduct) return;
              setRenameValue(contextProduct.name);
              setIsRenameModalOpen(true);
            },
          },
          {
            id: contextProduct?.deletedAt ? 'unarchive' : 'archive',
            label: contextProduct?.deletedAt ? 'Unarchive' : 'Archive',
            tone: contextProduct?.deletedAt ? 'default' : 'danger',
            onSelect: () => {
              if (!contextProduct) return;
              setProductToArchive(contextProduct);
              setIsArchiveModalOpen(true);
            },
          },
        ]}
        position={contextMenu.position}
        onClose={contextMenu.close}
      />

      <Modal
        isOpen={isRenameModalOpen}
        onClose={() => {
          setIsRenameModalOpen(false);
        }}
        title="Rename Product"
      >
        <div className="space-y-4">
          <label className="mb-1 block text-sm font-medium text-foreground">Product Name</label>
          <input
            type="text"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            placeholder="Enter product name..."
            className="block w-full rounded-xl border border-border px-3 py-2 text-sm text-foreground shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            autoFocus
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsRenameModalOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleRename}>Save</Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isArchiveModalOpen}
        onClose={() => {
          setIsArchiveModalOpen(false);
          setProductToArchive(null);
        }}
        title={productToArchive?.deletedAt ? 'Unarchive Product' : 'Archive Product'}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            {productToArchive?.deletedAt
              ? `Are you sure you want to unarchive "${productToArchive.name}"? It will be visible in your product library again.`
              : `Are you sure you want to archive "${productToArchive?.name}"? It will be hidden from your product library but can be restored later.`}
          </p>
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setIsArchiveModalOpen(false);
                setProductToArchive(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant={productToArchive?.deletedAt ? 'primary' : 'danger'}
              onClick={handleArchive}
              isLoading={isArchiving}
            >
              {productToArchive?.deletedAt ? 'Unarchive' : 'Archive'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
