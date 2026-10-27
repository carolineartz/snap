import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS } from '../shared/settings';

const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'snap-settings-'));

vi.mock('electron', () => ({
  app: { getPath: () => userData },
}));
vi.mock('electron-log', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import {
  getSettings,
  onSettingsChanged,
  resetSettingsCache,
  updateSettings,
} from './settings';

const file = path.join(userData, 'settings.json');

beforeEach(() => {
  resetSettingsCache();
  fs.rmSync(file, { force: true });
});

afterEach(() => {
  resetSettingsCache();
});

describe('settings store', () => {
  it('returns defaults when nothing is stored', () => {
    expect(getSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('persists a patch and reads it back from disk', () => {
    const listener = vi.fn();
    onSettingsChanged(listener);

    const next = updateSettings({
      shortcuts: { capture: 'Alt+1' },
      copyOnCapture: true,
    });

    expect(next.shortcuts.capture).toBe('Alt+1');
    expect(next.copyOnCapture).toBe(true);
    expect(listener).toHaveBeenCalledWith(next);

    resetSettingsCache();
    expect(getSettings()).toEqual(next);
    expect(JSON.parse(fs.readFileSync(file, 'utf-8'))).toEqual(next);
  });

  it('falls back to defaults when the file is corrupt', () => {
    fs.writeFileSync(file, '{not json');
    expect(getSettings()).toEqual(DEFAULT_SETTINGS);
  });
});
