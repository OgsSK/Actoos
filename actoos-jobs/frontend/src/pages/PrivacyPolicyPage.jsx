import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';
import { ChevronLeft } from 'lucide-react';

const PrivacyPolicyPage = () => {
  const { t } = useTranslation();
  const email = t('privacyPolicy.contactEmail');

  const sections = [
    'intro',
    'dataCollected',
    'dataUsage',
    'dataSharing',
    'security',
    'yourRights',
    'contact',
  ];

  return (
    <div className="min-h-screen bg-slate-50 pt-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link to="/" className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-8">
          <ChevronLeft className="w-4 h-4 mr-1" />
          {t('privacyPolicy.back')}
        </Link>

        <h1 className="text-3xl font-bold text-slate-900 mb-8">{t('privacyPolicy.title')}</h1>
        
        <div className="bg-white rounded-2xl shadow-sm p-8 space-y-8">
          <p className="text-sm text-slate-500">{t('privacyPolicy.lastUpdate')}</p>

          {sections.map((sectionKey) => (
            <section key={sectionKey}>
              <h2 className="text-xl font-semibold text-slate-900 mb-4">
                {t(`privacyPolicy.sections.${sectionKey}.title`)}
              </h2>
              <p className="text-slate-600 leading-relaxed">
                <Trans
                  i18nKey={`privacyPolicy.sections.${sectionKey}.content`}
                  values={{ email }}
                  components={{
                    a: <a href={`mailto:${email}`} className="text-blue-600 hover:underline" />
                  }}
                />
              </p>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;