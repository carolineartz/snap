import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CaptureResult } from './capture';

vi.mock('electron-log', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock('./capture', () => ({ captureScreen: vi.fn() }));
vi.mock('./clipboard', () => ({ copyImageFileToClipboard: vi.fn() }));
vi.mock('./database', () => ({ insertSnap: vi.fn() }));
vi.mock('./settings', () => ({ getSettings: vi.fn() }));
vi.mock('./snap-window', () => ({ createSnapWindow: vi.fn() }));
vi.mock('./vision', () => ({ runVisionForSnap: vi.fn() }));

import { DEFAULT_SETTINGS } from '../shared/settings';
import { captureScreen } from './capture';
import {
  cancelPendingCapture,
  configureCaptureFlow,
  isCountdownPending,
  startCapture,
  toggleTimedCapture,
} from './capture-flow';
import { copyImageFileToClipboard } from './clipboard';
import { insertSnap } from './database';
import { getSettings } from './settings';
import { createSnapWindow } from './snap-window';
import { runVisionForSnap } from './vision';

const result: CaptureResult = {
  id: 'snap-1',
  filePath: '/snaps/snap-1.png',
  thumbPath: '/snaps/thumbs/snap-1.png',
  sourceApp: 'Safari',
  width: 800,
  height: 600,
  cursorX: 10,
  cursorY: 20,
  createdAt: '2026-09-16T00:00:00.000Z',
};

const hooks = {
  notifyTrayUpdated: vi.fn(),
  onCountdown: vi.fn(),
  onDelayedCaptureStart: vi.fn(),
};

beforeEach(() => {
  // restoreMocks only resets implementations; call history must be
  // cleared by hand or counts leak between tests.
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.mocked(captureScreen).mockResolvedValue(result);
  vi.mocked(runVisionForSnap).mockResolvedValue(undefined);
  vi.mocked(getSettings).mockReturnValue(DEFAULT_SETTINGS);
  configureCaptureFlow(hooks);
});

afterEach(() => {
  cancelPendingCapture();
  vi.useRealTimers();
});

describe('startCapture', () => {
  it('captures immediately with no delay and persists the snap', async () => {
    const captured = await startCapture(0);

    expect(captured).toBe(result);
    expect(captureScreen).toHaveBeenCalledTimes(1);
    expect(insertSnap).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'snap-1', isOpen: 1, sourceApp: 'Safari' }),
    );
    expect(createSnapWindow).toHaveBeenCalledWith(result);
    expect(hooks.notifyTrayUpdated).toHaveBeenCalled();
    expect(hooks.onDelayedCaptureStart).not.toHaveBeenCalled();
    expect(hooks.onCountdown).not.toHaveBeenCalled();
    expect(copyImageFileToClipboard).not.toHaveBeenCalled();
  });

  it('copies the new snap to the clipboard when the setting is on', async () => {
    vi.mocked(getSettings).mockReturnValue({
      ...DEFAULT_SETTINGS,
      copyOnCapture: true,
    });

    await startCapture(0);

    expect(copyImageFileToClipboard).toHaveBeenCalledWith(result.filePath);
  });

  it('does nothing further when the user cancels the crosshair', async () => {
    vi.mocked(captureScreen).mockResolvedValue(null);

    expect(await startCapture(0)).toBeNull();
    expect(insertSnap).not.toHaveBeenCalled();
    expect(createSnapWindow).not.toHaveBeenCalled();
  });

  it('counts down once per second before opening the crosshair', async () => {
    const promise = startCapture(3);

    expect(hooks.onDelayedCaptureStart).toHaveBeenCalledTimes(1);
    expect(hooks.onCountdown).toHaveBeenLastCalledWith(3);
    expect(isCountdownPending()).toBe(true);
    expect(captureScreen).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1000);
    expect(hooks.onCountdown).toHaveBeenLastCalledWith(2);
    await vi.advanceTimersByTimeAsync(1000);
    expect(hooks.onCountdown).toHaveBeenLastCalledWith(1);
    expect(captureScreen).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1000);
    expect(hooks.onCountdown).toHaveBeenLastCalledWith(null);
    expect(captureScreen).toHaveBeenCalledTimes(1);
    expect(isCountdownPending()).toBe(false);

    expect(await promise).toBe(result);
  });

  it('clamps the delay and treats bad values as immediate', async () => {
    startCapture(500);
    expect(hooks.onCountdown).toHaveBeenLastCalledWith(60);
    cancelPendingCapture();

    await startCapture(Number.NaN);
    expect(captureScreen).toHaveBeenCalledTimes(1);
  });

  it('replaces a countdown already running', async () => {
    const first = startCapture(10);
    await vi.advanceTimersByTimeAsync(1000);

    const second = startCapture(2);
    expect(await first).toBeNull();

    await vi.advanceTimersByTimeAsync(2000);
    expect(await second).toBe(result);
    expect(captureScreen).toHaveBeenCalledTimes(1);
  });

  it('ignores requests while the crosshair is already up', async () => {
    let finish: (value: CaptureResult | null) => void = () => {};
    vi.mocked(captureScreen).mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );

    const first = startCapture(0);
    try {
      expect(await startCapture(0)).toBeNull();
      expect(captureScreen).toHaveBeenCalledTimes(1);
    } finally {
      // Always release the in-flight capture so a failure here can't
      // leave the module's "capturing" latch set for later tests.
      finish(result);
    }
    expect(await first).toBe(result);
  });
});

describe('cancelPendingCapture', () => {
  it('stops the countdown and resolves the capture with null', async () => {
    const promise = startCapture(5);

    expect(cancelPendingCapture()).toBe(true);
    expect(hooks.onCountdown).toHaveBeenLastCalledWith(null);
    expect(isCountdownPending()).toBe(false);

    await vi.advanceTimersByTimeAsync(10_000);
    expect(captureScreen).not.toHaveBeenCalled();
    expect(await promise).toBeNull();
  });

  it('reports false when nothing is pending', () => {
    expect(cancelPendingCapture()).toBe(false);
  });
});

describe('toggleTimedCapture', () => {
  it('starts a countdown with the default delay, then cancels on repeat', async () => {
    const first = toggleTimedCapture();
    expect(hooks.onCountdown).toHaveBeenLastCalledWith(5);

    const second = toggleTimedCapture();
    expect(await first).toBeNull();
    expect(await second).toBeNull();
    expect(isCountdownPending()).toBe(false);

    await vi.advanceTimersByTimeAsync(10_000);
    expect(captureScreen).not.toHaveBeenCalled();
  });
});
