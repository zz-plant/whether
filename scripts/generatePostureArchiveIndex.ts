/**
 * Posture archive index generator: `bun run archive:index`.
 *
 * Compresses `data/summary_archive.json` into the per-period records the static
 * `/history/[period]` routes render, the year list, the OG timeline and the month-end
 * extract the confidence record reads. The builder is `lib/summary/postureArchiveIndex.ts`
 * and the write is `writePostureArchiveIndex` (`lib/summary/regimeArchiveFiles.ts`), which
 * the Worker's archive rebuild runs too.
 */
import { workingTreeStore } from "./dataFileStore";
import { writePostureArchiveIndex } from "../lib/summary/regimeArchiveFiles";

const { periods, calibrationMonths } = await writePostureArchiveIndex(workingTreeStore);

const yearCount = periods.filter((period) => period.kind === "year").length;
const quarterCount = periods.filter((period) => period.kind === "quarter").length;
console.log(
  `Wrote ${periods.length} posture archive periods (${yearCount} yearly, ${quarterCount} quarterly), compact OG timeline data, and ${calibrationMonths.length} confidence-record months`,
);
