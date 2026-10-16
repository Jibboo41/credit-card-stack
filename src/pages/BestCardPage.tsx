import { useState } from 'react';
import { CreditCard, Edit3, Save, Trophy } from 'lucide-react';
import { CATEGORIES } from '../core/models';
import { useFinanceStore } from '../store/useFinanceStore';
import { useVisibleData } from '../hooks/useVisibleData';
import { rankCardsForCategory } from '../lib/cashback';
import { formatMonth, formatRate } from '../lib/format';
import { CategoryBadge } from '../components/ui/CategoryIcon';
import { CardThumb } from '../components/ui/CardThumb';
import { EmptyState } from '../components/ui/EmptyState';

export function BestCardPage() {
  const viewingMonth = useFinanceStore(s => s.viewingMonth);
  const globalStrategyNotes = useFinanceStore(s => s.globalStrategyNotes);
  const setGlobalStrategyNotes = useFinanceStore(s => s.setGlobalStrategyNotes);
  const pushToast = useFinanceStore(s => s.pushToast);

  const { cards } = useVisibleData();

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [strategyNotes, setStrategyNotes] = useState(globalStrategyNotes);

  const handleSaveNotes = async () => {
    try {
      await setGlobalStrategyNotes(strategyNotes);
      setIsEditingNotes(false);
      pushToast({ tone: 'success', message: 'Strategy notes saved' });
    } catch {
      pushToast({ tone: 'error', message: 'Failed to save notes' });
    }
  };

  const categoriesToShow = selectedCategory === 'all'
    ? CATEGORIES
    : CATEGORIES.filter(c => c === selectedCategory);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Best Card Recommendation</h1>
          <p>Highest earning card to swipe for each purchase category in {formatMonth(viewingMonth)}</p>
        </div>
      </div>

      {/* Category Filter Chips */}
      <div className="toolbar" style={{ overflowX: 'auto', paddingBottom: '4px' }}>
        <button
          type="button"
          className="chip"
          aria-pressed={selectedCategory === 'all'}
          onClick={() => setSelectedCategory('all')}
        >
          All Categories ({CATEGORIES.length})
        </button>
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            type="button"
            className="chip"
            aria-pressed={selectedCategory === cat}
            onClick={() => setSelectedCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Strategy Notes Panel */}
      <div className="panel" style={{ background: 'var(--surface-2)' }}>
        <div className="panel-header" style={{ marginBottom: '8px' }}>
          <div className="panel-title"><Edit3 size={16} /> Wallet Strategy Notes</div>
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={() => {
              if (isEditingNotes) handleSaveNotes();
              else setIsEditingNotes(true);
            }}
          >
            {isEditingNotes ? <><Save size={14} /> Save</> : <><Edit3 size={14} /> Edit</>}
          </button>
        </div>

        {isEditingNotes ? (
          <div className="stack">
            <textarea
              className="textarea"
              value={strategyNotes}
              onChange={e => setStrategyNotes(e.target.value)}
              placeholder="Jot down notes, quarterly goals, rotating category plans..."
              rows={3}
            />
          </div>
        ) : (
          <div style={{ fontSize: '13px', color: strategyNotes ? 'var(--text-2)' : 'var(--text-3)', fontStyle: strategyNotes ? 'normal' : 'italic' }}>
            {strategyNotes || 'No strategy notes set. Click Edit to add notes or reminders about quarterly card rotations.'}
          </div>
        )}
      </div>

      {/* Categories Grid */}
      {cards.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="No cards in wallet"
          description="Add your cards to see recommendations for everyday categories."
        />
      ) : (
        <div className="grid grid-2">
          {categoriesToShow.map(cat => {
            const ranked = rankCardsForCategory(cards, viewingMonth, cat);
            const winner = ranked.find(r => r.isBest);

            return (
              <div key={cat} className="panel">
                <div className="row-between" style={{ marginBottom: '12px' }}>
                  <div className="row" style={{ gap: '10px' }}>
                    <CategoryBadge category={cat} size={36} />
                    <div>
                      <div style={{ fontWeight: 750, fontSize: '15px' }}>{cat}</div>
                      {winner && (
                        <div style={{ fontSize: '12px', color: 'var(--green)', fontWeight: 600 }}>
                          Best: {winner.card.name} ({formatRate(winner.rate)})
                        </div>
                      )}
                    </div>
                  </div>
                  {winner && (
                    <span className="rate-pill lg">{formatRate(winner.rate)}</span>
                  )}
                </div>

                {ranked.length === 0 ? (
                  <div className="subtle" style={{ fontSize: '12px', padding: '10px 0' }}>
                    No cards earn cash back for this category.
                  </div>
                ) : (
                  <div className="list">
                    {ranked.map(r => (
                      <div
                        key={r.card.id}
                        className="list-row"
                        style={{
                          background: r.isBest ? 'color-mix(in srgb, var(--green) 8%, transparent)' : undefined,
                          borderRadius: '8px',
                          padding: '8px 10px',
                          margin: '2px -4px',
                        }}
                      >
                        <CardThumb card={r.card} size="sm" />
                        <div className="list-row-main">
                          <div className="list-row-title">
                            <span>{r.card.name}</span>
                            {r.isBest && (
                              <span className="badge badge-good"><Trophy size={10} /> Best</span>
                            )}
                          </div>
                          <div className="list-row-sub">
                            <span>{r.card.bankName || r.card.institutionName || 'Credit Card'}</span>
                            {r.isBase && <span className="subtle">• Base rate</span>}
                          </div>
                        </div>
                        <span className={`rate-pill ${r.isBest ? '' : 'base'}`}>
                          {formatRate(r.rate)}
                        </span>
                      </div>
                    ))}
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
