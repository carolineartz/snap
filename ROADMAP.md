# Snappy Roadmap

Personal utility — priorities are whatever feels most useful, not what makes sense for a product.

## Next up (V2)

Features that build on the existing foundation without major architectural changes.

### Rename snaps
- Add `name` column to `snaps` table (TEXT, nullable)
- UI: double-click or F2 on a snap in the browser grid to rename inline
- Context menu "Rename" option
- Falls back to source app + date when unnamed

### Tag snaps
- New `tags` table: `(snap_id, tag_name)` with index on both columns
- Tags section in browser sidebar (currently a placeholder)
- Context menu "Add tag..." with autocomplete of existing tags
- Click a tag in the sidebar to filter

### Search
- Search bar in browser header (already has a placeholder spot)
- Searches across: snap name, tag names, source app name
- Live filter as you type
- Depends on rename + tag features above

### OCR search
- Extract text from snap images so you can search by image content
- Run OCR on capture (background process, don't block window creation)
- Store extracted text in a new `snap_text` column or FTS5 virtual table for fast search
- Ideas for libraries:
  - **Tesseract.js** — pure JS, works in Node/Electron main process, but large (~10MB wasm) and slow
  - **macOS Vision framework** via a native Swift helper binary — much faster, already installed on every Mac, best accuracy. Would bundle a small helper binary invoked via exec.
  - Start with Tesseract.js for simplicity, optimize with Vision later if performance matters
- Search integration: if OCR text includes the query, include that snap in results; optionally show a snippet of the matched text in the grid item

## V3 and beyond

### Sort options in browser
- Sort by Last Opened (new column, updated on reopen)
- Sort by Last Modified (updated when annotations change)

### Re-assign app categorization
- Right-click snap → "Move to app..." with list of existing apps or custom entry
- Useful when detection was wrong or the app name changed

### Blur annotation tool
- New annotation type: a rectangle region that blurs the underlying image
- Konva has filters that can do this
- Great for sensitive info in screenshots shared elsewhere

### Folder/collection organization
- Beyond tags — a way to group snaps into named folders in the sidebar
- Drag snaps into folders in the browser grid

## Known issues

- **Packaged DMG doesn't work on second Mac** — dev mode works fine. Haven't debugged yet. (Currently running dev mode on the other machine.)

## Explicitly out of scope (for now)

- Sharing features (SnappyLink, social integrations) — original Snappy had these but Caroline explicitly deprioritized for MVP
- Windows/Linux support — personal macOS-only app
- iCloud sync — original had it; not needed yet
