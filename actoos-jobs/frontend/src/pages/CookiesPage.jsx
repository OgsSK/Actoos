import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';
import { ChevronLeft, Cookie, Mail } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';

const CookiesPage = () => {
  const { t } = useTranslation();

  // Protection : si la clé de traduction n'existe pas ou n'est pas un objet, on utilise un objet vide
  const rawSections = t('cookies.sections', { returnObjects: true });
  const sections = (rawSections && typeof rawSections === 'object' && !Array.isArray(rawSections))
    ? rawSections
    : {};

  const email = t('cookies.contactEmail', 'contact@actoos.com');
  const lastUpdate = t('cookies.lastUpdate', '');

  // Clés des sections dans l'ordre souhaité
  const sectionKeys = [
    'whatIsCookie',
    'cookieTypes',
    'thirdParty',
    'manageCookies',
    'browserSettings',
    'changes',
    'contact',
  ];

  return (
    <div className="min-h-screen bg-slate-50 pt-20">
      {/* Hero avec fond bleu dégradé */}
      <div className="bg-gradient-to-br from-blue-950 via-blue-900 to-blue-950 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link to="/" className="inline-flex items-center text-blue-200 hover:text-white mb-6 transition-colors">
            <ChevronLeft className="w-4 h-4 mr-1" />
            {t('cookies.back', 'Retour')}
          </Link>
          <h1 className="text-4xl font-bold mb-4">
            {t('cookies.title', 'Politique de cookies')}
          </h1>
          <p className="text-blue-100 text-lg max-w-2xl">
            {t('cookies.subtitle', 'Découvrez comment nous utilisons les cookies pour améliorer votre expérience.')}
          </p>
        </div>
      </div>

      {/* Contenu */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-2xl shadow-sm p-6 sm:p-8 space-y-8">
          {lastUpdate && (
            <p className="text-sm text-slate-500 italic">{lastUpdate}</p>
          )}

          {sectionKeys.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Cookie className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>La politique de cookies sera bientôt disponible.</p>
            </div>
          ) : (
            sectionKeys.map((key) => {
              const section = sections[key];
              if (!section) return null;

              return (
                <Card key={key} className="border-0 shadow-none bg-transparent">
                  <CardContent className="p-0 space-y-4">
                    <h2 className="text-xl font-semibold text-slate-900">
                      {section.title || key}
                    </h2>

                    {section.subsections ? (
                      <div className="space-y-4">
                        {section.subsections.map((sub, idx) => (
                          <div key={idx} className="p-4 bg-slate-50 rounded-lg">
                            <h3 className="font-medium text-slate-900 mb-2">
                              {sub.title || ''}
                            </h3>
                            <p className="text-slate-600 text-sm whitespace-pre-line">
                              {sub.content || ''}
                            </p>
                            {sub.duration && (
                              <p className="text-xs text-slate-500 mt-2">{sub.duration}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : key === 'contact' ? (
                      <p className="text-slate-600 leading-relaxed">
                        <Trans
                          i18nKey="cookies.sections.contact.content"
                          defaults="Pour toute question relative à notre politique de cookies, vous pouvez nous contacter à l'adresse suivante : <a>{{email}}</a>"
                          values={{ email }}
                          components={{
                            a: <a href={`mailto:${email}`} className="text-blue-600 hover:underline" />,
                          }}
                        />
                      </p>
                    ) : (
                      <p className="text-slate-600 leading-relaxed whitespace-pre-line">
                        {section.content || ''}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}

          {/* Zone de contact supplémentaire */}
          <div className="border-t border-slate-100 pt-8 mt-8">
            <div className="flex items-center gap-2 text-slate-500 mb-2">
              <Mail className="w-4 h-4" />
              <span className="text-sm font-medium">
                {t('cookies.contact', 'Contact')}
              </span>
            </div>
            <p className="text-slate-600 text-sm">
              <Trans
                i18nKey="cookies.contactText"
                defaults="Vous pouvez à tout moment nous contacter pour toute question relative à notre politique de cookies : <a>{{email}}</a>"
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

export default CookiesPage;