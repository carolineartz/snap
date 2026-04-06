import { SnapListItem } from './SnapListItem';

interface SnapItem {
  id: string;
  thumbPath: string;
  sourceApp: string | null;
  isOpen: number;
  createdAt: string;
}

interface SnapListProps {
  snaps: SnapItem[];
  onOpen: (snapId: string) => void;
  onDelete: (snapId: string) => void;
}

export function SnapList({ snaps, onOpen, onDelete }: SnapListProps) {
  return (
    <ul className="divide-y divide-neutral-800">
      {snaps.map((snap) => (
        <SnapListItem
          key={snap.id}
          snap={snap}
          onOpen={onOpen}
          onDelete={onDelete}
        />
      ))}
    </ul>
  );
}
