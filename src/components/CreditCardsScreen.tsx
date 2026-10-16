import { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Plus, Trash2, Edit3, Globe, Utensils, Plane, 
  Car, Bed, Activity, Fuel, ShoppingBag, Menu, X, Star, CreditCard as CardIcon, ShoppingCart, Tv, Zap, MonitorSmartphone, Eye, EyeOff, Hammer, Store, Smartphone, Ban, Settings
} from 'lucide-react';
import { useFinanceStore } from '../store/useFinanceStore';
import { CATEGORIES } from '../core/models';
import type { CreditCard, FinanceCategory, Transaction, CardOffer } from '../core/models';
import { ImageCropperModal } from './ImageCropperModal';
import { storage, functions } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { httpsCallable } from 'firebase/functions';

const CATEGORY_ICONS: Record<string, any> = {
  'Car Rental': <Car size={16} />,
  'Flights': <Plane size={16} />,
  'Gas': <Fuel size={16} />,
  'Restaurants': <Utensils size={16} />,
  'Lodging': <Bed size={16} />,
  'Groceries': <ShoppingCart size={16} />,
  'Online Shopping': <MonitorSmartphone size={16} />,
  'Streaming Services': <Tv size={16} />,
  'Utilities': <Zap size={16} />,
  'Travel': <Globe size={16} />,
  'PayPal': <Smartphone size={16} />,
  'Retail': <ShoppingBag size={16} />,
  'Home Improvement': <Hammer size={16} />,
  'Digital Wallet': <Smartphone size={16} />,
  'Store': <Store size={16} />,
  'Other': <Activity size={16} />,
  // Legacy aliases
  'Dining': <Utensils size={16} />,
  'Souvenirs': <ShoppingBag size={16} />,
  'Utility Bills': <Zap size={16} />,
};

const CATEGORY_COLORS: Record<string, string> = {
  'Car Rental': '#64D2FF',
  'Flights': '#0A84FF',
  'Gas': '#FFD60A',
  'Restaurants': '#BF5AF2',
  'Lodging': '#FF9F0A',
  'Groceries': '#34C759',
  'Online Shopping': '#FF375F',
  'Streaming Services': '#5E5CE6',
  'Utilities': '#FFD60A',
  'Travel': '#32ADE6',
  'PayPal': '#0A84FF',
  'Retail': '#FF2D55',
  'Home Improvement': '#FF9F0A',
  'Digital Wallet': '#32ADE6',
  'Store': '#FF2D55',
  'Other': 'var(--sys-label-secondary)',
  // Legacy aliases
  'Dining': '#BF5AF2',
  'Souvenirs': '#FF2D55',
  'Utility Bills': '#FFD60A',
};

function timeAgo(isoDate: string) {
  const date = new Date(isoDate);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return `just now`;
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays}d ago`;
}

export function isCategoryActive(card: CreditCard, ym: string, cat: FinanceCategory): boolean {
  if (card.historicalCashback && card.historicalCashback[ym] && card.historicalCashback[ym][cat] !== undefined) {
    return card.historicalCashback[ym][cat] !== -1;
  }
  return card.cashback?.[cat] !== undefined;
}

export function getActiveCategoriesForMonth(card: CreditCard, ym: string): FinanceCategory[] {
  return CATEGORIES.filter(cat => isCategoryActive(card, ym, cat));
}

export function getCardCashback(card: CreditCard, viewingMonth: string, category: FinanceCategory): number {
  if (card.historicalCashback && card.historicalCashback[viewingMonth] && card.historicalCashback[viewingMonth][category] !== undefined) {
    const val = card.historicalCashback[viewingMonth][category]!;
    if (val === -1) return card.baseCashback ?? 0;
    return val;
  }
  if (!isCategoryActive(card, viewingMonth, category)) {
    return card.baseCashback ?? 0;
  }
  return card.cashback?.[category] ?? card.baseCashback ?? 0;
}

export function isBaseCashback(card: CreditCard, viewingMonth: string, category: FinanceCategory): boolean {
  if (card.historicalCashback && card.historicalCashback[viewingMonth] && card.historicalCashback[viewingMonth][category] !== undefined) {
    return card.historicalCashback[viewingMonth][category] === -1;
  }
  if (card.cashback?.[category] !== undefined) {
    return false;
  }
  return card.baseCashback !== undefined;
}

export function getResolvedTransaction(tx: Transaction): Transaction {
  return {
    ...tx,
    merchantName: tx.manualMerchantName ?? tx.merchantName,
    amount: tx.manualAmount ?? tx.amount,
    date: tx.manualDate ?? tx.date,
    category: tx.manualCategory ?? tx.category,
  };
}

export default function CreditCardsScreen() {
  const { creditCards: storeCreditCards, transactions: storeTransactions, globalStrategyNotes, addCreditCard, updateCreditCard, deleteCreditCard, setGlobalStrategyNotes, setSidebarOpen, viewingMonth, setViewingMonth, showHiddenItems, setShowHiddenItems, updateTransaction, activeTab, setActiveTab } = useFinanceStore();
  
  const creditCards = useMemo(() => {
    return storeCreditCards.filter(c => showHiddenItems || !c.hidden);
  }, [storeCreditCards, showHiddenItems]);

  const transactions = useMemo(() => {
    const hiddenCardIds = new Set(storeCreditCards.filter(c => c.hidden).map(c => c.monarchId));
    return storeTransactions
      .map(getResolvedTransaction)
      .filter(tx => showHiddenItems || (!tx.hidden && !hiddenCardIds.has(tx.monarchAccountId)));
  }, [storeTransactions, storeCreditCards, showHiddenItems]);


  const [showSpendInEarned, setShowSpendInEarned] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingCard, setEditingCard] = useState<CreditCard | null>(null);

  const [showEarnRatesModal, setShowEarnRatesModal] = useState(false);
  const [editingEarnRatesCard, setEditingEarnRatesCard] = useState<CreditCard | null>(null);
  const [earnRatesNotes, setEarnRatesNotes] = useState('');
  
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [txDate, setTxDate] = useState('');
  const [txMerchant, setTxMerchant] = useState('');
  const [txAmount, setTxAmount] = useState('');
  const [txCategory, setTxCategory] = useState<FinanceCategory>('Other');
  const [txHidden, setTxHidden] = useState(false);
  const [txExcludeFromCashback, setTxExcludeFromCashback] = useState(false);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [expandedEarnedId, setExpandedEarnedId] = useState<string | null>(null);
  const [expandedOfferId, setExpandedOfferId] = useState<string | null>(null);
  const [cropperImage, setCropperImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const [isFabOpen, setIsFabOpen] = useState(false);

  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesInput, setNotesInput] = useState('');

  const startEditingNotes = () => {
    setNotesInput(globalStrategyNotes);
    setIsEditingNotes(true);
  };

  const handleSaveNotes = async () => {
    await setGlobalStrategyNotes(notesInput);
    setIsEditingNotes(false);
  };

  const handleSync = async () => {
    try {
      setIsSyncing(true);
      const syncFn = httpsCallable(functions, 'trigger_sync_monarch');
      await syncFn();
    } catch (e) {
      console.error('Failed to sync:', e);
      alert('Failed to sync.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Form states
  const [cardName, setCardName] = useState('');
  const [bankName, setBankName] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [cardLimit, setCardLimit] = useState('');
  const [lastFourDigits, setLastFourDigits] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [openedDate, setOpenedDate] = useState('');
  const [feesPaid, setFeesPaid] = useState('');
  const [baseCashback, setBaseCashback] = useState('');
  const [isAirlineCard, setIsAirlineCard] = useState(false);
  const [isHotelCard, setIsHotelCard] = useState(false);
  const [isHiddenCard, setIsHiddenCard] = useState(false);

  const [noForeignTxFee, setNoForeignTxFee] = useState(false);
  const [offers, setOffers] = useState<CardOffer[]>([]);
  const [cardLevelNotes, setCardLevelNotes] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<Record<FinanceCategory, boolean>>(
    CATEGORIES.reduce((acc, cat) => ({ ...acc, [cat]: false }), {} as Record<FinanceCategory, boolean>)
  );
  const [cashbackValues, setCashbackValues] = useState<Record<FinanceCategory, string>>(
    CATEGORIES.reduce((acc, cat) => ({ ...acc, [cat]: '1' }), {} as Record<FinanceCategory, string>)
  );

  const openAddModal = () => {
    setEditingCard(null);
    setCardName('');
    setBankName('');
    setImageUrl('');
    setCardLimit('');
    setLastFourDigits('');
    setDueDate('');
    setOpenedDate('');
    setFeesPaid('');
    setBaseCashback('');
    setIsAirlineCard(false);
    setIsHotelCard(false);
    setIsHiddenCard(false);
    setNoForeignTxFee(false);
    setOffers([]);
    setCardLevelNotes('');
    
    setSelectedCategories(CATEGORIES.reduce((acc, cat) => ({ ...acc, [cat]: false }), {} as Record<FinanceCategory, boolean>));
    setCashbackValues(CATEGORIES.reduce((acc, cat) => ({ ...acc, [cat]: '1' }), {} as Record<FinanceCategory, string>));
    
    setShowModal(true);
  };

  const openEditModal = (card: CreditCard) => {
    setEditingCard(card);
    setCardName(card.name);
    setBankName(card.bankName || '');
    setImageUrl(card.imageUrl || '');
    setCardLimit(card.cardLimit ? card.cardLimit.toString() : '');
    setLastFourDigits(card.lastFourDigits || '');
    setDueDate(card.dueDate !== undefined ? card.dueDate.toString() : '');
    setIsAirlineCard(card.isAirlineCard || false);
    setIsHotelCard(card.isHotelCard || false);
    setOpenedDate(card.openedDate || '');
    setFeesPaid(card.feesPaid !== undefined ? card.feesPaid.toString() : '');
    setBaseCashback(card.baseCashback !== undefined ? card.baseCashback.toString() : '1');
    setIsHiddenCard(card.hidden || false);
    setNoForeignTxFee(card.noForeignTxFee || false);
    setOffers(card.offers || []);
    setCardLevelNotes(card.notes || '');
    
    setShowModal(true);
  };

  const openEditEarnRatesModal = (card: CreditCard) => {
    setEditingEarnRatesCard(card);
    const cats = CATEGORIES.reduce((acc, cat) => ({ ...acc, [cat]: isCategoryActive(card, viewingMonth, cat) }), {} as Record<FinanceCategory, boolean>);
    
    const values = CATEGORIES.reduce((acc, cat) => {
      acc[cat] = getCardCashback(card, viewingMonth, cat).toString();
      return acc;
    }, {} as Record<FinanceCategory, string>);

    setSelectedCategories(cats);
    setCashbackValues(values);
    setEarnRatesNotes(card.notes || '');
    setShowEarnRatesModal(true);
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setCropperImage(URL.createObjectURL(file));
      e.target.value = '';
    }
  };

  const handleUrlPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    if (e.clipboardData.files && e.clipboardData.files.length > 0) {
      setCropperImage(URL.createObjectURL(e.clipboardData.files[0]));
      e.preventDefault();
      return;
    }
    const text = e.clipboardData.getData('text');
    if (text && (text.startsWith('http://') || text.startsWith('https://') || text.startsWith('data:image'))) {
      setCropperImage(text);
      e.preventDefault();
    }
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    setCropperImage(null);
    setIsUploading(true);
    try {
      const filename = `card-images/${Date.now()}.jpg`;
      const storageRef = ref(storage, filename);
      await uploadBytes(storageRef, croppedBlob);
      const url = await getDownloadURL(storageRef);
      setImageUrl(url);
    } catch (e) {
      console.error(e);
      alert('Failed to upload image. Ensure you are signed in and storage rules allow writing.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardName.trim()) return;

    const cardData: any = {
      name: cardName.trim(),
      bankName: bankName.trim() || undefined,
      imageUrl: imageUrl.trim() || undefined,
      cardLimit: cardLimit ? parseFloat(cardLimit) : undefined,
      lastFourDigits: lastFourDigits.trim() || undefined,
      dueDate: dueDate ? parseInt(dueDate, 10) : undefined,
      isAirlineCard,
      isHotelCard,
      openedDate: openedDate || undefined,
      feesPaid: feesPaid !== '' ? parseFloat(feesPaid) : undefined,
      baseCashback: baseCashback !== '' ? parseFloat(baseCashback) : undefined,
      noForeignTxFee,
      offers: offers,
      notes: cardLevelNotes.trim(),
      hidden: isHiddenCard,
    };

    if (!editingCard) {
      // For new cards, initialize empty categories
      cardData.categories = [];
      cardData.cashback = {};
      cardData.historicalCashback = {};
      await addCreditCard(cardData as Omit<CreditCard, 'id'>);
    } else {
      await updateCreditCard(editingCard.id, cardData);
    }
    setShowModal(false);
  };

  const handleSaveEarnRates = async (mode: 'current_and_future' | 'this_month') => {
    if (!editingEarnRatesCard) return;

    const categoriesList = CATEGORIES.filter(cat => selectedCategories[cat]);
    const cashbackMap: Record<string, number> = {};
    categoriesList.forEach(cat => {
      const parsed = parseFloat(cashbackValues[cat]);
      cashbackMap[cat] = isNaN(parsed) ? 1 : parsed;
    });

    const cardData: any = {
      categories: categoriesList,
      notes: earnRatesNotes.trim()
    };

    if (mode === 'current_and_future') {
      cardData.cashback = cashbackMap;
      
      const newHistorical = { ...(editingEarnRatesCard.historicalCashback || {}) };
      
      // 1. Clear any overrides for viewingMonth and future months,
      // because they will now use the new global base (cardData.cashback)
      Object.keys(newHistorical).forEach(ym => {
        if (ym >= viewingMonth) {
          categoriesList.forEach(cat => {
            if (newHistorical[ym][cat] !== undefined) {
              delete newHistorical[ym][cat];
            }
          });
          if (Object.keys(newHistorical[ym]).length === 0) {
            delete newHistorical[ym];
          }
        }
      });

      // 2. Freeze the past! For all months < viewingMonth, if they don't have an override,
      // they were relying on the OLD global base. Since we changed the global base,
      // we must explicitly write the old global base into historicalCashback.
      const pastMonths = new Set<string>();
      transactions.forEach(tx => {
        if (tx.monarchAccountId === editingEarnRatesCard.monarchId) {
          const ym = tx.date.substring(0, 7);
          if (ym < viewingMonth) {
            pastMonths.add(ym);
          }
        }
      });
      
      pastMonths.forEach(ym => {
        if (!newHistorical[ym]) newHistorical[ym] = {};
        CATEGORIES.forEach(cat => {
          if (newHistorical[ym][cat] === undefined) {
            const wasActive = editingEarnRatesCard.cashback?.[cat] !== undefined;
            if (wasActive) {
              newHistorical[ym][cat] = editingEarnRatesCard.cashback?.[cat] ?? 1;
            } else {
              newHistorical[ym][cat] = -1;
            }
          }
        });
      });

      cardData.historicalCashback = newHistorical;
    } else {
      cardData.cashback = editingEarnRatesCard.cashback || {};
      const newHistorical = { ...(editingEarnRatesCard.historicalCashback || {}) };
      
      const monthOverrides: Record<string, number> = {};
      CATEGORIES.forEach(cat => {
        if (selectedCategories[cat]) {
          const parsed = parseFloat(cashbackValues[cat]);
          monthOverrides[cat] = isNaN(parsed) ? 1 : parsed;
        } else {
          monthOverrides[cat] = -1;
        }
      });

      newHistorical[viewingMonth] = {
         ...(newHistorical[viewingMonth] || {}),
         ...monthOverrides
      };
      cardData.historicalCashback = newHistorical;
    }

    await updateCreditCard(editingEarnRatesCard.id, cardData);
    setShowEarnRatesModal(false);
    setEditingEarnRatesCard(null);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this credit card?')) {
      await deleteCreditCard(id);
    }
  };

  const openEditTransactionModal = (tx: Transaction) => {
    setEditingTx(tx);
    setTxDate(tx.date);
    setTxMerchant(tx.merchantName);
    setTxAmount(tx.amount.toString());
    setTxCategory(tx.category);
    setTxHidden(tx.hidden || false);
    setTxExcludeFromCashback(tx.excludeFromCashback || false);
  };

  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTx) return;
    
    await updateTransaction(editingTx.id, {
      manualDate: txDate,
      manualMerchantName: txMerchant,
      manualAmount: parseFloat(txAmount) || editingTx.amount,
      manualCategory: txCategory,
      hidden: txHidden,
      excludeFromCashback: txExcludeFromCashback
    });
    setEditingTx(null);
  };

  // Find best card per category
  const bestCardsMap = useMemo(() => {
    const map = CATEGORIES.reduce((acc, cat) => ({ ...acc, [cat]: [] }), {} as Record<FinanceCategory, { card: CreditCard; value: number }[]>);

    creditCards.forEach(card => {
      const activeCats = getActiveCategoriesForMonth(card, viewingMonth);
      activeCats.forEach(cat => {
        const val = getCardCashback(card, viewingMonth, cat);
        map[cat].push({ card, value: val });
      });
    });

    // Sort descending
    CATEGORIES.forEach(cat => {
      map[cat].sort((a, b) => b.value - a.value);
    });

    return map;
  }, [creditCards, viewingMonth]);

  const bestNoFtfCardsMap = useMemo(() => {
    const map = CATEGORIES.reduce((acc, cat) => ({ ...acc, [cat]: [] }), {} as Record<FinanceCategory, { card: CreditCard; value: number }[]>);

    creditCards.filter(c => c.noForeignTxFee).forEach(card => {
      const activeCats = getActiveCategoriesForMonth(card, viewingMonth);
      activeCats.forEach(cat => {
        const val = getCardCashback(card, viewingMonth, cat);
        map[cat].push({ card, value: val });
      });
    });

    CATEGORIES.forEach(cat => {
      map[cat].sort((a, b) => b.value - a.value);
    });

    return map;
  }, [creditCards, viewingMonth]);



  const earnedCashbackStats = useMemo(() => {
    const map = CATEGORIES.reduce((acc, cat) => ({ ...acc, [cat]: [] }), {} as Record<FinanceCategory, { card: CreditCard; cashback: number; spend: number }[]>);

    const spendByCardIdAndCat: Record<string, Record<FinanceCategory, number>> = {};
    const monarchIdToCardId: Record<string, string> = {};
    creditCards.forEach(card => {
      spendByCardIdAndCat[card.id] = CATEGORIES.reduce((acc, cat) => ({ ...acc, [cat]: 0 }), {} as Record<FinanceCategory, number>);
      if (card.monarchId) {
        monarchIdToCardId[card.monarchId] = card.id;
      }
    });

    transactions.forEach(tx => {
      if (tx.date.startsWith(viewingMonth)) {
        if (tx.excludeFromCashback) return;
        const cardId = monarchIdToCardId[tx.monarchAccountId];
        if (cardId && spendByCardIdAndCat[cardId] && spendByCardIdAndCat[cardId][tx.category] !== undefined) {
          spendByCardIdAndCat[cardId][tx.category] += (-tx.amount);
        }
      }
    });

    CATEGORIES.forEach(cat => {
      creditCards.forEach(card => {
        const spend = spendByCardIdAndCat[card.id][cat];
        if (spend > 0) {
          const cbPercent = getCardCashback(card, viewingMonth, cat);
          const cashback = spend * (cbPercent / 100);
          map[cat].push({ card, cashback, spend });
        }
      });
      map[cat].sort((a, b) => b.cashback - a.cashback);
    });

    return map;
  }, [creditCards, transactions, viewingMonth]);

  const currentMap = activeTab === 'no-ftf' ? bestNoFtfCardsMap : bestCardsMap;

  const uniqueBankNames = useMemo(() => {
    const banks = new Set<string>();
    creditCards.forEach(c => c.bankName && banks.add(c.bankName));
    return Array.from(banks).sort();
  }, [creditCards]);

  const sortedManageCards = useMemo(() => {
    return [...creditCards].sort((a, b) => {
      const bankA = a.bankName || '';
      const bankB = b.bankName || '';
      if (bankA && !bankB) return -1;
      if (!bankA && bankB) return 1;
      return bankA.localeCompare(bankB);
    });
  }, [creditCards]);

  const lastSyncTime = useMemo(() => {
    let latest = 0;
    creditCards.forEach(card => {
      if (card.lastSyncedAt) {
        const time = new Date(card.lastSyncedAt).getTime();
        if (time > latest) latest = time;
      }
    });
    return latest > 0 ? timeAgo(new Date(latest).toISOString()) : null;
  }, [creditCards]);



  const monthScrollRef = useRef<HTMLDivElement>(null);

  const monthsList = useMemo(() => {
    const today = new Date();
    const currentMonthDate = new Date(today.getFullYear(), today.getMonth(), 1);
    return Array.from({ length: 25 }, (_, i) => {
      const d = new Date(currentMonthDate);
      d.setMonth(d.getMonth() - 12 + i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      return {
        id: `${yyyy}-${mm}`,
        label: d.toLocaleDateString('en-US', { month: 'short' }),
        year: yyyy
      };
    });
  }, []);

  useEffect(() => {
    if (monthScrollRef.current) {
      const activeBtn = monthScrollRef.current.querySelector('[data-active="true"]');
      if (activeBtn) {
        activeBtn.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'center' });
      }
    }
  }, []);

  return (
    <div className="safe-area-inset" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header className="screen-header" style={{ paddingBottom: '0', paddingLeft: 0, paddingRight: 0, borderBottom: 'none', boxShadow: 'none', display: 'flex', flexDirection: 'column', gap: 0 }}>
        <div style={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', left: '12px', top: 0, bottom: 0, zIndex: 10, display: 'flex', alignItems: 'center' }}>
            <button className="header-icon-btn" onClick={() => setSidebarOpen(true)}>
              <Menu size={24} />
            </button>
          </div>
          <div style={{ display: 'flex', gap: '4px', width: '100%', overflowX: 'auto', padding: '16px 20px 8px 20px', msOverflowStyle: 'none', scrollbarWidth: 'none', justifyContent: 'center' }} className="hide-scroll">
            {[
              { id: 'categories', label: 'Categories' },
              { id: 'cashback', label: 'Cashback' },
              { id: 'offers', label: 'Offers' }
            ].map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} style={{
                flex: '0 1 auto', padding: '6px 12px', borderRadius: '24px', fontSize: '14px', fontWeight: 600,
                background: activeTab === tab.id ? 'rgba(255,255,255,0.15)' : 'transparent',
                color: activeTab === tab.id ? '#fff' : 'var(--sys-label-secondary)',
                border: activeTab === tab.id ? '1px solid rgba(255,255,255,0.2)' : '1px solid transparent',
                cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap',
                backdropFilter: activeTab === tab.id ? 'blur(10px)' : 'none',
                WebkitBackdropFilter: activeTab === tab.id ? 'blur(10px)' : 'none',
                zIndex: activeTab === tab.id ? 2 : 1
              }}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', marginBottom: '16px', width: '100%', overflow: 'hidden' }}>
        <div ref={monthScrollRef} style={{ 
          display: 'flex', gap: '4px', overflowX: 'auto', 
          padding: '6px 20px', margin: 0, width: '100%',
          borderRadius: 0, background: 'rgba(255,255,255,0.05)', 
          borderTop: '1px solid rgba(255,255,255,0.1)', borderBottom: '1px solid rgba(255,255,255,0.1)', 
          backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
          msOverflowStyle: 'none', scrollbarWidth: 'none'
        }} className="hide-scroll">
          {monthsList.map(m => (
            <button 
              key={m.id} 
              data-active={viewingMonth === m.id}
              onClick={() => setViewingMonth(m.id)} 
              style={{
                padding: '6px 16px', borderRadius: '18px', border: 'none', 
                background: viewingMonth === m.id ? 'rgba(255,255,255,0.2)' : 'transparent',
                color: viewingMonth === m.id ? '#fff' : 'var(--sys-label-secondary)',
                fontWeight: viewingMonth === m.id ? 700 : 500,
                fontSize: '14px',
                cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap',
                boxShadow: viewingMonth === m.id ? '0 2px 8px rgba(0,0,0,0.2)' : 'none'
              }}
            >
              {m.label} {m.year !== new Date().getFullYear() && <span style={{fontSize: '12px', opacity: 0.7, marginLeft: '4px'}}>{m.year}</span>}
            </button>
          ))}
        </div>
      </div>
      </header>

      {/* Scrollable Content */}
      <div style={{ padding: '0 24px 120px 24px', flex: 1, overflowY: 'auto' }}>
        {/* Notes & Strategy Section */}
        {(activeTab === 'categories' || activeTab === 'no-ftf') && (
          <div style={{
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '20px', padding: '16px 20px', backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)', marginBottom: '20px', position: 'relative'
          }}>
            {isEditingNotes ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--sys-blue)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Edit Strategy & Notes
                  </span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      type="button" onClick={() => setIsEditingNotes(false)}
                      style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '8px', padding: '4px 8px', color: 'var(--sys-label-secondary)', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                    >Cancel</button>
                    <button 
                      type="button" onClick={handleSaveNotes}
                      style={{ background: 'var(--sys-blue)', border: 'none', borderRadius: '8px', padding: '4px 10px', color: '#fff', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                    >Save</button>
                  </div>
                </div>
                <textarea
                  value={notesInput} onChange={e => setNotesInput(e.target.value)}
                  placeholder="e.g. Keep utilization under 10%. Chase 5/24 rule."
                  style={{
                    width: '100%', height: '80px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '10px', padding: '10px', color: '#fff', fontSize: '14px', outline: 'none', resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box'
                  }} autoFocus
                />
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--sys-label-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Global Strategy & Notes
                  </span>
                  <button onClick={startEditingNotes} style={{ background: 'none', border: 'none', color: 'var(--sys-blue)', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', padding: 0 }}>
                    <Edit3 size={12} /> Edit
                  </button>
                </div>
                {globalStrategyNotes ? (
                  <ul style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {globalStrategyNotes.split('\n').filter(line => line.trim()).map((noteLine, idx) => (
                      <li key={idx} style={{ fontSize: '14px', color: '#fff', opacity: 0.9, lineHeight: '1.5', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                        {noteLine}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p style={{ fontSize: '13px', color: 'var(--sys-label-secondary)', margin: 0, fontStyle: 'italic', opacity: 0.8, cursor: 'pointer' }} onClick={startEditingNotes}>
                    Add general strategy notes for your cards. Click Edit to add.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {(activeTab === 'categories' || activeTab === 'no-ftf') && (
          /* ── Category Guide View ── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {CATEGORIES.map(cat => {
              const contenders = currentMap[cat];
              const maxCashback = contenders.length > 0 ? contenders[0].value : 0;
              
              return (
                <div key={cat} style={{
                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: '20px', padding: '18px', backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                }}>
                  {/* Category Header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                    <div style={{
                      width: '32px', height: '32px', borderRadius: '8px', background: CATEGORY_COLORS[cat] + '22',
                      color: CATEGORY_COLORS[cat], display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {CATEGORY_ICONS[cat]}
                    </div>
                    <span style={{ fontSize: '16px', fontWeight: 800, color: '#fff' }}>{cat}</span>
                  </div>

                  {/* Cards ranked */}
                  {contenders.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {contenders.map((entry, idx) => {
                        const isBest = entry.value === maxCashback;
                        return (
                          <div key={entry.card.id} style={{
                            display: 'flex', flexDirection: 'column', gap: '12px',
                            background: isBest ? 'rgba(10, 132, 255, 0.08)' : 'rgba(255,255,255,0.02)',
                            border: isBest ? '1px solid rgba(10, 132, 255, 0.3)' : '1px solid rgba(255,255,255,0.05)',
                            borderRadius: '12px', padding: '16px',
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                {isBest ? (
                                  <Star size={20} color="#FFD60A" fill="#FFD60A" style={{ flexShrink: 0 }} />
                                ) : (
                                  <div style={{ width: 20, height: 20, border: '1px solid rgba(255,255,255,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800, color: 'var(--sys-label-secondary)', flexShrink: 0 }}>
                                    {idx + 1}
                                  </div>
                                )}
                                {entry.card.imageUrl && (
                                  <img src={entry.card.imageUrl} alt={entry.card.name} style={{ width: '96px', height: '60px', objectFit: 'cover', borderRadius: '6px', flexShrink: 0 }} />
                                )}
                              </div>
                              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                <span style={{ fontSize: '24px', fontWeight: 900, color: isBest ? '#fff' : 'var(--sys-label-secondary)' }}>
                                  {entry.value}%
                                </span>
                                <div style={{ fontSize: '10px', color: 'var(--sys-label-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px' }}>Cashback</div>
                              </div>
                            </div>
                            <div style={{ fontSize: '16px', fontWeight: 700, color: '#fff', paddingLeft: '32px' }}>
                              {entry.card.name}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ fontSize: '13px', color: 'var(--sys-label-secondary)', padding: '6px 0', opacity: 0.8 }}>
                      No cards assigned.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {activeTab === 'cashback' && (
          /* ── Earned Cashback View ── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {CATEGORIES.map(cat => {
              const contenders = earnedCashbackStats[cat];
              const totalEarned = contenders.reduce((sum, entry) => sum + entry.cashback, 0);
              const totalSpend = contenders.reduce((sum, entry) => sum + entry.spend, 0);

              if (totalEarned === 0) return null;
              
              return (
                <div key={cat} style={{
                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: '20px', padding: '18px', backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                }}>
                  {/* Category Header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '32px', height: '32px', borderRadius: '8px', background: CATEGORY_COLORS[cat] + '22',
                        color: CATEGORY_COLORS[cat], display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {CATEGORY_ICONS[cat]}
                      </div>
                      <span style={{ fontSize: '16px', fontWeight: 800, color: '#fff' }}>{cat}</span>
                    </div>
                    <div style={{ textAlign: 'right', cursor: 'pointer' }} onClick={() => setShowSpendInEarned(s => !s)}>
                      <span style={{ fontSize: '16px', fontWeight: 900, color: '#fff' }}>${(showSpendInEarned ? totalSpend : totalEarned).toFixed(2)}</span>
                      <div style={{ fontSize: '9px', color: 'var(--sys-label-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px' }}>{showSpendInEarned ? 'Spent' : 'Cashback'}</div>
                    </div>
                  </div>

                  {/* Cards ranked by cashback earned */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {contenders.map((entry, idx) => {
                      const itemId = `${cat}-${entry.card.id}`;
                      const isExpanded = expandedEarnedId === itemId;
                      
                      return (
                        <div key={entry.card.id} style={{ display: 'flex', flexDirection: 'column', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', overflow: 'hidden' }}>
                          <div 
                            onClick={() => setExpandedEarnedId(isExpanded ? null : itemId)}
                            style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              padding: '12px 14px', cursor: 'pointer',
                              background: isExpanded ? 'rgba(255,255,255,0.02)' : 'transparent',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                              <div style={{ width: 16, height: 16, border: '1px solid rgba(255,255,255,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 800, color: 'var(--sys-label-secondary)', flexShrink: 0 }}>
                                {idx + 1}
                              </div>
                              {entry.card.imageUrl && (
                                <img src={entry.card.imageUrl} alt={entry.card.name} style={{ width: '48px', height: '30px', objectFit: 'cover', borderRadius: '4px', flexShrink: 0 }} />
                              )}
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {entry.card.name}
                                </div>
                                <div style={{ fontSize: '11px', color: 'var(--sys-label-secondary)', marginTop: '2px' }}>
                                  ${entry.spend.toFixed(2)} spent • {getCardCashback(entry.card, viewingMonth, cat)}% CB
                                </div>
                              </div>
                            </div>

                            <div style={{ textAlign: 'right', marginLeft: '12px', flexShrink: 0, cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); setShowSpendInEarned(s => !s); }}>
                              <span style={{ fontSize: '18px', fontWeight: 900, color: showSpendInEarned ? '#fff' : '#30D158' }}>
                                {showSpendInEarned ? '' : '+'}${showSpendInEarned ? entry.spend.toFixed(2) : entry.cashback.toFixed(2)}
                              </span>
                              <div style={{ fontSize: '9px', color: 'var(--sys-label-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '1px' }}>{showSpendInEarned ? 'Spent' : 'Cashback'}</div>
                            </div>
                          </div>
                          
                          {isExpanded && (
                            <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '12px 14px', background: 'rgba(0,0,0,0.2)' }}>
                              {(() => {
                                
                                const cardTxs = transactions.filter(tx => 
                                  tx.monarchAccountId === entry.card.monarchId && 
                                  tx.category === cat &&
                                  tx.date.startsWith(viewingMonth) &&
                                  !tx.excludeFromCashback
                                ).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                                
                                if (cardTxs.length === 0) return null;
                                
                                return (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    {cardTxs.map(tx => {
                                      const cbPercent = getCardCashback(entry.card, viewingMonth, cat);
                                      const isBase = isBaseCashback(entry.card, viewingMonth, cat);
                                      const txAmount = -tx.amount;
                                      const cbEarned = txAmount * ((cbPercent ?? 0) / 100);
                                      return (
                                        <div key={tx.id} onClick={() => openEditTransactionModal(tx)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.03)' }}>
                                          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, paddingRight: '12px' }}>
                                            <span style={{ color: '#fff', fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tx.merchantName}</span>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                                              <span style={{ color: 'var(--sys-label-secondary)', fontSize: '11px' }}>{new Date(tx.date + 'T12:00:00').toLocaleDateString()}</span>
                                              {(cbPercent ?? 0) > 0 && (
                                                <span style={{ 
                                                  background: isBase ? 'rgba(255,255,255,0.1)' : 'rgba(48, 209, 88, 0.15)', 
                                                  color: isBase ? 'var(--sys-label-secondary)' : '#30D158', 
                                                  padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 800 }}>
                                                  {cbPercent}% CB
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                          <span style={{ color: showSpendInEarned ? '#fff' : '#30D158', fontSize: '13px', fontWeight: 700, flexShrink: 0 }}>
                                            {showSpendInEarned ? '' : '+'}${showSpendInEarned ? txAmount.toFixed(2) : cbEarned.toFixed(2)}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                );
                              })()}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            
            {CATEGORIES.every(cat => earnedCashbackStats[cat].length === 0) && (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--sys-label-secondary)' }}>
                No cashback earned in this month.
              </div>
            )}
          </div>
        )}


        {activeTab === 'offers' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {(() => {
              const [viewingYear, viewingMonthNum] = viewingMonth.split('-').map(Number);
              const viewingStart = new Date(viewingYear, viewingMonthNum - 1, 1).getTime();
              const viewingEnd = new Date(viewingYear, viewingMonthNum, 0, 23, 59, 59, 999).getTime();

              const offersToRender = creditCards.flatMap(card => (card.offers || []).map(offer => ({ card, offer })))
                .filter(({ offer }) => {
                  const sd = offer.startDate ? new Date(offer.startDate + 'T12:00:00').getTime() : -Infinity;
                  const ed = offer.endDate ? new Date(offer.endDate + 'T12:00:00').setHours(23, 59, 59, 999) : Infinity;
                  return viewingEnd >= sd && viewingStart <= ed;
                });

              if (offersToRender.length === 0) {
                return (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--sys-label-secondary)' }}>
                    No active offers for {viewingMonth}. You can add special offers in the Manage Cards section.
                  </div>
                );
              }

              return offersToRender.map(({ card, offer }) => {
                const txs = transactions.filter(tx => {
                  if (tx.monarchAccountId !== card.monarchId) return false;
                  if (offer.eligibleCategories && offer.eligibleCategories.length > 0) {
                    if (!offer.eligibleCategories.includes(tx.category)) return false;
                  }
                  
                  const txDate = new Date(tx.date + 'T12:00:00').getTime();
                  
                  if (offer.isMonthly) {
                    // Only include transactions from the viewing month
                    if (txDate < viewingStart || txDate > viewingEnd) return false;
                  } else {
                    // Include transactions from the offer's total date range
                    const sd = offer.startDate ? new Date(offer.startDate + 'T12:00:00').getTime() : -Infinity;
                    const ed = offer.endDate ? new Date(offer.endDate + 'T12:00:00').setHours(23, 59, 59, 999) : Infinity;
                    if (txDate < sd || txDate > ed) return false;
                  }
                  
                  return true;
                });

                const spend = txs.reduce((acc, tx) => acc + (-tx.amount), 0);
                const percent = Math.min(100, Math.round((spend / offer.spendTarget) * 100));
                const isExpanded = expandedOfferId === offer.id;

                return (
                  <div key={offer.id} style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderRadius: '20px', padding: '20px', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }} onClick={() => setExpandedOfferId(isExpanded ? null : offer.id)}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                       <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                         <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#fff' }}>{offer.title}</h3>
                         {offer.isMonthly && (
                           <span style={{ fontSize: '10px', fontWeight: 800, background: 'rgba(255,255,255,0.1)', color: '#fff', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase' }}>Monthly</span>
                         )}
                       </div>
                       <div style={{ fontSize: '18px', fontWeight: 800, color: '#30D158' }}>${offer.rewardAmount}</div>
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--sys-label-secondary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                       {card.imageUrl ? (
                         <img src={card.imageUrl} alt={card.name} style={{ height: '20px', width: '32px', borderRadius: '4px', objectFit: 'contain', backgroundColor: 'rgba(255,255,255,0.05)' }} />
                       ) : (
                         <CardIcon size={14} /> 
                       )}
                       <span>{card.name}</span>
                       <span style={{ margin: '0 4px', opacity: 0.3 }}>•</span> 
                       {offer.startDate || 'Any'} to {offer.endDate || 'Any'}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700, marginBottom: '8px', color: 'var(--sys-label-secondary)' }}>
                       <span style={{ color: '#fff' }}>${spend.toFixed(2)} spent</span>
                       <span>Target: ${offer.spendTarget}</span>
                    </div>
                    <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                       <div style={{ width: `${percent}%`, height: '100%', background: percent >= 100 ? '#30D158' : '#0A84FF', transition: 'width 0.5s ease-out' }} />
                    </div>
                    {percent >= 100 && (
                      <div style={{ marginTop: '12px', fontSize: '13px', fontWeight: 800, color: '#30D158', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Zap size={14} /> Offer Completed!
                      </div>
                    )}
                    
                    {isExpanded && txs.length > 0 && (
                      <div style={{ marginTop: '16px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--sys-label-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Applicable Transactions</div>
                        {txs.slice(0, 20).map(tx => (
                          <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tx.merchantName}</div>
                              <div style={{ fontSize: '12px', color: 'var(--sys-label-secondary)' }}>{tx.date} • {tx.category}</div>
                            </div>
                            <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', paddingLeft: '12px' }}>
                              ${Math.abs(tx.amount).toFixed(2)}
                            </div>
                          </div>
                        ))}
                        {txs.length > 20 && (
                          <div style={{ fontSize: '12px', color: 'var(--sys-label-secondary)', textAlign: 'center', marginTop: '8px' }}>
                            + {txs.length - 20} more transactions
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              });
            })()}
          </div>
        )}

        {activeTab === 'manage' && (
          /* ── Manage Cards View ── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <button onClick={openAddModal} className="btn-glass-blue" style={{ width: '100%', padding: '16px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '15px' }}>
              <Plus size={20} /> Add Credit Card
            </button>

            {creditCards.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--sys-label-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                <CardIcon size={48} opacity={0.15} />
                <p style={{ fontSize: '14px', maxWidth: '280px', lineHeight: '1.4' }}>No credit cards added. Add cards to see which ones to use for daily spend!</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {sortedManageCards.map((card, index) => {
                  const showHeader = index === 0 || card.bankName !== sortedManageCards[index - 1].bankName;
                  const bankDisplay = card.bankName || 'Other Cards';
                  
                  return (
                    <div key={card.id} style={{ display: 'contents' }}>
                      {showHeader && (
                        <h2 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--sys-label-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: index === 0 ? '4px 0 -4px 0' : '16px 0 -4px 0', paddingLeft: '4px' }}>
                          {bankDisplay}
                        </h2>
                      )}
                      <div 
                        style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '20px', position: 'relative', overflow: 'hidden', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', cursor: 'pointer' }}
                        onClick={() => setExpandedCardId(expandedCardId === card.id ? null : card.id)}
                      >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
                      <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, display: 'flex', alignItems: 'center' }}>
                        {card.hidden && <EyeOff size={16} color="var(--sys-label-secondary)" style={{ marginRight: '6px', flexShrink: 0 }} />}
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {card.name} {card.lastFourDigits ? `(${card.lastFourDigits})` : ''}
                        </span>
                      </h3>
                      <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                        <button onClick={(e) => { e.stopPropagation(); openEditModal(card); }} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '10px', padding: '8px', color: 'var(--sys-label-secondary)', cursor: 'pointer' }}><Edit3 size={16} /></button>
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(card.id); }} style={{ background: 'rgba(255, 59, 48, 0.1)', border: 'none', borderRadius: '10px', padding: '8px', color: '#FF3B30', cursor: 'pointer' }}><Trash2 size={16} /></button>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', marginBottom: '16px' }}>
                      {card.imageUrl && (
                        <img src={card.imageUrl} alt={card.name} style={{ width: '128px', height: '80px', objectFit: 'cover', borderRadius: '10px', flexShrink: 0 }} />
                      )}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                          {card.bankName && <span style={{ fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', background: 'rgba(255,255,255,0.1)', color: '#fff' }}>{card.bankName}</span>}
                          {card.noForeignTxFee ? (
                            <span style={{ fontSize: '10px', fontWeight: 800, padding: '3px 8px', borderRadius: '6px', background: 'rgba(48, 209, 88, 0.15)', color: '#30D158', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Globe size={10} /> No FTF
                            </span>
                          ) : (
                            <span style={{ fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', color: 'var(--sys-label-secondary)' }}>FTF Applies</span>
                          )}
                          {card.isAirlineCard && <span style={{ fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', background: 'rgba(10, 132, 255, 0.15)', color: '#0A84FF', display: 'flex', alignItems: 'center', gap: '4px' }}><Plane size={10} /> Airline</span>}
                          {card.isHotelCard && <span style={{ fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', background: 'rgba(255, 159, 10, 0.15)', color: '#FF9F0A', display: 'flex', alignItems: 'center', gap: '4px' }}><Bed size={10} /> Hotel</span>}
                        </div>
                        {card.currentBalance !== undefined && (
                          <div style={{ fontSize: '12px', color: 'var(--sys-label-secondary)', marginTop: '4px' }}>
                            Balance: <strong style={{color: '#fff'}}>${(-card.currentBalance).toFixed(2)}</strong>
                          </div>
                        )}
                        {card.lastSyncedAt && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--sys-label-secondary)', marginTop: '4px' }}>
                            <Activity size={12} color="#30D158" /> 
                            <span>Synced {timeAgo(card.lastSyncedAt)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Meta info grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px', fontSize: '12px', color: 'var(--sys-label-secondary)' }}>
                        {card.cardLimit ? <div>Limit: <strong>${card.cardLimit}</strong></div> : <div />}
                        {card.dueDate ? <div>Due Date: <strong>{card.dueDate}th</strong></div> : <div />}
                        {card.feesPaid ? <div>Annual Fee: <strong>${card.feesPaid}</strong></div> : <div />}
                        {card.openedDate ? <div>Opened: <strong>{card.openedDate}</strong></div> : <div />}
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <h4 style={{ fontSize: '11px', fontWeight: 800, color: 'var(--sys-label-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Earn Rates</h4>
                        <button onClick={(e) => { e.stopPropagation(); openEditEarnRatesModal(card); }} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '4px', padding: '2px 6px', color: '#fff', fontSize: '10px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Edit3 size={10} /> Edit
                        </button>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {getActiveCategoriesForMonth(card, viewingMonth).map(cat => (
                          <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '6px 10px', whiteSpace: 'nowrap' }}>
                            <span style={{ color: CATEGORY_COLORS[cat] }}>{CATEGORY_ICONS[cat]}</span>
                            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--sys-label-secondary)' }}>{cat}:</span>
                            <span style={{ fontSize: '12px', fontWeight: 800, color: '#fff' }}>{getCardCashback(card, viewingMonth, cat)}%</span>
                          </div>
                        ))}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '6px 10px', whiteSpace: 'nowrap' }}>
                          <span style={{ color: 'var(--sys-label-secondary)' }}><CardIcon size={16} /></span>
                          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--sys-label-secondary)' }}>Base:</span>
                          <span style={{ fontSize: '12px', fontWeight: 800, color: '#fff' }}>{card.baseCashback ?? 1}%</span>
                        </div>
                      </div>
                    </div>

                    {expandedCardId === card.id && (
                      <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                        <h4 style={{ fontSize: '11px', fontWeight: 800, color: 'var(--sys-label-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 12px 0' }}>Current Month Transactions</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {(() => {
                            const cardTxs = transactions.filter(tx => tx.monarchAccountId === card.monarchId && tx.date.startsWith(viewingMonth)).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                            
                            if (cardTxs.length === 0) {
                              return <div style={{ color: 'var(--sys-label-secondary)', fontSize: '13px', textAlign: 'center', padding: '12px' }}>No transactions this month</div>;
                            }
                    
                            return cardTxs.map(tx => {
                               const cat = tx.category;
                               const cbPercent = getCardCashback(card, viewingMonth, cat);
                               const isBase = isBaseCashback(card, viewingMonth, cat);
                               return (
                                 <div key={tx.id} onClick={() => openEditTransactionModal(tx)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, paddingRight: '12px' }}>
                                      <span style={{ color: '#fff', fontSize: '14px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center' }}>
                                        {tx.hidden && <EyeOff size={14} color="var(--sys-label-secondary)" style={{ marginRight: '4px', flexShrink: 0 }} />}
                                        {tx.excludeFromCashback && <Ban size={14} color="var(--sys-label-secondary)" style={{ marginRight: '4px', flexShrink: 0 }} />}
                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{tx.merchantName}</span>
                                      </span>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                                        <span style={{ color: 'var(--sys-label-secondary)', fontSize: '11px' }}>{new Date(tx.date + 'T12:00:00').toLocaleDateString()}</span>
                                        {(cbPercent ?? 0) > 0 && (
                                          <span style={{ 
                                            background: isBase ? 'rgba(255,255,255,0.1)' : 'rgba(48, 209, 88, 0.15)', 
                                            color: isBase ? 'var(--sys-label-secondary)' : '#30D158', 
                                            padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 800 }}>
                                            {cbPercent}% CB
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <span style={{ color: '#fff', fontSize: '14px', fontWeight: 700, flexShrink: 0 }}>${(-tx.amount).toFixed(2)}</span>
                                 </div>
                               );
                            });
                          })()}
                        </div>
                      </div>
                    )}

                    {expandedCardId !== card.id && (
                      <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'center' }}>
                        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '6px 12px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, color: 'var(--sys-label-secondary)' }}>
                          {transactions.filter(tx => tx.monarchAccountId === card.monarchId && tx.date.startsWith(viewingMonth)).length} Transactions this month
                        </div>
                      </div>
                    )}
                    
                    {/* Sync Status moved to tags area */}
                  </div>
                </div>
                );
              })}
              </div>
            )}
          </div>
        )}


      </div>

      {/* ── Add/Edit Card Modal ── */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)} style={{ zIndex: 12000 }}>
          <div className="modal-sheet" style={{ maxWidth: '600px', width: '90%' }} onClick={e => e.stopPropagation()}>
            <div className="modal-pull-indicator" />
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#fff' }}>
                {editingCard ? 'Edit Credit Card' : 'Add Credit Card'}
              </h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--sys-label-secondary)', cursor: 'pointer', padding: '4px' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', paddingBottom: '40px', paddingRight: '12px' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="edit-field-group" style={{ marginBottom: 0 }}>
                  <label className="edit-field-label">Card Name *</label>
                  <input type="text" required value={cardName} onChange={e => setCardName(e.target.value)} className="edit-field-input" autoFocus />
                </div>
                <div className="edit-field-group" style={{ marginBottom: 0 }}>
                  <label className="edit-field-label">Bank Name</label>
                  <input type="text" list="bankList" value={bankName} onChange={e => setBankName(e.target.value)} className="edit-field-input" />
                  <datalist id="bankList">
                    {uniqueBankNames.map(bank => (
                      <option key={bank} value={bank} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="edit-field-group" style={{ marginBottom: 0 }}>
                <label className="edit-field-label">Card Image</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {imageUrl ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ position: 'relative' }}>
                          <img src={imageUrl} alt="Card preview" style={{ width: '80px', height: '50px', objectFit: 'cover', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)' }} />
                          <button type="button" onClick={() => setImageUrl('')} style={{ position: 'absolute', top: '-8px', right: '-8px', background: 'rgba(255,59,48,0.9)', color: '#fff', border: 'none', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}><X size={12} /></button>
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--sys-label-secondary)', fontStyle: 'italic' }}>Hit 'Save' below to keep changes</span>
                      </div>
                    ) : (
                      <div style={{ flex: 1, position: 'relative' }}>
                        <input 
                          type="text" 
                          placeholder="Paste URL or image from clipboard..." 
                          onPaste={handleUrlPaste}
                          className="edit-field-input" 
                          style={{ paddingRight: '100px' }}
                        />
                        <label style={{ position: 'absolute', right: '4px', top: '4px', bottom: '4px', background: 'rgba(255,255,255,0.1)', color: '#fff', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 12px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                          Browse
                          <input type="file" accept="image/*" onChange={handleImageFileChange} style={{ display: 'none' }} />
                        </label>
                      </div>
                    )}
                    {isUploading && <span style={{ color: 'var(--sys-label-secondary)', fontSize: '12px', fontWeight: 600 }}>Uploading...</span>}
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="edit-field-group" style={{ marginBottom: 0 }}>
                  <label className="edit-field-label">Last 4 Digits</label>
                  <input type="text" maxLength={4} value={lastFourDigits} onChange={e => setLastFourDigits(e.target.value)} className="edit-field-input" />
                </div>
                <div className="edit-field-group" style={{ marginBottom: 0 }}>
                  <label className="edit-field-label">Credit Limit ($)</label>
                  <input type="number" value={cardLimit} onChange={e => setCardLimit(e.target.value)} className="edit-field-input" />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="edit-field-group" style={{ marginBottom: 0 }}>
                  <label className="edit-field-label">Due Date (1-31)</label>
                  <input type="number" min="1" max="31" value={dueDate} onChange={e => setDueDate(e.target.value)} className="edit-field-input" />
                </div>
                <div className="edit-field-group" style={{ marginBottom: 0 }}>
                  <label className="edit-field-label">Opened Date</label>
                  <input type="date" value={openedDate} onChange={e => setOpenedDate(e.target.value)} className="edit-field-input" />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="edit-field-group" style={{ marginBottom: 0 }}>
                  <label className="edit-field-label">Annual Fee ($)</label>
                  <input type="number" value={feesPaid} onChange={e => setFeesPaid(e.target.value)} className="edit-field-input" />
                </div>
                <div className="edit-field-group" style={{ marginBottom: 0 }}>
                  <label className="edit-field-label">Base Cashback (%)</label>
                  <input type="number" step="0.01" min="0" max="100" value={baseCashback} onChange={e => setBaseCashback(e.target.value)} className="edit-field-input" />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fff', fontSize: '14px', background: 'rgba(255,255,255,0.05)', padding: '8px 12px', borderRadius: '8px' }}>
                    <input type="checkbox" checked={noForeignTxFee} onChange={e => setNoForeignTxFee(e.target.checked)} />
                    No Foreign Transaction Fees
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fff', fontSize: '14px', background: 'rgba(255,255,255,0.05)', padding: '8px 12px', borderRadius: '8px' }}>
                    <input type="checkbox" checked={isAirlineCard} onChange={e => setIsAirlineCard(e.target.checked)} />
                    Airline Card
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fff', fontSize: '14px', background: 'rgba(255,255,255,0.05)', padding: '8px 12px', borderRadius: '8px' }}>
                    <input type="checkbox" checked={isHotelCard} onChange={e => setIsHotelCard(e.target.checked)} />
                    Hotel Card
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fff', fontSize: '14px', background: 'rgba(255,255,255,0.05)', padding: '8px 12px', borderRadius: '8px' }}>
                    <input type="checkbox" checked={isHiddenCard} onChange={e => setIsHiddenCard(e.target.checked)} />
                    Hide Card
                </label>
              </div>

              {/* Special Offers Section */}
              <div style={{ marginTop: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <label className="edit-field-label" style={{ margin: 0 }}>Special Offers</label>
                  <button type="button" onClick={() => setOffers([...offers, { id: Date.now().toString(), title: 'New Offer', rewardAmount: 0, spendTarget: 0 }])} style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', borderRadius: '6px', padding: '4px 8px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>+ Add</button>
                </div>
                {offers.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {offers.map((offer, index) => (
                      <div key={offer.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <input type="text" value={offer.title} onChange={e => {
                            const newOffers = [...offers];
                            newOffers[index].title = e.target.value;
                            setOffers(newOffers);
                          }} placeholder="Offer Title" className="edit-field-input" style={{ flex: 1, padding: '4px 8px', marginRight: '8px' }} />
                          <button type="button" onClick={() => setOffers(offers.filter(o => o.id !== offer.id))} style={{ background: 'none', border: 'none', color: '#FF3B30', cursor: 'pointer' }}><Trash2 size={16} /></button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                          <div>
                            <label style={{ fontSize: '10px', color: 'var(--sys-label-secondary)', display: 'block', marginBottom: '4px' }}>Reward ($)</label>
                            <input type="number" value={offer.rewardAmount || ''} onChange={e => {
                              const newOffers = [...offers];
                              newOffers[index].rewardAmount = parseFloat(e.target.value) || 0;
                              setOffers(newOffers);
                            }} className="edit-field-input" style={{ padding: '4px 8px' }} />
                          </div>
                          <div>
                            <label style={{ fontSize: '10px', color: 'var(--sys-label-secondary)', display: 'block', marginBottom: '4px' }}>Spend Target ($)</label>
                            <input type="number" value={offer.spendTarget || ''} onChange={e => {
                              const newOffers = [...offers];
                              newOffers[index].spendTarget = parseFloat(e.target.value) || 0;
                              setOffers(newOffers);
                            }} className="edit-field-input" style={{ padding: '4px 8px' }} />
                          </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                          <div>
                            <label style={{ fontSize: '10px', color: 'var(--sys-label-secondary)', display: 'block', marginBottom: '4px' }}>Start Date</label>
                            <input type="date" value={offer.startDate || ''} onChange={e => {
                              const newOffers = [...offers];
                              newOffers[index].startDate = e.target.value || undefined;
                              setOffers(newOffers);
                            }} className="edit-field-input" style={{ padding: '4px 8px' }} />
                          </div>
                          <div>
                            <label style={{ fontSize: '10px', color: 'var(--sys-label-secondary)', display: 'block', marginBottom: '4px' }}>End Date</label>
                            <input type="date" value={offer.endDate || ''} onChange={e => {
                              const newOffers = [...offers];
                              newOffers[index].endDate = e.target.value || undefined;
                              setOffers(newOffers);
                            }} className="edit-field-input" style={{ padding: '4px 8px' }} />
                          </div>
                        </div>
                        <div style={{ marginBottom: '12px' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <input type="checkbox" checked={offer.isMonthly || false} onChange={e => {
                              const newOffers = [...offers];
                              newOffers[index].isMonthly = e.target.checked;
                              setOffers(newOffers);
                            }} style={{ width: '16px', height: '16px', accentColor: 'var(--sys-blue)' }} />
                            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--sys-label-secondary)' }}>Monthly Recurring Offer (Resets each month)</span>
                          </label>
                        </div>
                        <div>
                           <label style={{ fontSize: '10px', color: 'var(--sys-label-secondary)', display: 'block', marginBottom: '4px' }}>Eligible Categories (Leave empty for 'Any')</label>
                           <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                             {CATEGORIES.map(cat => {
                               const isSelected = offer.eligibleCategories?.includes(cat) || false;
                               return (
                                 <div 
                                   key={cat}
                                   onClick={() => {
                                      const newOffers = [...offers];
                                      const current = newOffers[index].eligibleCategories || [];
                                      if (isSelected) {
                                        newOffers[index].eligibleCategories = current.filter((c: FinanceCategory) => c !== cat);
                                      } else {
                                        newOffers[index].eligibleCategories = [...current, cat];
                                      }
                                      if (newOffers[index].eligibleCategories?.length === 0) {
                                        delete newOffers[index].eligibleCategories;
                                      }
                                      setOffers(newOffers);
                                   }}
                                   style={{ 
                                      fontSize: '11px', fontWeight: 600, padding: '4px 8px', borderRadius: '12px', cursor: 'pointer',
                                      background: isSelected ? 'var(--sys-blue)' : 'rgba(255,255,255,0.05)',
                                      color: isSelected ? '#fff' : 'var(--sys-label-secondary)',
                                      border: isSelected ? '1px solid var(--sys-blue)' : '1px solid rgba(255,255,255,0.1)'
                                   }}>
                                   {cat}
                                 </div>
                               );
                             })}
                           </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <button type="submit" className="btn-glass-blue" style={{ width: '100%', padding: '16px', borderRadius: '12px', fontSize: '16px', marginTop: '8px' }}>
                Save Credit Card
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Transaction Modal ── */}
      {editingTx && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
          zIndex: 9999, display: 'flex', flexDirection: 'column',
          animation: 'fadeIn 0.2s ease', padding: '24px'
        }}>
          <div style={{
            background: 'var(--sys-bg)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '24px', flex: 1, display: 'flex', flexDirection: 'column',
            overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            marginTop: '40px', position: 'relative'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#fff' }}>Edit Transaction</div>
              <button onClick={() => setEditingTx(null)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveTransaction} style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', padding: '24px', paddingBottom: '40px' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', color: 'var(--sys-label-secondary)', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Date (YYYY-MM-DD)
                <input 
                  type="text" 
                  value={txDate} 
                  onChange={(e) => setTxDate(e.target.value)} 
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '12px', color: '#fff', fontSize: '16px', fontWeight: 600, outline: 'none', height: '46px', boxSizing: 'border-box' }}
                  required
                />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', color: 'var(--sys-label-secondary)', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Merchant Name
                <input 
                  type="text" 
                  value={txMerchant} 
                  onChange={(e) => setTxMerchant(e.target.value)} 
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '12px', color: '#fff', fontSize: '16px', fontWeight: 600, outline: 'none', height: '46px', boxSizing: 'border-box' }}
                  required
                />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', color: 'var(--sys-label-secondary)', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Amount ($)
                <input 
                  type="number" 
                  step="0.01"
                  value={txAmount} 
                  onChange={(e) => setTxAmount(e.target.value)} 
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '12px', color: '#fff', fontSize: '16px', fontWeight: 600, outline: 'none', height: '46px', boxSizing: 'border-box' }}
                  required
                />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', color: 'var(--sys-label-secondary)', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Category
                <select 
                  value={txCategory} 
                  onChange={(e) => setTxCategory(e.target.value as FinanceCategory)} 
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '12px', color: '#fff', fontSize: '16px', fontWeight: 600, outline: 'none', height: '46px', boxSizing: 'border-box' }}
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </label>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fff', fontSize: '14px', background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '12px' }}>
                    <input type="checkbox" checked={txHidden} onChange={e => setTxHidden(e.target.checked)} style={{ width: '18px', height: '18px' }} />
                    Hide Transaction
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fff', fontSize: '14px', background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '12px' }}>
                    <input type="checkbox" checked={txExcludeFromCashback} onChange={e => setTxExcludeFromCashback(e.target.checked)} style={{ width: '18px', height: '18px' }} />
                    Exclude from Cashback
                </label>
              </div>

              <div style={{ flex: 1 }} />
              
              <button type="submit" style={{ background: 'var(--sys-blue)', color: '#fff', border: 'none', borderRadius: '14px', padding: '16px', fontSize: '16px', fontWeight: 700, cursor: 'pointer', marginTop: '16px' }}>
                Save Transaction
              </button>
            </form>
          </div>
        </div>
      )}


      {/* ── FAB Navigation Menu ── */}
      <div style={{ position: 'fixed', bottom: '32px', right: '24px', zIndex: 10000, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px' }}>
        {isFabOpen && (
          <div style={{
            display: 'flex', flexDirection: 'column', gap: '8px',
            background: 'rgba(20, 20, 20, 0.85)', backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)',
            border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px', padding: '16px',
            animation: 'scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)', transformOrigin: 'bottom right',
            boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
          }}>
            {[
              { id: 'sync-now', label: isSyncing ? 'Syncing...' : (lastSyncTime ? `Sync Now (${lastSyncTime})` : 'Sync Now'), icon: <Activity size={18} color={isSyncing ? 'var(--sys-label-secondary)' : '#30D158'} /> },
              { id: 'toggle-hidden', label: showHiddenItems ? 'Hide Hidden Items' : 'Show Hidden Items', icon: showHiddenItems ? <EyeOff size={18} /> : <Eye size={18} /> },
            ].map(tab => (
              <button key={tab.id} disabled={tab.id === 'sync-now' && isSyncing} onClick={() => { 
                if (tab.id === 'toggle-hidden') setShowHiddenItems(!showHiddenItems); 
                else if (tab.id === 'sync-now') handleSync();
                if (tab.id !== 'sync-now') setIsFabOpen(false); 
              }} style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                background: 'rgba(255,255,255,0.03)',
                color: tab.id === 'sync-now' && !isSyncing ? '#30D158' : 'var(--sys-label-secondary)',
                border: 'none', borderRadius: '12px', padding: '12px 16px',
                cursor: tab.id === 'sync-now' && isSyncing ? 'not-allowed' : 'pointer', transition: 'all 0.2s', width: '200px', fontWeight: 600, fontSize: '14px'
              }}>
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        )}
        <button
          onClick={() => setIsFabOpen(!isFabOpen)}
          style={{
            width: '60px', height: '60px', borderRadius: '30px',
            background: isFabOpen ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)',
            backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', cursor: 'pointer', boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {isFabOpen ? <X size={32} /> : <Settings size={28} />}
        </button>
      </div>
      {cropperImage && (
        <ImageCropperModal
          imageSrc={cropperImage}
          onCropComplete={handleCropComplete}
          onCancel={() => setCropperImage(null)}
        />
      )}

      {/* Edit Earn Rates Modal */}
      {showEarnRatesModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', padding: '16px' }}>
          <div style={{ width: '100%', maxWidth: '500px', background: 'var(--sys-surface)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '32px', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#fff' }}>Edit Earn Rates</div>
              <button onClick={() => { setShowEarnRatesModal(false); setEditingEarnRatesCard(null); }} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', padding: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '10px' }}>
                {CATEGORIES.map(cat => {
                  const isSelected = selectedCategories[cat];
                  return (
                    <div key={cat} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 4px', borderBottom: cat !== 'Other' ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                      <div onClick={() => setSelectedCategories({ ...selectedCategories, [cat]: !isSelected })} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', flex: 1, minWidth: 0 }}>
                        <div style={{ width: '18px', height: '18px', borderRadius: '4px', border: isSelected ? '1px solid var(--sys-blue)' : '1px solid rgba(255,255,255,0.3)', background: isSelected ? 'var(--sys-blue)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '11px', fontWeight: 'bold' }}>
                          {isSelected && '✓'}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                          <span style={{ color: CATEGORY_COLORS[cat] }}>{CATEGORY_ICONS[cat]}</span>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: isSelected ? '#fff' : 'var(--sys-label-secondary)' }}>{cat}</span>
                        </div>
                      </div>

                      {isSelected && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <input type="number" step="0.01" min="0" max="100" value={cashbackValues[cat]} onChange={e => setCashbackValues({ ...cashbackValues, [cat]: e.target.value })} style={{ width: '56px', padding: '6px 8px', borderRadius: '8px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '13px', fontWeight: 800, textAlign: 'center', outline: 'none' }} />
                          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--sys-label-secondary)' }}>%</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--sys-label-secondary)' }}>Notes</label>
                <textarea 
                  value={earnRatesNotes}
                  onChange={(e) => setEarnRatesNotes(e.target.value)}
                  placeholder="e.g. 5% on Gas for Q3, overrides..."
                  style={{ 
                    width: '100%', minHeight: '60px', padding: '12px', 
                    borderRadius: '12px', background: 'rgba(255,255,255,0.02)', 
                    border: '1px solid rgba(255,255,255,0.06)', color: '#fff', 
                    fontSize: '14px', resize: 'vertical', outline: 'none' 
                  }}
                />
              </div>
            </div>

            <div style={{ padding: '24px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button onClick={() => handleSaveEarnRates('current_and_future')} style={{ background: 'var(--sys-blue)', color: '#fff', border: 'none', borderRadius: '14px', padding: '16px', fontSize: '16px', fontWeight: 700, cursor: 'pointer' }}>
                Apply to All Future Months
              </button>
              <button onClick={() => handleSaveEarnRates('this_month')} style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', borderRadius: '14px', padding: '16px', fontSize: '16px', fontWeight: 700, cursor: 'pointer' }}>
                Apply to {new Date(`${viewingMonth}-02`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} Only
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
