// src/lib/currencyUtils.ts
import { supabase } from './supabaseClient'; // Adjust path if your supabaseClient is elsewhere
import type { Currency, ExchangeRate, ExchangeRateMap } from './types';
import { isValidNumber } from './utils'; // Assuming you have this utility

const DEBUG_CURRENCY = process.env.NODE_ENV === 'development';

/**
 * Fetches the latest available exchange rates from the public.exchange_rates table.
 * It aims to get the most recent rate for each currency pair based on rate_date.
 * @returns A promise that resolves to an ExchangeRateMap.
 */
export async function fetchLatestExchangeRates(): Promise<ExchangeRateMap> {
  if (DEBUG_CURRENCY) {
    console.log('[CurrencyUtils] Attempting to fetch latest exchange rates...');
  }

  // First, find the most recent rate_date available in the table
  const { data: latestDateInfo, error: dateError } = await supabase
    .from('exchange_rates')
    .select('rate_date')
    .order('rate_date', { ascending: false })
    .limit(1);

  if (dateError) {
    console.error('[CurrencyUtils] Error fetching latest rate_date:', dateError.message);
    return {};
  }

  if (!latestDateInfo || latestDateInfo.length === 0) {
    console.warn('[CurrencyUtils] No rate_date found in exchange_rates table.');
    return {};
  }

  const latestRateDate = latestDateInfo[0].rate_date;
  if (DEBUG_CURRENCY) {
    console.log(`[CurrencyUtils] Using latest available rate_date: ${latestRateDate}`);
  }

  // Now fetch all rates for that most recent rate_date
  const { data: ratesData, error: ratesError } = await supabase
    .from('exchange_rates')
    .select('from_currency, to_currency, rate')
    .eq('rate_date', latestRateDate);

  if (ratesError) {
    console.error('[CurrencyUtils] Error fetching exchange rates for date', latestRateDate, ':', ratesError.message);
    return {};
  }

  if (!ratesData) {
    if (DEBUG_CURRENCY) console.warn('[CurrencyUtils] No exchange rate data returned for date', latestRateDate);
    return {};
  }

  const rateMap: ExchangeRateMap = {};
  (ratesData as Pick<ExchangeRate, 'from_currency' | 'to_currency' | 'rate'>[]).forEach(rate => {
    // Ensure from_currency and to_currency are valid Currency types before using as keys
    const fromCurrency = rate.from_currency as Currency;
    const toCurrency = rate.to_currency as Currency;
    
    if (!rateMap[fromCurrency]) {
      rateMap[fromCurrency] = {};
    }
    // Type assertion to satisfy TypeScript that rateMap[fromCurrency] is now defined
    (rateMap[fromCurrency] as NonNullable<ExchangeRateMap[Currency]>)[toCurrency] = rate.rate;
  });

  if (DEBUG_CURRENCY) {
    console.log('[CurrencyUtils] Exchange rate map constructed successfully for date', latestRateDate, 'with', Object.keys(rateMap).length, 'base currencies. Content:', rateMap);
  }
  return rateMap;
}

/**
 * Converts an amount from one currency to another using the provided rate map.
 * @param amount The amount to convert. Can be null or undefined.
 * @param fromCurrency The currency of the original amount.
 * @param toCurrency The target currency to convert to.
 * @param rates The map of exchange rates.
 * @returns The converted amount, or the original amount if conversion is not possible/needed. Returns null if input amount is null/undefined.
 */
export function convertAmount(
  amount: number | null | undefined,
  fromCurrency: Currency | null | undefined,
  toCurrency: Currency | null | undefined,
  rates: ExchangeRateMap
): number | null {
  if (amount === null || amount === undefined || !isValidNumber(amount)) {
    return null; // Return null if amount is not a valid number, or is explicitly null/undefined
  }
  if (!fromCurrency || !toCurrency) {
    if (DEBUG_CURRENCY && amount !== 0) console.warn(`[CurrencyUtils] Missing fromCurrency ('${fromCurrency}') or toCurrency ('${toCurrency}') for amount ${amount}. Cannot convert.`);
    return amount; // Return original amount if currencies are not specified
  }
  if (fromCurrency === toCurrency) {
    return amount; // No conversion needed
  }

  const rate = rates[fromCurrency]?.[toCurrency];

  if (isValidNumber(rate) && rate !== 0) { // Ensure rate is a valid number and not zero
    return amount * (rate as number);
  } else {
    if (DEBUG_CURRENCY) {
      // Log only if a conversion was actually expected (i.e., fromCurrency !== toCurrency)
      console.warn(`[CurrencyUtils] Exchange rate not found or invalid for ${fromCurrency} to ${toCurrency}. Amount ${amount} ${fromCurrency} not converted.`);
    }
    // If rate is missing or invalid, return the original amount instead of null to avoid data loss where display is still possible.
    // The consuming component should be aware that the currency might not have been converted.
    return amount;
  }
}