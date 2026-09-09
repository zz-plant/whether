import process from "node:process";
import {
  captureTargets,
  DEFAULT_UI_CAPTURE_BASE_URL,
  DEFAULT_UI_CAPTURE_OUT_DIR,
  ensureBaseUrlReachable,
  resolveCaptureTargets,
} from "./ui-capture.lib.mjs";

/**
 * CI-only screenshot smoke check.
 *
 * Every render defect fixed this session — index-derived chart geometry, an
 * axis-domain bug coupled to an unrelated toggle, dead props, a hardcoded
 * light-theme regression — lived in the render layer and none of it showed up
 * in the 700+ logic-heavy tests. This is not a visual-diff gate (no baseline
 * to compare against); it renders the two canonical surfaces in a real
 * browser and fails the build on any console error or uncaught exception,
 * per UI standard VII ("console is clean"). The PNGs are uploaded as CI
 * artifacts for a human to actually look at, which the test suite cannot do.
 */

const SMOKE_TARGET_IDS = ["home-mobile", "home-desktop", "evidence-mobile", "evidence-desktop"];

const baseUrl = process.env.UI_CAPTURE_BASE_URL ?? DEFAULT_UI_CAPTURE_BASE_URL;
const outDir = process.env.UI_CAPTURE_OUT_DIR ?? DEFAULT_UI_CAPTURE_OUT_DIR;

const run = async () => {
  await ensureBaseUrlReachable(baseUrl);

  const targets = resolveCaptureTargets(SMOKE_TARGET_IDS);
  const captures = await captureTargets({ baseUrl, outDir, targets });

  let failed = false;
  for (const capture of captures) {
    if (capture.consoleErrors.length > 0) {
      failed = true;
      console.error(`✗ ${capture.id} (${capture.url}) — ${capture.consoleErrors.length} console error(s):`);
      for (const message of capture.consoleErrors) console.error(`    ${message}`);
    } else {
      console.log(`✓ ${capture.id} — clean console`);
    }
  }

  console.log(`\nScreenshots written to ${outDir}/`);

  if (failed) {
    console.error("\nCI screenshot smoke failed: console errors on a canonical surface.");
    process.exit(1);
  }
};

run().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exit(1);
});
