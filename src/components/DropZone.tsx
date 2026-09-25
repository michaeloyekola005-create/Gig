import { useEffect, useState } from 'react';
import { groupsFromDataTransfer, hasFiles, type DropGroup } from '../drop';

/** Full-window drop target. Shows an overlay while files are dragged over the page. */
export function WindowDrop({ label, onDrop }: { label: string; onDrop: (groups: DropGroup[]) => void }) {
  const [active, setActive] = useState(false);
  useEffect(() => {
    let depth = 0;
    const enter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth++;
      setActive(true);
    };
    const leave = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      if (--depth <= 0) {
        depth = 0;
        setActive(false);
      }
    };
    const over = (e: DragEvent) => {
      if (hasFiles(e)) e.preventDefault();
    };
    const drop = async (e: DragEvent) => {
      if (!hasFiles(e) || !e.dataTransfer) return;
      e.preventDefault();
      depth = 0;
      setActive(false);
      onDrop(await groupsFromDataTransfer(e.dataTransfer));
    };
    window.addEventListener('dragenter', enter);
    window.addEventListener('dragleave', leave);
    window.addEventListener('dragover', over);
    window.addEventListener('drop', drop);
    return () => {
      window.removeEventListener('dragenter', enter);
      window.removeEventListener('dragleave', leave);
      window.removeEventListener('dragover', over);
      window.removeEventListener('drop', drop);
    };
  }, [onDrop]);

  return (
    <div className={`drop-overlay ${active ? 'on' : ''}`} aria-hidden={!active}>
      <div className="drop-card">
        <div className="drop-icon">↓</div>
        <div>{label}</div>
      </div>
    </div>
  );
}

export function PickFiles({
  onFiles,
  className = 'btn',
  children,
}: {
  onFiles: (files: File[]) => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={className}>
      {children}
      <input
        type="file"
        multiple
        hidden
        accept="image/*,video/*,application/pdf,.fig,.sketch,.psd,.ai,.xd,.zip"
        onChange={(e) => {
          onFiles(Array.from(e.target.files ?? []));
          e.target.value = '';
        }}
      />
    </label>
  );
}
