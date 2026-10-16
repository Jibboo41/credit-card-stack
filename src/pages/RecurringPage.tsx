import { useState } from 'react';
import { Calendar, Repeat } from 'lucide-react';
import { useFinanceStore } from '../store/useFinanceStore';
import { useVisibleData } from '../hooks/useVisibleData';
import { getFrequencyInfo, getStreamAmount } from '../lib/monarch';
import { formatCurrency } from '../lib/format';
import { CategoryBadge } from '../components/ui/CategoryIcon';
import { CardThumb } from '../components/ui/CardThumb';
import { EmptyState } from '../components/ui/EmptyState';

export function RecurringPage() {
  const monarch = useFinanceStore(s => s.monarch);
  const { cardByMonarchId } = useVisibleData();

  const [frequencyFilter, setFrequencyFilter] = useState<string>('all');

  const recurringStreams = monarch?.recurring || [];

  // Calculate monthly commitment
  let totalMonthlyCommitment = 0;
  for (const stream of recurringStreams) {
    const freq = getFrequencyInfo(stream.frequency);
    const amount = getStreamAmount(stream);
    totalMonthlyCommitment += amount * freq.perMonth;
  }

  const filteredStreams = recurringStreams.filter(stream => {
    if (frequencyFilter === 'all') return true;
    const freq = getFrequencyInfo(stream.frequency);
    return freq.label.toLowerCase() === frequencyFilter.toLowerCase();
  });

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Recurring Subscriptions & Bills</h1>
          <p>Recurring streams identified from your Monarch Money account synchronization</p>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="stats">
        <div className="panel stat">
          <div className="stat-label"><Repeat size={14} /> Estimated Monthly Recurring</div>
          <div className="stat-value">{formatCurrency(totalMonthlyCommitment)}</div>
          <div className="stat-sub">Normalized monthly bill spend</div>
        </div>

        <div className="panel stat">
          <div className="stat-label">Active Recurring Streams</div>
          <div className="stat-value">{recurringStreams.length}</div>
          <div className="stat-sub">Subscriptions & charges</div>
        </div>
      </div>

      {/* Frequency Filter Chips */}
      {recurringStreams.length > 0 && (
        <div className="toolbar">
          {['all', 'monthly', 'yearly', 'weekly'].map(freq => (
            <button
              key={freq}
              type="button"
              className="chip"
              aria-pressed={frequencyFilter === freq}
              onClick={() => setFrequencyFilter(freq)}
            >
              {freq.charAt(0).toUpperCase() + freq.slice(1)}
            </button>
          ))}
        </div>
      )}

      {recurringStreams.length === 0 ? (
        <EmptyState
          icon={Repeat}
          title="No recurring streams found"
          description="Monarch automatically detects recurring subscriptions. Make sure your accounts are synced."
        />
      ) : (
        <div className="panel panel-flush">
          <div className="list">
            {filteredStreams.map((stream, idx) => {
              const freq = getFrequencyInfo(stream.frequency);
              const amount = getStreamAmount(stream);
              const card = stream.monarchAccountId ? cardByMonarchId.get(stream.monarchAccountId) : undefined;
              const cat = stream.category || 'Other';

              return (
                <div key={stream.streamId || idx} className="list-row" style={{ padding: '14px 18px' }}>
                  <CategoryBadge category={cat} size={36} />

                  <div className="list-row-main">
                    <div className="list-row-title">
                      <span>{stream.merchantName || 'Recurring Charge'}</span>
                      <span className="badge badge-accent">{freq.label}</span>
                    </div>
                    <div className="list-row-sub">
                      {card && (
                        <>
                          <CardThumb card={card} size="xs" />
                          <span>{card.name}</span>
                          <span>•</span>
                        </>
                      )}
                      <span>{cat}</span>
                      {stream.nextDate && (
                        <>
                          <span>•</span>
                          <span className="row" style={{ gap: '4px' }}>
                            <Calendar size={12} /> Next: {stream.nextDate}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="list-row-end">
                    <div className="amount tabular" style={{ fontSize: '16px' }}>
                      {formatCurrency(amount)}
                    </div>
                    <div className="subtle" style={{ fontSize: '11px' }}>
                      per {freq.label.toLowerCase()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
