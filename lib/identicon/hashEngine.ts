/**
 * Deterministic hash engine for Parametric Identicons (SVG + Shader).
 * Converts any string seed (wallet address, commit SHA, agent ID, IBAN, tenant UUID)
 * into structured visual parameters for SVG geometry & WebGL fragment shaders.
 */

export interface IdenticonParams {
  seed: string;
  hashHex: string;
  // Colors (HSL)
  hue1: number; // 0..360
  hue2: number; // 0..360
  hue3: number; // 0..360
  saturation: number; // 60..95%
  lightness: number; // 45..75%
  // Geometry parameters
  symmetry: number; // 3, 4, 5, 6, 8
  gridSize: number; // 4, 5, 6
  polygonSides: number; // 3, 4, 5, 6, 8
  innerRingCount: number; // 1..4
  rotationDeg: number; // 0..360
  shapeScale: number; // 0.6..0.95
  // Shader parameters
  shaderSpeed: number; // 0.2..2.0
  noiseFrequency: number; // 1.0..8.0
  distortionAmount: number; // 0.1..0.8
  shaderUniforms: [number, number, number, number]; // 4 normalized floats for WebGL GLSL
}

/**
 * 32-bit FNV-1a hash algorithm
 */
function fnv1a(str: string, seedOffset = 0x811c9dc5): number {
  let hash = seedOffset;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * Convert string to a deterministic byte array of length 16
 */
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

/**
 * Derive full identicon parameters from any seed string.
 */
export function deriveIdenticonParams(seed: string): IdenticonParams {
  const cleanSeed = seed.trim().toLowerCase() || "default-identicon-seed";
  const bytes = seedToBytes(cleanSeed);

  // Hash hex representation for debugging & displays
  const hashHex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Primary HSL color hues
  const hue1 = (bytes[0] * 360) / 255;
  const hue2 = (hue1 + 45 + ((bytes[1] * 180) / 255)) % 360;
  const hue3 = (hue1 + 180 + ((bytes[2] * 90) / 255)) % 360;
  const saturation = 65 + (bytes[3] % 30); // 65% - 95%
  const lightness = 50 + (bytes[4] % 25); // 50% - 75%

  // Geometry
  const symmetryOptions = [3, 4, 5, 6, 8];
  const symmetry = symmetryOptions[bytes[5] % symmetryOptions.length];

  const gridSizeOptions = [4, 5, 6];
  const gridSize = gridSizeOptions[bytes[6] % gridSizeOptions.length];

  const polygonOptions = [3, 4, 5, 6, 8];
  const polygonSides = polygonOptions[bytes[7] % polygonOptions.length];

  const innerRingCount = 1 + (bytes[8] % 4);
  const rotationDeg = Math.round((bytes[9] * 360) / 255);
  const shapeScale = 0.65 + (bytes[10] / 255) * 0.28;

  // Shader attributes
  const shaderSpeed = 0.3 + (bytes[11] / 255) * 1.5;
  const noiseFrequency = 1.5 + (bytes[12] / 255) * 5.0;
  const distortionAmount = 0.15 + (bytes[13] / 255) * 0.65;

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
    saturation,
    lightness,
    symmetry,
    gridSize,
    polygonSides,
    innerRingCount,
    rotationDeg,
    shapeScale,
    shaderSpeed,
    noiseFrequency,
    distortionAmount,
    shaderUniforms,
  };
}

/**
 * Utility to convert HSL to CSS string
 */
export function hslToCss(h: number, s: number, l: number, a = 1): string {
  return `hsla(${Math.round(h)}, ${Math.round(s)}%, ${Math.round(l)}%, ${a})`;
}
