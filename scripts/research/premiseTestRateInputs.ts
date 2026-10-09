/**
 * The rate inputs the premise test needs beyond the bundled month-end cache
 * (docs/research/premise-test-preregistration.md §7.4 and §8.4):
 *
 * - one-month-bill month-ends for 2002–2011, the trailing window the
 *   ten-year-percentile candidate reads for 2012–2021 readings;
 * - the one-month bill, three-month bill and effective federal funds rate on
 *   every registered dislocation pair (each archive month-end with its mid-month
 *   reference, and every date of the three debt-ceiling windows).
 *
 *   bun scripts/research/premiseTestRateInputs.ts --write   fetch FRED and rebuild the file
 *   bun scripts/research/premiseTestRateInputs.ts --check   validate the committed file, offline
 */
import { readFileSync, writeFileSync } from "node:fs";
import { z } from "zod";
import { fetchSeries, type SeriesDataset } from "../regimeArchiveContext";
import { getTimeMachineSnapshots } from "../../lib/timeMachine/timeMachineCache";

export const RATE_INPUTS_PATH = "data/research/premise-test-rate-inputs.json";

const FIRST_WINDOW_MONTH = "2002-01";
const LAST_WINDOW_MONTH = "2011-12";

/** The three registered debt-ceiling windows, each with its fixed reference date. */
export const DEBT_CEILING_EPISODES = [
  { set: "debt-ceiling-2013", reference: "2013-09-03", from: "2013-09-04", to: "2013-10-31" },
  { set: "debt-ceiling-2021", reference: "2021-09-01", from: "2021-09-02", to: "2021-12-31" },
  { set: "debt-ceiling-2023", reference: "2023-04-03", from: "2023-04-04", to: "2023-06-15" },
] as const;

const SetSchema = z.enum(["month-end", "debt-ceiling-2013", "debt-ceiling-2021", "debt-ceiling-2023"]);
const IsoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const RatesSchema = z.object({ oneMonth: z.number(), threeMonth: z.number(), fedFunds: z.number() });

export const RateInputsSchema = z.object({
  schemaVersion: z.literal(1),
  registration: z.literal("docs/research/premise-test-preregistration.md"),
  generator: z.literal("scripts/research/premiseTestRateInputs.ts"),
  series: z.object({ DGS1MO: z.string().url(), DGS3MO: z.string().url(), DFF: z.string().url() }),
  oneMonthBillMonthEnds: z.array(z.object({ month: z.string().regex(/^\d{4}-\d{2}$/), date: IsoDate, value: z.number() })),
  dislocationPairs: z.array(
    z.object({ set: SetSchema, date: IsoDate, reference: IsoDate, atDate: RatesSchema, atReference: RatesSchema }),
  ),
});

export type RateInputs = z.infer<typeof RateInputsSchema>;
type DislocationPair = RateInputs["dislocationPairs"][number];

const nextMonth = (month: string): string => {
  const [year, monthNumber] = month.split("-").map(Number);
  return monthNumber === 12 ? `${year + 1}-01` : `${year}-${String(monthNumber + 1).padStart(2, "0")}`;
};

/** Dates on which all three series print, ascending. */
const commonDates = (datasets: SeriesDataset[]): string[] =>
  [...datasets[0].map.keys()].filter((date) => datasets.every((dataset) => dataset.map.has(date))).sort();

const ratesOn = (date: string, oneMonth: SeriesDataset, threeMonth: SeriesDataset, fedFunds: SeriesDataset) => {
  const rates = { oneMonth: oneMonth.map.get(date), threeMonth: threeMonth.map.get(date), fedFunds: fedFunds.map.get(date) };
  if (rates.oneMonth === undefined || rates.threeMonth === undefined || rates.fedFunds === undefined) {
    throw new Error(`A series has no print on ${date}.`);
  }
  return { oneMonth: rates.oneMonth, threeMonth: rates.threeMonth, fedFunds: rates.fedFunds };
};

/** The latest date on or before the 15th of the date's month on which all three series print. */
export const midMonthReference = (date: string, printing: readonly string[]): string | null => {
  const limit = `${date.slice(0, 7)}-15`;
  const candidates = printing.filter((candidate) => candidate.startsWith(date.slice(0, 7)) && candidate <= limit);
  return candidates.at(-1) ?? null;
};

const build = async (): Promise<RateInputs> => {
  const [oneMonth, threeMonth, fedFunds] = await Promise.all([fetchSeries("DGS1MO"), fetchSeries("DGS3MO"), fetchSeries("DFF")]);
  const printing = commonDates([oneMonth, threeMonth, fedFunds]);

  const oneMonthBillMonthEnds: RateInputs["oneMonthBillMonthEnds"] = [];
  for (let month = FIRST_WINDOW_MONTH; month <= LAST_WINDOW_MONTH; month = nextMonth(month)) {
    const date = [...oneMonth.map.keys()].filter((candidate) => candidate.startsWith(month)).sort().at(-1);
    const value = date ? oneMonth.map.get(date) : undefined;
    if (!date || value === undefined) {
      throw new Error(`No one-month-bill print in ${month}.`);
    }
    oneMonthBillMonthEnds.push({ month, date, value });
  }

  const dislocationPairs: DislocationPair[] = [];
  for (const snapshot of getTimeMachineSnapshots()) {
    const date = snapshot.record_date;
    const reference = midMonthReference(date, printing);
    if (!reference) {
      throw new Error(`No mid-month reference for ${date}.`);
    }
    dislocationPairs.push({
      set: "month-end",
      date,
      reference,
      atDate: ratesOn(date, oneMonth, threeMonth, fedFunds),
      atReference: ratesOn(reference, oneMonth, threeMonth, fedFunds),
    });
  }
  for (const episode of DEBT_CEILING_EPISODES) {
    const atReference = ratesOn(episode.reference, oneMonth, threeMonth, fedFunds);
    for (const date of printing.filter((candidate) => candidate >= episode.from && candidate <= episode.to)) {
      dislocationPairs.push({
        set: episode.set,
        date,
        reference: episode.reference,
        atDate: ratesOn(date, oneMonth, threeMonth, fedFunds),
        atReference,
      });
    }
  }

  return {
    schemaVersion: 1,
    registration: "docs/research/premise-test-preregistration.md",
    generator: "scripts/research/premiseTestRateInputs.ts",
    series: {
      DGS1MO: "https://fred.stlouisfed.org/series/DGS1MO",
      DGS3MO: "https://fred.stlouisfed.org/series/DGS3MO",
      DFF: "https://fred.stlouisfed.org/series/DFF",
    },
    oneMonthBillMonthEnds,
    dislocationPairs,
  };
};

/**
 * Everything wrong with the file, offline. Beyond its shape: the 120 window
 * month-ends run unbroken, each month-end pair sits on an archive record date
 * with the archive's own bill values, its reference is on or before the 15th of
 * the same month, and every episode date sits inside its registered window.
 */
export const validateRateInputs = (raw: unknown): string[] => {
  const parsed = RateInputsSchema.safeParse(raw);
  if (!parsed.success) {
    return parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
  }
  const inputs = parsed.data;
  const problems: string[] = [];

  let expectedMonth = FIRST_WINDOW_MONTH;
  for (const entry of inputs.oneMonthBillMonthEnds) {
    if (entry.month !== expectedMonth || !entry.date.startsWith(entry.month)) {
      problems.push(`window month-end ${entry.month}: expected ${expectedMonth}`);
    }
    expectedMonth = nextMonth(expectedMonth);
  }
  if (inputs.oneMonthBillMonthEnds.length !== 120) {
    problems.push(`window month-ends: ${inputs.oneMonthBillMonthEnds.length}, expected 120`);
  }

  const archive = new Map(getTimeMachineSnapshots().map((snapshot) => [snapshot.record_date, snapshot.yields]));
  const monthEnds = inputs.dislocationPairs.filter((pair) => pair.set === "month-end");
  if (monthEnds.length !== archive.size) {
    problems.push(`month-end pairs: ${monthEnds.length}, the archive has ${archive.size} record dates`);
  }
  for (const pair of monthEnds) {
    const yields = archive.get(pair.date);
    if (!yields) {
      problems.push(`month-end pair ${pair.date}: not an archive record date`);
    } else if (yields.oneMonth !== pair.atDate.oneMonth || yields.threeMonth !== pair.atDate.threeMonth) {
      problems.push(`month-end pair ${pair.date}: bills differ from the archive`);
    }
    if (!pair.reference.startsWith(pair.date.slice(0, 7)) || pair.reference > `${pair.date.slice(0, 7)}-15`) {
      problems.push(`month-end pair ${pair.date}: reference ${pair.reference} is not on or before the 15th`);
    }
  }
  for (const episode of DEBT_CEILING_EPISODES) {
    const dates = inputs.dislocationPairs.filter((pair) => pair.set === episode.set);
    if (dates.length === 0) {
      problems.push(`${episode.set}: no dates`);
    }
    for (const pair of dates) {
      if (pair.reference !== episode.reference || pair.date < episode.from || pair.date > episode.to) {
        problems.push(`${episode.set} ${pair.date}: outside the registered window or reference`);
      }
    }
  }
  return problems;
};

const main = async () => {
  const args = new Set(process.argv.slice(2));
  if (args.has("--write")) {
    const inputs = await build();
    const problems = validateRateInputs(inputs);
    if (problems.length > 0) {
      throw new Error(`Built rate inputs are invalid:\n${problems.join("\n")}`);
    }
    writeFileSync(RATE_INPUTS_PATH, `${JSON.stringify(inputs, null, 2)}\n`);
    process.stdout.write(
      `[rate-inputs] wrote ${inputs.oneMonthBillMonthEnds.length} window month-ends and ${inputs.dislocationPairs.length} dislocation pairs\n`,
    );
    return;
  }
  if (args.has("--check")) {
    const problems = validateRateInputs(JSON.parse(readFileSync(RATE_INPUTS_PATH, "utf8")));
    if (problems.length > 0) {
      process.stderr.write(`[rate-inputs] ${RATE_INPUTS_PATH} is invalid:\n${problems.join("\n")}\n`);
      process.exit(1);
    }
    process.stdout.write(`[rate-inputs] ${RATE_INPUTS_PATH} is valid\n`);
    return;
  }
  process.stderr.write("Usage: bun scripts/research/premiseTestRateInputs.ts --write | --check\n");
  process.exit(2);
};

if (import.meta.main) {
  await main();
}
