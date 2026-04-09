import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {
  app,
  BrowserWindow,
  clipboard,
  globalShortcut,
  ipcMain,
  Menu,
  nativeImage,
} from 'electron';
import log from 'electron-log';
import { menubar } from 'menubar';
import type { AnnotationTool } from '../shared/annotation-types';
import {
  DEFAULT_COLOR,
  DEFAULT_COLORS,
  DEFAULT_STROKE_WIDTH,
  DEFAULT_STROKE_WIDTHS,
} from '../shared/annotation-types';
import { APP_NAME, CAPTURE_SHORTCUT, WINDOW_CONFIG } from '../shared/constants';
import { EVENTS } from '../shared/events';
import { captureScreen } from './capture';
import {
  closeDatabase,
  deleteSnap,
  duplicateSnap,
  getAllSnaps,
  getSnap,
  initDatabase,
  insertSnap,
  updateSnap,
} from './database';
import {
  closeSnapWindow,
  createSnapWindow,
  getSnapIdForWindow,
  getSnapWindows,
  reopenSnapWindow,
} from './snap-window';

log.initialize();

const isDev = !!process.env.VITE_DEV_SERVER_URL;

// Per-window annotation state tracked in main for context menu rendering
const windowAnnotationState = new Map<
  number,
  { tool: AnnotationTool; color: string; strokeWidth: number }
>();

function getAnnotationState(winId: number) {
  if (!windowAnnotationState.has(winId)) {
    windowAnnotationState.set(winId, {
      tool: 'pointer',
      color: DEFAULT_COLOR,
      strokeWidth: DEFAULT_STROKE_WIDTH,
    });
  }
  return windowAnnotationState.get(winId)!;
}

function createTrayIcon(): Electron.NativeImage {
  const projectRoot = path.resolve(__dirname, '..');
  const iconPath = path.join(projectRoot, 'assets', 'tray-icon.png');

  let icon = nativeImage.createFromPath(iconPath);

  if (icon.isEmpty()) {
    log.warn(`Tray icon not found at ${iconPath}, using fallback`);
    const size = 22;
    const canvas = Buffer.alloc(size * size * 4, 0);

    for (let y = 4; y < 18; y++) {
      for (let x = 3; x < 19; x++) {
        const idx = (y * size + x) * 4;
        canvas[idx + 3] = 200;
      }
    }
    for (let y = 8; y < 14; y++) {
      for (let x = 7; x < 15; x++) {
        const idx = (y * size + x) * 4;
        canvas[idx + 3] = 0;
      }
    }

    icon = nativeImage.createFromBuffer(canvas, {
      width: size,
      height: size,
    });
  }

  icon.setTemplateImage(true);
  return icon;
}

function createMenubar() {
  const icon = createTrayIcon();

  const mb = menubar({
    icon,
    tooltip: APP_NAME,
    preloadWindow: true,
    browserWindow: {
      ...WINDOW_CONFIG,
      show: false,
      skipTaskbar: true,
      alwaysOnTop: true,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        preload: path.join(__dirname, 'preload.js'),
      },
    },
    index: isDev
      ? process.env.VITE_DEV_SERVER_URL
      : `file://${path.join(__dirname, 'index.html')}`,
  });

  mb.on('ready', () => {
    log.info(`${APP_NAME} is ready`);
    app.dock?.hide();
    registerGlobalShortcut();
  });

  mb.on('after-create-window', () => {
    if (isDev) {
      mb.window?.webContents.openDevTools({ mode: 'detach' });
    }
  });

  // Custom tray hide logic
  function isSnappyWindow(win: BrowserWindow | null): boolean {
    if (!win) return false;
    if (win.id === mb.window?.id) return true;
    return Array.from(getSnapWindows().values()).some(
      (entry) => entry.win.id === win.id,
    );
  }

  function hideTrayIfFocusLeft(): void {
    setTimeout(() => {
      const focused = BrowserWindow.getFocusedWindow();
      if (!isSnappyWindow(focused) && mb.window?.isVisible()) {
        mb.hideWindow();
      }
    }, 50);
  }

  mb.on('focus-lost', hideTrayIfFocusLeft);

  app.on('browser-window-blur', () => {
    if (mb.window?.isVisible()) {
      hideTrayIfFocusLeft();
    }
  });

  mb.on('after-show', () => {
    mb.window?.webContents.send(EVENTS.SNAPS_UPDATED);
  });

  // IPC handlers — App
  ipcMain.handle(EVENTS.APP_VERSION, () => app.getVersion());
  ipcMain.on(EVENTS.APP_QUIT, () => app.quit());
  ipcMain.on(EVENTS.WINDOW_HIDE, () => mb.hideWindow());

  // IPC handlers — Snap window
  ipcMain.on(EVENTS.SNAP_CLOSE, (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      windowAnnotationState.delete(win.id);
      closeSnapWindow(win.id);
    }
  });

  ipcMain.on(EVENTS.SNAP_MOVE, (event, dx: number, dy: number) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win && !win.isDestroyed()) {
      const [x, y] = win.getPosition();
      win.setPosition(Math.round(x + dx), Math.round(y + dy));
    }
  });

  ipcMain.on(EVENTS.SNAP_SET_OPACITY, (event, opacity: number) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win && !win.isDestroyed()) {
      win.setOpacity(Math.max(0.05, Math.min(1, opacity)));
    }
  });

  ipcMain.on(EVENTS.SNAP_TOGGLE_SHADOW, (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win && !win.isDestroyed()) {
      win.setHasShadow(!win.hasShadow());
    }
  });

  // Context menu — redesigned with annotation tools
  ipcMain.on(EVENTS.SNAP_CONTEXT_MENU, (event, filePath: string) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win || win.isDestroyed()) return;

    const snapId = getSnapIdForWindow(win.id);
    const hasShadow = win.hasShadow();
    const state = getAnnotationState(win.id);
    const snap = snapId ? getSnap(snapId) : undefined;
    const hasAnnotations = snap?.annotations && snap.annotations !== '[]';

    // Tool items
    const tools: { label: string; tool: AnnotationTool }[] = [
      { label: '⇢  Pointer', tool: 'pointer' },
      { label: '✏️  Draw', tool: 'freehand' },
      { label: 'T   Text', tool: 'text' },
      { label: '▢  Rectangle', tool: 'rect' },
      { label: '○  Ellipse', tool: 'ellipse' },
      { label: '→  Arrow', tool: 'arrow' },
      { label: '⌫  Eraser', tool: 'eraser' },
    ];

    const toolItems: Electron.MenuItemConstructorOptions[] = tools.map(
      ({ label, tool }) => ({
        label,
        type: 'radio' as const,
        checked: state.tool === tool,
        click: () => {
          state.tool = tool;
          win.webContents.send(EVENTS.SNAP_SET_TOOL, tool);
        },
      }),
    );

    // Color items
    const colorItems: Electron.MenuItemConstructorOptions[] =
      DEFAULT_COLORS.map((color) => ({
        label: color === state.color ? `● ${color}` : `○ ${color}`,
        type: 'radio' as const,
        checked: color === state.color,
        click: () => {
          state.color = color;
          win.webContents.send(EVENTS.SNAP_SET_COLOR, color);
        },
      }));

    // Stroke width items
    const strokeItems: Electron.MenuItemConstructorOptions[] =
      DEFAULT_STROKE_WIDTHS.map((width) => ({
        label: '━'.repeat(width),
        type: 'radio' as const,
        checked: width === state.strokeWidth,
        click: () => {
          state.strokeWidth = width;
          win.webContents.send(EVENTS.SNAP_SET_STROKE, width);
        },
      }));

    const menu = Menu.buildFromTemplate([
      ...toolItems,
      { type: 'separator' },
      ...colorItems,
      { type: 'separator' },
      ...strokeItems,
      { type: 'separator' },
      {
        label: 'Snap',
        submenu: [
          {
            label: 'Duplicate',
            click: () => {
              if (snapId) handleDuplicate(snapId);
            },
          },
          {
            label: 'Revert to Original',
            enabled: !!hasAnnotations,
            click: () => {
              if (snapId) {
                updateSnap(snapId, { annotations: null });
                // Regenerate clean thumbnail
                const s = getSnap(snapId);
                if (s) regenerateCleanThumbnail(s.filePath, s.thumbPath);
                // Tell renderer to clear annotations
                win.webContents.send(EVENTS.SNAP_SET_TOOL, 'pointer');
                win.webContents.send(EVENTS.SNAP_SAVE_ANNOTATIONS, null);
              }
            },
          },
        ],
      },
      {
        label: 'Pixel Perfect Mode',
        type: 'checkbox',
        checked: !hasShadow,
        click: () => {
          win.setHasShadow(!hasShadow);
        },
      },
      { type: 'separator' },
      {
        label: 'Copy Image',
        accelerator: 'CmdOrCtrl+C',
        click: () => {
          const image = nativeImage.createFromPath(filePath);
          if (!image.isEmpty()) {
            clipboard.writeImage(image);
          }
        },
      },
      {
        label: 'Close',
        click: () => {
          closeSnapWindow(win.id);
        },
      },
      {
        label: 'Delete',
        click: () => {
          closeSnapWindow(win.id);
          if (snapId) {
            const s = getSnap(snapId);
            if (s) {
              deleteSnapFiles(s.filePath, s.thumbPath);
              deleteSnap(snapId);
            }
          }
        },
      },
    ]);

    menu.popup({ window: win });
  });

  ipcMain.on(EVENTS.SNAP_COPY, (_event, filePath: string) => {
    const image = nativeImage.createFromPath(filePath);
    if (!image.isEmpty()) {
      clipboard.writeImage(image);
      log.info(`Snap copied to clipboard: ${filePath}`);
    }
  });

  ipcMain.handle(EVENTS.SNAP_READ_IMAGE, (_event, filePath: string) => {
    const buffer = fs.readFileSync(filePath);
    return `data:image/png;base64,${buffer.toString('base64')}`;
  });

  // IPC handlers — Annotations
  ipcMain.handle(
    EVENTS.SNAP_SAVE_ANNOTATIONS,
    (_event, snapId: string, json: string) => {
      updateSnap(snapId, { annotations: json });
    },
  );

  ipcMain.handle(EVENTS.SNAP_GET_ANNOTATIONS, (_event, snapId: string) => {
    const snap = getSnap(snapId);
    return snap?.annotations ?? null;
  });

  ipcMain.handle(
    EVENTS.SNAP_REGENERATE_THUMBNAIL,
    (_event, snapId: string, dataUrl: string) => {
      const snap = getSnap(snapId);
      if (!snap) return;

      const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64, 'base64');
      const image = nativeImage.createFromBuffer(buffer);
      const size = image.getSize();

      const thumbWidth = 200;
      const thumbHeight = Math.round((thumbWidth / size.width) * size.height);
      const thumb = image.resize({ width: thumbWidth, height: thumbHeight });

      fs.writeFileSync(snap.thumbPath, thumb.toPNG());
      log.info(`Thumbnail regenerated for snap ${snapId}`);
    },
  );

  // IPC handlers — Duplicate
  ipcMain.handle(EVENTS.SNAP_DUPLICATE, (_event, snapId: string) => {
    handleDuplicate(snapId);
  });

  // IPC handlers — Library
  ipcMain.handle(EVENTS.LIBRARY_GET_SNAPS, () => {
    return getAllSnaps();
  });

  ipcMain.handle(EVENTS.LIBRARY_OPEN_SNAP, (_event, snapId: string) => {
    const snap = getSnap(snapId);
    if (snap) {
      reopenSnapWindow(snap);
      updateSnap(snapId, { isOpen: 1 });
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
      deleteSnapFiles(snap.filePath, snap.thumbPath);
      deleteSnap(snapId);
    }
  });

  ipcMain.handle(EVENTS.LIBRARY_READ_THUMBNAIL, (_event, thumbPath: string) => {
    if (!fs.existsSync(thumbPath)) return null;
    const buffer = fs.readFileSync(thumbPath);
    return `data:image/png;base64,${buffer.toString('base64')}`;
  });
}

function handleDuplicate(snapId: string): void {
  const snap = getSnap(snapId);
  if (!snap) return;

  const newId = crypto.randomUUID();
  const ext = path.extname(snap.filePath);
  const dir = path.dirname(snap.filePath);
  const thumbDir = path.dirname(snap.thumbPath);
  const newFilePath = path.join(dir, `${newId}${ext}`);
  const newThumbPath = path.join(thumbDir, `${newId}${ext}`);

  fs.copyFileSync(snap.filePath, newFilePath);
  fs.copyFileSync(snap.thumbPath, newThumbPath);
  duplicateSnap(snapId, newId, newFilePath, newThumbPath);

  const newSnap = getSnap(newId);
  if (newSnap) {
    reopenSnapWindow(newSnap);
  }
}

function regenerateCleanThumbnail(filePath: string, thumbPath: string): void {
  const image = nativeImage.createFromPath(filePath);
  if (image.isEmpty()) return;

  const size = image.getSize();
  const thumbWidth = 200;
  const thumbHeight = Math.round((thumbWidth / size.width) * size.height);
  const thumb = image.resize({ width: thumbWidth, height: thumbHeight });

  fs.writeFileSync(thumbPath, thumb.toPNG());
}

function deleteSnapFiles(filePath: string, thumbPath: string): void {
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    if (fs.existsSync(thumbPath)) fs.unlinkSync(thumbPath);
  } catch (err) {
    log.warn('Failed to delete snap files:', err);
  }
}

function registerGlobalShortcut() {
  const registered = globalShortcut.register(CAPTURE_SHORTCUT, async () => {
    log.info('Capture shortcut triggered');
    const result = await captureScreen();
    if (result) {
      insertSnap({
        id: result.id,
        filePath: result.filePath,
        thumbPath: result.thumbPath,
        sourceApp: result.sourceApp,
        width: result.width,
        height: result.height,
        posX: null,
        posY: null,
        opacity: 1.0,
        hasShadow: 1,
        isOpen: 1,
        createdAt: result.createdAt,
        annotations: null,
      });

      createSnapWindow(result);
    }
  });

  if (!registered) {
    log.error(`Failed to register global shortcut: ${CAPTURE_SHORTCUT}`);
  } else {
    log.info(`Global shortcut registered: ${CAPTURE_SHORTCUT}`);
  }
}

app.whenReady().then(() => {
  initDatabase();
  createMenubar();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  closeDatabase();
});

// Don't quit when all windows are closed — menubar keeps the app alive
app.on('window-all-closed', () => {});
