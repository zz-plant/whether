import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it } from "bun:test";
import { runArtifactAudit } from "../scripts/jev-artifact-audit";

const canonical = { recordDate: "2026-10-15", readingId: "reading-1", engineVersion: "test-engine", guidance: "Hold hiring.", sourceUrl: "https://example.com/source" };
const input = { canonical, artifact: { recordDate: canonical.recordDate, engineVersion: canonical.engineVersion, readingId: canonical.readingId, text: "Hold hiring." } };
const credentials = { accountId: "account", apiToken: "test-token" };

describe("decision audit CLI workflows", () => {
  it("records exact inputs, version, digest, timing and each model's failures", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "whether-audit-"));
    try {
      const inputPath = path.join(dir, "input.json");
      writeFileSync(inputPath, JSON.stringify(input));
      const status = await runArtifactAudit({ mode: "brief", inputPath, reportDir: dir, threshold: 0.8, models: ["clef-flash", "clef-omni"] }, {
        ...credentials,
        fetchImpl: async (_, init) => {
          const rawBody = init?.body;
          assert.ok(typeof rawBody === "string");
          const body = JSON.parse(rawBody);
          if (body.model === "clef-omni") return new Response("offline", { status: 503 });
          return Response.json({ result: { model: "clef-flash", answers: Object.fromEntries(Object.keys(body.questions).map((key) => [key, { type: "noul", noul: 0.01 }])) } });
        },
      });
      assert.equal(status, 1);
      const report = JSON.parse(readFileSync(path.join(dir, "brief-audit.json"), "utf8"));
      assert.match(report.requestDigest, /^[a-f0-9]{64}$/);
      assert.equal(report.questionVersion, "whether-decision-audit-v1");
      assert.equal(report.state.canonical.readingId, canonical.readingId);
      assert.equal(report.byModel["clef-flash"].result.ok, true);
      assert.equal(report.byModel["clef-omni"].result.ok, false);
      assert.equal(typeof report.byModel["clef-flash"].durationMs, "number");
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });

  it("refuses a mismatched reading without calling a model and replaces a previous report", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "whether-audit-"));
    try {
      const inputPath = path.join(dir, "input.json");
      writeFileSync(inputPath, JSON.stringify({ ...input, artifact: { ...input.artifact, readingId: "other" } }));
      writeFileSync(path.join(dir, "brief-audit.json"), '{"status":"old"}');
      let calls = 0;
      const status = await runArtifactAudit({ mode: "brief", inputPath, reportDir: dir, threshold: 0.8, models: ["clef-flash"] }, { ...credentials, fetchImpl: async () => { calls += 1; throw new Error("must not run"); } });
      assert.equal(status, 1);
      assert.equal(calls, 0);
      assert.equal(JSON.parse(readFileSync(path.join(dir, "brief-audit.json"), "utf8")).status, "failed");
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });

  it("runs labeled evaluations and retains missed contradictions alongside service failures", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "whether-audit-"));
    try {
      const inputPath = path.join(dir, "eval.json");
      writeFileSync(inputPath, JSON.stringify({ cases: [{ id: "contradiction", input, expected: { contradicts_call: true } }] }));
      assert.equal(await runArtifactAudit({ mode: "eval", inputPath, reportDir: dir, threshold: 0.8, models: ["clef-flash"] }, {
        ...credentials, fetchImpl: async (_, init) => {
          const rawBody = init?.body;
          assert.ok(typeof rawBody === "string");
          const body = JSON.parse(rawBody);
          return Response.json({ result: { model: "clef-flash", answers: Object.fromEntries(Object.keys(body.questions).map((key) => [key, { type: "noul", noul: 0.01 }])) } });
        },
      }), 0);
      const report = JSON.parse(readFileSync(path.join(dir, "eval-audit.json"), "utf8"));
      assert.equal(report.byModel["clef-flash"].summary.falseNegative, 1);
      assert.equal(report.byModel["clef-flash"].summary.total, 1);
      assert.equal(report.byModel["clef-flash"].cases[0].expected.contradicts_call, true);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });

  it("sends the selected local screenshot and retains its digest without base64 in the report", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "whether-image-audit-"));
    try {
      const inputPath = path.join(dir, "input.json");
      const imagePath = path.join(dir, "brief.png");
      writeFileSync(inputPath, JSON.stringify(input));
      writeFileSync(imagePath, Buffer.from("fixture image bytes"));
      let calls = 0;
      const status = await runArtifactAudit({ mode: "screenshot", inputPath, imagePath, reportDir: dir, threshold: 0.8, models: ["clef-flash"] }, {
        ...credentials, fetchImpl: async (_, init) => {
          calls += 1;
          const rawBody = init?.body;
          assert.ok(typeof rawBody === "string");
          const body = JSON.parse(rawBody);
          assert.equal(body.images[0], `data:image/png;base64,${Buffer.from("fixture image bytes").toString("base64")}`);
          return Response.json({ result: { model: "clef-flash", answers: Object.fromEntries(Object.keys(body.questions).map((key) => [key, { type: "noul", noul: 0.5 }])) } });
        },
      });
      assert.equal(status, 0);
      assert.equal(calls, 1);
      const rawReport = readFileSync(path.join(dir, "screenshot-audit.json"), "utf8");
      assert.doesNotMatch(rawReport, /base64/);
      const report = JSON.parse(rawReport);
      assert.match(report.media.sha256, /^[a-f0-9]{64}$/);
      assert.equal(report.byModel["clef-flash"].unresolved.length, 4);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
});
