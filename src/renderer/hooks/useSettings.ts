import { useEffect, useState } from 'react';
import { DEFAULT_SETTINGS, type Settings } from '../../shared/settings';

/**
 * Current settings, kept in sync with main. Starts from the defaults so
 * labels render immediately, then swaps in the stored values.
 */
export function useSettings(): Settings {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  useEffect(() => {
    let cancelled = false;
    window.snap.settings.get().then((loaded) => {
      if (!cancelled) setSettings(loaded);
    });
    const unsubscribe = window.snap.settings.onUpdated(setSettings);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  return settings;
}
