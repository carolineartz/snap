import { BrowserWindow, ipcMain } from 'electron';
import { EVENTS } from '../../shared/events';
import {
  closeMenuWindow,
  getParentSnapWindowId,
  openMenuWindow,
} from '../menu-window';

export function registerMenuHandlers(): void {
  ipcMain.on(
    EVENTS.MENU_OPEN,
    (
      event,
      params: {
        screenX: number;
        screenY: number;
        activeTool: string;
        activeColor: string;
        activeStrokeWidth: number;
        hasShadow: boolean;
        hasAnnotations: boolean;
      },
    ) => {
      const parentWin = BrowserWindow.fromWebContents(event.sender);
      if (!parentWin) return;
      openMenuWindow({ ...params, parentWinId: parentWin.id });
    },
  );

  ipcMain.on(EVENTS.MENU_DISMISS, () => {
    closeMenuWindow();
  });

  ipcMain.on(EVENTS.MENU_ACTION, (_event, payload) => {
    const parentId = getParentSnapWindowId();
    if (parentId === null) return;
    const parent = BrowserWindow.fromId(parentId);
    if (parent && !parent.isDestroyed()) {
      parent.webContents.send(EVENTS.MENU_ACTION, payload);
    }
  });
}
