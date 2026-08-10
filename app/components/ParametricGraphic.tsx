"use client";

import React, { useEffect, useState } from "react";
import { deriveVisualTokenMatrix, type VisualTokenMatrix } from "../../lib/graphics/generatorEngine";
import { SVGIdenticonGeometry } from "../../lib/identicon/svgGeometry";
import { SVGFilterShader } from "../../lib/graphics/svgFilterEngine";
import { ParametricIdenticon } from "./ParametricIdenticon";
import type { ShaderMode } from "../../lib/identicon/shaderEngine";

export interface ParametricGraphicProps {
  seed: string;
  mode?: ShaderMode;
  size?: number;
  stateValue?: number;
  renderingTier?: "auto" | "svg" | "filter" | "webgl";
  interactive?: boolean;
  className?: string;
  title?: string;
}

export function ParametricGraphic({
  seed,
  mode = "reportSeal",
  size = 128,
  stateValue = 0.5,
  renderingTier = "auto",
  interactive = true,
  className = "",
  title,
}: ParametricGraphicProps) {
  const [matrix, setMatrix] = useState<VisualTokenMatrix>(() => deriveVisualTokenMatrix(seed, stateValue));
  const filterId = `whether-filter-${seed.replace(/[^a-zA-Z0-9]/g, "-")}-${mode}`;

  useEffect(() => {
    setMatrix(deriveVisualTokenMatrix(seed, stateValue));
  }, [seed, stateValue]);

  // If explicit SVG tier is selected, render vector + SVG filter pipeline
  if (renderingTier === "svg" || renderingTier === "filter") {
    return (
      <div
        className={`relative flex items-center justify-center overflow-hidden rounded-2xl bg-slate-950/80 shadow-lg ring-1 ring-slate-800 transition-[transform,box-shadow] ${
          interactive ? "hover:scale-[1.03]" : ""
        } ${className}`}
        style={{ width: size, height: size }}
        title={title || `Graphic for ${seed}`}
      >
        <SVGFilterShader matrix={matrix} filterId={filterId} mode={renderingTier === "filter" ? "displacement" : "glow"} />
        <div style={{ filter: `url(#${filterId})` }} className="relative h-full w-full">
          <SVGIdenticonGeometry params={matrix} size={size} useCase={mode} />
        </div>
      </div>
    );
  }

  // Default WebGL / Auto Tier
  return (
    <ParametricIdenticon
      seed={seed}
      useCase={mode}
      size={size}
      stateValue={stateValue}
      interactive={interactive}
      className={className}
      title={title}
    />
  );
}
