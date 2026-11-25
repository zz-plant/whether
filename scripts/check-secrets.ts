#!/usr/bin/env bun
/**
 * Which of the Worker's secrets production holds, against the list in
 * `lib/runtime/deploymentSecrets.ts`, judged by production's switches in `cloudflare.config.ts`.
 *
 * Exits 1 when a required secret is missing. An optional one that is unset is listed with what
 * it costs and does not fail the run: whether the comps need a paid quote feed is the owner's
 * call, not this script's. Reads names only (`wrangler secret list`), never a value.
 *
 * Not in any gate: it needs Cloudflare credentials and the network, and the suite is offline.
 * `/api/health` asks the same question of the running Worker for the required ones.
 *
 * Usage:
 *   bun run secrets:check
 */
import { spawnSync } from "node:child_process";
import { z } from "zod";
import config from "../cloudflare.config";
import { DEPLOYMENT_SECRETS, laneFromConfigEnv, missingRequiredSecrets } from "../lib/runtime/deploymentSecrets";

const WORKER = "whether";

const ConfigSchema = z.object({
  worker: z.object({ env: z.record(z.string(), z.object({ type: z.string(), value: z.unknown().optional() }).loose()) }),
});
const SecretListSchema = z.array(z.object({ name: z.string() }).loose());

const listed = spawnSync("npx", ["wrangler", "secret", "list", "--name", WORKER, "--format", "json"], {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "inherit"],
});
if (listed.status !== 0) {
  console.error(`wrangler secret list exited ${listed.status ?? "without a status"}; sign in with \`npx wrangler login\`.`);
  process.exit(2);
}
const parsed = SecretListSchema.safeParse((() => {
  try {
    return JSON.parse(listed.stdout);
  } catch {
    return null;
  }
})());
if (!parsed.success) {
  console.error("wrangler secret list did not print a JSON list of secrets:\n" + listed.stdout.slice(0, 500));
  process.exit(2);
}

const held = new Set(parsed.data.map(({ name }) => name));
const production = laneFromConfigEnv(ConfigSchema.parse(config({ mode: "production", isPreview: false })).worker.env);
const missing = new Set(missingRequiredSecrets(production, (name) => held.has(name)));

console.log(`Secrets on the ${WORKER} Worker (production):\n`);
for (const secret of DEPLOYMENT_SECRETS) {
  const mark = held.has(secret.name) ? "set     " : missing.has(secret.name) ? "MISSING " : "unset   ";
  console.log(`${mark} ${secret.name}${held.has(secret.name) ? "" : ` — ${secret.withoutIt}`}`);
}
const unlisted = [...held].filter((name) => !DEPLOYMENT_SECRETS.some((secret) => secret.name === name));
if (unlisted.length > 0) {
  console.log(`\nSet but not in lib/runtime/deploymentSecrets.ts: ${unlisted.join(", ")}`);
}

if (missing.size > 0) {
  console.log(`\n${missing.size} required: npx wrangler secret put <NAME> --name ${WORKER}`);
  process.exit(1);
}
console.log("\nEvery required secret is set.");
