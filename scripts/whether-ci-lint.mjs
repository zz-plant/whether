#!/usr/bin/env node
/**
 * Whether CI/CD PRD & Spec Macro Linter.
 * Scans markdown PRDs and RFCs for fixed capital lock-in under the current macro regime.
 *
 * Usage:
 *   node scripts/whether-ci-lint.mjs [path-to-files-or-dirs...]
 */
import { readFileSync, statSync, readdirSync } from "node:fs";
import { resolve, join, extname } from "node:path";
import { stressTestDecisionPlan } from "../lib/decisionShield.js";
import { loadWeeklyBriefSnapshot } from "../lib/report/weeklyBriefSnapshot.js";

async function main() {
  const targetPaths = process.argv.slice(2);
  const filesToScan = [];

  const defaultScanDirs = ["docs", "rfc", "specs"];
  const paths = targetPaths.length > 0 ? targetPaths : defaultScanDirs;

  function collectFiles(p) {
    try {
      const fullPath = resolve(process.cwd(), p);
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        const entries = readdirSync(fullPath);
        for (const entry of entries) {
          collectFiles(join(p, entry));
        }
      } else if (stat.isFile() && [".md", ".markdown", ".txt"].includes(extname(p).toLowerCase())) {
        filesToScan.push(fullPath);
      }
    } catch {
      // ignore missing default dirs
    }
  }

  for (const p of paths) {
    collectFiles(p);
  }

  if (filesToScan.length === 0) {
    console.log("ℹ️ Whether Linter: No markdown spec files found to scan.");
    process.exit(0);
  }

  const { snapshot } = await loadWeeklyBriefSnapshot();
  const assessment = snapshot.reportData.assessment;
  console.log(`🔍 Whether Linter: Active Macro Regime is ${assessment.regime} (Tightness: ${assessment.scores.tightness}/100)`);
  console.log(`📄 Scanning ${filesToScan.length} file(s)...\n`);

  let violationCount = 0;

  for (const file of filesToScan) {
    const content = readFileSync(file, "utf8");
    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Check for high commitment sentences
      if (
        /\b(3-year|2-year|multi-year|upfront|reserved cluster|annual commitment|fixed lease)\b/i.test(line) &&
        line.length > 15
      ) {
        const result = stressTestDecisionPlan(assessment, { planText: line });
        if (result.verdict === "DANGEROUS" || result.verdict === "RISKY") {
          violationCount++;
          console.log(`🛑 [VIOLATION] ${file}:${i + 1}`);
          console.log(`   Text: "${line.trim()}"`);
          console.log(`   Verdict: ${result.verdict} (${result.detectedCategory})`);
          console.log(`   Guardrail: ${result.boundedGuardrail}`);
          console.log(`   Recommended Alternative: ${result.reversibleAlternative}\n`);
        }
      }
    }
  }

  if (violationCount > 0) {
    console.log(`❌ Whether Linter failed: ${violationCount} capital commitment violation(s) found.`);
    process.exit(1);
  } else {
    console.log(`✅ Whether Linter passed: All specs align with ${assessment.regime} macro posture.`);
    process.exit(0);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error("Linter error:", err);
    process.exit(1);
  });
}
