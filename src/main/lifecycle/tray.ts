import path from 'node:path';
import {
  app,
  BrowserWindow,
  Menu,
  type MenuItemConstructorOptions,
  screen,
  Tray,
} from 'electron';
import log from 'electron-log';
import {
  APP_NAME,
  TIMED_CAPTURE_DEFAULT_DELAY_SECONDS,
  WINDOW_CONFIG,
} from '../../shared/constants';
import { EVENTS } from '../../shared/events';
import { notifyBrowserUpdated, openBrowserWindow } from '../browser-window';
import {
  configureCaptureFlow,
  startCapture,
  toggleTimedCapture,
} from '../capture-flow';
import { createTrayIcon } from '../config';
import { registerAllHandlers } from '../handlers';
import { getMenuWindow } from '../menu-window';
import { getSettings } from '../settings';
import { openSettingsWindow } from '../settings-window';
import { getSnapWindows, setOnSnapWindowClosed } from '../snap-window';
import { registerShortcuts } from './shortcuts';

const isDev = !!process.env.ELECTRON_RENDERER_URL;

let notifyTrayUpdated: () => void = () => {};

export function getNotifyTrayUpdated(): () => void {
  return notifyTrayUpdated;
}

/**
 * Native right-click menu, so capture and quit stay reachable even if
 * the popup's renderer fails to load. Built on demand so the
 * accelerators always show the current shortcuts.
 */
function buildContextMenu(): Menu {
  const { shortcuts } = getSettings();
  const accelerator = (
    value: string | null,
  ): Partial<MenuItemConstructorOptions> =>
    value ? { accelerator: value } : {};

  return Menu.buildFromTemplate([
    {
      label: 'Capture',
      ...accelerator(shortcuts.capture),
      click: () => {
        startCapture().catch((err) => log.error(`Capture failed: ${err}`));
      },
    },
    {
      label: `Capture in ${TIMED_CAPTURE_DEFAULT_DELAY_SECONDS}s`,
      ...accelerator(shortcuts.timedCapture),
      click: () => {
        toggleTimedCapture().catch((err) =>
          log.error(`Timed capture failed: ${err}`),
        );
      },
    },
    { type: 'separator' },
    {
      label: 'Open Library',
      ...accelerator(shortcuts.openLibrary),
      click: () => openBrowserWindow(),
    },
    { label: 'Settings…', click: () => openSettingsWindow() },
    { type: 'separator' },
    { label: `Quit ${APP_NAME}`, role: 'quit' },
  ]);
}

export function createTrayApp(): void {
  const icon = createTrayIcon();

  const tray = new Tray(icon);
  tray.setToolTip(APP_NAME);

  // The renderer paints a rounded panel that fills the whole window.
  // The window is transparent so the corners show through, and AppKit
  // draws the shadow from the painted shape, so it wraps the footer
  // and the rounded corners alike.
  const win = new BrowserWindow({
    ...WINDOW_CONFIG,
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: true,
    fullscreenable: false,
    resizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // Centered under the tray icon, top edge against the menubar, kept
  // inside the display's work area.
  function positionWindowUnderTray(): void {
    const trayBounds = tray.getBounds();
    const winBounds = win.getBounds();
    const { workArea } = screen.getDisplayMatching(trayBounds);
    const centered = trayBounds.x + trayBounds.width / 2 - winBounds.width / 2;
    const maxX = workArea.x + workArea.width - winBounds.width;
    const x = Math.round(Math.min(Math.max(centered, workArea.x), maxX));
    const y = Math.round(trayBounds.y + trayBounds.height);
    win.setPosition(x, y, false);
  }

  function showWindow(): void {
    positionWindowUnderTray();
    win.show();
    win.focus();
    // A transparent window's shadow is computed from its painted shape;
    // recompute it so it matches the panel on every show.
    win.invalidateShadow();
    notifyTrayUpdated();
  }

  function toggleWindow(): void {
    if (win.isVisible()) {
      win.hide();
    } else {
      showWindow();
    }
  }

  tray.on('click', toggleWindow);
  tray.on('right-click', () => {
    if (win.isVisible()) win.hide();
    tray.popUpContextMenu(buildContextMenu());
  });

  if (isDev && process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(`${process.env.ELECTRON_RENDERER_URL}/index.html`);
  } else {
    win.loadFile(path.join(__dirname, 'index.html'));
  }

  log.info(`${APP_NAME} is ready`);
  app.dock?.hide();

  // The countdown for a timed capture shows as a number beside the tray
  // icon (macOS-only tray title) and is mirrored to the popup so it can
  // offer a Cancel button if the user opens it mid-countdown.
  configureCaptureFlow({
    notifyTrayUpdated: () => notifyTrayUpdated(),
    onCountdown: (secondsLeft) => {
      if (secondsLeft === null) {
        tray.setTitle('');
      } else {
        tray.setTitle(`${secondsLeft}`, { fontType: 'monospacedDigit' });
      }
      if (!win.isDestroyed()) {
        win.webContents.send(EVENTS.CAPTURE_COUNTDOWN, secondsLeft);
      }
    },
    onDelayedCaptureStart: () => {
      if (win.isVisible()) win.hide();
    },
  });

  registerShortcuts(getSettings());

  notifyTrayUpdated = () => {
    win.webContents.send(EVENTS.SNAPS_UPDATED);
    notifyBrowserUpdated();
  };

  setOnSnapWindowClosed(notifyTrayUpdated);

  // Custom tray hide logic — tray stays open when interacting with
  // floating snaps or the annotation menu, but CLOSES when focus goes
  // to the library browser window (or anything outside the app).
  function isSnapWindow(focused: BrowserWindow | null): boolean {
    if (!focused) return false;
    if (focused.id === win.id) return true;
    if (focused.id === getMenuWindow()?.id) return true;
    return Array.from(getSnapWindows().values()).some(
      (entry) => entry.win.id === focused.id,
    );
  }

  function hideTrayIfFocusLeft(): void {
    setTimeout(() => {
      const focused = BrowserWindow.getFocusedWindow();
      if (!isSnapWindow(focused) && win.isVisible()) {
        win.hide();
      }
    }, 50);
  }

  win.on('blur', hideTrayIfFocusLeft);

  app.on('browser-window-blur', () => {
    if (win.isVisible()) {
      hideTrayIfFocusLeft();
    }
  });

  registerAllHandlers(win, notifyTrayUpdated);
}
