import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Ban, Filter, Receipt, Search } from 'lucide-react';
import { CATEGORIES } from '../core/models';
import { useFinanceStore } from '../store/useFinanceStore';
import { useUiStore } from '../store/useUiStore';
import { useVisibleData } from '../hooks/useVisibleData';
import { earnsRewards, getCardCashback, getTransactionCashback, hasCashbackOverride } from '../lib/cashback';
import { formatCurrency, formatMonth, formatRate, formatTxAmount } from '../lib/format';
import { CategoryBadge } from '../components/ui/CategoryIcon';
import { CardThumb } from '../components/ui/CardThumb';
import { EmptyState } from '../components/ui/EmptyState';

export function TransactionsPage() {
  const viewingMonth = useFinanceStore(s => s.viewingMonth);
  const openDialog = useUiStore(s => s.openDialog);
  const { cards, transactions, cardByMonarchId } = useVisibleData();

  const [search, setSearch] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const filterCardId = searchParams.get('card') || 'all';
  const setFilterCardId = (cardId: string) => {
    setSearchParams(previous => {
      const next = new URLSearchParams(previous);
      if (cardId === 'all') next.delete('card');
      else next.set('card', cardId);
      return next;
    });
  };
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterReward, setFilterReward] = useState<'all' | 'earning' | 'excluded'>('all');
  const [allMonths, setAllMonths] = useState(false);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      if (!allMonths && !tx.date.startsWith(viewingMonth)) return false;

      if (search.trim()) {
        const query = search.toLowerCase();
        const merchantMatch = tx.merchantName?.toLowerCase().includes(query);
        const catMatch = tx.category?.toLowerCase().includes(query);
        if (!merchantMatch && !catMatch) return false;
      }

      if (filterCardId !== 'all') {
        const card = cardByMonarchId.get(tx.monarchAccountId);
        if (card?.id !== filterCardId) return false;
      }

      if (filterCategory !== 'all' && tx.category !== filterCategory) {
        return false;
      }

      if (filterReward === 'earning' && !earnsRewards(tx)) return false;
      if (filterReward === 'excluded' && earnsRewards(tx)) return false;

      return true;
    });
  }, [transactions, allMonths, viewingMonth, search, filterCardId, filterCategory, filterReward, cardByMonarchId]);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Transactions</h1>
          <p>
            {allMonths ? 'All recorded purchases' : `Purchases and earned cash back for ${formatMonth(viewingMonth)}`}
            {' • '}{filteredTransactions.length} transactions
          </p>
        </div>
      </div>

      {/* Search and Filters Toolbar */}
      <div className="panel" style={{ padding: '14px' }}>
        <div className="stack">
          <div className="row wrap" style={{ gap: '10px' }}>
            <div className="input-group grow" style={{ minWidth: '220px' }}>
              <Search size={16} />
              <input
                type="text"
                className="input input-sm"
                placeholder="Search merchants or categories..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            <div className="transaction-filters">
              <select
                className="select input-sm"
                aria-label="Filter by card"
                value={filterCardId}
                onChange={e => setFilterCardId(e.target.value)}
              >
                <option value="all">All Cards</option>
                {cards.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <select
                className="select input-sm"
                aria-label="Filter by category"
                value={filterCategory}
                onChange={e => setFilterCategory(e.target.value)}
              >
                <option value="all">All Categories</option>
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>

              <select
                className="select input-sm"
                aria-label="Filter by rewards status"
                value={filterReward}
                onChange={e => setFilterReward(e.target.value as any)}
              >
                <option value="all">All Rewards Status</option>
                <option value="earning">Earning Rewards Only</option>
                <option value="excluded">Excluded / Transfers</option>
              </select>

              <button
                type="button"
                className={`btn btn-sm ${allMonths ? 'btn-primary' : ''}`}
                aria-pressed={allMonths}
                onClick={() => setAllMonths(!allMonths)}
              >
                {allMonths ? 'Showing all time' : `This month only`}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction List */}
      {filteredTransactions.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No transactions match your filters"
          description="Try broadening your search term or switching to show all months."
          action={
            (search || filterCardId !== 'all' || filterCategory !== 'all' || filterReward !== 'all') ? (
              <button
                type="button"
                className="btn btn-sm"
                style={{ marginTop: '10px' }}
                onClick={() => {
                  setSearch('');
                  setFilterCardId('all');
                  setFilterCategory('all');
                  setFilterReward('all');
                }}
              >
                <Filter size={14} /> Clear filters
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="panel panel-flush">
          <div className="list">
            {filteredTransactions.map(tx => {
              const card = cardByMonarchId.get(tx.monarchAccountId);
              const txYm = tx.date.substring(0, 7);
              const isEligible = earnsRewards(tx);
              const rate = tx.manualCashbackRate ?? (card ? getCardCashback(card, txYm, tx.category) : 0);
              const earnedCashback = getTransactionCashback(tx, card);
              const isCustom = hasCashbackOverride(tx);

              return (
                <button
                  key={tx.id}
                  type="button"
                  className="list-row"
                  style={{ padding: '12px 16px' }}
                  onClick={() => openDialog({ type: 'transaction', txId: tx.id })}
                >
                  <CategoryBadge category={tx.category} size={36} />

                  <div className="list-row-main">
                    <div className="list-row-title">
                      <span>{tx.merchantName}</span>
                      {tx.excludeFromCashback && (
                        <span className="badge badge-warn" title="Excluded from cash back"><Ban size={10} /> Excluded</span>
                      )}
                    </div>
                    <div className="list-row-sub">
                      {card && (
                        <>
                          <CardThumb card={card} size="xs" />
                          <span>{card.name}</span>
                          <span>•</span>
                        </>
                      )}
                      <span>{tx.date}</span>
                      <span>•</span>
                      <span>{tx.category}</span>
                    </div>
                  </div>

                  <div className="list-row-end">
                    <div className="amount tabular">{formatTxAmount(tx.amount)}</div>
                    {isEligible && (earnedCashback !== 0 || isCustom) ? (
                      <div className={earnedCashback < 0 ? 'text-warn' : 'text-good'} style={{ fontSize: '12px', fontWeight: 600 }}>
                        {earnedCashback > 0 ? '+' : ''}{formatCurrency(earnedCashback)} ({isCustom ? 'Custom' : formatRate(rate)})
                      </div>
                    ) : (
                      <div className="subtle" style={{ fontSize: '11px' }}>
                        {tx.excludeFromCashback ? 'Excluded' : 'No rewards'}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
