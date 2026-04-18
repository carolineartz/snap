import fs from 'node:fs';
import { BrowserWindow, clipboard, ipcMain, nativeImage } from 'electron';
import log from 'electron-log';
import { EVENTS } from '../../shared/events';
import { closeSnapWindow } from '../snap-window';

export function registerSnapHandlers(): void {
  ipcMain.on(EVENTS.SNAP_CLOSE, (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
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

  ipcMain.on(EVENTS.SNAP_COPY, (_event, filePath: string) => {
    const image = nativeImage.createFromPath(filePath);
    if (!image.isEmpty()) {
      clipboard.writeImage(image);
      log.info(`Snap copied to clipboard: ${filePath}`);
    }
  });

  ipcMain.on(EVENTS.SNAP_COPY_COMPOSITE, (_event, dataUrl: string) => {
    const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');
    const image = nativeImage.createFromBuffer(Buffer.from(base64, 'base64'));
    if (!image.isEmpty()) {
      clipboard.writeImage(image);
      log.info('Composite snap copied to clipboard');
    }
  });

  ipcMain.handle(EVENTS.SNAP_READ_IMAGE, (_event, filePath: string) => {
    const buffer = fs.readFileSync(filePath);
    return `data:image/png;base64,${buffer.toString('base64')}`;
  });
}
