/**
 * Currency formatting utilities for multi-currency support
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

/**
 * Format a number as currency
 * @param {number} amount - The amount to format
 * @param {string} currencyCode - The currency code (EUR, USD, XOF, etc.)
 * @param {boolean} showSymbol - Whether to show the currency symbol
 * @returns {string} Formatted currency string
 */
export function formatCurrency(amount, currencyCode = 'EUR', showSymbol = true) {
  // Handle null/undefined/NaN
  if (amount === null || amount === undefined || isNaN(amount)) {
    amount = 0;
  }
  
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
 * @param {number} amount - The amount to format
 * @param {string} currencyCode - The currency code
 * @returns {string} Compact formatted currency
 */
export function formatCurrencyCompact(amount, currencyCode = 'EUR') {
  const config = CURRENCY_CONFIG[currencyCode] || CURRENCY_CONFIG.EUR;
  
  let formatted;
  if (amount >= 1000000) {
    formatted = `${(amount / 1000000).toFixed(1)}M`;
  } else if (amount >= 1000) {
    formatted = `${(amount / 1000).toFixed(1)}k`;
  } else {
    formatted = formatCurrency(amount, currencyCode, false);
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

export default {
  formatCurrency,
  formatCurrencyCompact,
  getCurrencySymbol,
};
