import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getBlogArticles } from '../data/blogData';

// Fonction pour générer un slug si absent
const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

const ensureSlug = (article) => ({
  ...article,
  slug: article.slug || slugify(article.title),
});

export const useBlogPosts = (audience = 'all') => {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      // ===== DÉCONNECTÉ : uniquement les articles locaux =====
      const localArticles = getBlogArticles().map(ensureSlug);
      setPosts(localArticles);
      setLoading(false);
      return;
    }

    // ===== CONNECTÉ : API avec timeout de 2 secondes =====
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    fetch(`/api/blog/posts?audience=${audience}`, {
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
    })
      .then((res) => {
        clearTimeout(timeoutId);
        if (!res.ok) throw new Error('Erreur API');
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data)) {
          const enriched = data.map(ensureSlug);
          setPosts(enriched);
        } else {
          // Fallback local si réponse invalide
          setPosts(getBlogArticles().map(ensureSlug));
        }
        setLoading(false);
      })
      .catch(() => {
        // Timeout ou erreur réseau → articles locaux
        clearTimeout(timeoutId);
        setPosts(getBlogArticles().map(ensureSlug));
        setLoading(false);
      });

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [audience, user]);

  return { posts, loading };
};