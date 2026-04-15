import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { StartupModeSelector } from "../app/components/startupModeSelector";

describe("StartupModeSelector", () => {
  it("falls back to first available mode content when selected mode is missing", () => {
    const html = renderToStaticMarkup(
      <StartupModeSelector
        options={[
          { mode: "seed", label: "Seed" },
          { mode: "series-a", label: "Series A" },
        ]}
        selectedMode="series-a"
        contentByMode={{
          seed: {
            description: "Seed description",
            thresholdEmphasis: "Seed threshold",
            doNowBullets: ["Seed do now"],
            avoidBullets: ["Seed avoid"],
            watchBullets: ["Seed watch"],
            reversalTriggerDiscipline: "Seed reversal",
          },
        }}
      />,
    );

    assert.match(html, /Seed description/);
    assert.match(html, /Threshold emphasis: Seed threshold/);
    assert.match(html, /Seed do now/);
    assert.match(html, /type="radio"/);
    assert.match(html, /name="startup-mode-/);
    assert.match(html, /value="seed"/);
    assert.match(html, /checked=""/);
    assert.doesNotMatch(html, /aria-pressed=/);
  });

  it("renders safe fallback copy when no mode content is available", () => {
    const html = renderToStaticMarkup(
      <StartupModeSelector
        options={[{ mode: "series-a", label: "Series A" }]}
        selectedMode="series-a"
        contentByMode={{}}
      />,
    );

    assert.match(html, /Mode details are temporarily unavailable\./);
    assert.match(html, /Use the core weekly brief recommendations for this week\./);
  });
});
