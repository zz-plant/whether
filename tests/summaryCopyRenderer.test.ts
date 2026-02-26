import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderMonthlySummaryCopy, renderWeeklySummaryCopy } from "../lib/summary/summaryCopyRenderer";

describe("summaryCopyRenderer", () => {
  it("renders weekly copy with provenance fallback when sourceUrl is missing", () => {
    const copy = renderWeeklySummaryCopy({
      title: "Weekly action summary",
      summary: "Growth Mode posture: example. Priority: scale proven bets.",
      provenance: {
        sourceLabel: "US Treasury Daily Treasury Yield Curve Rates",
        timestampLabel: "Feb 20, 2026, 10:00 AM",
        ageLabel: "1h",
        statusLabel: "Live",
      },
      structured: {
        climate: {
          label: "✅ RISK-ON / CAPITAL-LOOSE",
          summary: ["Capital is accessible and risk appetite is healthy."],
        },
        recommendedMoves: ["Prioritize speed and distribution over perfection"],
        executionPriorities: ["Growth experiments with clear scaling paths"],
        watchouts: ["Delaying launches while waiting for perfect data"],
        planningLanguage: "Move quickly on growth bets.",
        executionConstraints: ["Keep payback discipline"],
      },
    });

    assert.match(copy, /Source: US Treasury Daily Treasury Yield Curve Rates/);
    assert.doesNotMatch(copy, /\(https?:\/\//);
    assert.match(copy, /RECOMMENDED MOVES FOR PRODUCT TEAMS \(NOW\)\n\n• /);
  });

  it("renders monthly copy with bulleted constraints and provenance", () => {
    const copy = renderMonthlySummaryCopy({
      title: "Monthly action summary",
      summary: "Efficiency Mode posture: example. Priority: retain and reduce fixed cost.",
      provenance: {
        sourceLabel: "US Treasury",
        sourceUrl: "https://example.com/source",
        timestampLabel: "Feb 20, 2026, 10:00 AM",
        ageLabel: "2h",
        statusLabel: "Live",
      },
      structured: {
        executionConstraints: ["Sequence delivery around revenue durability"],
        provenance: {
          source: "US Treasury (https://example.com/source)",
          timestamp: "Feb 20, 2026, 10:00 AM",
          dataAge: "2h",
        },
      },
    });

    assert.match(copy, /Execution constraints:\n• Sequence delivery around revenue durability/);
    assert.match(copy, /Provenance:\nSource: US Treasury \(https:\/\/example\.com\/source\)/);
  });
});
