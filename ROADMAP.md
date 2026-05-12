# Snap Roadmap

Personal utility — priorities are whatever feels most useful, not what makes sense for a product.

## In progress / next up

In order:

1. **FilterPanel ResizeObserver** (polish, was V2 follow-up) — section sizing uses a measured container height to compute how many rows fit per section. The measurement is captured via a ref callback which only fires on mount, so after the user resizes the window the cap uses a stale value. Fix: attach a `ResizeObserver` to the scroll region in `FilterPanel.tsx` and update `availableHeight` on every resize.

2. **Re-assign app categorization** — right-click snap → "Move to app..." with list of existing apps or custom entry. Useful when detection was wrong or the app name changed.

3. **Blur annotation tool** — new annotation type: a rectangle region that blurs the underlying image. Konva has filters that can do this. Great for sensitive info in screenshots shared elsewhere.

4. **Settings interface** — see Settings section below.

## Annotation overhaul

Multi-part initiative. Current state: annotations are persisted as JSON ([database.ts](src/main/database.ts) `annotations` TEXT column) on top of the immutable original image — good. But there are gaps:

### Scale annotations with image (bug)
Float-window resize does not rescale annotations. Shapes are stored with raw pixel coords from Stage size at draw time. Fix: normalize coords to image space (0..1 or original-image pixels) and scale at render time. Without this, none of the other annotation work below feels right.

### Render annotations in library grid
Show annotations on top of the image preview in `LibraryGridItem`, *and* keep the small "has annotations" indicator badge. The badge stays useful when the user has the grid sized small and overlay detail is unreadable; at large sizes it's a quick at-a-glance "this one is marked up" signal even when the annotation is itself visible. Note: library grid items are user-scalable up to fairly large sizes — not fixed thumbnails — so the rendering must look right from small all the way up. Reuse the same JSON the float uses; render a non-interactive Konva stage scaled to the current item size. Depends on the scaling fix above so coords are portable across sizes.

### Undo/redo while editing
While a float is open: in-memory undo/redo stack for add/move/edit/delete of annotations. Lost on close (closing commits whatever is current). Keyboard: `Cmd+Z` / `Cmd+Shift+Z`. Restore-to-pre-annotation remains the only "rewind" available after close.

### Restore to pre-annotation state
Already conceptually supported (clear the JSON). Make sure the context-menu "Revert" path is wired up cleanly once the rendering changes above land — and that it updates the library grid in real time.

## V3 and beyond

### Folder/collection organization
Beyond tags — a way to group snaps into named folders in the sidebar. Drag snaps into folders in the browser grid.

## Settings interface

A preferences window (or panel) for configuring default behavior and shortcuts.

### Ideas for settings
- **Auto-copy on capture** — automatically put new snaps on the clipboard. Toggle on/off.
- **Keyboard shortcuts** — rebind the capture shortcut (currently `Cmd+Shift+2`) and potentially other app-level shortcuts
- **Default Pixel Perfect mode** — snaps open with shadow off by default
- **Default opacity** — (if you want to start new snaps translucent)
- **Thumbnail size / storage** — let user tune how large thumbnails are, or clean up old ones
- **Snaps storage location** — currently `userData/snaps/`, maybe let user choose

### Where it lives
- Probably a new `SettingsWindow` (similar pattern to `BrowserWindow`) — standard macOS window opened from the tray or a gear icon somewhere
- Settings stored in a `settings` table or JSON file in userData
- Main process reads settings on startup and applies them; renderer subscribes to changes

## Shipped

For posterity / so future-me knows what's already in the app.

- Rename snaps (inline edit, F2, context menu) — [4cb828e](https://github.com/carolineartz/snappy/commit/4cb828e)
- Tag snaps (add/remove + filter in sidebar) — [90430eb](https://github.com/carolineartz/snappy/commit/90430eb)
- Search across name/tag/app with `tag:` / `app:` / `name:` keyword triggers + autocomplete
- OCR (Vision framework) + Vision classification + MobileCLIP semantic search
- Sort by Created / Opened / Modified with Finder-style header pills
- Library liquid-glass redesign + Finder-style keyboard nav + Quick Look preview

## Explicitly out of scope

- Sharing features (SnapLink, social integrations) — not useful for personal workflow
- Windows/Linux support — personal macOS-only app
- iCloud sync — original had it; not needed yet
