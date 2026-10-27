// SVG icons — decorative, inside titled buttons
const iconProps = {
  width: 16,
  height: 16,
  viewBox: '0 0 16 16',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export const PointerIcon = () => (
  <svg {...iconProps}>
    <path d="M3 2 L3 12 L6 9 L8 13 L10 12 L8 8 L12 8 Z" />
  </svg>
);

// Filled icons — based on the SVG assets in /assets. Use currentColor
// so they pick up text color from their parent button.
//
// We set width/height as both attributes AND CSS so nothing in
// Tailwind preflight or a stray rule can stretch the icon beyond its
// intended box (which would, in turn, balloon the click target of
// any button containing it).
const filledProps = (size: number, viewBox: string) => ({
  width: size,
  height: size,
  viewBox,
  fill: 'currentColor',
  style: {
    width: `${size}px`,
    height: `${size}px`,
    display: 'block',
    flexShrink: 0,
  },
  'aria-hidden': true as const,
});

export const SearchIcon = ({ size = 16 }: { size?: number } = {}) => (
  <svg {...filledProps(size, '0 0 461.516 461.516')}>
    <path d="M185.746 371.332c41.251.001 81.322-13.762 113.866-39.11l122.778 122.778c9.172 8.858 23.787 8.604 32.645-.568 8.641-8.947 8.641-23.131 0-32.077l-122.778-122.778c62.899-80.968 48.252-197.595-32.716-260.494s-197.594-48.252-260.493 32.716-48.252 197.595 32.716 260.494c32.597 25.323 72.704 39.06 113.982 39.039zm-98.651-284.273c54.484-54.485 142.82-54.486 197.305-.002s54.486 142.82.002 197.305-142.82 54.486-197.305.002c-.001-.001-.001-.001-.002-.002-54.484-54.087-54.805-142.101-.718-196.585.239-.24.478-.479.718-.718z" />
  </svg>
);

export const ChevronDownIcon = ({ size = 14 }: { size?: number } = {}) => (
  <svg {...filledProps(size, '0 0 128 128')}>
    <path d="m64 88c-1.023 0-2.047-.391-2.828-1.172l-40-40c-1.563-1.563-1.563-4.094 0-5.656s4.094-1.563 5.656 0l37.172 37.172 37.172-37.172c1.563-1.563 4.094-1.563 5.656 0s1.563 4.094 0 5.656l-40 40c-.781.781-1.805 1.172-2.828 1.172z" />
  </svg>
);

export const ChevronTinyDownIcon = ({ size = 12 }: { size?: number } = {}) => (
  <svg {...filledProps(size, '0 0 128 128')}>
    <path d="m64 88c-1.023 0-2.047-.391-2.828-1.172l-40-40c-1.563-1.563-1.563-4.094 0-5.656s4.094-1.563 5.656 0l37.172 37.172 37.172-37.172c1.563-1.563 4.094-1.563 5.656 0s1.563 4.094 0 5.656l-40 40c-.781.781-1.805 1.172-2.828 1.172z" />
  </svg>
);

export const PencilIcon = () => (
  <svg {...iconProps}>
    <path d="M10 2 L14 6 L6 14 L2 14 L2 10 Z" />
    <path d="M9 3 L13 7" />
  </svg>
);

export const TextIcon = () => (
  <svg {...iconProps}>
    <path d="M3 3 L13 3" />
    <path d="M8 3 L8 13" />
  </svg>
);

export const RectIcon = () => (
  <svg {...iconProps}>
    <rect x="2.5" y="3" width="11" height="10" rx="0.5" />
  </svg>
);

export const EllipseIcon = () => (
  <svg {...iconProps}>
    <ellipse cx="8" cy="8" rx="5.5" ry="5" />
  </svg>
);

export const ArrowIcon = () => (
  <svg {...iconProps}>
    <path d="M2 14 L14 2" />
    <path d="M8 2 L14 2 L14 8" />
  </svg>
);

export const EraserIcon = () => (
  <svg {...iconProps}>
    <path d="M2 11 L6 15 L14 7 L10 3 Z" />
    <path d="M6 15 L14 15" />
    <path d="M6 7 L10 11" />
  </svg>
);

export const TrashIcon = () => (
  <svg {...iconProps}>
    <path d="M2 4 L14 4" />
    <path d="M6 4 L6 2 L10 2 L10 4" />
    <path d="M4 4 L4 14 L12 14 L12 4" />
    <path d="M6.5 7 L6.5 12" />
    <path d="M9.5 7 L9.5 12" />
  </svg>
);

export const CopyIcon = () => (
  <svg {...iconProps}>
    <rect x="5" y="5" width="9" height="9" rx="1" />
    <path d="M11 5 L11 3 C11 2.5 10.5 2 10 2 L3 2 C2.5 2 2 2.5 2 3 L2 10 C2 10.5 2.5 11 3 11 L5 11" />
  </svg>
);

export const CloseIcon = () => (
  <svg {...iconProps}>
    <path d="M4 4 L12 12" />
    <path d="M12 4 L4 12" />
  </svg>
);

export const CheckIcon = () => (
  <svg {...iconProps}>
    <path d="M3 8 L7 12 L13 4" />
  </svg>
);

export const SortIcon = ({ direction }: { direction: 'desc' | 'asc' }) => (
  <svg
    aria-hidden="true"
    width="14"
    height="14"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {direction === 'desc' ? (
      <>
        <path d="M8 3 L8 13" />
        <path d="M4 9 L8 13 L12 9" />
      </>
    ) : (
      <>
        <path d="M8 13 L8 3" />
        <path d="M4 7 L8 3 L12 7" />
      </>
    )}
  </svg>
);

export const MoreIcon = ({ size = 16 }: { size?: number } = {}) => (
  <svg {...filledProps(size, '0 0 24 24')}>
    <circle cx="12" cy="12" r="2" />
    <circle cx="4" cy="12" r="2" />
    <circle cx="20" cy="12" r="2" />
  </svg>
);

export const GearIcon = ({ size = 18 }: { size?: number } = {}) => (
  <svg {...filledProps(size, '0 0 512 512')}>
    <path d="M496.659,312.107l-47.061-36.8c0.597-5.675,1.109-12.309,1.109-19.328c0-7.019-0.491-13.653-1.109-19.328l47.104-36.821c8.747-6.912,11.136-19.179,5.568-29.397L453.331,85.76c-5.227-9.557-16.683-14.464-28.309-10.176l-55.531,22.293c-10.645-7.68-21.803-14.165-33.344-19.349l-8.448-58.901C326.312,8.448,316.584,0,305.086,0h-98.133c-11.499,0-21.205,8.448-22.571,19.456l-8.469,59.115c-11.179,5.035-22.165,11.435-33.28,19.349l-55.68-22.357C76.52,71.531,64.04,76.053,58.856,85.568L9.854,170.347c-5.781,9.771-3.392,22.464,5.547,29.547l47.061,36.8c-0.747,7.189-1.109,13.44-1.109,19.307s0.363,12.117,1.109,19.328l-47.104,36.821c-8.747,6.933-11.115,19.2-5.547,29.397l48.939,84.672c5.227,9.536,16.576,14.485,28.309,10.176l55.531-22.293c10.624,7.659,21.781,14.144,33.323,19.349l8.448,58.88C185.747,503.552,195.454,512,206.974,512h98.133c11.499,0,21.227-8.448,22.592-19.456l8.469-59.093c11.179-5.056,22.144-11.435,33.28-19.371l55.68,22.357c2.688,1.045,5.483,1.579,8.363,1.579c8.277,0,15.893-4.523,19.733-11.563l49.152-85.12C507.838,331.349,505.448,319.083,496.659,312.107z M256.019,341.333c-47.061,0-85.333-38.272-85.333-85.333s38.272-85.333,85.333-85.333s85.333,38.272,85.333,85.333S303.08,341.333,256.019,341.333z" />
  </svg>
);

// Library / "snaps grid" icon — four rounded squares forming a 2×2.
// Mirrors the visual of assets/library.svg.
export const LibraryIcon = ({ size = 18 }: { size?: number } = {}) => (
  <svg {...filledProps(size, '0 0 512 512')}>
    <path d="M176.792,0H59.208C26.561,0,0,26.561,0,59.208v117.584C0,209.439,26.561,236,59.208,236h117.584C209.439,236,236,209.439,236,176.792V59.208C236,26.561,209.439,0,176.792,0z M196,176.792c0,10.591-8.617,19.208-19.208,19.208H59.208C48.617,196,40,187.383,40,176.792V59.208C40,48.617,48.617,40,59.208,40h117.584C187.383,40,196,48.617,196,59.208V176.792z" />
    <path d="M452,0H336c-33.084,0-60,26.916-60,60v116c0,33.084,26.916,60,60,60h116c33.084,0,60-26.916,60-60V60C512,26.916,485.084,0,452,0z M472,176c0,11.028-8.972,20-20,20H336c-11.028,0-20-8.972-20-20V60c0-11.028,8.972-20,20-20h116c11.028,0,20,8.972,20,20V176z" />
    <path d="M176.792,276H59.208C26.561,276,0,302.561,0,335.208v117.584C0,485.439,26.561,512,59.208,512h117.584C209.439,512,236,485.439,236,452.792V335.208C236,302.561,209.439,276,176.792,276z M196,452.792c0,10.591-8.617,19.208-19.208,19.208H59.208C48.617,472,40,463.383,40,452.792V335.208C40,324.617,48.617,316,59.208,316h117.584c10.591,0,19.208,8.617,19.208,19.208V452.792z" />
    <path d="M452,276H336c-33.084,0-60,26.916-60,60v116c0,33.084,26.916,60,60,60h116c33.084,0,60-26.916,60-60V336C512,302.916,485.084,276,452,276z M472,452c0,11.028-8.972,20-20,20H336c-11.028,0-20-8.972-20-20V336c0-11.028,8.972-20,20-20h116c11.028,0,20,8.972,20,20V452z" />
  </svg>
);

// Stopwatch — timed capture. Stroked rather than filled so the dial
// reads at 18px; stroke weight is tuned to sit next to the filled
// Gear/Library icons without looking lighter.
export const TimerIcon = ({ size = 18 }: { size?: number } = {}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.4}
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{
      width: `${size}px`,
      height: `${size}px`,
      display: 'block',
      flexShrink: 0,
    }}
    aria-hidden="true"
  >
    <circle cx="12" cy="13.5" r="7.5" />
    <path d="M12 9.75v4l2.75 1.75" />
    <path d="M9.25 2.5h5.5" />
    <path d="M12 2.5v3.5" />
  </svg>
);

// Selection corners around a crosshair — region capture. Same stroke
// weight as TimerIcon so the two sit side by side in the tray footer.
export const CaptureIcon = ({ size = 18 }: { size?: number } = {}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.4}
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{
      width: `${size}px`,
      height: `${size}px`,
      display: 'block',
      flexShrink: 0,
    }}
    aria-hidden="true"
  >
    <path d="M3 8V5a2 2 0 0 1 2-2h3" />
    <path d="M16 3h3a2 2 0 0 1 2 2v3" />
    <path d="M21 16v3a2 2 0 0 1-2 2h-3" />
    <path d="M8 21H5a2 2 0 0 1-2-2v-3" />
    <path d="M12 8.5v7" />
    <path d="M8.5 12h7" />
  </svg>
);

export const GridIcon = ({ small }: { small?: boolean }) => (
  <svg
    aria-hidden="true"
    width="12"
    height="12"
    viewBox="0 0 16 16"
    fill="currentColor"
  >
    {small ? (
      <>
        <rect x="2" y="2" width="4" height="4" rx="0.5" />
        <rect x="10" y="2" width="4" height="4" rx="0.5" />
        <rect x="2" y="10" width="4" height="4" rx="0.5" />
        <rect x="10" y="10" width="4" height="4" rx="0.5" />
      </>
    ) : (
      <rect x="2" y="2" width="12" height="12" rx="1" />
    )}
  </svg>
);
