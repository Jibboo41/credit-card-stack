import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createServer } from 'vite';

const server = await createServer({
  configFile: false,
  server: { middlewareMode: true, hmr: false, ws: false, watch: null },
  optimizeDeps: { noDiscovery: true, include: [] },
  appType: 'custom',
});
after(() => server.close());
const { sortCardsByBalanceAndRecentUse } = await server.ssrLoadModule('/src/lib/cardSorting.ts');
const { computeMonthEarnings, computeYearEarnings, computeMissedRewards, getResolvedTransaction, getTransactionCashback, hasCashbackOverride } = await server.ssrLoadModule('/src/lib/cashback.ts');

const card = (id, currentBalance = 0, extra = {}) => ({
  id, name: id, monarchId: `account-${id}`, currentBalance,
  isAirlineCard: false, isHotelCard: false, noForeignTxFee: false,
  categories: ['Restaurants'], cashback: { Restaurants: 4 }, baseCashback: 1,
  ...extra,
});
const tx = (id, cardId, date, amount = -100, extra = {}) => ({
  id, monarchAccountId: `account-${cardId}`, date, amount,
  merchantName: id, category: 'Restaurants', ...extra,
});

test('balance owed takes precedence over recency and follows Monarch balance signs', () => {
  const cards = [card('paid-off'), card('small', -20), card('large', -500), card('credit', 10)];
  const transactions = [tx('recent', 'paid-off', '2026-10-22'), tx('old', 'large', '2026-01-01')];
  assert.deepEqual(sortCardsByBalanceAndRecentUse(cards, transactions).map(c => c.id), ['large', 'small', 'paid-off', 'credit']);
  assert.deepEqual(cards.map(c => c.id), ['paid-off', 'small', 'large', 'credit']);
});

test('paid-off cards are ordered by their latest purchase across all months', () => {
  const cards = [card('unused'), card('old'), card('recent')];
  const transactions = [tx('newer', 'recent', '2026-09-30'), tx('older', 'old', '2025-10-01')];
  assert.deepEqual(sortCardsByBalanceAndRecentUse(cards, transactions).map(c => c.id), ['recent', 'old', 'unused']);
});

test('equal nonzero balances also use recency, while unlinked cards have no usage', () => {
  const cards = [card('old', -50), card('unlinked', -50, { monarchId: undefined }), card('recent', -50)];
  const transactions = [tx('old', 'old', '2026-08-01'), tx('new', 'recent', '2026-09-01')];
  assert.deepEqual(sortCardsByBalanceAndRecentUse(cards, transactions).map(c => c.id), ['recent', 'old', 'unlinked']);
});

test('payments, transfers, refunds, and sync timestamps do not count as card use', () => {
  const cards = [card('old', 0, { lastSyncedAt: '2026-10-22T12:00:00Z' }), card('recent')];
  const transactions = [
    tx('old-purchase', 'old', '2026-01-01'),
    tx('new-purchase', 'recent', '2026-09-01', -50, { excludeFromCashback: true }),
    tx('payment', 'old', '2026-10-22', 200, { originalCategory: 'Credit Card Payment' }),
    tx('transfer', 'old', '2026-10-22', -200, { isTransfer: true }),
    tx('legacy-transfer', 'old', '2026-10-22', -200, { originalCategory: 'Transfer' }),
    tx('refund', 'old', '2026-10-22', 20),
  ];
  assert.deepEqual(sortCardsByBalanceAndRecentUse(cards, transactions).map(c => c.id), ['recent', 'old']);
});

test('missing balances and usage have a deterministic fallback', () => {
  const cards = [card('z', undefined, { name: 'Same', currentBalance: undefined }), card('b', 0, { name: 'Same' }), card('a')];
  assert.deepEqual(sortCardsByBalanceAndRecentUse(cards, []).map(c => c.id), ['a', 'b', 'z']);
});

test('rewards drill-downs contain exactly the transactions behind each total', () => {
  const cards = [card('one', -100, { historicalCashback: { '2026-10': { Restaurants: 5 } } }), card('two')];
  const transactions = [
    tx('purchase', 'one', '2026-10-01', -100),
    tx('refund', 'one', '2026-10-04', 20),
    tx('other-category', 'one', '2026-10-05', -40, { category: 'Gas' }),
    tx('other-card', 'two', '2026-10-05', -50),
    tx('other-month', 'one', '2026-09-30', -1000),
    tx('excluded', 'one', '2026-10-05', -1000, { excludeFromCashback: true }),
    tx('payment', 'one', '2026-10-05', 1000, { isTransfer: true }),
  ];
  const earnings = computeMonthEarnings(cards, transactions, '2026-10');
  const category = earnings.byCard.find(c => c.card.id === 'one').categories.find(c => c.category === 'Restaurants');
  assert.deepEqual(category.transactions.map(t => t.id), ['refund', 'purchase']);
  assert.equal(category.spend, 80);
  assert.equal(category.cashback, 4);
  assert.equal(category.rate, 5);
  assert.equal(category.transactions.reduce((sum, t) => sum - t.amount, 0), category.spend);
  assert.equal(category.transactions.reduce((sum, t) => sum - t.amount * category.rate / 100, 0), category.cashback);
  assert.strictEqual(earnings.byCategory.Restaurants.find(e => e.card.id === 'one').transactions, category.transactions);
});

test('manual overrides and unknown categories stay consistent in rewards drill-downs', () => {
  const cards = [card('one')];
  const transactions = [
    tx('edited', 'one', '2026-09-01', -999, {
      manualDate: '2026-10-01', manualAmount: -40, manualCategory: 'Gas', manualMerchantName: 'Edited merchant',
    }),
    tx('unknown', 'one', '2026-10-02', -20, { category: 'Legacy category' }),
  ].map(getResolvedTransaction);
  const earnings = computeMonthEarnings(cards, transactions, '2026-10');
  const gas = earnings.byCategory.Gas[0];
  assert.equal(gas.spend, 40);
  assert.equal(gas.transactions[0].merchantName, 'Edited merchant');
  assert.equal(earnings.byCategory.Other[0].transactions[0].id, 'unknown');
  assert.equal(earnings.totalSpend, 60);
});

test('custom cash back rates affect only their transaction', () => {
  const cards = [card('one')];
  const transactions = [
    tx('custom', 'one', '2026-10-01', -100, { manualCashbackRate: 7 }),
    tx('normal', 'one', '2026-10-02', -100),
  ];
  assert.equal(getTransactionCashback(transactions[0], cards[0]), 7);
  assert.equal(getTransactionCashback(transactions[1], cards[0]), 4);
  const earnings = computeMonthEarnings(cards, transactions, '2026-10');
  assert.equal(earnings.totalCashback, 11);
  assert.equal(earnings.byCard[0].categories[0].cashback, 11);
  assert.equal(earnings.byCategory.Restaurants[0].cashback, 11);
  assert.equal(cards[0].cashback.Restaurants, 4);
});

test('custom dollar amounts take precedence over card and transaction rates', () => {
  const creditCard = card('one', -100, { historicalCashback: { '2026-10': { Restaurants: 10 } } });
  const transaction = tx('custom', 'one', '2026-10-01', -100, { manualCashbackAmount: 8.25, manualCashbackRate: 5 });
  assert.equal(getTransactionCashback(transaction, creditCard), 8.25);
  assert.equal(computeMonthEarnings([creditCard], [transaction], '2026-10').totalCashback, 8.25);
});

test('zero dollar and zero percent overrides are respected', () => {
  const creditCard = card('one');
  for (const override of [{ manualCashbackAmount: 0 }, { manualCashbackRate: 0 }]) {
    const transaction = tx('zero', 'one', '2026-10-01', -100, override);
    assert.equal(hasCashbackOverride(transaction), true);
    assert.equal(getTransactionCashback(transaction, creditCard), 0);
    const earnings = computeMonthEarnings([creditCard], [transaction], '2026-10');
    assert.equal(earnings.totalCashback, 0);
    assert.equal(earnings.totalSpend, 100);
    assert.equal(earnings.byCard[0].categories[0].transactions.length, 1);
  }
});

test('clearing an override restores historical category rules and manual edits', () => {
  const creditCard = card('one', -100, { historicalCashback: { '2026-10': { Gas: 6 } } });
  const transaction = getResolvedTransaction(tx('edited', 'one', '2026-09-01', -100, {
    manualDate: '2026-10-01', manualCategory: 'Gas', manualAmount: -50,
    manualCashbackRate: undefined, manualCashbackAmount: undefined,
  }));
  assert.equal(hasCashbackOverride(transaction), false);
  assert.equal(getTransactionCashback(transaction, creditCard), 3);
});

test('excluded transactions and transfers never earn manually overridden rewards', () => {
  const creditCard = card('one');
  for (const exclusion of [{ excludeFromCashback: true }, { isTransfer: true }, { originalCategory: 'Credit Card Payment' }]) {
    const transaction = tx('excluded', 'one', '2026-10-01', -100, { manualCashbackAmount: 50, ...exclusion });
    assert.equal(getTransactionCashback(transaction, creditCard), 0);
    assert.equal(computeMonthEarnings([creditCard], [transaction], '2026-10').totalCashback, 0);
  }
});

test('refunds and custom rewards reversals reconcile with monthly totals', () => {
  const cards = [card('one')];
  const transactions = [
    tx('purchase', 'one', '2026-10-01', -100, { manualCashbackAmount: 8 }),
    tx('refund', 'one', '2026-10-02', 25, { manualCashbackRate: 8 }),
    tx('reversal', 'one', '2026-10-03', 5, { manualCashbackAmount: -0.5 }),
  ];
  assert.equal(getTransactionCashback(transactions[1], cards[0]), -2);
  assert.equal(getTransactionCashback(transactions[2], cards[0]), -0.5);
  const earnings = computeMonthEarnings(cards, transactions, '2026-10');
  assert.equal(earnings.totalCashback, 5.5);
  assert.equal(earnings.totalSpend, 70);
  assert.equal(earnings.byCard[0].categories[0].transactions.reduce((sum, t) => sum + getTransactionCashback(t, cards[0]), 0), 5.5);
});

test('overrides remain visible when a refund brings net category spend to zero', () => {
  const cards = [card('one')];
  const transactions = [
    tx('purchase', 'one', '2026-10-01', -100, { manualCashbackAmount: 10 }),
    tx('refund', 'one', '2026-10-02', 100),
  ];
  const earnings = computeMonthEarnings(cards, transactions, '2026-10');
  assert.equal(earnings.totalSpend, 0);
  assert.equal(earnings.totalCashback, 6);
  assert.equal(earnings.byCard[0].categories[0].transactions.length, 2);
});

test('overrides are reflected in yearly earnings and missed-rewards estimates', () => {
  const cards = [card('one'), card('better', 0, { cashback: { Restaurants: 10 } })];
  const transactions = [
    tx('october', 'one', '2026-10-01', -100, { manualCashbackAmount: 7 }),
    tx('september', 'one', '2026-09-01', -100),
  ];
  const earnings = computeMonthEarnings(cards, transactions, '2026-10');
  assert.equal(computeMissedRewards(cards, earnings, '2026-10')[0].missed, 3);
  assert.equal(computeYearEarnings(cards, transactions, 2026, 10).get('one'), 11);
});
