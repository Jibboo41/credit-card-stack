import { useState } from 'react';
import { Calendar, ChevronDown, ChevronUp, Gift, Plus } from 'lucide-react';
import { useFinanceStore } from '../store/useFinanceStore';
import { useUiStore } from '../store/useUiStore';
import { useVisibleData } from '../hooks/useVisibleData';
import { computeOfferProgress } from '../lib/cashback';
import { formatCurrency, formatMonth, formatTxAmount } from '../lib/format';
import { CardThumb } from '../components/ui/CardThumb';
import { ProgressBar } from '../components/ui/ProgressBar';
import { CategoryBadge } from '../components/ui/CategoryIcon';
import { EmptyState } from '../components/ui/EmptyState';

export function OffersPage() {
  const viewingMonth = useFinanceStore(s => s.viewingMonth);
  const openDialog = useUiStore(s => s.openDialog);
  const { cards, transactions } = useVisibleData();

  const [expandedOfferId, setExpandedOfferId] = useState<string | null>(null);

  const offerProgressList = cards.flatMap(card =>
    (card.offers || []).map(offer => computeOfferProgress(card, offer, transactions, viewingMonth))
  );

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Bonus & Spend Offers</h1>
          <p>Track progress toward welcome bonuses, retention spend targets, and monthly credits for {formatMonth(viewingMonth)}</p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => openDialog({ type: 'chooseOfferCard' })}
        >
          <Plus size={16} /> Add Offer
        </button>
      </div>

      {offerProgressList.length === 0 ? (
        <EmptyState
          icon={Gift}
          title="No offers active"
          description="Track welcome bonuses, credit card retention spend targets, or monthly statement credits."
          action={
            <button
              type="button"
              className="btn btn-primary"
              style={{ marginTop: '12px' }}
              onClick={() => openDialog({ type: 'chooseOfferCard' })}
            >
              <Plus size={16} /> Add Your First Offer
            </button>
          }
        />
      ) : (
        <div className="grid grid-2">
          {offerProgressList.map(op => {
            const isExpanded = expandedOfferId === op.offer.id;
            const target = op.offer.spendTarget || 0;

            return (
              <div key={op.offer.id} className="panel">
                <div className="row-between" style={{ marginBottom: '14px' }}>
                  <div className="row" style={{ gap: '10px' }}>
                    <CardThumb card={op.card} size="md" />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '15px' }}>
                        {op.offer.title || 'Bonus Offer'}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-3)' }}>
                        {op.card.name} {op.offer.isMonthly && '• Monthly Recurring'}
                      </div>
                    </div>
                  </div>

                  <span className={`badge ${op.isComplete ? 'badge-good' : 'badge-accent'} tabular`} style={{ fontSize: '12px', padding: '4px 8px' }}>
                    {op.isComplete ? 'Completed!' : `${op.percent}%`}
                  </span>
                </div>

                <div className="stack" style={{ gap: '8px' }}>
                  <ProgressBar
                    value={op.percent}
                    tone={op.isComplete ? 'good' : op.percent > 75 ? 'warn' : 'accent'}
                  />

                  <div className="row-between" style={{ fontSize: '13px' }}>
                    <span>
                      <strong>{formatCurrency(op.spend)}</strong> of {formatCurrency(target)}
                    </span>
                    <span className="subtle">
                      {op.isComplete ? 'Goal reached!' : `${formatCurrency(op.remaining)} remaining`}
                    </span>
                  </div>

                  <div className="row wrap" style={{ gap: '12px', marginTop: '6px', fontSize: '12px', color: 'var(--text-3)' }}>
                    {op.offer.rewardAmount ? (
                      <span className="badge badge-info">
                        Reward: {formatCurrency(op.offer.rewardAmount)}
                      </span>
                    ) : null}

                    {op.daysLeft !== undefined && !op.isComplete && (
                      <span className="row" style={{ gap: '4px' }}>
                        <Calendar size={12} />
                        {op.daysLeft > 0 ? `${op.daysLeft} days left` : 'Ending soon'}
                      </span>
                    )}

                    <span className="spacer" style={{ flex: 1 }} />

                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => openDialog({ type: 'cardEditor', cardId: op.card.id })}
                    >
                      Edit Card & Offers
                    </button>
                  </div>
                </div>

                {/* Qualifying Transactions Disclosure */}
                {op.transactions.length > 0 && (
                  <div style={{ marginTop: '14px', borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm btn-block row-between"
                      onClick={() => setExpandedOfferId(isExpanded ? null : op.offer.id)}
                    >
                      <span>{op.transactions.length} Qualifying Purchases</span>
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>

                    {isExpanded && (
                      <div className="list" style={{ marginTop: '8px' }}>
                        {op.transactions.map(tx => (
                          <div key={tx.id} className="list-row" style={{ padding: '6px 4px' }}>
                            <CategoryBadge category={tx.category} size={24} />
                            <div className="list-row-main">
                              <span style={{ fontSize: '13px', fontWeight: 600 }}>{tx.merchantName}</span>
                              <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>{tx.date}</span>
                            </div>
                            <span className="tabular" style={{ fontSize: '13px', fontWeight: 600 }}>
                              {formatTxAmount(tx.amount)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
