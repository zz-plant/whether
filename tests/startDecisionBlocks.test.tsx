import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { StartDecisionBlocks } from "../app/start/components/startDecisionBlocks";

describe("StartDecisionBlocks", () => {
  it("renders a clearer question-based flow with a single primary next action", () => {
    const html = renderToStaticMarkup(
      <StartDecisionBlocks
        sinceLastReview={{
          isReturningUser: true,
          hasMeaningfulDelta: true,
          fallbackCopy: "",
          items: [
            { id: "posture-shift", label: "Posture shift", detail: "Posture moved.", href: "/decide" },
            { id: "top-driver", label: "Top driver change", detail: "Driver moved.", href: "/signals" },
            { id: "trigger-risk", label: "Trigger / risk change", detail: "Guardrail tightened.", href: "/operations" },
          ],
        }}
        actionNow="Hold hiring to revenue-critical roles."
        guardrail="Pause non-core hiring."
        flipWhen="Risk appetite rises above 55."
        postureLabel="Defensive — Watchful"
        confidenceLabel="MED"
        trendLabel="Deteriorating"
      />,
    );

    assert.match(html, /Step 1 — What changed since last review\?/);
    assert.match(html, /Step 2 — What should I do now\?/);
    assert.match(html, /Step 3 — Where do I execute\?/);
    assert.match(html, /Open Decide/);
    assert.match(html, /Open Signals/);
    assert.match(html, /Open Operations/);
    assert.match(html, /If you only do one thing now/);
  });

  it("renders compact fallback copy when no significant delta is detected", () => {
    const html = renderToStaticMarkup(
      <StartDecisionBlocks
        sinceLastReview={{
          isReturningUser: true,
          hasMeaningfulDelta: false,
          fallbackCopy: "No significant delta since your last review.",
          items: [],
        }}
        actionNow="Keep operating cadence unchanged."
        guardrail="Do not add fixed-cost commitments."
        flipWhen="Tightness drops below 60."
        postureLabel="Defensive — Watchful"
        confidenceLabel="MED"
        trendLabel="Stable"
      />,
    );

    assert.match(html, /No significant delta since your last review\./);
    assert.match(html, /Open Operations/);
  });
});
