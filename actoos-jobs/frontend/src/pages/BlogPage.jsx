import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../lib/api';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { useBlogPosts } from '../hooks/useBlogPosts';
import {
  BookOpen, Clock, User, ArrowRight, FileText, Target,
  Lightbulb, TrendingUp, Users, Briefcase, CheckCircle, Loader2
} from 'lucide-react';
import { toast } from 'sonner';

// ----- Petite fonction pour créer un slug depuis un titre -----
const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

// ----- Icônes et couleurs -----
const iconMap = {
  FileText,
  Target,
  TrendingUp,
  Lightbulb,
  Briefcase,
  Users,
};

const colorClasses = {
  blue: 'bg-blue-100 text-blue-600',
  red: 'bg-red-100 text-red-600',
  green: 'bg-green-100 text-green-600',
  yellow: 'bg-yellow-100 text-yellow-600',
  purple: 'bg-purple-100 text-purple-600',
  indigo: 'bg-indigo-100 text-indigo-600',
};

// ----- Composant Newsletter (interne) -----
const NewsletterSection = () => {
  const { t, i18n } = useTranslation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  const handleNewsletter = async (e) => {
    e.preventDefault();
    if (!email) {
      toast.error(t('blog.newsletter.toasts.emailRequired'));
      return;
    }
    setLoading(true);
    try {
      await apiFetch('/api/newsletter', {
        method: 'POST',
        body: JSON.stringify({
          email,
          language: i18n.language,
        }),
      });
      setSubscribed(true);
      toast.success(t('blog.newsletter.toasts.subscribeSuccess'));
    } catch (err) {
      toast.error(err.message || t('blog.newsletter.toasts.subscribeError'));
    } finally {
      setLoading(false);
    }
  };

  if (subscribed) {
    return (
      <div className="mt-16 bg-white rounded-2xl p-8 sm:p-12 border border-slate-200 text-center">
        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-slate-900 mb-4">{t('blog.newsletter.subscribedTitle')}</h2>
        <p className="text-slate-600">{t('blog.newsletter.subscribedMessage')}</p>
      </div>
    );
  }

  return (
    <div className="mt-16 bg-white rounded-2xl p-8 sm:p-12 border border-slate-200">
      <div className="max-w-2xl mx-auto text-center">
        <BookOpen className="w-12 h-12 text-blue-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-slate-900 mb-4">{t('blog.newsletter.title')}</h2>
        <p className="text-slate-600 mb-6">{t('blog.newsletter.subtitle')}</p>
        <form onSubmit={handleNewsletter} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
          <input
            type="email"
            placeholder={t('blog.newsletter.placeholder')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1 h-10 px-4 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Button type="submit" disabled={loading} className="bg-blue-600 text-white hover:bg-blue-700">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : t('blog.newsletter.subscribeButton')}
          </Button>
        </form>
        <p className="text-xs text-slate-500 mt-3">{t('blog.newsletter.privacyNote')}</p>
      </div>
    </div>
  );
};

// ----- Page principale du blog -----
const BlogPage = () => {
  const { t, i18n } = useTranslation();
  const { user, isCompany } = useAuth();
  
  // Catégorie active = catégorie d'origine (français) ou "Tous" (traduit)
  const [activeCategory, setActiveCategory] = useState(null); // sera initialisé après

  // ✅ CORRECTION : toujours charger tous les articles (audience = 'all')
  const { posts, loading } = useBlogPosts('all');

  // Initialiser activeCategory avec la valeur "Tous" au premier rendu et après changement de langue
  useEffect(() => {
    setActiveCategory(t('blog.allCategories'));
  }, [i18n.language, t]);

  // Mélange déterministique pour varier l'affichage chaque jour (optionnel)
  const shuffled = useMemo(() => {
    if (!posts.length) return [];
    const dayOfYear = Math.floor(
      (new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000
    );
    return [...posts].sort(
      (a, b) => ((a.id * dayOfYear) % 7) - ((b.id * dayOfYear) % 7)
    );
  }, [posts]);

  // Liste des catégories d'origine (français) pour le filtrage interne
  const originalCategories = useMemo(() => {
    return [...new Set(posts.map((a) => a.category))];
  }, [posts]);

  // Catégories affichées (traduites) pour les boutons
  const displayCategories = useMemo(() => {
    return [t('blog.allCategories'), ...originalCategories.map(cat => t(`blog.categories.${cat}`, cat))];
  }, [originalCategories, t]);

  // Retrouver la catégorie d'origine à partir de la catégorie traduite sélectionnée
  const getOriginalCategory = (displayCat) => {
    if (displayCat === t('blog.allCategories')) return null; // "Tous"
    const entry = Object.entries(t('blog.categories', { returnObjects: true }) || {}).find(([key, val]) => val === displayCat);
    return entry ? entry[0] : displayCat; // fallback: on utilise la chaîne elle-même
  };

  // Filtrage : comparer avec la catégorie d'origine (français)
  const filteredArticles = useMemo(() => {
    if (!activeCategory || activeCategory === t('blog.allCategories')) return shuffled;
    const originalCat = getOriginalCategory(activeCategory);
    return shuffled.filter((a) => a.category === originalCat);
  }, [shuffled, activeCategory, t]);

  // Affichage du loader
  if (loading) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-20">
      {/* En-tête */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
          <Badge className="bg-blue-100 text-blue-700 border-0 mb-4">{t('blog.badge')}</Badge>
          <h1 className="text-3xl font-bold text-slate-900 mb-4">{t('blog.title')}</h1>
          <p className="text-slate-600 max-w-2xl mx-auto">{t('blog.subtitle')}</p>
        </div>
      </div>

      {/* Filtres de catégories */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-wrap gap-2 justify-center">
          {displayCategories.map((displayCat) => (
            <Button
              key={displayCat}
              variant={activeCategory === displayCat ? 'default' : 'ghost'}
              className="rounded-full"
              onClick={() => setActiveCategory(displayCat)}
            >
              {displayCat}
            </Button>
          ))}
        </div>
      </div>

      {/* Liste des articles */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {filteredArticles.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600">{t('blog.noArticles')}</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredArticles.map((article) => {
              const Icon = iconMap[article.icon] || FileText;
              const slug = article.slug || slugify(article.title);
              // Afficher la catégorie traduite dans le badge
              const displayCategory = t(`blog.categories.${article.category}`, article.category);
              return (
                <Link to={`/blog/${slug}`} key={article.id} className="group">
                  <Card className="h-full hover:shadow-lg transition-shadow overflow-hidden">
                    <div
                      className={`h-2 ${colorClasses[article.color]?.split(' ')[0] || 'bg-blue-500'}`}
                    />
                    <CardContent className="p-6 flex flex-col h-full">
                      <div className="flex items-center gap-2 mb-4">
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            colorClasses[article.color] || 'bg-blue-100 text-blue-600'
                          }`}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {displayCategory}
                        </Badge>
                      </div>
                      <h2 className="text-lg font-semibold text-slate-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                        {article.title}
                      </h2>
                      <p className="text-slate-600 text-sm mb-4 line-clamp-2 flex-1">
                        {article.excerpt}
                      </p>
                      <div className="flex items-center justify-between text-sm text-slate-500 mt-auto">
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            {article.author}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {article.read_time}
                          </span>
                        </div>
                        <span className="flex items-center gap-1 text-blue-600 font-medium">
                          {t('blog.readMore')}
                          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
        <NewsletterSection />
      </div>
    </div>
  );
};

export default BlogPage;