import { useState } from 'react';
import { useBlobUrl } from '../hooks';
import { ratio } from '../layout';
import type { Item } from '../types';
import { formatBytes } from '../util';

const EXT_LABEL: Record<string, string> = { pdf: 'PDF', file: 'FILE' };

export function Tile({ item, fit = 'natural' }: { item: Item; fit?: 'natural' | 'cover' }) {
  const url = useBlobUrl('thumbs', item.id, item.hasThumb);
  const [loaded, setLoaded] = useState(false);
  const style =
    fit === 'natural'
      ? { aspectRatio: `1 / ${ratio(item)}`, background: item.color }
      : { background: item.color };

  if (!item.hasThumb) {
    const ext = item.name.split('.').pop()?.toUpperCase().slice(0, 4) || EXT_LABEL[item.kind];
    return (
      <div className="tile tile-file" style={fit === 'natural' ? { aspectRatio: '4 / 3' } : undefined}>
        <div className="file-badge">{ext}</div>
        <div className="file-name">{item.name}</div>
        <div className="file-size">{formatBytes(item.size)}</div>
      </div>
    );
  }

  return (
    <div className={`tile ${fit === 'cover' ? 'tile-cover' : ''}`} style={style}>
      {url && (
        <img
          src={url}
          alt={item.caption || item.name}
          loading="lazy"
          draggable={false}
          className={loaded ? 'loaded' : ''}
          onLoad={() => setLoaded(true)}
        />
      )}
      {item.kind === 'video' && <span className="play">▶</span>}
    </div>
  );
}
