import { useState } from 'react';
import { useBlobUrl } from '../hooks';
import { ratio } from '../layout';
import type { Item } from '../types';
import { formatBytes } from '../util';

export const extOf = (name: string) => (name.includes('.') ? name.split('.').pop()!.toUpperCase().slice(0, 4) : 'FILE');

export function Thumb({ item }: { item: Item }) {
  const url = useBlobUrl('thumbs', item.id, item.hasThumb);
  const [loaded, setLoaded] = useState(false);
  if (!url) return null;
  return (
    <img src={url} alt={item.name} loading="lazy" draggable={false} className={loaded ? 'loaded' : ''} onLoad={() => setLoaded(true)} />
  );
}

export function Tile({ item, fit }: { item: Item; fit: 'natural' | 'cover' }) {
  if (!item.hasThumb) {
    return (
      <div className="tile tile-file" style={fit === 'natural' ? { aspectRatio: '4 / 3' } : undefined}>
        <div className="file-badge">{extOf(item.name)}</div>
        <div className="file-size">{formatBytes(item.size)}</div>
      </div>
    );
  }
  return (
    <div
      className={`tile ${fit === 'cover' ? 'tile-cover' : ''}`}
      style={fit === 'natural' ? { aspectRatio: `1 / ${ratio(item)}`, background: item.color } : { background: item.color }}
    >
      <Thumb item={item} />
      {item.kind === 'video' && <span className="play">▶</span>}
    </div>
  );
}
