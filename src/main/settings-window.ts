import path from 'node:path';
import { BrowserWindow, nativeTheme } from 'electron';
import log from 'electron-log';
import { SETTINGS_WINDOW_CONFIG } from '../shared/constants';
import { EVENTS } from '../shared/events';
import type { Settings } from '../shared/settings';

const isDev = !!process.env.ELECTRON_RENDERER_URL;

let settingsWindow: BrowserWindow | null = null;

export function openSettingsWindow(): BrowserWindow {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus();
    return settingsWindow;
  }

  // A plain, fixed-size macOS window with the system title bar, like
  // every other app's Settings.
  const win = new BrowserWindow({
    ...SETTINGS_WINDOW_CONFIG,
    title: 'Snap Settings',
    show: false,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#1e1e1e' : '#f5f5f7',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  if (isDev && process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(`${process.env.ELECTRON_RENDERER_URL}/settings/index.html`);
  } else {
    win.loadFile(path.join(__dirname, 'settings', 'index.html'));
  }

  win.once('ready-to-show', () => {
    win.show();
  });

  win.on('closed', () => {
    settingsWindow = null;
  });

  settingsWindow = win;
  log.info('Settings window opened');
  return win;
}

/** Tell every open window the settings changed. */
export function broadcastSettings(settings: Settings): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send(EVENTS.SETTINGS_UPDATED, settings);
    }
  }
}
