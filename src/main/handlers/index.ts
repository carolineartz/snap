import type { Menubar } from 'menubar';
import { registerAnnotationHandlers } from './annotations';
import { registerAppHandlers } from './app';
import { registerLibraryHandlers } from './library';
import { registerMenuHandlers } from './menu';
import { registerSnapHandlers } from './snap';

export function registerAllHandlers(
  mb: Menubar,
  notifyTrayUpdated: () => void,
): void {
  registerAppHandlers(mb);
  registerSnapHandlers();
  registerAnnotationHandlers(notifyTrayUpdated);
  registerLibraryHandlers(notifyTrayUpdated);
  registerMenuHandlers();
}
