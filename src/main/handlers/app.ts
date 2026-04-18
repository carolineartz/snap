import { app, ipcMain } from 'electron';
import type { Menubar } from 'menubar';
import { EVENTS } from '../../shared/events';

export function registerAppHandlers(mb: Menubar): void {
  ipcMain.handle(EVENTS.APP_VERSION, () => app.getVersion());
  ipcMain.on(EVENTS.APP_QUIT, () => app.quit());
  ipcMain.on(EVENTS.WINDOW_HIDE, () => mb.hideWindow());
}
