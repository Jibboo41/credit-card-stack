import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { CardOffer, CreditCard } from '../../core/models';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useUiStore } from '../../store/useUiStore';
import { Modal } from '../ui/Modal';
import { Switch } from '../ui/Switch';
import { CardThumb } from '../ui/CardThumb';
import { CardImagePicker } from '../ui/CardImagePicker';
import { uploadCardImage } from '../../lib/cardImages';

interface CardEditorDialogProps {
  cardId?: string;
  addOffer?: boolean;
}

export function CardEditorDialog({ cardId, addOffer }: CardEditorDialogProps) {
  const closeDialog = useUiStore(s => s.closeDialog);
  const cards = useFinanceStore(s => s.creditCards);
  const addCreditCard = useFinanceStore(s => s.addCreditCard);
  const updateCreditCard = useFinanceStore(s => s.updateCreditCard);
  const deleteCreditCard = useFinanceStore(s => s.deleteCreditCard);
  const pushToast = useFinanceStore(s => s.pushToast);

  const card = cards.find(c => c.id === cardId);
  const isEditing = !!card;

  const [name, setName] = useState(() => card?.name || '');
  const [bankName, setBankName] = useState(() => card?.bankName || card?.institutionName || '');
  const [imageUrl, setImageUrl] = useState(() => card?.imageUrl || '');
  const [pendingImage, setPendingImage] = useState<Blob | undefined>();
  const [cardLimit, setCardLimit] = useState(() => card?.cardLimit !== undefined ? card.cardLimit.toString() : '');
  const [lastFourDigits, setLastFourDigits] = useState(() => card?.lastFourDigits || '');
  const [dueDate, setDueDate] = useState(() => card?.dueDate !== undefined ? card.dueDate.toString() : '');
  const [feesPaid, setFeesPaid] = useState(() => card?.feesPaid !== undefined ? card.feesPaid.toString() : '');
  const [baseCashback, setBaseCashback] = useState(() => card?.baseCashback !== undefined ? card.baseCashback.toString() : '1');
  const [noForeignTxFee, setNoForeignTxFee] = useState(() => card?.noForeignTxFee || false);
  const [isAirlineCard, setIsAirlineCard] = useState(() => card?.isAirlineCard || false);
  const [isHotelCard, setIsHotelCard] = useState(() => card?.isHotelCard || false);
  const [hidden, setHidden] = useState(() => card?.hidden || false);
  const [notes, setNotes] = useState(() => card?.notes || '');

  // Offers state
  const [offers, setOffers] = useState<CardOffer[]>(() => {
    const list = [...(card?.offers || [])];
    if (addOffer) {
      list.push({
        id: crypto.randomUUID(),
        title: '',
        spendTarget: 500,
        rewardAmount: 100,
        isMonthly: false,
      });
    }
    return list;
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleAddOffer = () => {
    setOffers([
      ...offers,
      {
        id: crypto.randomUUID(),
        title: '',
        spendTarget: 500,
        rewardAmount: 100,
        isMonthly: false,
      },
    ]);
  };

  const handleOfferChange = (index: number, updates: Partial<CardOffer>) => {
    setOffers(offers.map((off, i) => (i === index ? { ...off, ...updates } : off)));
  };

  const handleRemoveOffer = (index: number) => {
    setOffers(offers.filter((_, i) => i !== index));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      pushToast({ tone: 'error', message: 'Card name is required.' });
      return;
    }

    setIsSaving(true);
    try {
      const savedImageUrl = pendingImage ? await uploadCardImage(pendingImage) : imageUrl.trim() || undefined;
      const cardData: Record<string, unknown> = {
        name: name.trim(),
        bankName: bankName.trim() || undefined,
        imageUrl: savedImageUrl,
        cardLimit: cardLimit !== '' ? parseFloat(cardLimit) : undefined,
        lastFourDigits: lastFourDigits.trim() || undefined,
        dueDate: dueDate !== '' ? parseInt(dueDate, 10) : undefined,
        feesPaid: feesPaid !== '' ? parseFloat(feesPaid) : undefined,
        baseCashback: baseCashback !== '' ? parseFloat(baseCashback) : undefined,
        noForeignTxFee,
        isAirlineCard,
        isHotelCard,
        hidden,
        notes: notes.trim(),
        offers: offers.filter(o => o.title.trim() || (o.spendTarget && o.spendTarget > 0)),
      };

      if (isEditing && card) {
        await updateCreditCard(card.id, cardData as Partial<CreditCard>);
        pushToast({ tone: 'success', message: `Updated ${name}` });
      } else {
        cardData.categories = [];
        cardData.cashback = {};
        cardData.historicalCashback = {};
        await addCreditCard(cardData as Omit<CreditCard, 'id'>);
        pushToast({ tone: 'success', message: `Added ${name}` });
      }
      closeDialog();
    } catch (err) {
      console.error(err);
      pushToast({ tone: 'error', message: 'Failed to save card' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!card || !window.confirm(`Are you sure you want to delete ${card.name}?`)) return;
    setIsDeleting(true);
    try {
      await deleteCreditCard(card.id);
      pushToast({ tone: 'info', message: `Deleted ${card.name}` });
      closeDialog();
    } catch (err) {
      console.error(err);
      pushToast({ tone: 'error', message: 'Failed to delete card' });
    } finally {
      setIsDeleting(false);
    }
  };

  const previewCard: CreditCard = {
    id: card?.id || 'preview',
    name: name || 'Card Name',
    bankName: bankName || undefined,
    imageUrl: imageUrl || undefined,
    isAirlineCard,
    isHotelCard,
    noForeignTxFee,
    categories: [],
    cashback: {},
  };

  return (
    <Modal
      title={isEditing ? 'Edit Card' : 'Add Credit Card'}
      subtitle={isEditing ? `Settings and rewards for ${card?.name}` : 'Add a new card to your wallet'}
      onClose={closeDialog}
      size="lg"
      dismissible={!isSaving && !isDeleting}
      footer={
        <>
          {isEditing && (
            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={handleDelete}
              disabled={isSaving || isDeleting}
            >
              <Trash2 size={14} /> Delete
            </button>
          )}
          <span className="spacer" />
          <button type="button" className="btn btn-ghost" onClick={closeDialog} disabled={isSaving || isDeleting}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSave} disabled={isSaving || isDeleting}>
            {isSaving && pendingImage ? 'Uploading Image…' : isSaving ? 'Saving…' : 'Save'}
          </button>
        </>
      }
    >
      <form onSubmit={handleSave} className="stack">
        {/* Preview Header */}
        <div className="panel" style={{ background: 'var(--surface-2)', padding: '14px' }}>
          <div className="row" style={{ gap: '14px' }}>
            <CardThumb card={previewCard} size="md" />
            <div className="grow">
              <div style={{ fontWeight: 700, fontSize: '15px' }}>{name || 'New Credit Card'}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-3)' }}>
                {bankName || 'Unknown Bank'} {lastFourDigits ? `(••• ${lastFourDigits})` : ''}
              </div>
            </div>
          </div>
        </div>

        <div className="form-section">
          <div className="form-section-title">Card Details</div>
          <div className="form-grid">
            <div className="field">
              <label className="field-label">Card Name *</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. Sapphire Preferred"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>

            <div className="field">
              <label className="field-label">Bank / Issuer</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. Chase"
                value={bankName}
                onChange={e => setBankName(e.target.value)}
              />
            </div>

            <div className="field">
              <label className="field-label">Last 4 Digits</label>
              <input
                type="text"
                maxLength={4}
                className="input tabular"
                placeholder="1234"
                value={lastFourDigits}
                onChange={e => setLastFourDigits(e.target.value)}
              />
            </div>

            <div className="field">
              <label className="field-label">Credit Limit ($)</label>
              <input
                type="number"
                step="50"
                className="input tabular"
                placeholder="5000"
                value={cardLimit}
                onChange={e => setCardLimit(e.target.value)}
              />
            </div>

            <div className="field">
              <label className="field-label">Base Cashback (%)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                className="input tabular"
                value={baseCashback}
                onChange={e => setBaseCashback(e.target.value)}
              />
            </div>

            <div className="field">
              <label className="field-label">Annual Fee ($)</label>
              <input
                type="number"
                step="1"
                min="0"
                className="input tabular"
                placeholder="95"
                value={feesPaid}
                onChange={e => setFeesPaid(e.target.value)}
              />
            </div>

            <div className="field">
              <label className="field-label">Payment Due Day (1–31)</label>
              <input
                type="number"
                min="1"
                max="31"
                className="input tabular"
                placeholder="15"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
              />
            </div>

            <CardImagePicker
              value={imageUrl}
              onChange={(url, image) => { setImageUrl(url); setPendingImage(image); }}
              disabled={isSaving || isDeleting}
            />
          </div>
        </div>

        <div className="form-section">
          <div className="form-section-title">Features & Visibility</div>
          <div className="stack">
            <Switch
              checked={noForeignTxFee}
              onChange={setNoForeignTxFee}
              label="No Foreign Transaction Fee"
              description="Safe to use abroad without 3% conversion fees"
            />
            <Switch
              checked={isAirlineCard}
              onChange={setIsAirlineCard}
              label="Airline Co-branded Card"
            />
            <Switch
              checked={isHotelCard}
              onChange={setIsHotelCard}
              label="Hotel Co-branded Card"
            />
            <Switch
              checked={hidden}
              onChange={setHidden}
              label="Hide Card"
              description="Hide this card from default wallet views and recommendations"
            />
          </div>
        </div>

        {/* Offers Section */}
        <div className="form-section">
          <div className="form-section-title">
            <span>Spend Offers & Welcome Bonuses</span>
            <button type="button" className="btn btn-sm" onClick={handleAddOffer}>
              <Plus size={14} /> Add Offer
            </button>
          </div>

          {offers.length === 0 ? (
            <div className="subtle" style={{ fontSize: '13px' }}>
              No active offers. Click "+ Add Offer" to track welcome bonuses or retention spend targets.
            </div>
          ) : (
            <div className="stack">
              {offers.map((offer, idx) => (
                <div key={offer.id || idx} className="panel" style={{ padding: '14px', background: 'var(--surface-2)' }}>
                  <div className="row-between" style={{ marginBottom: '10px' }}>
                    <span style={{ fontWeight: 600, fontSize: '13px' }}>Offer #{idx + 1}</span>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      style={{ color: 'var(--red)' }}
                      onClick={() => handleRemoveOffer(idx)}
                    >
                      <Trash2 size={14} /> Remove
                    </button>
                  </div>

                  <div className="form-grid">
                    <div className="field full">
                      <label className="field-label">Offer Title</label>
                      <input
                        type="text"
                        className="input"
                        placeholder="e.g. Spend $3,000 for 60,000 pts"
                        value={offer.title}
                        onChange={e => handleOfferChange(idx, { title: e.target.value })}
                      />
                    </div>

                    <div className="field">
                      <label className="field-label">Spend Target ($)</label>
                      <input
                        type="number"
                        step="10"
                        className="input tabular"
                        placeholder="3000"
                        value={offer.spendTarget || ''}
                        onChange={e => handleOfferChange(idx, { spendTarget: parseFloat(e.target.value) || 0 })}
                      />
                    </div>

                    <div className="field">
                      <label className="field-label">Reward Amount ($)</label>
                      <input
                        type="number"
                        className="input tabular"
                        placeholder="100"
                        value={offer.rewardAmount || ''}
                        onChange={e => handleOfferChange(idx, { rewardAmount: parseFloat(e.target.value) || 0 })}
                      />
                    </div>

                    <div className="field">
                      <label className="field-label">Start Date</label>
                      <input
                        type="date"
                        className="input"
                        value={offer.startDate || ''}
                        onChange={e => handleOfferChange(idx, { startDate: e.target.value })}
                      />
                    </div>

                    <div className="field">
                      <label className="field-label">End Date</label>
                      <input
                        type="date"
                        className="input"
                        value={offer.endDate || ''}
                        onChange={e => handleOfferChange(idx, { endDate: e.target.value })}
                      />
                    </div>

                    <div className="field full">
                      <Switch
                        checked={offer.isMonthly || false}
                        onChange={isMonthly => handleOfferChange(idx, { isMonthly })}
                        label="Monthly Recurring Offer"
                        description="Spend resets every month (e.g. spend $500 monthly for credit)"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="form-section">
          <div className="form-section-title">Notes</div>
          <div className="field">
            <textarea
              className="textarea"
              placeholder="Perks, phone numbers, lounge access rules, anniversary dates..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>
      </form>
    </Modal>
  );
}
