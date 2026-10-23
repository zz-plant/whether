/** Explicit local-model smoke evaluation; excluded from the offline test/deploy gate. */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { evidenceCandidateSchema } from "../../lib/jev/auditRequests";
import { retrieveEvidence } from "../retrieve-evidence";

const suite = z.object({
  description: z.string(), candidates: z.array(evidenceCandidateSchema),
  cases: z.array(z.object({ id: z.string(), guidance: z.string(), expected: z.array(z.string()).min(1), limit: z.number().int().min(1).max(16) })),
}).parse(JSON.parse(readFileSync("tests/fixtures/evidence-retrieval.json", "utf8")));
const cases = [];
for (const item of suite.cases) {
  try {
    const result = await retrieveEvidence({ canonical: {
      recordDate: "2026-10-15", readingId: `fixture-${item.id}`, engineVersion: "hypothetical-fixture",
      guidance: item.guidance, sourceUrl: "https://example.com/fixture/brief",
    }, candidates: suite.candidates }, { limit: item.limit, cachePath: "artifacts/evidence-retrieval/cache.json" });
    const retrieved = result.candidates.map((candidate) => candidate.id);
    const hits = item.expected.filter((id) => retrieved.includes(id)).length;
    cases.push({ id: item.id, expected: item.expected, recallAtK: hits / item.expected.length, result });
  } catch (error) {
    cases.push({ id: item.id, expected: item.expected, recallAtK: null, error: error instanceof Error ? error.message : "retrieval failed" });
  }
}
const reportPath = "artifacts/evidence-retrieval/evaluation.json";
mkdirSync(path.dirname(reportPath), { recursive: true });
writeFileSync(reportPath, `${JSON.stringify({ generatedAt: new Date().toISOString(), description: suite.description, cases }, null, 2)}\n`);
console.log(JSON.stringify({ reportPath, cases: cases.map((item) => ({ id: item.id, recallAtK: item.recallAtK })) }, null, 2));
process.exitCode = cases.some((item) => item.recallAtK === null) ? 1 : 0;
