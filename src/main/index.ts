import path from 'node:path';
import { app, ipcMain, nativeImage } from 'electron';
import log from 'electron-log';
import { menubar } from 'menubar';
import { APP_NAME, WINDOW_CONFIG } from '../shared/constants';
import { EVENTS } from '../shared/events';

log.initialize();

const isMac = process.platform === 'darwin';

function createMenubar() {
  // Create a simple tray icon (template image for macOS dark/light mode)
  const iconPath = path.join(__dirname, '..', 'assets', 'tray-icon.png');
  let trayIcon: Electron.NativeImage;

  try {
    trayIcon = nativeImage.createFromPath(iconPath);
    if (isMac) {
      trayIcon.setTemplateImage(true);
    }
  } catch {
    // Fallback: create a simple 22x22 empty icon if asset doesn't exist yet
    trayIcon = nativeImage.createEmpty();
  }

  const mb = menubar({
    icon: trayIcon,
    tooltip: APP_NAME,
    preloadWindow: true,
    browserWindow: {
      ...WINDOW_CONFIG,
      show: false,
      skipTaskbar: true,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        preload: path.join(__dirname, 'preload.js'),
      },
    },
    index:
      process.env.VITE_DEV_SERVER_URL ||
      `file://${path.join(__dirname, 'index.html')}`,
  });

  mb.on('ready', () => {
    log.info(`${APP_NAME} is ready`);

    if (isMac) {
      app.dock?.hide();
    }
  });

  mb.on('after-create-window', () => {
    if (process.env.VITE_DEV_SERVER_URL) {
      mb.window?.webContents.openDevTools({ mode: 'detach' });
    }
  });

  // IPC handlers
  ipcMain.handle(EVENTS.APP_VERSION, () => app.getVersion());
  ipcMain.on(EVENTS.APP_QUIT, () => app.quit());
  ipcMain.on(EVENTS.WINDOW_HIDE, () => mb.hideWindow());
}

app.whenReady().then(createMenubar);

app.on('window-all-closed', () => {
  if (!isMac) {
    app.quit();
  }
});
