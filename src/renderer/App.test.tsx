import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { App } from './App';
import type { SnapItem } from './types';

function makeSnap(overrides: Partial<SnapItem> = {}): SnapItem {
  return {
    id: 'snap-1',
    name: null,
    thumbPath: '/path/to/thumb.png',
    sourceApp: 'Safari',
    isOpen: 0,
    createdAt: new Date().toISOString(),
    filePath: '/path/to/snap.png',
    width: 800,
    height: 600,
    annotations: null,
    thumbnailUpdatedAt: null,
    ocrText: null,
    classificationLabels: null,
    lastOpenedAt: null,
    lastModifiedAt: null,
    ...overrides,
  };
}

/** Wait for at least one thumbnail img to appear */
async function waitForThumbnail(container: HTMLElement) {
  await waitFor(() => {
    expect(container.querySelector('img')).toBeInTheDocument();
  });
}

describe('App', () => {
  it('renders the footer icon buttons', () => {
    render(<App />);
    expect(screen.getByLabelText('Open Library')).toBeInTheDocument();
    expect(screen.getByLabelText('Settings')).toBeInTheDocument();
  });

  it('shows empty state when no snaps', async () => {
    render(<App />);
    expect(await screen.findByText('No snaps yet')).toBeInTheDocument();
    expect(
      screen.getByText('Press ⌘⇧2 to take a screenshot'),
    ).toBeInTheDocument();
  });

  it('opens the library window when the library icon is clicked', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByLabelText('Open Library'));
    expect(window.snap.library.openBrowserWindow).toHaveBeenCalled();
  });

  it('renders the snap grid when snaps exist', async () => {
    vi.mocked(window.snap.library.getSnaps).mockResolvedValueOnce([makeSnap()]);
    render(<App />);
    await waitFor(() => {
      expect(screen.queryByText('No snaps yet')).not.toBeInTheDocument();
    });
  });

  it('registers onSnapsUpdated listener on mount', () => {
    render(<App />);
    expect(window.snap.library.onSnapsUpdated).toHaveBeenCalledWith(
      expect.any(Function),
    );
  });

  it('opens a snap and reloads the list', async () => {
    const snaps = [makeSnap()];
    vi.mocked(window.snap.library.getSnaps)
      .mockResolvedValueOnce(snaps)
      .mockResolvedValueOnce(snaps);

    const user = userEvent.setup();
    const { container } = render(<App />);

    await waitForThumbnail(container);
    const gridItem = container.querySelector('[class*="group"]')!;
    await user.dblClick(gridItem);

    await waitFor(() => {
      expect(window.snap.library.openSnap).toHaveBeenCalledWith('snap-1');
    });
  });

  it('deletes a snap and reloads the list', async () => {
    const snaps = [makeSnap()];
    vi.mocked(window.snap.library.getSnaps)
      .mockResolvedValueOnce(snaps)
      .mockResolvedValueOnce([]);

    const user = userEvent.setup();
    const { container } = render(<App />);

    await waitForThumbnail(container);
    const gridItem = container.querySelector('[class*="group"]')!;
    await user.pointer({ keys: '[MouseRight]', target: gridItem });

    await waitFor(() => {
      expect(window.snap.library.deleteSnap).toHaveBeenCalledWith('snap-1');
    });
  });
});
