/**
 * Generate the weekly Slack brief text into `artifacts/weekly-slack-brief.txt`
 * (gitignored), the input `bun run audit:jev-copy -- --mode brief` judges.
 *
 * Refuses data that is not live, for the same reason the freeze does: a run
 * during a live-data outage used to write the bundled snapshot under a "Weekly
 * Brief" heading and exit 0. The committed copy this script also wrote,
 * `docs/briefs/latest-weekly-slack-brief.md`, sat on a 2026-06-17 snapshot for
 * ten weeks that way, went stale again from 2026-09-14, and was deleted on
 * 2026-10-06: nothing read it, and `/share`, `GET /api/brief/slack` and the
 * Monday post all build this same text from the live read.
 *
 * Pass `--allow-fallback` for local or offline artifact generation; the output
 * is then stamped so nobody mistakes it for a live reading.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { buildSlackBrief } from "../lib/export/briefBuilders";
import { loadReportData } from "../lib/report/reportData";
import { assessPublishReadiness } from "../lib/report/briefPublishGuard";
import { buildBriefDocumentFromReport } from "../lib/report/briefDocument";
import { isSavedCopy } from "../lib/report/provenanceStatus";
import { ENGINE_VERSION } from "../lib/regimeEngine";
import { buildBriefAuditBundle } from "./jev-artifact-audit";

const run = async () => {
  const { values } = parseArgs({
    options: {
      out: { type: "string", default: "artifacts/weekly-slack-brief.txt" },
      "allow-fallback": { type: "boolean", default: false },
    },
  });

  const reportData = await loadReportData();
  const { treasury } = reportData;

  const readiness = assessPublishReadiness({
    degraded: false,
    isFallback: isSavedCopy(treasury),
    isLive: treasury.isLive,
    fallbackReason: treasury.fallback_reason,
    macroSeries: reportData.macroSeries,
    recordDate: treasury.record_date ?? treasury.fetched_at,
    now: new Date(),
  });

  if (!readiness.ok && !values["allow-fallback"]) {
    console.error(`Refusing to publish the weekly brief: ${readiness.reason}`);
    console.error("Pass --allow-fallback to write it anyway for local use; it will be stamped as not live.");
    process.exit(1);
  }

  /* The Monday post's text, under the call every page serves. With no options this
     printed stand-ins: "Keep last week's approvals as they are; start nothing new."
     as the action, and the assessment's description as the guidance. */
  const document = await buildBriefDocumentFromReport(reportData, { degraded: false });
  const brief = buildSlackBrief(document);
  const fallbackNotice = readiness.ok
    ? null
    : `NOT LIVE DATA — ${readiness.reason}`;
  const output = `${fallbackNotice ? `${fallbackNotice}\n\n` : ""}${brief}\n`;
  const outPath = values.out;
  const outDir = outPath.slice(0, outPath.lastIndexOf("/"));

  if (outDir) {
    await mkdir(outDir, { recursive: true });
  }

  await writeFile(outPath, output, "utf8");
  const engineVersion = reportData.operatingSnapshot ? reportData.operatingSnapshot.engineVersion ?? "unrecorded" : ENGINE_VERSION;
  await writeFile(`${outPath}.audit.json`, `${JSON.stringify(buildBriefAuditBundle(document, engineVersion, output), null, 2)}\n`, "utf8");
  console.log(`Wrote weekly Slack brief to ${outPath}`);
};

void run();
