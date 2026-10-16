import { useState } from 'react';
import { CATEGORIES } from '../../core/models';
import type { FinanceCategory } from '../../core/models';
import { getCardCashback } from '../../lib/cashback';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useUiStore } from '../../store/useUiStore';
import { Modal } from '../ui/Modal';
import { CategoryIcon } from '../ui/CategoryIcon';

interface EarnRatesDialogProps {
  cardId: string;
}

export function EarnRatesDialog({ cardId }: EarnRatesDialogProps) {
  const closeDialog = useUiStore(s => s.closeDialog);
  const cards = useFinanceStore(s => s.creditCards);
  const viewingMonth = useFinanceStore(s => s.viewingMonth);
  const updateCreditCard = useFinanceStore(s => s.updateCreditCard);
  const pushToast = useFinanceStore(s => s.pushToast);

  const card = cards.find(c => c.id === cardId);

  const [rates, setRates] = useState<Record<FinanceCategory, string>>(() => {
    const initial: Record<string, string> = {};
    if (card) {
      CATEGORIES.forEach(cat => {
        initial[cat] = getCardCashback(card, viewingMonth, cat).toString();
      });
    }
    return initial as Record<FinanceCategory, string>;
  });

  const [notes, setNotes] = useState(() => card?.notes || '');
  const [isSaving, setIsSaving] = useState(false);

  if (!card) return null;

  const handleSave = async (mode: 'current_and_future' | 'this_month') => {
    setIsSaving(true);
    try {
      const cashbackMap: Record<string, number> = {};
      CATEGORIES.forEach(cat => {
        const parsed = parseFloat(rates[cat]);
        cashbackMap[cat] = isNaN(parsed) ? 1 : parsed;
      });

      const cardData: Record<string, unknown> = {
        notes: notes.trim(),
      };

      if (mode === 'current_and_future') {
        cardData.cashback = cashbackMap;
        const newHistorical = { ...(card.historicalCashback || {}) };
        const months = Object.keys(newHistorical);
        months.forEach(ym => {
          if (ym >= viewingMonth) {
            delete newHistorical[ym];
          }
        });
        cardData.historicalCashback = newHistorical;
      } else {
        const newHistorical = { ...(card.historicalCashback || {}) };
        const monthOverrides: Record<string, number> = {};
        CATEGORIES.forEach(cat => {
          const parsed = parseFloat(rates[cat]);
          monthOverrides[cat] = isNaN(parsed) ? 1 : parsed;
        });
        newHistorical[viewingMonth] = monthOverrides;
        cardData.historicalCashback = newHistorical;
      }

      await updateCreditCard(card.id, cardData);
      pushToast({ tone: 'success', message: `Saved earn rates for ${card.name}` });
      closeDialog();
    } catch (e) {
      console.error(e);
      pushToast({ tone: 'error', message: 'Failed to save earn rates' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      title="Edit Earn Rates"
      subtitle={`${card.name} • ${viewingMonth}`}
      onClose={closeDialog}
      size="md"
      dismissible={!isSaving}
      footer={
        <>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={closeDialog}
            disabled={isSaving}
          >
            Cancel
          </button>
          <span className="spacer" />
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => handleSave('this_month')}
            disabled={isSaving}
            title="Applies only to this specific month without altering other months"
          >
            Save for {viewingMonth} only
          </button>
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={() => handleSave('current_and_future')}
            disabled={isSaving}
            title="Sets these rates as the new default going forward"
          >
            Save for all months
          </button>
        </>
      }
    >
      <div className="stack">
        <div style={{ fontSize: '13px', color: 'var(--text-2)', marginBottom: '4px' }}>
          Base earn rate: <strong>{card.baseCashback ?? 1}%</strong>. Customize bonus reward rates for each category below:
        </div>

        <div className="list">
          {CATEGORIES.map(cat => (
            <div key={cat} className="list-row" style={{ padding: '8px 4px' }}>
              <div className="row" style={{ gap: '10px' }}>
                <CategoryIcon category={cat} size={18} />
                <span style={{ fontWeight: 600 }}>{cat}</span>
              </div>
              <span className="spacer" style={{ flex: 1 }} />
              <div className="row" style={{ gap: '6px' }}>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={rates[cat] ?? '1'}
                  onChange={e => setRates({ ...rates, [cat]: e.target.value })}
                  className="input input-sm tabular"
                  style={{ width: '70px', textAlign: 'center', fontWeight: 700 }}
                />
                <span style={{ fontWeight: 700, color: 'var(--text-2)' }}>%</span>
              </div>
            </div>
          ))}
        </div>

        <div className="field" style={{ marginTop: '16px' }}>
          <label className="field-label">Category Notes / Rotation Reminders</label>
          <textarea
            className="textarea"
            placeholder="e.g. 5% on Gas up to $1,500 for Q3, then 1%..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
          />
        </div>
      </div>
    </Modal>
  );
}
