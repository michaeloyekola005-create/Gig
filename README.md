# Gig

**Like Google Drive, but your work actually looks good.**

Gig works like Drive (folders, uploads, search), with three changes for designers
and freelancers:

1. **Easy arranging.** Drag files and folders into the order you want. Drop a file onto a
   folder (or onto a breadcrumb) to move it. Each folder remembers its own layout:
   **Grid**, **Masonry**, **Large** or **List**.
2. **A clean, visual UI.** Real previews instead of a list of file names. Each tile shows
   its own main colour while it loads, so nothing flashes white.
3. **Colour themes, all cool-toned.** Glacier, Lagoon, Mint, Lavender, Mist, and dark
   Midnight, Deep Sea and Aurora. Pick one with the palette button; it's remembered.

## Features

- **Upload like Drive.** Use **New → Upload files / Upload folder / New folder**, drag files
  or whole folders anywhere on the page, or paste screenshots with Ctrl/⌘ V. Dropped folders
  keep their sub-folders.
- **Folders** show a preview of what's inside. Star a file to make it the folder's cover.
- **Preview** images, video and PDFs full screen (arrow keys, or swipe on a phone).
  Other files (`.fig`, `.psd`, `.ai`, `.zip`…) are stored and downloadable.
- **Search** across all folders, plus a **Recent** view.
- **Share as a page**: downloads one `.html` file of the folder, in your theme, that anyone
  can open in a browser.
- **Installable and offline**: it's a PWA ("Add to Home Screen" on a phone). Files are stored
  on the device (IndexedDB). Nothing is uploaded to a server yet.

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
| `src/db.ts` | IndexedDB storage: nested folders, files, thumbnails, moves, migrations |
| `src/media.ts` | Reads each upload: dimensions, thumbnail, main colour, video poster frame |
| `src/drop.ts` | Turns a drag-and-drop or folder upload into files with their folder paths |
| `src/actions.ts` | Create folders; upload while recreating dropped folder structure |
| `src/layout.ts` | Masonry and drag-to-reorder helpers |
| `src/theme.ts` | The cool-tone colour themes |
| `src/export.ts` | "Share as a page" single-file export |
| `src/components/` | Sidebar/top bar, folder view, folder cards, file gallery, preview, dialogs |
