import { spawnSync } from "node:child_process";

const baseUrl = (process.argv[2] ?? "https://whether.work").replace(/\/$/, "");

const pageChecks = [
  { path: "/", required: ["weekly-posture-brief-title", "share-ready-artifact", "approve-this-weeks-plan"] },
  { path: "/evidence", required: ["signal"] },
  { path: "/planning", required: ["operations"] },
  { path: "/toolkits", required: ["toolkits"] },
  { path: "/resolve", required: ["decide"] },
  { path: "/planning/data", required: ["data"] },
  { path: "/acceptable-use-policy", required: ["acceptable use"] },
  { path: "/terms-of-service", required: ["terms of service"] },
];

const redirectChecks = [
  { from: "/learn", to: "/trust" },
];

const retiredRouteChecks = ["/operate", "/templates"];

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

const curl = (url) => {
  const command = spawnSync(
    "curl",
    ["-sS", "-L", "--max-time", "25", "-w", "\n__STATUS__:%{http_code}\n__EFFECTIVE_URL__:%{url_effective}", url],
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

  for (const check of pageChecks) {
    const response = curl(`${baseUrl}${check.path}`);
    if (response.status !== 200) {
      fail(`${check.path} returned ${response.status} (expected 200)`);
    }

    const html = response.body.toLowerCase();
    for (const required of check.required) {
      if (!html.includes(required.toLowerCase())) {
        fail(`${check.path} missing expected marker: ${required}`);
      }
    }

    console.log(`✅ ${check.path} content checks passed`);
  }


  for (const redirectCheck of redirectChecks) {
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

  for (const retiredPath of retiredRouteChecks) {
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

  const healthResponse = curl(`${baseUrl}/api/health`);
  if (![200, 503].includes(healthResponse.status)) {
    fail(`/api/health returned ${healthResponse.status} (expected 200 or 503)`);
  }

  const healthPayload = JSON.parse(healthResponse.body);
  if (!healthStatuses.has(healthPayload.status)) {
    fail(`/api/health status should be ok/degraded/down. Received ${healthPayload.status}`);
  }

  if (!healthPayload.checks?.treasuryData) {
    fail("/api/health missing checks.treasuryData");
  }

  console.log("✅ /api/health checks passed");
  console.log("✅ synthetic smoke completed successfully");
};

run().catch((error) => {
  fail(`synthetic smoke failed with exception: ${error instanceof Error ? error.message : String(error)}`);
});
