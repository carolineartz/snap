import path from 'node:path';
import { BrowserWindow } from 'electron';
import log from 'electron-log';
import { BROWSER_WINDOW_CONFIG } from '../shared/constants';
import { EVENTS } from '../shared/events';

const isDev = !!process.env.ELECTRON_RENDERER_URL;

let browserWindow: BrowserWindow | null = null;

export function openBrowserWindow(): BrowserWindow {
  if (browserWindow && !browserWindow.isDestroyed()) {
    browserWindow.focus();
    return browserWindow;
  }

  // Library window — opaque, with a custom-styled sidebar painted in
  // the renderer (no native vibrancy).
  //
  // - `titleBarStyle: 'hiddenInset'` hides the title bar but keeps
  //   native traffic lights (with hover/fullscreen/disabled states and
  //   a built-in drag region across the top strip).
  // - `frame: false` removes the OS chrome; the renderer owns the
  //   look. `backgroundColor: '#ffffff'` is the canvas painted before
  //   the renderer draws — matches the main content pane so any
  //   uncovered region (during resize, briefly on launch) reads white.
  // - `roundedCorners: true` + `hasShadow: true` let AppKit clip the
  //   window into the system's default rounded shape and draw the
  //   ambient drop-shadow around it. On macOS 26 Tahoe this is the
  //   larger Liquid-Glass-style radius (~22px).
  // - We deliberately do NOT use `transparent: true` or `vibrancy: *`.
  //   Earlier attempts piped `vibrancy: 'sidebar'` through a transparent
  //   window so AppKit would paint native sidebar material; on Tahoe
  //   that produces "light blue over black void" rather than the soft
  //   pale-blue panel seen in native Finder/Notes. Tahoe's frosted
  //   sidebar is actually a solid panel + subtle shadow, not real
  //   transparency, so we paint it ourselves in the renderer.
  const win = new BrowserWindow({
    ...BROWSER_WINDOW_CONFIG,
    title: 'Snap Library',
    show: false,
    frame: false,
    backgroundColor: '#ffffff',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 18, y: 18 },
    hasShadow: true,
    roundedCorners: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  if (isDev && process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(`${process.env.ELECTRON_RENDERER_URL}/library/index.html`);
  } else {
    win.loadFile(path.join(__dirname, 'library', 'index.html'));
  }

  win.once('ready-to-show', () => {
    win.show();
  });

  win.on('closed', () => {
    browserWindow = null;
  });

  browserWindow = win;
  log.info('Browser window opened');
  return win;
}

export function closeBrowserWindow(): void {
  if (browserWindow && !browserWindow.isDestroyed()) {
    browserWindow.close();
  }
  browserWindow = null;
}

export function getBrowserWindow(): BrowserWindow | null {
  return browserWindow;
}

export function notifyBrowserUpdated(): void {
  if (browserWindow && !browserWindow.isDestroyed()) {
    browserWindow.webContents.send(EVENTS.SNAPS_UPDATED);
  }
}
