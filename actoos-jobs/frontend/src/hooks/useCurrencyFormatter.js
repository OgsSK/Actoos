import { usePreferences } from './usePreferences';

const RATES = {
  XOF: 1,
  EUR: 655.957,
  USD: 603.5,
  MAD: 60.5,
};

const SYMBOLS = {
  XOF: 'FCFA',
  EUR: '€',
  USD: '$',
  MAD: 'MAD',
};

export const useCurrencyFormatter = () => {
  const { prefs } = usePreferences();

  const format = (amountInXOF) => {
    if (amountInXOF == null) return { value: '', symbol: '' };
    const currency = prefs.currency || 'XOF';
    const rate = RATES[currency] || 1;
    const converted = amountInXOF / rate;

    // On formate le nombre sans symbole
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