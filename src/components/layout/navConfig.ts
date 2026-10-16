import { CreditCard, Gift, LayoutDashboard, PiggyBank, Receipt, Repeat, Trophy } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  group: 'Dashboard' | 'Rewards' | 'Spending' | 'Wallet';
  /** Shown in the mobile tab bar; everything else lives in the "More" sheet. */
  tab?: boolean;
  /** Whether the month picker applies to this page. */
  usesMonth: boolean;
  description: string;
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, group: 'Dashboard', tab: true, usesMonth: true, description: 'Your month at a glance' },
  { to: '/best-card', label: 'Best Card', icon: Trophy, group: 'Rewards', tab: true, usesMonth: true, description: 'Which card to use for each category' },
  { to: '/rewards', label: 'Rewards', icon: PiggyBank, group: 'Rewards', tab: true, usesMonth: true, description: 'Cash back earned by card and category' },
  { to: '/offers', label: 'Offers', icon: Gift, group: 'Rewards', usesMonth: true, description: 'Spend-based bonus progress' },
  { to: '/transactions', label: 'Transactions', icon: Receipt, group: 'Spending', tab: true, usesMonth: true, description: 'Every purchase and what it earned' },
  { to: '/recurring', label: 'Recurring', icon: Repeat, group: 'Spending', usesMonth: false, description: 'Subscriptions and bills from Monarch' },
  { to: '/cards', label: 'Cards', icon: CreditCard, group: 'Wallet', usesMonth: true, description: 'Balances, limits, earn rates and details' },
];

export const NAV_GROUPS: NavItem['group'][] = ['Dashboard', 'Rewards', 'Spending', 'Wallet'];

export function findNavItem(pathname: string): NavItem | undefined {
  if (pathname === '/') return NAV_ITEMS[0];
  return NAV_ITEMS.find(item => item.to !== '/' && (pathname === item.to || pathname.startsWith(`${item.to}/`)));
}
