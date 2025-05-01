import React from 'react';
import { useCurrency } from '../contexts/currency-context';
import type { Currency } from '../lib/types';

export function CurrencySelector() {
  const { currency, setCurrency } = useCurrency();

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrency(event.target.value as Currency);
  };

  return (
    <select
      value={currency}
      onChange={handleChange}
      className="px-3 py-2 text-sm bg-navy-400/20 border border-navy-300/20 rounded-md text-surface-white focus:outline-none focus:ring-2 focus:ring-accent-teal"
    >
      <option value="USD">USD</option>
      <option value="CAD">CAD</option>
    </select>
  );
}