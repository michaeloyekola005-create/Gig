import { useEffect, useState } from 'react';
import { useBlobUrl } from '../hooks';
import type { Item } from '../types';
import { formatBytes } from '../util';

export function Lightbox({ items, start, onClose }: { items: Item[]; start: number; onClose: () => void }) {
  const [i, setI] = useState(start);
  const item = items[i];
  const full = useBlobUrl('files', item?.id);
  const thumb = useBlobUrl('thumbs', item?.id, !!item?.hasThumb);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setI((n) => (n + 1) % items.length);
      if (e.key === 'ArrowLeft') setI((n) => (n - 1 + items.length) % items.length);
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [items.length, onClose]);

  // Swipe on touch screens.
  const [touchX, setTouchX] = useState<number | null>(null);

  if (!item) return null;

  let body: React.ReactNode;
  if (item.kind === 'image') body = <img src={full ?? thumb ?? undefined} alt={item.name} />;
  else if (item.kind === 'video') body = full && <video src={full} controls autoPlay playsInline poster={thumb ?? undefined} />;
  else if (item.kind === 'pdf') body = full && <iframe src={full} title={item.name} />;
  else
    body = (
      <div className="lb-file">
        <div className="file-badge big">{item.name.split('.').pop()?.toUpperCase()}</div>
        <p>{item.name}</p>
        <p className="muted">{formatBytes(item.size)} · preview not available</p>
      </div>
    );

  return (
    <div
      className="lightbox"
      onClick={onClose}
      onTouchStart={(e) => setTouchX(e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX === null) return;
        const dx = e.changedTouches[0].clientX - touchX;
        if (Math.abs(dx) > 50) setI((n) => (n + (dx < 0 ? 1 : -1) + items.length) % items.length);
        setTouchX(null);
      }}
    >
      <div className="lb-top" onClick={(e) => e.stopPropagation()}>
        <span className="muted">
          {i + 1} / {items.length}
        </span>
        <div className="lb-top-actions">
          {full && (
            <a className="btn ghost light" href={full} download={item.name}>
              Download
            </a>
          )}
          <button className="btn ghost light" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
      </div>
      <div className="lb-stage" onClick={(e) => e.stopPropagation()}>
        {body}
      </div>
      <div className="lb-caption">{item.name}</div>
      {items.length > 1 && (
        <>
          <button
            className="lb-nav prev"
            aria-label="Previous"
            onClick={(e) => {
              e.stopPropagation();
              setI((n) => (n - 1 + items.length) % items.length);
            }}
          >
            ‹
          </button>
          <button
            className="lb-nav next"
            aria-label="Next"
            onClick={(e) => {
              e.stopPropagation();
              setI((n) => (n + 1) % items.length);
            }}
          >
            ›
          </button>
        </>
      )}
    </div>
  );
}
