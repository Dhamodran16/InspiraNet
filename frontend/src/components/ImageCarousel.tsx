import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Background-only carousel for the landing page
const ImageCarousel = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imageError, setImageError] = useState(false);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [preloadedImages, setPreloadedImages] = useState<string[]>([]);
  
  // KEC Campus Images (served from public/) - Optimized with smaller sizes
  const images = [
    '/kongu_main-entrance.jpg',
    '/IT_part.jpeg',
    '/admin_block.jpg'
  ];

  // Fallback images if KEC images are not found - Optimized URLs
  const fallbackImages = [
    'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=1200&q=70',
    'https://images.unsplash.com/photo-1523050854058-8df90110c9e1?auto=format&fit=crop&w=1200&q=70',
    'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=1200&q=70'
  ];

  // Preload images for better performance
  const preloadImages = useCallback(async (imageUrls: string[]) => {
    const preloadPromises = imageUrls.map((url) => {
      return new Promise<string>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(url);
        img.onerror = () => reject(url);
        img.src = url;
      });
    });

    try {
      const loadedImages = await Promise.allSettled(preloadPromises);
      const successfulImages = loadedImages
        .filter((result): result is PromiseFulfilledResult<string> => result.status === 'fulfilled')
        .map(result => result.value);
      
      setPreloadedImages(successfulImages);
      setImagesLoaded(true);
    } catch (error) {
      console.warn('Some images failed to preload:', error);
      setImagesLoaded(true);
    }
  }, []);

  // Check if KEC images exist and preload
  useEffect(() => {
    const checkAndPreloadImages = async () => {
      try {
        const response = await fetch(images[0], { method: 'HEAD' });
        if (!response.ok) {
          setImageError(true);
          await preloadImages(fallbackImages);
        } else {
          await preloadImages(images);
        }
      } catch {
        setImageError(true);
        await preloadImages(fallbackImages);
      }
    };
    
    checkAndPreloadImages();
  }, [preloadImages]);

  const currentImages = imageError ? fallbackImages : images;
  const displayImages = preloadedImages.length > 0 ? preloadedImages : currentImages;

  // Auto-advance only when images are loaded
  useEffect(() => {
    if (!imagesLoaded) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % displayImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [displayImages.length, imagesLoaded]);

  // Show loading state
  if (!imagesLoaded) {
    return (
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
      {/* Base background to prevent any gaps */}
      <div 
        className="absolute inset-0 w-full h-full bg-cover bg-center"
        style={{
          backgroundImage: `url(${displayImages[currentIndex]})`,
          filter: 'brightness(1.18) contrast(1.06) saturate(1.08)',
        }}
      />
      
      {/* Smooth cross-fade overlay */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          className="absolute inset-0 w-full h-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ 
            duration: 1.5, 
            ease: [0.4, 0.0, 0.2, 1], // Custom easing for smoother transition
            opacity: { duration: 1.2 } // Slightly faster opacity transition
          }}
        >
          <div
            className="absolute inset-0 w-full h-full bg-cover bg-center"
            style={{
              backgroundImage: `url(${displayImages[currentIndex]})`,
              filter: 'brightness(1.18) contrast(1.06) saturate(1.08)',
              willChange: 'opacity'
            }}
          />
        </motion.div>
      </AnimatePresence>
      
      {/* Subtle overlay to ensure consistent appearance */}
      <div className="absolute inset-0 bg-black/10" />
    </div>
  );
};

export default ImageCarousel;

