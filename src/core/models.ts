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

export type ConnectionStatus = 'ok' | 'update_required' | 'disconnected' | 'manual' | 'sync_disabled';

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

  // Read-only details synced from Monarch (absent until the sync function is redeployed)
  monarchDisplayName?: string;
  institutionName?: string;
  institutionColor?: string;
  institutionUrl?: string;
  logoUrl?: string;
  connectionStatus?: ConnectionStatus;
  monarchLastUpdatedAt?: string;
  monarchDeactivatedAt?: string;
  monarchCreditLimit?: number;
  apr?: number; // Raw value from Monarch; see normalizeApr()
  minimumPayment?: number;
  balanceHistory?: number[]; // Daily balances, oldest first, same sign convention as currentBalance
  balanceHistoryStartDate?: string; // YYYY-MM-DD of balanceHistory[0]

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

export interface TransactionTag {
  name: string;
  color?: string;
}

export interface Transaction {
  id: string; // The Monarch transaction ID
  monarchAccountId: string; // To link to the credit card
  date: string; // YYYY-MM-DD
  amount: number;
  merchantName: string;
  category: FinanceCategory; // AI-assigned category
  originalCategory?: string; // Original Monarch category name

  // Extra Monarch details (absent on transactions synced before the redeploy)
  pending?: boolean;
  originalDescription?: string;
  notes?: string;
  isRecurring?: boolean;
  needsReview?: boolean;
  hideFromReports?: boolean;
  merchantId?: string;
  tags?: TransactionTag[];
  monarchCategoryGroup?: string;
  isTransfer?: boolean;
  categorySource?: 'gemini' | 'previous' | 'rules';

  // Manual Overrides
  hidden?: boolean;
  excludeFromCashback?: boolean;
  manualDate?: string;
  manualAmount?: number;
  manualMerchantName?: string;
  manualCategory?: FinanceCategory;
}

export interface RecurringStream {
  streamId: string;
  merchantName: string;
  merchantId?: string;
  logoUrl?: string;
  frequency?: string; // Raw Monarch frequency, e.g. "monthly", "biweekly"
  amount?: number; // Expenses are negative
  isApproximate?: boolean;
  monarchCategory?: string;
  category?: FinanceCategory;
  monarchAccountId?: string;
  accountName?: string;
  lastDate?: string;
  lastAmount?: number;
  lastTransactionId?: string;
  nextDate?: string;
  nextAmount?: number;
  upcomingDates?: string[];
}

export interface CreditScorePoint {
  date: string; // YYYY-MM-DD
  score: number;
}

/** Contents of users/{uid}/settings/monarch, written by the sync function. */
export interface MonarchSnapshot {
  recurring: RecurringStream[];
  recurringUpdatedAt?: string;
  creditScores: CreditScorePoint[];
  creditScoresUpdatedAt?: string;
  updatedAt?: string;
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
  pendingTransactions?: number;
  recurringSynced?: number;
  categorizationSource?: 'gemini' | 'rules' | 'mixed';
  creditScoreSynced?: boolean;
  durationSeconds?: number;
}
