import { useState, useEffect } from 'react';
import { apiFetch } from '../lib/api';

const CACHE_KEY = 'blog_posts_cache';
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

export const useBlogPosts = (audience = 'all') => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_DURATION) {
          const filtered = data.filter(
            (p) => audience === 'all' || p.audience === audience || p.audience === 'all'
          );
          setPosts(filtered);
          setLoading(false);
          return;
        }
      } catch {}
    }

    apiFetch(`/api/blog/posts?audience=${audience}`)
      .then((data) => {
        if (Array.isArray(data)) {
          setPosts(data);
          if (audience === 'all') {
            localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
          }
        } else {
          setPosts([]);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [audience]);

  return { posts, loading };
};