import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { SnapItem } from '../../types';
import { AppAssignPopover } from './AppAssignPopover';

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

const ANCHOR: DOMRect = {
  x: 100,
  y: 100,
  width: 200,
  height: 200,
  top: 100,
  right: 300,
  bottom: 300,
  left: 100,
  toJSON: () => ({}),
};

const SOURCE_APPS = new Map([
  ['Adobe Photoshop 2026', 5],
  ['Safari', 12],
  ['Visual Studio Code', 8],
]);

describe('AppAssignPopover', () => {
  it('renders existing apps with counts and a None option', () => {
    render(
      <AppAssignPopover
        snap={makeSnap()}
        sourceApps={SOURCE_APPS}
        anchorRect={ANCHOR}
        onReassign={vi.fn()}
        onDismiss={vi.fn()}
      />,
    );

    expect(screen.getByText('None')).toBeInTheDocument();
    expect(screen.getByText('Adobe Photoshop 2026')).toBeInTheDocument();
    expect(screen.getByText('Safari')).toBeInTheDocument();
    expect(screen.getByText('Visual Studio Code')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
  });

  it('filters the list by typed query', async () => {
    const user = userEvent.setup();
    render(
      <AppAssignPopover
        snap={makeSnap()}
        sourceApps={SOURCE_APPS}
        anchorRect={ANCHOR}
        onReassign={vi.fn()}
        onDismiss={vi.fn()}
      />,
    );

    await user.type(screen.getByPlaceholderText(/search or type/i), 'photo');

    expect(screen.getByText('Adobe Photoshop 2026')).toBeInTheDocument();
    expect(screen.queryByText('Safari')).not.toBeInTheDocument();
    expect(screen.queryByText('Visual Studio Code')).not.toBeInTheDocument();
  });

  it('clicking an existing app reassigns to it and dismisses', async () => {
    const user = userEvent.setup();
    const onReassign = vi.fn();
    const onDismiss = vi.fn();
    render(
      <AppAssignPopover
        snap={makeSnap()}
        sourceApps={SOURCE_APPS}
        anchorRect={ANCHOR}
        onReassign={onReassign}
        onDismiss={onDismiss}
      />,
    );

    await user.click(screen.getByText('Visual Studio Code'));

    expect(onReassign).toHaveBeenCalledWith('snap-1', 'Visual Studio Code');
    expect(onDismiss).toHaveBeenCalled();
  });

  it('clicking None reassigns to null', async () => {
    const user = userEvent.setup();
    const onReassign = vi.fn();
    render(
      <AppAssignPopover
        snap={makeSnap()}
        sourceApps={SOURCE_APPS}
        anchorRect={ANCHOR}
        onReassign={onReassign}
        onDismiss={vi.fn()}
      />,
    );

    await user.click(screen.getByText('None'));

    expect(onReassign).toHaveBeenCalledWith('snap-1', null);
  });

  it('shows "Create new app" when query has no match and commits the typed value', async () => {
    const user = userEvent.setup();
    const onReassign = vi.fn();
    render(
      <AppAssignPopover
        snap={makeSnap()}
        sourceApps={SOURCE_APPS}
        anchorRect={ANCHOR}
        onReassign={onReassign}
        onDismiss={vi.fn()}
      />,
    );

    await user.type(screen.getByPlaceholderText(/search or type/i), 'Linear');
    const createRow = screen.getByText(/Create new app:/i);
    expect(createRow).toBeInTheDocument();

    await user.click(createRow);
    expect(onReassign).toHaveBeenCalledWith('snap-1', 'Linear');
  });

  it('hides "Create new app" when query matches an existing app exactly (case-insensitive)', async () => {
    const user = userEvent.setup();
    render(
      <AppAssignPopover
        snap={makeSnap()}
        sourceApps={SOURCE_APPS}
        anchorRect={ANCHOR}
        onReassign={vi.fn()}
        onDismiss={vi.fn()}
      />,
    );

    await user.type(screen.getByPlaceholderText(/search or type/i), 'safari');
    expect(screen.queryByText(/Create new app:/i)).not.toBeInTheDocument();
  });

  it('Enter on an exact case-insensitive match picks that existing app', async () => {
    const user = userEvent.setup();
    const onReassign = vi.fn();
    render(
      <AppAssignPopover
        snap={makeSnap()}
        sourceApps={SOURCE_APPS}
        anchorRect={ANCHOR}
        onReassign={onReassign}
        onDismiss={vi.fn()}
      />,
    );

    const input = screen.getByPlaceholderText(/search or type/i);
    await user.type(input, 'safari{Enter}');
    // Should pick the canonical-cased stored name, not the typed casing
    expect(onReassign).toHaveBeenCalledWith('snap-1', 'Safari');
  });

  it('Enter on a non-matching query commits the typed value as a new app', async () => {
    const user = userEvent.setup();
    const onReassign = vi.fn();
    render(
      <AppAssignPopover
        snap={makeSnap()}
        sourceApps={SOURCE_APPS}
        anchorRect={ANCHOR}
        onReassign={onReassign}
        onDismiss={vi.fn()}
      />,
    );

    await user.type(
      screen.getByPlaceholderText(/search or type/i),
      'Notion{Enter}',
    );
    expect(onReassign).toHaveBeenCalledWith('snap-1', 'Notion');
  });

  it('Escape dismisses without reassigning', async () => {
    const user = userEvent.setup();
    const onReassign = vi.fn();
    const onDismiss = vi.fn();
    render(
      <AppAssignPopover
        snap={makeSnap()}
        sourceApps={SOURCE_APPS}
        anchorRect={ANCHOR}
        onReassign={onReassign}
        onDismiss={onDismiss}
      />,
    );

    await user.keyboard('{Escape}');
    expect(onDismiss).toHaveBeenCalled();
    expect(onReassign).not.toHaveBeenCalled();
  });

  it('clicking outside the popover dismisses it', async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    render(
      <div>
        <div data-testid="outside">outside</div>
        <AppAssignPopover
          snap={makeSnap()}
          sourceApps={SOURCE_APPS}
          anchorRect={ANCHOR}
          onReassign={vi.fn()}
          onDismiss={onDismiss}
        />
      </div>,
    );

    await user.click(screen.getByTestId('outside'));
    expect(onDismiss).toHaveBeenCalled();
  });
});
