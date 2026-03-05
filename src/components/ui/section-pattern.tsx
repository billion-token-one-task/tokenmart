"use client";

import { AsciiArt } from "@/components/ui/ascii-art";
import {
  ART_GRADIENTS,
  LIGHTNING,
  MOUNTAIN_SMALL,
  NETWORK,
  PORTAL,
  TOWER,
} from "@/lib/ascii-art";
import { ASCII_PATTERN_ART } from "@/lib/ascii-patterns";
import {
  getSectionById,
  getSectionPattern,
  type ShellPatternRecipeId,
  type ShellSectionId,
} from "@/lib/ui-shell";

interface SectionPatternProps {
  section: ShellSectionId;
  recipe?: ShellPatternRecipeId;
  className?: string;
  opacity?: number;
}

const alignClasses = {
  center: "inset-0 flex items-center justify-center",
  "top-right": "top-0 right-0",
  "top-left": "top-0 left-0",
  "bottom-right": "bottom-0 right-0",
  "bottom-left": "bottom-0 left-0",
} as const;

const LEGACY_PATTERN_ART = {
  MOUNTAIN_SMALL,
  LIGHTNING,
  NETWORK,
  TOWER,
  PORTAL,
} as const;

export function SectionPattern({
  section,
  recipe,
  className = "",
  opacity = 1,
}: SectionPatternProps) {
  const config = getSectionById(section);
  const pattern = getSectionPattern(section, recipe);

  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden="true">
      {pattern.layers.map((layer, index) => {
        const art = ASCII_PATTERN_ART[layer.art as keyof typeof ASCII_PATTERN_ART]
          ?? LEGACY_PATTERN_ART[layer.art as keyof typeof LEGACY_PATTERN_ART]
          ?? [];
        const size =
          layer.density === "coarse" ? "lg" : layer.density === "medium" ? "md" : "sm";
        const gradient =
          ART_GRADIENTS[layer.art] ??
          ({
            from: config.accentRamp.base,
            to: config.accentRamp.light,
          } as const);

        return (
          <div
            key={`${pattern.kind}-${layer.art}-${index}`}
            className={`absolute ${alignClasses[layer.align ?? "top-right"]} ${layer.className ?? ""}`}
            style={{ opacity: layer.opacity * opacity }}
          >
            <AsciiArt
              lines={art}
              gradient={gradient}
              size={size}
              pixelFont={config.pixelFont}
              opacity={1}
            />
          </div>
        );
      })}
    </div>
  );
}
