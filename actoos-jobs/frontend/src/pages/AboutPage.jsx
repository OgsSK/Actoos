import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '../components/ui/card';
import { Target, Eye, Shield, Zap, Heart, TrendingUp } from 'lucide-react';

const AboutPage = () => {
  const { t } = useTranslation();

  // Icônes fixes pour les valeurs (dans le même ordre que le tableau)
  const valueIcons = [Shield, Zap, Heart, TrendingUp];

  // Récupération des valeurs depuis les traductions
  const values = t('about.values.items', { returnObjects: true }) || [];

  return (
    <div className="pt-20 min-h-screen bg-slate-50">
      {/* Hero */}
      <div className="bg-gradient-to-br from-blue-950 via-blue-900 to-blue-950 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold mb-4">{t('about.hero.title')}</h1>
          <p className="text-blue-100 text-lg max-w-2xl mx-auto">
            {t('about.hero.subtitle')}
          </p>
        </div>
      </div>

      {/* Mission & Vision */}
      <div className="max-w-5xl mx-auto px-4 py-16 space-y-16">
        <div className="grid md:grid-cols-2 gap-8">
          <Card className="border-0 shadow-lg rounded-3xl">
            <CardContent className="p-8">
              <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center mb-4">
                <Target className="w-6 h-6 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">{t('about.mission.title')}</h2>
              <p className="text-slate-600 leading-relaxed">
                {t('about.mission.content')}
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg rounded-3xl">
            <CardContent className="p-8">
              <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center mb-4">
                <Eye className="w-6 h-6 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">{t('about.vision.title')}</h2>
              <p className="text-slate-600 leading-relaxed">
                {t('about.vision.content')}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Valeurs */}
        <div>
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-10">{t('about.values.title')}</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((v, idx) => {
              const Icon = valueIcons[idx] || Shield;
              return (
                <Card key={v.title} className="border-0 shadow-lg rounded-3xl text-center">
                  <CardContent className="p-6">
                    <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Icon className="w-7 h-7 text-blue-600" />
                    </div>
                    <h3 className="font-semibold text-slate-900 text-lg mb-2">{v.title}</h3>
                    <p className="text-sm text-slate-600">{v.desc}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* L'équipe */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">{t('about.team.title')}</h2>
          <p className="text-slate-600 max-w-2xl mx-auto">
            {t('about.team.content')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;