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

    // Récupérer les articles traduits depuis i18n (pour tous les utilisateurs)
    const translatedArticles = t('blogArticles.items', { returnObjects: true }) || [];
    const translationMap = new Map(
      translatedArticles.map((article) => [article.slug, article])
    );

    if (!user) {
      // Utilisateur non connecté : on utilise directement les traductions
      setPosts(translatedArticles.map(ensureSlug));
      setLoading(false);
      return () => {};
    }

    // Utilisateur connecté : on récupère l'API puis on fusionne avec les traductions
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
        clearTimeout(timeoutId);
        if (Array.isArray(data)) {
          const merged = data.map((article) => {
            const ensured = ensureSlug(article);
            // Si une traduction existe pour ce slug, on l'utilise
            return translationMap.get(ensured.slug) || ensured;
          });
          setPosts(merged);
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
  }, [user, authLoading, audience, t, i18n.language]);

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