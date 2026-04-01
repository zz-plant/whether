import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "bun:test";

describe("persisted UI bootstrap", () => {
  it("boots theme, display mode, and dismissed orientation before hydration", () => {
    const layoutSource = readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8");

    assert.match(layoutSource, /whether-theme/);
    assert.match(layoutSource, /whether-display-mode/);
    assert.match(layoutSource, /whether\.home\.orientation\.dismissed/);
    assert.match(layoutSource, /dataset\.displayPreference = requestedDisplayMode/);
    assert.match(layoutSource, /data-home-orientation-dismissed="true"/);
    assert.match(layoutSource, /data-weather-first-run-orientation="true"/);
  });
});
