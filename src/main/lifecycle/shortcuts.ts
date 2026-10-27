import { globalShortcut } from 'electron';
import log from 'electron-log';
import {
  type Settings,
  SHORTCUT_ACTIONS,
  type ShortcutAction,
  type ShortcutErrors,
} from '../../shared/settings';
import { openBrowserWindow } from '../browser-window';
import { startCapture, toggleTimedCapture } from '../capture-flow';
import { getSettings } from '../settings';

const ACTIONS: Record<ShortcutAction, () => void> = {
  capture: () => {
    log.info('Capture shortcut triggered');
    startCapture().catch((err) => log.error(`Capture failed: ${err}`));
  },
  timedCapture: () => {
    log.info('Timed-capture shortcut triggered');
    toggleTimedCapture().catch((err) =>
      log.error(`Timed capture failed: ${err}`),
    );
  },
  openLibrary: () => {
    log.info('Open-library shortcut triggered');
    openBrowserWindow();
  },
};

/**
 * Replace every global shortcut with the ones in `settings`. Returns the
 * actions whose chord the OS refused (usually taken by another app);
 * the rest are registered regardless.
 */
export function registerShortcuts(settings: Settings): ShortcutErrors {
  globalShortcut.unregisterAll();
  const errors: ShortcutErrors = {};
  for (const action of SHORTCUT_ACTIONS) {
    const accelerator = settings.shortcuts[action];
    if (!accelerator) continue;
    let registered = false;
    try {
      registered = globalShortcut.register(accelerator, ACTIONS[action]);
    } catch (err) {
      log.warn(`Invalid shortcut for ${action}: ${accelerator} (${err})`);
    }
    if (registered) {
      log.info(`Global shortcut registered: ${action} → ${accelerator}`);
    } else {
      log.error(`Failed to register global shortcut: ${accelerator}`);
      errors[action] = 'Another app may already use this shortcut.';
    }
  }
  return errors;
}

/**
 * Pause the shortcuts while the Settings window records a new chord, so
 * pressing the current one re-records it instead of firing the action.
 */
export function suspendShortcuts(suspended: boolean): void {
  if (suspended) {
    globalShortcut.unregisterAll();
  } else {
    registerShortcuts(getSettings());
  }
}
