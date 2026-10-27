import { useEffect, useState } from 'react';
import { APP_NAME } from '../../../shared/constants';
import { GearIcon } from '../icons';
import { TrayMenu, TrayMenuItem, TrayMenuSeparator } from './TrayMenu';

interface SettingsMenuProps {
  onOpenSettings: () => void;
  onQuit: () => void;
}

export function SettingsMenu({ onOpenSettings, onQuit }: SettingsMenuProps) {
  const [version, setVersion] = useState<string | null>(null);

  useEffect(() => {
    window.snap.app.version().then(setVersion);
  }, []);

  return (
    <TrayMenu
      title="Settings"
      menuLabel="Settings"
      icon={<GearIcon size={16} />}
    >
      {(close) => (
        <>
          <TrayMenuItem
            onClick={() => {
              close();
              onOpenSettings();
            }}
          >
            Settings…
          </TrayMenuItem>
          <TrayMenuSeparator />
          <p className="px-3 py-1.5 text-xs text-neutral-400">
            {APP_NAME}
            {version && ` ${version}`}
          </p>
          <TrayMenuSeparator />
          <TrayMenuItem onClick={onQuit}>Quit {APP_NAME}</TrayMenuItem>
        </>
      )}
    </TrayMenu>
  );
}
