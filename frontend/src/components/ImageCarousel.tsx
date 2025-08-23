import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Background-only carousel for the landing page
const ImageCarousel = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imageError, setImageError] = useState(false);
  
  // KEC Campus Images (served from public/)
  const images = [
    '/kongu_main-entrance.jpg',
    '/IT_part.jpeg',
    '/admin_block.jpg'
  ];

  // Fallback images if KEC images are not found
  const fallbackImages = [
    'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=2069&q=80',
    'https://images.unsplash.com/photo-1523050854058-8df90110c9e1?auto=format&fit=crop&w=2070&q=80',
    'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=2070&q=80'
  ];

  // Check if KEC images exist
  useEffect(() => {
    const checkImages = async () => {
      try {
        const response = await fetch(images[0], { method: 'HEAD' });
        if (!response.ok) setImageError(true);
      } catch {
        setImageError(true);
      }
    };
    checkImages();
  }, []);

  const currentImages = imageError ? fallbackImages : images;

  // Auto-advance
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % currentImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [currentImages.length]);

  return (
    <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
      {/* Background Images with overlapping cross-fade (no black in-between) */}
      <AnimatePresence initial={false} mode="sync">
        <motion.div
          key={currentIndex}
          className="absolute inset-0 w-full h-full"
          initial={{ opacity: 0.0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0.0 }}
          transition={{ duration: 1.0, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Single cover layer so the image fully fills the viewport */}
          <div
            className="absolute inset-0 w-full h-full bg-cover bg-center"
            style={{
              backgroundImage: `url(${currentImages[currentIndex]})`,
              filter: 'brightness(1.18) contrast(1.06) saturate(1.08)'
            }}
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default ImageCarousel;

