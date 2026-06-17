import { usePreferencesContext } from '../contexts/PreferencesContext';

const RATES = {
  XOF: 1, EUR: 655.957, USD: 603.5, MAD: 60.5,
  GBP: 754.2, BRL: 115.3, ARS: 0.72, NGN: 0.4, ZAR: 32.5,
  SAR: 160.9, AED: 164.3, EGP: 19.5, DZD: 4.48, TND: 194.5,
  CHF: 722.3,   // Franc suisse
  XAF: 1,        // Franc CFA (même valeur que XOF)
  GNF: 0.07,     // Franc guinéen (très faible)
  CDF: 0.22,     // Franc congolais
  MGA: 0.15      // Ariary malgache
};

const SYMBOLS = {
  XOF: 'FCFA', EUR: '€', USD: '$', MAD: 'MAD',
  GBP: '£', BRL: 'R$', ARS: 'AR$', NGN: '₦', ZAR: 'R',
  SAR: '﷼', AED: 'د.إ', EGP: 'ج.م', DZD: 'د.ج', TND: 'د.ت',
  CHF: 'CHF', XAF: 'FCFA', GNF: 'FG', CDF: 'FC', MGA: 'Ar'
};

export const useCurrencyFormatter = () => {
  const { prefs } = usePreferencesContext();

  const format = (amountInXOF) => {
    if (amountInXOF == null) return { value: '', symbol: '' };
    const currency = prefs.currency || 'XOF';
    const rate = RATES[currency] || 1;
    const converted = amountInXOF / rate;

    const formattedValue = new Intl.NumberFormat('fr-FR', {
      maximumFractionDigits: 0,
    }).format(converted);

    return {
      value: formattedValue,
      symbol: SYMBOLS[currency] || 'FCFA',
    };
  };

  return { format };
};