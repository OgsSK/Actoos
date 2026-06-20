import { useState, useEffect } from 'react';
import { getBlogArticles } from '../data/blogData';

const CACHE_KEY = 'blog_posts_cache';
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

export const useBlogPosts = (audience = 'all') => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Essayer le cache localStorage
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

    // 2. Fallback : utiliser les articles depuis blogData.js (sans appel API)
    const articles = getBlogArticles();
    const filtered = articles.filter(
      (p) => audience === 'all' || p.audience === audience || p.audience === 'all'
    );
    setPosts(filtered);
    setLoading(false);
  }, [audience]);

  return { posts, loading };
};