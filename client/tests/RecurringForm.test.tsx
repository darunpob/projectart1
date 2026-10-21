import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ordinalDay, RecurringForm } from '../src/recurring/RecurringForm';

const categories = { income: ['Salary'], expense: ['Housing', 'Entertainment'] };

describe('ordinalDay', () => {
  it.each([
    [1, '1st'],
    [2, '2nd'],
    [3, '3rd'],
    [4, '4th'],
    [11, '11th'],
    [12, '12th'],
    [13, '13th'],
    [21, '21st'],
    [22, '22nd'],
    [31, '31st'],
  ])('formats %i as %s', (day, label) => {
    expect(ordinalDay(day)).toBe(label);
  });
});

describe('RecurringForm', () => {
  afterEach(cleanup);

  it('submits a monthly rule with day and start month', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<RecurringForm categories={categories} onSubmit={onSubmit} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText('Amount (฿)'), '419');
    await user.selectOptions(screen.getByLabelText('Category'), 'Entertainment');
    await user.selectOptions(screen.getByLabelText('Repeats on'), '28');
    await user.type(screen.getByLabelText('Note'), 'Netflix');
    await user.click(screen.getByRole('button', { name: 'Create rule' }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'expense', amountCents: 41_900, category: 'Entertainment', dayOfMonth: 28, note: 'Netflix' }),
    );
  });

  it('explains month-end clamping for days after the 28th', async () => {
    const user = userEvent.setup();
    render(<RecurringForm categories={categories} onSubmit={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.queryByText(/last day of the month/)).toBeNull();
    await user.selectOptions(screen.getByLabelText('Repeats on'), '31');
    expect(screen.getByText(/last day of the month/)).toBeTruthy();
  });
});
