import { create } from 'zustand';
import type { CreditCard, SyncLog } from '../core/models';
import { db } from '../firebase';
import { collection, doc, setDoc, deleteDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import type { User } from 'firebase/auth';

interface FinanceState {
  user: User | null;
  isAuthLoaded: boolean;
  setUser: (user: User | null) => void;

  creditCards: CreditCard[];
  transactions: import('../core/models').Transaction[];
  syncLogs: SyncLog[];
  globalStrategyNotes: string;
  isSidebarOpen: boolean;
  activeTab: 'categories' | 'cashback' | 'offers' | 'no-ftf' | 'manage';
  theme: string;
  viewingMonth: string; // Format: YYYY-MM
  showHiddenItems: boolean;
  
  // Actions
  setActiveTab: (tab: 'categories' | 'cashback' | 'offers' | 'no-ftf' | 'manage') => void;
  setViewingMonth: (month: string) => void;
  setShowHiddenItems: (show: boolean) => void;
  setTheme: (theme: string) => void;
  setSidebarOpen: (isOpen: boolean) => void;
  setGlobalStrategyNotes: (notes: string) => Promise<void>;
  
  // Card Actions
  fetchCreditCards: () => () => void; // Returns unsubscribe function
  addCreditCard: (card: Omit<CreditCard, 'id'>) => Promise<void>;
  updateCreditCard: (id: string, card: Partial<CreditCard>) => Promise<void>;
  deleteCreditCard: (id: string) => Promise<void>;

  // Transaction Actions
  updateTransaction: (id: string, updates: Partial<import('../core/models').Transaction>) => Promise<void>;
}

export const useFinanceStore = create<FinanceState>((set, get) => ({
  user: null,
  isAuthLoaded: false,
  setUser: (user) => set({ user, isAuthLoaded: true }),

  creditCards: [],
  transactions: [],
  syncLogs: [],
  globalStrategyNotes: '',
  isSidebarOpen: false,
  activeTab: 'categories',
  theme: 'slate',
  viewingMonth: new Date().toISOString().substring(0, 7), // e.g. "2026-06"
  showHiddenItems: false,

  setViewingMonth: (month) => set({ viewingMonth: month }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setShowHiddenItems: (show) => set({ showHiddenItems: show }),

  setTheme: (theme) => {
    set({ theme });
    const user = get().user;
    if (user) {
      setDoc(doc(db, 'users', user.uid, 'settings', 'global'), { theme }, { merge: true });
    }
  },

  setSidebarOpen: (isOpen) => set({ isSidebarOpen: isOpen }),

  setGlobalStrategyNotes: async (notes) => {
    const user = get().user;
    if (!user) return;
    
    set({ globalStrategyNotes: notes }); // Optimistic
    try {
      const docRef = doc(db, 'users', user.uid, 'settings', 'global');
      await setDoc(docRef, { globalStrategyNotes: notes }, { merge: true });
    } catch (e) {
      console.error("Firebase write failed", e);
    }
  },

  fetchCreditCards: () => {
    const user = get().user;
    if (!user) return () => {};

    try {
      const cardsRef = collection(db, 'users', user.uid, 'creditCards');
      const unsubCards = onSnapshot(cardsRef, (snapshot) => {
        const catMap: Record<string, import('../core/models').FinanceCategory> = {
          'Dining': 'Restaurants',
          'Utility Bills': 'Utilities',
          'Souvenirs': 'Retail'
        };
        const cards = snapshot.docs.map(doc => {
          const data = doc.data() as any;
          if (data.categories) {
            data.categories = data.categories.map((c: string) => catMap[c] || c).filter((v: string, i: number, a: string[]) => a.indexOf(v) === i);
          }
          if (data.cashback) {
            const cb = { ...data.cashback } as Record<string, number>;
            for (const [oldCat, newCat] of Object.entries(catMap)) {
              if (cb[oldCat] !== undefined) {
                cb[newCat] = cb[oldCat];
                delete cb[oldCat];
              }
            }
            data.cashback = cb as any;
          }
          return { id: doc.id, ...data } as CreditCard;
        });
        set({ creditCards: cards });
      });
      
      const transRef = collection(db, 'users', user.uid, 'transactions');
      const unsubTrans = onSnapshot(transRef, (snapshot) => {
        const catMap: Record<string, import('../core/models').FinanceCategory> = {
          'Dining': 'Restaurants',
          'Utility Bills': 'Utilities',
          'Souvenirs': 'Retail'
        };
        const txs = snapshot.docs.map(doc => {
          const data = doc.data() as any;
          if (data.category && catMap[data.category]) {
            data.category = catMap[data.category];
          }
          if (data.manualCategory && catMap[data.manualCategory]) {
            data.manualCategory = catMap[data.manualCategory];
          }
          return { id: doc.id, ...data } as import('../core/models').Transaction;
        });
        set({ transactions: txs });
      });
      
      const settingsRef = doc(db, 'users', user.uid, 'settings', 'global');
      const unsubSettings = onSnapshot(settingsRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          set({ 
            globalStrategyNotes: data.globalStrategyNotes || '',
            theme: data.theme || 'slate'
          });
        } else {
          set({ globalStrategyNotes: '', theme: 'slate' });
        }
      });
      
      const logsRef = collection(db, 'users', user.uid, 'syncLogs');
      const unsubLogs = onSnapshot(logsRef, (snapshot) => {
        const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SyncLog));
        // Sort by timestamp descending
        logs.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
        set({ syncLogs: logs });
      });

      return () => {
        unsubCards();
        unsubTrans();
        unsubSettings();
        unsubLogs();
      };
    } catch (e) {
      console.error("Firebase not initialized", e);
      return () => {};
    }
  },

  addCreditCard: async (card) => {
    const user = get().user;
    if (!user) return;

    const id = crypto.randomUUID();
    const newCard = { ...card, id };
    set({ creditCards: [...get().creditCards, newCard] }); // Optimistic UI
    try {
      await setDoc(doc(db, 'users', user.uid, 'creditCards', id), newCard);
    } catch (e) {
      console.error(e);
    }
  },

  updateCreditCard: async (id, cardUpdate) => {
    const user = get().user;
    if (!user) return;

    set({ creditCards: get().creditCards.map(c => c.id === id ? { ...c, ...cardUpdate } : c) }); // Optimistic UI
    try {
      await updateDoc(doc(db, 'users', user.uid, 'creditCards', id), cardUpdate);
    } catch (e) {
      console.error(e);
    }
  },

  deleteCreditCard: async (id) => {
    const user = get().user;
    if (!user) return;

    set({ creditCards: get().creditCards.filter(c => c.id !== id) }); // Optimistic UI
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'creditCards', id));
    } catch (e) {
      console.error(e);
    }
  },

  updateTransaction: async (id, updates) => {
    const user = get().user;
    if (!user) return;
    set({
      transactions: get().transactions.map(t => t.id === id ? { ...t, ...updates } : t)
    });
    try {
      await updateDoc(doc(db, 'users', user.uid, 'transactions', id), updates);
    } catch (e) {
      console.error(e);
    }
  }
}));
