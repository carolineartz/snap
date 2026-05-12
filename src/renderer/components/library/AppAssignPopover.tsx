import { useEffect, useMemo, useRef, useState } from 'react';
import type { SnapItem } from '../../types';
import { AppIcon } from './AppIcon';

interface AppAssignPopoverProps {
  snap: SnapItem;
  /** Apps with snap counts, derived from the full library. "Other" excluded — the popover renders its own None row. */
  sourceApps: Map<string, number>;
  /** Positioning relative to the viewport (from getBoundingClientRect of the anchor) */
  anchorRect: DOMRect;
  onReassign: (snapId: string, sourceApp: string | null) => void;
  onDismiss: () => void;
}

/**
 * "Move to app…" picker. Lists apps the user has snaps from, plus a "None"
 * row (clears sourceApp) and a "Create new app" row when the typed query
 * doesn't match. Designed to mirror TagAssignPopover's anchoring + dismiss
 * model. Free-text entries pass straight through — the live icon next to
 * the "Create" row gives the user instant feedback on whether their
 * typed name will resolve to a real bundle.
 */
export function AppAssignPopover({
  snap,
  sourceApps,
  anchorRect,
  onReassign,
  onDismiss,
}: AppAssignPopoverProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Click-outside dismiss
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        onDismiss();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onDismiss]);

  // Filter list against the typed query (case-insensitive). "Other" is
  // already meant to be excluded — it's the label for null, which we
  // render as the dedicated "None" row.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const entries = [...sourceApps.entries()].filter(
      ([name]) => name !== 'Other',
    );
    if (!q) return entries;
    return entries.filter(([name]) => name.toLowerCase().includes(q));
  }, [sourceApps, query]);

  const queryTrimmed = query.trim();
  const exactMatch =
    queryTrimmed !== '' &&
    [...sourceApps.keys()].some(
      (name) => name.toLowerCase() === queryTrimmed.toLowerCase(),
    );
  const showCreate = queryTrimmed !== '' && !exactMatch;

  const currentApp = snap.sourceApp;

  const handlePick = (sourceApp: string | null) => {
    onReassign(snap.id, sourceApp);
    onDismiss();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onDismiss();
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      // Prefer an exact case-insensitive match against existing apps so
      // typing a stored name and hitting Enter snaps to that bucket.
      const matchExisting = filtered.find(
        ([name]) => name.toLowerCase() === queryTrimmed.toLowerCase(),
      );
      if (matchExisting) {
        handlePick(matchExisting[0]);
      } else if (queryTrimmed) {
        handlePick(queryTrimmed);
      }
    }
  };

  // Positioning: just below the anchor, aligned to its left, clamped to viewport.
  const popoverStyle = useMemo(() => {
    const padding = 8;
    const width = 280;
    const maxHeight = Math.min(
      window.innerHeight - anchorRect.bottom - 16,
      400,
    );

    let left = anchorRect.left;
    if (left + width > window.innerWidth - padding) {
      left = window.innerWidth - width - padding;
    }
    if (left < padding) left = padding;

    return {
      position: 'fixed' as const,
      top: anchorRect.bottom + 6,
      left,
      width,
      maxHeight,
    };
  }, [anchorRect]);

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: popover container
    <div
      ref={containerRef}
      className="z-50 flex flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-2xl dark:border-white/10 dark:bg-neutral-800"
      style={popoverStyle}
      onKeyDown={handleKeyDown}
    >
      {/* Title */}
      <div className="px-3 pt-3 pb-2 text-[12px] text-neutral-600 dark:text-neutral-300">
        Move{' '}
        <span className="font-medium text-neutral-800 dark:text-neutral-100">
          “{snap.name || snap.sourceApp || 'Untitled'}”
        </span>{' '}
        to app
      </div>

      {/* Search input */}
      <div className="border-neutral-100 border-t border-b px-3 py-2 dark:border-white/10">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search or type a new app name…"
          className="w-full bg-transparent text-[12px] text-neutral-800 outline-none placeholder:text-neutral-400 dark:text-neutral-100"
        />
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto py-1">
        {/* None / Other always available at top */}
        <button
          type="button"
          onClick={() => handlePick(null)}
          className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] hover:bg-neutral-100 dark:hover:bg-white/5 ${
            currentApp === null
              ? 'text-blue-600 dark:text-blue-400'
              : 'text-neutral-700 dark:text-neutral-200'
          }`}
        >
          <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded bg-neutral-200 text-[8px] text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400">
            —
          </span>
          <span className="flex-1 truncate">None</span>
          {currentApp === null && <span aria-hidden>✓</span>}
        </button>

        {filtered.map(([appName, count]) => (
          <button
            key={appName}
            type="button"
            onClick={() => handlePick(appName)}
            className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] hover:bg-neutral-100 dark:hover:bg-white/5 ${
              currentApp === appName
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-neutral-700 dark:text-neutral-200'
            }`}
          >
            <AppIcon appName={appName} />
            <span className="flex-1 truncate">{appName}</span>
            <span className="text-[11px] text-neutral-400 dark:text-neutral-500">
              {count}
            </span>
            {currentApp === appName && <span aria-hidden>✓</span>}
          </button>
        ))}

        {showCreate && (
          <button
            type="button"
            onClick={() => handlePick(queryTrimmed)}
            className="flex w-full items-center gap-2 border-neutral-100 border-t px-3 py-1.5 text-left text-[13px] text-neutral-700 hover:bg-neutral-100 dark:border-white/10 dark:text-neutral-200 dark:hover:bg-white/5"
          >
            <AppIcon appName={queryTrimmed} />
            <span className="flex-1 truncate">
              Create new app:{' '}
              <span className="font-medium">{queryTrimmed}</span>
            </span>
          </button>
        )}

        {filtered.length === 0 && !showCreate && (
          <p className="px-3 py-2 text-[11px] text-neutral-400 italic">
            No apps yet — type a name above to create one
          </p>
        )}
      </div>
    </div>
  );
}
