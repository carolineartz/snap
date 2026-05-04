import { useEffect, useRef, useState, ReactNode } from 'react';
import { CheckIcon, ChevronTinyDownIcon, GridIcon, MoreIcon } from '../icons';
import { GlassCapsule } from '../ui/GlassCapsule';
import { ZOOM_MAX, ZOOM_MIN } from './LibraryApp';
import {
  SORT_FIELD_LABELS,
  type SortDirection,
  type SortField,
} from './sort';

interface LibraryHeaderProps {
  sortField: SortField;
  onSortFieldChange: (field: SortField) => void;
  sortDirection: SortDirection;
  onSortDirectionChange: (dir: SortDirection) => void;
  snapCount: number;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  search?: ReactNode;
}

// Tahoe / liquid-glass-inspired toolbar. The bar itself has no fill —
// each control sits in its own floating "glass capsule" so content
// scrolls visibly behind them. Capsules share a translucent fill,
// hairline border, soft shadow, and backdrop blur.
export function LibraryHeader({
  sortField,
  onSortFieldChange,
  sortDirection,
  onSortDirectionChange,
  snapCount,
  zoom,
  onZoomChange,
  search,
}: LibraryHeaderProps) {
  const toggleDirection = () => {
    onSortDirectionChange(sortDirection === 'desc' ? 'asc' : 'desc');
  };

  return (
    <div className="sticky top-0 z-10">
      {/* Liquid-glass scrim — a blurred, tinted backdrop that's masked
          to fade out at its bottom edge so content visibly dissolves
          into the toolbar instead of getting clipped by a hard line.
          Extends ~16px past the toolbar so the fade has runway. The
          gradient supplies the warm tint; the mask makes the blur AND
          the tint fade together. pointer-events-none so the capsules
          above stay interactive. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -bottom-4 top-0 bg-gradient-to-b from-[#f7f7f5]/85 via-[#f7f7f5]/55 to-transparent backdrop-blur-xl backdrop-saturate-150 dark:from-[#1c1c1e]/85 dark:via-[#1c1c1e]/55 dark:to-transparent [mask-image:linear-gradient(to_bottom,black_55%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,black_55%,transparent_100%)]"
      />

      <div className="relative flex items-center gap-2 px-4 py-2">
        <span className="hidden flex-shrink-0 text-[11px] tabular-nums text-neutral-500 dark:text-neutral-400 sm:inline">
          {snapCount} snap{snapCount !== 1 ? 's' : ''}
        </span>

        <div className="min-w-0 flex-1">{search}</div>

        <div className="flex flex-shrink-0 items-center gap-2">
          <ZoomCapsule zoom={zoom} onZoomChange={onZoomChange} />
          <SortCapsule
            sortField={sortField}
            onSortFieldChange={onSortFieldChange}
            sortDirection={sortDirection}
            onToggleDirection={toggleDirection}
          />
        </div>
      </div>
    </div>
  );
}

// Shared capsule chrome — layout + hairline border. Fill, blur,
// refraction, and shadow all come from <GlassCapsule>; adding a `bg-*`
// or `shadow-*` here either stacks on top of the lib's tint or gets
// overridden by its inline shadow.
const CAPSULE_CLASSES =
  'flex h-9 items-center gap-1 rounded-full border border-black/[0.06] px-1 dark:border-white/10';

const CAPSULE_BUTTON_CLASSES =
  'flex h-7 w-7 items-center justify-center rounded-full text-neutral-600 transition-colors hover:bg-black/[0.06] hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-white/10 dark:hover:text-neutral-100';

function ZoomCapsule({
  zoom,
  onZoomChange,
}: {
  zoom: number;
  onZoomChange: (zoom: number) => void;
}) {
  return (
    <GlassCapsule className={`${CAPSULE_CLASSES} px-3`}>
      {/* Inner flex wrapper — <LiquidGlass> wraps `children` in its
          own content div, so flex utilities on the outer className
          don't reach our children. Layout goes here. */}
      <div className="flex h-full w-full items-center gap-1">
        <span className="text-neutral-500 dark:text-neutral-400">
          <GridIcon small />
        </span>
        <input
          type="range"
          min={ZOOM_MIN}
          max={ZOOM_MAX}
          step={10}
          value={zoom}
          onChange={(e) => onZoomChange(Number(e.target.value))}
          className="mx-2 h-1 w-24 cursor-pointer accent-blue-500"
          title={`Zoom: ${zoom}px`}
        />
        <span className="text-neutral-500 dark:text-neutral-400">
          <GridIcon />
        </span>
      </div>
    </GlassCapsule>
  );
}

// Single capsule combining direction toggle + field menu — chevron is
// always active (filled background) and toggles asc/desc, the more
// icon opens the field popover.
function SortCapsule({
  sortField,
  onSortFieldChange,
  sortDirection,
  onToggleDirection,
}: {
  sortField: SortField;
  onSortFieldChange: (field: SortField) => void;
  sortDirection: SortDirection;
  onToggleDirection: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const moreButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsOpen(false);
        moreButtonRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen]);

  const openMenu = () => {
    const rect = moreButtonRef.current?.getBoundingClientRect() ?? null;
    setAnchorRect(rect);
    setIsOpen(true);
  };

  const select = (field: SortField) => {
    onSortFieldChange(field);
    setIsOpen(false);
    moreButtonRef.current?.focus();
  };

  const directionLabel =
    sortDirection === 'desc' ? 'Newest first' : 'Oldest first';

  return (
    <GlassCapsule className={CAPSULE_CLASSES}>
      {/* Inner flex wrapper — <LiquidGlass> wraps `children` in its
          own content div, so flex utilities on the outer className
          don't reach our children. Layout goes here. The popover
          dropdown below sits as a sibling so it's not constrained
          by the flex layout. */}
      <div className="flex h-full w-full items-center gap-1">
        <button
          type="button"
          onClick={onToggleDirection}
          title={directionLabel}
          aria-label={directionLabel}
          // The chevron button reads as "always on" — a filled circle —
          // and rotates to mirror the current sort direction.
          className="flex h-7 w-7 items-center justify-center rounded-full bg-black/[0.10] text-neutral-700 transition-colors hover:bg-black/[0.15] hover:text-neutral-900 dark:bg-white/15 dark:text-neutral-100 dark:hover:bg-white/20"
        >
          <span
            aria-hidden="true"
            className="transition-transform"
            style={{
              transform:
                sortDirection === 'desc' ? 'rotate(0deg)' : 'rotate(180deg)',
            }}
          >
            <ChevronTinyDownIcon size={14} />
          </span>
        </button>

        <button
          ref={moreButtonRef}
          type="button"
          onClick={() => (isOpen ? setIsOpen(false) : openMenu())}
          title={`Sort by: ${SORT_FIELD_LABELS[sortField]}`}
          aria-label="Sort options"
          aria-haspopup="menu"
          aria-expanded={isOpen}
          className={CAPSULE_BUTTON_CLASSES}
        >
          <MoreIcon size={16} />
        </button>
      </div>

      {isOpen && anchorRect && (
        // biome-ignore lint/a11y/noStaticElementInteractions: dismiss backdrop
        // biome-ignore lint/a11y/useKeyWithClickEvents: backdrop dismiss
        <div
          className="fixed inset-0 z-50"
          onClick={() => setIsOpen(false)}
          onContextMenu={(e) => {
            e.preventDefault();
            setIsOpen(false);
          }}
        >
          {/* biome-ignore lint/a11y/useKeyWithClickEvents: menu panel */}
          <div
            role="menu"
            className="absolute min-w-[180px] rounded-lg border border-black/[0.06] bg-white/95 py-1 text-[13px] shadow-xl backdrop-blur-md dark:border-white/10 dark:bg-neutral-800/95 dark:text-neutral-200"
            style={{
              top: anchorRect.bottom + 6,
              right: window.innerWidth - anchorRect.right,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-3 pt-1 pb-1 text-[11px] uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
              Sort by
            </div>
            {(['created', 'opened', 'modified'] as SortField[]).map((field) => {
              const isActive = sortField === field;
              return (
                <button
                  key={field}
                  type="button"
                  role="menuitemradio"
                  aria-checked={isActive}
                  onClick={() => select(field)}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-blue-500 hover:text-white dark:hover:bg-blue-600"
                >
                  <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center">
                    {isActive ? <CheckIcon /> : null}
                  </span>
                  <span>{SORT_FIELD_LABELS[field]}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </GlassCapsule>
  );
}
