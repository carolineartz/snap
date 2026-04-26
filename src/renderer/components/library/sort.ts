import type { SnapItem } from '../../types';

export type SortField = 'created' | 'opened' | 'modified';
export type SortDirection = 'desc' | 'asc';

// Returns the timestamp (ms since epoch) for a snap based on the active
// sort field. `opened` and `modified` may be null on snaps captured before
// those fields were tracked, so we fall back to createdAt to keep them in
// a stable, sensible position.
export function getSortTimestamp(snap: SnapItem, field: SortField): number {
  const ts =
    field === 'opened'
      ? (snap.lastOpenedAt ?? snap.createdAt)
      : field === 'modified'
        ? (snap.lastModifiedAt ?? snap.createdAt)
        : snap.createdAt;
  return new Date(ts).getTime();
}

export const SORT_FIELD_LABELS: Record<SortField, string> = {
  created: 'Date Created',
  opened: 'Last Opened',
  modified: 'Last Modified',
};

export const SORT_FIELD_PILL_LABELS: Record<SortField, string> = {
  created: 'Date',
  opened: 'Opened',
  modified: 'Modified',
};
