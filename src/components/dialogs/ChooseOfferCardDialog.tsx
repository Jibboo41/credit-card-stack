import { useFinanceStore } from '../../store/useFinanceStore';
import { useUiStore } from '../../store/useUiStore';
import { Modal } from '../ui/Modal';
import { CardThumb } from '../ui/CardThumb';
import { EmptyState } from '../ui/EmptyState';
import { CreditCard } from 'lucide-react';

export function ChooseOfferCardDialog() {
  const closeDialog = useUiStore(s => s.closeDialog);
  const openDialog = useUiStore(s => s.openDialog);
  const cards = useFinanceStore(s => s.creditCards).filter(c => !c.hidden);

  const handleSelectCard = (cardId: string) => {
    openDialog({ type: 'cardEditor', cardId, addOffer: true });
  };

  return (
    <Modal
      title="Add Offer to Card"
      subtitle="Select the credit card this bonus offer belongs to"
      onClose={closeDialog}
      size="sm"
    >
      {cards.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="No cards found"
          description="Add a card to your wallet first before tracking bonus offers."
        />
      ) : (
        <div className="list">
          {cards.map(card => (
            <button
              key={card.id}
              type="button"
              className="list-row"
              onClick={() => handleSelectCard(card.id)}
            >
              <CardThumb card={card} size="sm" />
              <div className="list-row-main">
                <span className="list-row-title">{card.name}</span>
                <span className="list-row-sub">
                  {card.bankName || card.institutionName || 'Credit Card'}
                  {card.lastFourDigits ? ` ••• ${card.lastFourDigits}` : ''}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </Modal>
  );
}
