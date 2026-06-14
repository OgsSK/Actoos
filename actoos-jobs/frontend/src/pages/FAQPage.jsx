import React, { useState } from 'react';
import { Search, ChevronDown, HelpCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { cn } from '../lib/utils';

const FAQPage = () => {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [openItems, setOpenItems] = useState({});
  const [activeCategory, setActiveCategory] = useState(t('faq.allCategories'));

  // Récupération des catégories depuis les traductions
  const FAQ_CATEGORIES = t('faq.categories', { returnObjects: true }) || [];

  const toggleItem = (key) => {
    setOpenItems(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSearch = (e) => {
    setSearch(e.target.value);
  };

  const filteredCategories = FAQ_CATEGORIES.filter(cat => {
    if (activeCategory !== t('faq.allCategories') && cat.name !== activeCategory) return false;
    if (!search) return true;
    return cat.questions.some(
      q => q.q.toLowerCase().includes(search.toLowerCase()) ||
           q.a.toLowerCase().includes(search.toLowerCase())
    );
  }).map(cat => ({
    ...cat,
    questions: search
      ? cat.questions.filter(q =>
          q.q.toLowerCase().includes(search.toLowerCase()) ||
          q.a.toLowerCase().includes(search.toLowerCase())
        )
      : cat.questions
  })).filter(cat => cat.questions.length > 0);

  const categoriesList = [t('faq.allCategories'), ...FAQ_CATEGORIES.map(c => c.name)];

  return (
    <div className="min-h-screen bg-slate-50 pt-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <HelpCircle className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-4">{t('faq.title')}</h1>
          <p className="text-slate-600 max-w-lg mx-auto">
            {t('faq.subtitle')}
          </p>
        </div>

        {/* Barre de recherche */}
        <div className="relative mb-6">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-slate-400" />
          </div>
          <Input
            placeholder={t('faq.searchPlaceholder')}
            value={search}
            onChange={handleSearch}
            className="pl-12 pr-4 py-3 text-lg bg-white border border-slate-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
          />
        </div>

        {/* Filtres de catégories */}
        <div className="flex flex-wrap gap-2 mb-8">
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
            <CardContent className="p-8 text-center">
              <HelpCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600 text-lg">
                {t('faq.noResults', { search })}
              </p>
              <p className="text-slate-400 text-sm mt-1">
                {t('faq.noResultsHint')}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredCategories.map((cat) => (
            <div key={cat.name} className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">{cat.name}</h2>
              <div className="space-y-3">
                {cat.questions.map((item, idx) => {
                  const key = `${cat.name}-${idx}`;
                  const isOpen = openItems[key];
                  return (
                    <Card key={key} className="border border-slate-200 overflow-hidden">
                      <button
                        onClick={() => toggleItem(key)}
                        className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-slate-50 transition-colors"
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
                        <div className="px-6 pb-4 text-slate-600 leading-relaxed text-sm whitespace-pre-line">
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
      </div>
    </div>
  );
};

export default FAQPage;