import { useEffect, useState } from 'react';

interface AppIconProps {
  /** App display name as stored on a snap. Pass null for the "Other / None" bucket. */
  appName: string | null;
  /** Pixel size for both width and height. Defaults to 16 (matches FilterPanel rows). */
  size?: number;
}

/**
 * Renders a macOS app icon by display name, falling back to a "?" placeholder
 * when resolution fails. Resolution happens in the main process via
 * `window.snap.library.getAppIcon`, which layers Launch Services + Spotlight
 * and reads `CFBundleIconFile` from the bundle's Info.plist — see
 * `src/main/utils.ts` / `src/main/handlers/library.ts`.
 *
 * Re-renders when `appName` changes; the underlying lookup is cached in main.
 */
export function AppIcon({ appName, size = 16 }: AppIconProps) {
  const [iconSrc, setIconSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!appName || appName === 'Other') {
      setIconSrc(null);
      return;
    }
    let cancelled = false;
    window.snap.library.getAppIcon(appName).then((src) => {
      if (!cancelled) setIconSrc(src);
    });
    return () => {
      cancelled = true;
    };
  }, [appName]);

  if (iconSrc) {
    return (
      <img
        src={iconSrc}
        alt=""
        style={{ width: size, height: size }}
        className="flex-shrink-0"
        draggable={false}
      />
    );
  }

  return (
    <span
      style={{ width: size, height: size, fontSize: Math.max(8, size / 2) }}
      className="flex flex-shrink-0 items-center justify-center rounded bg-neutral-300 text-neutral-600"
    >
      ?
    </span>
  );
}
