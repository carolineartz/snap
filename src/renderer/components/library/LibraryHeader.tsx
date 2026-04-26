import { GridIcon, SortIcon } from '../icons';
import { ZOOM_MAX, ZOOM_MIN } from './LibraryApp';
import type { SortDirection, SortField } from './sort';
import { SortMenu } from './SortMenu';

interface LibraryHeaderProps {
  sortField: SortField;
  onSortFieldChange: (field: SortField) => void;
  sortDirection: SortDirection;
  onSortDirectionChange: (dir: SortDirection) => void;
  snapCount: number;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  search?: React.ReactNode;
}

// Finder-inspired toolbar. Lives inside the scrollable main pane and uses
// `sticky top-0` + a soft backdrop blur so content visibly slides under it
// without ever showing a hard tray edge.
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
    <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-2 backdrop-blur-xl backdrop-saturate-150">
      <span className="hidden flex-shrink-0 text-[11px] tabular-nums text-neutral-500 dark:text-neutral-400 sm:inline">
        {snapCount} snap{snapCount !== 1 ? 's' : ''}
      </span>

      <div className="min-w-0 flex-1">{search}</div>

      <div className="flex flex-shrink-0 items-center gap-1">
        {/* Zoom pill — Finder-style: small/large grid icons flank a slider. */}
        <div className="flex h-7 items-center gap-1.5 rounded-md px-2 text-neutral-500 dark:text-neutral-400">
          <GridIcon small />
          <input
            type="range"
            min={ZOOM_MIN}
            max={ZOOM_MAX}
            step={10}
            value={zoom}
            onChange={(e) => onZoomChange(Number(e.target.value))}
            className="h-1 w-20 cursor-pointer accent-blue-500"
            title={`Zoom: ${zoom}px`}
          />
          <GridIcon />
        </div>

        <span
          aria-hidden="true"
          className="mx-1 h-4 w-px bg-black/10 dark:bg-white/10"
        />

        {/* Sort field pill — opens a popover with Created / Opened / Modified. */}
        <SortMenu sortField={sortField} onSortFieldChange={onSortFieldChange} />

        {/* Direction toggle — separate button so it can flip without
            committing to a different field. */}
        <button
          type="button"
          onClick={toggleDirection}
          title={sortDirection === 'desc' ? 'Newest first' : 'Oldest first'}
          aria-label={
            sortDirection === 'desc'
              ? 'Sort newest first'
              : 'Sort oldest first'
          }
          className="flex h-7 w-7 items-center justify-center rounded-md text-neutral-600 transition-colors hover:bg-black/5 hover:text-neutral-800 dark:text-neutral-300 dark:hover:bg-white/10 dark:hover:text-neutral-100"
        >
          <SortIcon direction={sortDirection} />
        </button>
      </div>
    </div>
  );
}
