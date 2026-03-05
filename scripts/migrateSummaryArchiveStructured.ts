import { readFile, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { buildMonthlyStructured } from "../lib/summary/monthlySummary";
import { buildWeeklyStructured } from "../lib/summary/weeklySummary";
import { getGovernanceParametersForPosture } from "../lib/policy/governance";

type ArchiveEntry = {
  cadence?: "weekly" | "monthly" | "quarterly" | "yearly";
  week?: number;
  month?: number;
  summary?: {
    regime?: "SCARCITY" | "DEFENSIVE" | "VOLATILE" | "EXPANSION";
    constraints?: string[];
    provenance?: {
      sourceLabel: string;
      sourceUrl?: string;
      timestampLabel: string;
      ageLabel: string;
      statusLabel: string;
    };
    structured?: unknown;
  };
};

const ARCHIVE_PATH = "data/summary_archive.json";

const postureFromRegime = (regime: ArchiveEntry["summary"] extends infer S ? S extends { regime?: infer R } ? R : never : never) =>
  regime === "EXPANSION" ? "RISK_ON" : regime === "SCARCITY" ? "SAFETY_MODE" : "TRANSITION";

const run = async () => {
  const { values } = parseArgs({
    options: {
      write: { type: "boolean", default: false },
    },
  });

  const raw = JSON.parse(await readFile(ARCHIVE_PATH, "utf8")) as ArchiveEntry[];

  let weeklyHydrated = 0;
  let monthlyHydrated = 0;

  const migrated = raw.map((entry) => {
    const normalizedEntry =
      !entry.cadence && entry.week
        ? { ...entry, cadence: "weekly" as const }
        : !entry.cadence && entry.month
          ? { ...entry, cadence: "monthly" as const }
          : entry;

    if (!normalizedEntry.summary?.structured && (normalizedEntry.cadence === "weekly" || normalizedEntry.week)) {
      weeklyHydrated += 1;
      return {
        ...normalizedEntry,
        summary: {
          ...normalizedEntry.summary,
          structured: buildWeeklyStructured({
            regime: normalizedEntry.summary?.regime ?? "VOLATILE",
            constraints: normalizedEntry.summary?.constraints ?? [],
            governanceParameters: getGovernanceParametersForPosture(
              postureFromRegime(normalizedEntry.summary?.regime),
              false,
            ),
          }),
        },
      };
    }

    if (!normalizedEntry.summary?.structured && (normalizedEntry.cadence === "monthly" || normalizedEntry.month)) {
      monthlyHydrated += 1;
      return {
        ...normalizedEntry,
        summary: {
          ...normalizedEntry.summary,
          structured: buildMonthlyStructured({
            constraints: normalizedEntry.summary?.constraints ?? [],
            provenance: normalizedEntry.summary?.provenance ?? {
              sourceLabel: "Unknown",
              timestampLabel: "Unknown",
              ageLabel: "Unknown",
              statusLabel: "Unknown",
            },
          }),
        },
      };
    }

    return normalizedEntry;
  });

  if (values.write) {
    await writeFile(ARCHIVE_PATH, `${JSON.stringify(migrated, null, 2)}\n`, "utf8");
  }

  console.log(
    JSON.stringify(
      {
        entries: raw.length,
        weeklyHydrated,
        monthlyHydrated,
        wroteFile: values.write,
      },
      null,
      2,
    ),
  );
};

void run();
