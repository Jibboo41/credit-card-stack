import type { CreditCard } from '../core/models';

const FALLBACK_COLORS = ['#3B82F6', '#8B5CF6', '#EC4899', '#F97316', '#10B981', '#06B6D4', '#6366F1', '#EF4444', '#14B8A6', '#A855F7'];

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) hash = (hash * 31 + value.charCodeAt(i)) | 0;
  return Math.abs(hash);
}

export function getCardColor(card: CreditCard): string {
  if (card.institutionColor && /^#?[0-9a-f]{3,8}$/i.test(card.institutionColor)) {
    return card.institutionColor.startsWith('#') ? card.institutionColor : `#${card.institutionColor}`;
  }
  const key = card.bankName || card.institutionName || card.name || '?';
  return FALLBACK_COLORS[hashString(key) % FALLBACK_COLORS.length];
}

export function getCardInitials(card: CreditCard): string {
  const source = card.bankName || card.institutionName || card.name || '?';
  const words = source.replace(/[^\p{L}\p{N} ]/gu, ' ').split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

/** Monarch logos may be URLs or bare base64 PNG data. */
export function resolveLogoSrc(logo: string | undefined): string | undefined {
  if (!logo) return undefined;
  if (/^(https?:|data:|\/)/.test(logo)) return logo;
  return `data:image/png;base64,${logo}`;
}
