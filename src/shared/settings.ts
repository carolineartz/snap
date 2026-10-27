/**
 * User settings shared by main and renderer. Main owns the stored copy
 * (see `src/main/settings.ts`); renderers read it over IPC.
 */

export type ShortcutAction = 'capture' | 'timedCapture' | 'openLibrary';

export const SHORTCUT_ACTIONS: readonly ShortcutAction[] = [
  'capture',
  'timedCapture',
  'openLibrary',
];

export const SHORTCUT_ACTION_LABELS: Record<ShortcutAction, string> = {
  capture: 'Capture',
  timedCapture: 'Timed capture',
  openLibrary: 'Open Library',
};

/** Electron accelerator per action; `null` leaves the action unbound. */
export type Shortcuts = Record<ShortcutAction, string | null>;

export interface Settings {
  shortcuts: Shortcuts;
  /** Put every new capture on the clipboard as soon as it is taken. */
  copyOnCapture: boolean;
}

export interface SettingsPatch {
  shortcuts?: Partial<Shortcuts>;
  copyOnCapture?: boolean;
}

/** Per-action problem text, keyed by the action that has one. */
export type ShortcutErrors = Partial<Record<ShortcutAction, string>>;

export interface SettingsUpdateResult {
  settings: Settings;
  errors: ShortcutErrors;
}

export const DEFAULT_SETTINGS: Settings = {
  shortcuts: {
    capture: 'CommandOrControl+Shift+2',
    timedCapture: 'CommandOrControl+Alt+Shift+2',
    openLibrary: 'CommandOrControl+Shift+L',
  },
  copyOnCapture: false,
};

export function mergeSettings(base: Settings, patch: SettingsPatch): Settings {
  return {
    shortcuts: { ...base.shortcuts, ...patch.shortcuts },
    copyOnCapture: patch.copyOnCapture ?? base.copyOnCapture,
  };
}

/** Coerce anything read from disk into a well-formed Settings object. */
export function normalizeSettings(input: unknown): Settings {
  const source = (input ?? {}) as Partial<Record<keyof Settings, unknown>>;
  const rawShortcuts = (source.shortcuts ?? {}) as Record<string, unknown>;

  const shortcuts = { ...DEFAULT_SETTINGS.shortcuts };
  for (const action of SHORTCUT_ACTIONS) {
    const value = rawShortcuts[action];
    if (value === null) shortcuts[action] = null;
    else if (typeof value === 'string' && value.trim()) {
      shortcuts[action] = value.trim();
    }
  }

  return {
    shortcuts,
    copyOnCapture:
      typeof source.copyOnCapture === 'boolean'
        ? source.copyOnCapture
        : DEFAULT_SETTINGS.copyOnCapture,
  };
}

// --- Accelerator parsing and display -------------------------------------

const MODIFIER_TOKENS = new Set([
  'command',
  'cmd',
  'commandorcontrol',
  'cmdorctrl',
  'control',
  'ctrl',
  'alt',
  'option',
  'shift',
  'super',
  'meta',
]);

/** Modifiers that make a chord usable as a system-wide shortcut on their own. */
const PRIMARY_MODIFIERS = new Set([
  'command',
  'cmd',
  'commandorcontrol',
  'cmdorctrl',
  'control',
  'ctrl',
  'alt',
  'option',
]);

const KEY_GLYPHS: Record<string, string> = {
  return: '↩',
  enter: '↩',
  backspace: '⌫',
  delete: '⌦',
  tab: '⇥',
  escape: '⎋',
  esc: '⎋',
  space: 'Space',
  up: '↑',
  down: '↓',
  left: '←',
  right: '→',
  home: '↖',
  end: '↘',
  pageup: '⇞',
  pagedown: '⇟',
};

interface ParsedAccelerator {
  control: boolean;
  alt: boolean;
  shift: boolean;
  command: boolean;
  key: string | null;
}

function parseAccelerator(accelerator: string): ParsedAccelerator {
  const parsed: ParsedAccelerator = {
    control: false,
    alt: false,
    shift: false,
    command: false,
    key: null,
  };
  for (const part of accelerator.split('+')) {
    const token = part.trim();
    const lower = token.toLowerCase();
    if (
      lower === 'command' ||
      lower === 'cmd' ||
      lower === 'super' ||
      lower === 'meta'
    ) {
      parsed.command = true;
    } else if (lower === 'commandorcontrol' || lower === 'cmdorctrl') {
      parsed.command = true;
    } else if (lower === 'control' || lower === 'ctrl') {
      parsed.control = true;
    } else if (lower === 'alt' || lower === 'option') {
      parsed.alt = true;
    } else if (lower === 'shift') {
      parsed.shift = true;
    } else if (token) {
      parsed.key = token;
    }
  }
  return parsed;
}

/**
 * Render an accelerator the way macOS menus do: ⌃⌥⇧⌘ then the key.
 * An unbound shortcut renders as an empty string.
 */
export function formatAccelerator(accelerator: string | null): string {
  if (!accelerator) return '';
  const parsed = parseAccelerator(accelerator);
  let label = '';
  if (parsed.control) label += '⌃';
  if (parsed.alt) label += '⌥';
  if (parsed.shift) label += '⇧';
  if (parsed.command) label += '⌘';
  if (parsed.key) {
    const glyph = KEY_GLYPHS[parsed.key.toLowerCase()];
    label += glyph ?? parsed.key.toUpperCase();
  }
  return label;
}

/**
 * Why a chord can't be a global shortcut, or `null` when it can. Global
 * shortcuts need ⌘, ⌃ or ⌥ so ordinary typing can't trigger them.
 */
export function describeShortcutProblem(accelerator: string): string | null {
  const parts = accelerator.split('+').map((part) => part.trim().toLowerCase());
  const hasPrimary = parts.some((part) => PRIMARY_MODIFIERS.has(part));
  const hasKey = parts.some((part) => part && !MODIFIER_TOKENS.has(part));
  if (!hasKey) return 'Add a key to the modifiers.';
  if (!hasPrimary) return 'Include ⌘, ⌃ or ⌥.';
  return null;
}

/** Malformed chords and duplicates across actions. */
export function validateShortcuts(shortcuts: Shortcuts): ShortcutErrors {
  const errors: ShortcutErrors = {};
  const seen = new Map<string, ShortcutAction>();
  for (const action of SHORTCUT_ACTIONS) {
    const accelerator = shortcuts[action];
    if (!accelerator) continue;
    const problem = describeShortcutProblem(accelerator);
    if (problem) {
      errors[action] = problem;
      continue;
    }
    const key = formatAccelerator(accelerator);
    const owner = seen.get(key);
    if (owner) {
      errors[action] = `Already used by ${SHORTCUT_ACTION_LABELS[owner]}.`;
    } else {
      seen.set(key, action);
    }
  }
  return errors;
}

const CODE_TO_KEY: Record<string, string> = {
  Space: 'Space',
  Enter: 'Return',
  NumpadEnter: 'Return',
  Tab: 'Tab',
  Backspace: 'Backspace',
  Delete: 'Delete',
  ArrowUp: 'Up',
  ArrowDown: 'Down',
  ArrowLeft: 'Left',
  ArrowRight: 'Right',
  Home: 'Home',
  End: 'End',
  PageUp: 'PageUp',
  PageDown: 'PageDown',
  Minus: '-',
  Equal: '=',
  BracketLeft: '[',
  BracketRight: ']',
  Semicolon: ';',
  Quote: "'",
  Backquote: '`',
  Backslash: '\\',
  Comma: ',',
  Period: '.',
  Slash: '/',
};

export interface ChordKeyboardEvent {
  code: string;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
}

/**
 * Build an Electron accelerator from a keydown. Returns `null` while only
 * modifiers are held or for keys that have no accelerator name. Uses the
 * physical key (`code`) so ⌥ chords don't record the composed character.
 */
export function acceleratorFromKeyboardEvent(
  event: ChordKeyboardEvent,
): string | null {
  const key = keyNameFromCode(event.code);
  if (!key) return null;
  const parts: string[] = [];
  if (event.ctrlKey) parts.push('Control');
  if (event.altKey) parts.push('Alt');
  if (event.shiftKey) parts.push('Shift');
  if (event.metaKey) parts.push('Command');
  parts.push(key);
  return parts.join('+');
}

function keyNameFromCode(code: string): string | null {
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^Digit[0-9]$/.test(code)) return code.slice(5);
  if (/^F([1-9]|1[0-9]|2[0-4])$/.test(code)) return code;
  return CODE_TO_KEY[code] ?? null;
}
