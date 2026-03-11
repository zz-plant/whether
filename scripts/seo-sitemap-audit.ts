import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import sitemap from "../app/sitemap";
import { buildSeoSitemapAudit } from "../lib/seoSitemapAudit";

const outputPath = resolve(process.cwd(), "artifacts", "seo-sitemap-audit.json");

const run = async () => {
  const indexable = await sitemap({ programmaticEligible: true });
  const nonIndexable = await sitemap({ programmaticEligible: false });
  const report = buildSeoSitemapAudit(indexable, nonIndexable);

  await mkdir(resolve(process.cwd(), "artifacts"), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log(`SEO sitemap audit generated at ${outputPath}`);
  console.table(
    report.families.map((family) => ({
      family: family.family,
      totalUrls: family.totalUrls,
      decisionContractRequired: family.decisionContractRequired,
      thinRiskUrls: family.thinRiskUrls,
    })),
  );
};

run().catch((error) => {
  console.error("Failed to run SEO sitemap audit.", error);
  process.exitCode = 1;
});
