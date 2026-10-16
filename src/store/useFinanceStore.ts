import { create } from 'zustand';
import { collection, deleteDoc, deleteField, doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import type { User } from 'firebase/auth';
import type { CreditCard, FinanceCategory, MonarchSnapshot, SyncLog, Transaction } from '../core/models';
import { db, functions } from '../firebase';
import { currentYearMonth } from '../lib/format';
import { DEFAULT_THEME_ID } from '../lib/themes';

export type ToastTone = 'success' | 'error' | 'warn' | 'info';

export interface Toast {
  id: string;
  tone: ToastTone;
  message: string;
}

interface SyncResponse {
  status?: 'success' | 'partial' | 'error';
  message?: string;
  accountsSynced?: number;
  transactionsFetched?: number;
  recurringSynced?: number;
}

interface FinanceState {
  user: User | null;
  isAuthLoaded: boolean;
  setUser: (user: User | null) => void;

  creditCards: CreditCard[];
  transactions: Transaction[];
  syncLogs: SyncLog[];
  monarch: MonarchSnapshot | null;
  isDataLoaded: boolean;
  globalStrategyNotes: string;
  theme: string;
  viewingMonth: string; // YYYY-MM
  showHiddenItems: boolean;
  isSyncing: boolean;
  toasts: Toast[];

  setViewingMonth: (month: string) => void;
  setShowHiddenItems: (show: boolean) => void;
  setTheme: (theme: string) => void;
  setGlobalStrategyNotes: (notes: string) => Promise<void>;

  /** Subscribes to all of the signed-in user's Firestore data. Returns an unsubscribe function. */
  subscribeToData: () => () => void;
  syncNow: () => Promise<void>;

  addCreditCard: (card: Omit<CreditCard, 'id'>) => Promise<void>;
  updateCreditCard: (id: string, card: Partial<CreditCard>) => Promise<void>;
  deleteCreditCard: (id: string) => Promise<void>;
  updateTransaction: (id: string, updates: Partial<Transaction>) => Promise<void>;

  pushToast: (toast: Omit<Toast, 'id'>, durationMs?: number) => void;
  dismissToast: (id: string) => void;
}

const LEGACY_CATEGORY_MAP: Record<string, FinanceCategory> = {
  'Dining': 'Restaurants',
  'Utility Bills': 'Utilities',
  'Souvenirs': 'Retail',
};

function migrateCard(id: string, data: Record<string, unknown>): CreditCard {
  const card = { id, ...data } as CreditCard;
  if (Array.isArray(card.categories)) {
    card.categories = card.categories
      .map(c => LEGACY_CATEGORY_MAP[c] ?? c)
      .filter((v, i, a) => a.indexOf(v) === i);
  } else {
    card.categories = [];
  }
  if (card.cashback) {
    const cashback = { ...card.cashback } as Record<string, number>;
    for (const [oldCat, newCat] of Object.entries(LEGACY_CATEGORY_MAP)) {
      if (cashback[oldCat] !== undefined) {
        cashback[newCat] = cashback[oldCat];
        delete cashback[oldCat];
      }
    }
    card.cashback = cashback;
  } else {
    card.cashback = {};
  }
  return card;
}

function migrateTransaction(id: string, data: Record<string, unknown>): Transaction {
  const tx = { id, ...data } as Transaction;
  if (tx.category && LEGACY_CATEGORY_MAP[tx.category]) tx.category = LEGACY_CATEGORY_MAP[tx.category];
  if (tx.manualCategory && LEGACY_CATEGORY_MAP[tx.manualCategory]) tx.manualCategory = LEGACY_CATEGORY_MAP[tx.manualCategory];
  if (!tx.category) tx.category = 'Other';
  return tx;
}

/** Firestore ignores undefined values, so explicitly delete top-level fields that were cleared. */
function toFirestoreUpdate<T extends object>(update: Partial<T>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(update)) {
    out[key] = value === undefined ? deleteField() : value;
  }
  return out;
}

function applyLocalUpdate<T extends object>(item: T, update: Partial<T>): T {
  const next = { ...item, ...update } as Record<string, unknown>;
  for (const [key, value] of Object.entries(update)) {
    if (value === undefined) delete next[key];
  }
  return next as T;
}

function describeError(e: unknown): string {
  if (e && typeof e === 'object' && 'message' in e && typeof e.message === 'string') return e.message;
  return String(e);
}

export const useFinanceStore = create<FinanceState>((set, get) => ({
  user: null,
  isAuthLoaded: false,
  setUser: (user) => set(user
    ? { user, isAuthLoaded: true }
    : { user: null, isAuthLoaded: true, creditCards: [], transactions: [], syncLogs: [], monarch: null, isDataLoaded: false }),

  creditCards: [],
  transactions: [],
  syncLogs: [],
  monarch: null,
  isDataLoaded: false,
  globalStrategyNotes: '',
  theme: DEFAULT_THEME_ID,
  viewingMonth: currentYearMonth(),
  showHiddenItems: false,
  isSyncing: false,
  toasts: [],

  setViewingMonth: (month) => set({ viewingMonth: month }),
  setShowHiddenItems: (show) => set({ showHiddenItems: show }),

  setTheme: (theme) => {
    set({ theme });
    const user = get().user;
    if (user) {
      setDoc(doc(db, 'users', user.uid, 'settings', 'global'), { theme }, { merge: true }).catch(e => {
        console.error('Failed to save theme', e);
      });
    }
  },

  setGlobalStrategyNotes: async (notes) => {
    const user = get().user;
    if (!user) return;
    const previous = get().globalStrategyNotes;
    set({ globalStrategyNotes: notes });
    try {
      await setDoc(doc(db, 'users', user.uid, 'settings', 'global'), { globalStrategyNotes: notes }, { merge: true });
    } catch (e) {
      console.error('Failed to save strategy notes', e);
      set({ globalStrategyNotes: previous });
      get().pushToast({ tone: 'error', message: 'Could not save your strategy notes.' });
    }
  },

  subscribeToData: () => {
    const user = get().user;
    if (!user) return () => {};

    const onError = (what: string) => (e: unknown) => console.error(`Failed to load ${what}`, e);
    let pending = new Set(['cards', 'transactions']);
    const markLoaded = (key: string) => {
      if (!pending.has(key)) return;
      pending.delete(key);
      if (pending.size === 0) set({ isDataLoaded: true });
    };

    try {
      const unsubCards = onSnapshot(collection(db, 'users', user.uid, 'creditCards'), (snapshot) => {
        set({ creditCards: snapshot.docs.map(d => migrateCard(d.id, d.data())) });
        markLoaded('cards');
      }, onError('cards'));

      const unsubTransactions = onSnapshot(collection(db, 'users', user.uid, 'transactions'), (snapshot) => {
        set({ transactions: snapshot.docs.map(d => migrateTransaction(d.id, d.data())) });
        markLoaded('transactions');
      }, onError('transactions'));

      const unsubSettings = onSnapshot(doc(db, 'users', user.uid, 'settings', 'global'), (snap) => {
        const data = snap.exists() ? snap.data() : {};
        set({
          globalStrategyNotes: data.globalStrategyNotes || '',
          theme: data.theme || DEFAULT_THEME_ID,
        });
      }, onError('settings'));

      const unsubMonarch = onSnapshot(doc(db, 'users', user.uid, 'settings', 'monarch'), (snap) => {
        if (!snap.exists()) {
          set({ monarch: null });
          return;
        }
        const data = snap.data() as Partial<MonarchSnapshot>;
        set({
          monarch: {
            ...data,
            recurring: Array.isArray(data.recurring) ? data.recurring : [],
            creditScores: Array.isArray(data.creditScores)
              ? data.creditScores.filter(p => p && typeof p.score === 'number' && typeof p.date === 'string')
                  .sort((a, b) => a.date.localeCompare(b.date))
              : [],
          },
        });
      }, onError('Monarch details'));

      const unsubLogs = onSnapshot(collection(db, 'users', user.uid, 'syncLogs'), (snapshot) => {
        const logs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as SyncLog));
        logs.sort((a, b) => (b.timestamp ?? '').localeCompare(a.timestamp ?? ''));
        set({ syncLogs: logs });
      }, onError('sync logs'));

      return () => {
        pending = new Set();
        unsubCards();
        unsubTransactions();
        unsubSettings();
        unsubMonarch();
        unsubLogs();
      };
    } catch (e) {
      console.error('Firebase not initialized', e);
      set({ isDataLoaded: true });
      return () => {};
    }
  },

  syncNow: async () => {
    if (get().isSyncing) return;
    set({ isSyncing: true });
    try {
      const callable = httpsCallable<void, SyncResponse | undefined>(functions, 'trigger_sync_monarch', { timeout: 540_000 });
      const result = await callable();
      const data = result.data ?? {};
      const status = data.status ?? 'success';
      if (status === 'error') {
        get().pushToast({ tone: 'error', message: data.message || 'Sync failed. Open Sync logs for details.' }, 8000);
      } else if (status === 'partial') {
        get().pushToast({ tone: 'warn', message: data.message || 'Sync finished with some problems. Open Sync logs for details.' }, 8000);
      } else {
        const parts: string[] = [];
        if (data.accountsSynced !== undefined) parts.push(`${data.accountsSynced} accounts`);
        if (data.transactionsFetched !== undefined) parts.push(`${data.transactionsFetched} transactions`);
        if (data.recurringSynced) parts.push(`${data.recurringSynced} recurring`);
        get().pushToast({ tone: 'success', message: parts.length ? `Synced ${parts.join(' · ')}` : 'Sync complete' });
      }
    } catch (e) {
      console.error('Failed to sync', e);
      get().pushToast({ tone: 'error', message: `Sync failed: ${describeError(e)}` }, 8000);
    } finally {
      set({ isSyncing: false });
    }
  },

  addCreditCard: async (card) => {
    const user = get().user;
    if (!user) return;
    const id = crypto.randomUUID();
    const newCard = { ...card, id } as CreditCard;
    set({ creditCards: [...get().creditCards, newCard] });
    try {
      await setDoc(doc(db, 'users', user.uid, 'creditCards', id), newCard);
    } catch (e) {
      console.error(e);
      set({ creditCards: get().creditCards.filter(c => c.id !== id) });
      get().pushToast({ tone: 'error', message: `Could not add ${card.name}.` });
    }
  },

  updateCreditCard: async (id, update) => {
    const user = get().user;
    if (!user) return;
    const previous = get().creditCards.find(c => c.id === id);
    set({ creditCards: get().creditCards.map(c => (c.id === id ? applyLocalUpdate(c, update) : c)) });
    try {
      await updateDoc(doc(db, 'users', user.uid, 'creditCards', id), toFirestoreUpdate(update));
    } catch (e) {
      console.error(e);
      if (previous) set({ creditCards: get().creditCards.map(c => (c.id === id ? previous : c)) });
      get().pushToast({ tone: 'error', message: 'Could not save card changes.' });
    }
  },

  deleteCreditCard: async (id) => {
    const user = get().user;
    if (!user) return;
    const removed = get().creditCards.find(c => c.id === id);
    set({ creditCards: get().creditCards.filter(c => c.id !== id) });
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'creditCards', id));
    } catch (e) {
      console.error(e);
      if (removed) set({ creditCards: [...get().creditCards, removed] });
      get().pushToast({ tone: 'error', message: 'Could not delete the card.' });
    }
  },

  updateTransaction: async (id, updates) => {
    const user = get().user;
    if (!user) return;
    const previous = get().transactions.find(t => t.id === id);
    set({ transactions: get().transactions.map(t => (t.id === id ? applyLocalUpdate(t, updates) : t)) });
    try {
      await updateDoc(doc(db, 'users', user.uid, 'transactions', id), toFirestoreUpdate(updates));
    } catch (e) {
      console.error(e);
      if (previous) set({ transactions: get().transactions.map(t => (t.id === id ? previous : t)) });
      get().pushToast({ tone: 'error', message: 'Could not save transaction changes.' });
    }
  },

  pushToast: (toast, durationMs = 5000) => {
    const id = crypto.randomUUID();
    set({ toasts: [...get().toasts, { ...toast, id }].slice(-4) });
    window.setTimeout(() => get().dismissToast(id), durationMs);
  },

  dismissToast: (id) => set({ toasts: get().toasts.filter(t => t.id !== id) }),
}));
