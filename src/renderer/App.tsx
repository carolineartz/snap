import { useCallback, useEffect, useState } from 'react';
import { GearIcon, LibraryIcon } from './components/icons';
import { SnapGrid } from './components/tray/SnapGrid';
import type { SnapItem } from './types';

// Size of the upward-pointing notch at the top of the tray popup.
// Kept in sync with the extra 10px reserved in WINDOW_CONFIG.height.
const TRAY_NOTCH_SIZE = 10;

export function App() {
  const [snaps, setSnaps] = useState<SnapItem[]>([]);

  const loadSnaps = useCallback(async () => {
    const data = (await window.snap.library.getSnaps()) as SnapItem[];
    setSnaps(data);
  }, []);

  useEffect(() => {
    loadSnaps();
    window.snap.library.onSnapsUpdated(loadSnaps);
  }, [loadSnaps]);

  const handleOpen = async (snapId: string) => {
    await window.snap.library.openSnap(snapId);
    loadSnaps();
  };

  const handleDelete = async (snapId: string) => {
    await window.snap.library.deleteSnap(snapId);
    loadSnaps();
  };

  const handleOpenLibrary = () => {
    window.snap.library.openBrowserWindow();
  };

  // TODO: wire to a real settings window once we build one.
  const handleOpenSettings = () => {};

  // Notch + panel layout. The notch is absolutely positioned so its
  // CSS-triangle borders never confuse the flex layout — under
  // Tailwind's global `box-sizing: border-box`, an element with
  // `width: 0; height: 0` plus borders gets sized as 0×0 in flow
  // (the borders draw outside the box), which would otherwise make
  // the panel start at the top and render under the borders. With
  // absolute positioning + an explicit top inset on the wrapper, the
  // notch row stays cleanly transparent.
  return (
    <div
      className="relative flex h-screen flex-col"
      style={{ paddingTop: TRAY_NOTCH_SIZE }}
    >
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-0 -translate-x-1/2"
        style={{
          width: 0,
          height: 0,
          borderLeft: `${TRAY_NOTCH_SIZE}px solid transparent`,
          borderRight: `${TRAY_NOTCH_SIZE}px solid transparent`,
          borderBottom: `${TRAY_NOTCH_SIZE}px solid white`,
          filter: 'drop-shadow(0 -1px 1.5px rgba(0, 0, 0, 0.18))',
        }}
      />

      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl bg-white text-neutral-800 shadow-[0_8px_28px_rgba(0,0,0,0.22),0_2px_6px_rgba(0,0,0,0.10)] ring-1 ring-black/[0.06]">
        {/* The scroll region pads its bottom by the footer height so
            content can scroll *behind* the footer's frosted scrim and
            visibly fade out instead of stopping at a hard divider. */}
        <main className="min-h-0 flex-1 overflow-y-auto pb-12">
          {snaps.length === 0 ? (
            <div className="flex h-full items-center justify-center p-4">
              <div className="text-center">
                <p className="text-neutral-400">No snaps yet</p>
                <p className="mt-2 text-sm text-neutral-400">
                  Press ⌘⇧2 to take a screenshot
                </p>
              </div>
            </div>
          ) : (
            <SnapGrid
              snaps={snaps}
              onOpen={handleOpen}
              onDelete={handleDelete}
            />
          )}
        </main>

        {/* Footer floats above the scroll area as a Liquid-Glass tray.
            The aria-hidden div is the scrim — a tinted backdrop blur
            masked to fade UP into the content (transparent at top,
            opaque at the bottom) so passing content dissolves into it
            rather than crashing into a divider. */}
        <footer className="absolute inset-x-0 bottom-0 z-10 flex h-12 flex-shrink-0 items-center justify-end gap-1 px-2">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 -top-4 bottom-0 bg-gradient-to-t from-white/90 via-white/60 to-transparent backdrop-blur-xl backdrop-saturate-150 [mask-image:linear-gradient(to_top,black_55%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_top,black_55%,transparent_100%)]"
          />
          <div className="relative flex items-center gap-1">
            <TrayIconButton title="Settings" onClick={handleOpenSettings}>
              <GearIcon size={18} />
            </TrayIconButton>
            <TrayIconButton title="Open Library" onClick={handleOpenLibrary}>
              <LibraryIcon size={18} />
            </TrayIconButton>
          </div>
        </footer>
      </div>
    </div>
  );
}

function TrayIconButton({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  // `inline-flex` keeps the button's intrinsic block-like behavior
  // while giving us flex centering. `shrink-0` guards against any
  // ancestor flex container squeezing the button down. The inner
  // span is `pointer-events-none` so clicks always land on the
  // button, never on the SVG, and the icon is sized via the
  // component's prop so it can never overflow the box.
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-neutral-500 transition-colors hover:bg-black/5 hover:text-neutral-800"
    >
      <span className="pointer-events-none flex items-center justify-center">
        {children}
      </span>
    </button>
  );
}
