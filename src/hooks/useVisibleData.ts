import type { CreditCard, Transaction } from '../core/models';
import { cardsByMonarchId, getResolvedTransaction } from '../lib/cashback';
import { sortCardsByBalanceAndRecentUse } from '../lib/cardSorting';
import { useFinanceStore } from '../store/useFinanceStore';

export interface VisibleData {
  /** Cards respecting the "show hidden" toggle, sorted by balance owed then most recently used. */
  cards: CreditCard[];
  /** Transactions with manual overrides applied, respecting hidden transactions and hidden cards. */
  transactions: Transaction[];
  /** Lookup of every card (including hidden ones) by Monarch account id. */
  cardByMonarchId: Map<string, CreditCard>;
}

let cache: { cards: CreditCard[]; transactions: Transaction[]; showHidden: boolean; result: VisibleData } | null = null;

function selectVisibleData(allCards: CreditCard[], allTransactions: Transaction[], showHidden: boolean): VisibleData {
  if (cache && cache.cards === allCards && cache.transactions === allTransactions && cache.showHidden === showHidden) {
    return cache.result;
  }
  const hiddenAccounts = new Set(allCards.filter(c => c.hidden && c.monarchId).map(c => c.monarchId));
  const transactions = allTransactions
    .map(getResolvedTransaction)
    .filter(tx => showHidden || (!tx.hidden && !hiddenAccounts.has(tx.monarchAccountId)))
    .sort((a, b) => b.date.localeCompare(a.date));
  const cards = sortCardsByBalanceAndRecentUse(allCards.filter(c => showHidden || !c.hidden), transactions);
  const result = { cards, transactions, cardByMonarchId: cardsByMonarchId(allCards) };
  cache = { cards: allCards, transactions: allTransactions, showHidden, result };
  return result;
}

export function useVisibleData(): VisibleData {
  const creditCards = useFinanceStore(s => s.creditCards);
  const transactions = useFinanceStore(s => s.transactions);
  const showHiddenItems = useFinanceStore(s => s.showHiddenItems);
  return selectVisibleData(creditCards, transactions, showHiddenItems);
}
