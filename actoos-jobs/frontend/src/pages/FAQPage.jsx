import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, ChevronDown, HelpCircle, Mail, ArrowRight } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';

const FAQPage = () => {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [openItems, setOpenItems] = useState({});
  const [activeCategory, setActiveCategory] = useState(t('faq.allCategories'));

  const FAQ_CATEGORIES = t('faq.categories', { returnObjects: true }) || [];

  const toggleItem = (key) => {
    setOpenItems(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const filteredCategories = useMemo(() => {
    return FAQ_CATEGORIES.map(cat => ({
      ...cat,
      questions: cat.questions.filter(q =>
        !search ||
        q.q.toLowerCase().includes(search.toLowerCase()) ||
        q.a.toLowerCase().includes(search.toLowerCase())
      )
    })).filter(cat => {
      if (activeCategory !== t('faq.allCategories') && cat.name !== activeCategory) return false;
      return cat.questions.length > 0;
    });
  }, [FAQ_CATEGORIES, activeCategory, search, t]);

  const categoriesList = [t('faq.allCategories'), ...FAQ_CATEGORIES.map(c => c.name)];

  return (
    <div className="min-h-screen bg-slate-50 pt-20">
      {/* Hero avec fond bleu dégradé */}
      <div className="bg-gradient-to-br from-blue-950 via-blue-900 to-blue-950 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="w-16 h-16 bg-blue-500/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-6">
            <HelpCircle className="w-8 h-8 text-blue-200" />
          </div>
          <h1 className="text-4xl font-bold mb-4">{t('faq.title', 'Foire Aux Questions')}</h1>
          <p className="text-blue-100 text-lg max-w-xl mx-auto">
            {t('faq.subtitle', 'Trouvez rapidement une réponse à vos questions.')}
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Barre de recherche */}
        <div className="relative mb-8">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-slate-400" />
          </div>
          <Input
            placeholder={t('faq.searchPlaceholder', 'Rechercher une question…')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-12 pr-4 py-3 text-lg bg-white border border-slate-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
          />
        </div>

        {/* Badges de catégories */}
        <div className="flex flex-wrap gap-2 mb-10 justify-center">
          {categoriesList.map(cat => (
            <Badge
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                'cursor-pointer px-4 py-2 text-sm font-medium rounded-full border transition-colors',
                activeCategory === cat
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              )}
            >
              {cat}
            </Badge>
          ))}
        </div>

        {/* Résultats */}
        {filteredCategories.length === 0 ? (
          <Card className="border-dashed border-2 border-slate-300 bg-white/50">
            <CardContent className="p-10 text-center">
              <HelpCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600 text-lg font-medium">
                {t('faq.noResults', 'Aucun résultat pour "{{search}}"').replace('{{search}}', search)}
              </p>
              <p className="text-slate-400 text-sm mt-2">
                {t('faq.noResultsHint', 'Essayez avec d\'autres mots-clés ou parcourez les catégories.')}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredCategories.map((cat) => (
            <div key={cat.name} className="mb-10">
              <h2 className="text-2xl font-semibold text-slate-900 mb-6 border-b pb-2">{cat.name}</h2>
              <div className="space-y-4">
                {cat.questions.map((item, idx) => {
                  const key = `${cat.name}-${idx}`;
                  const isOpen = openItems[key];
                  return (
                    <Card key={key} className="border border-slate-200 overflow-hidden rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                      <button
                        onClick={() => toggleItem(key)}
                        className="w-full px-6 py-5 text-left flex items-center justify-between hover:bg-slate-50 transition-colors"
                      >
                        <span className="font-medium text-slate-900 pr-4">{item.q}</span>
                        <ChevronDown
                          className={cn(
                            'w-5 h-5 text-slate-400 transition-transform duration-200 shrink-0',
                            isOpen ? 'rotate-180' : ''
                          )}
                        />
                      </button>
                      {isOpen && (
                        <div className="px-6 pb-5 text-slate-600 leading-relaxed text-sm whitespace-pre-line border-t border-slate-100 pt-4">
                          {item.a}
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            </div>
          ))
        )}

        {/* Bloc de contact */}
        {!search && filteredCategories.length > 0 && (
          <div className="mt-12 bg-blue-50 rounded-3xl p-8 text-center border border-blue-100">
            <Mail className="w-8 h-8 text-blue-600 mx-auto mb-3" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">
              {t('faq.contactBlock.title', 'Vous ne trouvez pas votre réponse ?')}
            </h3>
            <p className="text-slate-600 mb-6 max-w-md mx-auto">
              {t('faq.contactBlock.description', 'Notre équipe est disponible pour vous aider.')}
            </p>
            <Link to="/contact">
              <Button variant="default" className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-6">
                {t('faq.contactBlock.button', 'Nous contacter')}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default FAQPage;