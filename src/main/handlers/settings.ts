import { ipcMain } from 'electron';
import { EVENTS } from '../../shared/events';
import {
  mergeSettings,
  type SettingsPatch,
  type SettingsUpdateResult,
  validateShortcuts,
} from '../../shared/settings';
import { registerShortcuts, suspendShortcuts } from '../lifecycle/shortcuts';
import { getSettings, updateSettings } from '../settings';
import { broadcastSettings, openSettingsWindow } from '../settings-window';

export function registerSettingsHandlers(): void {
  ipcMain.handle(EVENTS.SETTINGS_GET, () => getSettings());

  // A shortcut change is only kept once the OS accepts the chord; on a
  // refusal the previous shortcuts are restored and the error returned.
  ipcMain.handle(
    EVENTS.SETTINGS_UPDATE,
    (_event, patch: SettingsPatch): SettingsUpdateResult => {
      const previous = getSettings();
      const candidate = mergeSettings(previous, patch);

      const errors = validateShortcuts(candidate.shortcuts);
      if (Object.keys(errors).length > 0) {
        return { settings: previous, errors };
      }

      const registerErrors = registerShortcuts(candidate);
      if (Object.keys(registerErrors).length > 0) {
        registerShortcuts(previous);
        return { settings: previous, errors: registerErrors };
      }

      const next = updateSettings(patch);
      broadcastSettings(next);
      return { settings: next, errors: {} };
    },
  );

  ipcMain.on(EVENTS.SETTINGS_OPEN, () => {
    openSettingsWindow();
  });

  ipcMain.on(
    EVENTS.SETTINGS_SUSPEND_SHORTCUTS,
    (_event, suspended: unknown) => {
      suspendShortcuts(suspended === true);
    },
  );
}
