// Subtle decorative illustrations that sit behind page content.
// Pure SVG, no images to load, colored with the warm theme tokens
// at low opacity so they read as texture, not clutter.

function CupIcon({ className }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className}>
      <path
        d="M14 24h32l-2.5 24a6 6 0 0 1-6 5.4H22.5a6 6 0 0 1-6-5.4L14 24Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M46 28h4a6 6 0 0 1 0 12h-5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M24 14c-2 2-2 4 0 6M32 12c-2 2-2 4 0 6M40 14c-2 2-2 4 0 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function BeanIcon({ className }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className}>
      <path
        d="M46 18C34 14 18 22 16 36c-1.5 11 6 18 16 16 14-2.5 22-16 18-28-1.5-4.5-4-6-4-6Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M22 44c4-10 12-18 22-22"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CroissantIcon({ className }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className}>
      <path
        d="M10 40c4-16 16-26 30-26 8 0 14 4 14 4s-6 1-10 5c6 0 10 3 10 3s-6 0-9 4c5 0 8 3 8 3s-16 8-27 8c-9 0-16-1-16-1Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function CafeBackgroundArt() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      <CupIcon className="absolute -right-6 top-16 h-40 w-40 text-pine/[0.06] rotate-6" />
      <BeanIcon className="absolute -left-10 top-1/3 h-32 w-32 text-amber/[0.10] -rotate-12" />
      <CroissantIcon className="absolute right-1/4 bottom-10 h-28 w-28 text-pine/[0.07] rotate-3" />
      <BeanIcon className="absolute left-1/4 -bottom-8 h-24 w-24 text-amber/[0.08] rotate-45" />
      <CupIcon className="absolute left-8 top-4 h-20 w-20 text-pine/[0.05] -rotate-6" />
    </div>
  );
}