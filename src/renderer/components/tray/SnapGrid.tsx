import type { SnapItem } from '../../types';
import { SnapGridItem } from './SnapGridItem';

interface SnapGridProps {
  snaps: SnapItem[];
  onOpen: (snapId: string) => void;
  onDelete: (snapId: string) => void;
  onDragStart?: (snapId: string) => void;
}

export function SnapGrid({
  snaps,
  onOpen,
  onDelete,
  onDragStart,
}: SnapGridProps) {
  return (
    <div className="grid grid-cols-3 gap-3 p-4">
      {snaps.map((snap) => (
        <SnapGridItem
          key={snap.id}
          snap={snap}
          onOpen={onOpen}
          onDelete={onDelete}
          onDragStart={onDragStart}
        />
      ))}
    </div>
  );
}
