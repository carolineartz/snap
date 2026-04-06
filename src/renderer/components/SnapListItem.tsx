import { useEffect, useState } from 'react';

interface SnapItem {
  id: string;
  thumbPath: string;
  sourceApp: string | null;
  isOpen: number;
  createdAt: string;
}

interface SnapListItemProps {
  snap: SnapItem;
  onOpen: (snapId: string) => void;
  onDelete: (snapId: string) => void;
}

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

export function SnapListItem({ snap, onOpen, onDelete }: SnapListItemProps) {
  const [thumbSrc, setThumbSrc] = useState<string | null>(null);

  useEffect(() => {
    window.snappy.library.readThumbnail(snap.thumbPath).then((src) => {
      setThumbSrc(src);
    });
  }, [snap.thumbPath]);

  const handleDoubleClick = () => {
    onOpen(snap.id);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    // Simple confirm-style delete for now — will be native menu later
    onDelete(snap.id);
  };

  return (
    <li
      className="flex cursor-default items-center gap-3 px-4 py-2 hover:bg-neutral-800"
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
    >
      <div className="h-10 w-14 flex-shrink-0 overflow-hidden rounded bg-neutral-700">
        {thumbSrc && (
          <img
            src={thumbSrc}
            alt=""
            className="h-full w-full object-cover"
            draggable={false}
          />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm text-neutral-200">
            {snap.sourceApp || 'Unknown'}
          </span>
          {snap.isOpen === 1 && (
            <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-green-400" />
          )}
        </div>
        <span className="text-xs text-neutral-500">
          {formatTime(snap.createdAt)}
        </span>
      </div>
    </li>
  );
}
