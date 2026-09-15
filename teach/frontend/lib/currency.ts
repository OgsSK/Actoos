// Taux de change vers le XOF (FCFA) — même base qu'Actoos Jobs
export const RATES: Record<string, number> = {
  XOF: 1, EUR: 655.957, USD: 603.5, MAD: 60.5,
  GBP: 754.2, BRL: 115.3, ARS: 0.72, NGN: 0.4, ZAR: 32.5,
  SAR: 160.9, AED: 164.3, EGP: 19.5, DZD: 4.48, TND: 194.5,
  CHF: 722.3, XAF: 1, GNF: 0.07, CDF: 0.22, MGA: 0.15,
};

export const CURRENCY_LABELS: Record<string, string> = {
  XOF: 'FCFA', EUR: 'Euro', USD: 'Dollar US', MAD: 'Dirham marocain',
  GBP: 'Livre', BRL: 'Real', ARS: 'Peso argentin', NGN: 'Naira',
  ZAR: 'Rand', SAR: 'Riyal', AED: 'Dirham Émirats', EGP: 'Livre égyptienne',
  DZD: 'Dinar algérien', TND: 'Dinar tunisien', CHF: 'Franc suisse',
  XAF: 'FCFA', GNF: 'Franc guinéen', CDF: 'Franc congolais', MGA: 'Ariary',
};

export const MAX_AMOUNT_XOF = 2_000_000_000; // 2 milliards

export function toXOF(amount: string | number, currency: string): number | null {
  const num = typeof amount === 'string' ? parseInt(amount) : amount;
  if (isNaN(num)) return null;
  if (currency === 'XOF') return num;
  const rate = RATES[currency] || 1;
  const xof = Math.round(num * rate);
  return xof > MAX_AMOUNT_XOF ? MAX_AMOUNT_XOF : xof;
}

export function fromXOF(amountXOF: number | null | undefined, currency: string): string {
  if (amountXOF == null) return '';
  const rate = RATES[currency] || 1;
  return Math.round(amountXOF / rate).toString();
}