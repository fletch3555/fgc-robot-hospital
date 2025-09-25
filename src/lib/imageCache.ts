// Image cache utility for tracking loaded images across page changes
class ImageCacheManager {
  private cache = new Map<string, HTMLImageElement>();
  private loading = new Set<string>();
  
  // Preload images for the next page to improve UX
  async preloadImagesForPage(items: Array<{ image_url?: string }>) {
    const imagesToPreload = items
      .filter(item => item.image_url && !this.cache.has(item.image_url))
      .map(item => item.image_url!)
      .slice(0, 5); // Only preload first 5 images to avoid overwhelming

    const preloadPromises = imagesToPreload.map(src => this.preloadImage(src));
    
    try {
      await Promise.allSettled(preloadPromises);
    } catch (error) {
      console.warn('Some images failed to preload:', error);
    }
  }

  private preloadImage(src: string): Promise<void> {
    if (this.cache.has(src) || this.loading.has(src)) {
      return Promise.resolve();
    }

    this.loading.add(src);

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.cache.set(src, img);
        this.loading.delete(src);
        resolve();
      };
      img.onerror = () => {
        this.loading.delete(src);
        reject(new Error(`Failed to load image: ${src}`));
      };
      img.src = src;
    });
  }

  isImageCached(src: string): boolean {
    return this.cache.has(src);
  }

  getCacheStats() {
    return {
      cachedImages: this.cache.size,
      loadingImages: this.loading.size
    };
  }

  // Clear cache if it gets too large (optional memory management)
  clearOldCache(maxSize: number = 200) {
    if (this.cache.size > maxSize) {
      const entries = Array.from(this.cache.entries());
      const entriesToRemove = entries.slice(0, Math.floor(maxSize * 0.3)); // Remove 30%
      
      entriesToRemove.forEach(([key]) => {
        this.cache.delete(key);
      });
    }
  }
}

// Export singleton instance
export const imageCacheManager = new ImageCacheManager();

export default ImageCacheManager;