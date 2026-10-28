import fs from 'node:fs';
import { ipcMain, nativeImage } from 'electron';
import { EVENTS } from '../../shared/events';
import { openBrowserWindow } from '../browser-window';
import {
  addTagToSnap,
  deleteSnap,
  getAllSnaps,
  getAllTagsWithUsageCount,
  getSnap,
  getTagNamesForSnap,
  removeTagFromSnap,
  type SnapRecord,
  updateSnap,
} from '../database';
import {
  closeSnapWindow,
  getSnapWindows,
  reopenSnapWindow,
} from '../snap-window';
import {
  deleteSnapFiles,
  exportPathFor,
  findIcnsPath,
  handleDuplicate,
  resolveAppPath,
} from '../utils';
import { cosineSim, decodeEmbedding, embedText } from '../vision';

// eslint-disable-next-line @typescript-eslint/no-require-imports -- no types available
const icns = require('electron-icns-ex');

const appIconCache = new Map<string, string | null>();

const DRAG_ICON_SIZE = 96;

/** Thumbnail scaled to fit the drag-image box, falling back to the image itself. */
function dragIcon(snap: SnapRecord): Electron.NativeImage {
  let icon = nativeImage.createFromPath(snap.thumbPath);
  if (icon.isEmpty()) icon = nativeImage.createFromPath(snap.filePath);
  const { width, height } = icon.getSize();
  if (width === 0 || height === 0) return icon;
  const scale = DRAG_ICON_SIZE / Math.max(width, height);
  return icon.resize({
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  });
}

export function registerLibraryHandlers(notifyTrayUpdated: () => void): void {
  // Duplicate
  ipcMain.handle(EVENTS.SNAP_DUPLICATE, (_event, snapId: string) => {
    handleDuplicate(snapId);
  });

  // Library queries — strip the binary visualEmbedding from snaps before
  // sending over IPC; the renderer never needs it (CLIP search goes through
  // LIBRARY_SEARCH_BY_TEXT).
  ipcMain.handle(EVENTS.LIBRARY_GET_SNAPS, () => {
    return getAllSnaps().map((snap) => {
      const { visualEmbedding: _omitted, ...rest } = snap;
      void _omitted;
      return rest;
    });
  });

  // CLIP text-to-image search. Encodes the query via MobileCLIP text encoder,
  // computes cosine similarity against every snap's stored image embedding,
  // and returns the above-threshold matches.
  ipcMain.handle(
    EVENTS.LIBRARY_SEARCH_BY_TEXT,
    async (_event, query: string, threshold = 0.2) => {
      const trimmed = query.trim();
      if (!trimmed) return [] as { snapId: string; score: number }[];
      const q = await embedText(trimmed);
      const snaps = getAllSnaps() as SnapRecord[];
      const results: { snapId: string; score: number }[] = [];
      for (const snap of snaps) {
        if (!snap.visualEmbedding) continue;
        const emb = decodeEmbedding(snap.visualEmbedding);
        const score = cosineSim(q, emb);
        if (score >= threshold) {
          results.push({ snapId: snap.id, score });
        }
      }
      results.sort((a, b) => b.score - a.score);
      return results;
    },
  );

  ipcMain.handle(
    EVENTS.LIBRARY_RENAME_SNAP,
    (_event, snapId: string, name: string | null) => {
      updateSnap(snapId, {
        name: name || null,
        lastModifiedAt: new Date().toISOString(),
      });
      notifyTrayUpdated();
    },
  );

  ipcMain.handle(
    EVENTS.LIBRARY_REASSIGN_APP,
    (_event, snapId: string, sourceApp: string | null) => {
      const trimmed = sourceApp?.trim() ?? '';
      updateSnap(snapId, {
        sourceApp: trimmed || null,
        lastModifiedAt: new Date().toISOString(),
      });
      notifyTrayUpdated();
    },
  );

  // Tag handlers
  ipcMain.handle(EVENTS.TAG_ADD, (_event, snapId: string, tag: string) => {
    addTagToSnap(snapId, tag.trim());
    notifyTrayUpdated();
  });

  ipcMain.handle(EVENTS.TAG_REMOVE, (_event, snapId: string, tag: string) => {
    removeTagFromSnap(snapId, tag);
    notifyTrayUpdated();
  });

  ipcMain.handle(EVENTS.TAG_GET_FOR_SNAP, (_event, snapId: string) => {
    return getTagNamesForSnap(snapId);
  });

  ipcMain.handle(EVENTS.TAG_GET_ALL, () => {
    return getAllTagsWithUsageCount();
  });

  // Open / delete
  ipcMain.handle(EVENTS.LIBRARY_OPEN_SNAP, (_event, snapId: string) => {
    const snap = getSnap(snapId);
    if (snap) {
      reopenSnapWindow(snap);
      updateSnap(snapId, {
        isOpen: 1,
        lastOpenedAt: new Date().toISOString(),
      });
    }
  });

  ipcMain.handle(EVENTS.LIBRARY_DELETE_SNAP, (_event, snapId: string) => {
    const snap = getSnap(snapId);
    if (snap) {
      for (const [winId, entry] of getSnapWindows()) {
        if (entry.snapId === snapId) {
          closeSnapWindow(winId);
          break;
        }
      }
      deleteSnapFiles(snap);
      deleteSnap(snapId);
    }
  });

  ipcMain.handle(EVENTS.LIBRARY_READ_THUMBNAIL, (_event, thumbPath: string) => {
    if (!fs.existsSync(thumbPath)) return null;
    const buffer = fs.readFileSync(thumbPath);
    return `data:image/png;base64,${buffer.toString('base64')}`;
  });

  // Drag snaps out to other apps as files. The renderer cancels the
  // HTML drag and asks main to start a native one, which carries real
  // file paths that Finder, Slack, browsers, etc. accept. An annotated
  // snap drags its flattened PNG, not the bare capture.
  ipcMain.on(EVENTS.LIBRARY_START_DRAG, (event, snapIds: unknown) => {
    const ids = Array.isArray(snapIds)
      ? snapIds.filter((id): id is string => typeof id === 'string')
      : [];
    const snaps = ids
      .map((id) => getSnap(id))
      .filter((snap): snap is SnapRecord => !!snap)
      .filter((snap) => fs.existsSync(snap.filePath));
    if (snaps.length === 0) return;

    const files = snaps.map((snap) => exportPathFor(snap));
    event.sender.startDrag({
      file: files[0],
      files,
      icon: dragIcon(snaps[0]),
    });
  });

  // Browser window
  ipcMain.on(EVENTS.BROWSER_OPEN, () => {
    openBrowserWindow();
  });

  // App icon retrieval — reads .icns files directly since
  // app.getFileIcon doesn't return proper icons on macOS.
  // resolveAppPath layers Launch Services → Spotlight so partial /
  // vendor-stripped names ("Photoshop") still find their bundles.
  ipcMain.handle(EVENTS.GET_APP_ICON, (_event, appName: string) => {
    if (appIconCache.has(appName)) return appIconCache.get(appName);

    try {
      const appPath = resolveAppPath(appName);
      if (!appPath) {
        appIconCache.set(appName, null);
        return null;
      }

      const iconPath = findIcnsPath(appPath);
      if (!iconPath) {
        appIconCache.set(appName, null);
        return null;
      }

      const dataUrl = icns.parseIcnsToBase64Sync(iconPath) as string;
      appIconCache.set(appName, dataUrl);
      return dataUrl;
    } catch {
      appIconCache.set(appName, null);
      return null;
    }
  });
}
