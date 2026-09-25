import { useEffect, useState } from 'react';
import { filesFromDataTransfer, fromFileList, hasFiles, type DroppedFile } from '../drop';
import { Icon } from './Icons';

/** Full-window drop target. Shows an overlay while files are dragged over the page. */
export function WindowDrop({ label, onDrop }: { label: string; onDrop: (files: DroppedFile[]) => void }) {
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
      onDrop(await filesFromDataTransfer(e.dataTransfer));
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
        <span className="drop-icon">
          <Icon name="upload" size={24} />
        </span>
        <div>{label}</div>
      </div>
    </div>
  );
}

export function PickFiles({
  onFiles,
  folder = false,
  className,
  children,
}: {
  onFiles: (files: DroppedFile[]) => void;
  folder?: boolean;
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
        {...(folder ? { webkitdirectory: '' } : {})}
        onChange={(e) => {
          onFiles(fromFileList(Array.from(e.target.files ?? [])));
          e.target.value = '';
        }}
      />
    </label>
  );
}
