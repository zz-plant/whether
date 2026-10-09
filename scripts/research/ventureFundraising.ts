/**
 * U.S. venture deal value and deal count by quarter, from the PitchBook-NVCA
 * Venture Monitor's public summary spreadsheets: the outcome data of the premise
 * test registered in docs/research/premise-test-preregistration.md (§4).
 *
 *   bun scripts/research/ventureFundraising.ts --write   download every release and rebuild the dataset
 *   bun scripts/research/ventureFundraising.ts --check   validate the committed dataset, offline
 *
 * The dataset holds figures and citations only. Every year-over-year pair is
 * read from one release, chosen by the registered vintage rule, so a pair never
 * mixes a revised figure with a first-published one.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { z } from "zod";
import { readWorkbook, type SheetGrid } from "./xlsx";

export const VENTURE_DATASET_PATH = "data/research/venture-fundraising-quarterly.json";

/** First and last quarter the dataset covers: four quarters before the first
 *  lead/lag offset of the first signal quarter (2012Q1 − 4), through the newest
 *  release. */
const FIRST_QUARTER = "2011Q1";

const QUARTER_PATTERN = /^(\d{4})Q([1-4])$/;

export const quarterIndex = (quarter: string): number => {
  const match = QUARTER_PATTERN.exec(quarter);
  if (!match) {
    throw new Error(`Not a quarter: ${quarter}`);
  }
  return Number(match[1]) * 4 + Number(match[2]) - 1;
};

export const quarterFromIndex = (index: number): string => `${Math.floor(index / 4)}Q${(index % 4) + 1}`;

export const shiftQuarter = (quarter: string, by: number): string => quarterFromIndex(quarterIndex(quarter) + by);

/** The last calendar day of a quarter, as an ISO date. */
export const quarterEndDate = (quarter: string): string => {
  const index = quarterIndex(quarter);
  const year = Math.floor(index / 4);
  const month = (index % 4) * 3 + 3;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
};

/**
 * Every release whose summary spreadsheet could be retrieved, by the quarter it
 * reports. The list is what the search found (nvca.org directly, and the
 * Internet Archive's index of nvca.org uploads); no release was left out for
 * what it contains.
 */
const RETRIEVED_RELEASES: readonly { quarter: string; url: string }[] = [
  { quarter: "2019Q2", url: "https://nvca.org/wp-content/uploads/2019/08/Final_PitchBook_NVCA_2Q_2019_Venture_Monitor_Summary_XLS.xlsb.xlsx" },
  { quarter: "2019Q3", url: "https://nvca.org/wp-content/uploads/2019/10/3Q_2019_PitchBook_NVCA_Venture_Monitor_Summary_XLS-1.xlsx" },
  { quarter: "2019Q4", url: "https://nvca.org/wp-content/uploads/2020/01/Final_4Q_2019_PitchBook_NVCA_Venture_Monitor_Summary_XLS.xlsx" },
  { quarter: "2020Q1", url: "https://nvca.org/wp-content/uploads/2020/04/Summary-XLS_Q1_2020_PitchBook_NVCA_Venture_Monitor_Summary_XLS.xlsx" },
  { quarter: "2020Q2", url: "https://nvca.org/wp-content/uploads/2020/07/Summary-XLS_Final_Q2_2020_PitchBook_NVCA_Venture_Monitor_Summary_XLS.xlsx" },
  { quarter: "2020Q3", url: "https://nvca.org/wp-content/uploads/2020/10/Summary-XLS_Q3_2020_PitchBook_NVCA_Venture_Monitor_Summary_XLS.xlsx" },
  { quarter: "2020Q4", url: "https://nvca.org/wp-content/uploads/2021/01/Q4_2020_PitchBook_NVCA_Venture_Monitor_Summary_XLS.xlsx" },
  { quarter: "2021Q1", url: "https://nvca.org/wp-content/uploads/2021/04/Final_Q1_2021_PitchBook_NVCA_Venture_Monitor_Summary_XLS.xlsx" },
  { quarter: "2021Q2", url: "https://nvca.org/wp-content/uploads/2021/07/Q2_2021_PitchBook_NVCA_Venture_Monitor_Summary_XLS.xlsx" },
  { quarter: "2021Q3", url: "https://nvca.org/wp-content/uploads/2021/10/Underlying-Report-Data_Q3-2021-Venture-Monitor.xlsx" },
  { quarter: "2021Q4", url: "https://nvca.org/wp-content/uploads/2022/01/Underlying-Report-Data_Q4-2021-Venture-Monitor.xlsx" },
  { quarter: "2022Q1", url: "https://nvca.org/wp-content/uploads/2022/04/Q1_2022_PitchBook_NVCA_Venture_Monitor_Summary_XLS.xlsx" },
  { quarter: "2022Q2", url: "https://nvca.org/wp-content/uploads/2022/07/Q2_2022_PitchBook_NVCA_Venture_Monitor_XLS.xlsx" },
  { quarter: "2022Q4", url: "https://nvca.org/wp-content/uploads/2023/02/Underlying-Report-Data_Q4-2022-Venture-Monitor.xlsx" },
  { quarter: "2023Q1", url: "https://nvca.org/wp-content/uploads/2023/04/Q1_2023_PitchBook-NVCA_Venture_Monitor_Data.xlsx" },
  { quarter: "2023Q2", url: "https://nvca.org/wp-content/uploads/2023/07/Q2_2023_PitchBook-NVCA_Venture_Monitor_Summary_XLS.xlsx" },
  { quarter: "2023Q3", url: "https://nvca.org/wp-content/uploads/2023/10/Q3_2023_PitchBook-NVCA_Venture_Monitor_Summary_XLS.xlsx" },
  { quarter: "2023Q4", url: "https://nvca.org/wp-content/uploads/2024/01/Q4_2023_PitchBook-NVCA_Venture_Monitor_Summary_XLS.xlsx" },
  { quarter: "2024Q1", url: "https://nvca.org/wp-content/uploads/2024/04/Q1-2024-PitchBook-NVCA-Venture-Monitor-Summary-XLS.xlsx" },
  { quarter: "2024Q2", url: "https://nvca.org/wp-content/uploads/2024/07/Q2-2024-PitchBook-NVCA-Venture-Monitor-Summary-XLS.xlsx" },
  { quarter: "2024Q3", url: "https://nvca.org/wp-content/uploads/2024/10/Q3-2024-PitchBook-NVCA-Venture-Monitor-Summary-XLS.xlsx" },
  { quarter: "2024Q4", url: "https://nvca.org/wp-content/uploads/2025/01/Q4-2024-PitchBook-NVCA-Venture-Monitor-Summary-XLS.xlsx" },
  { quarter: "2025Q1", url: "https://nvca.org/wp-content/uploads/2025/04/Q1-2025-PitchBook-NVCA-Venture-Monitor-Summary-XLS-19001-1.xlsx" },
  { quarter: "2025Q2", url: "https://nvca.org/wp-content/uploads/2025/07/Q2-2025-PitchBook-NVCA-Venture-Monitor-Summary-XLS-19728.xlsx" },
  { quarter: "2025Q3", url: "https://nvca.org/wp-content/uploads/2025/10/Q3_2025_PitchBook-NVCA_Venture_Monitor_Summary_XLS_20370.xlsx" },
  { quarter: "2025Q4", url: "https://nvca.org/wp-content/uploads/2026/01/Q4-2025-PitchBook-NVCA-Venture-Monitor-Summary-XLS.xlsx" },
  { quarter: "2026Q1", url: "https://nvca.org/wp-content/uploads/2026/04/Q1-2026-PitchBook-NVCA-Venture-Monitor-Summary-XLS.xlsx" },
  { quarter: "2026Q2", url: "https://nvca.org/wp-content/uploads/2026/07/Q2-2026-PitchBook-NVCA-Venture-Monitor-Summary-XLS.xlsx" },
  { quarter: "2026Q3", url: "https://nvca.org/download/125414/" },
];

const UNRETRIEVED_RELEASES = [
  {
    releases: "every release before 2019Q2",
    reason:
      "No public copy of the summary spreadsheet on nvca.org or in the Internet Archive's index of nvca.org uploads; NVCA described its spreadsheet data packs of that period as members-only.",
  },
  {
    releases: "2022Q3",
    reason: "The release's spreadsheet is not on nvca.org and the Internet Archive holds no copy of it.",
  },
];

const QuarterSchema = z.string().regex(QUARTER_PATTERN);
const FiguresSchema = z.object({ dealValueUsdBn: z.number().positive(), dealCount: z.number().int().positive() });

const PairSchema = z.object({
  release: QuarterSchema,
  url: z.string().url(),
  immature: z.boolean(),
  current: FiguresSchema,
  yearEarlier: FiguresSchema.extend({ quarter: QuarterSchema }),
});

const ReleaseSchema = z.object({
  quarter: QuarterSchema,
  title: z.string(),
  url: z.string().url(),
  asOf: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  /** The spreadsheet's own last-saved timestamp: the release date to within a day. */
  savedAt: z.string(),
  sheet: z.string(),
  valueRow: z.number().int().positive(),
  countRow: z.number().int().positive(),
  firstQuarter: QuarterSchema,
  /** Complete years in the quarterly table whose four quarters were checked against the sheet's annual table. */
  annualTotalsChecked: z.number().int().nonnegative(),
});

export const VentureDatasetSchema = z.object({
  schemaVersion: z.literal(1),
  about: z.string(),
  registration: z.literal("docs/research/premise-test-preregistration.md"),
  generator: z.literal("scripts/research/ventureFundraising.ts"),
  vintageRule: z.object({ mature: z.string(), firstPublished: z.string() }),
  releases: z.array(ReleaseSchema),
  unretrieved: z.array(z.object({ releases: z.string(), reason: z.string() })),
  quarters: z.array(
    z.object({
      quarter: QuarterSchema,
      mature: PairSchema.nullable(),
      firstPublished: PairSchema.nullable(),
    }),
  ),
});

export type VentureDataset = z.infer<typeof VentureDatasetSchema>;
type Release = z.infer<typeof ReleaseSchema>;
type Pair = z.infer<typeof PairSchema>;

const VINTAGE_RULE = {
  mature:
    "Quarter t and quarter t−4 are both read from the earliest retrieved release whose own quarter is at least t+4; with no such release, from the latest retrieved release, marked immature.",
  firstPublished: "Quarter t and quarter t−4 are both read from the release that first published t, where it was retrieved.",
};

/** The release the mature rule assigns to a quarter, and whether it had a year to mature. */
export const selectMatureRelease = (
  quarter: string,
  releaseQuarters: readonly string[],
): { release: string; immature: boolean } | null => {
  const sorted = [...releaseQuarters].sort((a, b) => quarterIndex(a) - quarterIndex(b));
  const mature = sorted.find((release) => quarterIndex(release) >= quarterIndex(quarter) + 4);
  if (mature) {
    return { release: mature, immature: false };
  }
  const latest = sorted.at(-1);
  return latest ? { release: latest, immature: true } : null;
};

const roundTo = (value: number, digits: number) => Number(value.toFixed(digits));

/* ------------------------------------------------------------------------ */
/* Reading one release                                                       */
/* ------------------------------------------------------------------------ */

const QUARTER_LABEL = /^(?:Q([1-4])|([1-4])Q)$/;
const YEAR_LABEL = /^(\d{4})\*?$/;
const DEAL_SHEET_NAMES = [/^VC deal activity$/i, /^Deal activity$/i, /^Deal Flow x Stage & Qtr$/i];
const ANNUAL_SHEET_NAMES = [/^Deal Flow x Year$/i];

type ReleaseTable = {
  sheet: string;
  valueRow: number;
  countRow: number;
  values: Map<string, number>;
  counts: Map<string, number>;
  annualTotalsChecked: number;
};

const cellText = (grid: SheetGrid, row: number, column: number): string | undefined => grid.get(row)?.get(column)?.trim();

const sortedRows = (grid: SheetGrid) => [...grid.keys()].sort((a, b) => a - b);

/** The first quarterly header row (the US VC deal activity table) and its columns. */
const findQuarterTable = (grid: SheetGrid) => {
  for (const row of sortedRows(grid)) {
    const columns = [...(grid.get(row) ?? new Map<number, string>()).entries()]
      .filter(([, text]) => QUARTER_LABEL.test(text.trim()))
      .map(([column]) => column)
      .sort((a, b) => a - b);
    if (columns.length < 8) {
      continue;
    }
    const yearRow = [row - 1, row - 2, row - 3].find((candidate) =>
      [...(grid.get(candidate) ?? new Map<number, string>()).entries()].some(
        ([column, text]) => column >= columns[0] && YEAR_LABEL.test(text.trim()),
      ),
    );
    if (yearRow === undefined) {
      throw new Error(`Quarter header at row ${row} has no year row above it.`);
    }
    const quarterByColumn = new Map<number, string>();
    let year: number | null = null;
    for (let column = columns[0]; column <= columns[columns.length - 1]; column += 1) {
      const yearText = cellText(grid, yearRow, column);
      const yearMatch = yearText ? YEAR_LABEL.exec(yearText) : null;
      if (yearMatch) {
        year = Number(yearMatch[1]);
      }
      const label = cellText(grid, row, column);
      const quarterMatch = label ? QUARTER_LABEL.exec(label) : null;
      if (quarterMatch && year !== null) {
        quarterByColumn.set(column, `${year}Q${quarterMatch[1] ?? quarterMatch[2]}`);
      }
    }
    return { headerRow: row, labelColumn: columns[0] - 1, quarterByColumn };
  }
  throw new Error("No quarterly table found.");
};

const readSeriesRow = (
  grid: SheetGrid,
  table: ReturnType<typeof findQuarterTable>,
  label: string,
): { row: number; values: Map<string, number> } => {
  for (const row of sortedRows(grid)) {
    if (row <= table.headerRow || cellText(grid, row, table.labelColumn) !== label) {
      continue;
    }
    const values = new Map<string, number>();
    for (const [column, quarter] of table.quarterByColumn) {
      const text = cellText(grid, row, column);
      const value = text === undefined || text === "" ? Number.NaN : Number(text);
      if (Number.isFinite(value)) {
        values.set(quarter, value);
      }
    }
    return { row, values };
  }
  throw new Error(`Row "${label}" not found below the quarterly header.`);
};

/** The annual table: a row of consecutive years with value and count rows beneath it. */
const findAnnualTotals = (grid: SheetGrid): { values: Map<number, number>; counts: Map<number, number> } | null => {
  for (const row of sortedRows(grid)) {
    const yearColumns = [...(grid.get(row) ?? new Map<number, string>()).entries()]
      .map(([column, text]) => ({ column, match: YEAR_LABEL.exec(text.trim()) }))
      .filter((entry): entry is { column: number; match: RegExpExecArray } => entry.match !== null)
      .sort((a, b) => a.column - b.column);
    const consecutive = yearColumns.every((entry, index) => index === 0 || entry.column === yearColumns[index - 1].column + 1);
    if (yearColumns.length < 8 || !consecutive) {
      continue;
    }
    const labelColumn = yearColumns[0].column - 1;
    const read = (label: string) => {
      for (let candidate = row + 1; candidate <= row + 6; candidate += 1) {
        if (cellText(grid, candidate, labelColumn) === label) {
          return new Map(
            yearColumns
              .map(({ column, match }) => [Number(match[1]), Number(cellText(grid, candidate, column))] as const)
              .filter(([, value]) => Number.isFinite(value)),
          );
        }
      }
      return null;
    };
    const values = read("Deal value ($B)");
    const counts = read("Deal count");
    if (values && counts) {
      return { values, counts };
    }
  }
  return null;
};

export const readReleaseTable = (bytes: Buffer): ReleaseTable & { savedAt: string | null } => {
  const workbook = readWorkbook(bytes);
  const sheet = DEAL_SHEET_NAMES.map((pattern) => workbook.sheetNames.find((name) => pattern.test(name))).find(
    (name): name is string => name !== undefined,
  );
  if (!sheet) {
    throw new Error(`No deal-activity sheet among: ${workbook.sheetNames.join(", ")}`);
  }
  const grid = workbook.readSheet(sheet);
  const table = findQuarterTable(grid);
  const value = readSeriesRow(grid, table, "Deal value ($B)");
  const count = readSeriesRow(grid, table, "Deal count");

  const annualSheet = ANNUAL_SHEET_NAMES.map((pattern) => workbook.sheetNames.find((name) => pattern.test(name))).find(
    (name): name is string => name !== undefined,
  );
  const annual = findAnnualTotals(annualSheet ? workbook.readSheet(annualSheet) : grid);
  if (!annual) {
    throw new Error(`No annual totals table in ${sheet}.`);
  }
  let annualTotalsChecked = 0;
  for (const [year, annualValue] of annual.values) {
    const quarters = [1, 2, 3, 4].map((q) => `${year}Q${q}`);
    if (!quarters.every((quarter) => value.values.has(quarter) && count.values.has(quarter))) {
      continue;
    }
    const summedValue = quarters.reduce((total, quarter) => total + (value.values.get(quarter) ?? 0), 0);
    const summedCount = quarters.reduce((total, quarter) => total + (count.values.get(quarter) ?? 0), 0);
    if (Math.abs(summedValue - annualValue) > 0.005 || summedCount !== annual.counts.get(year)) {
      throw new Error(`${year}: quarters sum to ${summedValue} / ${summedCount}, the annual table says ${annualValue} / ${annual.counts.get(year)}.`);
    }
    annualTotalsChecked += 1;
  }

  return {
    sheet,
    valueRow: value.row,
    countRow: count.row,
    values: value.values,
    counts: count.values,
    annualTotalsChecked,
    savedAt: workbook.savedAt,
  };
};

/* ------------------------------------------------------------------------ */
/* Building and checking the dataset                                         */
/* ------------------------------------------------------------------------ */

const releaseTitle = (quarter: string) => `${quarter.slice(4)} ${quarter.slice(0, 4)} PitchBook-NVCA Venture Monitor`;

const download = (url: string): Buffer =>
  execFileSync("curl", ["-fsSL", "--max-time", "180", "-A", "Mozilla/5.0 (whether.work premise test)", url], {
    maxBuffer: 64 * 1024 * 1024,
  });

const buildPair = (
  quarter: string,
  release: Release,
  table: ReleaseTable,
  immature: boolean,
): Pair | null => {
  const earlier = shiftQuarter(quarter, -4);
  const value = table.values.get(quarter);
  const count = table.counts.get(quarter);
  const earlierValue = table.values.get(earlier);
  const earlierCount = table.counts.get(earlier);
  if (value === undefined || count === undefined || earlierValue === undefined || earlierCount === undefined) {
    return null;
  }
  return {
    release: release.quarter,
    url: release.url,
    immature,
    current: { dealValueUsdBn: roundTo(value, 3), dealCount: count },
    yearEarlier: { quarter: earlier, dealValueUsdBn: roundTo(earlierValue, 3), dealCount: earlierCount },
  };
};

const buildDataset = (): VentureDataset => {
  const releases: Release[] = [];
  const tables = new Map<string, ReleaseTable>();
  for (const { quarter, url } of RETRIEVED_RELEASES) {
    process.stdout.write(`[venture] ${quarter} ${url}\n`);
    const table = readReleaseTable(download(url));
    const newest = [...table.values.keys()].sort((a, b) => quarterIndex(a) - quarterIndex(b));
    if (newest.at(-1) !== quarter) {
      throw new Error(`${url} reports through ${newest.at(-1)}, not ${quarter}.`);
    }
    tables.set(quarter, table);
    releases.push({
      quarter,
      title: releaseTitle(quarter),
      url,
      asOf: quarterEndDate(quarter),
      savedAt: table.savedAt ?? "unknown",
      sheet: table.sheet,
      valueRow: table.valueRow,
      countRow: table.countRow,
      firstQuarter: newest[0] ?? quarter,
      annualTotalsChecked: table.annualTotalsChecked,
    });
  }

  const releaseQuarters = releases.map((release) => release.quarter);
  const lastQuarter = releaseQuarters[releaseQuarters.length - 1] ?? FIRST_QUARTER;
  const quarters: VentureDataset["quarters"] = [];
  for (let index = quarterIndex(FIRST_QUARTER); index <= quarterIndex(lastQuarter); index += 1) {
    const quarter = quarterFromIndex(index);
    const choice = selectMatureRelease(quarter, releaseQuarters);
    const matureRelease = choice ? releases.find((release) => release.quarter === choice.release) : undefined;
    const matureTable = choice ? tables.get(choice.release) : undefined;
    const ownRelease = releases.find((release) => release.quarter === quarter);
    const ownTable = tables.get(quarter);
    quarters.push({
      quarter,
      mature: choice && matureRelease && matureTable ? buildPair(quarter, matureRelease, matureTable, choice.immature) : null,
      firstPublished: ownRelease && ownTable ? buildPair(quarter, ownRelease, ownTable, true) : null,
    });
  }

  return {
    schemaVersion: 1,
    about:
      "U.S. venture deal value (USD billions) and deal count by quarter, read from the 'Deal value ($B)' and 'Deal count' rows of the PitchBook-NVCA Venture Monitor's public summary spreadsheets. Figures and citations only.",
    registration: "docs/research/premise-test-preregistration.md",
    generator: "scripts/research/ventureFundraising.ts",
    vintageRule: VINTAGE_RULE,
    releases,
    unretrieved: UNRETRIEVED_RELEASES,
    quarters,
  };
};

/**
 * Everything wrong with a dataset, offline: its shape, that each pair cites a
 * listed release, that the release is the one the vintage rule picks, that the
 * year-earlier quarter is t−4, and that the quarters run unbroken. Empty means valid.
 */
export const validateVentureDataset = (raw: unknown): string[] => {
  const parsed = VentureDatasetSchema.safeParse(raw);
  if (!parsed.success) {
    return parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
  }
  const dataset = parsed.data;
  const problems: string[] = [];
  const releases = new Map(dataset.releases.map((release) => [release.quarter, release]));
  const releaseQuarters = [...releases.keys()];
  if (releaseQuarters.length !== dataset.releases.length) {
    problems.push("releases: a quarter is listed twice");
  }

  dataset.quarters.forEach((row, index) => {
    if (index > 0 && quarterIndex(row.quarter) !== quarterIndex(dataset.quarters[index - 1].quarter) + 1) {
      problems.push(`${row.quarter}: quarters are not contiguous`);
    }
    const check = (pair: Pair | null, kind: "mature" | "firstPublished") => {
      if (!pair) {
        return;
      }
      const release = releases.get(pair.release);
      if (!release) {
        problems.push(`${row.quarter} ${kind}: cites unlisted release ${pair.release}`);
        return;
      }
      if (release.url !== pair.url) {
        problems.push(`${row.quarter} ${kind}: url differs from release ${pair.release}`);
      }
      if (pair.yearEarlier.quarter !== shiftQuarter(row.quarter, -4)) {
        problems.push(`${row.quarter} ${kind}: year-earlier quarter is ${pair.yearEarlier.quarter}`);
      }
      if (quarterIndex(release.firstQuarter) > quarterIndex(pair.yearEarlier.quarter)) {
        problems.push(`${row.quarter} ${kind}: release ${pair.release} starts after ${pair.yearEarlier.quarter}`);
      }
      if (quarterIndex(pair.release) < quarterIndex(row.quarter)) {
        problems.push(`${row.quarter} ${kind}: release ${pair.release} predates the quarter`);
      }
    };
    check(row.mature, "mature");
    check(row.firstPublished, "firstPublished");

    const expected = selectMatureRelease(row.quarter, releaseQuarters);
    if (row.mature && (row.mature.release !== expected?.release || row.mature.immature !== expected.immature)) {
      problems.push(`${row.quarter}: mature pair cites ${row.mature.release}, the rule picks ${expected?.release}`);
    }
    if (row.firstPublished && row.firstPublished.release !== row.quarter) {
      problems.push(`${row.quarter}: first-published pair cites ${row.firstPublished.release}`);
    }
    if (!row.firstPublished && releases.has(row.quarter)) {
      problems.push(`${row.quarter}: its own release is listed but no first-published pair is recorded`);
    }
    if (
      row.mature &&
      row.firstPublished &&
      row.mature.release === row.firstPublished.release &&
      row.mature.current.dealCount !== row.firstPublished.current.dealCount
    ) {
      problems.push(`${row.quarter}: one release gives two different counts`);
    }
  });
  return problems;
};

const main = () => {
  const args = new Set(process.argv.slice(2));
  if (args.has("--write")) {
    const dataset = buildDataset();
    const problems = validateVentureDataset(dataset);
    if (problems.length > 0) {
      throw new Error(`Built dataset is invalid:\n${problems.join("\n")}`);
    }
    writeFileSync(VENTURE_DATASET_PATH, `${JSON.stringify(dataset, null, 2)}\n`);
    process.stdout.write(`[venture] wrote ${dataset.quarters.length} quarters from ${dataset.releases.length} releases\n`);
    return;
  }
  if (args.has("--check")) {
    const problems = validateVentureDataset(JSON.parse(readFileSync(VENTURE_DATASET_PATH, "utf8")));
    if (problems.length > 0) {
      process.stderr.write(`[venture] ${VENTURE_DATASET_PATH} is invalid:\n${problems.join("\n")}\n`);
      process.exit(1);
    }
    process.stdout.write(`[venture] ${VENTURE_DATASET_PATH} is valid\n`);
    return;
  }
  process.stderr.write("Usage: bun scripts/research/ventureFundraising.ts --write | --check\n");
  process.exit(2);
};

if (import.meta.main) {
  main();
}
