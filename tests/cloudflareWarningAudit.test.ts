import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, it } from "node:test";

describe("cloudflare warning audit script", () => {
  it("summarizes warning classes and tracks unexpected warnings", () => {
    const workdir = mkdtempSync(join(tmpdir(), "cf-warning-audit-"));

    try {
      const logPath = join(workdir, "build.log");
      const expectedPath = join(workdir, "expected.txt");
      const criticalPath = join(workdir, "critical.txt");
      const metricsPath = join(workdir, "metrics.json");
      const summaryPath = join(workdir, "summary.md");

      writeFileSync(
        logPath,
        [
          "warn  - Build not running on Vercel. System environment variables will not be available.",
          "[WARNING] Duplicate key \"options\" in object literal [duplicate-object-key]",
          "Warning: Totally new warning class",
          "Warning: Totally new warning class",
        ].join("\n"),
      );
      writeFileSync(
        expectedPath,
        "Build not running on Vercel. System environment variables will not be available.\n",
      );
      writeFileSync(criticalPath, "Unhandled Runtime Error\n");

      const result = spawnSync(
        process.execPath,
        [
          "scripts/cloudflare-warning-audit.mjs",
          "--log",
          logPath,
          "--expected",
          expectedPath,
          "--critical",
          criticalPath,
          "--metrics-out",
          metricsPath,
          "--summary-out",
          summaryPath,
        ],
        { encoding: "utf8" },
      );

      assert.equal(result.status, 0, result.stderr);

      const metrics = JSON.parse(readFileSync(metricsPath, "utf8"));
      assert.equal(metrics.totalWarnings, 4);
      assert.equal(metrics.uniqueWarningClasses, 3);
      assert.equal(metrics.unexpectedWarningClasses, 2);
      assert.equal(metrics.criticalWarningClasses, 0);

      const summary = readFileSync(summaryPath, "utf8");
      assert.match(summary, /Unexpected warning classes: \*\*2\*\*/);
      assert.match(summary, /Totally new warning class/);
    } finally {
      rmSync(workdir, { recursive: true, force: true });
    }
  });

  it("fails when fail-on-new is set and warnings breach policy", () => {
    const workdir = mkdtempSync(join(tmpdir(), "cf-warning-fail-"));

    try {
      const logPath = join(workdir, "build.log");
      const expectedPath = join(workdir, "expected.txt");
      writeFileSync(logPath, "Warning: Unexpected warning\n");
      writeFileSync(expectedPath, "Known warning\n");

      const result = spawnSync(
        process.execPath,
        [
          "scripts/cloudflare-warning-audit.mjs",
          "--log",
          logPath,
          "--expected",
          expectedPath,
          "--fail-on-new",
        ],
        { encoding: "utf8" },
      );

      assert.equal(result.status, 1);
      assert.match(result.stderr, /warning budget exceeded/i);
    } finally {
      rmSync(workdir, { recursive: true, force: true });
    }
  });
});
