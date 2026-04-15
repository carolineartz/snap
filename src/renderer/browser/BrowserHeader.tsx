import type { SortDirection } from './BrowserApp';
import { ZOOM_MAX, ZOOM_MIN } from './BrowserApp';

interface BrowserHeaderProps {
  sortDirection: SortDirection;
  onSortDirectionChange: (dir: SortDirection) => void;
  snapCount: number;
  zoom: number;
  onZoomChange: (zoom: number) => void;
}

const SortIcon = ({ direction }: { direction: SortDirection }) => (
  <svg
    aria-hidden="true"
    width="14"
    height="14"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {direction === 'desc' ? (
      <>
        <path d="M8 3 L8 13" />
        <path d="M4 9 L8 13 L12 9" />
      </>
    ) : (
      <>
        <path d="M8 13 L8 3" />
        <path d="M4 7 L8 3 L12 7" />
      </>
    )}
  </svg>
);

const GridIcon = ({ small }: { small?: boolean }) => (
  <svg
    aria-hidden="true"
    width="12"
    height="12"
    viewBox="0 0 16 16"
    fill="currentColor"
  >
    {small ? (
      <>
        <rect x="2" y="2" width="4" height="4" rx="0.5" />
        <rect x="10" y="2" width="4" height="4" rx="0.5" />
        <rect x="2" y="10" width="4" height="4" rx="0.5" />
        <rect x="10" y="10" width="4" height="4" rx="0.5" />
      </>
    ) : (
      <>
        <rect x="2" y="2" width="12" height="12" rx="1" />
      </>
    )}
  </svg>
);

export function BrowserHeader({
  sortDirection,
  onSortDirectionChange,
  snapCount,
  zoom,
  onZoomChange,
}: BrowserHeaderProps) {
  const toggleDirection = () => {
    onSortDirectionChange(sortDirection === 'desc' ? 'asc' : 'desc');
  };

  return (
    <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-1.5">
      <span className="text-xs text-neutral-400">
        {snapCount} snap{snapCount !== 1 ? 's' : ''}
      </span>

      <div className="flex items-center gap-3">
        {/* Zoom slider */}
        <div className="flex items-center gap-1.5 text-neutral-400">
          <GridIcon small />
          <input
            type="range"
            min={ZOOM_MIN}
            max={ZOOM_MAX}
            step={10}
            value={zoom}
            onChange={(e) => onZoomChange(Number(e.target.value))}
            className="h-1 w-24 cursor-pointer accent-blue-500"
            title={`Zoom: ${zoom}px`}
          />
          <GridIcon />
        </div>

        {/* Sort direction toggle */}
        <button
          type="button"
          onClick={toggleDirection}
          title={sortDirection === 'desc' ? 'Newest first' : 'Oldest first'}
          className="flex h-7 items-center gap-1 rounded px-2 text-[12px] text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
        >
          <SortIcon direction={sortDirection} />
          <span>Date</span>
        </button>
      </div>
    </div>
  );
}
