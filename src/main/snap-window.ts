import path from 'node:path';
import { BrowserWindow, screen } from 'electron';
import log from 'electron-log';
import type { CaptureResult } from './capture';
import type { SnapRecord } from './database';
import { updateSnap } from './database';

const isDev = !!process.env.VITE_DEV_SERVER_URL;

// Map window ID → snap ID for state persistence
const snapWindows = new Map<number, { win: BrowserWindow; snapId: string }>();

/**
 * Calculate window position near the cursor, keeping it on screen.
 */
function calculatePosition(
  cursorX: number,
  cursorY: number,
  windowWidth: number,
  windowHeight: number,
): { x: number; y: number } {
  const offset = 20;
  let x = cursorX + offset;
  let y = cursorY + offset;

  const display = screen.getDisplayNearestPoint({ x: cursorX, y: cursorY });
  const { workArea } = display;

  if (x + windowWidth > workArea.x + workArea.width) {
    x = cursorX - windowWidth - offset;
  }
  if (y + windowHeight > workArea.y + workArea.height) {
    y = cursorY - windowHeight - offset;
  }
  if (x < workArea.x) {
    x = workArea.x;
  }
  if (y < workArea.y) {
    y = workArea.y;
  }

  return { x, y };
}

function computeWindowSize(
  width: number,
  height: number,
  scaleFactor: number,
): { winWidth: number; winHeight: number } {
  const maxDim = 800;
  let winWidth = Math.round(width / scaleFactor);
  let winHeight = Math.round(height / scaleFactor);
  if (winWidth > maxDim || winHeight > maxDim) {
    const scale = maxDim / Math.max(winWidth, winHeight);
    winWidth = Math.round(winWidth * scale);
    winHeight = Math.round(winHeight * scale);
  }
  return { winWidth, winHeight };
}

function createWindow(
  snapId: string,
  filePath: string,
  winWidth: number,
  winHeight: number,
  x: number,
  y: number,
  opacity: number,
  hasShadow: boolean,
): BrowserWindow {
  const win = new BrowserWindow({
    width: winWidth,
    height: winHeight,
    x,
    y,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    hasShadow,
    resizable: true,
    skipTaskbar: true,
    opacity,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  win.setAspectRatio(winWidth / winHeight);

  const params = new URLSearchParams({ filePath, snapId });

  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(`${process.env.VITE_DEV_SERVER_URL}snap/index.html?${params}`);
  } else {
    win.loadFile(path.join(__dirname, 'snap', 'index.html'), {
      search: params.toString(),
    });
  }

  // Persist state on close
  snapWindows.set(win.id, { win, snapId });
  win.on('closed', () => {
    const [posX, posY] = win.isDestroyed() ? [null, null] : win.getPosition();
    updateSnap(snapId, {
      posX,
      posY,
      opacity: win.isDestroyed() ? undefined : win.getOpacity(),
      hasShadow: win.isDestroyed() ? undefined : win.hasShadow() ? 1 : 0,
      isOpen: 0,
    });
    snapWindows.delete(win.id);
  });

  return win;
}

/**
 * Creates a new floating snap window from a fresh capture.
 */
export function createSnapWindow(capture: CaptureResult): BrowserWindow {
  const display = screen.getDisplayNearestPoint({
    x: capture.cursorX,
    y: capture.cursorY,
  });
  const scaleFactor = display.scaleFactor || 1;
  const { winWidth, winHeight } = computeWindowSize(
    capture.width,
    capture.height,
    scaleFactor,
  );

  const { x, y } = calculatePosition(
    capture.cursorX,
    capture.cursorY,
    winWidth,
    winHeight,
  );

  const win = createWindow(
    capture.id,
    capture.filePath,
    winWidth,
    winHeight,
    x,
    y,
    1.0,
    true,
  );

  log.info(`Snap window created: ${winWidth}x${winHeight} at (${x}, ${y})`);
  return win;
}

/**
 * Reopens a snap from the library at its last known position.
 */
export function reopenSnapWindow(snap: SnapRecord): BrowserWindow {
  // Check if already open
  for (const [, entry] of snapWindows) {
    if (entry.snapId === snap.id && !entry.win.isDestroyed()) {
      entry.win.focus();
      return entry.win;
    }
  }

  const display = screen.getPrimaryDisplay();
  const scaleFactor = display.scaleFactor || 1;
  const { winWidth, winHeight } = computeWindowSize(
    snap.width,
    snap.height,
    scaleFactor,
  );

  const x = snap.posX ?? Math.round(display.workArea.width / 2 - winWidth / 2);
  const y =
    snap.posY ?? Math.round(display.workArea.height / 2 - winHeight / 2);

  const win = createWindow(
    snap.id,
    snap.filePath,
    winWidth,
    winHeight,
    x,
    y,
    snap.opacity,
    snap.hasShadow === 1,
  );

  updateSnap(snap.id, { isOpen: 1 });
  log.info(`Snap window reopened: ${snap.id} at (${x}, ${y})`);
  return win;
}

export function closeSnapWindow(windowId: number): void {
  const entry = snapWindows.get(windowId);
  if (entry && !entry.win.isDestroyed()) {
    entry.win.close();
  }
}

export function getSnapIdForWindow(windowId: number): string | undefined {
  return snapWindows.get(windowId)?.snapId;
}

export function getSnapWindows(): Map<
  number,
  { win: BrowserWindow; snapId: string }
> {
  return snapWindows;
}
