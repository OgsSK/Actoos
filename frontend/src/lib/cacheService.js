/**
 * Cache Service for Supabase Data
 * Reduces latency by caching frequently accessed data
 */

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const cache = new Map();

export const cacheService = {
  get: (key) => {
    const item = cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expiry) {
      cache.delete(key);
      return null;
    }
    
    return item.data;
  },

  set: (key, data, duration = CACHE_DURATION) => {
    cache.set(key, {
      data,
      expiry: Date.now() + duration
    });
  },

  invalidate: (keyPattern) => {
    if (typeof keyPattern === 'string') {
      // Exact match
      cache.delete(keyPattern);
    } else if (keyPattern instanceof RegExp) {
      // Pattern match
      for (const key of cache.keys()) {
        if (keyPattern.test(key)) {
          cache.delete(key);
        }
      }
    }
  },

  invalidateAll: () => {
    cache.clear();
  },

  // Prefetch data in background
  prefetch: async (key, fetchFn, duration = CACHE_DURATION) => {
    if (!cache.has(key)) {
      try {
        const data = await fetchFn();
        cacheService.set(key, data, duration);
      } catch (e) {
        console.warn('Prefetch failed:', key);
      }
    }
  }
};

// Wrapper for cached API calls
export const cachedFetch = async (key, fetchFn, duration = CACHE_DURATION) => {
  const cached = cacheService.get(key);
  if (cached) {
    // Return cached data immediately, refresh in background
    fetchFn().then(data => cacheService.set(key, data, duration)).catch(() => {});
    return cached;
  }
  
  const data = await fetchFn();
  cacheService.set(key, data, duration);
  return data;
};

export default cacheService;
