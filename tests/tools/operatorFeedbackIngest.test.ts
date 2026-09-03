import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

describe("Operator Feedback Ingestion & Analytics Tool", () => {
  const scriptPath = resolve(process.cwd(), "scripts/ingest_operator_feedback.py");
  const dataPath = resolve(process.cwd(), "data/cohort_feedback.json");

  it("ensures script and dataset exist", () => {
    assert.ok(existsSync(scriptPath), "scripts/ingest_operator_feedback.py should exist");
    assert.ok(existsSync(dataPath), "data/cohort_feedback.json should exist");
  });

  it("validates and parses cohort feedback in JSON format", () => {
    const result = spawnSync("python3", [scriptPath, "--input", dataPath, "--format", "json"], {
      encoding: "utf-8",
    });

    assert.equal(result.status, 0, `Script failed with error: ${result.stderr}`);
    const parsed = JSON.parse(result.stdout);

    assert.equal(parsed.summary.total_operators, 8);
    assert.equal(parsed.summary.total_submissions, 48);
    assert.equal(parsed.summary.weeks_covered, 6);
    assert.ok(parsed.summary.actionability_score > 0);
    assert.ok(parsed.summary.discard_rate_pct >= 0);
    assert.ok(parsed.retention_by_week["1"]);
    assert.ok(parsed.retention_by_week["6"]);
  });

  it("generates markdown summary with retention tables and altered decisions", () => {
    const result = spawnSync("python3", [scriptPath, "--input", dataPath, "--format", "markdown"], {
      encoding: "utf-8",
    });

    assert.equal(result.status, 0, `Script failed with error: ${result.stderr}`);
    const output = result.stdout;

    assert.ok(output.includes("# Operator Pilot Feedback Summary"));
    assert.ok(output.includes("Weekly Retention & Review Curve"));
    assert.ok(output.includes("Recommendation Discard Reasons"));
    assert.ok(output.includes("Sample High-Impact Altered Decisions"));
    assert.ok(output.includes("OrbitFlow"));
    assert.ok(output.includes("AgenticLoop"));
    assert.ok(output.includes("CartForge"));
  });

  it("strictly fails when given corrupted or invalid JSON schema", () => {
    const invalidJson = JSON.stringify([
      { operator_id: "op_err", name: "Incomplete Record" }
    ]);

    // The temp file went to scratch/, which is gitignored and was purged in
    // Aug 2026, so on any fresh clone writeFileSync threw before the assertions
    // ran and this test failed for a reason unrelated to what it checks.
    // CLAUDE.md's repo-gotchas section says exactly this: scratch output goes to
    // a temp dir, not the repo.
    const tempFile = join(tmpdir(), "whether-invalid-feedback.json");
    writeFileSync(tempFile, invalidJson, "utf-8");

    try {
      const result = spawnSync("python3", [scriptPath, "--input", tempFile], {
        encoding: "utf-8",
      });

      assert.equal(result.status, 1);
      assert.ok(result.stderr.includes("Error ingesting operator feedback"));
    } finally {
      rmSync(tempFile, { force: true });
    }
  });

  it("runs counterfactual simulation comparing baseline vs post-upgrade metrics", () => {
    const result = spawnSync("python3", [scriptPath, "--input", dataPath, "--simulate-upgrades"], {
      encoding: "utf-8",
    });

    assert.equal(result.status, 0, `Script failed with error: ${result.stderr}`);
    const output = result.stdout;

    assert.ok(output.includes("# Counterfactual Cohort Study Delta"));
    assert.ok(output.includes("Recommendation Discard Rate"));
    assert.ok(output.includes("Actionability Score"));
    assert.ok(output.includes("Slack Artifact Transmission"));
    assert.ok(output.includes("Average Scan Time"));
  });
});
