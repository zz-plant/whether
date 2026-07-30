/**
 * Declarative SVG Filter Shader Engine for Whether.
 * Generates browser-native inline SVG filter pipelines (<feTurbulence>, <feDisplacementMap>,
 * <feColorMatrix>, <feSpecularLighting>) for zero-canvas GPU-like visual distortion.
 */

import React from "react";
import type { VisualTokenMatrix } from "./generatorEngine";

export type SVGFilterMode = "displacement" | "glow" | "holographic";

interface SVGFilterProps {
  matrix: VisualTokenMatrix;
  filterId: string;
  mode?: SVGFilterMode;
}

export function SVGFilterShader({ matrix, filterId, mode = "displacement" }: SVGFilterProps) {
  const { filterFrequency, displacementScale, glowRadius, huePrimary, saturation, lightness } = matrix;

  switch (mode) {
    case "glow":
      return (
        <svg width="0" height="0" className="absolute h-0 w-0 overflow-hidden" aria-hidden="true">
          <filter id={filterId} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation={glowRadius} result="blur" />
            <feColorMatrix
              type="matrix"
              values="
                1 0 0 0 0
                0 1 0 0 0
                0 0 1 0 0
                0 0 0 18 -7
              "
              result="glowMatrix"
            />
            <feBlend in="SourceGraphic" in2="glowMatrix" mode="over" />
          </filter>
        </svg>
      );

    case "holographic":
      return (
        <svg width="0" height="0" className="absolute h-0 w-0 overflow-hidden" aria-hidden="true">
          <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency={filterFrequency * 1.5}
              numOctaves="3"
              result="noise"
            />
            <feSpecularLighting
              in="noise"
              surfaceScale="3"
              specularConstant="1.2"
              specularExponent="20"
              lightingColor={`hsl(${huePrimary}, ${saturation}%, ${lightness}%)`}
              result="specular"
            >
              <fePointLight x="50" y="50" z="100" />
            </feSpecularLighting>
            <feComposite in="SourceGraphic" in2="specular" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" />
          </filter>
        </svg>
      );

    case "displacement":
    default:
      return (
        <svg width="0" height="0" className="absolute h-0 w-0 overflow-hidden" aria-hidden="true">
          <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence
              type="turbulence"
              baseFrequency={filterFrequency}
              numOctaves="2"
              result="turbulence"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="turbulence"
              scale={displacementScale}
              xChannelSelector="R"
              yChannelSelector="G"
              result="displaced"
            />
            <feGaussianBlur in="displaced" stdDeviation="0.5" />
          </filter>
        </svg>
      );
  }
}
