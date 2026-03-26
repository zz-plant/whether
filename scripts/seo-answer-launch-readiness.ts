import { scoreAnswerLaunchReadiness, summarizeAnswerLaunchReadiness } from "../lib/seo/answerLaunchReadiness";

const records = scoreAnswerLaunchReadiness();
const summary = summarizeAnswerLaunchReadiness(records);

console.log(`Answer launch readiness: ${summary.eligible}/${summary.total} eligible (${summary.blocked} blocked).`);

if (summary.blocked > 0) {
  for (const blocked of summary.blockedSlugs) {
    console.error(`- ${blocked.slug}: ${blocked.reasons.join(", ")}`);
  }
  process.exitCode = 1;
}
