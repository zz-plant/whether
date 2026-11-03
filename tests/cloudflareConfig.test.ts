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
 * - The lanes. The preview Worker must not share a KV namespace, a telemetry dataset or a
 *   rate-limit counter with production: a preview deploy would poison the production ISR cache
 *   and the trust page's run history, and the counters are account-wide.
 */
const BindingSchema = z.object({ type: z.string() }).loose();
const LaneSchema = z.object({
  worker: z.object({
    name: z.string(),
    env: z.record(z.string(), BindingSchema),
    exports: z.record(z.string(), z.object({ type: z.string(), storage: z.string().optional() }).loose()),
  }),
});

const lane = (mode: string) => LaneSchema.parse(config({ mode, isPreview: false })).worker;

const resourceIds = (env: Record<string, z.infer<typeof BindingSchema>>) =>
  Object.values(env).flatMap((binding) =>
    ["id", "name", "namespace"].flatMap((field) => {
      const value = binding[field];
      return binding.type !== "workflow" && typeof value === "string" ? [`${binding.type}:${value}`] : [];
    }),
  );

describe("cloudflare.config.ts", () => {
  it("declares the live Durable Object as SQLite-backed in both lanes", () => {
    for (const mode of ["production", "preview"]) {
      const { exports } = lane(mode);
      assert.deepEqual(exports.IngestCoordinator, { type: "durable-object", storage: "sqlite" }, mode);
    }
  });

  it("gives the preview lane its own Worker and no resource production uses", () => {
    const production = lane("production");
    const preview = lane("preview");
    assert.equal(production.name, "whether");
    assert.equal(preview.name, "whether-preview");
    const shared = resourceIds(preview.env).filter((id) => resourceIds(production.env).includes(id));
    assert.deepEqual(shared, []);
  });

  it("keeps the design-scratch routes and the preview dataset out of production", () => {
    const production = lane("production");
    assert.equal(production.env.WHETHER_ENABLE_MOCKUPS, undefined);
    assert.equal(production.env.WHETHER_TELEMETRY_DATASET, undefined);
    assert.deepEqual(production.env.WHETHER_AUTOMERGE_DATA_PRS, { type: "text", value: "1" });
  });

  it("treats every mode but preview as production, as `cf dev` and `cf build` pass development and production", () => {
    for (const mode of ["production", "development"]) {
      assert.equal(lane(mode).name, "whether", mode);
    }
  });
});
