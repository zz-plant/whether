/**
 * Generator Engine for Whether's Programmatic Visual Language.
 * Converts snapshot hashes, posture states, signal metrics, and regime quadrants
 * into normalized parameter vectors for SVG geometry, SVG filter shaders, and WebGL GLSL fragment shaders.
 */

import type { IdenticonParams } from "../identicon/hashEngine";

export interface VisualTokenMatrix extends IdenticonParams {
  huePrimary: number;
  hueSecondary: number;
  hueAccent: number;
  ringCount: number;
  strokeWidthRatio: number;
  scaleFactor: number;
  filterFrequency: number;
  displacementScale: number;
  glowRadius: number;
  noiseScale: number;
  volatilityIntensity: number;
  uniformVector: [number, number, number, number];
}

function fnv1a(str: string, seedOffset = 0x811c9dc5): number {
  let hash = seedOffset;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function seedToBytes(seed: string): Uint8Array {
  const bytes = new Uint8Array(16);
  let h1 = fnv1a(seed, 0x811c9dc5);
  let h2 = fnv1a(seed, 0x27d4eb2f);
  let h3 = fnv1a(seed, 0x5a9a4b3d);
  let h4 = fnv1a(seed, 0x1f9e2d3b);

  for (let i = 0; i < 4; i++) {
    bytes[i] = (h1 >> (i * 8)) & 0xff;
    bytes[i + 4] = (h2 >> (i * 8)) & 0xff;
    bytes[i + 8] = (h3 >> (i * 8)) & 0xff;
    bytes[i + 12] = (h4 >> (i * 8)) & 0xff;
  }
  return bytes;
}

export function deriveVisualTokenMatrix(
  seed: string,
  stateMetric: number = 0.5
): VisualTokenMatrix {
  const cleanSeed = seed.trim().toLowerCase() || "whether-default-seed";
  const bytes = seedToBytes(cleanSeed);

  const hashHex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const hue1 = (bytes[0] * 360) / 255;
  const hue2 = (hue1 + 45 + ((bytes[1] * 180) / 255)) % 360;
  const hue3 = (hue1 + 180 + ((bytes[2] * 90) / 255)) % 360;
  const saturation = 65 + (bytes[3] % 30);
  const lightness = 50 + (bytes[4] % 25);

  const symmetryOptions = [3, 4, 5, 6, 8];
  const symmetry = symmetryOptions[bytes[5] % symmetryOptions.length];

  const polygonOptions = [3, 4, 5, 6, 8];
  const polygonSides = polygonOptions[bytes[6] % polygonOptions.length];

  const innerRingCount = 1 + (bytes[7] % 4);
  const rotationDeg = Math.round((bytes[8] * 360) / 255);
  const strokeWidthRatio = 0.012 + (bytes[9] / 255) * 0.025;
  const shapeScale = 0.65 + (bytes[10] / 255) * 0.28;

  const filterFrequency = 0.015 + (bytes[11] / 255) * 0.055;
  const displacementScale = 3 + (bytes[12] / 255) * 12;
  const glowRadius = 2 + (bytes[13] / 255) * 6;

  const shaderSpeed = 0.3 + (bytes[14] / 255) * 1.8;
  const noiseFrequency = 1.5 + (bytes[15] / 255) * 5.0;
  const distortionAmount = 0.15 + (bytes[13] / 255) * 0.65;
  const volatilityIntensity = Math.max(0, Math.min(1, stateMetric));

  const shaderUniforms: [number, number, number, number] = [
    bytes[12] / 255,
    bytes[13] / 255,
    bytes[14] / 255,
    bytes[15] / 255,
  ];

  return {
    seed: cleanSeed,
    hashHex,
    hue1,
    hue2,
    hue3,
    huePrimary: hue1,
    hueSecondary: hue2,
    hueAccent: hue3,
    saturation,
    lightness,
    symmetry,
    gridSize: 4,
    polygonSides,
    innerRingCount,
    ringCount: innerRingCount,
    rotationDeg,
    strokeWidthRatio,
    shapeScale,
    scaleFactor: shapeScale,
    filterFrequency,
    displacementScale,
    glowRadius,
    shaderSpeed,
    noiseFrequency,
    noiseScale: noiseFrequency,
    distortionAmount,
    volatilityIntensity,
    shaderUniforms,
    uniformVector: shaderUniforms,
  };
}

export function hslToCss(h: number, s: number, l: number, a = 1): string {
  return `hsla(${Math.round(h)}, ${Math.round(s)}%, ${Math.round(l)}%, ${a})`;
}
