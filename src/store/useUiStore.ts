import { create } from 'zustand';

export type Dialog =
  | { type: 'syncLogs' }
  | { type: 'appearance' }
  | { type: 'cardEditor'; cardId?: string; addOffer?: boolean }
  | { type: 'earnRates'; cardId: string }
  | { type: 'transaction'; txId: string }
  | { type: 'chooseOfferCard' };

interface UiState {
  dialog: Dialog | null;
  openDialog: (dialog: Dialog) => void;
  closeDialog: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  dialog: null,
  openDialog: (dialog) => set({ dialog }),
  closeDialog: () => set({ dialog: null }),
}));
