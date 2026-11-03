import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { z } from "zod";

import config from "../cloudflare.config";

/*
 * What cloudflare.config.ts must keep true for a deploy to be safe. It replaced wrangler.toml on
 * 2026-11-03, and two of these are easy to break in one edit:
 *
 * - The Durable Object lifecycle. `worker.exports` replaced wrangler.toml's ordered
 *   `migrations` list, so the declaration is the class's whole history now. IngestCoordinator
 *   has been SQLite-backed since migration v1; a deploy that stops declaring it, or declares
 *   another storage engine, is asking the platform to delete or convert a live namespace.
 * - Worker Previews. Every pushed branch deploys one, at a public URL, running branch code. It
 *   gets its own Durable Object namespace and no secrets from Cloudflare, but KV, telemetry,
 *   rate-limit counters and Workflows are shared unless the config says otherwise: a preview on
 *   production's KV would poison the ISR cache and write production records, and one bound to
 *   the production Workflow would start it with production's bindings.
 */
const BindingSchema = z.object({ type: z.string() }).loose();
const WorkerSchema = z.object({
  worker: z.object({
    name: z.string(),
    triggers: z.array(z.unknown()),
    env: z.record(z.string(), BindingSchema),
    exports: z.record(z.string(), z.object({ type: z.string(), storage: z.string().optional() }).loose()),
  }),
});

const shape = (isPreview: boolean, mode = "production") => WorkerSchema.parse(config({ mode, isPreview })).worker;

const resourceIds = (env: Record<string, z.infer<typeof BindingSchema>>) =>
  Object.values(env).flatMap((binding) =>
    ["id", "name", "namespace"].flatMap((field) => {
      const value = binding[field];
      return typeof value === "string" ? [`${binding.type}:${value}`] : [];
    }),
  );

describe("cloudflare.config.ts", () => {
  it("declares the live Durable Object as SQLite-backed, in production and in every preview", () => {
    for (const isPreview of [false, true]) {
      assert.deepEqual(shape(isPreview).exports.IngestCoordinator, { type: "durable-object", storage: "sqlite" });
    }
  });

  it("deploys previews under the production Worker, sharing no resource with it", () => {
    const production = shape(false);
    const preview = shape(true);
    assert.equal(production.name, "whether");
    assert.equal(preview.name, "whether");
    const shared = resourceIds(preview.env).filter((id) => resourceIds(production.env).includes(id));
    assert.deepEqual(shared, []);
  });

  it("gives a preview no Workflow, no mail and no schedule", () => {
    const preview = shape(true);
    assert.deepEqual(
      Object.entries(preview.env).filter(([, binding]) => binding.type === "workflow" || binding.type === "send-email"),
      [],
    );
    assert.deepEqual(Object.values(preview.exports).filter((entry) => entry.type === "workflow"), []);
    assert.deepEqual(preview.triggers, []);
    assert.deepEqual(preview.env.WHETHER_ENABLE_MOCKUPS, { type: "text", value: "1" });
  });

  it("keeps production's Workflows, mail and merge switch, and the design-scratch routes out of it", () => {
    const production = shape(false);
    assert.equal(production.env.REGIME_HISTORY_WORKFLOW?.type, "workflow");
    assert.equal(production.env.BRIEF_FREEZE_WORKFLOW?.type, "workflow");
    assert.equal(production.env.EMAIL?.type, "send-email");
    assert.deepEqual(production.env.WHETHER_AUTOMERGE_DATA_PRS, { type: "text", value: "1" });
    assert.equal(production.env.WHETHER_ENABLE_MOCKUPS, undefined);
    assert.equal(production.env.WHETHER_TELEMETRY_DATASET, undefined);
  });

  it("is production in every mode unless the build is a preview, as `cf dev` and `cf build` pass development and production", () => {
    for (const mode of ["production", "development", "preview"]) {
      assert.equal(shape(false, mode).env.EMAIL?.type, "send-email", mode);
    }
  });
});
