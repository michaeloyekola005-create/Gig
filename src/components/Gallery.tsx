import { useState } from 'react';
import { setDragging } from '../drop';
import { useElementWidth } from '../hooks';
import { columnsFor, masonry, reorder, sideOf, type Side } from '../layout';
import type { Item, Layout } from '../types';
import { formatBytes } from '../util';
import { Icon } from './Icons';
import { extOf, Thumb, Tile } from './Tile';

export interface ItemActions {
  coverId: string | null;
  onReorder: (ids: string[]) => void;
  onCover: (item: Item) => void;
  onRename: (item: Item) => void;
  onDelete: (item: Item) => void;
}

interface Props {
  items: Item[];
  layout: Layout;
  onOpen: (index: number) => void;
  /** When given, files can be dragged to rearrange and show actions. */
  edit?: ItemActions;
}

const dateFmt = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

export function Gallery({ items, layout, onOpen, edit }: Props) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<{ id: string; side: Side } | null>(null);
  const [actionsFor, setActionsFor] = useState<string | null>(null);
  const index = new Map(items.map((it, i) => [it.id, i]));
  const vertical = layout === 'list' || layout === 'large';

  const end = () => {
    setDragId(null);
    setOver(null);
    setDragging(null);
  };

  const cell = (it: Item) => {
    const mark = over?.id === it.id && dragId && dragId !== it.id ? `drop-${over.side}` : '';
    return (
      <figure
        key={it.id}
        className={`cell ${dragId === it.id ? 'dragging' : ''} ${mark} ${actionsFor === it.id ? 'show-actions' : ''}`}
        draggable={!!edit}
        onDragStart={(e) => {
          setDragId(it.id);
          setDragging({ kind: 'item', id: it.id });
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', it.name);
        }}
        onDragEnd={end}
        onDragOver={(e) => {
          if (!dragId) return;
          e.preventDefault();
          e.stopPropagation();
          setOver({ id: it.id, side: sideOf(e, vertical) });
        }}
        onDrop={(e) => {
          if (!dragId || !edit) return;
          e.preventDefault();
          e.stopPropagation();
          edit.onReorder(reorder(items.map((i) => i.id), dragId, it.id, sideOf(e, vertical)));
          end();
        }}
      >
        <button className="cell-open" onClick={() => onOpen(index.get(it.id)!)} aria-label={`Open ${it.name}`}>
          {layout === 'list' ? (
            <div className="row">
              <span className="row-thumb" style={{ background: it.hasThumb ? it.color : undefined }}>
                {it.hasThumb ? <Thumb item={it} /> : <span className="row-ext">{extOf(it.name)}</span>}
              </span>
              <span className="row-name">{it.name}</span>
              <span className="row-meta">{formatBytes(it.size)}</span>
              <span className="row-meta hide-sm">{dateFmt.format(it.createdAt)}</span>
            </div>
          ) : (
            <Tile item={it} fit={layout === 'grid' ? 'cover' : 'natural'} />
          )}
        </button>
        {layout !== 'list' && <figcaption title={it.name}>{it.name}</figcaption>}
        {edit && (
          <button
            className="cell-more"
            aria-label="Actions"
            onClick={() => setActionsFor(actionsFor === it.id ? null : it.id)}
          >
            <Icon name={actionsFor === it.id ? 'close' : 'more'} size={16} />
          </button>
        )}
        {edit && (
          <div className="cell-actions">
            {it.hasThumb && (
              <button
                className={edit.coverId === it.id ? 'on' : ''}
                title={edit.coverId === it.id ? 'Folder cover' : 'Use as folder cover'}
                onClick={() => edit.onCover(it)}
              >
                <Icon name="star" size={15} fill={edit.coverId === it.id} />
              </button>
            )}
            <button title="Rename" onClick={() => edit.onRename(it)}>
              <Icon name="pencil" size={15} />
            </button>
            <button title="Delete" onClick={() => edit.onDelete(it)}>
              <Icon name="trash" size={15} />
            </button>
          </div>
        )}
      </figure>
    );
  };

  if (layout === 'masonry') {
    const cols = width ? masonry(items, columnsFor(width)) : [];
    return (
      <div ref={ref} className="gallery masonry">
        {cols.map((col, i) => (
          <div key={i} className="masonry-col">
            {col.map(cell)}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div ref={ref} className={`gallery ${layout}`}>
      {layout === 'list' && (
        <div className="row row-head">
          <span className="row-thumb" />
          <span className="row-name">Name</span>
          <span className="row-meta">Size</span>
          <span className="row-meta hide-sm">Added</span>
        </div>
      )}
      {items.map(cell)}
    </div>
  );
}
