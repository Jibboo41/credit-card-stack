export type FinanceCategory = 
  | 'Car Rental' 
  | 'Flights' 
  | 'Gas' 
  | 'Restaurants' 
  | 'Lodging' 
  | 'Groceries'
  | 'Online Shopping'
  | 'Streaming Services'
  | 'Utilities'
  | 'Travel'
  | 'PayPal'
  | 'Retail'
  | 'Home Improvement'
  | 'Digital Wallet'
  | 'Store'
  | 'Other';

export const CATEGORIES: FinanceCategory[] = [
  'Gas', 'Restaurants', 'Groceries', 'Travel', 'Lodging', 'Flights', 'Car Rental', 
  'Online Shopping', 'Streaming Services', 'Utilities', 'PayPal', 'Digital Wallet', 'Retail', 'Home Improvement', 'Store', 'Other'
];

export interface CardOffer {
  id: string;
  title: string;
  rewardAmount: number;
  spendTarget: number;
  eligibleCategories?: FinanceCategory[];
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  isMonthly?: boolean; // True if this offer resets each month
}

export interface CreditCard {
  id: string;
  name: string;
  bankName?: string;
  imageUrl?: string;
  cardLimit?: number;
  lastFourDigits?: string;
  dueDate?: number; // 1-31
  isAirlineCard: boolean;
  isHotelCard: boolean;
  openedDate?: string; // YYYY-MM-DD
  feesPaid?: number; // annual fee

  // Monarch Integration
  monarchId?: string;
  currentBalance?: number;
  lastSyncedAt?: string;

  categories: FinanceCategory[];
  cashback: { [category in FinanceCategory]?: number }; // Default/baseline cashback
  baseCashback?: number; // Base cashback for unselected categories
  historicalCashback?: { [yyyy_mm: string]: { [category in FinanceCategory]?: number } }; // Overrides per month
  noForeignTxFee: boolean;
  offers?: CardOffer[];
  notes?: string;
  hidden?: boolean;
}

export interface UserSettings {
  id: string;
  globalStrategyNotes?: string;
}

export interface Transaction {
  id: string; // The Monarch transaction ID
  monarchAccountId: string; // To link to the credit card
  date: string; // YYYY-MM-DD
  amount: number;
  merchantName: string;
  category: FinanceCategory; // AI-assigned category
  originalCategory?: string; // Original Monarch category name

  // Manual Overrides
  hidden?: boolean;
  excludeFromCashback?: boolean;
  manualDate?: string;
  manualAmount?: number;
  manualMerchantName?: string;
  manualCategory?: FinanceCategory;
}

export interface SyncLog {
  id: string; // Document ID (could be timestamp)
  timestamp: string; // ISO 8601 string
  status: 'success' | 'partial' | 'error';
  accountsSynced: number;
  accountsSyncedDetails?: string[];
  transactionsFetched: number;
  transactionsFetchedDetails?: string[];
  transactionsCategorized: number;
  transactionsCategorizedDetails?: string[];
  orphansDeleted: number;
  orphansDeletedDetails?: string[];
  errorDetails?: string;
}
