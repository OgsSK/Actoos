/**
 * Currency formatting utilities with conversion support
 */

const CURRENCY_CONFIG = {
  EUR: { symbol: '€', position: 'after', decimalSeparator: ',', thousandsSeparator: ' ' },
  USD: { symbol: '$', position: 'before', decimalSeparator: '.', thousandsSeparator: ',' },
  XOF: { symbol: 'CFA', position: 'after', decimalSeparator: ',', thousandsSeparator: ' ', noDecimals: true },
  GBP: { symbol: '£', position: 'before', decimalSeparator: '.', thousandsSeparator: ',' },
  CHF: { symbol: 'CHF', position: 'after', decimalSeparator: '.', thousandsSeparator: "'" },
  CAD: { symbol: '$', position: 'before', decimalSeparator: '.', thousandsSeparator: ',' },
  MAD: { symbol: 'DH', position: 'after', decimalSeparator: ',', thousandsSeparator: ' ' },
};

// Exchange rates (base: EUR)
const EXCHANGE_RATES = {
  EUR: 1.0,
  USD: 1.08,
  XOF: 655.96,
  GBP: 0.86,
  CHF: 0.97,
  CAD: 1.47,
  MAD: 10.85
};

/**
 * Convert amount from EUR to target currency
 */
export function convertFromEUR(amount, toCurrency = 'EUR') {
  if (!amount || toCurrency === 'EUR') return amount;
  const rate = EXCHANGE_RATES[toCurrency] || 1.0;
  return Math.round(amount * rate * 100) / 100;
}

/**
 * Format a number as currency (with automatic conversion from EUR)
 * @param {number} amountInEUR - The amount in EUR (base currency)
 * @param {string} currencyCode - The target currency code
 * @param {boolean} showSymbol - Whether to show the currency symbol
 * @param {boolean} convert - Whether to convert from EUR (default true)
 * @returns {string} Formatted currency string
 */
export function formatCurrency(amountInEUR, currencyCode = 'EUR', showSymbol = true, convert = true) {
  // Handle null/undefined/NaN
  if (amountInEUR === null || amountInEUR === undefined || isNaN(amountInEUR)) {
    amountInEUR = 0;
  }
  
  // Convert from EUR if needed
  let amount = convert ? convertFromEUR(amountInEUR, currencyCode) : amountInEUR;
  
  const config = CURRENCY_CONFIG[currencyCode] || CURRENCY_CONFIG.EUR;
  
  // Handle negative numbers
  const isNegative = amount < 0;
  amount = Math.abs(amount);
  
  // Round to 2 decimals (or 0 for XOF)
  const decimals = config.noDecimals ? 0 : 2;
  amount = amount.toFixed(decimals);
  
  // Split into integer and decimal parts
  const [intPart, decPart] = amount.split('.');
  
  // Add thousands separators
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, config.thousandsSeparator);
  
  // Combine parts
  let formatted = decPart 
    ? `${formattedInt}${config.decimalSeparator}${decPart}`
    : formattedInt;
  
  // Add negative sign
  if (isNegative) {
    formatted = `-${formatted}`;
  }
  
  // Add currency symbol
  if (showSymbol) {
    if (config.position === 'before') {
      formatted = `${config.symbol}${formatted}`;
    } else {
      formatted = `${formatted} ${config.symbol}`;
    }
  }
  
  return formatted;
}

/**
 * Format a number as compact currency (for dashboards)
 * @param {number} amountInEUR - The amount in EUR
 * @param {string} currencyCode - The currency code
 * @returns {string} Compact formatted currency
 */
export function formatCurrencyCompact(amountInEUR, currencyCode = 'EUR') {
  const config = CURRENCY_CONFIG[currencyCode] || CURRENCY_CONFIG.EUR;
  
  // Convert from EUR
  const amount = convertFromEUR(amountInEUR, currencyCode);
  
  let formatted;
  if (Math.abs(amount) >= 1000000) {
    formatted = `${(amount / 1000000).toFixed(1)}M`;
  } else if (Math.abs(amount) >= 1000) {
    formatted = `${(amount / 1000).toFixed(1)}k`;
  } else {
    formatted = formatCurrency(amountInEUR, currencyCode, false);
  }
  
  if (config.position === 'before') {
    return `${config.symbol}${formatted}`;
  } else {
    return `${formatted} ${config.symbol}`;
  }
}

/**
 * Get currency symbol
 * @param {string} currencyCode - The currency code
 * @returns {string} The currency symbol
 */
export function getCurrencySymbol(currencyCode = 'EUR') {
  return CURRENCY_CONFIG[currencyCode]?.symbol || '€';
}

/**
 * Get exchange rate from EUR to target currency
 */
export function getExchangeRate(currencyCode = 'EUR') {
  return EXCHANGE_RATES[currencyCode] || 1.0;
}

export default {
  formatCurrency,
  formatCurrencyCompact,
  getCurrencySymbol,
  convertFromEUR,
  getExchangeRate,
  EXCHANGE_RATES,
};
