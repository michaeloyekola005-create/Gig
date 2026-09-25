import { useEffect, useRef, useState } from 'react';
import { useDialog } from '../dialog';

export function Dialog() {
  const d = useDialog();
  const [value, setValue] = useState('');
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (d?.kind === 'text') {
      setValue(d.value);
      requestAnimationFrame(() => {
        input.current?.focus();
        // Select the name without its extension, like Drive does.
        const dot = d.value.lastIndexOf('.');
        input.current?.setSelectionRange(0, dot > 0 ? dot : d.value.length);
      });
    }
  }, [d]);

  if (!d) return null;
  const cancel = () => (d.kind === 'text' ? d.resolve(null) : d.resolve(false));
  const ok = () => (d.kind === 'text' ? d.resolve(value) : d.resolve(true));

  return (
    <div className="dialog-backdrop" onMouseDown={cancel}>
      <form
        className="dialog"
        onMouseDown={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          ok();
        }}
        onKeyDown={(e) => e.key === 'Escape' && cancel()}
      >
        <h2>{d.title}</h2>
        {d.kind === 'text' ? (
          <input ref={input} className="field" value={value} onChange={(e) => setValue(e.target.value)} />
        ) : (
          <p className="muted">{d.body}</p>
        )}
        <div className="dialog-actions">
          <button type="button" className="btn ghost" onClick={cancel} autoFocus={d.kind === 'confirm'}>
            Cancel
          </button>
          <button type="submit" className={`btn ${d.kind === 'confirm' && d.danger ? 'danger' : 'primary'}`}>
            {d.confirm}
          </button>
        </div>
      </form>
    </div>
  );
}
