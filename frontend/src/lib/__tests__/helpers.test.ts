import { afterEach, describe, expect, it, vi } from 'vitest';
import { formatCurrency } from '../currency';
import { getErrorMessage } from '../errors';
import { exportToCsv } from '../exportCsv';

describe('formatCurrency', () => {
  it('formats numbers and numeric strings as rupees with two decimals', () => {
    expect(formatCurrency(1080)).toBe('₹1080.00');
    expect(formatCurrency('49.5')).toBe('₹49.50');
  });

  it('falls back to zero for non-numeric input', () => {
    expect(formatCurrency('abc')).toBe('₹0.00');
  });
});

describe('getErrorMessage', () => {
  it('prefers the message of an Error', () => {
    expect(getErrorMessage(new Error('Insufficient stock'), 'fallback')).toBe('Insufficient stock');
  });

  it('reads a message from plain objects', () => {
    expect(getErrorMessage({ message: 'Coupon expired' }, 'fallback')).toBe('Coupon expired');
  });

  it('uses the fallback for anything else', () => {
    expect(getErrorMessage(new Error(''), 'fallback')).toBe('fallback');
    expect(getErrorMessage({ message: 42 }, 'fallback')).toBe('fallback');
    expect(getErrorMessage(null, 'fallback')).toBe('fallback');
  });
});

describe('exportToCsv', () => {
  afterEach(() => vi.restoreAllMocks());

  it('quotes every cell, escapes quotes and downloads a named .csv file', async () => {
    let blob: Blob | undefined;
    URL.createObjectURL = vi.fn((b: Blob) => {
      blob = b;
      return 'blob:csv';
    });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    exportToCsv('orders', ['Name', 'Note'], [['Tee "Classic"', null], [42, true]]);

    expect(click).toHaveBeenCalledOnce();
    const link = click.mock.contexts[0] as HTMLAnchorElement;
    expect(link.getAttribute('download')).toBe('orders.csv');
    expect(link.isConnected).toBe(false); // removed from the DOM after the click
    expect(await blob!.text()).toBe('"Name","Note"\n"Tee ""Classic""",""\n"42","true"');
  });
});
