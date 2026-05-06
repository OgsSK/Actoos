import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { fetchExchangeRates, convertFromEUR, formatCurrency, displayAmount, getRates } from '../utils/currency';
import { supabase } from '../lib/supabase';

const CurrencyContext = createContext();

export function CurrencyProvider({ children }) {
  const { user } = useAuth();
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

        // If user is logged in, get their currency preference from Supabase
        if (user?.entreprise_id) {
          try {
            const { data: entreprise } = await supabase
              .from('entreprises')
              .select('devise')
              .eq('id', user.entreprise_id)
              .single();
            
            if (entreprise?.devise) {
              setCurrency(entreprise.devise);
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
  }, [user?.entreprise_id]);

  // Change currency and save to Supabase
  const changeCurrency = useCallback(async (newCurrency) => {
    setCurrency(newCurrency);
    
    if (user?.entreprise_id) {
      try {
        await supabase
          .from('entreprises')
          .update({ devise: newCurrency, updated_at: new Date().toISOString() })
          .eq('id', user.entreprise_id);
      } catch (err) {
        console.error('Failed to save currency preference');
      }
    }
  }, [user?.entreprise_id]);

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
