import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CreditCard as CardIcon, Edit2, Globe, Percent, Plus, Receipt, Search, ShieldCheck } from 'lucide-react';
import { useFinanceStore } from '../store/useFinanceStore';
import { useUiStore } from '../store/useUiStore';
import { useVisibleData } from '../hooks/useVisibleData';
import { getAmountOwed, getCreditLimit, getUtilization, normalizeApr, utilizationTone } from '../lib/monarch';
import { getActiveCategoriesForMonth, getCardCashback } from '../lib/cashback';
import { formatCurrency, formatMonth, formatRate, nextDueDate } from '../lib/format';
import { CardThumb } from '../components/ui/CardThumb';
import { ProgressBar } from '../components/ui/ProgressBar';
import { CategoryIcon } from '../components/ui/CategoryIcon';
import { EmptyState } from '../components/ui/EmptyState';

export function CardsPage() {
  const viewingMonth = useFinanceStore(s => s.viewingMonth);
  const openDialog = useUiStore(s => s.openDialog);
  const { cards } = useVisibleData();

  const [search, setSearch] = useState('');
  const [filterNoFtf, setFilterNoFtf] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'airline' | 'hotel'>('all');

  const filteredCards = useMemo(() => {
    return cards.filter(card => {
      if (search.trim()) {
        const query = search.toLowerCase();
        const nameMatch = card.name.toLowerCase().includes(query);
        const bankMatch = (card.bankName || card.institutionName || '').toLowerCase().includes(query);
        if (!nameMatch && !bankMatch) return false;
      }

      if (filterNoFtf && !card.noForeignTxFee) return false;
      if (filterType === 'airline' && !card.isAirlineCard) return false;
      if (filterType === 'hotel' && !card.isHotelCard) return false;

      return true;
    });
  }, [cards, search, filterNoFtf, filterType]);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Credit Cards Portfolio</h1>
          <p>Manage your credit cards, limits, earn rates, and rewards rules</p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => openDialog({ type: 'cardEditor' })}
        >
          <Plus size={16} /> Add Card
        </button>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="panel" style={{ padding: '14px' }}>
        <div className="row wrap" style={{ gap: '10px' }}>
          <div className="input-group grow" style={{ minWidth: '220px' }}>
            <Search size={16} />
            <input
              type="text"
              className="input input-sm"
              placeholder="Search by card name or bank..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="row" style={{ gap: '8px' }}>
            <button
              type="button"
              className={`chip ${filterNoFtf ? 'active' : ''}`}
              aria-pressed={filterNoFtf}
              onClick={() => setFilterNoFtf(!filterNoFtf)}
            >
              <Globe size={14} /> No Foreign Tx Fee
            </button>

            <select
              className="select input-sm"
              value={filterType}
              onChange={e => setFilterType(e.target.value as any)}
            >
              <option value="all">All Card Types</option>
              <option value="airline">Airline Cards</option>
              <option value="hotel">Hotel Cards</option>
            </select>
          </div>
        </div>
      </div>

      {/* Cards Grid */}
      {filteredCards.length === 0 ? (
        <EmptyState
          icon={CardIcon}
          title="No credit cards match"
          description="Try clearing your filters or click Add Card to add a new card to your wallet."
          action={
            <button
              type="button"
              className="btn btn-primary"
              style={{ marginTop: '10px' }}
              onClick={() => openDialog({ type: 'cardEditor' })}
            >
              <Plus size={14} /> Add Card
            </button>
          }
        />
      ) : (
        <div className="grid grid-cards">
          {filteredCards.map(card => {
            const owed = getAmountOwed(card);
            const limit = getCreditLimit(card);
            const util = getUtilization(card);
            const apr = normalizeApr(card.apr);
            const activeCategories = getActiveCategoriesForMonth(card, viewingMonth)
              .filter(category => getCardCashback(card, viewingMonth, category) > 0);

            return (
              <div key={card.id} className="panel credit-card-tile">
                <div className="cc-head">
                  <CardThumb card={card} size="lg" />
                  <div className="grow">
                    <div className="cc-name">{card.name}</div>
                    <div className="cc-meta">
                      <span>{card.bankName || card.institutionName || 'Credit Card'}</span>
                      {card.lastFourDigits && <span>•••• {card.lastFourDigits}</span>}
                    </div>

                    <div className="cc-badges">
                      {card.noForeignTxFee && (
                        <span className="badge badge-good" title="No Foreign Transaction Fees">
                          <ShieldCheck size={10} /> No FTF
                        </span>
                      )}
                      {card.isAirlineCard && <span className="badge">Airline</span>}
                      {card.isHotelCard && <span className="badge">Hotel</span>}
                      {card.hidden && <span className="badge badge-warn">Hidden</span>}
                    </div>
                  </div>
                </div>

                {/* Metrics */}
                <div className="cc-metrics">
                  <div className="metric">
                    <div className="metric-label">Balance Owed</div>
                    <div className="metric-value">
                      {owed !== undefined ? formatCurrency(owed) : '—'}
                    </div>
                  </div>

                  <div className="metric">
                    <div className="metric-label">Credit Limit</div>
                    <div className="metric-value">
                      {limit !== undefined ? formatCurrency(limit, { compact: true }) : '—'}
                    </div>
                  </div>

                  <div className="metric">
                    <div className="metric-label">Utilization</div>
                    <div className="metric-value" style={{ color: util !== undefined ? `var(--${utilizationTone(util)})` : undefined }}>
                      {util !== undefined ? `${(util * 100).toFixed(1)}%` : '—'}
                    </div>
                  </div>

                  {apr !== undefined && (
                    <div className="metric">
                      <div className="metric-label">APR</div>
                      <div className="metric-value">{apr.toFixed(2)}%</div>
                    </div>
                  )}

                  {card.feesPaid !== undefined && (
                    <div className="metric">
                      <div className="metric-label">Annual Fee</div>
                      <div className="metric-value">{formatCurrency(card.feesPaid, { whole: true })}</div>
                    </div>
                  )}

                  {card.dueDate !== undefined && (
                    <div className="metric">
                      <div className="metric-label">Due Date</div>
                      <div className="metric-value">Day {card.dueDate} ({nextDueDate(card.dueDate).slice(5)})</div>
                    </div>
                  )}
                </div>

                {util !== undefined && (
                  <ProgressBar value={util * 100} tone={utilizationTone(util)} size="sm" />
                )}

                {/* Earn Rates Section */}
                <div>
                  <div className="cc-section-title">
                    <span>{formatMonth(viewingMonth, 'short')} Earn Rates</span>
                    <button
                      type="button"
                      className="panel-link"
                      style={{ fontSize: '12px' }}
                      onClick={() => openDialog({ type: 'earnRates', cardId: card.id })}
                    >
                      <Edit2 size={12} /> Edit Rates
                    </button>
                  </div>

                  <div className="rate-chips">
                    <span className="rate-chip">
                      <Percent size={14} /> Base: <strong>{card.baseCashback ?? 1}%</strong>
                    </span>
                    {activeCategories.map(cat => (
                      <span key={cat} className="rate-chip">
                        <CategoryIcon category={cat} size={14} /> {cat}: <strong>{formatRate(getCardCashback(card, viewingMonth, cat))}</strong>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                {card.notes && (
                  <div style={{ fontSize: '12px', color: 'var(--text-2)', background: 'var(--surface-2)', padding: '8px 10px', borderRadius: '8px' }}>
                    {card.notes}
                  </div>
                )}

                {/* Footer Buttons */}
                <div className="cc-footer">
                  <Link
                    to={`/transactions?card=${encodeURIComponent(card.id)}`}
                    className="btn btn-sm"
                    aria-label={`View transactions for ${card.name}`}
                  >
                    <Receipt size={14} /> View Transactions
                  </Link>
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    onClick={() => openDialog({ type: 'cardEditor', cardId: card.id })}
                  >
                    Edit Card
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() => openDialog({ type: 'earnRates', cardId: card.id })}
                  >
                    Edit Earn Rates
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    onClick={() => openDialog({ type: 'cardEditor', cardId: card.id, addOffer: true })}
                  >
                    + Offer
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
