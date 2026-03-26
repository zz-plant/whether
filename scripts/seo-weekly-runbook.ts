import { generateProgrammaticPayloadArtifacts } from "../lib/seo/programmaticPayloadBuilder";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - mjs helper is intentionally JS for script portability.
import { runSeoRefreshQueue } from "./seo-refresh-queue.mjs";

const payloadResult = await generateProgrammaticPayloadArtifacts();
const refreshResult = await runSeoRefreshQueue();

console.log(`Programmatic payloads generated: ${payloadResult.records.length} routes (version ${payloadResult.version}).`);
console.log(
  `Refresh queue generated: ${refreshResult.queueArtifact.totals.queued}/${refreshResult.queueArtifact.totals.pages} queued, ${refreshResult.queueArtifact.totals.noindexNow} immediate noindex.`,
);
