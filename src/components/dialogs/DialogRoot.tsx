import { useUiStore } from '../../store/useUiStore';
import { AppearanceDialog } from './AppearanceDialog';
import { SyncLogsDialog } from './SyncLogsDialog';
import { EarnRatesDialog } from './EarnRatesDialog';
import { TransactionDialog } from './TransactionDialog';
import { CardEditorDialog } from './CardEditorDialog';
import { ChooseOfferCardDialog } from './ChooseOfferCardDialog';

export function DialogRoot() {
  const dialog = useUiStore(s => s.dialog);

  if (!dialog) return null;

  switch (dialog.type) {
    case 'appearance':
      return <AppearanceDialog />;
    case 'syncLogs':
      return <SyncLogsDialog />;
    case 'earnRates':
      return <EarnRatesDialog cardId={dialog.cardId} />;
    case 'transaction':
      return <TransactionDialog txId={dialog.txId} />;
    case 'cardEditor':
      return <CardEditorDialog cardId={dialog.cardId} addOffer={dialog.addOffer} />;
    case 'chooseOfferCard':
      return <ChooseOfferCardDialog />;
    default:
      return null;
  }
}
