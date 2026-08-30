import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';

const CACHE_KEY = 'actoos_blog_posts_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

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
  const [loading, setLoading] = useState(true); // sera mis à false dès qu'on a des données (cache ou locale)

  const loadPosts = useCallback(() => {
    if (authLoading) {
      setLoading(true);
      return () => {};
    }

    // 1. Essayer de charger depuis le cache local immédiatement
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed.timestamp && (Date.now() - parsed.timestamp) < CACHE_DURATION) {
          setPosts(parsed.data.map(ensureSlug));
          setLoading(false); // on a des données, on arrête le loader
        }
      } catch (e) {}
    }

    // 2. Récupérer les traductions i18n
    const translatedArticles = t('blogArticles.items', { returnObjects: true }) || [];
    const translationMap = new Map(
      translatedArticles.map((article) => [article.slug, article])
    );

    if (!user) {
      // utilisateur non connecté : articles locaux
      setPosts(translatedArticles.map(ensureSlug));
      setLoading(false);
      return () => {};
    }

    // 3. Lancer la requête API en arrière-plan, sans bloquer l'affichage
    const controller = new AbortController();

    fetch(`/api/blog/posts?audience=${audience}`, {
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Erreur API');
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data)) {
          const merged = data.map((article) => {
            const ensured = ensureSlug(article);
            return translationMap.get(ensured.slug) || ensured;
          });
          setPosts(merged);
          // Sauvegarde dans le cache local
          localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data: merged }));
        }
      })
      .catch((err) => {
        console.error('Erreur blog API:', err);
        // Ne pas vider les posts existants en cas d'échec
      })
      .finally(() => {
        // Si on n'a toujours pas de posts, on arrête le loader
        if (posts.length === 0) setLoading(false);
        else setLoading(false); // déjà arrêté plus haut
      });

    return () => controller.abort();
  }, [user, authLoading, audience, t, i18n.language, posts.length]);

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