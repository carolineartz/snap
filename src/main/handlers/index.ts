import type { BrowserWindow } from 'electron';
import { registerAnnotationHandlers } from './annotations';
import { registerAppHandlers } from './app';
import { registerCaptureHandlers } from './capture';
import { registerLibraryHandlers } from './library';
import { registerMenuHandlers } from './menu';
import { registerSettingsHandlers } from './settings';
import { registerSnapHandlers } from './snap';

export function registerAllHandlers(
  win: BrowserWindow,
  notifyTrayUpdated: () => void,
): void {
  registerAppHandlers(win);
  registerCaptureHandlers(win);
  registerSnapHandlers();
  registerAnnotationHandlers(notifyTrayUpdated);
  registerLibraryHandlers(notifyTrayUpdated);
  registerMenuHandlers();
  registerSettingsHandlers();
}
