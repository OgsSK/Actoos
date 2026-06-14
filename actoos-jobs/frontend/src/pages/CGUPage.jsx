import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';
import { ChevronLeft } from 'lucide-react';

const CGUPage = () => {
  const { t } = useTranslation();
  const sections = t('cgu.sections', { returnObjects: true }) || [];
  const email = t('cgu.contactEmail');

  return (
    <div className="min-h-screen bg-slate-50 pt-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link to="/" className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-8">
          <ChevronLeft className="w-4 h-4 mr-1" />
          {t('cgu.back')}
        </Link>

        <h1 className="text-3xl font-bold text-slate-900 mb-8">{t('cgu.title')}</h1>
        
        <div className="bg-white rounded-2xl shadow-sm p-8 space-y-8">
          <p className="text-sm text-slate-500">{t('cgu.lastUpdate')}</p>

          {sections.map((section, idx) => (
            <section key={idx}>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">{section.title}</h2>
              {section.content.includes('<a>') ? (
                <p className="text-slate-600 leading-relaxed">
                  <Trans
                    i18nKey={`cgu.sections.${idx}.content`}
                    values={{ email }}
                    components={{
                      a: <a href={`mailto:${email}`} className="text-blue-600 hover:underline" />
                    }}
                  />
                </p>
              ) : (
                <p className="text-slate-600 leading-relaxed whitespace-pre-line">{section.content}</p>
              )}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CGUPage;