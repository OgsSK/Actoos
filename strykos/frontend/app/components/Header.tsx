'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  Search,
  ShoppingBag,
  User,
  Heart,
  ChevronDown,
  Menu,
  X,
  Globe,
  Check,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useFavorites } from '../context/FavoritesContext';
import { useLanguage, type Language } from '../context/LanguageContext';
import { useCurrency, type Currency } from '../context/CurrencyContext';
import { BRAND } from '@/lib/brand';
import SearchBar from './SearchBar';

const CATEGORIES = [
  { labelKey: 'navMaillots', href: '/c/maillots' },
  { labelKey: 'navChaussures', href: '/c/chaussures' },
  { labelKey: 'navEquipements', href: '/c/equipements' },
];

const BRANDS = [
  { name: 'Nike', slug: 'nike' },
  { name: 'adidas', slug: 'adidas' },
  { name: 'PUMA', slug: 'puma' },
];

export default function Header() {
  const { user } = useAuth();
  const { itemCount } = useCart();
  const { count: favoritesCount } = useFavorites();
  const { language, setLanguage, t } = useLanguage();
  const { currency, setCurrency } = useCurrency();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [currencyOpen, setCurrencyOpen] = useState(false);

  return (
    <>
      {/* Bandeau promo */}
      <div className="bg-slate-900 text-white text-xs py-2 text-center px-4">
        {t('topBanner')}
      </div>

      <header className="sticky top-0 z-50 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4 lg:gap-6">

            {/* Logo */}
            <Link href="/" className="flex items-center shrink-0">
              <span className="text-xl sm:text-2xl font-black tracking-tight">
                {BRAND.name}
              </span>
              <span className="ml-1 w-2 h-2 rounded-full bg-emerald-500" />
            </Link>

            {/* Nav desktop */}
            <nav className="hidden lg:flex items-center gap-6 text-sm font-medium shrink-0">
              {CATEGORIES.map((cat) => (
                <Link
                  key={cat.href}
                  href={cat.href}
                  className="hover:text-emerald-600 transition-colors py-2 whitespace-nowrap"
                >
                  {t(cat.labelKey)}
                </Link>
              ))}

              {/* Dropdown marques */}
              <div className="relative group">
                <button className="flex items-center gap-1 py-2 hover:text-emerald-600 transition-colors">
                  {t('navMarques')} <ChevronDown size={14} />
                </button>
                <div className="absolute top-full left-0 pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                  <div className="bg-white border border-slate-200 rounded-lg shadow-lg py-2 min-w-[160px]">
                    {BRANDS.map((b) => (
                      <Link
                        key={b.slug}
                        href={`/brand/${b.slug}`}
                        className="block px-4 py-2 text-sm hover:bg-slate-50"
                      >
                        {b.name}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </nav>

            {/* Barre de recherche (desktop) */}
            <div className="hidden lg:flex flex-1 max-w-md">
              <SearchBar variant="desktop" />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-0.5 sm:gap-1">

              {/* Loupe mobile */}
              <Link
                href="/search"
                className="lg:hidden p-2 hover:bg-slate-100 rounded-lg transition-colors"
                aria-label={t('search')}
              >
                <Search size={20} />
              </Link>

              {/* Sélecteur langue (desktop) */}
              <div className="relative hidden md:block">
                <button
                  onClick={() => { setLangOpen(v => !v); setCurrencyOpen(false); }}
                  className="flex items-center gap-1 px-2 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                  aria-label={t('language')}
                >
                  <Globe size={16} />
                  <span className="uppercase">{language}</span>
                </button>
                {langOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setLangOpen(false)} />
                    <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg py-1 min-w-[120px] z-20">
                      {(['fr', 'en'] as Language[]).map((l) => (
                        <button
                          key={l}
                          onClick={() => { setLanguage(l); setLangOpen(false); }}
                          className="w-full flex items-center justify-between gap-3 px-4 py-2 text-sm hover:bg-slate-50 transition-colors"
                        >
                          <span>{l === 'fr' ? 'Français' : 'English'}</span>
                          {language === l && <Check size={14} className="text-emerald-600" />}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Sélecteur devise (desktop) */}
              <div className="relative hidden md:block">
                <button
                  onClick={() => { setCurrencyOpen(v => !v); setLangOpen(false); }}
                  className="flex items-center gap-1 px-2 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                  aria-label={t('currency')}
                >
                  <span>{currency === 'EUR' ? '€' : 'FCFA'}</span>
                  <ChevronDown size={12} />
                </button>
                {currencyOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setCurrencyOpen(false)} />
                    <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg py-1 min-w-[140px] z-20">
                      {(['EUR', 'XOF'] as Currency[]).map((c) => (
                        <button
                          key={c}
                          onClick={() => { setCurrency(c); setCurrencyOpen(false); }}
                          className="w-full flex items-center justify-between gap-3 px-4 py-2 text-sm hover:bg-slate-50 transition-colors"
                        >
                          <span>{c === 'EUR' ? 'Euro (€)' : 'Franc CFA'}</span>
                          {currency === c && <Check size={14} className="text-emerald-600" />}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Compte */}
              {user ? (
                <Link
                  href="/account"
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                  aria-label={t('account')}
                >
                  <User size={20} />
                </Link>
              ) : (
                <Link
                  href="/auth/login"
                  className="hidden sm:inline-flex px-3 md:px-4 py-2 text-sm font-medium border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap"
                >
                  {t('login')}
                </Link>
              )}

              {/* Favoris */}
              <Link
                href="/account/favorites"
                className="hidden sm:block relative p-2 hover:bg-slate-100 rounded-lg transition-colors"
                aria-label={t('favorites')}
              >
                <Heart size={20} />
                {favoritesCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {favoritesCount}
                  </span>
                )}
              </Link>

              {/* Panier */}
              <Link
                href="/cart"
                className="relative p-2 hover:bg-slate-100 rounded-lg transition-colors"
                aria-label={t('cart')}
              >
                <ShoppingBag size={20} />
                {itemCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-emerald-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {itemCount}
                  </span>
                )}
              </Link>

              {/* Menu burger mobile */}
              <button
                onClick={() => setMobileOpen(true)}
                className="lg:hidden p-2 hover:bg-slate-100 rounded-lg transition-colors"
                aria-label={t('menu')}
              >
                <Menu size={20} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Drawer mobile */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-[60] lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <div className="fixed top-0 right-0 h-full w-80 max-w-[85vw] bg-white z-[70] shadow-xl flex flex-col lg:hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <span className="font-bold text-lg">{t('menu')}</span>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-1 text-slate-500 hover:text-slate-900"
                aria-label="Fermer"
              >
                <X size={22} />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto p-5">
              {/* Recherche mobile */}
              <div className="mb-6">
                <SearchBar variant="mobile" />
              </div>

              {/* Catégories */}
              {CATEGORIES.map((cat) => (
                <Link
                  key={cat.href}
                  href={cat.href}
                  onClick={() => setMobileOpen(false)}
                  className="block py-4 border-b border-slate-100 text-base font-medium"
                >
                  {t(cat.labelKey)}
                </Link>
              ))}

              {/* Marques */}
              <div className="pt-6 pb-4">
                <p className="text-xs uppercase tracking-wider text-slate-400 mb-2">
                  {t('navMarques')}
                </p>
                {BRANDS.map((b) => (
                  <Link
                    key={b.slug}
                    href={`/brand/${b.slug}`}
                    onClick={() => setMobileOpen(false)}
                    className="block py-3 text-sm text-slate-700"
                  >
                    {b.name}
                  </Link>
                ))}
              </div>

              {/* Langue + Devise (mobile) */}
              <div className="pt-6 border-t border-slate-100 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wider text-slate-400 mb-2">
                    {t('language')}
                  </p>
                  <div className="flex items-center gap-1">
                    {(['fr', 'en'] as Language[]).map((l) => (
                      <button
                        key={l}
                        onClick={() => setLanguage(l)}
                        className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${
                          language === l
                            ? 'bg-slate-900 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {l.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-slate-400 mb-2">
                    {t('currency')}
                  </p>
                  <div className="flex items-center gap-1">
                    {(['EUR', 'XOF'] as Currency[]).map((c) => (
                      <button
                        key={c}
                        onClick={() => setCurrency(c)}
                        className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${
                          currency === c
                            ? 'bg-slate-900 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Favoris (mobile) */}
              <Link
                href="/account/favorites"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 mt-6 py-3 text-sm font-medium text-slate-700"
              >
                <Heart size={16} />
                {t('favorites')}
                {favoritesCount > 0 && (
                  <span className="ml-auto min-w-[20px] h-5 px-1.5 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {favoritesCount}
                  </span>
                )}
              </Link>
            </nav>

            {/* CTA connexion */}
            {!user && (
              <div className="p-5 border-t border-slate-100">
                <Link
                  href="/auth/login"
                  onClick={() => setMobileOpen(false)}
                  className="block w-full text-center px-4 py-3 bg-slate-900 text-white rounded-lg font-medium"
                >
                  {t('login')}
                </Link>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}