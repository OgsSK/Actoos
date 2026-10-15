'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type Language = 'fr' | 'en';

// Dictionnaire minimal — utilisé par le Header pour l'instant.
// À étendre progressivement pour les autres pages.
export const TRANSLATIONS: Record<Language, Record<string, string>> = {
  fr: {
    // Top bar
    topBanner: 'Livraison offerte dès 80€ en Belgique · Retours gratuits sous 14 jours',

    // Nav
    navMaillots: 'Maillots',
    navChaussures: 'Chaussures',
    navEquipements: 'Équipements',
    navMarques: 'Marques',

    // Actions
    login: 'Connexion',
    account: 'Mon compte',
    search: 'Rechercher',
    searchPlaceholder: 'Rechercher un produit, une marque…',
    searchPlaceholderShort: 'Rechercher…',
    favorites: 'Mes favoris',
    cart: 'Panier',
    menu: 'Menu',

    // Selectors
    language: 'Langue',
    currency: 'Devise',

    // Suggestions
    typeProduct: 'Produit',
    typeBrand: 'Marque',
    viewAllResults: 'Voir tous les résultats pour',

    // Cart
    emptyCart: 'Votre panier est vide',
  },
  en: {
    topBanner: 'Free shipping on orders over €80 in Belgium · Free returns within 14 days',

    navMaillots: 'Jerseys',
    navChaussures: 'Shoes',
    navEquipements: 'Equipment',
    navMarques: 'Brands',

    login: 'Sign in',
    account: 'My account',
    search: 'Search',
    searchPlaceholder: 'Search for a product, a brand…',
    searchPlaceholderShort: 'Search…',
    favorites: 'My favorites',
    cart: 'Cart',
    menu: 'Menu',

    language: 'Language',
    currency: 'Currency',

    typeProduct: 'Product',
    typeBrand: 'Brand',
    viewAllResults: 'See all results for',

    emptyCart: 'Your cart is empty',
  },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'fr',
  setLanguage: () => {},
  t: (key) => key,
});

const STORAGE_KEY = 'strykos_language';

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('fr');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'fr' || stored === 'en') {
      setLanguageState(stored);
    } else {
      // Détection navigateur au premier visit
      const browser = navigator.language?.slice(0, 2).toLowerCase();
      if (browser === 'en') setLanguageState('en');
    }
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, lang);
      document.documentElement.lang = lang;
    }
  }, []);

  const t = useCallback(
    (key: string) => TRANSLATIONS[language][key] ?? key,
    [language]
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);