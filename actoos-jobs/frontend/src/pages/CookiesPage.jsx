import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';
import { ChevronLeft } from 'lucide-react';

const CookiesPage = () => {
  const { t } = useTranslation();
  const sections = t('cookies.sections', { returnObjects: true }) || {};
  const email = t('cookies.contactEmail');

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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link to="/" className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-8">
          <ChevronLeft className="w-4 h-4 mr-1" />
          {t('cookies.back')}
        </Link>

        <h1 className="text-3xl font-bold text-slate-900 mb-8">{t('cookies.title')}</h1>
        
        <div className="bg-white rounded-2xl shadow-sm p-8 space-y-8">
          <p className="text-sm text-slate-500">{t('cookies.lastUpdate')}</p>

          {sectionKeys.map((key) => {
            const section = sections[key];
            if (!section) return null;

            return (
              <section key={key}>
                <h2 className="text-xl font-semibold text-slate-900 mb-4">{section.title}</h2>
                
                {section.subsections ? (
                  <div className="space-y-4">
                    {section.subsections.map((sub, idx) => (
                      <div key={idx} className="p-4 bg-slate-50 rounded-lg">
                        <h3 className="font-medium text-slate-900 mb-2">{sub.title}</h3>
                        <p className="text-slate-600 text-sm">{sub.content}</p>
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
                      values={{ email }}
                      components={{
                        a: <a href={`mailto:${email}`} className="text-blue-600 hover:underline" />
                      }}
                    />
                  </p>
                ) : (
                  <p className="text-slate-600 leading-relaxed whitespace-pre-line">
                    {section.content}
                  </p>
                )}
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CookiesPage;