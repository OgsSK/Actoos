import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { 
  BookOpen, Clock, User, ArrowRight, FileText, Target, 
  Lightbulb, TrendingUp, Users, Briefcase
} from 'lucide-react';

const BlogPage = () => {
  // Articles statiques pour le MVP
  const articles = [
    {
      id: 1,
      title: 'Comment rediger un CV qui se demarque en 2026',
      excerpt: 'Decouvrez les meilleures pratiques pour creer un CV moderne et efficace qui attirera l\'attention des recruteurs.',
      category: 'Conseils CV',
      readTime: '5 min',
      author: 'Equipe Actoos',
      date: '25 Mai 2026',
      icon: FileText,
      color: 'blue',
    },
    {
      id: 2,
      title: 'Les 10 erreurs a eviter en entretien d\'embauche',
      excerpt: 'Preparez-vous au mieux pour vos entretiens en evitant ces erreurs courantes que font la plupart des candidats.',
      category: 'Entretien',
      readTime: '7 min',
      author: 'Equipe Actoos',
      date: '23 Mai 2026',
      icon: Target,
      color: 'red',
    },
    {
      id: 3,
      title: 'Negocier son salaire : guide complet',
      excerpt: 'Apprenez a negocier votre salaire avec confiance et obtenez la remuneration que vous meritez.',
      category: 'Salaire',
      readTime: '8 min',
      author: 'Equipe Actoos',
      date: '20 Mai 2026',
      icon: TrendingUp,
      color: 'green',
    },
    {
      id: 4,
      title: 'Reconversion professionnelle : par ou commencer ?',
      excerpt: 'Vous souhaitez changer de carriere ? Voici les etapes cles pour reussir votre reconversion professionnelle.',
      category: 'Carriere',
      readTime: '10 min',
      author: 'Equipe Actoos',
      date: '18 Mai 2026',
      icon: Lightbulb,
      color: 'yellow',
    },
    {
      id: 5,
      title: 'Travailler au Mali : secteurs qui recrutent en 2026',
      excerpt: 'Decouvrez les secteurs d\'activite les plus dynamiques et les metiers les plus recherches au Mali cette annee.',
      category: 'Marche emploi',
      readTime: '6 min',
      author: 'Equipe Actoos',
      date: '15 Mai 2026',
      icon: Briefcase,
      color: 'purple',
    },
    {
      id: 6,
      title: 'Developper son reseau professionnel efficacement',
      excerpt: 'Le networking est essentiel pour votre carriere. Voici comment construire et entretenir votre reseau.',
      category: 'Networking',
      readTime: '5 min',
      author: 'Equipe Actoos',
      date: '12 Mai 2026',
      icon: Users,
      color: 'indigo',
    },
  ];

  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    red: 'bg-red-100 text-red-600',
    green: 'bg-green-100 text-green-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    purple: 'bg-purple-100 text-purple-600',
    indigo: 'bg-indigo-100 text-indigo-600',
  };

  return (
    <div className="min-h-screen bg-slate-50 pt-20">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
          <Badge className="bg-blue-100 text-blue-700 border-0 mb-4">Blog</Badge>
          <h1 className="text-3xl font-bold text-slate-900 mb-4">
            Conseils et ressources pour votre carriere
          </h1>
          <p className="text-slate-600 max-w-2xl mx-auto">
            Retrouvez nos meilleurs conseils pour booster votre recherche d'emploi, 
            reussir vos entretiens et developper votre carriere.
          </p>
        </div>
      </div>

      {/* Categories */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-wrap gap-2 justify-center">
          <Button variant="outline" className="rounded-full">Tous</Button>
          <Button variant="ghost" className="rounded-full">Conseils CV</Button>
          <Button variant="ghost" className="rounded-full">Entretien</Button>
          <Button variant="ghost" className="rounded-full">Carriere</Button>
          <Button variant="ghost" className="rounded-full">Salaire</Button>
          <Button variant="ghost" className="rounded-full">Marche emploi</Button>
        </div>
      </div>

      {/* Articles Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {articles.map((article) => {
            const Icon = article.icon;
            return (
              <Card key={article.id} className="hover:shadow-lg transition-shadow overflow-hidden">
                <div className={`h-2 ${colorClasses[article.color].split(' ')[0]}`} />
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClasses[article.color]}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {article.category}
                    </Badge>
                  </div>

                  <h2 className="text-lg font-semibold text-slate-900 mb-2 line-clamp-2">
                    {article.title}
                  </h2>
                  <p className="text-slate-600 text-sm mb-4 line-clamp-2">
                    {article.excerpt}
                  </p>

                  <div className="flex items-center justify-between text-sm text-slate-500">
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
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <Button variant="ghost" className="w-full justify-between group">
                      Lire l'article
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Newsletter */}
        <div className="mt-16 bg-white rounded-2xl p-8 sm:p-12 border border-slate-200">
          <div className="max-w-2xl mx-auto text-center">
            <BookOpen className="w-12 h-12 text-blue-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 mb-4">
              Restez informe
            </h2>
            <p className="text-slate-600 mb-6">
              Recevez nos derniers articles et conseils carriere directement dans votre boite mail.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                type="email"
                placeholder="Votre email"
                className="flex-1 h-10 px-4 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Button className="bg-blue-600 hover:bg-blue-700">
                S'inscrire
              </Button>
            </div>
            <p className="text-xs text-slate-500 mt-3">
              En vous inscrivant, vous acceptez notre politique de confidentialite.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlogPage;
