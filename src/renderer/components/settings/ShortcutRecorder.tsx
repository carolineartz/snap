import { useEffect, useRef, useState } from 'react';
import {
  acceleratorFromKeyboardEvent,
  describeShortcutProblem,
  formatAccelerator,
} from '../../../shared/settings';

interface ShortcutRecorderProps {
  /** Accessible name, e.g. "Capture shortcut". */
  label: string;
  value: string | null;
  /** Problem reported by main for the current value, if any. */
  error?: string;
  onChange: (accelerator: string | null) => void;
  /** Fires when recording starts (true) and stops (false). */
  onRecordingChange?: (recording: boolean) => void;
}

/**
 * macOS-style shortcut field: click, press the new chord, done. Escape
 * cancels, Backspace or Delete alone unbinds. Chords without ⌘, ⌃ or ⌥
 * are refused inline so plain typing can never become a global hotkey.
 */
export function ShortcutRecorder({
  label,
  value,
  error,
  onChange,
  onRecordingChange,
}: ShortcutRecorderProps) {
  const [recording, setRecording] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    onRecordingChange?.(recording);
  }, [recording, onRecordingChange]);

  const stop = () => {
    setRecording(false);
    setProblem(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (!recording) {
      // Enter/Space activate the button through onClick; nothing else here.
      return;
    }
    e.preventDefault();
    e.stopPropagation();

    if (e.key === 'Escape') {
      stop();
      return;
    }
    const bare = !e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey;
    if (bare && (e.key === 'Backspace' || e.key === 'Delete')) {
      onChange(null);
      stop();
      return;
    }

    const accelerator = acceleratorFromKeyboardEvent(e);
    if (!accelerator) return;
    const chordProblem = describeShortcutProblem(accelerator);
    if (chordProblem) {
      setProblem(chordProblem);
      return;
    }
    onChange(accelerator);
    stop();
  };

  const display = recording ? 'Type shortcut…' : formatAccelerator(value);
  const message = problem ?? error;

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        aria-pressed={recording}
        onClick={() => (recording ? stop() : setRecording(true))}
        onKeyDown={handleKeyDown}
        onBlur={stop}
        className={`min-w-[7.5rem] rounded-md border px-2.5 py-1 text-right text-[13px] tabular-nums transition-colors ${
          recording
            ? 'border-blue-500 bg-white text-neutral-400 ring-2 ring-blue-500/30 dark:bg-neutral-900'
            : 'border-black/10 bg-white text-neutral-800 hover:border-black/20 dark:border-white/10 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:border-white/20'
        }`}
      >
        {display || <span className="text-neutral-400">Not set</span>}
      </button>
      {message && (
        <p role="alert" className="text-[11px] text-red-600 dark:text-red-400">
          {message}
        </p>
      )}
    </div>
  );
}
