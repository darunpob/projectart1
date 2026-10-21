import { describe, expect, it } from 'vitest';
import { centsToInput, formatMoney, parseAmountToCents } from '../src/money/money';
import { shiftMonth } from '../src/months/month';

describe('parseAmountToCents', () => {
  it.each([
    ['12', 1200],
    ['12.5', 1250],
    ['12.34', 1234],
    ['1,234.56', 123456],
    [' 0.01 ', 1],
  ])('parses %s as %i cents', (input, expected) => {
    expect(parseAmountToCents(input)).toBe(expected);
  });

  it.each(['', '0', '0.00', '-5', '1.234', 'abc', '1e3', '12.'])('rejects %j', (input) => {
    expect(parseAmountToCents(input)).toBeNull();
  });

  it('avoids floating point drift', () => {
    expect(parseAmountToCents('0.29')).toBe(29);
    expect(parseAmountToCents('1.15')).toBe(115);
  });
});

describe('money formatting', () => {
  it('round-trips cents through the input format', () => {
    expect(centsToInput(123456)).toBe('1234.56');
    expect(parseAmountToCents(centsToInput(123456))).toBe(123456);
  });

  it('formats baht with the currency symbol', () => {
    expect(formatMoney(123456)).toBe('฿1,234.56');
  });
});

describe('shiftMonth', () => {
  it('handles year boundaries', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
  });
});
