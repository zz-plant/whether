"use client";

import type { RegimeKey } from "../../../lib/types";
import { getRegimePublicLabel } from "../../../lib/regimePresentation";
import { useState, useEffect } from "react";

export type RegimeGlyphProps = {
  idPrefix: string;
  regime: RegimeKey;
  className?: string;
};

type GlyphSpec = {
  color: string;
  /** [x1, y1, x2, y2] strokes above the shared horizon. */
  lines?: ReadonlyArray<readonly [number, number, number, number]>;
  points?: string;
  description: string;
};

/** One shape language: shared horizon at y=26, same weight and cap; only tilt and density vary. */
const GLYPHS: Record<RegimeKey, GlyphSpec> = {
  EXPANSION: {
    color: "var(--accent-success)",
    lines: [
      [6, 22, 11, 16],
      [13, 19, 18, 12],
      [20, 15, 25, 7],
    ],
    description: "Conditions loosening; room to invest.",
  },
  DEFENSIVE: {
    color: "var(--accent-warning)",
    lines: [
      [7, 20, 25, 20],
      [7, 15, 25, 15],
      [7, 10, 25, 10],
    ],
    description: "Conditions compressed; hold the line.",
  },
  SCARCITY: {
    color: "var(--accent-danger)",
    // Same full-width strokes as DEFENSIVE, but two instead of three and widely spaced:
    // scarcity reads as "fewer", not as a different shape language.
    lines: [
      [7, 20, 25, 20],
      [7, 10, 25, 10],
    ],
    description: "Conditions tight; capital is expensive.",
  },
  VOLATILE: {
    color: "var(--accent-info)",
    points: "4,20 9,10 14,22 19,8 24,18 28,12",
    description: "Conditions unstable; expect reversals.",
  },
};

export function RegimeGlyph({ idPrefix, regime, className }: RegimeGlyphProps) {
  const spec = GLYPHS[regime];
  const [opacity, setOpacity] = useState(1);

  // Fade the glyph in/out on regime change (350ms transition).
  useEffect(() => {
    setOpacity(0);
    const timer = setTimeout(() => setOpacity(1), 150);
    return () => clearTimeout(timer);
  }, [regime]);

  if (!spec) return null;

  return (
    <svg
      viewBox="0 0 32 32"
      width="100%"
      style={{ height: "auto", transition: "opacity 350ms ease" }}
      aria-labelledby={`${idPrefix}-title ${idPrefix}-desc`}
      className={className}
    >
      <title id={`${idPrefix}-title`}>{getRegimePublicLabel(regime)}</title>
      <desc id={`${idPrefix}-desc`}>{spec.description}</desc>

      <line
        x1={4}
        y1={26}
        x2={28}
        y2={26}
        stroke="var(--border-strong)"
        strokeWidth={2}
        strokeLinecap="round"
      />

      {spec.lines?.map(([x1, y1, x2, y2]) => (
        <line
          key={`${x1}-${y1}-${x2}-${y2}`}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke={spec.color}
          strokeWidth={2}
          strokeLinecap="round"
          fill="none"
          opacity={opacity}
        />
      ))}

      {spec.points ? (
        <polyline
          points={spec.points}
          stroke={spec.color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity={opacity}
        />
      ) : null}
    </svg>
  );
}
