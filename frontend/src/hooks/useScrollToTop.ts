import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Custom hook that automatically scrolls to top when:
 * 1. Component mounts
 * 2. Route changes (location changes)
 */
export const useScrollToTop = () => {
  const location = useLocation();

  useEffect(() => {
    // Scroll to top when component mounts
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    // Scroll to top when route changes
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // Optional: Smooth scroll behavior
  const scrollToTop = (smooth: boolean = true) => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: smooth ? 'smooth' : 'auto'
    });
  };

  return { scrollToTop };
};
