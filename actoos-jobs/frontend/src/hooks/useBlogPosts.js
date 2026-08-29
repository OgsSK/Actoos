import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';

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
  const { t, i18n } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadPosts = useCallback(() => {
    if (authLoading) {
      setLoading(true);
      return () => {};
    }

    setLoading(true);
    if (!user) {
      // utilisateur non connecté : articles locaux
      const rawArticles = t('blogArticles.items', { returnObjects: true }) || [];
      setPosts(rawArticles.map(ensureSlug));
      setLoading(false);
      return () => {};
    }

    // utilisateur connecté : API
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

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
          setPosts(data.map(ensureSlug));
        } else {
          setPosts([]);
        }
        setLoading(false);
      })
      .catch(() => {
        clearTimeout(timeoutId);
        setPosts([]);
        setLoading(false);
      });

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [user, authLoading, audience, t]);

  useEffect(() => {
    const cleanup = loadPosts();
    const handleLanguageChanged = () => {
      if (cleanup) cleanup();
      loadPosts();
    };

    i18n.on('languageChanged', handleLanguageChanged);
    return () => {
      if (cleanup) cleanup();
      i18n.off('languageChanged', handleLanguageChanged);
    };
  }, [loadPosts, i18n]);

  return { posts, loading };
};