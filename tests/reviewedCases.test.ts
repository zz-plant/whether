import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it } from "bun:test";
import {
  appendReviewedCase,
  buildExpectedLabels,
  parseRegistry,
  readRegistry,
  toEvalSuite,
  type ReviewedCase,
} from "../scripts/reviewed-cases";
import { counterevidenceInputSchema } from "../lib/jev/counterevidence";

/**
 * The reviewed-case registry: human labels on advisory findings become
 * versioned evaluation evidence. A labeled verdict must imply the right
 * expected labels, and the registry must refuse a duplicate id the way an
 * append-only log should.
 */

const input = counterevidenceInputSchema.parse({
  canonical: {
    recordDate: "2026-10-15", engineVersion: "test-engine", readingId: "reading-1",
    guidance: "Hold net-new hiring.", changeLine: "Risk appetite above 50",
    sourceUrl: "https://fred.stlouisfed.org/series/DGS1MO",
  },
  candidates: [
    { id: "layoffs", claim: "A competitor's layoff wave signals the market is tightening.", excerpt: "The firm announced layoffs citing funding conditions.", sourceUrl: "https://example.com/layoffs", observedAt: "2026-10-15" },
    { id: "rates", claim: "Funding costs increased.", excerpt: "Funding costs increased this week.", sourceUrl: "https://fred.stlouisfed.org/series/DGS1MO", observedAt: "2026-10-15" },
  ],
});

const entry = (overrides: Partial<ReviewedCase> = {}): ReviewedCase => ({
  id: "ce-1",
  kind: "counterevidence",
  createdAt: "2026-10-23T00:00:00.000Z",
  reviewer: "owner",
  candidateId: "layoffs",
  side: "challenge",
  label: "useful",
  input,
  expected: { challenges_0: true, supported_0: true },
  ...overrides,
});

describe("reviewed-case expected labels", () => {
  it("records a useful challenge with its support, and a false alarm as an over-flag", () => {
    assert.deepEqual(buildExpectedLabels(input, "layoffs", "challenge", "useful"), { challenges_0: true, supported_0: true });
    assert.deepEqual(buildExpectedLabels(input, "layoffs", "challenge", "false-alarm"), { challenges_0: false });
    assert.deepEqual(buildExpectedLabels(input, "rates", "support", "useful"), { supported_1: true, challenges_1: false });
    assert.deepEqual(buildExpectedLabels(input, "rates", "support", "false-alarm"), { supported_1: false });
  });

  it("refuses a label for a candidate the input does not contain", () => {
    assert.equal(buildExpectedLabels(input, "missing", "challenge", "useful"), null);
  });
});

describe("reviewed-case registry", () => {
  it("round-trips through the registry file and refuses a duplicate id", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "reviewed-cases-"));
    try {
      const registryPath = path.join(dir, "cases.json");
      const next = appendReviewedCase(readRegistry(registryPath), entry());
      writeFileSync(registryPath, JSON.stringify(next));
      assert.deepEqual(parseRegistry(JSON.parse(readFileSync(registryPath, "utf8"))).map((item) => item.id), ["ce-1"]);
      assert.throws(() => appendReviewedCase(next, entry()), /unique/, "an append-only log cannot hold two entries with one id");
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });

  it("treats a missing registry as empty and exports the eval suite", () => {
    assert.deepEqual(readRegistry(path.join(tmpdir(), "definitely-missing-cases.json")), []);
    const suite = toEvalSuite([entry()]);
    assert.deepEqual(suite.cases[0]?.kind, "counterevidence");
    assert.deepEqual(suite.cases[0]?.expected, { challenges_0: true, supported_0: true });
    assert.equal(suite.cases[0]?.input.candidates[0]?.id, "layoffs");
  });

  it("rejects a malformed registry entry", () => {
    assert.throws(() => parseRegistry([{ ...entry(), label: "maybe" }]), /invalid|enum/i);
    assert.throws(() => parseRegistry([{ ...entry(), input: { canonical: input.canonical, candidates: [] } }]), /invalid|too small|at least/i);
  });
});