/**
 * A minimal reader for the cells of one worksheet in an .xlsx file.
 *
 * The premise-test generator reads the PitchBook-NVCA Venture Monitor's
 * summary spreadsheets, which are ordinary Office Open XML workbooks. Only
 * values are read: no formulas are evaluated, no macros exist in the format,
 * and nothing in the file is executed. A workbook is a zip archive of XML parts,
 * so this reads the zip's central directory, inflates the parts it needs with
 * `node:zlib`, and takes cell values from the XML with patterns, which is enough
 * for the flat value tables these files hold.
 */
import { inflateRawSync } from "node:zlib";

const END_OF_CENTRAL_DIRECTORY = 0x06054b50;
const CENTRAL_DIRECTORY_ENTRY = 0x02014b50;
const LOCAL_FILE_HEADER = 0x04034b50;
const ZIP64_MARKER = 0xffffffff;

type ZipEntry = { compression: number; compressedSize: number; localHeaderOffset: number };

const readZipDirectory = (bytes: Buffer): Map<string, ZipEntry> => {
  let end = -1;
  for (let offset = bytes.length - 22; offset >= Math.max(0, bytes.length - 65_557); offset -= 1) {
    if (bytes.readUInt32LE(offset) === END_OF_CENTRAL_DIRECTORY) {
      end = offset;
      break;
    }
  }
  if (end < 0) {
    throw new Error("Not a zip archive: no end-of-central-directory record.");
  }
  const entryCount = bytes.readUInt16LE(end + 10);
  let offset = bytes.readUInt32LE(end + 16);
  const entries = new Map<string, ZipEntry>();
  for (let index = 0; index < entryCount; index += 1) {
    if (bytes.readUInt32LE(offset) !== CENTRAL_DIRECTORY_ENTRY) {
      throw new Error("Malformed zip central directory.");
    }
    const compression = bytes.readUInt16LE(offset + 10);
    const compressedSize = bytes.readUInt32LE(offset + 20);
    const nameLength = bytes.readUInt16LE(offset + 28);
    const extraLength = bytes.readUInt16LE(offset + 30);
    const commentLength = bytes.readUInt16LE(offset + 32);
    const localHeaderOffset = bytes.readUInt32LE(offset + 42);
    if (compressedSize === ZIP64_MARKER || localHeaderOffset === ZIP64_MARKER) {
      throw new Error("Zip64 archives are not supported.");
    }
    const name = bytes.toString("utf8", offset + 46, offset + 46 + nameLength);
    entries.set(name, { compression, compressedSize, localHeaderOffset });
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
};

const readZipPart = (bytes: Buffer, entries: Map<string, ZipEntry>, name: string): string | null => {
  const entry = entries.get(name);
  if (!entry) {
    return null;
  }
  const header = entry.localHeaderOffset;
  if (bytes.readUInt32LE(header) !== LOCAL_FILE_HEADER) {
    throw new Error(`Malformed local header for ${name}.`);
  }
  const start = header + 30 + bytes.readUInt16LE(header + 26) + bytes.readUInt16LE(header + 28);
  const data = bytes.subarray(start, start + entry.compressedSize);
  if (entry.compression === 0) {
    return data.toString("utf8");
  }
  if (entry.compression === 8) {
    return inflateRawSync(data).toString("utf8");
  }
  throw new Error(`Unsupported zip compression ${entry.compression} for ${name}.`);
};

const XML_ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

const decodeXml = (text: string): string =>
  text.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (whole, entity: string) => {
    if (entity.startsWith("#x") || entity.startsWith("#X")) {
      return String.fromCodePoint(Number.parseInt(entity.slice(2), 16));
    }
    if (entity.startsWith("#")) {
      return String.fromCodePoint(Number.parseInt(entity.slice(1), 10));
    }
    return XML_ENTITIES[entity.toLowerCase()] ?? whole;
  });

const attribute = (tag: string, name: string): string | null => {
  const match = new RegExp(`\\s${name}="([^"]*)"`).exec(tag);
  return match ? decodeXml(match[1]) : null;
};

const textRuns = (xml: string): string =>
  [...xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((match) => decodeXml(match[1])).join("");

/** Column letters to a 1-based column number: A is 1, Z is 26, AA is 27. */
const columnNumber = (letters: string): number => {
  let total = 0;
  for (let index = 0; index < letters.length; index += 1) {
    total = total * 26 + (letters.charCodeAt(index) - 64);
  }
  return total;
};

/** One worksheet's values: row number to column number to the cell's text. */
export type SheetGrid = Map<number, Map<number, string>>;

export type Workbook = {
  sheetNames: string[];
  readSheet: (name: string) => SheetGrid;
  /** `dcterms:modified` from the package properties: when the file was last saved. */
  savedAt: string | null;
};

export const readWorkbook = (bytes: Buffer): Workbook => {
  const entries = readZipDirectory(bytes);
  const part = (name: string): string => {
    const xml = readZipPart(bytes, entries, name);
    if (xml === null) {
      throw new Error(`Workbook part ${name} is missing.`);
    }
    return xml;
  };

  const sharedStringsXml = readZipPart(bytes, entries, "xl/sharedStrings.xml") ?? "";
  const sharedStrings = [...sharedStringsXml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((match) => textRuns(match[1]));

  const relationships = new Map<string, string>();
  for (const match of part("xl/_rels/workbook.xml.rels").matchAll(/<Relationship\b[^>]*>/g)) {
    const id = attribute(match[0], "Id");
    const target = attribute(match[0], "Target");
    if (id && target) {
      const path = target.replace(/^\/+/, "");
      relationships.set(id, path.startsWith("xl/") ? path : `xl/${path}`);
    }
  }

  const sheets = new Map<string, string>();
  for (const match of part("xl/workbook.xml").matchAll(/<sheet\b[^>]*>/g)) {
    const name = attribute(match[0], "name");
    const relationshipId = attribute(match[0], "r:id");
    const path = relationshipId ? relationships.get(relationshipId) : undefined;
    if (name && path) {
      sheets.set(name, path);
    }
  }

  const core = readZipPart(bytes, entries, "docProps/core.xml") ?? "";
  const modified = /<dcterms:modified[^>]*>([^<]*)<\/dcterms:modified>/.exec(core);

  const readSheet = (name: string): SheetGrid => {
    const path = sheets.get(name);
    if (!path) {
      throw new Error(`Worksheet "${name}" is not in the workbook.`);
    }
    const grid: SheetGrid = new Map();
    for (const match of part(path).matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const reference = attribute(match[1], "r");
      const body = match[2] ?? "";
      const position = reference ? /^([A-Z]+)(\d+)$/.exec(reference) : null;
      if (!position) {
        continue;
      }
      const type = attribute(match[1], "t");
      const value = /<v>([\s\S]*?)<\/v>/.exec(body);
      let text: string | null = null;
      if (type === "s" && value) {
        text = sharedStrings[Number(value[1])] ?? null;
      } else if (type === "inlineStr") {
        text = textRuns(body);
      } else if (value) {
        text = decodeXml(value[1]);
      }
      if (text === null) {
        continue;
      }
      const row = Number(position[2]);
      const columns = grid.get(row) ?? new Map<number, string>();
      columns.set(columnNumber(position[1]), text);
      grid.set(row, columns);
    }
    return grid;
  };

  return { sheetNames: [...sheets.keys()], readSheet, savedAt: modified ? modified[1] : null };
};
