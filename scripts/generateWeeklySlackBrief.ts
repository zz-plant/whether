import { mkdir, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { buildSlackBrief } from "../lib/export/briefBuilders";
import { loadReportData } from "../lib/report/reportData";

const run = async () => {
  const { values } = parseArgs({
    options: {
      out: { type: "string", default: "artifacts/weekly-slack-brief.txt" },
    },
  });

  const { assessment, treasury, sensors, macroSeries } = await loadReportData();
  const brief = buildSlackBrief(assessment, treasury, sensors, macroSeries);
  const outPath = values.out;
  const outDir = outPath.slice(0, outPath.lastIndexOf("/"));

  if (outDir) {
    await mkdir(outDir, { recursive: true });
  }

  await writeFile(outPath, `${brief}\n`, "utf8");
  console.log(`Wrote weekly Slack brief artifact to ${outPath}`);
};

void run();
