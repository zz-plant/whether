import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { brotliDecompressSync } from "node:zlib";
import { describe, it } from "bun:test";

/*
 * The font files, read as files (ui-ux-standards §XXII).
 *
 * Until 2026-10-07 the faces were Fontsource's generic Latin subset: Archivo drew
 * ↑ and ↓ but not →, so the trend set was drawn by two typefaces, every "→" in a
 * link came from the reader's OS, and the share cards printed "->". The files are
 * subset to the site's text now (app/styles/fonts.css records the build). What
 * this holds: each face carries the symbols the copy sets in it, the stylesheet
 * routes them to it, and a file's name changes with its bytes, because
 * public/sw.js serves /fonts/ cache-first as immutable.
 */

const FONT_DIR = "public/fonts";

/** A WOFF2 or TrueType number in the 7-bit continuation encoding WOFF2's table directory uses. */
const readUIntBase128 = (bytes: Uint8Array, start: number) => {
  let value = 0;
  for (let offset = start; offset < start + 5; offset += 1) {
    value = value * 128 + (bytes[offset] & 0x7f);
    if ((bytes[offset] & 0x80) === 0) return { value, next: offset + 1 };
  }
  throw new Error("UIntBase128 runs past five bytes");
};

/*
 * A WOFF2 file is a table directory and one Brotli stream holding the tables back
 * to back. `cmap` is known tag 0 and is never transformed, so it is the bytes at
 * the sum of the lengths before it. glyf (10) and loca (11) are transformed at
 * version 0; every other table is transformed at any version but 0.
 */
const cmapOfWoff2 = (file: Buffer): DataView => {
  const header = new DataView(file.buffer, file.byteOffset, file.byteLength);
  const tableCount = header.getUint16(12);
  const compressedLength = header.getUint32(20);
  let offset = 48;
  let cmapStart = -1;
  let cmapLength = 0;
  let streamOffset = 0;
  for (let index = 0; index < tableCount; index += 1) {
    const flags = file[offset];
    offset += 1;
    const tagIndex = flags & 0x3f;
    const version = flags >> 6;
    if (tagIndex === 63) offset += 4;
    const original = readUIntBase128(file, offset);
    offset = original.next;
    let length = original.value;
    if (tagIndex === 10 || tagIndex === 11 ? version === 0 : version !== 0) {
      const transformed = readUIntBase128(file, offset);
      offset = transformed.next;
      length = transformed.value;
    }
    if (tagIndex === 0) {
      cmapStart = streamOffset;
      cmapLength = length;
    }
    streamOffset += length;
  }
  assert.ok(cmapStart >= 0, "the file has a cmap");
  const stream = brotliDecompressSync(file.subarray(offset, offset + compressedLength));
  return new DataView(stream.buffer, stream.byteOffset + cmapStart, cmapLength);
};

const cmapOfTrueType = (file: Buffer): DataView => {
  const view = new DataView(file.buffer, file.byteOffset, file.byteLength);
  for (let index = 0; index < view.getUint16(4); index += 1) {
    const record = 12 + index * 16;
    if (file.toString("latin1", record, record + 4) === "cmap") {
      return new DataView(file.buffer, file.byteOffset + view.getUint32(record + 8), view.getUint32(record + 12));
    }
  }
  throw new Error("the file has no cmap");
};

/** Whether a Unicode cmap (format 4 or 12) maps the character to a glyph other than .notdef. */
const drawsCharacter = (cmap: DataView, character: string): boolean => {
  const codepoint = character.codePointAt(0) ?? 0;
  for (let index = 0; index < cmap.getUint16(2); index += 1) {
    const platform = cmap.getUint16(4 + index * 8);
    const encoding = cmap.getUint16(6 + index * 8);
    if (platform !== 0 && !(platform === 3 && (encoding === 1 || encoding === 10))) continue;
    const at = cmap.getUint32(8 + index * 8);
    const format = cmap.getUint16(at);
    if (format === 12) {
      for (let group = 0; group < cmap.getUint32(at + 12); group += 1) {
        const record = at + 16 + group * 12;
        if (codepoint >= cmap.getUint32(record) && codepoint <= cmap.getUint32(record + 4)) return true;
      }
    }
    if (format === 4 && codepoint <= 0xffff) {
      const segmentBytes = cmap.getUint16(at + 6);
      const ends = at + 14;
      const starts = ends + segmentBytes + 2;
      const deltas = starts + segmentBytes;
      const rangeOffsets = deltas + segmentBytes;
      for (let segment = 0; segment < segmentBytes; segment += 2) {
        const start = cmap.getUint16(starts + segment);
        if (codepoint < start || codepoint > cmap.getUint16(ends + segment)) continue;
        const rangeOffset = cmap.getUint16(rangeOffsets + segment);
        const glyph = rangeOffset === 0
          ? (codepoint + cmap.getUint16(deltas + segment)) & 0xffff
          : cmap.getUint16(rangeOffsets + segment + rangeOffset + 2 * (codepoint - start));
        if (glyph !== 0) return true;
      }
    }
  }
  return false;
};

const css = readFileSync("app/styles/fonts.css", "utf8");

/** Each @font-face's file and the characters its unicode-range sends to it. */
const fontFaces = [...css.matchAll(/@font-face\s*\{([^}]*)\}/g)].map(([, block]) => ({
  family: /font-family:\s*"([^"]+)"/.exec(block)?.[1] ?? "",
  file: /url\("\/fonts\/([^"]+)"\)/.exec(block)?.[1] ?? "",
  routes: (character: string) => {
    const codepoint = character.codePointAt(0) ?? 0;
    return (/unicode-range:\s*([^;]+);/.exec(block)?.[1] ?? "").split(",").some((range) => {
      const [low, high = low] = range.trim().replace(/^U\+/i, "").split("-");
      return codepoint >= Number.parseInt(low, 16) && codepoint <= Number.parseInt(high, 16);
    });
  },
}));

/** The local, metric-matched faces drawn while Archivo is in flight. */
const FALLBACK = "Archivo Fallback";

const face = (family: string) => {
  const found = fontFaces.find((candidate) => candidate.family === family);
  assert.ok(found, `fonts.css declares ${family}`);
  return found;
};

/* The symbols the copy sets: the trend set, the comparisons, the change and the minus. */
const SANS_SYMBOLS = ["→", "←", "↑", "↓", "≤", "≥", "≈", "≠", "Δ", "‰", "−"];
/* Chivo Mono draws no arrows; --font-mono falls back to Archivo for them. */
const MONO_SYMBOLS = ["≤", "≥", "≈", "≠", "Δ", "‰", "−"];

describe("the web fonts", () => {
  it("are named by their bytes, since the service worker never refetches a /fonts/ URL", () => {
    const files = readdirSync(FONT_DIR).filter((name) => name.endsWith(".woff2"));
    assert.ok(files.length >= 2);
    for (const name of files) {
      const digest = createHash("sha256").update(readFileSync(join(FONT_DIR, name))).digest("hex");
      assert.match(name, new RegExp(`\\.${digest.slice(0, 8)}\\.woff2$`), `${name} is not named by its SHA-256`);
    }
  });

  it("are the files the stylesheet and the preload ask for", () => {
    for (const { family, file } of fontFaces.filter((candidate) => candidate.family !== FALLBACK)) {
      assert.ok(file && existsSync(join(FONT_DIR, file)), `${family}: ${file}`);
    }
    const preload = /<link rel="preload" href="\/fonts\/([^"]+)"/.exec(readFileSync("app/layout.tsx", "utf8"))?.[1];
    assert.equal(preload, face("Archivo").file, "the preload is the Archivo file the stylesheet loads");
  });

  it("draw the symbols the copy sets, and the stylesheet sends those symbols to them", () => {
    for (const [family, symbols] of [["Archivo", SANS_SYMBOLS], ["Chivo Mono", MONO_SYMBOLS]] as const) {
      const { file, routes } = face(family);
      const cmap = cmapOfWoff2(readFileSync(join(FONT_DIR, file)));
      for (const symbol of symbols) {
        assert.ok(drawsCharacter(cmap, symbol), `${family} draws ${symbol}`);
        assert.ok(routes(symbol), `${family}'s unicode-range includes ${symbol}`);
      }
    }
    assert.match(readFileSync("app/styles/tokens.css", "utf8"), /--font-mono:\s*"Chivo Mono",\s*"Archivo"/);
  });

  /* Until 2026-10-07 a first visit drew system-ui until Archivo arrived, and on a 430px
     phone the swap reflowed the home page's decision chips (ui-ux-standards §XXII). */
  it("stand in for Archivo on a first visit with local faces sized to it, the display width included", () => {
    const tokens = readFileSync("app/styles/tokens.css", "utf8");
    const fallbacks = [...css.matchAll(/@font-face\s*\{([^}]*)\}/g)]
      .map(([, block]) => block)
      .filter((block) => block.includes(`font-family: "${FALLBACK}"`));
    assert.equal(fallbacks.length, 2);
    for (const block of fallbacks) {
      assert.doesNotMatch(block, /url\(/, "a stand-in is a face the reader already has, never a download");
      assert.match(block, /src:\s*local\("Arial/);
      for (const descriptor of ["size-adjust", "ascent-override", "descent-override", "line-gap-override"]) {
        assert.match(block, new RegExp(`${descriptor}:\\s*[\\d.]+%;`), `${descriptor} is set`);
      }
    }
    const displayStretch = /--font-stretch-display:\s*([\d.]+%)/.exec(tokens)?.[1];
    assert.ok(displayStretch);
    assert.ok(fallbacks.some((block) => block.includes(`font-stretch: ${displayStretch};`)), "the display voice has its own stand-in");
    assert.match(tokens, /--font-sans:\s*"Archivo",\s*"Archivo Fallback",\s*system-ui/);
  });
});

describe("the share cards' fonts", () => {
  /* Static instances of the same Archivo (scripts/generate-og-fonts.mjs). Satori
     reads these, and lib/image/ogFonts.ts no longer rewrites the arrow. */
  it("draw the arrow and the comparisons", () => {
    const files = readdirSync(join(FONT_DIR, "og")).filter((name) => name.endsWith(".ttf"));
    assert.equal(files.length, 4);
    for (const name of files) {
      const cmap = cmapOfTrueType(readFileSync(join(FONT_DIR, "og", name)));
      for (const symbol of ["→", "≤", "≥"]) assert.ok(drawsCharacter(cmap, symbol), `${name} draws ${symbol}`);
    }
  });
});
