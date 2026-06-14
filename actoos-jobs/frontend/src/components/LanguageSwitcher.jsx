import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  const toggleLanguage = () => {
    const nextLang = i18n.language === 'fr' ? 'en' : 'fr';
    i18n.changeLanguage(nextLang);
  };

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
      title={i18n.language === 'fr' ? 'Switch to English' : 'Passer en français'}
    >
      <Globe className="w-4 h-4" />
      <span className="uppercase">{i18n.language === 'fr' ? 'EN' : 'FR'}</span>
    </button>
  );
};

export default LanguageSwitcher;