import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it } from "bun:test";
import { embedTexts } from "../scripts/local-embeddings";
import { retrieveEvidence, runEvidenceRetrieval } from "../scripts/retrieve-evidence";
import { buildEvidenceAudit } from "../lib/jev/auditRequests";

const model = "embeddinggemma-2:740m";
const canonical = { recordDate: "2026-10-15", readingId: "reading-1", engineVersion: "test-engine", guidance: "Hold hiring until runway recovers.", sourceUrl: "https://example.com/brief" };
const candidate = (id: string, excerpt = id, observedAt = "2026-10-14") => ({ id, claim: `Claim ${id}`, excerpt, sourceUrl: `https://example.com/${id}`, observedAt });
const input = { canonical, candidates: [candidate("hiring"), candidate("pricing"), candidate("later", "future data", "2026-10-16"), { ...candidate("repeat", "HIRING"), claim: "Claim hiring" }] };

const service = () => {
  const prompts: string[] = [];
  let digest = "a".repeat(64);
  const fetchImpl: typeof fetch = async (url, init) => {
    const href = url instanceof Request ? url.url : url.toString();
    assert.equal(new URL(href).hostname, "127.0.0.1");
    if (href.endsWith("/api/tags")) return Response.json({ models: [{ name: model, digest }] });
    const body = init?.body;
    assert.ok(typeof body === "string");
    const request = JSON.parse(body);
    assert.equal(request.model, model);
    assert.equal(request.truncate, false);
    prompts.push(...request.input);
    return Response.json({ model, embeddings: request.input.map((text: string) => text.startsWith("task:") ? [1, 0] : text.includes("pricing") ? [0, 3] : [3, 0]) });
  };
  return { fetchImpl, prompts, changeModel: () => { digest = "b".repeat(64); } };
};

describe("local evidence retrieval", () => {
  it("retrieves dated, distinct passages with exact citations and task prefixes for Clef", async () => {
    const local = service();
    const result = await retrieveEvidence(input, { fetchImpl: local.fetchImpl, limit: 2 });
    assert.deepEqual(result.candidates, input.candidates.slice(0, 2));
    assert.equal(result.retrieval.excludedFuture, 1);
    assert.equal(result.retrieval.excludedDuplicates, 1);
    assert.equal(result.retrieval.modelDigest, "a".repeat(64));
    assert.equal(result.retrieval.dimensions, 2);
    assert.deepEqual(result.retrieval.ranking.map((item) => item.similarity), [1, 0]);
    assert.ok(local.prompts.includes(`task: search result | query: guidance: ${canonical.guidance}`));
    assert.ok(local.prompts.includes("title: Claim hiring | text: hiring"));
    assert.ok(local.prompts.every((prompt) => !prompt.includes("future data")));
    assert.equal(Object.keys(buildEvidenceAudit(result).questions).length, 4);
    assert.deepEqual(buildEvidenceAudit(result).state, { canonical, candidates: result.candidates });
  });

  it("caches full prompted content by model digest and invalidates edits and replacement weights", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "whether-retrieval-"));
    try {
      const local = service();
      const options = { fetchImpl: local.fetchImpl, cachePath: path.join(dir, "cache.json") };
      await retrieveEvidence(input, options);
      const calls = local.prompts.length;
      const cached = await retrieveEvidence(input, options);
      assert.equal(local.prompts.length, calls);
      assert.equal(cached.retrieval.cacheHits, calls);
      await retrieveEvidence({ ...input, candidates: input.candidates.map((item) => item.id === "hiring" ? { ...item, excerpt: "changed hiring evidence" } : item) }, options);
      assert.equal(local.prompts.length, calls + 2); // changed passage; previously duplicate now distinct
      local.changeModel();
      await retrieveEvidence(input, options);
      assert.equal(local.prompts.length, calls + 2 + calls);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });

  it("refuses remote hosts, empty eligible pools, repeated IDs and oversized shortlists before inference", async () => {
    let calls = 0;
    const fetchImpl: typeof fetch = async () => { calls += 1; throw new Error("must not call"); };
    await assert.rejects(retrieveEvidence(input, { host: "https://example.com", fetchImpl }), /loopback/);
    await assert.rejects(retrieveEvidence({ canonical, candidates: [candidate("future", "future", "2026-10-16")] }, { fetchImpl }), /eligible/);
    await assert.rejects(retrieveEvidence({ canonical, candidates: [candidate("a"), candidate("a")] }, { fetchImpl }), /unique/);
    await assert.rejects(retrieveEvidence(input, { limit: 17, fetchImpl }), /16/);
    assert.equal(calls, 0);
  });

  it("keeps different claims about the same passage for the independent support check", async () => {
    const local = service();
    const result = await retrieveEvidence({ canonical, candidates: [candidate("a", "same quote"), candidate("b", "same quote")] }, { fetchImpl: local.fetchImpl });
    assert.deepEqual(result.candidates.map((item) => item.id), ["a", "b"]);
    assert.equal(result.retrieval.excludedDuplicates, 0);
  });

  it("fails when a cached vector has incompatible dimensions or weights change mid-run", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "whether-retrieval-invalid-"));
    try {
      const local = service();
      const cachePath = path.join(dir, "cache.json");
      await retrieveEvidence(input, { fetchImpl: local.fetchImpl, cachePath });
      const cache = JSON.parse(readFileSync(cachePath, "utf8"));
      const key = Object.keys(cache.vectors).at(-1);
      assert.ok(key);
      cache.vectors[key] = [1, 0, 0];
      writeFileSync(cachePath, JSON.stringify(cache));
      await assert.rejects(retrieveEvidence(input, { fetchImpl: local.fetchImpl, cachePath }), /dimensions/);
      let calls = 0;
      const changing: typeof fetch = async (url, init) => {
        calls += 1;
        if (calls === 3) local.changeModel();
        return local.fetchImpl(url, init);
      };
      await assert.rejects(retrieveEvidence(input, { fetchImpl: changing }), /changed during/);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });

  it("rejects zero, nonfinite, missing or inconsistent vectors and unexpected returned models", async () => {
    for (const embeddings of [[[0, 0], [1, 0]], [[1, 0]], [[1, 0], [1]], [[1, 0], [null, 1]]]) {
      await assert.rejects(embedTexts(["one", "two"], { model, host: "http://127.0.0.1:11434", fetchImpl: async () => Response.json({ model, embeddings }) }));
    }
    await assert.rejects(embedTexts(["one"], { model, host: "http://127.0.0.1:11434", fetchImpl: async () => Response.json({ model: "other", embeddings: [[1, 0]] }) }), /model/);
  });

  it("replaces a stale successful shortlist on service failure", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "whether-retrieval-failure-"));
    try {
      const inputPath = path.join(dir, "input.json");
      const outputPath = path.join(dir, "output.json");
      writeFileSync(inputPath, JSON.stringify(input));
      writeFileSync(outputPath, JSON.stringify({ candidates: [candidate("stale")] }));
      assert.equal(await runEvidenceRetrieval({ inputPath, outputPath, fetchImpl: async () => new Response("offline", { status: 503 }) }), 1);
      const failed = JSON.parse(readFileSync(outputPath, "utf8"));
      assert.equal(failed.status, "failed");
      assert.equal(failed.candidates, undefined);
      assert.throws(() => buildEvidenceAudit(failed));
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });

  it("takes canonical guidance from the paired weekly artifact and carries retrieval lineage into the audit", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "whether-retrieval-brief-"));
    try {
      const briefPath = path.join(dir, "brief.audit.json");
      const inputPath = path.join(dir, "pool.json");
      const outputPath = path.join(dir, "shortlist.json");
      writeFileSync(inputPath, JSON.stringify({ candidates: input.candidates }));
      writeFileSync(briefPath, JSON.stringify({ canonical, artifact: { ...canonical, text: canonical.guidance } }));
      const local = service();
      assert.equal(await runEvidenceRetrieval({ briefPath, inputPath, outputPath, fetchImpl: local.fetchImpl }), 0);
      const output = JSON.parse(readFileSync(outputPath, "utf8"));
      assert.deepEqual(output.canonical, canonical);
      assert.equal(output.retrieval.canonicalPath, briefPath);
      assert.equal(Object.keys(buildEvidenceAudit(output).questions).length, 4);
      writeFileSync(inputPath, JSON.stringify({ canonical: { ...canonical, readingId: "another-reading" }, candidates: input.candidates }));
      assert.equal(await runEvidenceRetrieval({ briefPath, inputPath, outputPath, fetchImpl: local.fetchImpl }), 1);
      assert.equal(JSON.parse(readFileSync(outputPath, "utf8")).status, "failed");
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
});
