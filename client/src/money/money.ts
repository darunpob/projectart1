const CURRENCY = 'THB';
const LOCALE = 'en-US';

const currencyFormat = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: CURRENCY, currencyDisplay: 'narrowSymbol' });
const compactFormat = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: CURRENCY,
  currencyDisplay: 'narrowSymbol',
  notation: 'compact',
  maximumFractionDigits: 1,
});
const percentFormat = new Intl.NumberFormat(LOCALE, { style: 'percent', maximumFractionDigits: 0 });

export const formatMoney = (cents: number): string => currencyFormat.format(cents / 100);

export const formatMoneyCompact = (cents: number): string => compactFormat.format(cents / 100);

export const formatPercent = (ratio: number): string => percentFormat.format(ratio);

const AMOUNT_PATTERN = /^\d+(\.\d{1,2})?$/;

export function parseAmountToCents(input: string): number | null {
  const normalised = input.trim().replace(/,/g, '');
  if (!AMOUNT_PATTERN.test(normalised)) return null;
  const [whole = '0', fraction = ''] = normalised.split('.');
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  return cents > 0 && Number.isSafeInteger(cents) ? cents : null;
}

export const centsToInput = (cents: number): string => (cents / 100).toFixed(2);
