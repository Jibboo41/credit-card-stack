import { Flame, Flower, Flower2, Moon, Plus, Sparkles, Sunrise, TreePine, Waves, Zap } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface ThemeDefinition {
  id: string;
  label: string;
  icon: LucideIcon;
  /** Colors of the three ambient background blobs. */
  blobs: [string, string, string];
  /** Swatch background shown in the theme picker. */
  swatch: string;
  /** Accent used for active navigation, primary buttons and progress. */
  accent: string;
  /** Text color that reads well on top of the accent. */
  accentInk: string;
}

export const THEMES: ThemeDefinition[] = [
  { id: 'sunset', label: 'Sunset', icon: Sunrise, blobs: ['#FF3B30', '#FF9F0A', '#FFD60A'], swatch: 'linear-gradient(135deg, #FF3B30 0%, #FF9F0A 50%, #FFD60A 100%)', accent: '#FF9F0A', accentInk: '#1A1000' },
  { id: 'midnight', label: 'Midnight', icon: Moon, blobs: ['#5E5CE6', '#BF5AF2', '#32ADE6'], swatch: 'linear-gradient(135deg, #5E5CE6 0%, #BF5AF2 60%, #32ADE6 100%)', accent: '#7D7AFF', accentInk: '#FFFFFF' },
  { id: 'forest', label: 'Forest', icon: TreePine, blobs: ['#30D158', '#34C759', '#32ADE6'], swatch: 'linear-gradient(135deg, #30D158 0%, #34C759 50%, #32ADE6 100%)', accent: '#30D158', accentInk: '#00170A' },
  { id: 'aurora', label: 'Aurora', icon: Sparkles, blobs: ['#00F5A0', '#8B5CF6', '#06B6D4'], swatch: 'linear-gradient(135deg, #00F5A0 0%, #8B5CF6 55%, #06B6D4 100%)', accent: '#00E5A0', accentInk: '#00170F' },
  { id: 'desert', label: 'Desert Rose', icon: Flower2, blobs: ['#E2A57E', '#C9415A', '#EDCA7F'], swatch: 'linear-gradient(135deg, #E2A57E 0%, #C9415A 55%, #EDCA7F 100%)', accent: '#E2A57E', accentInk: '#1F1008' },
  { id: 'ocean', label: 'Deep Ocean', icon: Waves, blobs: ['#0EA5E9', '#0D9488', '#6366F1'], swatch: 'linear-gradient(135deg, #0EA5E9 0%, #0D9488 50%, #6366F1 100%)', accent: '#0EA5E9', accentInk: '#00131D' },
  { id: 'vulcan', label: 'Vulcan', icon: Flame, blobs: ['#FF4500', '#FF8C00', '#FF2D55'], swatch: 'linear-gradient(135deg, #FF4500 0%, #FF8C00 50%, #FF2D55 100%)', accent: '#FF6A1A', accentInk: '#1A0700' },
  { id: 'sakura', label: 'Sakura', icon: Flower, blobs: ['#FF85A2', '#D891EF', '#FFB6CE'], swatch: 'linear-gradient(135deg, #FF85A2 0%, #D891EF 55%, #FFB6CE 100%)', accent: '#FF85A2', accentInk: '#22040C' },
  { id: 'cyberpunk', label: 'Cyberpunk', icon: Zap, blobs: ['#FF00AA', '#00FFEA', '#FFE600'], swatch: 'linear-gradient(135deg, #FF00AA 0%, #00FFEA 55%, #FFE600 100%)', accent: '#00FFEA', accentInk: '#001A18' },
  { id: 'slate', label: 'Slate', icon: Plus, blobs: ['#708090', '#708090', '#708090'], swatch: '#708090', accent: '#0A84FF', accentInk: '#FFFFFF' },
  { id: 'black', label: 'Black', icon: Moon, blobs: ['#000000', '#000000', '#000000'], swatch: '#000000', accent: '#0A84FF', accentInk: '#FFFFFF' },
];

export const DEFAULT_THEME_ID = 'slate';

export function getTheme(id: string): ThemeDefinition {
  return THEMES.find(t => t.id === id) ?? THEMES.find(t => t.id === DEFAULT_THEME_ID)!;
}
