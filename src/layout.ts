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
  return Math.max(width >= 320 ? 2 : 1, Math.min(6, Math.floor((width + 14) / 254)));
}

export type Side = 'before' | 'after';

/** Move `dragId` next to `targetId`. */
export function reorder(ids: string[], dragId: string, targetId: string, side: Side): string[] {
  if (dragId === targetId) return ids;
  const out = ids.filter((id) => id !== dragId);
  const at = out.indexOf(targetId);
  if (at < 0) return ids;
  out.splice(side === 'before' ? at : at + 1, 0, dragId);
  return out;
}

/** Which half of the element the pointer is over. */
export function sideOf(e: React.DragEvent, vertical: boolean): Side {
  const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
  return vertical ? (e.clientY < r.top + r.height / 2 ? 'before' : 'after') : e.clientX < r.left + r.width / 2 ? 'before' : 'after';
}
