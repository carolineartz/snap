import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CaptureCountdown, TimedCaptureButton } from './TimedCapture';

describe('TimedCaptureButton', () => {
  it('opens a delay menu with each preset', async () => {
    const user = userEvent.setup();
    render(<TimedCaptureButton onStart={vi.fn()} shortcutLabel="⌥⇧⌘2" />);

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    await user.click(screen.getByLabelText('Timed capture'));

    expect(screen.getByRole('menu', { name: 'Capture delay' })).toBeVisible();
    expect(screen.getAllByRole('menuitem')).toHaveLength(3);
    expect(
      screen.getByRole('menuitem', { name: 'Capture in 3s' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('menuitem', { name: 'Capture in 5s ⌥⇧⌘2' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('menuitem', { name: 'Capture in 10s' }),
    ).toBeInTheDocument();
  });

  it('starts a capture with the chosen delay and closes the menu', async () => {
    const onStart = vi.fn();
    const user = userEvent.setup();
    render(<TimedCaptureButton onStart={onStart} />);

    await user.click(screen.getByLabelText('Timed capture'));
    await user.click(screen.getByRole('menuitem', { name: /Capture in 5s/ }));

    expect(onStart).toHaveBeenCalledWith(5);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('closes on Escape and on click outside without starting', async () => {
    const onStart = vi.fn();
    const user = userEvent.setup();
    render(
      <div>
        <button type="button">outside</button>
        <TimedCaptureButton onStart={onStart} />
      </div>,
    );

    await user.click(screen.getByLabelText('Timed capture'));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    await user.click(screen.getByLabelText('Timed capture'));
    await user.click(screen.getByText('outside'));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    expect(onStart).not.toHaveBeenCalled();
  });
});

describe('CaptureCountdown', () => {
  it('announces the seconds left and cancels on click', async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();
    render(<CaptureCountdown secondsLeft={4} onCancel={onCancel} />);

    expect(screen.getByRole('status')).toHaveTextContent('Capturing in 4s');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalled();
  });
});
