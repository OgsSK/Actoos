import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, ChevronDown } from 'lucide-react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { cn } from '../lib/utils';
import { usePreferencesContext } from '../contexts/PreferencesContext'; // ✅ centralisé

const LANGUAGES = [
  { code: 'ar', nativeName: 'العربية', flag: '🇸🇦' },
  { code: 'de', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'en', nativeName: 'English', flag: '🇬🇧' },
  { code: 'es', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'fr', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'it', nativeName: 'Italiano', flag: '🇮🇹' },
  { code: 'nl', nativeName: 'Nederlands', flag: '🇳🇱' },
  { code: 'pt', nativeName: 'Português', flag: '🇵🇹' },
];

const normalizeLang = (lng = '') => lng.toLowerCase().split('-')[0];

const LanguageSwitcher = ({ isTransparent = false, isMobile = false }) => {
  const { i18n } = useTranslation();
  const { updatePrefs } = usePreferencesContext(); // ✅ hook du contexte

  const currentCode = normalizeLang(i18n.resolvedLanguage || i18n.language || 'fr');

  const current = useMemo(() => {
    return LANGUAGES.find((l) => l.code === currentCode) || LANGUAGES[4];
  }, [currentCode]);

  const changeLanguage = async (code) => {
    try {
      await i18n.changeLanguage(code);
      // ✅ Sauvegarde centralisée de la langue (en base + API + localStorage)
      updatePrefs('language', code);
    } catch (error) {
      console.error('Erreur changement langue:', error);
    }
  };

  // Styles du bouton déclencheur adaptés au mode mobile
  const triggerClasses = cn(
    'h-11 gap-2 rounded-full border px-3.5 text-sm font-medium transition-all shrink-0 whitespace-nowrap shadow-none',
    isMobile
      ? 'h-8 gap-1 px-2 text-xs border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
      : '',
    !isMobile && isTransparent
      ? 'border-white/15 bg-white/10 text-white hover:bg-white/15 hover:text-white'
      : !isMobile
        ? 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
        : '',
    isMobile && isTransparent ? 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50' : ''
  );

  const globeClasses = cn(
    'h-4 w-4',
    isMobile ? 'hidden' : (isTransparent ? 'text-white' : 'text-slate-500')
  );

  const codeClasses = cn(
    'text-[11px] font-semibold uppercase tracking-wider',
    isMobile && 'text-xs tracking-normal'
  );

  const flagClasses = 'text-base leading-none';

  const nativeNameClasses = cn(
    'hidden xl:inline max-w-[120px] truncate',
    isMobile && 'hidden'
  );

  const chevronClasses = cn(
    'h-4 w-4 opacity-70',
    isMobile ? 'hidden' : (isTransparent ? 'text-white' : 'text-slate-500')
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" className={triggerClasses}>
          <Globe className={globeClasses} />
          <span className={codeClasses}>{current.code}</span>
          <span className={flagClasses}>{current.flag}</span>
          <span className={nativeNameClasses}>{current.nativeName}</span>
          <ChevronDown className={chevronClasses} />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={10}
        className="w-60 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl z-[9999]"
      >
        <div className="px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Langue
          </p>
        </div>

        {LANGUAGES.map((lang) => {
          const active = lang.code === current.code;
          return (
            <DropdownMenuItem
              key={lang.code}
              onSelect={() => changeLanguage(lang.code)}
              className={cn(
                'cursor-pointer rounded-xl px-3 py-2.5 focus:bg-slate-100',
                active ? 'bg-blue-50 text-blue-700 focus:text-blue-700' : 'text-slate-700'
              )}
            >
              <span className="mr-3 text-lg leading-none">{lang.flag}</span>
              <span className="flex-1">{lang.nativeName}</span>
              {active && <span className="ml-2 text-xs font-semibold">✓</span>}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSwitcher;