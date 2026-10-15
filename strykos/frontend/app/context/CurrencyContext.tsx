'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type Currency = 'EUR' | 'XOF';

const EUR_TO_XOF = 655.957;

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  /**
   * Formate un montant stocké en unité mineure (centimes pour EUR, unités pour XOF).
   * @param minorAmount montant en unité mineure de SA devise source
   * @param sourceCurrency devise dans laquelle le montant est stocké (défaut : EUR)
   */
  formatPrice: (minorAmount: number, sourceCurrency?: Currency) => string;
}

const CurrencyContext = createContext<CurrencyContextType>({
  currency: 'EUR',
  setCurrency: () => {},
  formatPrice: () => '—',
});

const STORAGE_KEY = 'strykos_currency';

/**
 * Convertit un montant en unité mineure d'une devise source
 * vers l'unité mineure de la devise cible.
 */
function convertMinor(
  amount: number,
  from: Currency,
  to: Currency
): number {
  if (from === to) return amount;

  // Normalise en unité majeure
  const inMajor = from === 'EUR' ? amount / 100 : amount;

  // Convertit
  let result = inMajor;
  if (from === 'EUR' && to === 'XOF') {
    result = inMajor * EUR_TO_XOF;
    // Arrondi au multiple de 500 (pratique courante en Afrique de l'Ouest)
    return Math.round(result / 500) * 500;
  }
  if (from === 'XOF' && to === 'EUR') {
    result = inMajor / EUR_TO_XOF;
    return Math.round(result * 100);
  }
  return Math.round(result);
}

/**
 * Formate en string selon la devise cible.
 */
function format(minor: number, currency: Currency): string {
  if (currency === 'XOF') {
    const value = new Intl.NumberFormat('fr-FR', {
      maximumFractionDigits: 0,
    }).format(minor);
    return `${value} FCFA`;
  }
  const value = (minor / 100).toFixed(2).replace('.', ',');
  return `${value} €`;
}

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>('EUR');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'EUR' || stored === 'XOF') {
      setCurrencyState(stored);
    }
  }, []);

  const setCurrency = useCallback((c: Currency) => {
    setCurrencyState(c);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, c);
    }
  }, []);

  const formatPrice = useCallback(
    (minorAmount: number, sourceCurrency: Currency = 'EUR') => {
      const converted = convertMinor(minorAmount, sourceCurrency, currency);
      return format(converted, currency);
    },
    [currency]
  );

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, formatPrice }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export const useCurrency = () => useContext(CurrencyContext);