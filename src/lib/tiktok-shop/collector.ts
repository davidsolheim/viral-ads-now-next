/**
 * TikTok Shop Data Collector (Client-Side)
 * 
 * This script runs in the browser and collects TikTok Shop data in the background.
 * It detects TikTok Shop pages, extracts product/video/creator data, and sends it to the API.
 * 
 * Rate limited to 1 request per minute per client.
 */

interface ProductData {
  tiktokProductId: string;
  name: string;
  description?: string;
  price?: string;
  originalPrice?: string;
  currency?: string;
  tiktokShopUrl: string;
  sellerId?: string;
  sellerName?: string;
  category?: string;
  images?: string[];
  totalViews?: number;
  totalSales?: number;
  engagementRate?: string;
  metadata?: Record<string, any>;
}

interface CollectorConfig {
  apiEndpoint: string;
  enabled: boolean;
  rateLimitMs: number; // Default: 60 seconds
  autoCollect: boolean; // Auto-collect when on TikTok Shop pages
}

class TikTokShopCollector {
  private config: CollectorConfig;
  private lastRequestTime: number = 0;
  private queue: Array<{ type: string; data: any }> = [];
  private isProcessing: boolean = false;

  constructor(config: Partial<CollectorConfig> = {}) {
    this.config = {
      apiEndpoint: config.apiEndpoint || '/api/tiktok-shop/collect',
      enabled: config.enabled !== false,
      rateLimitMs: config.rateLimitMs || 60 * 1000,
      autoCollect: config.autoCollect !== false,
    };

    if (this.config.enabled && this.config.autoCollect) {
      this.initialize();
    }
  }

  private initialize() {
    // Check if we're on a TikTok Shop page
    if (this.isTikTokShopPage()) {
      this.startCollection();
    }

    // Listen for navigation changes (SPA routing)
    this.observeNavigation();

    // Poll for TikTok Shop queue items to refresh
    this.startQueuePolling();
  }

  private isTikTokShopPage(): boolean {
    // Check if current URL is a TikTok Shop page
    const hostname = window.location.hostname;
    const pathname = window.location.pathname;

    // TikTok Shop URLs typically contain:
    // - shop.tiktok.com
    // - www.tiktok.com/@.../video/... (may feature products)
    // - Product URLs often contain /product/ or similar patterns

    return (
      hostname.includes('tiktok.com') &&
      (hostname.includes('shop') ||
        pathname.includes('/product/') ||
        pathname.includes('/@') ||
        document.querySelector('[data-testid*="shop"]') !== null ||
        document.querySelector('[class*="shop"]') !== null ||
        document.querySelector('[class*="product"]') !== null)
    );
  }

  private observeNavigation() {
    // Watch for URL changes (for SPA routing)
    let lastUrl = location.href;
    new MutationObserver(() => {
      const url = location.href;
      if (url !== lastUrl) {
        lastUrl = url;
        if (this.isTikTokShopPage()) {
          this.startCollection();
        }
      }
    }).observe(document, { subtree: true, childList: true });

    // Also listen to popstate (back/forward)
    window.addEventListener('popstate', () => {
      if (this.isTikTokShopPage()) {
        this.startCollection();
      }
    });
  }

  private async startCollection() {
    if (!this.config.enabled) return;

    // Wait a bit for page to load
    await this.wait(2000);

    // Try to collect product data
    const productData = this.extractProductData();
    if (productData) {
      await this.collectProduct(productData);
    }

    // Try to collect video data
    const videoData = this.extractVideoData();
    if (videoData) {
      await this.collectVideo(videoData);
    }

    // Try to collect creator data
    const creatorData = this.extractCreatorData();
    if (creatorData) {
      await this.collectCreator(creatorData);
    }
  }

  private extractProductData(): ProductData | null {
    try {
      // Try to extract product data from page
      // This is a basic implementation - actual selectors will depend on TikTok Shop's structure

      // Look for product name
      const nameElement =
        document.querySelector('[data-testid*="product-name"]') ||
        document.querySelector('h1') ||
        document.querySelector('[class*="product-title"]');

      const name = nameElement?.textContent?.trim() || '';

      if (!name) {
        return null; // Not a product page
      }

      // Look for product URL
      const url = window.location.href;

      // Look for price
      const priceElement =
        document.querySelector('[data-testid*="price"]') ||
        document.querySelector('[class*="price"]');

      const priceText = priceElement?.textContent?.trim() || '';
      const priceMatch = priceText.match(/[\d,]+\.?\d*/);
      const price = priceMatch ? priceMatch[0].replace(/,/g, '') : undefined;

      // Look for images
      const imageElements = document.querySelectorAll('img[src*="product"], img[alt*="product"]');
      const images = Array.from(imageElements)
        .slice(0, 5)
        .map((img) => (img as HTMLImageElement).src)
        .filter(Boolean);

      // Extract product ID from URL or data attributes
      const productIdMatch = url.match(/product[\/-](\w+)/i) || url.match(/[\/=](\d{10,})/);
      const tiktokProductId = productIdMatch ? productIdMatch[1] : this.generateIdFromUrl(url);

      // Look for seller info
      const sellerElement =
        document.querySelector('[data-testid*="seller"]') ||
        document.querySelector('[class*="seller"]') ||
        document.querySelector('[class*="shop"]');

      const sellerName = sellerElement?.textContent?.trim() || undefined;

      // Look for views/sales
      const viewsElement =
        document.querySelector('[data-testid*="views"]') ||
        document.querySelector('[class*="views"]');
      const viewsText = viewsElement?.textContent?.trim() || '';
      const viewsMatch = viewsText.match(/([\d,]+)/);
      const totalViews = viewsMatch ? parseInt(viewsMatch[1].replace(/,/g, '')) : undefined;

      const salesElement =
        document.querySelector('[data-testid*="sold"]') ||
        document.querySelector('[class*="sold"]');
      const salesText = salesElement?.textContent?.trim() || '';
      const salesMatch = salesText.match(/([\d,]+)/);
      const totalSales = salesMatch ? parseInt(salesMatch[1].replace(/,/g, '')) : undefined;

      // Look for description
      const descriptionElement =
        document.querySelector('[data-testid*="description"]') ||
        document.querySelector('[class*="description"]') ||
        document.querySelector('p');

      const description = descriptionElement?.textContent?.trim() || undefined;

      return {
        tiktokProductId,
        name,
        description,
        price,
        tiktokShopUrl: url,
        sellerName,
        images: images.length > 0 ? images : undefined,
        totalViews,
        totalSales,
        metadata: {
          collectedAt: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url,
        },
      };
    } catch (error) {
      console.error('Error extracting product data:', error);
      return null;
    }
  }

  private extractVideoData(): any | null {
    try {
      // Extract video data from page
      // This is a placeholder - actual implementation will depend on TikTok's structure

      const url = window.location.href;
      const videoIdMatch = url.match(/video[\/-](\d+)/);
      const tiktokVideoId = videoIdMatch ? videoIdMatch[1] : this.generateIdFromUrl(url);

      if (!tiktokVideoId) {
        return null;
      }

      // Look for video stats
      const statsElement = document.querySelector('[class*="stats"]') || document.querySelector('[data-testid*="stats"]');
      const stats = statsElement?.textContent || '';

      const viewsMatch = stats.match(/([\d,]+)\s*(?:views|Views)/);
      const views = viewsMatch ? parseInt(viewsMatch[1].replace(/,/g, '')) : undefined;

      const likesMatch = stats.match(/([\d,]+)\s*(?:likes|Likes)/);
      const likes = likesMatch ? parseInt(likesMatch[1].replace(/,/g, '')) : undefined;

      const commentsMatch = stats.match(/([\d,]+)\s*(?:comments|Comments)/);
      const comments = commentsMatch ? parseInt(commentsMatch[1].replace(/,/g, '')) : undefined;

      const sharesMatch = stats.match(/([\d,]+)\s*(?:shares|Shares)/);
      const shares = sharesMatch ? parseInt(sharesMatch[1].replace(/,/g, '')) : undefined;

      // Look for creator
      const creatorElement = document.querySelector('[class*="author"]') || document.querySelector('[data-testid*="author"]');
      const creatorUsername = creatorElement?.textContent?.trim() || undefined;

      // Look for thumbnail
      const thumbnailElement = document.querySelector('video') || document.querySelector('[class*="thumbnail"] img');
      const thumbnailUrl = thumbnailElement
        ? (thumbnailElement.tagName === 'VIDEO'
            ? (thumbnailElement as HTMLVideoElement).poster
            : (thumbnailElement as unknown as HTMLImageElement).src)
        : undefined;

      return {
        tiktokVideoId,
        url,
        thumbnailUrl,
        creatorUsername,
        views,
        likes,
        comments,
        shares,
        metadata: {
          collectedAt: new Date().toISOString(),
          url,
        },
      };
    } catch (error) {
      console.error('Error extracting video data:', error);
      return null;
    }
  }

  private extractCreatorData(): any | null {
    try {
      // Extract creator data from page
      // This is a placeholder - actual implementation will depend on TikTok's structure

      const url = window.location.href;
      const creatorMatch = url.match(/@(\w+)/);
      const username = creatorMatch ? creatorMatch[1] : undefined;

      if (!username) {
        return null;
      }

      // Look for follower count
      const followersElement =
        document.querySelector('[data-testid*="follower"]') ||
        document.querySelector('[class*="follower"]');
      const followersText = followersElement?.textContent?.trim() || '';
      const followersMatch = followersText.match(/([\d,]+)/);
      const followerCount = followersMatch ? parseInt(followersMatch[1].replace(/,/g, '')) : undefined;

      // Look for profile image
      const profileImageElement = document.querySelector('[class*="avatar"] img') || document.querySelector('[class*="profile"] img');
      const profileImageUrl = profileImageElement ? (profileImageElement as HTMLImageElement).src : undefined;

      return {
        tiktokCreatorId: username,
        username,
        profileUrl: url,
        profileImageUrl,
        followerCount,
        metadata: {
          collectedAt: new Date().toISOString(),
          url,
        },
      };
    } catch (error) {
      console.error('Error extracting creator data:', error);
      return null;
    }
  }

  private generateIdFromUrl(url: string): string {
    // Generate a hash-based ID from URL
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
      const char = url.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private async collectProduct(data: ProductData) {
    await this.sendData({ type: 'product', data });
  }

  private async collectVideo(data: any) {
    await this.sendData({ type: 'video', data });
  }

  private async collectCreator(data: any) {
    await this.sendData({ type: 'creator', data });
  }

  private async sendData(payload: { type: string; data: any }) {
    if (!this.config.enabled) return;

    // Check rate limit
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.config.rateLimitMs) {
      // Queue for later
      this.queue.push(payload);
      return;
    }

    try {
      const response = await fetch(this.config.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        if (response.status === 429) {
          // Rate limited, queue for later
          this.queue.push(payload);
          const retryAfter = response.headers.get('Retry-After');
          if (retryAfter) {
            const delay = parseInt(retryAfter) * 1000;
            setTimeout(() => this.processQueue(), delay);
          }
          return;
        }

        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      this.lastRequestTime = now;

      // Process queued items if any
      if (this.queue.length > 0 && !this.isProcessing) {
        this.processQueue();
      }
    } catch (error) {
      console.error('Error sending data to API:', error);
      // Queue for retry
      this.queue.push(payload);
    }
  }

  private async processQueue() {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;

      if (timeSinceLastRequest < this.config.rateLimitMs) {
        // Wait before processing next item
        await this.wait(this.config.rateLimitMs - timeSinceLastRequest);
      }

      const payload = this.queue.shift();
      if (payload) {
        await this.sendData(payload);
      }
    }

    this.isProcessing = false;
  }

  private startQueuePolling() {
    // Poll for queue items to refresh every 5 minutes
    setInterval(async () => {
      try {
        const response = await fetch('/api/tiktok-shop/queue?limit=5');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data && data.data.length > 0) {
            // Process queue items (refresh data)
            for (const item of data.data) {
              // Try to refresh the item
              await this.refreshQueueItem(item);
            }
          }
        }
      } catch (error) {
        console.error('Error polling queue:', error);
      }
    }, 5 * 60 * 1000); // 5 minutes
  }

  private async refreshQueueItem(queueItem: any) {
    // Refresh data based on queue item type
    // This would involve re-extracting data from the page
    // For now, we'll just mark it as refreshed after collecting
    try {
      const refreshData = this.extractProductData(); // Re-extract current data
      if (refreshData) {
        await this.collectProduct(refreshData);

        // Mark as refreshed
        await fetch('/api/tiktok-shop/refresh', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            queueId: queueItem.id,
            itemType: queueItem.itemType,
            itemId: queueItem.itemId,
          }),
        });
      }
    } catch (error) {
      console.error('Error refreshing queue item:', error);
    }
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Public API
  public enable() {
    this.config.enabled = true;
    this.initialize();
  }

  public disable() {
    this.config.enabled = false;
  }

  public async collect() {
    await this.startCollection();
  }

  /**
   * Start automatic collection of TikTok Shop data
   * This method monitors for TikTok Shop product links and collects data
   * It also periodically checks for products to collect from our queue
   */
  public startAutomaticCollection() {
    if (!this.config.enabled) return;

    // Monitor for clicks on TikTok Shop links
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      const link = target.closest('a');
      
      if (link && link.href) {
        const url = new URL(link.href, window.location.href);
        // If it's a TikTok Shop link, the collector will handle it when the page loads
        if (url.hostname.includes('tiktok.com') && (url.pathname.includes('/shopping') || url.pathname.includes('/product'))) {
          console.log('TikTok Shop link detected, collection will happen when page loads');
        }
      }
    }, true);

    // Poll queue for products that need to be collected/refreshed
    const pollQueue = async () => {
      try {
        const response = await fetch('/api/tiktok-shop/queue?limit=10');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data && data.data.length > 0) {
            // Queue items will be processed by the refresh mechanism
            // This ensures we're collecting products that need updates
            console.log(`Found ${data.data.length} items in collection queue`);
          }
        }
      } catch (error) {
        console.error('Error polling collection queue:', error);
      }
    };

    // Poll queue every 5 minutes
    pollQueue(); // Initial poll
    setInterval(pollQueue, 5 * 60 * 1000);
  }
}

// Export singleton instance
let collectorInstance: TikTokShopCollector | null = null;

export function initTikTokShopCollector(config?: Partial<CollectorConfig>) {
  if (typeof window === 'undefined') return null; // Server-side check

  if (!collectorInstance) {
    collectorInstance = new TikTokShopCollector(config);
  }

  return collectorInstance;
}

// Auto-initialize if in browser
if (typeof window !== 'undefined') {
  // Only initialize on TikTok Shop pages
  if (window.location.hostname.includes('tiktok.com')) {
    initTikTokShopCollector();
  }
}

export default TikTokShopCollector;
