import { getBlob } from './db';
import { downscale } from './media';
import { getTheme } from './theme';
import type { Folder, Item } from './types';
import { blobToDataUrl, escapeHtml, formatBytes } from './util';

const IMAGE_KEEP_ORIGINAL = 1.5 * 1024 * 1024;
const EMBED_LIMIT = 25 * 1024 * 1024;

/**
 * Build one self-contained HTML file for a folder: every file is embedded, so
 * it can be emailed or opened offline and looks the way it does in the app.
 */
export async function exportFolder(f: Folder, items: Item[], onProgress?: (n: number, total: number) => void) {
  const t = getTheme();
  const parts: string[] = [];
  let n = 0;
  for (const it of items) {
    const file = await getBlob('files', it.id);
    onProgress?.(++n, items.length);
    if (!file) continue;
    const name = escapeHtml(it.name);
    const ar = it.width && it.height ? ` style="aspect-ratio:${it.width}/${it.height};background:${it.color}"` : '';

    if (it.kind === 'image') {
      const blob =
        file.size > IMAGE_KEEP_ORIGINAL || it.mime === 'image/svg+xml' ? await downscale(file, 2400).catch(() => file) : file;
      parts.push(`<figure><img src="${await blobToDataUrl(blob)}" alt="${name}"${ar} loading="lazy"><figcaption>${name}</figcaption></figure>`);
    } else if (it.kind === 'video' && file.size <= EMBED_LIMIT) {
      parts.push(`<figure><video src="${await blobToDataUrl(file)}" controls playsinline${ar}></video><figcaption>${name}</figcaption></figure>`);
    } else if (file.size <= EMBED_LIMIT) {
      parts.push(
        `<figure class="file"><a href="${await blobToDataUrl(file)}" download="${name}"><b>${escapeHtml(
          it.name.split('.').pop()?.toUpperCase() ?? 'FILE'
        )}</b><small>${formatBytes(file.size)} · download</small></a><figcaption>${name}</figcaption></figure>`
      );
    }
  }

  const cols = f.layout === 'large' || f.layout === 'list' ? 1 : 3;
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(f.title)}</title>
<style>
:root{--bg:${t.bg};--panel:${t.panel};--card:${t.card};--fg:${t.fg};--muted:${t.muted};--line:${t.line};--accent:${t.accent}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font-family:Inter,system-ui,-apple-system,'Segoe UI',sans-serif;-webkit-font-smoothing:antialiased}
.wrap{max-width:1240px;margin:24px auto;padding:28px;background:var(--panel);border-radius:24px}
h1{font-size:22px;font-weight:600;margin:0 0 4px}.sub{color:var(--muted);font-size:13px;margin:0 0 24px}
main{columns:${cols} 280px;column-gap:16px}${cols === 1 ? 'main{max-width:960px;margin:0 auto}' : ''}
figure{margin:0 0 18px;break-inside:avoid}
img,video{display:block;width:100%;height:auto;border-radius:12px;cursor:zoom-in}video{cursor:auto}
figcaption{font-size:13px;color:var(--muted);padding:8px 2px 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.file a{display:flex;flex-direction:column;gap:6px;padding:28px;border-radius:12px;background:var(--card);color:inherit;text-decoration:none;border:1px solid var(--line)}
.file b{font-size:12px;letter-spacing:.1em;color:var(--accent)}.file small{color:var(--muted)}
#lb{position:fixed;inset:0;background:rgba(6,10,20,.94);display:none;align-items:center;justify-content:center;z-index:9;cursor:zoom-out}
#lb.on{display:flex}#lb img{max-width:94vw;max-height:92vh;width:auto;border-radius:6px}
@media(max-width:640px){.wrap{margin:0;border-radius:0;padding:20px 16px}}
</style></head><body>
<div class="wrap"><h1>${escapeHtml(f.title)}</h1><p class="sub">${items.length} file${items.length === 1 ? '' : 's'}</p>
<main>${parts.join('\n')}</main></div>
<div id="lb"><img alt=""></div>
<script>
var lb=document.getElementById('lb'),li=lb.querySelector('img');
document.querySelectorAll('main img').forEach(function(i){i.onclick=function(){li.src=i.src;lb.classList.add('on')}});
lb.onclick=function(){lb.classList.remove('on')};
document.onkeydown=function(e){if(e.key==='Escape')lb.classList.remove('on')};
</script>
</body></html>`;

  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
  a.download = `${f.title.replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-').toLowerCase() || 'folder'}.html`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
}
