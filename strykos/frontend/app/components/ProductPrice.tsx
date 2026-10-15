'use client';

import { useCurrency } from '../context/CurrencyContext';

interface Props {
  priceEur: number;
  className?: string;
}

export default function ProductPrice({ priceEur, className = '' }: Props) {
  const { formatPrice } = useCurrency();

  if (priceEur <= 0) {
    return <span className={className}>Prix sur demande</span>;
  }

  return <span className={className}>{formatPrice(priceEur, 'EUR')}</span>;
}