import { useEffect, useState } from 'react';
import type { SnapItem } from '../types';

interface BrowserGridItemProps {
  snap: SnapItem;
  size: number;
  onOpen: (snapId: string) => void;
  onDelete: (snapId: string) => void;
  onDuplicate: (snapId: string) => void;
}

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function BrowserGridItem({
  snap,
  size,
  onOpen,
  onDelete,
  onDuplicate,
}: BrowserGridItemProps) {
  const [thumbSrc, setThumbSrc] = useState<string | null>(null);
  const [fullSrc, setFullSrc] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);

  // Load thumbnail first (fast), then replace with full image for sharpness at any zoom
  useEffect(() => {
    let cancelled = false;
    window.snappy.library.readThumbnail(snap.thumbPath).then((src) => {
      if (!cancelled) setThumbSrc(src);
    });
    window.snappy.snap.readImage(snap.filePath).then((src) => {
      if (!cancelled) setFullSrc(src);
    });
    return () => {
      cancelled = true;
    };
  }, [snap.filePath, snap.thumbPath, snap.thumbnailUpdatedAt]);

  const hasAnnotations =
    snap.annotations !== null &&
    snap.annotations !== '[]' &&
    snap.annotations !== '';

  const handleDoubleClick = () => onOpen(snap.id);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const imgSrc = fullSrc ?? thumbSrc;

  return (
    <>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: grid item with double-click */}
      <div
        className="group relative flex cursor-default items-center justify-center overflow-hidden rounded bg-neutral-100 ring-1 ring-black/[0.06]"
        style={{ width: size, height: size }}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
      >
        {imgSrc ? (
          <img
            src={imgSrc}
            alt=""
            className="max-h-full max-w-full object-contain"
            draggable={false}
          />
        ) : (
          <div className="h-full w-full bg-neutral-200" />
        )}

        {/* Green dot for open snaps */}
        {snap.isOpen === 1 && (
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-green-400 shadow-sm shadow-green-400/50" />
        )}

        {/* Annotation indicator */}
        {hasAnnotations && (
          <span className="absolute top-1.5 left-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500/80 text-[8px] text-white">
            ✏
          </span>
        )}

        {/* Hover overlay with metadata */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-full bg-gradient-to-t from-black/80 to-transparent px-2 pt-6 pb-1.5 transition-transform duration-150 group-hover:translate-y-0">
          <p className="truncate text-[11px] font-medium text-white">
            {snap.sourceApp || 'Other'}
          </p>
          <p className="text-[10px] text-neutral-300">
            {formatTime(snap.createdAt)} · {snap.width}×{snap.height}
          </p>
        </div>
      </div>

      {/* Context menu */}
      {contextMenu && (
        // biome-ignore lint/a11y/noStaticElementInteractions: context menu backdrop
        // biome-ignore lint/a11y/useKeyWithClickEvents: dismiss backdrop
        <div
          className="fixed inset-0 z-50"
          onClick={() => setContextMenu(null)}
          onContextMenu={(e) => {
            e.preventDefault();
            setContextMenu(null);
          }}
        >
          {/* biome-ignore lint/a11y/noStaticElementInteractions: menu panel */}
          {/* biome-ignore lint/a11y/useKeyWithClickEvents: menu panel */}
          <div
            className="absolute min-w-[140px] rounded-lg border border-neutral-200 bg-white/95 py-1 shadow-xl backdrop-blur-md"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onClick={(e) => e.stopPropagation()}
          >
            <ContextMenuItem
              label="Open"
              onClick={() => {
                onOpen(snap.id);
                setContextMenu(null);
              }}
            />
            <ContextMenuItem
              label="Duplicate"
              onClick={() => {
                onDuplicate(snap.id);
                setContextMenu(null);
              }}
            />
            <div className="mx-2 my-1 border-t border-neutral-200" />
            <ContextMenuItem
              label="Delete"
              danger
              onClick={() => {
                onDelete(snap.id);
                setContextMenu(null);
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}

function ContextMenuItem({
  label,
  danger,
  onClick,
}: {
  label: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full px-3 py-1 text-left text-[13px] transition-colors ${
        danger
          ? 'text-red-600 hover:bg-red-500 hover:text-white'
          : 'text-neutral-700 hover:bg-blue-500 hover:text-white'
      }`}
    >
      {label}
    </button>
  );
}
