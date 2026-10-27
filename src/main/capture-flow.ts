import log from 'electron-log';
import {
  TIMED_CAPTURE_DEFAULT_DELAY_SECONDS,
  TIMED_CAPTURE_MAX_DELAY_SECONDS,
} from '../shared/constants';
import { type CaptureResult, captureScreen } from './capture';
import { copyImageFileToClipboard } from './clipboard';
import { insertSnap } from './database';
import { getSettings } from './settings';
import { createSnapWindow } from './snap-window';
import { runVisionForSnap } from './vision';

export interface CaptureFlowHooks {
  /** Refresh the tray + library after a snap is inserted or enriched. */
  notifyTrayUpdated: () => void;
  /**
   * Countdown progress for a delayed capture. Called once per second with
   * the seconds remaining, then with `null` when the countdown ends —
   * whether it fired or was cancelled.
   */
  onCountdown: (secondsLeft: number | null) => void;
  /** A delayed capture was requested; the tray should get out of the shot. */
  onDelayedCaptureStart: () => void;
}

let hooks: CaptureFlowHooks = {
  notifyTrayUpdated: () => {},
  onCountdown: () => {},
  onDelayedCaptureStart: () => {},
};

let pending: { cancel: () => void } | null = null;
let capturing = false;

export function configureCaptureFlow(next: CaptureFlowHooks): void {
  hooks = next;
}

export function isCountdownPending(): boolean {
  return pending !== null;
}

/** Cancel a pending countdown. Returns true if there was one to cancel. */
export function cancelPendingCapture(): boolean {
  if (!pending) return false;
  pending.cancel();
  return true;
}

/**
 * Run the interactive crosshair now, or after `delaySeconds`. A new request
 * replaces any countdown already running; a request while the crosshair is
 * up is ignored (screencapture is already waiting on the user).
 *
 * The delay is timed here rather than with `screencapture -T` so the
 * countdown can be surfaced in the tray and cancelled.
 */
export function startCapture(delaySeconds = 0): Promise<CaptureResult | null> {
  if (capturing) {
    log.info('Capture already in progress; ignoring request');
    return Promise.resolve(null);
  }
  cancelPendingCapture();

  const delay = normalizeDelay(delaySeconds);
  if (delay === 0) return performCapture();

  log.info(`Timed capture starting in ${delay}s`);
  hooks.onDelayedCaptureStart();

  return new Promise((resolve) => {
    let timer: NodeJS.Timeout | undefined;
    let remaining = delay;

    const tick = (): void => {
      if (remaining <= 0) {
        pending = null;
        hooks.onCountdown(null);
        resolve(performCapture());
        return;
      }
      hooks.onCountdown(remaining);
      remaining -= 1;
      timer = setTimeout(tick, 1000);
    };

    pending = {
      cancel: () => {
        if (timer) clearTimeout(timer);
        pending = null;
        hooks.onCountdown(null);
        log.info('Timed capture cancelled');
        resolve(null);
      },
    };

    tick();
  });
}

/** Shortcut behavior: start a timed capture, or cancel the one counting down. */
export function toggleTimedCapture(
  delaySeconds = TIMED_CAPTURE_DEFAULT_DELAY_SECONDS,
): Promise<CaptureResult | null> {
  if (cancelPendingCapture()) return Promise.resolve(null);
  return startCapture(delaySeconds);
}

function normalizeDelay(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.min(Math.round(value), TIMED_CAPTURE_MAX_DELAY_SECONDS);
}

async function performCapture(): Promise<CaptureResult | null> {
  capturing = true;
  try {
    const result = await captureScreen();
    if (!result) return null;

    insertSnap({
      id: result.id,
      name: null,
      filePath: result.filePath,
      thumbPath: result.thumbPath,
      sourceApp: result.sourceApp,
      width: result.width,
      height: result.height,
      posX: null,
      posY: null,
      opacity: 1.0,
      hasShadow: 1,
      isOpen: 1,
      createdAt: result.createdAt,
      annotations: null,
      thumbnailUpdatedAt: result.createdAt,
      ocrText: null,
      classificationLabels: null,
      visualEmbedding: null,
      lastOpenedAt: null,
      lastModifiedAt: null,
    });

    createSnapWindow(result);
    if (getSettings().copyOnCapture) {
      copyImageFileToClipboard(result.filePath);
    }
    hooks.notifyTrayUpdated();

    // Fire-and-forget vision pipeline — OCR + classification + CLIP.
    runVisionForSnap(result.id, result.filePath)
      .then(() => hooks.notifyTrayUpdated())
      .catch((err) => log.warn(`Vision failed for ${result.id}: ${err}`));

    return result;
  } finally {
    capturing = false;
  }
}
