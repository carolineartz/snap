import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ShortcutRecorder } from './ShortcutRecorder';

function setup(value: string | null = 'CommandOrControl+Shift+2') {
  const onChange = vi.fn();
  const onRecordingChange = vi.fn();
  render(
    <ShortcutRecorder
      label="Capture shortcut"
      value={value}
      onChange={onChange}
      onRecordingChange={onRecordingChange}
    />,
  );
  return {
    onChange,
    onRecordingChange,
    field: screen.getByRole('button', { name: 'Capture shortcut' }),
  };
}

describe('ShortcutRecorder', () => {
  it('shows the current chord and "Not set" when unbound', () => {
    const { field } = setup();
    expect(field).toHaveTextContent('⇧⌘2');
    render(<ShortcutRecorder label="Other" value={null} onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Other' })).toHaveTextContent(
      'Not set',
    );
  });

  it('records a new chord and reports recording state', async () => {
    const user = userEvent.setup();
    const { field, onChange, onRecordingChange } = setup();

    await user.click(field);
    expect(field).toHaveTextContent('Type shortcut…');
    expect(onRecordingChange).toHaveBeenLastCalledWith(true);

    await user.keyboard('{Alt>}{Shift>}[KeyL]{/Shift}{/Alt}');

    expect(onChange).toHaveBeenCalledWith('Alt+Shift+L');
    expect(field).toHaveTextContent('⇧⌘2');
    expect(onRecordingChange).toHaveBeenLastCalledWith(false);
  });

  it('refuses chords without a primary modifier and keeps recording', async () => {
    const user = userEvent.setup();
    const { field, onChange } = setup();

    await user.click(field);
    await user.keyboard('{Shift>}[Digit3]{/Shift}');

    expect(screen.getByRole('alert')).toHaveTextContent('Include ⌘, ⌃ or ⌥.');
    expect(onChange).not.toHaveBeenCalled();
    expect(field).toHaveTextContent('Type shortcut…');
  });

  it('unbinds on Delete and cancels on Escape', async () => {
    const user = userEvent.setup();
    const { field, onChange } = setup();

    await user.click(field);
    await user.keyboard('{Escape}');
    expect(onChange).not.toHaveBeenCalled();
    expect(field).toHaveTextContent('⇧⌘2');

    await user.click(field);
    await user.keyboard('{Backspace}');
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('shows an error passed in from main', () => {
    render(
      <ShortcutRecorder
        label="Capture shortcut"
        value="Alt+1"
        error="Another app may already use this shortcut."
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Another app may already use this shortcut.',
    );
  });
});
