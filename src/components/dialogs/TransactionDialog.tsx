import { useId, useState } from 'react';
import { CATEGORIES } from '../../core/models';
import type { FinanceCategory } from '../../core/models';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useUiStore } from '../../store/useUiStore';
import { Modal } from '../ui/Modal';
import { Switch } from '../ui/Switch';
import { CategoryIcon } from '../ui/CategoryIcon';
import { getCardCashback, getResolvedTransaction, getTransactionCashback, isTransferLike } from '../../lib/cashback';
import { formatCurrency, formatRate } from '../../lib/format';

interface TransactionDialogProps {
  txId: string;
}

export function TransactionDialog({ txId }: TransactionDialogProps) {
  const closeDialog = useUiStore(s => s.closeDialog);
  const transactions = useFinanceStore(s => s.transactions);
  const cards = useFinanceStore(s => s.creditCards);
  const updateTransaction = useFinanceStore(s => s.updateTransaction);
  const pushToast = useFinanceStore(s => s.pushToast);

  const tx = transactions.find(t => t.id === txId);
  const resolvedTx = tx ? getResolvedTransaction(tx) : undefined;
  const card = cards.find(c => c.monarchId && c.monarchId === tx?.monarchAccountId);
  const formId = useId();

  const [merchantName, setMerchantName] = useState(() => tx?.manualMerchantName ?? tx?.merchantName ?? '');
  const [category, setCategory] = useState<FinanceCategory>(() => (tx?.manualCategory ?? tx?.category ?? 'Other') as FinanceCategory);
  const [excludeFromCashback, setExcludeFromCashback] = useState(() => tx?.excludeFromCashback ?? false);
  const [hidden, setHidden] = useState(() => tx?.hidden ?? false);
  const [cashbackMode, setCashbackMode] = useState<'automatic' | 'rate' | 'amount'>(() =>
    tx?.manualCashbackAmount !== undefined ? 'amount' : tx?.manualCashbackRate !== undefined ? 'rate' : 'automatic'
  );
  const [cashbackRate, setCashbackRate] = useState(() =>
    String(tx?.manualCashbackRate ?? (card && resolvedTx ? getCardCashback(card, resolvedTx.date.substring(0, 7), resolvedTx.category) : 0))
  );
  const [cashbackAmount, setCashbackAmount] = useState(() =>
    tx?.manualCashbackAmount?.toString() ?? (resolvedTx ? getTransactionCashback(resolvedTx, card).toFixed(2) : '')
  );
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  if (!tx || !resolvedTx) return null;

  const manualCashbackRate = cashbackMode === 'rate' ? Number(cashbackRate) : undefined;
  const manualCashbackAmount = cashbackMode === 'amount' ? Number(cashbackAmount) : undefined;
  const automaticRate = card ? getCardCashback(card, resolvedTx.date.substring(0, 7), category) : 0;
  const previewCashback = getTransactionCashback({ ...resolvedTx, category, excludeFromCashback, manualCashbackRate, manualCashbackAmount }, card);
  const cashbackDisabled = excludeFromCashback || isTransferLike(tx);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cashbackMode !== 'automatic') {
      const value = cashbackMode === 'rate' ? cashbackRate : cashbackAmount;
      const number = Number(value);
      if (!value.trim() || !Number.isFinite(number) || (cashbackMode === 'rate' && (number < 0 || number > 100))) {
        setError(cashbackMode === 'rate' ? 'Enter a rate between 0 and 100.' : 'Enter a valid cash back amount.');
        return;
      }
    }
    setError('');
    setIsSaving(true);
    try {
      await updateTransaction(tx.id, {
        manualMerchantName: merchantName.trim() || undefined,
        manualCategory: category,
        excludeFromCashback,
        hidden,
        manualCashbackRate,
        manualCashbackAmount,
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
      subtitle={`${resolvedTx.date} • Monarch ID: ${tx.monarchAccountId.slice(-6)}`}
      onClose={closeDialog}
      size="sm"
      dismissible={!isSaving}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={closeDialog} disabled={isSaving}>
            Cancel
          </button>
          <span className="spacer" />
          <button type="submit" form={formId} className="btn btn-primary" disabled={isSaving}>
            Save
          </button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSave} className="form-section">
        <div className="field">
          <label className="field-label" htmlFor={`${formId}-merchant`}>Merchant Name</label>
          <input
            id={`${formId}-merchant`}
            type="text"
            className="input"
            value={merchantName}
            onChange={e => setMerchantName(e.target.value)}
            placeholder="Merchant name"
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor={`${formId}-category`}>Category</label>
          <div className="row">
            <CategoryIcon category={category} size={20} />
            <select
              id={`${formId}-category`}
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

        <div className="field">
          <label className="field-label" htmlFor={`${formId}-cashback-mode`}>Cash back</label>
          <select
            id={`${formId}-cashback-mode`}
            className="select"
            value={cashbackMode}
            onChange={e => { setCashbackMode(e.target.value as typeof cashbackMode); setError(''); }}
            disabled={cashbackDisabled}
          >
            <option value="automatic">Use card's earn rate ({formatRate(automaticRate)})</option>
            <option value="rate">Custom rate (%)</option>
            <option value="amount">Custom amount ($)</option>
          </select>
          <span className="field-hint">Overrides apply only to this transaction. Choose the card's earn rate to remove an override.</span>
        </div>

        {cashbackMode !== 'automatic' && (
          <div className="field">
            <label className="field-label" htmlFor={`${formId}-cashback-value`}>
              {cashbackMode === 'rate' ? 'Cash back rate (%)' : 'Cash back amount ($)'}
            </label>
            <input
              id={`${formId}-cashback-value`}
              type="number"
              className="input"
              step={cashbackMode === 'rate' ? 'any' : '0.01'}
              min={cashbackMode === 'rate' ? 0 : undefined}
              max={cashbackMode === 'rate' ? 100 : undefined}
              value={cashbackMode === 'rate' ? cashbackRate : cashbackAmount}
              onChange={e => {
                if (cashbackMode === 'rate') setCashbackRate(e.target.value);
                else setCashbackAmount(e.target.value);
                setError('');
              }}
              required
              disabled={cashbackDisabled}
            />
            {cashbackMode === 'amount' && <span className="field-hint">Enter a negative amount for a rewards reversal.</span>}
          </div>
        )}

        <div className="field-hint" aria-live="polite">
          Cash back for this transaction: <strong className="text-good">{formatCurrency(previewCashback)}</strong>
          {cashbackDisabled && <div>Excluded transactions and transfers do not earn rewards.</div>}
        </div>
        {error && <div role="alert" className="form-error">{error}</div>}

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
