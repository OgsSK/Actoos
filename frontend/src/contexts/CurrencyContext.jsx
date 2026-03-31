import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { fetchExchangeRates, convertFromEUR, formatCurrency, displayAmount, getRates } from '../utils/currency';

const CurrencyContext = createContext();

export function CurrencyProvider({ children }) {
  const { api, user } = useAuth();
  const [currency, setCurrency] = useState('EUR');
  const [rates, setRates] = useState({});
  const [loading, setLoading] = useState(true);

  // Load exchange rates and user's currency preference
  useEffect(() => {
    const init = async () => {
      try {
        // Fetch exchange rates
        await fetchExchangeRates();
        setRates(getRates());

        // If user is logged in, get their currency preference
        if (user && api) {
          try {
            const res = await api.get('/entreprise');
            if (res.data?.devise) {
              setCurrency(res.data.devise);
            }
          } catch (err) {
            console.log('Could not fetch entreprise currency');
          }
        }
      } catch (error) {
        console.error('Currency init error:', error);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [user, api]);

  // Change currency and save to backend
  const changeCurrency = useCallback(async (newCurrency) => {
    setCurrency(newCurrency);
    
    if (api) {
      try {
        await api.put(`/entreprise/currency?devise=${newCurrency}`);
      } catch (err) {
        console.error('Failed to save currency preference');
      }
    }
  }, [api]);

  // Format an amount in EUR to the current currency
  const format = useCallback((amountInEUR) => {
    return displayAmount(amountInEUR, currency);
  }, [currency]);

  // Convert EUR to current currency
  const convert = useCallback((amountInEUR) => {
    return convertFromEUR(amountInEUR, currency);
  }, [currency]);

  // Just format (no conversion) - for amounts already in target currency
  const formatOnly = useCallback((amount) => {
    return formatCurrency(amount, currency);
  }, [currency]);

  const value = {
    currency,
    setCurrency: changeCurrency,
    rates,
    loading,
    format,        // Convert from EUR and format
    convert,       // Convert from EUR (number only)
    formatOnly,    // Format without conversion
    symbol: currency === 'EUR' ? '€' : 
            currency === 'USD' ? '$' : 
            currency === 'GBP' ? '£' : 
            currency === 'CHF' ? 'CHF' :
            currency === 'CAD' ? 'CA$' :
            currency === 'XOF' ? 'CFA' :
            currency === 'MAD' ? 'DH' : '€'
  };

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) {
    // Return default values if used outside provider
    return {
      currency: 'EUR',
      setCurrency: () => {},
      rates: {},
      loading: false,
      format: (amount) => `${amount?.toFixed(2) || 0} €`,
      convert: (amount) => amount,
      formatOnly: (amount) => `${amount?.toFixed(2) || 0} €`,
      symbol: '€'
    };
  }
  return context;
}

export default CurrencyContext;
