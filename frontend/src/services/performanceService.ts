// Performance optimization service for InspiraNet
class PerformanceService {
  private static instance: PerformanceService;
  private imageCache: Map<string, HTMLImageElement> = new Map();
  private preloadedImages: Set<string> = new Set();
  private lazyLoadObserver: IntersectionObserver | null = null;
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();

  private constructor() {
    this.setupLazyLoading();
  }

  static getInstance(): PerformanceService {
    if (!PerformanceService.instance) {
      PerformanceService.instance = new PerformanceService();
    }
    return PerformanceService.instance;
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

  // Preload critical images
  async preloadImages(urls: string[]): Promise<void> {
    const promises = urls.map(url => this.preloadImage(url));
    await Promise.allSettled(promises);
  }

  private async preloadImage(url: string): Promise<void> {
    if (this.preloadedImages.has(url)) return;

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.imageCache.set(url, img);
        this.preloadedImages.add(url);
        resolve();
      };
      img.onerror = () => {
        console.warn(`Failed to preload image: ${url}`);
        reject();
      };
      img.src = url;
    });
  }

  // Lazy loading setup
  private setupLazyLoading(): void {
    if (typeof IntersectionObserver === 'undefined') return;

    this.lazyLoadObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            const src = img.dataset.src;
            if (src) {
              img.src = src;
              img.removeAttribute('data-src');
              this.lazyLoadObserver?.unobserve(img);
            }
          }
        });
      },
      {
        rootMargin: '50px 0px',
        threshold: 0.1
      }
    );
  }

  // Lazy load helper
  createIntersectionObserver(
    callback: (entries: IntersectionObserverEntry[]) => void,
    options: IntersectionObserverInit = {}
  ): IntersectionObserver {
    return new IntersectionObserver(callback, {
      rootMargin: '50px 0px',
      threshold: 0.1,
      ...options
    });
  }

  // Observe element for lazy loading
  observeLazyLoad(element: Element): void {
    this.lazyLoadObserver?.observe(element);
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

  // Throttle function calls
  throttle<T extends (...args: any[]) => any>(
    key: string,
    fn: T,
    delay: number = 300
  ): (...args: Parameters<T>) => void {
    let lastCall = 0;
    return (...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastCall >= delay) {
        lastCall = now;
        fn(...args);
      }
    };
  }

  // Optimize background images
  optimizeBackgroundImage(element: HTMLElement, url: string): void {
    if (!url) return;

    // Preload the image
    this.preloadImage(url).then(() => {
      element.style.backgroundImage = `url(${url})`;
    }).catch(() => {
      // Fallback to original URL if preload fails
      element.style.backgroundImage = `url(${url})`;
    });
  }

  // Optimize post images
  optimizePostImages(): void {
    const images = document.querySelectorAll('img[data-src]');
    images.forEach(img => {
      this.observeLazyLoad(img);
    });
  }

  // Preload critical resources
  async preloadResources(urls: string[]): Promise<void> {
    const promises = urls.map(url => {
      return fetch(url, { method: 'HEAD' }).catch(() => {
        // Silently fail for preload attempts
      });
    });
    await Promise.allSettled(promises);
  }

  // Optimize bundle loading
  optimizeBundle(): void {
    // Preload critical CSS and JS
    const criticalResources = [
      '/src/index.css',
      '/src/main.tsx'
    ];

    criticalResources.forEach(resource => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = resource;
      link.as = resource.endsWith('.css') ? 'style' : 'script';
      document.head.appendChild(link);
    });
  }

  // Memory management
  cleanup(): void {
    // Clear image cache
    this.imageCache.clear();
    this.preloadedImages.clear();

    // Clear debounce timers
    this.debounceTimers.forEach(timer => clearTimeout(timer));
    this.debounceTimers.clear();

    // Disconnect observers
    this.lazyLoadObserver?.disconnect();
  }

  // Performance monitoring
  measurePerformance(name: string, fn: () => void): void {
    const start = performance.now();
    fn();
    const end = performance.now();
    console.log(`${name} took ${end - start}ms`);
  }

  // Async performance measurement
  async measureAsyncPerformance<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    const result = await fn();
    const end = performance.now();
    console.log(`${name} took ${end - start}ms`);
    return result;
  }
}

export default PerformanceService.getInstance();
