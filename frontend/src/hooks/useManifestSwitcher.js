import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Hook to dynamically switch PWA manifest based on current route
 * - /tech routes use manifest.json (Actoos Tech)
 * - /dashboard routes use manifest-admin.json (Actoos Admin)
 * - Other routes use default manifest.json
 */
const useManifestSwitcher = () => {
  const location = useLocation();

  useEffect(() => {
    const manifestLink = document.querySelector('link[rel="manifest"]');
    if (!manifestLink) return;

    let manifestPath = '/manifest.json'; // Default (Tech)

    if (location.pathname.startsWith('/dashboard')) {
      manifestPath = '/manifest-admin.json';
    }
    // /tech and other routes use default manifest.json

    // Only update if different
    if (manifestLink.href !== window.location.origin + manifestPath) {
      manifestLink.href = manifestPath;
      console.log('[PWA] Manifest switched to:', manifestPath);
    }
  }, [location.pathname]);
};

export default useManifestSwitcher;
