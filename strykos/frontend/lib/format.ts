export const EUR_TO_XOF = 655.957;

export function toMinor(amount: number, currency: string): number {
  if (currency === 'XOF') return Math.round(amount);
  return Math.round(amount * 100);
}

export function fromMinor(minor: number, currency: string): number {
  if (currency === 'XOF') return minor;
  return minor / 100;
}

export function formatPrice(minor: number, currency: string): string {
  if (currency === 'XOF') {
    const value = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(minor);
    return `${value} F`;
  }
  const value = (minor / 100).toFixed(2).replace('.', ',');
  return `${value} €`;
}

export function eurToXof(eurMinor: number): number {
  const eur = eurMinor / 100;
  const xof = eur * EUR_TO_XOF;
  return Math.round(xof / 500) * 500;
}