'use client';

import { useLanguage } from '../context/LanguageContext';

export default function LanguageSwitcher({
  variant = 'default',
}: {
  variant?: 'default' | 'compact';
}) {
  const { language, setLanguage } = useLanguage();
  const isCompact = variant === 'compact';

  return (
    <div
      className={`flex items-center font-semibold ${
        isCompact ? 'gap-0.5 text-[11px]' : 'gap-1 text-xs'
      }`}
    >
      <button
        type="button"
        onClick={() => setLanguage('fr')}
        className={`${isCompact ? 'px-1 py-0.5' : 'px-1.5 py-1'} transition-colors ${
          language === 'fr'
            ? 'text-red-500'
            : 'text-slate-400 hover:text-slate-700'
        }`}
      >
        FR
      </button>
      <span className="text-slate-300">/</span>
      <button
        type="button"
        onClick={() => setLanguage('en')}
        className={`${isCompact ? 'px-1 py-0.5' : 'px-1.5 py-1'} transition-colors ${
          language === 'en'
            ? 'text-red-500'
            : 'text-slate-400 hover:text-slate-700'
        }`}
      >
        EN
      </button>
    </div>
  );
}