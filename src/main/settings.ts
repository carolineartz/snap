import fs from 'node:fs';
import path from 'node:path';
import { app } from 'electron';
import log from 'electron-log';
import {
  mergeSettings,
  normalizeSettings,
  type Settings,
  type SettingsPatch,
} from '../shared/settings';

const SETTINGS_FILE = 'settings.json';

let cached: Settings | null = null;
const listeners = new Set<(settings: Settings) => void>();

function settingsPath(): string {
  return path.join(app.getPath('userData'), SETTINGS_FILE);
}

function load(): Settings {
  const file = settingsPath();
  if (!fs.existsSync(file)) return normalizeSettings(undefined);
  try {
    return normalizeSettings(JSON.parse(fs.readFileSync(file, 'utf-8')));
  } catch (err) {
    log.warn(`Could not read ${file}; using defaults: ${err}`);
    return normalizeSettings(undefined);
  }
}

export function getSettings(): Settings {
  if (!cached) cached = load();
  return cached;
}

/** Merge, persist and notify. The in-memory copy updates even if the write fails. */
export function updateSettings(patch: SettingsPatch): Settings {
  const next = mergeSettings(getSettings(), patch);
  cached = next;
  try {
    fs.writeFileSync(settingsPath(), `${JSON.stringify(next, null, 2)}\n`);
  } catch (err) {
    log.error(`Could not write settings: ${err}`);
  }
  for (const listener of listeners) listener(next);
  return next;
}

export function onSettingsChanged(
  listener: (settings: Settings) => void,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Test seam: forget the cached copy so the next read hits disk. */
export function resetSettingsCache(): void {
  cached = null;
}
