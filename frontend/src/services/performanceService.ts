// Performance optimization service for InspiraNet
class PerformanceService {
  private static instance: PerformanceService;
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private pendingRequests = new Map<string, Promise<any>>();
  private debounceTimers = new Map<string, NodeJS.Timeout>();

  private constructor() {
    this.setupPerformanceMonitoring();
  }

  static getInstance(): PerformanceService {
    if (!PerformanceService.instance) {
      PerformanceService.instance = new PerformanceService();
    }
    return PerformanceService.instance;
  }

  // Cache management555
  setCache(key: string, data: any, ttl: number = 5 * 60 * 1000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  getCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const isExpired = Date.now() - cached.timestamp > cached.ttl;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  clearCache(pattern?: string): void {
    if (pattern) {
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }

  // Request deduplication
  async deduplicateRequest<T>(
    key: string,
    requestFn: () => Promise<T>,
    ttl: number = 5 * 60 * 1000
  ): Promise<T> {
    // Check cache first
    const cached = this.getCache(key);
    if (cached) {
      return cached;
    }

    // Check if request is already pending
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key) as Promise<T>;
    }

    // Make new request
    const request = requestFn().then(result => {
      this.setCache(key, result, ttl);
      this.pendingRequests.delete(key);
      return result;
    }).catch(error => {
      this.pendingRequests.delete(key);
      throw error;
    });

    this.pendingRequests.set(key, request);
    return request;
  }

  // Debounce function calls
  debounce<T extends (...args: any[]) => any>(
    key: string,
    fn: T,
    delay: number = 300
  ): (...args: Parameters<T>) => void {
    return (...args: Parameters<T>) => {
      if (this.debounceTimers.has(key)) {
        clearTimeout(this.debounceTimers.get(key)!);
      }

      const timer = setTimeout(() => {
        fn(...args);
        this.debounceTimers.delete(key);
      }, delay);

      this.debounceTimers.set(key, timer);
    };
  }

  // Image optimization
  optimizeImage(url: string, width: number = 400, quality: number = 80): string {
    if (!url) return url;
    
    // If using Cloudinary
    if (url.includes('cloudinary.com')) {
      return url.replace('/upload/', `/upload/w_${width},q_${quality}/`);
    }
    
    // For other image services, return original URL
    return url;
  }

  // Lazy loading helper
  createIntersectionObserver(
    callback: (entries: IntersectionObserverEntry[]) => void,
    options: IntersectionObserverInit = {}
  ): IntersectionObserver {
    return new IntersectionObserver(callback, {
      rootMargin: '50px',
      threshold: 0.1,
      ...options
    });
  }

  // Preload critical resources
  preloadResources(resources: string[]): void {
    resources.forEach(resource => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = resource;
      
      if (resource.endsWith('.css')) {
        link.as = 'style';
      } else if (resource.endsWith('.js')) {
        link.as = 'script';
      } else if (resource.match(/\.(png|jpg|jpeg|gif|webp|svg)$/)) {
        link.as = 'image';
      }
      
      document.head.appendChild(link);
    });
  }

  // Bundle splitting helper
  async loadComponent(componentPath: string): Promise<any> {
    try {
      const module = await import(/* @vite-ignore */ componentPath);
      return module.default || module;
    } catch (error) {
      console.error(`Failed to load component: ${componentPath}`, error);
      throw error;
    }
  }

  // Memory management
  cleanup(): void {
    // Clear expired cache entries
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > value.ttl) {
        this.cache.delete(key);
      }
    }

    // Clear debounce timers
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();

    // Clear pending requests
    this.pendingRequests.clear();
  }

  // Performance monitoring
  private setupPerformanceMonitoring(): void {
    // Monitor Core Web Vitals
    if ('PerformanceObserver' in window) {
      try {
        // LCP (Largest Contentful Paint)
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          console.log('LCP:', lastEntry.startTime);
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

        // FID (First Input Delay)
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            console.log('FID:', (entry as any).processingStart - entry.startTime);
          });
        });
        fidObserver.observe({ entryTypes: ['first-input'] });

        // CLS (Cumulative Layout Shift)
        const clsObserver = new PerformanceObserver((list) => {
          let clsValue = 0;
          const entries = list.getEntries();
          entries.forEach(entry => {
            if (!(entry as any).hadRecentInput) {
              clsValue += (entry as any).value;
            }
          });
          console.log('CLS:', clsValue);
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
      } catch (error) {
        console.warn('Performance monitoring setup failed:', error);
      }
    }

    // Monitor API response times
    this.setupAPIMonitoring();
  }

  private setupAPIMonitoring(): void {
    // Override fetch to monitor API performance
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const startTime = performance.now();
      try {
        const response = await originalFetch(...args);
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        // Log slow requests
        if (duration > 1000) {
          console.warn(`Slow API request: ${args[0]} took ${duration.toFixed(2)}ms`);
        }
        
        return response;
      } catch (error) {
        const endTime = performance.now();
        const duration = endTime - startTime;
        console.error(`API request failed: ${args[0]} after ${duration.toFixed(2)}ms`, error);
        throw error;
      }
    };
  }

  // Optimize bundle size
  optimizeBundle(): void {
    // Remove unused CSS
    this.removeUnusedCSS();
    
    // Optimize images
    this.optimizeImages();
    
    // Compress data
    this.enableCompression();
  }

  private removeUnusedCSS(): void {
    // Implementation for removing unused CSS
    // This would typically be done at build time
    console.log('Unused CSS removal would be implemented at build time');
  }

  private optimizeImages(): void {
    // Convert images to WebP format if supported
    if (this.supportsWebP()) {
      const images = document.querySelectorAll('img');
      images.forEach(img => {
        const src = img.getAttribute('src');
        if (src && !src.includes('.webp')) {
          // Convert to WebP format
          img.src = src.replace(/\.(jpg|jpeg|png)$/i, '.webp');
        }
      });
    }
  }

  private supportsWebP(): boolean {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  }

  private enableCompression(): void {
    // Enable gzip compression headers
    // This is typically handled by the server
    console.log('Compression should be enabled on the server');
  }

  // Service Worker management - Disabled to prevent MIME type errors
  async registerServiceWorker(): Promise<void> {
    // Service Worker registration disabled to prevent MIME type errors
    console.log('Service Worker registration disabled');
  }

  // Background sync for offline support
  async setupBackgroundSync(): Promise<void> {
    // Background sync disabled to prevent Service Worker issues
    console.log('Background sync disabled');
  }
}

// Export singleton instance
export const performanceService = PerformanceService.getInstance();
export default performanceService;
