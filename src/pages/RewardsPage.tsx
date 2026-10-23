import { useId, useState } from 'react';
import type { ReactNode } from 'react';
import { AlertCircle, ChevronDown, Edit2, PiggyBank, Sparkles } from 'lucide-react';
import { CATEGORIES } from '../core/models';
import type { CreditCard, Transaction } from '../core/models';
import { useFinanceStore } from '../store/useFinanceStore';
import { useUiStore } from '../store/useUiStore';
import { useVisibleData } from '../hooks/useVisibleData';
import { computeMonthEarnings, computeMissedRewards, getTransactionCashback, hasCashbackOverride } from '../lib/cashback';
import { formatCurrency, formatDate, formatMonth, formatRate, formatTxAmount } from '../lib/format';
import { Segmented } from '../components/ui/Segmented';
import { CardThumb } from '../components/ui/CardThumb';
import { CategoryBadge } from '../components/ui/CategoryIcon';
import { EmptyState } from '../components/ui/EmptyState';

export function RewardsPage() {
  const viewingMonth = useFinanceStore(s => s.viewingMonth);
  const { cards, transactions } = useVisibleData();

  const [viewMode, setViewMode] = useState<'cards' | 'categories'>('cards');

  const earnings = computeMonthEarnings(cards, transactions, viewingMonth);
  const missedRewards = computeMissedRewards(cards, earnings, viewingMonth);
  const totalMissed = missedRewards.reduce((acc, m) => acc + m.missed, 0);

  const effectiveRate = earnings.totalSpend > 0 ? (earnings.totalCashback / earnings.totalSpend) * 100 : 0;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Cash Back & Rewards</h1>
          <p>Earned returns and rewards analysis for {formatMonth(viewingMonth)}</p>
        </div>
      </div>

      {/* Rewards Metrics */}
      <div className="stats">
        <div className="panel stat">
          <div className="stat-label"><PiggyBank size={14} /> Total Cash Back Earned</div>
          <div className="stat-value text-good">{formatCurrency(earnings.totalCashback)}</div>
          <div className="stat-sub">Across all eligible transactions</div>
        </div>

        <div className="panel stat">
          <div className="stat-label">Total Spend on Cards</div>
          <div className="stat-value">{formatCurrency(earnings.totalSpend)}</div>
          <div className="stat-sub">Purchases earning rewards</div>
        </div>

        <div className="panel stat">
          <div className="stat-label">Effective Return Rate</div>
          <div className="stat-value text-accent">{formatRate(effectiveRate)}</div>
          <div className="stat-sub">Average return across all purchases</div>
        </div>

        <div className="panel stat">
          <div className="stat-label"><Sparkles size={14} /> Optimization Potential</div>
          <div className="stat-value" style={{ color: totalMissed > 1 ? 'var(--orange)' : 'var(--green)' }}>
            {totalMissed > 0.05 ? `+${formatCurrency(totalMissed)}` : 'Optimized!'}
          </div>
          <div className="stat-sub">{totalMissed > 0.05 ? 'Missed reward upside' : 'Great job swiping the best cards'}</div>
        </div>
      </div>

      {/* Missed Rewards Optimization Panel */}
      {missedRewards.length > 0 && (
        <div className="callout warn">
          <AlertCircle size={20} />
          <div className="grow">
            <div className="callout-title">
              You left {formatCurrency(totalMissed)} in cash back on the table this month
            </div>
            <div className="callout-body">
              These purchases were charged to a card with a lower earn rate than your best available card:
            </div>
            <div className="stack" style={{ marginTop: '10px' }}>
              {missedRewards.map(m => (
                <div key={m.category} className="missed-reward">
                  <CategoryBadge category={m.category} size={24} />
                  <div className="missed-reward-category">
                    <strong>{m.category}</strong>
                    <span className="muted">{formatCurrency(m.spend)} spent</span>
                  </div>
                  <strong className="missed-reward-amount">+{formatCurrency(m.missed)}</strong>
                  <div className="missed-reward-best muted">
                    Best: {m.bestCards.map(c => c.name).join(', ')} ({formatRate(m.bestRate)})
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Switch between Card view and Category view */}
      <div className="row-between">
        <Segmented
          options={[
            { value: 'cards', label: `By Card (${earnings.byCard.length})` },
            { value: 'categories', label: 'By Category' },
          ]}
          value={viewMode}
          onChange={setViewMode}
        />
      </div>

      {/* By Card View */}
      {viewMode === 'cards' && (
        <>
          {earnings.byCard.length === 0 ? (
            <EmptyState
              icon={PiggyBank}
              title="No rewards recorded this month"
              description="Sync your transactions or check that your card purchases aren't marked as excluded."
            />
          ) : (
            <div className="grid grid-2">
              {earnings.byCard.map(cardEarn => (
                <div key={cardEarn.card.id} className="panel">
                  <div className="row-between reward-card-header" style={{ marginBottom: '14px' }}>
                    <div className="row grow" style={{ gap: '10px' }}>
                      <CardThumb card={cardEarn.card} size="md" />
                      <div className="grow">
                        <div style={{ fontWeight: 700, fontSize: '15px', overflowWrap: 'anywhere' }}>{cardEarn.card.name}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-3)' }}>
                          {formatCurrency(cardEarn.spend)} spent • {formatRate(cardEarn.spend > 0 ? (cardEarn.cashback / cardEarn.spend) * 100 : 0)} return
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div className="text-good" style={{ fontWeight: 750, fontSize: '18px' }}>
                        {formatCurrency(cardEarn.cashback)}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>Cash Back</div>
                    </div>
                  </div>

                  <div style={{ marginBottom: '12px' }}>
                    <RewardCardActions card={cardEarn.card} />
                  </div>
                  <div className="list">
                    {cardEarn.categories.map(catEarn => (
                      <RewardBreakdown
                        key={`${viewingMonth}-${catEarn.category}`}
                        card={cardEarn.card}
                        label={catEarn.category}
                        icon={<CategoryBadge category={catEarn.category} size={26} />}
                        rate={catEarn.rate}
                        spend={catEarn.spend}
                        cashback={catEarn.cashback}
                        transactions={catEarn.transactions}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* By Category View */}
      {viewMode === 'categories' && (
        <div className="grid grid-2">
          {CATEGORIES.map(cat => {
            const entries = earnings.byCategory[cat] || [];
            const catSpend = entries.reduce((acc, e) => acc + e.spend, 0);
            const catCashback = entries.reduce((acc, e) => acc + e.cashback, 0);

            if (entries.length === 0) return null;

            return (
              <div key={cat} className="panel">
                <div className="row-between" style={{ marginBottom: '12px' }}>
                  <div className="row" style={{ gap: '10px' }}>
                    <CategoryBadge category={cat} size={36} />
                    <div>
                      <div style={{ fontWeight: 750, fontSize: '15px' }}>{cat}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-3)' }}>
                        {formatCurrency(catSpend)} spent
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="text-good" style={{ fontWeight: 750, fontSize: '16px' }}>
                      {formatCurrency(catCashback)}
                    </div>
                  </div>
                </div>

                <div className="list">
                  {entries.map(entry => (
                    <RewardBreakdown
                      key={`${viewingMonth}-${entry.card.id}`}
                      card={entry.card}
                      showCardActions
                      label={entry.card.name}
                      icon={<CardThumb card={entry.card} size="xs" />}
                      rate={entry.rate}
                      spend={entry.spend}
                      cashback={entry.cashback}
                      transactions={entry.transactions}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RewardCardActions({ card }: { card: CreditCard }) {
  const openDialog = useUiStore(s => s.openDialog);
  return (
    <div className="row wrap" style={{ gap: '8px' }}>
      <button
        type="button"
        className="btn btn-sm btn-ghost"
        aria-label={`Edit card ${card.name}`}
        onClick={() => openDialog({ type: 'cardEditor', cardId: card.id })}
      >
        <Edit2 size={14} /> Edit Card
      </button>
      <button
        type="button"
        className="btn btn-sm btn-ghost"
        aria-label={`Edit earn rates for ${card.name}`}
        onClick={() => openDialog({ type: 'earnRates', cardId: card.id })}
      >
        Edit Earn Rates
      </button>
    </div>
  );
}

function RewardBreakdown({ card, label, icon, rate, spend, cashback, transactions, showCardActions = false }: {
  card: CreditCard;
  label: string;
  icon: ReactNode;
  rate: number;
  spend: number;
  cashback: number;
  transactions: Transaction[];
  showCardActions?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const id = useId();
  const openDialog = useUiStore(s => s.openDialog);
  const hasOverrides = transactions.some(hasCashbackOverride);

  return (
    <div className="reward-breakdown">
      <button
        type="button"
        className="list-row disclosure reward-breakdown-toggle"
        aria-expanded={expanded}
        aria-controls={id}
        onClick={() => setExpanded(!expanded)}
      >
        <span className="row" style={{ gap: '8px' }}>
          {icon}
          <span className="reward-breakdown-label">
            <span>{label}</span>
            <span className="rate-pill" title={hasOverrides ? 'Includes transaction cash back overrides' : undefined}>
              {hasOverrides ? 'Custom' : formatRate(rate)}
            </span>
          </span>
        </span>
        <span className="list-row-end">
          <span className="tabular text-good">{formatCurrency(cashback)}</span>
          <span className="muted" style={{ fontSize: '11px' }}>{formatCurrency(spend)} spent</span>
        </span>
        <ChevronDown size={16} className="disclosure-chevron" />
      </button>
      <div id={id} hidden={!expanded} className="reward-transactions">
        {showCardActions && <RewardCardActions card={card} />}
        <div className="muted" style={{ fontSize: '12px', padding: '4px' }}>
          {transactions.length} {transactions.length === 1 ? 'transaction' : 'transactions'}
        </div>
        {expanded && transactions.map(tx => (
          <button
            key={tx.id}
            type="button"
            className="list-row"
            onClick={() => openDialog({ type: 'transaction', txId: tx.id })}
          >
            <span className="list-row-main">
              <span className="reward-merchant">{tx.merchantName}</span>
              <span className="muted" style={{ fontSize: '12px' }}>{formatDate(tx.date)}</span>
            </span>
            <span className="list-row-end">
              <span className={`amount${tx.amount > 0 ? ' credit' : ''}`}>{formatTxAmount(tx.amount)}</span>
              <span className="muted" style={{ fontSize: '12px' }}>
                {formatCurrency(getTransactionCashback(tx, card))} cash back{hasCashbackOverride(tx) ? ' • Custom' : ''}
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
