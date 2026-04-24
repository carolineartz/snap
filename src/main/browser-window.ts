import path from 'node:path';
import { BrowserWindow } from 'electron';
import log from 'electron-log';
import { BROWSER_WINDOW_CONFIG } from '../shared/constants';
import { EVENTS } from '../shared/events';

const isDev = !!process.env.VITE_DEV_SERVER_URL;

let browserWindow: BrowserWindow | null = null;

export function openBrowserWindow(): BrowserWindow {
  if (browserWindow && !browserWindow.isDestroyed()) {
    browserWindow.focus();
    return browserWindow;
  }

  const win = new BrowserWindow({
    ...BROWSER_WINDOW_CONFIG,
    title: 'Snappy Library',
    show: false,
    // macOS Liquid Glass. `frame: false` lets us own the corner radius
    // via CSS (the native mask caps us at ~10px, which is smaller than
    // modern Tahoe apps). `titleBarStyle: 'hidden'` keeps the traffic
    // lights while we supply our own chrome. `hasShadow: true` makes
    // macOS draw the window shadow around the actually-opaque pixels,
    // so it follows our CSS border-radius.
    vibrancy: 'under-window',
    visualEffectState: 'active',
    backgroundColor: '#00000000',
    transparent: true,
    frame: false,
    titleBarStyle: 'hidden',
    trafficLightPosition: { x: 16, y: 18 },
    hasShadow: true,
    roundedCorners: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(`${process.env.VITE_DEV_SERVER_URL}library/index.html`);
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
