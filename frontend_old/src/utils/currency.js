/**
 * Currency conversion and formatting utilities
 */

// Exchange rates (base: EUR) - will be fetched from API
const DEFAULT_RATES = {
  EUR: 1.0,
  USD: 1.08,
  XOF: 655.96,
  GBP: 0.86,
  CHF: 0.97,
  CAD: 1.47,
  MAD: 10.85
};

// Currency symbols and formatting
const CURRENCY_CONFIG = {
  EUR: { symbol: '€', position: 'after', decimals: 2 },
  USD: { symbol: '$', position: 'before', decimals: 2 },
  XOF: { symbol: 'CFA', position: 'after', decimals: 0 },
  GBP: { symbol: '£', position: 'before', decimals: 2 },
  CHF: { symbol: 'CHF', position: 'after', decimals: 2 },
  CAD: { symbol: 'CA$', position: 'before', decimals: 2 },
  MAD: { symbol: 'DH', position: 'after', decimals: 2 }
};

let cachedRates = DEFAULT_RATES;

/**
 * Fetch exchange rates - Using default rates (no external API needed)
 * In production, you could use a free API like exchangerate-api.com
 */
export async function fetchExchangeRates() {
  // Use default rates - no need for Railway
  // You can integrate a free exchange rate API later if needed
  return cachedRates;
}

/**
 * Convert amount from EUR (base) to target currency
 */
export function convertFromEUR(amount, toCurrency = 'EUR') {
  if (!amount || toCurrency === 'EUR') return amount;
  const rate = cachedRates[toCurrency] || 1.0;
  return Math.round(amount * rate * 100) / 100;
}

/**
 * Convert amount from any currency to EUR (base)
 */
export function convertToEUR(amount, fromCurrency = 'EUR') {
  if (!amount || fromCurrency === 'EUR') return amount;
  const rate = cachedRates[fromCurrency] || 1.0;
  return Math.round((amount / rate) * 100) / 100;
}

/**
 * Convert amount between any two currencies
 */
export function convertCurrency(amount, fromCurrency = 'EUR', toCurrency = 'EUR') {
  if (!amount || fromCurrency === toCurrency) return amount;
  // Convert to EUR first, then to target
  const inEUR = convertToEUR(amount, fromCurrency);
  return convertFromEUR(inEUR, toCurrency);
}

/**
 * Format amount with currency symbol
 */
export function formatCurrency(amount, currencyCode = 'EUR') {
  if (amount === null || amount === undefined) return '-';
  
  const config = CURRENCY_CONFIG[currencyCode] || CURRENCY_CONFIG.EUR;
  const formatted = amount.toLocaleString('fr-FR', {
    minimumFractionDigits: config.decimals,
    maximumFractionDigits: config.decimals
  });
  
  if (config.position === 'before') {
    return `${config.symbol}${formatted}`;
  }
  return `${formatted} ${config.symbol}`;
}

/**
 * Convert and format amount for display
 * @param {number} amountInEUR - Amount stored in EUR (base currency)
 * @param {string} displayCurrency - Currency to display in
 */
export function displayAmount(amountInEUR, displayCurrency = 'EUR') {
  const converted = convertFromEUR(amountInEUR, displayCurrency);
  return formatCurrency(converted, displayCurrency);
}

/**
 * Get exchange rate info
 */
export function getExchangeRate(fromCurrency, toCurrency) {
  const fromRate = cachedRates[fromCurrency] || 1.0;
  const toRate = cachedRates[toCurrency] || 1.0;
  return toRate / fromRate;
}

/**
 * Get cached rates
 */
export function getRates() {
  return cachedRates;
}

/**
 * Set rates (for testing or manual update)
 */
export function setRates(rates) {
  cachedRates = { ...DEFAULT_RATES, ...rates };
}

export default {
  fetchExchangeRates,
  convertFromEUR,
  convertToEUR,
  convertCurrency,
  formatCurrency,
  displayAmount,
  getExchangeRate,
  getRates,
  setRates
};
