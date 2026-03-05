/**
 * SVG Dither & Halftone Filters
 * Mount once in layout, reference via CSS `filter: url(#filter-id)`.
 *
 * Provides:
 * - #dither-fine     Fine ordered dithering (cards, small elements)
 * - #dither-coarse   Coarse halftone dots (hero backgrounds)
 * - #halftone        Classic halftone dot pattern
 * - #scanlines       CRT scan-line overlay
 * - #noise-grain     Film grain texture
 */
export function DitherFilters() {
  return (
    <svg
      className="absolute w-0 h-0 overflow-hidden"
      aria-hidden="true"
      data-agent-role="visual-filters"
    >
      <defs>
        {/* Fine dithering - subtle texture for cards */}
        <filter id="dither-fine" x="0%" y="0%" width="100%" height="100%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.65"
            numOctaves="4"
            seed="2"
            result="noise"
          />
          <feComponentTransfer in="noise" result="threshold">
            <feFuncR type="discrete" tableValues="0 1" />
            <feFuncG type="discrete" tableValues="0 1" />
            <feFuncB type="discrete" tableValues="0 1" />
          </feComponentTransfer>
          <feBlend in="SourceGraphic" in2="threshold" mode="multiply" />
        </filter>

        {/* Coarse halftone dots */}
        <filter id="dither-coarse" x="0%" y="0%" width="100%" height="100%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.3"
            numOctaves="2"
            seed="7"
            result="noise"
          />
          <feComponentTransfer in="noise" result="dots">
            <feFuncR type="discrete" tableValues="0 0.3 0.6 1" />
            <feFuncG type="discrete" tableValues="0 0.3 0.6 1" />
            <feFuncB type="discrete" tableValues="0 0.3 0.6 1" />
          </feComponentTransfer>
          <feBlend in="SourceGraphic" in2="dots" mode="multiply" />
        </filter>

        {/* Classic halftone pattern */}
        <filter id="halftone" x="0%" y="0%" width="100%" height="100%">
          <feTurbulence
            type="turbulence"
            baseFrequency="1.5"
            numOctaves="1"
            seed="3"
            result="turb"
          />
          <feColorMatrix
            in="turb"
            type="saturate"
            values="0"
            result="grey"
          />
          <feComponentTransfer in="grey" result="dots">
            <feFuncR type="discrete" tableValues="0 0 1 1" />
            <feFuncG type="discrete" tableValues="0 0 1 1" />
            <feFuncB type="discrete" tableValues="0 0 1 1" />
          </feComponentTransfer>
          <feBlend in="SourceGraphic" in2="dots" mode="multiply" />
        </filter>

        {/* Scan-line effect */}
        <pattern
          id="scanline-pattern"
          width="1"
          height="4"
          patternUnits="userSpaceOnUse"
        >
          <rect width="1" height="2" fill="rgba(0,0,0,0)" />
          <rect y="2" width="1" height="2" fill="rgba(0,0,0,0.08)" />
        </pattern>

        {/* Noise grain */}
        <filter id="noise-grain" x="0%" y="0%" width="100%" height="100%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.9"
            numOctaves="3"
            seed="1"
            stitchTiles="stitch"
            result="grain"
          />
          <feColorMatrix
            in="grain"
            type="saturate"
            values="0"
            result="greyGrain"
          />
          <feBlend in="SourceGraphic" in2="greyGrain" mode="soft-light" />
        </filter>

        {/* Grid dot pattern for backgrounds */}
        <pattern
          id="grid-dots"
          width="16"
          height="16"
          patternUnits="userSpaceOnUse"
        >
          <circle cx="8" cy="8" r="0.5" fill="rgba(255,107,0,0.15)" />
        </pattern>
      </defs>
    </svg>
  );
}
