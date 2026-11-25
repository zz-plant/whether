import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { z } from "zod";

import config from "../cloudflare.config";
import {
  DEPLOYMENT_SECRETS,
  laneFromConfigEnv,
  missingRequiredSecrets,
  type LaneSwitches,
} from "../lib/runtime/deploymentSecrets";

const EnvSchema = z.object({
  worker: z.object({ env: z.record(z.string(), z.object({ type: z.string(), value: z.unknown().optional() }).loose()) }),
});
const laneOf = (isPreview: boolean) => laneFromConfigEnv(EnvSchema.parse(config({ mode: "production", isPreview })).worker.env);
const holding = (...names: string[]) => (name: string) => names.includes(name);

const lane = (settings: Record<string, string>, bindings: string[]): LaneSwitches => ({
  setting: (name) => settings[name] ?? null,
  hasBinding: (name) => bindings.includes(name),
});

describe("deployment secrets", () => {
  it("requires on production exactly the two secrets its switches cannot run without", () => {
    assert.deepEqual(missingRequiredSecrets(laneOf(false), holding()), ["GITHUB_TOKEN", "WHETHER_OPS_EMAIL"]);
    assert.deepEqual(missingRequiredSecrets(laneOf(false), holding("GITHUB_TOKEN", "WHETHER_OPS_EMAIL")), []);
  });

  it("requires nothing of a Worker Preview, which Cloudflare gives no secrets", () => {
    assert.deepEqual(missingRequiredSecrets(laneOf(true), holding()), []);
  });

  it("asks for the GitHub token where either data Workflow is switched on, and only with its binding", () => {
    const missingToken = (settings: Record<string, string>, bindings: string[]) =>
      missingRequiredSecrets(lane(settings, bindings), holding()).includes("GITHUB_TOKEN");
    assert.equal(missingToken({ WHETHER_HISTORY_WORKFLOW: "1" }, ["REGIME_HISTORY_WORKFLOW"]), true);
    assert.equal(missingToken({ WHETHER_BRIEF_FREEZE_WORKFLOW: "1" }, ["BRIEF_FREEZE_WORKFLOW"]), true);
    assert.equal(missingToken({ WHETHER_HISTORY_WORKFLOW: "1" }, []), false, "a flag without its binding starts nothing");
    assert.equal(missingToken({ WHETHER_HISTORY_WORKFLOW: "0" }, ["REGIME_HISTORY_WORKFLOW"]), false);
  });

  it("asks for the ops address wherever the lane can send mail", () => {
    assert.deepEqual(missingRequiredSecrets(lane({}, ["EMAIL"]), holding()), ["WHETHER_OPS_EMAIL"]);
    assert.deepEqual(missingRequiredSecrets(lane({}, []), holding()), []);
  });

  it("names each secret once and says what is lost without it", () => {
    const names = DEPLOYMENT_SECRETS.map((secret) => secret.name);
    assert.equal(new Set(names).size, names.length);
    for (const secret of DEPLOYMENT_SECRETS) assert.ok(secret.withoutIt.length > 0, secret.name);
  });

  it("reads a text binding as a setting and any other binding as present", () => {
    const switches = laneFromConfigEnv({ FLAG: { type: "text", value: "1" }, EMAIL: { type: "send-email" } });
    assert.equal(switches.setting("FLAG"), "1");
    assert.equal(switches.setting("EMAIL"), null);
    assert.equal(switches.hasBinding("EMAIL"), true);
    assert.equal(switches.hasBinding("FLAG"), false);
    assert.equal(switches.hasBinding("ABSENT"), false);
  });
});
