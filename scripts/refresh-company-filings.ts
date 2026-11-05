/**
 * Rewrites data/company_filings.json, the floor the company pages read when KV has nothing.
 * Run after adding a company: `bun run companies:snapshot`. Needs the network, one company at a time.
 */
import { writeFile } from "node:fs/promises";
import { COMPANIES } from "../lib/companies/companyRegistry";
import { fetchSecRestructurings, readSecCompanyFigures } from "../lib/marketData/secEdgar";

const filings: Record<string, unknown> = {};
for (const company of COMPANIES) {
  const figures = await readSecCompanyFigures(company.cik, { cache: null });
  if (figures.status !== "ok") {
    throw new Error(`${company.ticker} cannot be in the list: ${figures.status === "refused" ? figures.refusal : figures.reason}`);
  }
  const restructurings = await fetchSecRestructurings(company.cik, new Date());
  if (restructurings.status !== "ok") throw new Error(`${company.ticker}: restructuring filings could not be read`);
  filings[company.ticker] = { ...figures.value, restructurings: restructurings.value };
  await new Promise((resolve) => setTimeout(resolve, 150));
}
await writeFile("data/company_filings.json", `${JSON.stringify({ generatedAt: new Date().toISOString(), filings }, null, 2)}\n`);
console.log(`[companies] wrote ${Object.keys(filings).length} filings`);
