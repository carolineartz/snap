export function TrayIconButton({
  title,
  onClick,
  expanded,
  children,
}: {
  title: string;
  onClick: () => void;
  /** Set when the button toggles a menu, so screen readers announce state. */
  expanded?: boolean;
  children: React.ReactNode;
}) {
  // `inline-flex` keeps the button's intrinsic block-like behavior
  // while giving us flex centering. `shrink-0` guards against any
  // ancestor flex container squeezing the button down. The inner
  // span is `pointer-events-none` so clicks always land on the
  // button, never on the SVG, and the icon is sized via the
  // component's prop so it can never overflow the box.
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-expanded={expanded}
      onClick={onClick}
      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-neutral-500 transition-colors hover:bg-black/5 hover:text-neutral-800 aria-expanded:bg-black/5 aria-expanded:text-neutral-800"
    >
      <span className="pointer-events-none flex items-center justify-center">
        {children}
      </span>
    </button>
  );
}
