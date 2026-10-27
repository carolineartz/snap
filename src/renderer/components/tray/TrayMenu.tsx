import { useEffect, useRef, useState } from 'react';
import { TrayIconButton } from './TrayIconButton';

interface TrayMenuProps {
  /** Label for the trigger button. */
  title: string;
  /** Accessible name for the menu itself. */
  menuLabel: string;
  icon: React.ReactNode;
  /** Receives `close` so an item can dismiss the menu when picked. */
  children: (close: () => void) => React.ReactNode;
}

/**
 * Footer icon button that pops a small menu upward. Closes on
 * click-outside or Escape; items close it themselves via `close`.
 */
export function TrayMenu({ title, menuLabel, icon, children }: TrayMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleMouseDown = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <TrayIconButton
        title={title}
        expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {icon}
      </TrayIconButton>

      {open && (
        <div
          role="menu"
          aria-label={menuLabel}
          className="absolute right-0 bottom-full mb-1.5 w-48 overflow-hidden rounded-lg bg-white py-1 text-sm text-neutral-800 shadow-[0_8px_24px_rgba(0,0,0,0.18),0_1px_3px_rgba(0,0,0,0.08)] ring-1 ring-black/[0.08]"
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

export function TrayMenuItem({
  onClick,
  shortcut,
  children,
}: {
  onClick: () => void;
  /** Key combo shown right-aligned, e.g. `⌘⇧2`. */
  shortcut?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="flex w-full items-center justify-between gap-3 px-3 py-1.5 text-left hover:bg-black/5"
    >
      <span>{children}</span>
      {shortcut && <span className="text-neutral-400">{shortcut}</span>}
    </button>
  );
}

export function TrayMenuSeparator() {
  return (
    <div
      aria-hidden="true"
      className="mx-2 my-1 border-t border-black/[0.06]"
    />
  );
}
