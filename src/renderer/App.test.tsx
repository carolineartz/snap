import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
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
    expect(screen.getByLabelText('Timed capture')).toBeInTheDocument();
    expect(screen.getByLabelText('Capture (⇧⌘2)')).toBeInTheDocument();
  });

  it('starts an immediate capture from the capture button', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByLabelText('Capture (⇧⌘2)'));
    expect(window.snap.capture.start).toHaveBeenCalledWith(0);
  });

  it('quits from the settings menu', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByLabelText('Settings'));
    expect(await screen.findByText('Snap 0.1.0')).toBeInTheDocument();
    await user.click(screen.getByRole('menuitem', { name: 'Quit Snap' }));
    expect(window.snap.app.quit).toHaveBeenCalled();
  });

  it('opens the settings window from the settings menu', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByLabelText('Settings'));
    await user.click(screen.getByRole('menuitem', { name: 'Settings…' }));
    expect(window.snap.settings.openWindow).toHaveBeenCalled();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('shows the stored shortcut instead of the default', async () => {
    vi.mocked(window.snap.settings.get).mockResolvedValue({
      shortcuts: {
        capture: 'Alt+1',
        timedCapture: null,
        openLibrary: 'Command+Shift+L',
      },
      copyOnCapture: false,
    });
    render(<App />);
    expect(await screen.findByLabelText('Capture (⌥1)')).toBeInTheDocument();
    expect(
      screen.getByText('Press ⌥1 to take a screenshot'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/for a timed capture/)).not.toBeInTheDocument();
  });

  it('starts a capture from the timed capture menu', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByLabelText('Timed capture'));
    await user.click(screen.getByRole('menuitem', { name: /Capture in 5s/ }));
    expect(window.snap.capture.start).toHaveBeenCalledWith(5);
  });

  it('shows the countdown pushed from main and can cancel it', async () => {
    const user = userEvent.setup();
    render(<App />);

    const onCountdown = vi.mocked(window.snap.capture.onCountdown);
    expect(onCountdown).toHaveBeenCalledWith(expect.any(Function));
    const push = onCountdown.mock.calls[0][0];

    act(() => push(3));
    expect(screen.getByRole('status')).toHaveTextContent('Capturing in 3s');

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(window.snap.capture.cancel).toHaveBeenCalled();

    act(() => push(null));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('shows empty state when no snaps', async () => {
    render(<App />);
    expect(await screen.findByText('No snaps yet')).toBeInTheDocument();
    expect(
      screen.getByText('Press ⇧⌘2 to take a screenshot'),
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

  it('hands a grid item drag to main as a native file drag', async () => {
    vi.mocked(window.snap.library.getSnaps).mockResolvedValueOnce([makeSnap()]);
    const { container } = render(<App />);

    await waitForThumbnail(container);
    const gridItem = container.querySelector('[class*="group"]')!;
    fireEvent.dragStart(gridItem);

    expect(window.snap.library.startDrag).toHaveBeenCalledWith(['snap-1']);
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
