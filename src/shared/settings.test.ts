import { describe, expect, it } from 'vitest';
import {
  acceleratorFromKeyboardEvent,
  DEFAULT_SETTINGS,
  describeShortcutProblem,
  formatAccelerator,
  mergeSettings,
  normalizeSettings,
  validateShortcuts,
} from './settings';

describe('formatAccelerator', () => {
  it('orders modifiers the way macOS menus do', () => {
    expect(formatAccelerator('CommandOrControl+Shift+2')).toBe('⇧⌘2');
    expect(formatAccelerator('Command+Alt+Shift+2')).toBe('⌥⇧⌘2');
    expect(formatAccelerator('Control+Alt+Shift+Command+L')).toBe('⌃⌥⇧⌘L');
  });

  it('uses glyphs for named keys and upper-cases letters', () => {
    expect(formatAccelerator('Command+Return')).toBe('⌘↩');
    expect(formatAccelerator('Command+Space')).toBe('⌘Space');
    expect(formatAccelerator('Alt+l')).toBe('⌥L');
  });

  it('renders an unbound shortcut as empty', () => {
    expect(formatAccelerator(null)).toBe('');
  });
});

describe('acceleratorFromKeyboardEvent', () => {
  const base = {
    metaKey: false,
    ctrlKey: false,
    altKey: false,
    shiftKey: false,
  };

  it('builds a chord from the physical key', () => {
    expect(
      acceleratorFromKeyboardEvent({
        ...base,
        code: 'Digit2',
        metaKey: true,
        shiftKey: true,
      }),
    ).toBe('Shift+Command+2');
    expect(
      acceleratorFromKeyboardEvent({ ...base, code: 'KeyL', altKey: true }),
    ).toBe('Alt+L');
    expect(
      acceleratorFromKeyboardEvent({ ...base, code: 'F5', ctrlKey: true }),
    ).toBe('Control+F5');
  });

  it('returns null while only modifiers are down', () => {
    expect(
      acceleratorFromKeyboardEvent({
        ...base,
        code: 'MetaLeft',
        metaKey: true,
      }),
    ).toBeNull();
    expect(
      acceleratorFromKeyboardEvent({ ...base, code: 'ShiftRight' }),
    ).toBeNull();
  });
});

describe('describeShortcutProblem', () => {
  it('requires a primary modifier', () => {
    expect(describeShortcutProblem('Shift+2')).toBe('Include ⌘, ⌃ or ⌥.');
    expect(describeShortcutProblem('2')).toBe('Include ⌘, ⌃ or ⌥.');
  });

  it('requires a key', () => {
    expect(describeShortcutProblem('Command+Shift')).toBe(
      'Add a key to the modifiers.',
    );
  });

  it('accepts complete chords', () => {
    expect(describeShortcutProblem('Command+Shift+2')).toBeNull();
    expect(describeShortcutProblem('Alt+F1')).toBeNull();
  });
});

describe('validateShortcuts', () => {
  it('flags duplicates on the later action', () => {
    expect(
      validateShortcuts({
        capture: 'Command+Shift+2',
        timedCapture: 'CommandOrControl+Shift+2',
        openLibrary: null,
      }),
    ).toEqual({ timedCapture: 'Already used by Capture.' });
  });

  it('passes the defaults', () => {
    expect(validateShortcuts(DEFAULT_SETTINGS.shortcuts)).toEqual({});
  });
});

describe('normalizeSettings', () => {
  it('fills missing and malformed values from the defaults', () => {
    expect(normalizeSettings(undefined)).toEqual(DEFAULT_SETTINGS);
    expect(
      normalizeSettings({
        shortcuts: { capture: 42, timedCapture: '  ', openLibrary: null },
        copyOnCapture: 'yes',
      }),
    ).toEqual({
      shortcuts: {
        capture: DEFAULT_SETTINGS.shortcuts.capture,
        timedCapture: DEFAULT_SETTINGS.shortcuts.timedCapture,
        openLibrary: null,
      },
      copyOnCapture: false,
    });
  });

  it('keeps valid stored values', () => {
    expect(
      normalizeSettings({
        shortcuts: { capture: 'Alt+1' },
        copyOnCapture: true,
      }),
    ).toEqual({
      shortcuts: { ...DEFAULT_SETTINGS.shortcuts, capture: 'Alt+1' },
      copyOnCapture: true,
    });
  });
});

describe('mergeSettings', () => {
  it('applies a partial shortcut patch without touching the rest', () => {
    const next = mergeSettings(DEFAULT_SETTINGS, {
      shortcuts: { openLibrary: null },
    });
    expect(next.shortcuts.openLibrary).toBeNull();
    expect(next.shortcuts.capture).toBe(DEFAULT_SETTINGS.shortcuts.capture);
    expect(next.copyOnCapture).toBe(false);
  });
});
