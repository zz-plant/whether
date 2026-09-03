/**
 * Deterministic SVG Vector Geometry generator for Whether Parametric Identicons.
 * Renders vector overlays for:
 *  - 'reportSeal': Holographic posture seal frame & verification check
 *  - 'signalVolatility': Macro signal volatility ring & indicator nodes
 *  - 'dataProvenance': KV snapshot matrix grid & hash stamp
 */

import React from "react";
import { type IdenticonParams, hslToCss } from "./hashEngine";
import type { ShaderMode } from "./shaderEngine";

interface SVGGeometryProps {
  params: IdenticonParams;
  size: number;
  useCase: ShaderMode;
}

export function SVGIdenticonGeometry({ params, size, useCase }: SVGGeometryProps) {
  const {
    symmetry,
    polygonSides,
    rotationDeg,
    hue1,
    hue2,
    hue3,
    saturation,
    lightness,
    shapeScale,
  } = params;

  const center = size / 2;
  const radius = (size / 2) * shapeScale * 0.85;

  const colorPrimary = hslToCss(hue1, saturation, lightness);
  const colorSecondary = hslToCss(hue2, saturation, lightness);
  const colorAccent = hslToCss(hue3, saturation, Math.min(lightness + 15, 90));
  const colorDark = hslToCss(hue1, saturation * 0.5, 12, 0.7);

  const getPolygonPoints = (r: number, sides: number, angleOffset: number = 0): string => {
    const pts: string[] = [];
    for (let i = 0; i < sides; i++) {
      const a = (i * 2 * Math.PI) / sides + (angleOffset * Math.PI) / 180;
      const x = center + r * Math.cos(a);
      const y = center + r * Math.sin(a);
      pts.push(`${x.toFixed(2)},${y.toFixed(2)}`);
    }
    return pts.join(" ");
  };

  const renderSymmetryPetals = () => {
    const petals = [];
    const petalRadius = radius * 0.45;
    for (let i = 0; i < symmetry; i++) {
      const angle = (i * 2 * Math.PI) / symmetry + (rotationDeg * Math.PI) / 180;
      const px = center + petalRadius * Math.cos(angle);
      const py = center + petalRadius * Math.sin(angle);

      petals.push(
        <circle
          key={`petal-c-${i}`}
          cx={px}
          cy={py}
          r={radius * 0.12}
          fill={i % 2 === 0 ? colorSecondary : colorAccent}
          fillOpacity={0.85}
          stroke={colorPrimary}
          strokeWidth={size * 0.012}
        />
      );

      petals.push(
        <line
          key={`spoke-${i}`}
          x1={center}
          y1={center}
          x2={px}
          y2={py}
          stroke={colorAccent}
          strokeWidth={size * 0.015}
          strokeDasharray={i % 2 === 0 ? "none" : `${size * 0.02},${size * 0.02}`}
          strokeOpacity={0.7}
        />
      );
    }
    return petals;
  };

  const renderUseCaseOverlay = () => {
    switch (useCase) {
      case "reportSeal": {
        // Weekly Report Posture Seal Badge
        const sealWidth = radius * 1.35;
        const sealHeight = radius * 1.45;
        const top = center - sealHeight * 0.5;
        const bot = center + sealHeight * 0.5;
        const left = center - sealWidth * 0.5;
        const right = center + sealWidth * 0.5;

        const pathD = `
          M ${left} ${top}
          L ${right} ${top}
          L ${right} ${center}
          C ${right} ${bot * 0.85}, ${center} ${bot}, ${center} ${bot}
          C ${center} ${bot}, ${left} ${bot * 0.85}, ${left} ${center}
          Z
        `;
        return (
          <g>
            <path
              d={pathD}
              fill="none"
              stroke={colorAccent}
              strokeWidth={size * 0.025}
              strokeLinejoin="round"
              filter="drop-shadow(0px 2px 6px rgba(0,0,0,0.5))"
            />
            {/* Stamp Checkmark Icon */}
            <path
              d={`M ${center - radius * 0.25} ${center} L ${center - radius * 0.05} ${center + radius * 0.18} L ${center + radius * 0.28} ${center - radius * 0.2}`}
              fill="none"
              stroke="#ffffff"
              strokeWidth={size * 0.035}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        );
      }

      case "dataProvenance": {
        // Cryptographic KV Data Snapshot Matrix Grid
        const gridCells = [];
        const count = 4;
        const step = (radius * 1.3) / count;
        const startX = center - (step * count) / 2;
        const startY = center - (step * count) / 2;

        for (let r = 0; r < count; r++) {
          for (let c = 0; c < count; c++) {
            const index = r * count + c;
            const bit = (params.hashHex.charCodeAt(index % params.hashHex.length) % 2) === 1;
            if (bit) {
              gridCells.push(
                <rect
                  key={`cell-${r}-${c}`}
                  x={startX + c * step + step * 0.1}
                  y={startY + r * step + step * 0.1}
                  width={step * 0.8}
                  height={step * 0.8}
                  rx={size * 0.01}
                  fill={r % 2 === c % 2 ? colorPrimary : colorAccent}
                  fillOpacity={0.8}
                />
              );
            }
          }
        }
        return <g>{gridCells}</g>;
      }

      case "signalVolatility":
      default: {
        // Macro Signal Volatility & Regime Ring
        return (
          <g>
            <circle
              cx={center}
              cy={center}
              r={radius * 0.75}
              fill="none"
              stroke={colorAccent}
              strokeWidth={size * 0.02}
              strokeDasharray={`${size * 0.04},${size * 0.02}`}
            />
            <circle
              cx={center}
              cy={center}
              r={radius * 0.22}
              fill={colorAccent}
              filter="drop-shadow(0px 0px 8px rgba(255,255,255,0.8))"
            />
          </g>
        );
      }
    }
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="pointer-events-none absolute inset-0 z-10 block"
      aria-hidden="true"
    >
      <defs>
        <filter id={`glow-${params.seed}`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation={size * 0.03} result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Main Base Polygon Frame */}
      <polygon
        points={getPolygonPoints(radius, polygonSides, rotationDeg)}
        fill="none"
        stroke={colorPrimary}
        strokeWidth={size * 0.02}
        strokeOpacity={0.9}
      />

      {/* Radial Symmetry Elements */}
      {renderSymmetryPetals()}

      {/* Use Case Overlay */}
      {renderUseCaseOverlay()}

      {/* Center Core Dot */}
      <circle
        cx={center}
        cy={center}
        r={radius * 0.12}
        fill="#ffffff"
        stroke={colorDark}
        strokeWidth={size * 0.01}
      />
    </svg>
  );
}
