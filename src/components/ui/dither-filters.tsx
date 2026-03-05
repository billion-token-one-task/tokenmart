/**
 * SVG Dither & Halftone Filters — Signal & Noise Design System
 *
 * Trust-tier-aware filters where noise density maps to trust level.
 * Mount once in root layout, reference via CSS `filter: url(#filter-id)`.
 *
 * Filters:
 * - #dither-tier-0 through #dither-tier-3  Trust-aware dithering
 * - #dither-fine       Fine texture (backward compat)
 * - #dither-coarse     Coarse halftone (backward compat)
 * - #halftone          Classic halftone dots
 * - #noise-grain       Film grain texture
 * - #scanlines         CRT scan-line overlay
 */
export function DitherFilters() {
  return (
    <svg
      className="absolute w-0 h-0 overflow-hidden"
      aria-hidden="true"
      data-agent-role="visual-filters"
    >
      <defs>
        {/* ── Trust Tier 0: Heavy noise (Spore) ── */}
        <filter id="dither-tier-0" x="0%" y="0%" width="100%" height="100%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.8"
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

        {/* ── Trust Tier 1: Medium noise (Cell) ── */}
        <filter id="dither-tier-1" x="0%" y="0%" width="100%" height="100%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.55"
            numOctaves="3"
            seed="5"
            result="noise"
          />
          <feComponentTransfer in="noise" result="threshold">
            <feFuncR type="discrete" tableValues="0 0.4 0.7 1" />
            <feFuncG type="discrete" tableValues="0 0.4 0.7 1" />
            <feFuncB type="discrete" tableValues="0 0.4 0.7 1" />
          </feComponentTransfer>
          <feBlend in="SourceGraphic" in2="threshold" mode="multiply" />
        </filter>

        {/* ── Trust Tier 2: Light noise (Colony) ── */}
        <filter id="dither-tier-2" x="0%" y="0%" width="100%" height="100%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.35"
            numOctaves="2"
            seed="8"
            result="noise"
          />
          <feComponentTransfer in="noise" result="threshold">
            <feFuncR type="discrete" tableValues="0 0.3 0.6 0.8 1" />
            <feFuncG type="discrete" tableValues="0 0.3 0.6 0.8 1" />
            <feFuncB type="discrete" tableValues="0 0.3 0.6 0.8 1" />
          </feComponentTransfer>
          <feBlend in="SourceGraphic" in2="threshold" mode="soft-light" />
        </filter>

        {/* ── Trust Tier 3: Near-clean (Organism) ── */}
        <filter id="dither-tier-3" x="0%" y="0%" width="100%" height="100%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.15"
            numOctaves="1"
            seed="12"
            result="noise"
          />
          <feColorMatrix in="noise" type="saturate" values="0" result="grey" />
          <feBlend in="SourceGraphic" in2="grey" mode="soft-light" />
        </filter>

        {/* ── Backward compat: Fine dithering ── */}
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

        {/* ── Backward compat: Coarse halftone ── */}
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

        {/* ── Classic halftone pattern ── */}
        <filter id="halftone" x="0%" y="0%" width="100%" height="100%">
          <feTurbulence
            type="turbulence"
            baseFrequency="1.5"
            numOctaves="1"
            seed="3"
            result="turb"
          />
          <feColorMatrix in="turb" type="saturate" values="0" result="grey" />
          <feComponentTransfer in="grey" result="dots">
            <feFuncR type="discrete" tableValues="0 0 1 1" />
            <feFuncG type="discrete" tableValues="0 0 1 1" />
            <feFuncB type="discrete" tableValues="0 0 1 1" />
          </feComponentTransfer>
          <feBlend in="SourceGraphic" in2="dots" mode="multiply" />
        </filter>

        {/* ── Scan-line pattern ── */}
        <pattern
          id="scanline-pattern"
          width="1"
          height="4"
          patternUnits="userSpaceOnUse"
        >
          <rect width="1" height="2" fill="rgba(0,0,0,0)" />
          <rect y="2" width="1" height="2" fill="rgba(0,0,0,0.06)" />
        </pattern>

        {/* ── Noise grain ── */}
        <filter id="noise-grain" x="0%" y="0%" width="100%" height="100%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.9"
            numOctaves="3"
            seed="1"
            stitchTiles="stitch"
            result="grain"
          />
          <feColorMatrix in="grain" type="saturate" values="0" result="greyGrain" />
          <feBlend in="SourceGraphic" in2="greyGrain" mode="soft-light" />
        </filter>

        {/* ── Grid dot pattern (neutral) ── */}
        <pattern
          id="grid-dots"
          width="16"
          height="16"
          patternUnits="userSpaceOnUse"
        >
          <circle cx="8" cy="8" r="0.5" fill="rgba(255,255,255,0.06)" />
        </pattern>
      </defs>
    </svg>
  );
}
