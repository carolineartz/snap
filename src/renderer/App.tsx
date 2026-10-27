import { useCallback, useEffect, useState } from 'react';
import { formatAccelerator } from '../shared/settings';
import { CaptureIcon, LibraryIcon } from './components/icons';
import { SettingsMenu } from './components/tray/SettingsMenu';
import { SnapGrid } from './components/tray/SnapGrid';
import {
  CaptureCountdown,
  TimedCaptureButton,
} from './components/tray/TimedCapture';
import { TrayIconButton } from './components/tray/TrayIconButton';
import { useSettings } from './hooks/useSettings';
import type { SnapItem } from './types';

export function App() {
  const [snaps, setSnaps] = useState<SnapItem[]>([]);
  // Seconds left on a timed capture, pushed from main; null when idle.
  const [countdown, setCountdown] = useState<number | null>(null);
  const { shortcuts } = useSettings();
  const captureLabel = formatAccelerator(shortcuts.capture);
  const timedCaptureLabel = formatAccelerator(shortcuts.timedCapture);

  const loadSnaps = useCallback(async () => {
    const data = (await window.snap.library.getSnaps()) as SnapItem[];
    setSnaps(data);
  }, []);

  useEffect(() => {
    loadSnaps();
    window.snap.library.onSnapsUpdated(loadSnaps);
    window.snap.capture.onCountdown(setCountdown);
  }, [loadSnaps]);

  const handleStartCapture = (delaySeconds: number) => {
    window.snap.capture.start(delaySeconds);
  };

  const handleCancelCapture = () => {
    window.snap.capture.cancel();
  };

  const handleOpen = async (snapId: string) => {
    await window.snap.library.openSnap(snapId);
    loadSnaps();
  };

  const handleDelete = async (snapId: string) => {
    await window.snap.library.deleteSnap(snapId);
    loadSnaps();
  };

  const handleDragStart = (snapId: string) => {
    window.snap.library.startDrag([snapId]);
  };

  const handleOpenLibrary = () => {
    window.snap.library.openBrowserWindow();
  };

  const handleOpenSettings = () => {
    window.snap.settings.openWindow();
  };

  const handleQuit = () => {
    window.snap.app.quit();
  };

  // The panel fills the window; AppKit draws the window shadow from its
  // painted shape (see lifecycle/tray.ts), so no CSS shadow here.
  return (
    <div className="relative flex h-screen flex-col overflow-hidden rounded-xl bg-white text-neutral-800 ring-1 ring-black/[0.08] ring-inset">
      {/* The scroll region pads its bottom by the footer height so
          content can scroll *behind* the footer's frosted scrim and
          visibly fade out instead of stopping at a hard divider.
          `outline-none`: Chromium treats a scroller as focusable and
          would draw a square focus ring over the rounded panel whenever
          the popup regains focus. */}
      <main className="min-h-0 flex-1 overflow-y-auto pb-9 outline-none">
        {snaps.length === 0 ? (
          <div className="flex h-full items-center justify-center p-4">
            <div className="text-center">
              <p className="text-neutral-400">No snaps yet</p>
              <p className="mt-2 text-sm text-neutral-400">
                {captureLabel
                  ? `Press ${captureLabel} to take a screenshot`
                  : 'Use the capture button to take a screenshot'}
              </p>
              {timedCaptureLabel && (
                <p className="mt-1 text-sm text-neutral-400">
                  {timedCaptureLabel} for a timed capture
                </p>
              )}
            </div>
          </div>
        ) : (
          <SnapGrid
            snaps={snaps}
            onOpen={handleOpen}
            onDelete={handleDelete}
            onDragStart={handleDragStart}
          />
        )}
      </main>

      {/* Footer floats above the scroll area as a Liquid-Glass tray.
          The aria-hidden div is the scrim — a tinted backdrop blur
          masked to fade UP into the content (transparent at top,
          opaque at the bottom) so passing content dissolves into it
          rather than crashing into a divider. */}
      <footer className="absolute inset-x-0 bottom-0 z-10 flex h-9 flex-shrink-0 items-center justify-between gap-0.5 px-1.5">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 -top-3 bottom-0 bg-gradient-to-t from-white/90 via-white/60 to-transparent backdrop-blur-xl backdrop-saturate-150 [mask-image:linear-gradient(to_top,black_55%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_top,black_55%,transparent_100%)]"
        />
        <div className="relative flex min-w-0 items-center">
          {countdown !== null && (
            <CaptureCountdown
              secondsLeft={countdown}
              onCancel={handleCancelCapture}
            />
          )}
        </div>
        <div className="relative flex items-center gap-0.5">
          <TrayIconButton
            title={captureLabel ? `Capture (${captureLabel})` : 'Capture'}
            onClick={() => handleStartCapture(0)}
          >
            <CaptureIcon size={16} />
          </TrayIconButton>
          <TimedCaptureButton
            onStart={handleStartCapture}
            shortcutLabel={timedCaptureLabel}
          />
          <SettingsMenu
            onOpenSettings={handleOpenSettings}
            onQuit={handleQuit}
          />
          <TrayIconButton title="Open Library" onClick={handleOpenLibrary}>
            <LibraryIcon size={16} />
          </TrayIconButton>
        </div>
      </footer>
    </div>
  );
}
