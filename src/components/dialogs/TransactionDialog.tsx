import { useState } from 'react';
import { CATEGORIES } from '../../core/models';
import type { FinanceCategory } from '../../core/models';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useUiStore } from '../../store/useUiStore';
import { Modal } from '../ui/Modal';
import { Switch } from '../ui/Switch';
import { CategoryIcon } from '../ui/CategoryIcon';

interface TransactionDialogProps {
  txId: string;
}

export function TransactionDialog({ txId }: TransactionDialogProps) {
  const closeDialog = useUiStore(s => s.closeDialog);
  const transactions = useFinanceStore(s => s.transactions);
  const updateTransaction = useFinanceStore(s => s.updateTransaction);
  const pushToast = useFinanceStore(s => s.pushToast);

  const tx = transactions.find(t => t.id === txId);

  const [merchantName, setMerchantName] = useState(() => tx?.manualMerchantName ?? tx?.merchantName ?? '');
  const [category, setCategory] = useState<FinanceCategory>(() => (tx?.manualCategory ?? tx?.category ?? 'Other') as FinanceCategory);
  const [excludeFromCashback, setExcludeFromCashback] = useState(() => tx?.excludeFromCashback ?? false);
  const [hidden, setHidden] = useState(() => tx?.hidden ?? false);
  const [isSaving, setIsSaving] = useState(false);

  if (!tx) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateTransaction(tx.id, {
        manualMerchantName: merchantName.trim() || undefined,
        manualCategory: category,
        excludeFromCashback,
        hidden,
      });
      pushToast({ tone: 'success', message: 'Transaction updated' });
      closeDialog();
    } catch (err) {
      console.error(err);
      pushToast({ tone: 'error', message: 'Failed to update transaction' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      title="Edit Transaction"
      subtitle={`${tx.date} • Monarch ID: ${tx.monarchAccountId.slice(-6)}`}
      onClose={closeDialog}
      size="sm"
      dismissible={!isSaving}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={closeDialog} disabled={isSaving}>
            Cancel
          </button>
          <span className="spacer" />
          <button type="button" className="btn btn-primary" onClick={handleSave} disabled={isSaving}>
            Save
          </button>
        </>
      }
    >
      <form onSubmit={handleSave} className="form-section">
        <div className="field">
          <label className="field-label">Merchant Name</label>
          <input
            type="text"
            className="input"
            value={merchantName}
            onChange={e => setMerchantName(e.target.value)}
            placeholder="Merchant name"
          />
        </div>

        <div className="field">
          <label className="field-label">Category</label>
          <div className="row">
            <CategoryIcon category={category} size={20} />
            <select
              className="select grow"
              value={category}
              onChange={e => setCategory(e.target.value as FinanceCategory)}
            >
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="stack" style={{ marginTop: '8px' }}>
          <Switch
            checked={excludeFromCashback}
            onChange={setExcludeFromCashback}
            label="Exclude from Rewards"
            description="Do not calculate cash back for this transaction"
          />
          <Switch
            checked={hidden}
            onChange={setHidden}
            label="Hide Transaction"
            description="Hide this purchase from default lists and summaries"
          />
        </div>
      </form>
    </Modal>
  );
}
