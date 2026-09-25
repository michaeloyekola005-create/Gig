import { addItem, getFolder, notifyChanged, saveFolder } from './db';
import type { Item, Kind } from './types';
import { uid } from './util';

const THUMB_MAX = 1200;

export function kindOf(file: File): Kind {
  const t = file.type;
  if (t.startsWith('image/')) return 'image';
  if (t.startsWith('video/')) return 'video';
  if (t === 'application/pdf' || /\.pdf$/i.test(file.name)) return 'pdf';
  return 'file';
}

function loadImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Unsupported image'));
    };
    img.src = url;
  });
}

function videoFrame(blob: Blob): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const v = document.createElement('video');
    v.muted = true;
    v.playsInline = true;
    v.preload = 'auto';
    v.onloadeddata = () => {
      v.currentTime = Math.min(0.5, (v.duration || 1) / 3);
    };
    v.onseeked = () => resolve(v);
    v.onerror = () => reject(new Error('Unsupported video'));
    v.src = url;
  });
}

type Source = HTMLImageElement | HTMLVideoElement;
const dims = (s: Source) =>
  s instanceof HTMLVideoElement ? [s.videoWidth, s.videoHeight] : [s.naturalWidth, s.naturalHeight];

function toCanvas(src: Source, max: number): HTMLCanvasElement {
  const [w, h] = dims(src);
  const scale = Math.min(1, max / Math.max(w, h));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w * scale));
  c.height = Math.max(1, Math.round(h * scale));
  c.getContext('2d')!.drawImage(src, 0, 0, c.width, c.height);
  return c;
}

function dominantColor(src: Source): string {
  const c = document.createElement('canvas');
  c.width = c.height = 12;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(src, 0, 0, 12, 12);
  const { data } = ctx.getImageData(0, 0, 12, 12);
  let r = 0, g = 0, b = 0, n = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 32) continue;
    r += data[i]; g += data[i + 1]; b += data[i + 2]; n++;
  }
  if (!n) return '#e7e5e4';
  return `rgb(${Math.round(r / n)}, ${Math.round(g / n)}, ${Math.round(b / n)})`;
}

const canvasBlob = (c: HTMLCanvasElement, type = 'image/webp', q = 0.86) =>
  new Promise<Blob | null>((resolve) => c.toBlob(resolve, type, q));

/** Re-encode an image for export (smaller than the original, still sharp). */
export async function downscale(blob: Blob, max: number): Promise<Blob> {
  const img = await loadImage(blob);
  URL.revokeObjectURL(img.src);
  return (await canvasBlob(toCanvas(img, max), 'image/jpeg', 0.9)) ?? blob;
}

async function ingestOne(file: File, folderId: string): Promise<Item> {
  const kind = kindOf(file);
  const item: Item = {
    id: uid(),
    folderId,
    name: file.name,
    mime: file.type || 'application/octet-stream',
    kind,
    size: file.size,
    width: 0,
    height: 0,
    color: '#e7e5e4',

    hasThumb: false,
    createdAt: Date.now(),
  };
  let thumb: Blob | null = null;
  if (kind === 'image' || kind === 'video') {
    try {
      const src = kind === 'image' ? await loadImage(file) : await videoFrame(file);
      [item.width, item.height] = dims(src);
      item.color = dominantColor(src);
      thumb = await canvasBlob(toCanvas(src, THUMB_MAX));
      item.hasThumb = !!thumb;
      URL.revokeObjectURL(src.src);
    } catch {
      // Formats the browser can't decode (e.g. HEIC, PSD) are still stored and shown as a file card.
      if (kind === 'image') item.kind = 'file';
    }
  }
  await addItem(item, file, thumb);
  return item;
}

/** Add files to a folder. Runs a few at a time and reports progress. */
export async function ingestFiles(
  files: File[],
  folderId: string,
  onProgress?: (done: number, total: number) => void
): Promise<void> {
  const accepted = files.filter((f) => !f.name.startsWith('.'));
  let done = 0;
  const added: Item[] = [];
  const queue = [...accepted];
  const worker = async () => {
    for (let f = queue.shift(); f; f = queue.shift()) {
      added.push(await ingestOne(f, folderId));
      onProgress?.(++done, accepted.length);
    }
  };
  await Promise.all([worker(), worker(), worker()]);

  const p = await getFolder(folderId);
  if (p) {
    // Keep the order the user dropped them in.
    const byName = new Map(accepted.map((f, i) => [f.name + f.size, i]));
    added.sort((a, b) => (byName.get(a.name + a.size) ?? 0) - (byName.get(b.name + b.size) ?? 0));
    p.order = [...p.order, ...added.map((i) => i.id)];
    if (!p.coverId) p.coverId = added.find((i) => i.hasThumb)?.id ?? null;
    await saveFolder(p);
  }
  notifyChanged();
  navigator.storage?.persist?.().catch(() => {});
}
