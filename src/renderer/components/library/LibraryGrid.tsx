import type { Tag, TagWithUsageCount } from '../../../shared/tag-colors';
import type { SnapItem } from '../../types';
import { getSortTimestamp, type SortField } from './sort';
import { LibraryGridItem } from './LibraryGridItem';

interface LibraryGridProps {
  snaps: SnapItem[];
  sortField: SortField;
  zoom: number;
  snapTags: Map<string, string[]>;
  allTags: TagWithUsageCount[];
  getTagRecord: (tag: string) => Tag | undefined;
  selectedIds: Set<string>;
  anchorId: string | null;
  onSelect: (
    snapId: string,
    modifiers: { shift: boolean; meta: boolean; ctrl: boolean },
  ) => void;
  onOpen: (snapId: string) => void;
  onDelete: (snapId: string) => void;
  onDuplicate: (snapId: string) => void;
  onTagsChanged: () => void;
}

function formatDateSeparator(ts: number): string {
  const date = new Date(ts);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const snapDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor(
    (today.getTime() - snapDay.getTime()) / (24 * 60 * 60 * 1000),
  );

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';

  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

function getDateKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/**
 * Group snaps by date. Consolidates regardless of input order — one group
 * per calendar day, ordered newest → oldest. Within each group, snaps keep
 * the order they arrived in (which is already the ranking the caller
 * computed). The day used for grouping is determined by `sortField` so the
 * visible sections always match the active sort (e.g. when sorting by
 * "Last Opened", the snap is grouped under the day it was opened, not the
 * day it was captured).
 */
function groupByDate(
  snaps: SnapItem[],
  sortField: SortField,
): { date: string; label: string; snaps: SnapItem[] }[] {
  const byKey = new Map<
    string,
    { date: string; label: string; snaps: SnapItem[]; ts: number }
  >();

  for (const snap of snaps) {
    const ts = getSortTimestamp(snap, sortField);
    const key = getDateKey(ts);
    let group = byKey.get(key);
    if (!group) {
      const d = new Date(ts);
      group = {
        date: key,
        label: formatDateSeparator(ts),
        snaps: [],
        ts: new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(),
      };
      byKey.set(key, group);
    }
    group.snaps.push(snap);
  }

  return [...byKey.values()].sort((a, b) => b.ts - a.ts);
}

export function LibraryGrid({
  snaps,
  sortField,
  zoom,
  snapTags,
  allTags,
  getTagRecord,
  selectedIds,
  anchorId,
  onSelect,
  onOpen,
  onDelete,
  onDuplicate,
  onTagsChanged,
}: LibraryGridProps) {
  const groups = groupByDate(snaps, sortField);

  return (
    <div className="p-4 pb-8">
      {groups.map((group) => (
        <div
          key={group.date}
          className="mb-5 rounded-2xl bg-[#fafafa] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.01),0_8px_20px_-8px_rgba(0,0,0,0.06)] dark:bg-[#2C2E30] dark:shadow-[0_1px_2px_rgba(0,0,0,0.02),0_4px_10px_-8px_rgba(0,0,0,0.05)]"
        >
          {/* Date separator */}
          <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
            {group.label}
          </h2>

          {/* Uniform grid slots, auto-fill based on zoom */}
          <div
            className="grid gap-3"
            style={{
              gridTemplateColumns: `repeat(auto-fill, minmax(${zoom}px, 1fr))`,
            }}
          >
            {group.snaps.map((snap) => (
              <LibraryGridItem
                key={snap.id}
                snap={snap}
                size={zoom}
                tags={snapTags.get(snap.id) || []}
                allTags={allTags}
                getTagRecord={getTagRecord}
                selected={selectedIds.has(snap.id)}
                isAnchor={anchorId === snap.id}
                onSelect={onSelect}
                onOpen={onOpen}
                onDelete={onDelete}
                onDuplicate={onDuplicate}
                onTagsChanged={onTagsChanged}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
