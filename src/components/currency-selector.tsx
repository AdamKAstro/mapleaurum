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
      className="currency-selector"
    >
      <option value="USD">USD</option>
      <option value="CAD">CAD</option>
    </select>
  );
}