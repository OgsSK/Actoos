import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useBlogPosts } from '../hooks/useBlogPosts'; // ← même hook que la liste
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { ArrowLeft, Clock, User, FileText, Target, TrendingUp, Lightbulb, Briefcase, Users, Loader2 } from 'lucide-react';

const iconMap = { FileText, Target, TrendingUp, Lightbulb, Briefcase, Users };
const colorClasses = {
  blue: 'bg-blue-100 text-blue-600',
  red: 'bg-red-100 text-red-600',
  green: 'bg-green-100 text-green-600',
  yellow: 'bg-yellow-100 text-yellow-600',
  purple: 'bg-purple-100 text-purple-600',
  indigo: 'bg-indigo-100 text-indigo-600',
};

const BlogArticlePage = () => {
  const { t } = useTranslation();
  const { id } = useParams(); // id = slug ou ID numérique
  const { posts, loading } = useBlogPosts('all'); // récupère tous les articles (locaux ou API selon le contexte)

  // Cherche l'article correspondant (par slug d'abord, puis par id numérique)
  const article = posts.find(
    p => p.slug === id || p.id === parseInt(id)
  );

  if (loading) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20">
        <div className="text-center">
          <h1 className="text-6xl font-bold text-slate-300">404</h1>
          <p className="text-xl text-slate-600 mt-4">{t('blogArticle.notFoundTitle')}</p>
          <Link to="/blog" className="text-blue-600 hover:underline mt-4 inline-block">
            {t('blogArticle.notFoundBack')}
          </Link>
        </div>
      </div>
    );
  }

  const Icon = iconMap[article.icon] || FileText;

  return (
    <div className="min-h-screen bg-slate-50 pt-20">
      <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link to="/blog">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('blogArticle.back')}
          </Button>
        </Link>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colorClasses[article.color] || 'bg-blue-100 text-blue-600'}`}>
                <Icon className="w-6 h-6" />
              </div>
              <div>
                <Badge variant="outline">{article.category}</Badge>
                <div className="flex items-center gap-4 text-sm text-slate-500 mt-1">
                  <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {article.read_time}</span>
                  <span className="flex items-center gap-1"><User className="w-4 h-4" /> {article.author}</span>
                  <span>{new Date(article.published_at).toLocaleDateString('fr-FR')}</span>
                </div>
              </div>
            </div>

            <h1 className="text-3xl font-bold text-slate-900 mb-6">{article.title}</h1>

            <div className="prose prose-slate max-w-none" dangerouslySetInnerHTML={{ __html: article.content }} />
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link to="/blog">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('blogArticle.allArticles')}
            </Button>
          </Link>
        </div>
      </article>
    </div>
  );
};

export default BlogArticlePage;