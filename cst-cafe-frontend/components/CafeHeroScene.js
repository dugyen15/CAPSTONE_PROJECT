// A cute, hand-drawn-style café scene used as decorative background art
// behind the homepage hero. Pure SVG line art (no images to load) using the
// site's existing pine/amber palette at low opacity so the headline stays
// the focal point.

export default function CafeHeroScene({ className }) {
  return (
    <svg
      viewBox="0 0 800 320"
      className={className}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      {/* string lights across the top */}
      <g
        className="text-pine/25"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <path d="M-20 30 Q 150 90 400 35 T 820 30" />
        <circle cx="20" cy="42" r="5" fill="currentColor" stroke="none" />
        <circle cx="140" cy="70" r="5" fill="currentColor" stroke="none" />
        <circle cx="260" cy="58" r="5" fill="currentColor" stroke="none" />
        <circle cx="400" cy="35" r="5" fill="currentColor" stroke="none" />
        <circle cx="540" cy="50" r="5" fill="currentColor" stroke="none" />
        <circle cx="660" cy="62" r="5" fill="currentColor" stroke="none" />
        <circle cx="780" cy="34" r="5" fill="currentColor" stroke="none" />
      </g>

      {/* little storefront */}
      <g
        className="text-pine/15"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      >
        <rect x="300" y="150" width="200" height="110" rx="6" />
        <path d="M288 150 L 400 96 L 512 150 Z" />
        <rect x="328" y="188" width="50" height="72" rx="4" />
        <rect x="424" y="188" width="56" height="42" rx="4" />
        <line x1="452" y1="188" x2="452" y2="230" />
        <line x1="424" y1="209" x2="480" y2="209" />
        <line x1="308" y1="160" x2="492" y2="160" strokeDasharray="6 8" />
      </g>

      {/* hanging plant, top-left */}
      <g
        className="text-amber/30"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M64 0 L 64 42" />
        <rect x="44" y="42" width="40" height="20" rx="3" />
        <path d="M64 42 q -22 8 -28 34" />
        <path d="M64 42 q 20 4 24 30" />
        <path d="M64 46 q -6 14 -18 26" />
      </g>

      {/* coffee cup, bottom-right */}
      <g
        className="text-pine/25"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M600 232 h 78 l -6 54 a 14 14 0 0 1 -14 12 h -38 a 14 14 0 0 1 -14 -12 Z" />
        <path d="M678 242 h 10 a 14 14 0 0 1 0 28 h -8" />
        <path d="M616 208 q -4 6 0 12 M631 203 q -4 6 0 12 M646 208 q -4 6 0 12" />
      </g>

      {/* pastry, bottom-left */}
      <g
        className="text-amber/25"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M108 262c8-16 32-26 58-24 6 0 10 4 8 8-14-2-26 4-24 10 12-2 22 4 20 10-16-4-30 2-32 10-14-4-30-2-30-14z" />
      </g>

      {/* scattered coffee beans */}
      <g className="text-pine/15" fill="none" stroke="currentColor" strokeWidth="1.6">
        <ellipse cx="230" cy="86" rx="10" ry="6" transform="rotate(-20 230 86)" />
        <path d="M223 84 q 7 3 14 0" />
        <ellipse cx="562" cy="58" rx="8" ry="5" transform="rotate(30 562 58)" />
        <path d="M556 56 q 6 2 12 0" />
        <ellipse cx="700" cy="150" rx="7" ry="4.5" transform="rotate(-10 700 150)" />
        <path d="M695 149 q 5 2 10 0" />
      </g>
    </svg>
  );
}