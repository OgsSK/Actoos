import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { getArticleById } from '../data/blogData';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { ArrowLeft, Clock, User, FileText, Target, TrendingUp, Lightbulb, Briefcase, Users } from 'lucide-react';
// Mapping des icônes (car on ne peut pas stocker des composants dans le JSON)
const iconMap = {
  FileText: FileText,
  Target: Target,
  TrendingUp: TrendingUp,
  Lightbulb: Lightbulb,
  Briefcase: Briefcase,
  Users: Users,
};

const colorClasses = {
  blue: 'bg-blue-100 text-blue-600',
  red: 'bg-red-100 text-red-600',
  green: 'bg-green-100 text-green-600',
  yellow: 'bg-yellow-100 text-yellow-600',
  purple: 'bg-purple-100 text-purple-600',
  indigo: 'bg-indigo-100 text-indigo-600',
};

const BlogArticlePage = () => {
  const { id } = useParams();
  const article = getArticleById(parseInt(id));

  if (!article) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20">
        <div className="text-center">
          <h1 className="text-6xl font-bold text-slate-300">404</h1>
          <p className="text-xl text-slate-600 mt-4">Article introuvable</p>
          <Link to="/blog" className="text-blue-600 hover:underline mt-4 inline-block">
            Retour au blog
          </Link>
        </div>
      </div>
    );
  }

  const Icon = iconMap[article.icon];

  return (
    <div className="min-h-screen bg-slate-50 pt-20">
      <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link to="/blog">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour au blog
          </Button>
        </Link>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colorClasses[article.color]}`}>
                <Icon className="w-6 h-6" />
              </div>
              <div>
                <Badge variant="outline">{article.category}</Badge>
                <div className="flex items-center gap-4 text-sm text-slate-500 mt-1">
                  <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {article.readTime}</span>
                  <span className="flex items-center gap-1"><User className="w-4 h-4" /> {article.author}</span>
                  <span>{article.date}</span>
                </div>
              </div>
            </div>

            <h1 className="text-3xl font-bold text-slate-900 mb-6">{article.title}</h1>

            {/* Contenu riche */}
            <div className="prose prose-slate max-w-none" dangerouslySetInnerHTML={{ __html: article.content }} />
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link to="/blog">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voir tous les articles
            </Button>
          </Link>
        </div>
      </article>
    </div>
  );
};

export default BlogArticlePage;