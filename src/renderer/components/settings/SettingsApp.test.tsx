import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS } from '../../../shared/settings';
import { SettingsApp } from './SettingsApp';

describe('SettingsApp', () => {
  it('lists every shortcut with its stored chord', async () => {
    vi.mocked(window.snap.settings.get).mockResolvedValue({
      ...DEFAULT_SETTINGS,
      shortcuts: { ...DEFAULT_SETTINGS.shortcuts, openLibrary: 'Alt+L' },
    });
    render(<SettingsApp />);

    expect(
      screen.getByRole('button', { name: 'Capture shortcut' }),
    ).toHaveTextContent('⇧⌘2');
    expect(
      screen.getByRole('button', { name: 'Timed capture shortcut' }),
    ).toHaveTextContent('⌥⇧⌘2');
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Open Library shortcut' }),
      ).toHaveTextContent('⌥L');
    });
  });

  it('saves a recorded shortcut and pauses global shortcuts meanwhile', async () => {
    const user = userEvent.setup();
    render(<SettingsApp />);

    const field = screen.getByRole('button', { name: 'Capture shortcut' });
    await user.click(field);
    expect(window.snap.settings.suspendShortcuts).toHaveBeenLastCalledWith(
      true,
    );

    await user.keyboard('{Meta>}[Digit4]{/Meta}');

    expect(window.snap.settings.update).toHaveBeenCalledWith({
      shortcuts: { capture: 'Command+4' },
    });
    expect(window.snap.settings.suspendShortcuts).toHaveBeenLastCalledWith(
      false,
    );
  });

  it('shows the error main returns for a refused shortcut', async () => {
    vi.mocked(window.snap.settings.update).mockResolvedValue({
      settings: DEFAULT_SETTINGS,
      errors: { capture: 'Another app may already use this shortcut.' },
    });
    const user = userEvent.setup();
    render(<SettingsApp />);

    await user.click(screen.getByRole('button', { name: 'Capture shortcut' }));
    await user.keyboard('{Meta>}[Digit4]{/Meta}');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Another app may already use this shortcut.',
    );
  });

  it('toggles copy-on-capture', async () => {
    const user = userEvent.setup();
    render(<SettingsApp />);

    await user.click(
      screen.getByRole('checkbox', { name: /Copy new snaps to the clipboard/ }),
    );

    expect(window.snap.settings.update).toHaveBeenCalledWith({
      copyOnCapture: true,
    });
  });
});
