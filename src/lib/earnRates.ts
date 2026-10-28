import { CATEGORIES } from '../core/models';
import type { CreditCard, FinanceCategory } from '../core/models';
import { getCardCashback, isCategoryActive } from './cashback';

export type EarnRateInputs = Record<FinanceCategory, string>;

export function getEarnRateInputs(card: CreditCard, month: string): EarnRateInputs {
  return Object.fromEntries(CATEGORIES.map(category => [
    category,
    isCategoryActive(card, month, category) ? String(getCardCashback(card, month, category)) : '',
  ])) as EarnRateInputs;
}

/** Blank inputs use the base rate; an explicitly entered zero remains a zero-rate override. */
export function buildEarnRatesUpdate(card: CreditCard, month: string, inputs: EarnRateInputs, mode: 'current_and_future' | 'this_month'): Partial<CreditCard> {
  const cashback: CreditCard['cashback'] = {};
  for (const category of CATEGORIES) {
    const input = inputs[category].trim();
    if (!input) continue;
    const value = Number(input);
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      throw new Error(`Enter a rate between 0 and 100 for ${category}, or leave it blank to use the base rate.`);
    }
    cashback[category] = value;
  }

  const historicalCashback = { ...card.historicalCashback };
  if (mode === 'this_month') {
    // A blank must also suppress a default category bonus for this specific month.
    historicalCashback[month] = Object.fromEntries(CATEGORIES.map(category => [category, cashback[category] ?? -1]));
    return { historicalCashback };
  }

  for (const savedMonth of Object.keys(historicalCashback)) {
    if (savedMonth >= month) delete historicalCashback[savedMonth];
  }
  return {
    cashback,
    categories: CATEGORIES.filter(category => cashback[category] !== undefined),
    historicalCashback,
  };
}
