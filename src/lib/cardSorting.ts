import type { CreditCard, Transaction } from '../core/models';
import { isTransferLike } from './cashback';
import { getAmountOwed } from './monarch';

/** Sort by balance owed, then the latest purchase across all months. Transactions must be resolved. */
export function sortCardsByBalanceAndRecentUse(cards: CreditCard[], transactions: Transaction[]): CreditCard[] {
  const lastUsed = new Map<string, string>();
  for (const tx of transactions) {
    if (tx.amount >= 0 || isTransferLike(tx)) continue;
    if (tx.date > (lastUsed.get(tx.monarchAccountId) ?? '')) {
      lastUsed.set(tx.monarchAccountId, tx.date);
    }
  }

  return [...cards].sort((a, b) =>
    (getAmountOwed(b) ?? 0) - (getAmountOwed(a) ?? 0)
    || (lastUsed.get(b.monarchId ?? '') ?? '').localeCompare(lastUsed.get(a.monarchId ?? '') ?? '')
    || a.name.localeCompare(b.name)
    || a.id.localeCompare(b.id)
  );
}
