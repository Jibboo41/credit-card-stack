import { useState } from 'react';
import { AlertCircle, PiggyBank, Sparkles } from 'lucide-react';
import { CATEGORIES } from '../core/models';
import { useFinanceStore } from '../store/useFinanceStore';
import { useVisibleData } from '../hooks/useVisibleData';
import { computeMonthEarnings, computeMissedRewards } from '../lib/cashback';
import { formatCurrency, formatMonth, formatRate } from '../lib/format';
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
                <div key={m.category} className="row-between" style={{ fontSize: '13px', background: 'rgba(0,0,0,0.2)', padding: '6px 10px', borderRadius: '8px' }}>
                  <div className="row" style={{ gap: '8px' }}>
                    <CategoryBadge category={m.category} size={24} />
                    <span style={{ fontWeight: 600 }}>{m.category}</span>
                    <span className="subtle">({formatCurrency(m.spend)} spent)</span>
                  </div>
                  <div className="row" style={{ gap: '10px' }}>
                    <span className="subtle">Best: {m.bestCards.map(c => c.name).join(', ')} ({formatRate(m.bestRate)})</span>
                    <strong style={{ color: 'var(--orange)' }}>+{formatCurrency(m.missed)}</strong>
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
                  <div className="row-between" style={{ marginBottom: '14px' }}>
                    <div className="row" style={{ gap: '10px' }}>
                      <CardThumb card={cardEarn.card} size="md" />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '15px' }}>{cardEarn.card.name}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-3)' }}>
                          {formatCurrency(cardEarn.spend)} spent • {formatRate(cardEarn.spend > 0 ? (cardEarn.cashback / cardEarn.spend) * 100 : 0)} return
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="text-good" style={{ fontWeight: 750, fontSize: '18px' }}>
                        {formatCurrency(cardEarn.cashback)}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>Cash Back</div>
                    </div>
                  </div>

                  <div className="list">
                    {cardEarn.categories.map(catEarn => (
                      <div key={catEarn.category} className="list-row" style={{ padding: '6px 4px' }}>
                        <div className="row" style={{ gap: '8px' }}>
                          <CategoryBadge category={catEarn.category} size={26} />
                          <span style={{ fontSize: '13px', fontWeight: 600 }}>{catEarn.category}</span>
                          <span className="rate-pill sm" style={{ height: '20px', fontSize: '11px' }}>
                            {formatRate(catEarn.rate)}
                          </span>
                        </div>
                        <span className="spacer" style={{ flex: 1 }} />
                        <div style={{ textAlign: 'right', fontSize: '13px' }}>
                          <span className="tabular">{formatCurrency(catEarn.cashback)}</span>
                          <span className="subtle" style={{ marginLeft: '6px' }}>({formatCurrency(catEarn.spend)})</span>
                        </div>
                      </div>
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
                    <div key={entry.card.id} className="list-row" style={{ padding: '6px 4px' }}>
                      <div className="row" style={{ gap: '8px' }}>
                        <CardThumb card={entry.card} size="xs" />
                        <span style={{ fontSize: '13px' }}>{entry.card.name}</span>
                        <span className="rate-pill sm" style={{ height: '20px', fontSize: '11px' }}>
                          {formatRate(entry.rate)}
                        </span>
                      </div>
                      <span className="spacer" style={{ flex: 1 }} />
                      <div style={{ textAlign: 'right', fontSize: '13px' }}>
                        <span className="tabular text-good">{formatCurrency(entry.cashback)}</span>
                        <span className="subtle" style={{ marginLeft: '6px' }}>({formatCurrency(entry.spend)})</span>
                      </div>
                    </div>
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
