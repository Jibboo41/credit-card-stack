import { useState } from 'react';
import type { CreditCard } from '../../core/models';
import { getCardColor, getCardInitials, resolveLogoSrc } from '../../lib/cardVisuals';

interface CardThumbProps {
  card: CreditCard;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

/** The card's own artwork when available, otherwise a tile in the institution's color with its logo. */
export function CardThumb({ card, size = 'sm' }: CardThumbProps) {
  const [failed, setFailed] = useState<string[]>([]);
  const markFailed = (src: string) => setFailed(prev => (prev.includes(src) ? prev : [...prev, src]));

  if (card.imageUrl && !failed.includes(card.imageUrl)) {
    const src = card.imageUrl;
    return (
      <span className={`card-thumb ${size}`}>
        <img className="card-image" src={src} alt="" loading="lazy" onError={() => markFailed(src)} />
      </span>
    );
  }

  const color = getCardColor(card);
  const logo = resolveLogoSrc(card.logoUrl);
  const showLogo = logo && !failed.includes(logo) && size !== 'xs';
  return (
    <span className={`card-thumb ${size}`} style={{ background: `linear-gradient(135deg, ${color}, color-mix(in srgb, ${color} 50%, #000))` }}>
      {showLogo ? <img className="card-logo" src={logo} alt="" loading="lazy" onError={() => markFailed(logo)} /> : getCardInitials(card)}
    </span>
  );
}
