import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BudgetCard } from '../src/budgets/BudgetCard';
import type { Budget } from '../src/budgets/budgets-api';

const overBudget: Budget = {
  category: 'Transport',
  limitCents: 100_000,
  spentCents: 125_000,
  remainingCents: -25_000,
  usedRatio: 1.25,
  status: 'over',
};

function renderCard(budget: Budget | null) {
  const onSave = vi.fn().mockResolvedValue(undefined);
  const onRemove = vi.fn().mockResolvedValue(undefined);
  render(<BudgetCard category="Transport" budget={budget} onSave={onSave} onRemove={onRemove} />);
  return { onSave, onRemove, user: userEvent.setup() };
}

describe('BudgetCard', () => {
  afterEach(cleanup);

  it('shows over-budget state with a text label, not colour alone', () => {
    renderCard(overBudget);

    expect(screen.getByText('Over budget')).toBeTruthy();
    expect(screen.getByText(/฿250\.00 over/)).toBeTruthy();
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('125');
  });

  it('sets a new budget from an empty card', async () => {
    const { onSave, user } = renderCard(null);

    await user.click(screen.getByRole('button', { name: '+ Set budget' }));
    await user.type(screen.getByLabelText('Monthly limit for Transport'), '2,500');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSave).toHaveBeenCalledWith('Transport', 250_000);
  });

  it('prefills the current limit when editing and rejects invalid input', async () => {
    const { onSave, user } = renderCard(overBudget);

    await user.click(screen.getByRole('button', { name: 'Edit limit' }));
    const input = screen.getByLabelText('Monthly limit for Transport') as HTMLInputElement;
    expect(input.value).toBe('1000.00');

    await user.clear(input);
    await user.type(input, 'abc');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toContain('positive amount');
  });
});
