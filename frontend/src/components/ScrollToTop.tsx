import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Global component that automatically scrolls to top on route changes
 * This component should be placed at the top level of the app
 */
const ScrollToTop = () => {
  const location = useLocation();

  useEffect(() => {
    // Scroll to top when route changes
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'auto' // Use 'auto' for instant scroll, 'smooth' for animated
    });
  }, [location.pathname]);

  // This component doesn't render anything
  return null;
};

export default ScrollToTop;
