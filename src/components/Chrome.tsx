import { createFolder, upload } from '../actions';
import { askText } from '../dialog';
import { go, usePopover, useStorageUsed } from '../hooks';
import { setTheme, THEMES, useTheme } from '../theme';
import { formatBytes } from '../util';
import { PickFiles } from './DropZone';
import { Icon } from './Icons';

export async function newFolder(parentId: string) {
  const name = await askText('New folder', 'Untitled folder', 'Create');
  if (name?.trim()) await createFolder(parentId, name.trim());
}

/** The "+ New" button: new folder, upload files, upload folder. */
export function NewMenu({ folderId, fab = false }: { folderId: string; fab?: boolean }) {
  const [open, setOpen, ref] = usePopover();
  const close = () => setOpen(false);
  return (
    <div className={`popover-wrap ${fab ? 'fab-wrap' : ''}`} ref={ref}>
      <button className={fab ? 'fab' : 'new-btn'} onClick={() => setOpen(!open)} aria-haspopup="menu" aria-expanded={open}>
        <Icon name="plus" size={fab ? 26 : 22} />
        {!fab && 'New'}
      </button>
      {open && (
        <div className="menu" role="menu">
          <button role="menuitem" onClick={() => (close(), newFolder(folderId))}>
            <Icon name="folderPlus" /> New folder
          </button>
          <div className="menu-sep" />
          <PickFiles className="menu-item" onFiles={(f) => (close(), upload(f, folderId))}>
            <Icon name="upload" /> Upload files
          </PickFiles>
          <PickFiles className="menu-item" folder onFiles={(f) => (close(), upload(f, folderId))}>
            <Icon name="folderUp" /> Upload folder
          </PickFiles>
        </div>
      )}
    </div>
  );
}

export function ThemePicker() {
  const theme = useTheme();
  const [open, setOpen, ref] = usePopover();
  return (
    <div className="popover-wrap" ref={ref}>
      <button className="icon-btn" onClick={() => setOpen(!open)} title="Colour theme" aria-label="Colour theme">
        <Icon name="palette" />
      </button>
      {open && (
        <div className="menu theme-menu" role="menu">
          <div className="menu-label">Theme</div>
          <div className="swatches">
            {THEMES.map((t) => (
              <button
                key={t.id}
                className={`swatch ${t.id === theme.id ? 'on' : ''}`}
                onClick={() => setTheme(t)}
                title={t.name}
                aria-label={t.name}
                style={{ background: `linear-gradient(135deg, ${t.bg} 0 50%, ${t.accent} 50% 100%)` }}
              >
                {t.id === theme.id && <Icon name="check" size={16} />}
              </button>
            ))}
          </div>
          <div className="menu-label theme-name">{theme.name}</div>
        </div>
      )}
    </div>
  );
}

export function Sidebar({ route, folderId }: { route: string[]; folderId: string }) {
  const used = useStorageUsed();
  const inRecent = route[0] === 'recent';
  return (
    <aside className="sidebar">
      <a className="brand" href="#/">
        <img src="/icon.svg" alt="" width={30} height={30} /> Gig
      </a>
      <NewMenu folderId={folderId} />
      <nav className="nav">
        <a className={!inRecent ? 'on' : ''} href="#/">
          <Icon name="drive" /> My Drive
        </a>
        <a className={inRecent ? 'on' : ''} href="#/recent">
          <Icon name="clock" /> Recent
        </a>
      </nav>
      <div className="sidebar-foot">
        {used !== null && <span className="muted">{formatBytes(used)} used on this device</span>}
      </div>
    </aside>
  );
}

export function TopBar({ query, onQuery, folderId }: { query: string; onQuery: (q: string) => void; folderId: string }) {
  return (
    <header className="topbar">
      <a className="brand mobile-only" href="#/" onClick={() => go('/')}>
        <img src="/icon.svg" alt="" width={28} height={28} />
      </a>
      <label className="search">
        <Icon name="search" size={18} />
        <input placeholder="Search in Drive" value={query} onChange={(e) => onQuery(e.target.value)} />
        {query && (
          <button className="icon-btn small" onClick={() => onQuery('')} aria-label="Clear search">
            <Icon name="close" size={16} />
          </button>
        )}
      </label>
      <ThemePicker />
      <div className="mobile-only">
        <NewMenu folderId={folderId} fab />
      </div>
    </header>
  );
}
