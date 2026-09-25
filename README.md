# Gig

**Drop your designs in. Get a portfolio out.**

Google Drive shows your work as a white list of filenames. Gig takes the same
drag-and-drop upload and turns it into something you'd actually show a client.

## What it does

- **Upload like Drive.** Drag files or whole folders anywhere on the page, click
  Upload, or paste screenshots with Ctrl/⌘ V. Each dropped folder becomes its own project.
- **Arranged for you.** Images and videos are laid out automatically in
  **Masonry**, **Grid** or **Showcase** (one big piece per row). Each tile shows
  its own main colour while loading, so the page never flashes white.
- **Presentable in one click.** *Present* turns a project into a clean case-study
  page with title, client, tags and a short write-up. *Slideshow* goes full screen
  (arrow keys, or swipe on a phone).
- **Share without an account.** *Export website* downloads one `.html` file with every
  image inside it. Email it, or put it on Netlify, Vercel or GitHub Pages.
- **Organise lightly.** Drag to reorder, ★ to pick the cover, add captions, search
  by project, client or tag.
- **Installable and offline.** It's a PWA: on a phone, "Add to Home Screen" and it
  opens like an app. Files are stored on the device (IndexedDB); nothing is uploaded
  to a server.

Images, video and PDFs get previews. Other files (`.fig`, `.psd`, `.ai`, `.zip`…) are
kept and shown as clean file cards you can download.

## Run it

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # production build in dist/
npm run preview   # serve the build (enables offline/PWA)
```

`dist/` is a static site: deploy it to any static host.

## Code map

| Path | What's there |
| --- | --- |
| `src/db.ts` | IndexedDB storage for projects, items, original files and thumbnails |
| `src/media.ts` | Reads each file: size, thumbnail, main colour, video poster frame |
| `src/drop.ts` | Turns a drag-and-drop into files, one group per folder |
| `src/layout.ts` | Masonry layout that keeps left-to-right reading order |
| `src/export.ts` | Builds the single-file portfolio website |
| `src/components/` | Library, project editor/present view, gallery, lightbox |
