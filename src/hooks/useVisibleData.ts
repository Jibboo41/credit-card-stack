import type { CreditCard, Transaction } from '../core/models';
import { cardsByMonarchId, getResolvedTransaction } from '../lib/cashback';
import { useFinanceStore } from '../store/useFinanceStore';

export interface VisibleData {
  /** Cards respecting the "show hidden" toggle, sorted by bank then name. */
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
  const cards = allCards
    .filter(c => showHidden || !c.hidden)
    .sort((a, b) => (a.bankName || a.institutionName || '~').localeCompare(b.bankName || b.institutionName || '~') || a.name.localeCompare(b.name));
  const hiddenAccounts = new Set(allCards.filter(c => c.hidden && c.monarchId).map(c => c.monarchId));
  const transactions = allTransactions
    .map(getResolvedTransaction)
    .filter(tx => showHidden || (!tx.hidden && !hiddenAccounts.has(tx.monarchAccountId)))
    .sort((a, b) => b.date.localeCompare(a.date));
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
