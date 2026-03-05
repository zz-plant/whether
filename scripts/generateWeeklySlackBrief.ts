import { mkdir, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { buildSlackBrief } from "../lib/export/briefBuilders";
import { loadReportData } from "../lib/report/reportData";

const run = async () => {
  const { values } = parseArgs({
    options: {
      out: { type: "string", default: "artifacts/weekly-slack-brief.txt" },
      format: { type: "string", default: "text" },
    },
  });

  const { assessment, treasury, sensors, macroSeries } = await loadReportData();
  const brief = buildSlackBrief(assessment, treasury, sensors, macroSeries);
  const format = values.format === "markdown" ? "markdown" : "text";
  const output =
    format === "markdown"
      ? [
          "# Latest Weekly Slack Brief",
          "",
          `Generated from Whether data snapshot: **${treasury.record_date}**.`,
          "",
          "```text",
          brief,
          "```",
          "",
        ].join("\n")
      : `${brief}\n`;
  const outPath = values.out;
  const outDir = outPath.slice(0, outPath.lastIndexOf("/"));

  if (outDir) {
    await mkdir(outDir, { recursive: true });
  }

  await writeFile(outPath, output, "utf8");
  console.log(`Wrote weekly Slack brief ${format} output to ${outPath}`);
};

void run();
