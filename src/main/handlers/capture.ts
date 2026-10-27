import { type BrowserWindow, ipcMain } from 'electron';
import log from 'electron-log';
import { EVENTS } from '../../shared/events';
import { cancelPendingCapture, startCapture } from '../capture-flow';

export function registerCaptureHandlers(win: BrowserWindow): void {
  ipcMain.on(EVENTS.CAPTURE_START, (_event, delaySeconds: unknown) => {
    const delay = typeof delaySeconds === 'number' ? delaySeconds : 0;
    // Hide the tray popup even for an immediate capture — the request
    // came from a click inside it, so it would otherwise sit in the shot.
    if (!win.isDestroyed()) win.hide();
    startCapture(delay).catch((err) => log.error(`Capture failed: ${err}`));
  });

  ipcMain.on(EVENTS.CAPTURE_CANCEL, () => {
    cancelPendingCapture();
  });
}
