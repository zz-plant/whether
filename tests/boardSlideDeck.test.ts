import assert from "node:assert/strict";
import { crc32 } from "node:zlib";
import { describe, it } from "bun:test";
import {
  boardSlideFileName,
  buildBoardSlidePdf,
  buildBoardSlidePptx,
  isBoardSlideFormat,
} from "../lib/export/boardSlideDeck";
import type { MeetingSlidePayload } from "../lib/export/meetingSlideExport";

const payload: MeetingSlidePayload = {
  recordDate: "Sep 16, 2026",
  recordDateIso: "2026-09-16",
  regime: "SCARCITY",
  stageLabel: "Series A",
  actionNow: "Freeze non-revenue hires & put every commitment behind a second signoff.",
  pauseIf: "Cash gate: hold every new commitment <whatever> the macro corridor says.",
  callChangesIf: "Funding pressure at or below 70 (83 today) changes the call.",
  resumeWhen: "Reverse the freeze only after runway extends past nine months → then re-open.",
  tightness: 83,
  riskAppetite: 40,
  confidence: "HIGH",
  provenance: "U.S. Treasury",
  isFallback: true,
};

/**
 * A reader for the package, from the end-of-central-directory record back —
 * the way any unzip opens it — so the test checks what a consumer would find
 * rather than what the writer believes it wrote.
 */
const readStoredZip = (bytes: Uint8Array) => {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const decoder = new TextDecoder();
  const eocd = bytes.length - 22;
  assert.equal(view.getUint32(eocd, true), 0x06054b50, "ends with an end-of-central-directory record");
  const count = view.getUint16(eocd + 10, true);
  let cursor = view.getUint32(eocd + 16, true);
  const entries = new Map<string, { content: string; crc: number; bytes: Uint8Array }>();
  for (let index = 0; index < count; index += 1) {
    assert.equal(view.getUint32(cursor, true), 0x02014b50, "central directory record");
    const crc = view.getUint32(cursor + 16, true);
    const size = view.getUint32(cursor + 24, true);
    const nameLength = view.getUint16(cursor + 28, true);
    const localOffset = view.getUint32(cursor + 42, true);
    const name = decoder.decode(bytes.subarray(cursor + 46, cursor + 46 + nameLength));
    assert.equal(view.getUint32(localOffset, true), 0x04034b50, `local header for ${name}`);
    assert.equal(view.getUint16(localOffset + 8, true), 0, `${name} is stored, not compressed`);
    const localNameLength = view.getUint16(localOffset + 26, true);
    const dataStart = localOffset + 30 + localNameLength;
    const data = bytes.subarray(dataStart, dataStart + size);
    entries.set(name, { content: decoder.decode(data), crc, bytes: data });
    cursor += 46 + nameLength;
  }
  return entries;
};

describe("board slide PPTX", () => {
  it("is a stored ZIP whose every entry's CRC matches its bytes", () => {
    const entries = readStoredZip(buildBoardSlidePptx(payload));
    assert.ok(entries.size >= 12);
    for (const [name, entry] of entries) {
      assert.equal(entry.crc, crc32(entry.bytes), `CRC of ${name}`);
    }
  });

  it("carries the parts PowerPoint needs, wired to each other", () => {
    const entries = readStoredZip(buildBoardSlidePptx(payload));
    const part = (name: string) => {
      const entry = entries.get(name);
      assert.ok(entry, `package has ${name}`);
      return entry.content;
    };
    // Content types first, as every OOXML writer orders it.
    assert.equal([...entries.keys()][0], "[Content_Types].xml");
    assert.match(part("[Content_Types].xml"), /PartName="\/ppt\/slides\/slide1\.xml"/);
    assert.match(part("_rels/.rels"), /Target="ppt\/presentation\.xml"/);
    assert.match(part("ppt/_rels/presentation.xml.rels"), /Target="slides\/slide1\.xml"/);
    assert.match(part("ppt/presentation.xml"), /<p:sldSz cx="12192000" cy="6858000"\/>/);
    assert.match(part("ppt/slideMasters/_rels/slideMaster1.xml.rels"), /slideLayout1\.xml/);
    assert.match(part("ppt/slides/_rels/slide1.xml.rels"), /slideLayout1\.xml/);
    assert.ok(entries.has("ppt/theme/theme1.xml"));
    assert.ok(entries.has("docProps/core.xml"));
    assert.ok(entries.has("docProps/app.xml"));
  });

  it("puts the three cards, the badge and the stamp on the slide with markup escaped", () => {
    const slide = readStoredZip(buildBoardSlidePptx(payload)).get("ppt/slides/slide1.xml")?.content ?? "";
    assert.match(slide, /1\. ACTION NOW/);
    assert.match(slide, /2\. PAUSE IF/);
    assert.match(slide, /3\. CALL CHANGES IF/);
    assert.match(slide, /Funding pressure at or below 70/);
    // The stage's resume line sits beside the call-change line, never in its card.
    assert.match(slide, /Resume when: Reverse the freeze only after runway extends/);
    assert.match(slide, /This week's call \(Series A\)/);
    assert.match(slide, /<a:t>Freezing<\/a:t>/);
    assert.doesNotMatch(slide, /SCARCITY/);
    assert.match(slide, /Freeze non-revenue hires &amp; put every commitment/);
    assert.match(slide, /hold every new commitment &lt;whatever&gt; the macro corridor/);
    assert.match(slide, /cached snapshot, not a live read/);
    assert.doesNotMatch(slide, /<whatever>/);
    // A defensive regime wears the rose badge; an easing one the emerald.
    assert.match(slide, /F43F5E/);
    const easing = readStoredZip(buildBoardSlidePptx({ ...payload, regime: "EXPANSION" })).get("ppt/slides/slide1.xml")?.content ?? "";
    assert.doesNotMatch(easing, /F43F5E/);
  });

  it("is byte-identical for the same week", () => {
    assert.deepEqual(buildBoardSlidePptx(payload), buildBoardSlidePptx({ ...payload }));
    const core = readStoredZip(buildBoardSlidePptx(payload)).get("docProps/core.xml")?.content ?? "";
    assert.match(core, /2026-09-16T12:00:00Z/);
  });
});

describe("board slide PDF", () => {
  it("is a one-page 16:9 document carrying the call, with unencodable characters mapped", async () => {
    const bytes = await buildBoardSlidePdf(payload);
    const text = new TextDecoder("latin1").decode(bytes);
    assert.match(text, /^%PDF-1\./);
    assert.match(text.trimEnd(), /%%EOF$/);
    assert.match(text, /\/MediaBox \[ ?0 0 960 540 ?\]/);
    assert.equal((text.match(/\/Type \/Page(?![s])/g) ?? []).length, 1);
    // The metadata sits in a compressed object stream, so read it back through
    // the library rather than grepping the bytes.
    const { PDFDocument } = await import("@cantoo/pdf-lib");
    const reloaded = await PDFDocument.load(bytes);
    assert.equal(reloaded.getTitle(), "Whether weekly operating call — Sep 16, 2026");
    assert.equal(reloaded.getPageCount(), 1);
  });
});

describe("board slide route helpers", () => {
  it("names the file by ISO week and format, and refuses an unknown format", () => {
    assert.equal(boardSlideFileName(payload, "pptx"), "whether-board-slide-2026-09-16.pptx");
    assert.equal(boardSlideFileName(payload, "pdf"), "whether-board-slide-2026-09-16.pdf");
    // A payload with only the label never puts a comma and a space in a filename.
    assert.equal(boardSlideFileName({ ...payload, recordDateIso: undefined }, "pdf"), "whether-board-slide-current.pdf");
    assert.equal(isBoardSlideFormat("pptx"), true);
    assert.equal(isBoardSlideFormat("pdf"), true);
    assert.equal(isBoardSlideFormat("svg"), false);
    assert.equal(isBoardSlideFormat(null), false);
  });
});
