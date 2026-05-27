import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { blogArticles } from '../data/blogData';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import {
  BookOpen, Clock, User, ArrowRight, FileText, Target,
  Lightbulb, TrendingUp, Users, Briefcase, CheckCircle, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '../lib/api';

// Composant Newsletter fonctionnel
const NewsletterSection = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  const handleNewsletter = async (e) => {
    e.preventDefault();
    if (!email) {
      toast.error('Veuillez entrer votre email.');
      return;
    }
    setLoading(true);
    try {
      await apiFetch('/api/newsletter', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setSubscribed(true);
      toast.success('Inscription réussie !');
    } catch (err) {
      toast.error(err.message || 'Erreur lors de l\'inscription.');
    } finally {
      setLoading(false);
    }
  };

  if (subscribed) {
    return (
      <div className="mt-16 bg-white rounded-2xl p-8 sm:p-12 border border-slate-200 text-center">
        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Vous êtes inscrit !</h2>
        <p className="text-slate-600">Merci pour votre intérêt. À très vite dans votre boîte mail.</p>
      </div>
    );
  }

  return (
    <div className="mt-16 bg-white rounded-2xl p-8 sm:p-12 border border-slate-200">
      <div className="max-w-2xl mx-auto text-center">
        <BookOpen className="w-12 h-12 text-blue-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Restez informé</h2>
        <p className="text-slate-600 mb-6">
          Recevez nos derniers articles et conseils carrière directement dans votre boîte mail.
        </p>
        <form onSubmit={handleNewsletter} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
          <input
            type="email"
            placeholder="Votre email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1 h-10 px-4 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Button type="submit" disabled={loading} className="bg-blue-600 text-white hover:bg-blue-700 text-white">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "S'inscrire"}
          </Button>
        </form>
        <p className="text-xs text-slate-500 mt-3">
          En vous inscrivant, vous acceptez notre politique de confidentialité.
        </p>
      </div>
    </div>
  );
};

const BlogPage = () => {
  const [activeCategory, setActiveCategory] = useState('Tous');

  const categories = ['Tous', ...new Set(blogArticles.map((a) => a.category))];

  const filteredArticles = activeCategory === 'Tous'
    ? blogArticles
    : blogArticles.filter((a) => a.category === activeCategory);

  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    red: 'bg-red-100 text-red-600',
    green: 'bg-green-100 text-green-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    purple: 'bg-purple-100 text-purple-600',
    indigo: 'bg-indigo-100 text-indigo-600',
  };

  // Mapping pour les icônes (composants)
  const iconMap = {
    FileText: FileText,
    Target: Target,
    TrendingUp: TrendingUp,
    Lightbulb: Lightbulb,
    Briefcase: Briefcase,
    Users: Users,
  };

  return (
    <div className="min-h-screen bg-slate-50 pt-20">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
          <Badge className="bg-blue-100 text-blue-700 border-0 mb-4">Blog</Badge>
          <h1 className="text-3xl font-bold text-slate-900 mb-4">
            Conseils et ressources pour votre carrière
          </h1>
          <p className="text-slate-600 max-w-2xl mx-auto">
            Retrouvez nos meilleurs conseils pour booster votre recherche d'emploi,
            réussir vos entretiens et développer votre carrière.
          </p>
        </div>
      </div>

      {/* Onglets de catégories fonctionnels */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-wrap gap-2 justify-center">
          {categories.map((cat) => (
            <Button
              key={cat}
              variant={activeCategory === cat ? 'default' : 'ghost'}
              className="rounded-full"
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </Button>
          ))}
        </div>
      </div>

      {/* Articles Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredArticles.map((article) => {
            const Icon = iconMap[article.icon];
            return (
              <Link to={`/blog/${article.id}`} key={article.id} className="group">
                <Card className="h-full hover:shadow-lg transition-shadow overflow-hidden">
                  <div className={`h-2 ${colorClasses[article.color].split(' ')[0]}`} />
                  <CardContent className="p-6 flex flex-col h-full">
                    <div className="flex items-center gap-2 mb-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClasses[article.color]}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {article.category}
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
                          {article.readTime}
                        </span>
                      </div>
                      <span className="flex items-center gap-1 text-blue-600 font-medium">
                        Lire l'article
                        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        {/* Newsletter fonctionnelle */}
        <NewsletterSection />
      </div>
    </div>
  );
};

export default BlogPage;