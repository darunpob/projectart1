import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TransactionForm } from '../src/transactions/TransactionForm';
import type { CategoryCatalogue } from '../src/transactions/transactions-api';

const categories: CategoryCatalogue = {
  income: ['Salary', 'Freelance'],
  expense: ['Food & Dining', 'Transport'],
};

function renderForm(onSubmit = vi.fn().mockResolvedValue(undefined)) {
  render(<TransactionForm categories={categories} submitLabel="Add" onSubmit={onSubmit} onCancel={vi.fn()} />);
  return { onSubmit, user: userEvent.setup() };
}

describe('TransactionForm', () => {
  afterEach(cleanup);

  it('submits a draft with the amount converted to cents', async () => {
    const { onSubmit, user } = renderForm();

    await user.type(screen.getByLabelText('Amount (฿)'), '1,250.50');
    await user.selectOptions(screen.getByLabelText('Category'), 'Transport');
    await user.type(screen.getByLabelText('Note'), '  Taxi home  ');
    await user.click(screen.getByRole('button', { name: 'Add' }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'expense', amountCents: 125050, category: 'Transport', note: 'Taxi home' }),
    );
  });

  it('switches the category list when the type changes', async () => {
    const { onSubmit, user } = renderForm();

    await user.click(screen.getByRole('radio', { name: 'Income' }));
    await user.type(screen.getByLabelText('Amount (฿)'), '500');
    await user.click(screen.getByRole('button', { name: 'Add' }));

    expect(screen.getByRole('option', { name: 'Salary' })).toBeTruthy();
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ type: 'income', category: 'Salary' }));
  });

  it('blocks invalid amounts and shows an error', async () => {
    const { onSubmit, user } = renderForm();

    await user.type(screen.getByLabelText('Amount (฿)'), '-3');
    await user.click(screen.getByRole('button', { name: 'Add' }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toMatch(/positive amount/);
  });

  it('surfaces server errors from onSubmit', async () => {
    const { user } = renderForm(vi.fn().mockRejectedValue(new Error('"Gifts" is not a valid expense category')));

    await user.type(screen.getByLabelText('Amount (฿)'), '10');
    await user.click(screen.getByRole('button', { name: 'Add' }));

    expect((await screen.findByRole('alert')).textContent).toContain('not a valid expense category');
  });
});
