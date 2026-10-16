import {
  Activity, Bed, Car, Fuel, Globe, Hammer, MonitorSmartphone, Plane, ShoppingBag,
  ShoppingCart, Smartphone, Store, Tv, Utensils, Wallet, Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { FinanceCategory } from '../core/models';

export const CATEGORY_ICONS: Record<FinanceCategory, LucideIcon> = {
  'Car Rental': Car,
  'Flights': Plane,
  'Gas': Fuel,
  'Restaurants': Utensils,
  'Lodging': Bed,
  'Groceries': ShoppingCart,
  'Online Shopping': MonitorSmartphone,
  'Streaming Services': Tv,
  'Utilities': Zap,
  'Travel': Globe,
  'PayPal': Smartphone,
  'Retail': ShoppingBag,
  'Home Improvement': Hammer,
  'Digital Wallet': Wallet,
  'Store': Store,
  'Other': Activity,
};

/** Real hex values (not CSS variables) so they can be mixed into tinted backgrounds. */
export const CATEGORY_COLORS: Record<FinanceCategory, string> = {
  'Car Rental': '#64D2FF',
  'Flights': '#0A84FF',
  'Gas': '#FFD60A',
  'Restaurants': '#BF5AF2',
  'Lodging': '#FF9F0A',
  'Groceries': '#34C759',
  'Online Shopping': '#FF375F',
  'Streaming Services': '#5E5CE6',
  'Utilities': '#AC8E68',
  'Travel': '#32ADE6',
  'PayPal': '#00C7BE',
  'Retail': '#FF2D55',
  'Home Improvement': '#E0703A',
  'Digital Wallet': '#A3E635',
  'Store': '#FF6FAF',
  'Other': '#8E8E93',
};

export function categoryColor(category: string): string {
  return CATEGORY_COLORS[category as FinanceCategory] ?? CATEGORY_COLORS.Other;
}

export function categoryIcon(category: string): LucideIcon {
  return CATEGORY_ICONS[category as FinanceCategory] ?? Activity;
}
