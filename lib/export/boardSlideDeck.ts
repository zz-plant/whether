/**
 * The one-slide board deck as files: a native PPTX and a presentation-ready PDF.
 *
 * Both draw the same `MeetingSlidePayload` the SVG slide draws, at the same
 * 16:9 geometry, so the three formats cannot disagree about the week. The SVG
 * is for a designer's canvas; these are for the deck itself — a PPTX drops into
 * the board pack as an editable slide, the PDF as the page a director reads on
 * a phone.
 *
 * The PPTX is written by hand. A `.pptx` is a ZIP of XML parts, and the minimum
 * PowerPoint needs is a presentation, one master, one layout, one slide, a theme
 * and the two property parts — small enough that a dependency would be larger
 * than the writer. The ZIP stores its entries uncompressed, which the format
 * allows and every reader accepts; the whole file is under 20 KB.
 */
import type { MeetingSlidePayload } from "./meetingSlideExport";

// ---------------------------------------------------------------------------
// Geometry. The SVG slide is 1200×675; PowerPoint's 16:9 slide is 13.333×7.5in
// at 914400 EMU per inch, so one SVG pixel is exactly 10160 EMU. The PDF page
// is 960×540pt, so one pixel is 0.8pt. Every box below is stated in SVG pixels.
// ---------------------------------------------------------------------------

const SLIDE_WIDTH_PX = 1200;
const SLIDE_HEIGHT_PX = 675;
const EMU_PER_PX = 10160;
const PT_PER_PX = 0.8;

const CARD_X = 80;
const CARD_WIDTH = 1040;
const CARD_HEIGHT = 110;
const CARD_TOPS = [190, 320, 450] as const;

type SlideColors = {
  background: string;
  card: string;
  cardLine: string;
  ink: string;
  inkMuted: string;
  inkSoft: string;
  badge: string;
  accents: readonly [string, string, string];
};

const COLORS: SlideColors = {
  background: "0B1120",
  card: "1E293B",
  cardLine: "334155",
  ink: "FFFFFF",
  inkMuted: "CBD5E1",
  inkSoft: "64748B",
  badge: "10B981",
  accents: ["38BDF8", "F59E0B", "10B981"],
};

const isDefensiveRegime = (regime: string) => regime === "DEFENSIVE" || regime === "SCARCITY";

type SlideCard = {
  label: string;
  body: string;
  accent: string;
  top: number;
};

/** The three cards, in the order the SVG draws them. */
const buildCards = (payload: MeetingSlidePayload): SlideCard[] => [
  { label: "1. ACTION NOW", body: payload.actionNow, accent: COLORS.accents[0], top: CARD_TOPS[0] },
  { label: "2. PAUSE IF (GUARDRAIL)", body: payload.pauseIf, accent: COLORS.accents[1], top: CARD_TOPS[1] },
  {
    label: "3. CHANGE COURSE IF (REVERSAL TRIGGER)",
    body: payload.changeCourseIf,
    accent: COLORS.accents[2],
    top: CARD_TOPS[2],
  },
];

const footerLine = (payload: MeetingSlidePayload) =>
  `Funding pressure: ${payload.tightness.toFixed(0)}  ·  Risk appetite: ${payload.riskAppetite.toFixed(0)}  ·  Confidence: ${payload.confidence}${
    payload.isFallback ? "  ·  cached snapshot, not a live read" : ""
  }`;

const titleLine = (payload: MeetingSlidePayload) => `Monday Executive Stance (${payload.stageLabel})`;
const subtitleLine = (payload: MeetingSlidePayload) => `${payload.recordDate} · Source: ${payload.provenance}`;
const EYEBROW = "WHETHER · WEEKLY OPERATING CALL";

// ---------------------------------------------------------------------------
// PPTX
// ---------------------------------------------------------------------------

const escapeXml = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const emu = (px: number) => Math.round(px * EMU_PER_PX);
/** Font size in hundredths of a point, from the SVG's pixel size. */
const fontSize = (px: number) => Math.round(px * PT_PER_PX * 100);

const XML_HEADER = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
const NS_A = 'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"';
const NS_R = 'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
const NS_P = 'xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"';
const REL_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";

let shapeId = 1;
const nextShapeId = () => ++shapeId;

type TextRunStyle = {
  sizePx: number;
  bold?: boolean;
  color: string;
  tracking?: number;
};

const textRun = (text: string, style: TextRunStyle) =>
  `<a:r><a:rPr lang="en-US" sz="${fontSize(style.sizePx)}"${style.bold ? ' b="1"' : ""}${
    style.tracking ? ` spc="${style.tracking}"` : ""
  } dirty="0"><a:solidFill><a:srgbClr val="${style.color}"/></a:solidFill><a:latin typeface="Calibri"/></a:rPr><a:t>${escapeXml(text)}</a:t></a:r>`;

const textBox = ({
  name,
  x,
  y,
  width,
  height,
  text,
  style,
  align = "l",
  anchor = "t",
}: {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  style: TextRunStyle;
  align?: "l" | "ctr" | "r";
  anchor?: "t" | "ctr" | "b";
}) =>
  `<p:sp><p:nvSpPr><p:cNvPr id="${nextShapeId()}" name="${escapeXml(name)}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr>` +
  `<p:spPr><a:xfrm><a:off x="${emu(x)}" y="${emu(y)}"/><a:ext cx="${emu(width)}" cy="${emu(height)}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></p:spPr>` +
  `<p:txBody><a:bodyPr wrap="square" lIns="0" tIns="0" rIns="0" bIns="0" anchor="${anchor}"><a:normAutofit/></a:bodyPr><a:lstStyle/>` +
  `<a:p><a:pPr algn="${align}"/>${textRun(text, style)}</a:p></p:txBody></p:sp>`;

const rectangle = ({
  name,
  x,
  y,
  width,
  height,
  fill,
  line,
  rounded = false,
}: {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  line?: string;
  rounded?: boolean;
}) =>
  `<p:sp><p:nvSpPr><p:cNvPr id="${nextShapeId()}" name="${escapeXml(name)}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>` +
  `<p:spPr><a:xfrm><a:off x="${emu(x)}" y="${emu(y)}"/><a:ext cx="${emu(width)}" cy="${emu(height)}"/></a:xfrm>` +
  `<a:prstGeom prst="${rounded ? "roundRect" : "rect"}"><a:avLst/></a:prstGeom>` +
  `<a:solidFill><a:srgbClr val="${fill}"/></a:solidFill>` +
  (line ? `<a:ln w="9525"><a:solidFill><a:srgbClr val="${line}"/></a:solidFill></a:ln>` : "<a:ln><a:noFill/></a:ln>") +
  `</p:spPr><p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:endParaRPr lang="en-US"/></a:p></p:txBody></p:sp>`;

const EMPTY_SP_TREE_HEAD =
  '<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>' +
  '<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>';

const buildSlideXml = (payload: MeetingSlidePayload) => {
  shapeId = 1;
  const badgeColor = isDefensiveRegime(payload.regime) ? "F43F5E" : COLORS.badge;
  const shapes: string[] = [];

  shapes.push(
    textBox({ name: "Eyebrow", x: 80, y: 56, width: 780, height: 22, text: EYEBROW, style: { sizePx: 14, bold: true, color: "94A3B8", tracking: 150 } }),
    textBox({ name: "Title", x: 80, y: 82, width: 860, height: 44, text: titleLine(payload), style: { sizePx: 34, bold: true, color: COLORS.ink } }),
    textBox({ name: "Subtitle", x: 80, y: 130, width: 860, height: 24, text: subtitleLine(payload), style: { sizePx: 16, color: COLORS.inkSoft } }),
    rectangle({ name: "Regime badge", x: 960, y: 80, width: 160, height: 42, fill: "1A2334", line: badgeColor, rounded: true }),
    textBox({ name: "Regime", x: 960, y: 80, width: 160, height: 42, text: payload.regime, style: { sizePx: 15, bold: true, color: badgeColor, tracking: 100 }, align: "ctr", anchor: "ctr" }),
  );

  for (const card of buildCards(payload)) {
    shapes.push(
      rectangle({ name: `${card.label} card`, x: CARD_X, y: card.top, width: CARD_WIDTH, height: CARD_HEIGHT, fill: COLORS.card, line: COLORS.cardLine, rounded: true }),
      rectangle({ name: `${card.label} accent`, x: CARD_X, y: card.top + 8, width: 6, height: CARD_HEIGHT - 16, fill: card.accent }),
      textBox({ name: `${card.label} label`, x: CARD_X + 32, y: card.top + 22, width: CARD_WIDTH - 64, height: 18, text: card.label, style: { sizePx: 12, bold: true, color: card.accent, tracking: 120 } }),
      textBox({ name: `${card.label} body`, x: CARD_X + 32, y: card.top + 46, width: CARD_WIDTH - 64, height: CARD_HEIGHT - 54, text: card.body, style: { sizePx: card.top === CARD_TOPS[0] ? 20 : 18, bold: card.top === CARD_TOPS[0], color: card.top === CARD_TOPS[0] ? COLORS.ink : COLORS.inkMuted } }),
    );
  }

  shapes.push(
    textBox({ name: "Footer stats", x: 80, y: 588, width: 860, height: 22, text: footerLine(payload), style: { sizePx: 13, bold: true, color: COLORS.inkSoft } }),
    textBox({ name: "Footer site", x: 940, y: 588, width: 180, height: 22, text: "whether.work", style: { sizePx: 13, bold: true, color: "475569" }, align: "r" }),
  );

  return (
    `${XML_HEADER}<p:sld ${NS_A} ${NS_R} ${NS_P}><p:cSld>` +
    `<p:bg><p:bgPr><a:solidFill><a:srgbClr val="${COLORS.background}"/></a:solidFill><a:effectLst/></p:bgPr></p:bg>` +
    `<p:spTree>${EMPTY_SP_TREE_HEAD}${shapes.join("")}</p:spTree></p:cSld>` +
    `<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`
  );
};

const relationships = (entries: Array<{ id: string; type: string; target: string }>) =>
  `${XML_HEADER}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${entries
    .map((entry) => `<Relationship Id="${entry.id}" Type="${entry.type}" Target="${entry.target}"/>`)
    .join("")}</Relationships>`;

const CONTENT_TYPES =
  `${XML_HEADER}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
  '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
  '<Default Extension="xml" ContentType="application/xml"/>' +
  '<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>' +
  '<Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>' +
  '<Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>' +
  '<Override PartName="/ppt/slides/slide1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>' +
  '<Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>' +
  '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>' +
  '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>' +
  "</Types>";

const PRESENTATION_XML =
  `${XML_HEADER}<p:presentation ${NS_A} ${NS_R} ${NS_P} saveSubsetFonts="1">` +
  '<p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst>' +
  '<p:sldIdLst><p:sldId id="256" r:id="rId2"/></p:sldIdLst>' +
  `<p:sldSz cx="${emu(SLIDE_WIDTH_PX)}" cy="${emu(SLIDE_HEIGHT_PX)}"/>` +
  '<p:notesSz cx="6858000" cy="9144000"/>' +
  '<p:defaultTextStyle><a:defPPr><a:defRPr lang="en-US"/></a:defPPr></p:defaultTextStyle>' +
  "</p:presentation>";

const SLIDE_MASTER_XML =
  `${XML_HEADER}<p:sldMaster ${NS_A} ${NS_R} ${NS_P}><p:cSld>` +
  `<p:bg><p:bgPr><a:solidFill><a:srgbClr val="${COLORS.background}"/></a:solidFill><a:effectLst/></p:bgPr></p:bg>` +
  `<p:spTree>${EMPTY_SP_TREE_HEAD}</p:spTree></p:cSld>` +
  '<p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>' +
  '<p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst>' +
  '<p:txStyles><p:titleStyle><a:lvl1pPr><a:defRPr sz="4400"/></a:lvl1pPr></p:titleStyle>' +
  '<p:bodyStyle><a:lvl1pPr><a:defRPr sz="1800"/></a:lvl1pPr></p:bodyStyle>' +
  '<p:otherStyle><a:lvl1pPr><a:defRPr sz="1800"/></a:lvl1pPr></p:otherStyle></p:txStyles>' +
  "</p:sldMaster>";

const SLIDE_LAYOUT_XML =
  `${XML_HEADER}<p:sldLayout ${NS_A} ${NS_R} ${NS_P} type="blank" preserve="1"><p:cSld name="Blank">` +
  `<p:spTree>${EMPTY_SP_TREE_HEAD}</p:spTree></p:cSld>` +
  "<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>";

const THEME_XML =
  `${XML_HEADER}<a:theme ${NS_A} name="Whether"><a:themeElements>` +
  '<a:clrScheme name="Whether"><a:dk1><a:srgbClr val="0B1120"/></a:dk1><a:lt1><a:srgbClr val="FFFFFF"/></a:lt1><a:dk2><a:srgbClr val="1E293B"/></a:dk2><a:lt2><a:srgbClr val="E2E8F0"/></a:lt2>' +
  '<a:accent1><a:srgbClr val="38BDF8"/></a:accent1><a:accent2><a:srgbClr val="F59E0B"/></a:accent2><a:accent3><a:srgbClr val="10B981"/></a:accent3><a:accent4><a:srgbClr val="F43F5E"/></a:accent4><a:accent5><a:srgbClr val="94A3B8"/></a:accent5><a:accent6><a:srgbClr val="64748B"/></a:accent6>' +
  '<a:hlink><a:srgbClr val="38BDF8"/></a:hlink><a:folHlink><a:srgbClr val="94A3B8"/></a:folHlink></a:clrScheme>' +
  '<a:fontScheme name="Whether"><a:majorFont><a:latin typeface="Calibri"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont><a:minorFont><a:latin typeface="Calibri"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont></a:fontScheme>' +
  '<a:fmtScheme name="Whether"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst>' +
  '<a:lnStyleLst><a:ln w="9525"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln w="12700"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln w="19050"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst>' +
  "<a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst>" +
  '<a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst></a:fmtScheme>' +
  "</a:themeElements><a:objectDefaults/><a:extraClrSchemeLst/></a:theme>";

const buildCoreXml = (payload: MeetingSlidePayload, created: string) =>
  `${XML_HEADER}<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">` +
  `<dc:title>${escapeXml(`Whether weekly operating call — ${payload.recordDate}`)}</dc:title>` +
  "<dc:creator>Whether</dc:creator>" +
  `<dcterms:created xsi:type="dcterms:W3CDTF">${created}</dcterms:created>` +
  `<dcterms:modified xsi:type="dcterms:W3CDTF">${created}</dcterms:modified>` +
  "</cp:coreProperties>";

const APP_XML =
  `${XML_HEADER}<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">` +
  "<Application>Whether</Application><Slides>1</Slides></Properties>";

/** Every part of the package, in the order they are written. */
const buildPptxParts = (payload: MeetingSlidePayload, created: string): Array<[string, string]> => [
  ["[Content_Types].xml", CONTENT_TYPES],
  [
    "_rels/.rels",
    relationships([
      { id: "rId1", type: `${REL_NS}/officeDocument`, target: "ppt/presentation.xml" },
      { id: "rId2", type: "http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties", target: "docProps/core.xml" },
      { id: "rId3", type: `${REL_NS}/extended-properties`, target: "docProps/app.xml" },
    ]),
  ],
  ["docProps/core.xml", buildCoreXml(payload, created)],
  ["docProps/app.xml", APP_XML],
  ["ppt/presentation.xml", PRESENTATION_XML],
  [
    "ppt/_rels/presentation.xml.rels",
    relationships([
      { id: "rId1", type: `${REL_NS}/slideMaster`, target: "slideMasters/slideMaster1.xml" },
      { id: "rId2", type: `${REL_NS}/slide`, target: "slides/slide1.xml" },
      { id: "rId3", type: `${REL_NS}/theme`, target: "theme/theme1.xml" },
    ]),
  ],
  ["ppt/slideMasters/slideMaster1.xml", SLIDE_MASTER_XML],
  [
    "ppt/slideMasters/_rels/slideMaster1.xml.rels",
    relationships([
      { id: "rId1", type: `${REL_NS}/slideLayout`, target: "../slideLayouts/slideLayout1.xml" },
      { id: "rId2", type: `${REL_NS}/theme`, target: "../theme/theme1.xml" },
    ]),
  ],
  ["ppt/slideLayouts/slideLayout1.xml", SLIDE_LAYOUT_XML],
  [
    "ppt/slideLayouts/_rels/slideLayout1.xml.rels",
    relationships([{ id: "rId1", type: `${REL_NS}/slideMaster`, target: "../slideMasters/slideMaster1.xml" }]),
  ],
  ["ppt/slides/slide1.xml", buildSlideXml(payload)],
  [
    "ppt/slides/_rels/slide1.xml.rels",
    relationships([{ id: "rId1", type: `${REL_NS}/slideLayout`, target: "../slideLayouts/slideLayout1.xml" }]),
  ],
  ["ppt/theme/theme1.xml", THEME_XML],
];

// ---------------------------------------------------------------------------
// A stored ZIP. Local header, entry, central directory, end record — nothing
// else the format allows is needed for a reader to open the package.
// ---------------------------------------------------------------------------

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

const crc32 = (bytes: Uint8Array) => {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
};

/** MS-DOS time and date fields, from a UTC instant so the file is byte-stable for a record date. */
const dosDateTime = (date: Date) => {
  const time = (date.getUTCHours() << 11) | (date.getUTCMinutes() << 5) | (date.getUTCSeconds() >> 1);
  const day = ((Math.max(date.getUTCFullYear(), 1980) - 1980) << 9) | ((date.getUTCMonth() + 1) << 5) | date.getUTCDate();
  return { time, day };
};

const writeStoredZip = (entries: Array<[string, string]>, stamp: Date): Uint8Array => {
  const encoder = new TextEncoder();
  const { time, day } = dosDateTime(stamp);
  const chunks: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;

  const header = (size: number) => {
    const bytes = new Uint8Array(size);
    return { bytes, view: new DataView(bytes.buffer) };
  };

  for (const [name, content] of entries) {
    const nameBytes = encoder.encode(name);
    const data = encoder.encode(content);
    const crc = crc32(data);

    const local = header(30);
    local.view.setUint32(0, 0x04034b50, true);
    local.view.setUint16(4, 20, true);
    local.view.setUint16(6, 0, true);
    local.view.setUint16(8, 0, true);
    local.view.setUint16(10, time, true);
    local.view.setUint16(12, day, true);
    local.view.setUint32(14, crc, true);
    local.view.setUint32(18, data.length, true);
    local.view.setUint32(22, data.length, true);
    local.view.setUint16(26, nameBytes.length, true);
    local.view.setUint16(28, 0, true);

    const record = header(46);
    record.view.setUint32(0, 0x02014b50, true);
    record.view.setUint16(4, 20, true);
    record.view.setUint16(6, 20, true);
    record.view.setUint16(8, 0, true);
    record.view.setUint16(10, 0, true);
    record.view.setUint16(12, time, true);
    record.view.setUint16(14, day, true);
    record.view.setUint32(16, crc, true);
    record.view.setUint32(20, data.length, true);
    record.view.setUint32(24, data.length, true);
    record.view.setUint16(28, nameBytes.length, true);
    record.view.setUint16(30, 0, true);
    record.view.setUint16(32, 0, true);
    record.view.setUint16(34, 0, true);
    record.view.setUint16(36, 0, true);
    record.view.setUint32(38, 0, true);
    record.view.setUint32(42, offset, true);

    chunks.push(local.bytes, nameBytes, data);
    central.push(record.bytes, nameBytes);
    offset += local.bytes.length + nameBytes.length + data.length;
  }

  const centralSize = central.reduce((total, chunk) => total + chunk.length, 0);
  const end = header(22);
  end.view.setUint32(0, 0x06054b50, true);
  end.view.setUint16(4, 0, true);
  end.view.setUint16(6, 0, true);
  end.view.setUint16(8, entries.length, true);
  end.view.setUint16(10, entries.length, true);
  end.view.setUint32(12, centralSize, true);
  end.view.setUint32(16, offset, true);
  end.view.setUint16(20, 0, true);

  const total = offset + centralSize + end.bytes.length;
  const out = new Uint8Array(total);
  let cursor = 0;
  for (const chunk of [...chunks, ...central, end.bytes]) {
    out.set(chunk, cursor);
    cursor += chunk.length;
  }
  return out;
};

/** The ISO record date when the payload carries one, else the label, else nothing usable. */
const isoRecordDate = (payload: MeetingSlidePayload) => {
  const candidate = payload.recordDateIso ?? payload.recordDate;
  return /^\d{4}-\d{2}-\d{2}$/.test(candidate) ? candidate : null;
};

/** The record date as the package timestamp, so the same week yields the same bytes. */
const stampFor = (payload: MeetingSlidePayload) => {
  const iso = isoRecordDate(payload);
  return iso ? new Date(`${iso}T12:00:00Z`) : new Date(Date.UTC(2020, 0, 1, 12));
};

export const buildBoardSlidePptx = (payload: MeetingSlidePayload): Uint8Array => {
  const stamp = stampFor(payload);
  return writeStoredZip(buildPptxParts(payload, stamp.toISOString().replace(/\.\d{3}Z$/, "Z")), stamp);
};

// ---------------------------------------------------------------------------
// PDF
// ---------------------------------------------------------------------------

const pt = (px: number) => px * PT_PER_PX;
const PAGE_WIDTH = pt(SLIDE_WIDTH_PX);
const PAGE_HEIGHT = pt(SLIDE_HEIGHT_PX);

/*
 * The standard fonts encode WinAnsi, and `embedFont` throws on a character
 * outside it. The rule copy is plain prose but carries dashes, curly quotes
 * and the middle dot, all of which WinAnsi has; anything else is mapped to
 * its nearest ASCII or dropped rather than failing the whole export.
 */
const toWinAnsi = (text: string) =>
  text
    .replace(/→/g, "->")
    .replace(/≤/g, "<=")
    .replace(/≥/g, ">=")
    .replace(/−/g, "-")
    .replace(/[^ -~ -ÿ–—‘’“”•…€™]/g, "");

const hex = (value: string) => {
  const int = Number.parseInt(value, 16);
  return { r: ((int >> 16) & 255) / 255, g: ((int >> 8) & 255) / 255, b: (int & 255) / 255 };
};

export const buildBoardSlidePdf = async (payload: MeetingSlidePayload): Promise<Uint8Array> => {
  const { PDFDocument, StandardFonts, rgb } = await import("@cantoo/pdf-lib");
  const doc = await PDFDocument.create();
  doc.setTitle(`Whether weekly operating call — ${payload.recordDate}`);
  doc.setAuthor("Whether");
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const color = (value: string) => {
    const { r, g, b } = hex(value);
    return rgb(r, g, b);
  };

  // PDF y runs up from the bottom; the layout is stated from the top.
  const top = (yPx: number, heightPx = 0) => PAGE_HEIGHT - pt(yPx) - pt(heightPx);

  const wrap = (text: string, font: typeof regular, size: number, maxWidth: number) => {
    const words = toWinAnsi(text).split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let line = "";
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth || !line) {
        line = candidate;
      } else {
        lines.push(line);
        line = word;
      }
    }
    if (line) lines.push(line);
    return lines;
  };

  const drawText = (
    text: string,
    { x, y, sizePx, font, fill, maxWidthPx, align = "left", lineHeight = 1.25 }: {
      x: number;
      y: number;
      sizePx: number;
      font: typeof regular;
      fill: string;
      maxWidthPx: number;
      align?: "left" | "right" | "center";
      lineHeight?: number;
    },
  ) => {
    const size = pt(sizePx);
    const lines = wrap(text, font, size, pt(maxWidthPx));
    lines.forEach((line, index) => {
      const width = font.widthOfTextAtSize(line, size);
      const startX = align === "right" ? pt(x + maxWidthPx) - width : align === "center" ? pt(x) + (pt(maxWidthPx) - width) / 2 : pt(x);
      page.drawText(line, {
        x: startX,
        y: top(y, sizePx) - index * size * lineHeight,
        size,
        font,
        color: color(fill),
      });
    });
    return lines.length;
  };

  page.drawRectangle({ x: 0, y: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT, color: color(COLORS.background) });

  drawText(EYEBROW, { x: 80, y: 56, sizePx: 14, font: bold, fill: "94A3B8", maxWidthPx: 780 });
  drawText(titleLine(payload), { x: 80, y: 82, sizePx: 34, font: bold, fill: COLORS.ink, maxWidthPx: 860 });
  drawText(subtitleLine(payload), { x: 80, y: 130, sizePx: 16, font: regular, fill: COLORS.inkSoft, maxWidthPx: 860 });

  const badgeColor = isDefensiveRegime(payload.regime) ? "F43F5E" : COLORS.badge;
  page.drawRectangle({
    x: pt(960),
    y: top(80, 42),
    width: pt(160),
    height: pt(42),
    color: color("1A2334"),
    borderColor: color(badgeColor),
    borderWidth: 1.2,
  });
  drawText(payload.regime, { x: 960, y: 92, sizePx: 15, font: bold, fill: badgeColor, maxWidthPx: 160, align: "center" });

  for (const card of buildCards(payload)) {
    page.drawRectangle({
      x: pt(CARD_X),
      y: top(card.top, CARD_HEIGHT),
      width: pt(CARD_WIDTH),
      height: pt(CARD_HEIGHT),
      color: color(COLORS.card),
      borderColor: color(COLORS.cardLine),
      borderWidth: 0.8,
    });
    page.drawRectangle({
      x: pt(CARD_X),
      y: top(card.top + 8, CARD_HEIGHT - 16),
      width: pt(6),
      height: pt(CARD_HEIGHT - 16),
      color: color(card.accent),
    });
    drawText(card.label, { x: CARD_X + 32, y: card.top + 22, sizePx: 12, font: bold, fill: card.accent, maxWidthPx: CARD_WIDTH - 64 });
    const lead = card.top === CARD_TOPS[0];
    drawText(card.body, {
      x: CARD_X + 32,
      y: card.top + 48,
      sizePx: lead ? 20 : 18,
      font: lead ? bold : regular,
      fill: lead ? COLORS.ink : COLORS.inkMuted,
      maxWidthPx: CARD_WIDTH - 64,
    });
  }

  drawText(footerLine(payload), { x: 80, y: 590, sizePx: 13, font: bold, fill: COLORS.inkSoft, maxWidthPx: 860 });
  drawText("whether.work", { x: 940, y: 590, sizePx: 13, font: bold, fill: "475569", maxWidthPx: 180, align: "right" });

  return doc.save();
};

export const BOARD_SLIDE_FORMATS = {
  pptx: {
    contentType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    extension: "pptx",
  },
  pdf: { contentType: "application/pdf", extension: "pdf" },
} as const;

type BoardSlideFormat = keyof typeof BOARD_SLIDE_FORMATS;

export const isBoardSlideFormat = (value: string | null | undefined): value is BoardSlideFormat =>
  value === "pptx" || value === "pdf";

export const boardSlideFileName = (payload: MeetingSlidePayload, format: BoardSlideFormat) =>
  `whether-board-slide-${isoRecordDate(payload) ?? "current"}.${BOARD_SLIDE_FORMATS[format].extension}`;
