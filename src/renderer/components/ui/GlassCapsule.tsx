import { LiquidGlass } from '@creativoma/liquid-glass';
import type { ComponentProps } from 'react';
import { useEffect, useState } from 'react';

type Props = ComponentProps<typeof LiquidGlass>;

// Tuned for macOS Tahoe restraint, not 2024 glassmorphism. Displacement
// is dialed way down from the lib's default of 150, backdrop blur up
// from 2. Tint flips with prefers-color-scheme since the lib takes a
// single color string (no Tailwind dark: variant on a prop value).
//
// boxShadow is set via inline style — the lib hardcodes a heavy default
// shadow on its outer wrapper, which would beat any Tailwind shadow-*
// utility. We override it here so call sites can stay focused on
// layout / border / padding via className.
export function GlassCapsule({ style, ...props }: Props) {
  const isDark = useIsDarkMode();
  return (
    <LiquidGlass
      backdropBlur={12}
      displacementScale={18}
      turbulenceBaseFrequency="0.012 0.012"
      turbulenceSeed={2}
      tintColor={
        isDark ? 'rgba(255, 255, 255, 0.10)' : 'rgba(255, 255, 255, 0.45)'
      }
      style={{
        boxShadow: isDark
          ? '0 1px 2px rgba(0, 0, 0, 0.4), 0 4px 12px rgba(0, 0, 0, 0.35)'
          : '0 1px 2px rgba(0, 0, 0, 0.04), 0 4px 12px rgba(0, 0, 0, 0.06)',
        ...style,
      }}
      {...props}
    />
  );
}

function useIsDarkMode() {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e: MediaQueryListEvent) => setIsDark(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return isDark;
}
