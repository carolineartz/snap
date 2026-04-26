import { useEffect, useRef, useState } from 'react';
import { CheckIcon, ChevronTinyDownIcon } from '../icons';
import { SORT_FIELD_LABELS, SORT_FIELD_PILL_LABELS, type SortField } from './sort';

interface SortMenuProps {
  sortField: SortField;
  onSortFieldChange: (field: SortField) => void;
}

const SORT_OPTIONS: SortField[] = ['created', 'opened', 'modified'];

// Finder-style pill that opens a small popover anchored beneath the trigger.
// Mirrors the dismiss pattern used by LibraryGridItem's context menu: a
// transparent fullscreen backdrop catches clicks/contextmenus to close.
export function SortMenu({ sortField, onSortFieldChange }: SortMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close on Escape while open. Other key handling stays with the global
  // listener in LibraryApp so search shortcuts still work.
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen]);

  const open = () => {
    const rect = buttonRef.current?.getBoundingClientRect() ?? null;
    setAnchorRect(rect);
    setIsOpen(true);
  };

  const select = (field: SortField) => {
    onSortFieldChange(field);
    setIsOpen(false);
    buttonRef.current?.focus();
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => (isOpen ? setIsOpen(false) : open())}
        title="Sort by"
        className="flex h-7 items-center gap-1 rounded-md px-2 text-[12px] text-neutral-600 transition-colors hover:bg-black/5 hover:text-neutral-800 dark:text-neutral-300 dark:hover:bg-white/10 dark:hover:text-neutral-100"
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        <span className="text-neutral-500 dark:text-neutral-400">Sort:</span>
        <span className="font-medium">{SORT_FIELD_PILL_LABELS[sortField]}</span>
        <ChevronTinyDownIcon />
      </button>

      {isOpen && anchorRect && (
        // biome-ignore lint/a11y/noStaticElementInteractions: dismiss backdrop
        // biome-ignore lint/a11y/useKeyWithClickEvents: backdrop dismiss
        <div
          className="fixed inset-0 z-50"
          onClick={() => setIsOpen(false)}
          onContextMenu={(e) => {
            e.preventDefault();
            setIsOpen(false);
          }}
        >
          {/* biome-ignore lint/a11y/useKeyWithClickEvents: menu panel */}
          <div
            role="menu"
            className="absolute min-w-[180px] rounded-lg border border-neutral-200 bg-white/95 py-1 text-[13px] shadow-xl backdrop-blur-md dark:border-white/10 dark:bg-neutral-800/95 dark:text-neutral-200"
            style={{
              top: anchorRect.bottom + 6,
              right: window.innerWidth - anchorRect.right,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {SORT_OPTIONS.map((field) => {
              const isActive = sortField === field;
              return (
                <button
                  key={field}
                  type="button"
                  role="menuitemradio"
                  aria-checked={isActive}
                  onClick={() => select(field)}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-blue-500 hover:text-white dark:hover:bg-blue-600"
                >
                  <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center">
                    {isActive ? <CheckIcon /> : null}
                  </span>
                  <span>{SORT_FIELD_LABELS[field]}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
