import { spawnSync } from "node:child_process";

const baseUrl = (process.argv[2] ?? "https://whether.work").replace(/\/$/, "");
const strictHtmlChecks = process.env.WHETHER_SMOKE_STRICT_HTML === "1";

const pageChecks = [
  { path: "/", required: ["weekly brief", "share-ready-artifact", "build this week's plan"] },
  { path: "/evidence", required: ["evidence", "what this means now"] },
  { path: "/planning", required: ["planning", "weekly plan", "decision help"] },
  { path: "/resolve", required: ["resolve", "toolkit-library"] },
  { path: "/acceptable-use-policy", required: ["acceptable use"] },
  { path: "/terms-of-service", required: ["terms of service"] },
];

const redirectChecks = [
  { from: "/learn", to: "/trust" },
];

const retiredRouteChecks = ["/templates"];

const weeklyRequiredKeys = [
  "summary",
  "copy",
  "structured",
  "provenance",
  "recordDateLabel",
  "agentHandoff",
  "summaryHash",
  "generatedAt",
  "version",
];

const healthStatuses = new Set(["ok", "degraded", "down"]);

const fail = (message) => {
  console.error(`❌ ${message}`);
  process.exit(1);
};

/**
 * Fold typographic punctuation to ASCII before comparing markers.
 *
 * The markers above are hand-written with ASCII quotes; the pages render curly
 * ones. On 2026-09-01 the homepage CTA became `Build this week’s plan` (U+2019)
 * while this file still asked for `build this week's plan` (U+0027), and the check
 * reported the marker missing on a page that was rendering it correctly — the one
 * failure mode a post-deploy smoke test cannot afford, because it is indistinguishable
 * from a real outage until someone diffs the bytes.
 *
 * Only quotes are folded. Dashes and ellipses are deliberately left alone: folding
 * widens what counts as a match, and a smoke check earns its keep by being narrow.
 */
const normalizeForMatch = (value) =>
  value
    .toLowerCase()
    .replace(/[\u2018\u2019\u201a\u201b]/g, "'")
    .replace(/[\u201c\u201d\u201e\u201f]/g, '"');

const curl = (url) => {
  const command = spawnSync(
    "curl",
    [
      "-sS",
      "-L",
      "--max-time",
      "25",
      "-A",
      "Whether-Prod-Synthetic-Smoke/1.0 (+https://github.com/zz-plant/whether)",
      "-H",
      "Accept: text/html,application/json;q=0.9,*/*;q=0.8",
      "-w",
      "\n__STATUS__:%{http_code}\n__EFFECTIVE_URL__:%{url_effective}",
      url,
    ],
    { encoding: "utf8" },
  );

  if (command.status !== 0) {
    fail(`curl failed for ${url}: ${command.stderr.trim() || "unknown error"}`);
  }

  const statusMarker = "\n__STATUS__:";
  const statusIndex = command.stdout.lastIndexOf(statusMarker);
  if (statusIndex < 0) {
    fail(`could not parse response status for ${url}`);
  }

  const effectiveUrlMarker = "\n__EFFECTIVE_URL__:";
  const effectiveUrlIndex = command.stdout.lastIndexOf(effectiveUrlMarker);
  if (effectiveUrlIndex < 0 || effectiveUrlIndex < statusIndex) {
    fail(`could not parse effective URL for ${url}`);
  }

  const body = command.stdout.slice(0, statusIndex);
  const status = Number(command.stdout.slice(statusIndex + statusMarker.length, effectiveUrlIndex).trim());
  const effectiveUrl = command.stdout.slice(effectiveUrlIndex + effectiveUrlMarker.length).trim();

  return { body, status, effectiveUrl };
};

const run = async () => {
  console.log(`Running synthetic smoke against ${baseUrl}`);
  let htmlChecksBlockedByEdgePolicy = false;

  for (const check of pageChecks) {
    const response = curl(`${baseUrl}${check.path}`);
    if (response.status === 403 && !strictHtmlChecks) {
      htmlChecksBlockedByEdgePolicy = true;
      console.warn(`⚠️ ${check.path} returned 403 from this runner; skipping HTML route checks and continuing with public API contract checks.`);
      break;
    }

    if (response.status !== 200) {
      fail(`${check.path} returned ${response.status} (expected 200)`);
    }

    const html = normalizeForMatch(response.body);
    for (const required of check.required) {
      if (!html.includes(normalizeForMatch(required))) {
        fail(`${check.path} missing expected marker: ${required}`);
      }
    }

    console.log(`✅ ${check.path} content checks passed`);
  }


  for (const redirectCheck of htmlChecksBlockedByEdgePolicy ? [] : redirectChecks) {
    const response = curl(`${baseUrl}${redirectCheck.from}`);
    if (response.status !== 200) {
      fail(`${redirectCheck.from} should resolve to 200 via redirect chain, got ${response.status}`);
    }

    const expectedEffectiveUrl = `${baseUrl}${redirectCheck.to}`;
    const resolvedEffectiveUrl = response.effectiveUrl.replace(/#.*$/, "");

    if (resolvedEffectiveUrl !== expectedEffectiveUrl) {
      fail(`${redirectCheck.from} resolved to ${response.effectiveUrl} instead of canonical ${expectedEffectiveUrl}`);
    }

    console.log(`✅ ${redirectCheck.from} redirect checks passed`);
  }

  for (const retiredPath of htmlChecksBlockedByEdgePolicy ? [] : retiredRouteChecks) {
    const response = curl(`${baseUrl}${retiredPath}`);
    if (response.status !== 404) {
      fail(`${retiredPath} should return 404 after route retirement, got ${response.status}`);
    }

    console.log(`✅ ${retiredPath} retired-route checks passed`);
  }

  const weeklyResponse = curl(`${baseUrl}/api/weekly`);
  if (weeklyResponse.status !== 200) {
    fail(`/api/weekly returned ${weeklyResponse.status} (expected 200)`);
  }

  const weeklyPayload = JSON.parse(weeklyResponse.body);
  for (const key of weeklyRequiredKeys) {
    if (!(key in weeklyPayload)) {
      fail(`/api/weekly missing required key: ${key}`);
    }
  }

  if (weeklyPayload.version !== "v1") {
    fail(`/api/weekly version mismatch. Expected v1, received ${weeklyPayload.version}`);
  }

  if (Number.isNaN(Date.parse(weeklyPayload.generatedAt))) {
    fail("/api/weekly generatedAt is not a valid timestamp");
  }

  console.log("✅ /api/weekly schema checks passed");

  const agentRequiredKeys = [
    "cadence",
    "summary",
    "agentHandoff",
    "links",
    "generatedAt",
    "version",
  ];

  const agentResponse = curl(`${baseUrl}/api/agent?cadence=weekly`);
  if (agentResponse.status !== 200) {
    fail(`/api/agent returned ${agentResponse.status} (expected 200)`);
  }

  const agentPayload = JSON.parse(agentResponse.body);
  for (const key of agentRequiredKeys) {
    if (!(key in agentPayload)) {
      fail(`/api/agent missing required key: ${key}`);
    }
  }

  if (agentPayload.agentHandoff.payload.skills.length === 0) {
    fail("/api/agent agentHandoff.payload.skills is empty");
  }

  if (agentPayload.agentHandoff.prompt.length === 0) {
    fail("/api/agent agentHandoff.prompt is empty");
  }

  if (Number.isNaN(Date.parse(agentPayload.generatedAt))) {
    fail("/api/agent generatedAt is not a valid timestamp");
  }

  console.log("✅ /api/agent schema checks passed");

  const healthResponse = curl(`${baseUrl}/api/health`);
  if (![200, 503].includes(healthResponse.status)) {
    fail(`/api/health returned ${healthResponse.status} (expected 200 or 503)`);
  }

  const healthPayload = JSON.parse(healthResponse.body);
  if (!healthStatuses.has(healthPayload.status)) {
    fail(`/api/health status should be ok/degraded/down. Received ${healthPayload.status}`);
  }

  if (!healthPayload.dependencies?.reportData) {
    fail("/api/health missing dependencies.reportData");
  }

  console.log("✅ /api/health checks passed");
  console.log("✅ synthetic smoke completed successfully");
};

run().catch((error) => {
  fail(`synthetic smoke failed with exception: ${error instanceof Error ? error.message : String(error)}`);
});
