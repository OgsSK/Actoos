// src/hooks/useBlogPosts.js
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
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadPosts = useCallback(() => {
    setLoading(true);
    if (!user) {
      const rawArticles = t('blogArticles.items', { returnObjects: true }) || [];
      setPosts(rawArticles.map(ensureSlug));
      setLoading(false);
      return;
    }

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
          setPosts(data.map(ensureSlug));
        } else {
          setPosts([]);
        }
        setLoading(false);
      })
      .catch(() => {
        clearTimeout(timeoutId);
        const rawArticles = t('blogArticles.items', { returnObjects: true }) || [];
        setPosts(rawArticles.map(ensureSlug));
        setLoading(false);
      });

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [user, audience, t]);

  useEffect(() => {
    // Chargement initial
    loadPosts();

    // Recharger à chaque changement de langue
    const handleLanguageChanged = () => {
      loadPosts();
    };
    i18n.on('languageChanged', handleLanguageChanged);
    return () => i18n.off('languageChanged', handleLanguageChanged);
  }, [loadPosts, i18n]);

  return { posts, loading };
};