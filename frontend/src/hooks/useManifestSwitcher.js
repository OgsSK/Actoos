import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Hook to dynamically switch PWA manifest based on current route
 * - /tech routes use manifest-tech.json (Actoos Tech)
 * - /dashboard routes use manifest-admin.json (Actoos Admin)
 * - Other routes use default manifest.json
 */
const useManifestSwitcher = () => {
  const location = useLocation();

  useEffect(() => {
    const manifestLink = document.querySelector('link[rel="manifest"]');
    if (!manifestLink) return;

    let manifestPath = '/manifest.json'; // Default

    if (location.pathname.startsWith('/tech')) {
      manifestPath = '/manifest-tech.json';
    } else if (location.pathname.startsWith('/dashboard')) {
      manifestPath = '/manifest-admin.json';
    }

    // Only update if different
    if (manifestLink.href !== window.location.origin + manifestPath) {
      manifestLink.href = manifestPath;
      console.log('[PWA] Manifest switched to:', manifestPath);
    }
  }, [location.pathname]);
};

export default useManifestSwitcher;
