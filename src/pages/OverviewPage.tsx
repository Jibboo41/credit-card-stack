import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, CreditCard, Gift, PiggyBank, Receipt, Sparkles, Trophy } from 'lucide-react';
import { useFinanceStore } from '../store/useFinanceStore';
import { useVisibleData } from '../hooks/useVisibleData';
import { getAmountOwed, getCreditLimit, getOwedHistory, utilizationTone } from '../lib/monarch';
import { computeMonthEarnings, computeOfferProgress, bestRateForCategory } from '../lib/cashback';
import { formatCurrency, formatMonth, formatRate, formatTxAmount } from '../lib/format';
import { ProgressBar } from '../components/ui/ProgressBar';
import { CardThumb } from '../components/ui/CardThumb';
import { CategoryBadge } from '../components/ui/CategoryIcon';
import { Sparkline } from '../components/ui/Sparkline';
import { EmptyState } from '../components/ui/EmptyState';

const HIGHLIGHT_CATEGORIES = ['Restaurants', 'Groceries', 'Gas', 'Travel', 'Online Shopping', 'Utilities'] as const;

export function OverviewPage() {
  const viewingMonth = useFinanceStore(s => s.viewingMonth);
  const monarch = useFinanceStore(s => s.monarch);
  const { cards, transactions } = useVisibleData();

  // Metrics
  let totalOwed = 0;
  let totalLimit = 0;
  for (const card of cards) {
    const owed = getAmountOwed(card);
    if (owed !== undefined) totalOwed += owed;
    const limit = getCreditLimit(card);
    if (limit !== undefined) totalLimit += limit;
  }
  const utilization = totalLimit > 0 ? totalOwed / totalLimit : 0;
  const utilTone = utilizationTone(utilization);

  const earnings = computeMonthEarnings(cards, transactions, viewingMonth);

  // Credit Score
  const creditScores = monarch?.creditScores || [];
  const latestCreditScore = creditScores.length > 0 ? creditScores[creditScores.length - 1] : null;

  // Monarch connection issues
  const troubledCards = cards.filter(c => c.connectionStatus === 'update_required' || c.connectionStatus === 'disconnected');

  // Active offers progress
  const activeOffers = cards.flatMap(card =>
    (card.offers || []).map(offer => computeOfferProgress(card, offer, transactions, viewingMonth))
  ).filter(op => !op.isComplete && op.spend > 0).slice(0, 3);

  // Recent transactions
  const recentTransactions = transactions.slice(0, 6);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Month Overview</h1>
          <p>Financial snapshot and reward optimizations for {formatMonth(viewingMonth)}</p>
        </div>
      </div>

      {/* Troubled connections alert */}
      {troubledCards.length > 0 && (
        <div className="callout warn">
          <AlertTriangle size={20} />
          <div className="grow">
            <div className="callout-title">Account connection needs attention</div>
            <div className="callout-body">
              {troubledCards.map(c => c.name).join(', ')} reported connection problems in Monarch. Please re-authenticate your bank in Monarch Money to resume syncing.
            </div>
          </div>
        </div>
      )}

      {/* Main Stats Grid */}
      <div className="stats">
        <div className="panel stat">
          <div className="stat-label"><CreditCard size={14} /> Total Balance Owed</div>
          <div className="stat-value">{formatCurrency(totalOwed)}</div>
          <div className="stat-sub">Across {cards.length} cards</div>
        </div>

        <div className="panel stat">
          <div className="stat-label">Total Credit Limit</div>
          <div className="stat-value">{formatCurrency(totalLimit, { compact: true })}</div>
          <div className="stat-sub">Available: {formatCurrency(Math.max(0, totalLimit - totalOwed), { compact: true })}</div>
        </div>

        <div className="panel stat">
          <div className="stat-label">Credit Utilization</div>
          <div className="stat-value" style={{ color: `var(--${utilTone})` }}>
            {(utilization * 100).toFixed(1)}%
          </div>
          <ProgressBar value={utilization * 100} tone={utilTone} size="sm" />
        </div>

        <div className="panel stat">
          <div className="stat-label"><PiggyBank size={14} /> Rewards Earned</div>
          <div className="stat-value text-good">
            {formatCurrency(earnings.totalCashback)}
          </div>
          <div className="stat-sub">On {formatCurrency(earnings.totalSpend)} spent</div>
        </div>
      </div>

      {/* Credit Score & Balance Trend Row */}
      {latestCreditScore && (
        <div className="grid grid-2">
          <div className="panel row-between">
            <div>
              <div className="stat-label"><Sparkles size={14} /> Monarch Credit Score</div>
              <div className="score-ring text-good">{latestCreditScore.score}</div>
              <div className="stat-sub">Recorded {latestCreditScore.date}</div>
            </div>
            {creditScores.length > 1 && (
              <div style={{ width: '120px' }}>
                <Sparkline values={creditScores.map(s => s.score)} color="var(--green)" />
              </div>
            )}
          </div>

          <div className="panel">
            <div className="panel-header" style={{ marginBottom: '8px' }}>
              <div className="panel-title"><CreditCard size={16} /> Balance Trends</div>
              <Link to="/cards" className="panel-link">View cards <ArrowRight size={14} /></Link>
            </div>
            <div className="row wrap" style={{ gap: '8px' }}>
              {cards.filter(c => getOwedHistory(c).length > 1).slice(0, 4).map(card => (
                <div key={card.id} className="row" style={{ gap: '8px', minWidth: '130px' }}>
                  <CardThumb card={card} size="xs" />
                  <div style={{ width: '60px' }}>
                    <Sparkline values={getOwedHistory(card)} height={24} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 2-Column Section: Top Category Cards + Active Offers */}
      <div className="grid grid-2">
        {/* Top Everyday Recommendations */}
        <div className="panel">
          <div className="panel-header">
            <div>
              <div className="panel-title"><Trophy size={16} /> Top Card Recommendations</div>
              <div className="panel-subtitle">Best card to swipe this month for everyday purchases</div>
            </div>
            <Link to="/best-card" className="panel-link">See all <ArrowRight size={14} /></Link>
          </div>

          {cards.length === 0 ? (
            <EmptyState icon={CreditCard} title="No cards added" description="Add cards to get category recommendations." />
          ) : (
            <div className="list">
              {HIGHLIGHT_CATEGORIES.map(cat => {
                const best = bestRateForCategory(cards, viewingMonth, cat);
                const winner = best.cards[0];
                return (
                  <div key={cat} className="list-row">
                    <CategoryBadge category={cat} size={32} />
                    <div className="list-row-main">
                      <div className="list-row-title">{cat}</div>
                      <div className="list-row-sub">
                        {winner ? (
                          <>
                            <CardThumb card={winner} size="xs" />
                            <span>{winner.name}</span>
                          </>
                        ) : (
                          'No active cards'
                        )}
                      </div>
                    </div>
                    {best.rate > 0 && (
                      <span className="rate-pill">{formatRate(best.rate)}</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Bonus Offers & Welcome Progress */}
        <div className="panel">
          <div className="panel-header">
            <div>
              <div className="panel-title"><Gift size={16} /> Active Spend Offers</div>
              <div className="panel-subtitle">Progress toward bonus targets</div>
            </div>
            <Link to="/offers" className="panel-link">Manage offers <ArrowRight size={14} /></Link>
          </div>

          {activeOffers.length === 0 ? (
            <EmptyState
              icon={Gift}
              title="No active bonus offers"
              description="Track credit card sign-up bonuses, retention targets, and monthly credits."
            />
          ) : (
            <div className="stack">
              {activeOffers.map(op => (
                <div key={op.offer.id} className="panel" style={{ background: 'var(--surface-2)', padding: '14px' }}>
                  <div className="row-between" style={{ marginBottom: '8px' }}>
                    <div className="row" style={{ gap: '8px' }}>
                      <CardThumb card={op.card} size="xs" />
                      <span style={{ fontWeight: 600, fontSize: '13px' }}>{op.offer.title}</span>
                    </div>
                    <span className="badge badge-accent tabular">{op.percent}%</span>
                  </div>
                  <ProgressBar value={op.percent} size="sm" tone={op.percent >= 80 ? 'good' : 'accent'} />
                  <div className="row-between" style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-3)' }}>
                    <span>{formatCurrency(op.spend)} of {formatCurrency(op.offer.spendTarget || 0)}</span>
                    <span>{formatCurrency(op.remaining)} remaining</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Purchases Section */}
      <div className="panel">
        <div className="panel-header">
          <div>
            <div className="panel-title"><Receipt size={16} /> Recent Transactions</div>
            <div className="panel-subtitle">Latest purchases and earned cash back</div>
          </div>
          <Link to="/transactions" className="panel-link">All transactions <ArrowRight size={14} /></Link>
        </div>

        {recentTransactions.length === 0 ? (
          <EmptyState icon={Receipt} title="No transactions found" description="Sync with Monarch or check your transaction filters." />
        ) : (
          <div className="list">
            {recentTransactions.map(tx => (
              <div key={tx.id} className="list-row">
                <CategoryBadge category={tx.category} size={32} />
                <div className="list-row-main">
                  <div className="list-row-title">{tx.merchantName}</div>
                  <div className="list-row-sub">
                    <span>{tx.date}</span>
                    <span className="dot-sep">{tx.category}</span>
                  </div>
                </div>
                <div className="list-row-end">
                  <div className="amount tabular">{formatTxAmount(tx.amount)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
