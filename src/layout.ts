import type { Item } from './types';

/** Aspect ratio (h / w) used for layout; files without dimensions get a card shape. */
export const ratio = (i: Item) => (i.width && i.height ? i.height / i.width : 0.75);

/**
 * Masonry that keeps reading order left-to-right: each item goes into the
 * currently shortest column.
 */
export function masonry<T extends Item>(items: T[], columns: number): T[][] {
  const cols: T[][] = Array.from({ length: columns }, () => []);
  const heights = new Array(columns).fill(0);
  for (const it of items) {
    let c = 0;
    for (let i = 1; i < columns; i++) if (heights[i] < heights[c] - 0.01) c = i;
    cols[c].push(it);
    heights[c] += ratio(it) + 0.05; // + gap
  }
  return cols;
}

export function columnsFor(width: number): number {
  if (width >= 1100) return 3;
  if (width >= 620) return 2;
  return 1;
}
