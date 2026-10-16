import { categoryColor, categoryIcon } from '../../lib/categories';

export function CategoryIcon({ category, size = 16 }: { category: string; size?: number }) {
  const Icon = categoryIcon(category);
  return <Icon size={size} aria-hidden="true" />;
}

/** Category icon on a tinted rounded tile. */
export function CategoryBadge({ category, size = 36 }: { category: string; size?: number }) {
  const color = categoryColor(category);
  return (
    <span
      className="category-badge"
      style={{ width: size, height: size, color, background: `color-mix(in srgb, ${color} 18%, transparent)` }}
      title={category}
    >
      <CategoryIcon category={category} size={Math.round(size * 0.48)} />
    </span>
  );
}
