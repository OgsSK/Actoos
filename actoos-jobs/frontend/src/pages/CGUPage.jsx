import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';
import { ChevronLeft, FileText, Mail } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';

const CGUPage = () => {
  const { t } = useTranslation();

  // Récupération sécurisée des sections (évite le crash si la clé n'existe pas ou n'est pas un tableau)
  const rawSections = t('cgu.sections', { returnObjects: true });
  const sections = Array.isArray(rawSections) ? rawSections : [];

  const email = t('cgu.contactEmail', 'contact@actoos.com');
  const lastUpdate = t('cgu.lastUpdate', '');

  return (
    <div className="min-h-screen bg-slate-50 pt-20">
      {/* Hero */}
      <div className="bg-gradient-to-br from-blue-950 via-blue-900 to-blue-950 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link to="/" className="inline-flex items-center text-blue-200 hover:text-white mb-6 transition-colors">
            <ChevronLeft className="w-4 h-4 mr-1" />
            {t('cgu.back', 'Retour')}
          </Link>
          <h1 className="text-4xl font-bold mb-4">{t('cgu.title', 'Conditions Générales d\'Utilisation')}</h1>
          <p className="text-blue-100 text-lg max-w-2xl">
            {t('cgu.subtitle', 'Les règles qui encadrent l\'utilisation de notre plateforme.')}
          </p>
        </div>
      </div>

      {/* Contenu */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-2xl shadow-sm p-6 sm:p-8 space-y-8">
          {lastUpdate && (
            <p className="text-sm text-slate-500 italic">
              {lastUpdate}
            </p>
          )}

          {sections.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>Les conditions d'utilisation seront bientôt disponibles.</p>
            </div>
          ) : (
            sections.map((section, idx) => (
              <Card key={idx} className="border-0 shadow-none bg-transparent">
                <CardContent className="p-0 space-y-4">
                  <h2 className="text-xl font-semibold text-slate-900">
                    {section.title || `Section ${idx + 1}`}
                  </h2>
                  {section.content ? (
                    section.content.includes('<a>') ? (
                      <p className="text-slate-600 leading-relaxed">
                        <Trans
                          i18nKey={`cgu.sections.${idx}.content`}
                          values={{ email }}
                          components={{
                            a: <a href={`mailto:${email}`} className="text-blue-600 hover:underline" />,
                          }}
                        />
                      </p>
                    ) : (
                      <p className="text-slate-600 leading-relaxed whitespace-pre-line">
                        {section.content}
                      </p>
                    )
                  ) : (
                    <p className="text-slate-400 italic">Contenu à venir</p>
                  )}
                </CardContent>
              </Card>
            ))
          )}

          {/* Contact */}
          <div className="border-t border-slate-100 pt-8 mt-8">
            <div className="flex items-center gap-2 text-slate-500 mb-2">
              <Mail className="w-4 h-4" />
              <span className="text-sm font-medium">{t('cgu.contact', 'Contact')}</span>
            </div>
            <p className="text-slate-600 text-sm">
              <Trans
                i18nKey="cgu.contactText"
                defaults="Pour toute question relative à ces CGU, vous pouvez nous écrire à l'adresse suivante : <a>{{email}}</a>"
                values={{ email }}
                components={{
                  a: <a href={`mailto:${email}`} className="text-blue-600 hover:underline" />,
                }}
              />
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CGUPage;