import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "bun:test";

describe("persisted UI bootstrap", () => {
  it("boots theme and dismissed orientation before hydration", () => {
    const layoutSource = readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8");

    assert.match(layoutSource, /whether-theme/);
    assert.match(layoutSource, /whether\.home\.orientation\.dismissed/);
    assert.match(layoutSource, /data-home-orientation-dismissed="true"/);
    assert.match(layoutSource, /data-weather-first-run-orientation="true"/);
  });

  it("does not bootstrap a display mode nothing styles", () => {
    const layoutSource = readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8");

    // The removed script wrote `data-display-mode` and `data-display-preference`,
    // which no stylesheet in the repo has ever selected on. Reintroducing the
    // writer without the reader is the failure this pins.
    assert.doesNotMatch(layoutSource, /displayMode|displayPreference/);
  });
});
