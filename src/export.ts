import { getBlob } from './db';
import { downscale } from './media';
import type { Item, Project } from './types';
import { blobToDataUrl, escapeHtml, formatBytes } from './util';

const IMAGE_KEEP_ORIGINAL = 1.5 * 1024 * 1024;
const EMBED_LIMIT = 25 * 1024 * 1024;

/**
 * Build a single self-contained HTML page for a project: every image is
 * embedded, so the file can be emailed, dropped on any static host, or opened
 * offline by a client.
 */
export async function exportProject(p: Project, items: Item[], onProgress?: (n: number, total: number) => void) {
  const parts: string[] = [];
  let n = 0;
  for (const it of items) {
    const file = await getBlob('files', it.id);
    onProgress?.(++n, items.length);
    if (!file) continue;
    const caption = it.caption ? `<figcaption>${escapeHtml(it.caption)}</figcaption>` : '';
    const ar = it.width && it.height ? ` style="aspect-ratio:${it.width}/${it.height};background:${it.color}"` : '';

    if (it.kind === 'image') {
      const blob =
        file.size > IMAGE_KEEP_ORIGINAL || it.mime === 'image/svg+xml' ? await downscale(file, 2400).catch(() => file) : file;
      const src = await blobToDataUrl(blob);
      parts.push(`<figure><img src="${src}" alt="${escapeHtml(it.caption || it.name)}"${ar} loading="lazy">${caption}</figure>`);
    } else if (it.kind === 'video' && file.size <= EMBED_LIMIT) {
      parts.push(`<figure><video src="${await blobToDataUrl(file)}" controls playsinline${ar}></video>${caption}</figure>`);
    } else if (file.size <= EMBED_LIMIT) {
      parts.push(
        `<figure class="file"><a href="${await blobToDataUrl(file)}" download="${escapeHtml(it.name)}"><b>${escapeHtml(
          it.name.split('.').pop()?.toUpperCase() ?? 'FILE'
        )}</b><span>${escapeHtml(it.name)}</span><small>${formatBytes(file.size)} · download</small></a>${caption}</figure>`
      );
    }
  }

  const cols = p.layout === 'showcase' ? 1 : 3;
  const meta = [p.client && `for ${escapeHtml(p.client)}`, ...p.tags.map(escapeHtml)].filter(Boolean).join(' · ');
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(p.title || 'Portfolio')}</title>
<meta name="description" content="${escapeHtml(p.description.slice(0, 160))}">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
<style>
:root{--bg:#fafaf9;--fg:#18181b;--muted:#71717a;--card:#fff}
@media(prefers-color-scheme:dark){:root{--bg:#0c0c0d;--fg:#f4f4f5;--muted:#a1a1aa;--card:#18181b}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font-family:Inter,system-ui,sans-serif;-webkit-font-smoothing:antialiased}
header{max-width:1200px;margin:0 auto;padding:96px 24px 48px}
h1{font-size:clamp(36px,6vw,64px);letter-spacing:-.03em;line-height:1.02;margin:0 0 16px}
.meta{color:var(--muted);font-size:14px;text-transform:uppercase;letter-spacing:.08em;margin-bottom:24px}
.desc{font-size:18px;line-height:1.6;max-width:640px;color:var(--muted);white-space:pre-wrap;margin:0}
main{max-width:1200px;margin:0 auto;padding:0 24px 96px;columns:${cols} 320px;column-gap:20px}
${p.layout === 'showcase' ? 'main{max-width:1000px}' : ''}
figure{margin:0 0 20px;break-inside:avoid}
img,video{display:block;width:100%;height:auto;border-radius:10px;cursor:zoom-in}
video{cursor:auto}
figcaption{font-size:14px;color:var(--muted);padding:10px 2px 0}
.file a{display:flex;flex-direction:column;gap:6px;padding:28px;border-radius:10px;background:var(--card);color:inherit;text-decoration:none;border:1px solid rgba(127,127,127,.2)}
.file b{font-size:12px;letter-spacing:.1em;color:#f97316}.file small{color:var(--muted)}
footer{text-align:center;color:var(--muted);font-size:13px;padding:0 0 48px}
#lb{position:fixed;inset:0;background:rgba(0,0,0,.92);display:none;align-items:center;justify-content:center;z-index:9;cursor:zoom-out}
#lb.on{display:flex}#lb img{max-width:94vw;max-height:92vh;width:auto;border-radius:4px}
</style></head><body>
<header><h1>${escapeHtml(p.title || 'Untitled project')}</h1>${meta ? `<div class="meta">${meta}</div>` : ''}${
    p.description ? `<p class="desc">${escapeHtml(p.description)}</p>` : ''
  }</header>
<main>${parts.join('\n')}</main>
<footer>Made with Gig</footer>
<div id="lb"><img alt=""></div>
<script>
var lb=document.getElementById('lb'),li=lb.querySelector('img');
document.querySelectorAll('main img').forEach(function(i){i.onclick=function(){li.src=i.src;lb.classList.add('on')}});
lb.onclick=function(){lb.classList.remove('on')};
document.onkeydown=function(e){if(e.key==='Escape')lb.classList.remove('on')};
</script>
</body></html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${(p.title || 'portfolio').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-').toLowerCase() || 'portfolio'}.html`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
}
