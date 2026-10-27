import {
  TIMED_CAPTURE_DEFAULT_DELAY_SECONDS,
  TIMED_CAPTURE_DELAY_OPTIONS,
} from '../../../shared/constants';
import { TimerIcon } from '../icons';
import { TrayMenu, TrayMenuItem } from './TrayMenu';

interface TimedCaptureButtonProps {
  onStart: (delaySeconds: number) => void;
  /** Label of the timed-capture shortcut, shown beside the default delay. */
  shortcutLabel?: string;
}

/**
 * Footer button that pops a small upward menu of capture delays. The
 * tray hides itself once a capture starts, so the menu only needs to
 * close on pick, click-outside, or Escape.
 */
export function TimedCaptureButton({
  onStart,
  shortcutLabel,
}: TimedCaptureButtonProps) {
  return (
    <TrayMenu
      title="Timed capture"
      menuLabel="Capture delay"
      icon={<TimerIcon size={16} />}
    >
      {(close) =>
        TIMED_CAPTURE_DELAY_OPTIONS.map((seconds) => (
          <TrayMenuItem
            key={seconds}
            shortcut={
              seconds === TIMED_CAPTURE_DEFAULT_DELAY_SECONDS && shortcutLabel
                ? shortcutLabel
                : undefined
            }
            onClick={() => {
              close();
              onStart(seconds);
            }}
          >
            Capture in {seconds}s
          </TrayMenuItem>
        ))
      }
    </TrayMenu>
  );
}

interface CaptureCountdownProps {
  secondsLeft: number;
  onCancel: () => void;
}

/** Shown in the footer while a timed capture is counting down. */
export function CaptureCountdown({
  secondsLeft,
  onCancel,
}: CaptureCountdownProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center gap-1.5 pl-1 text-xs"
    >
      <span className="font-medium text-neutral-800 tabular-nums">
        Capturing in {secondsLeft}s
      </span>
      <button
        type="button"
        onClick={onCancel}
        className="rounded-md px-2 py-1 text-neutral-500 transition-colors hover:bg-black/5 hover:text-neutral-800"
      >
        Cancel
      </button>
    </div>
  );
}
