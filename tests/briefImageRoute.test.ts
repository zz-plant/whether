import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { buildBriefImagePayload } from "../app/api/image/brief/route";
import { renderBriefImage } from "../lib/image/briefImageTemplate";
import { buildWeeklyDecisionCardModel } from "./factories/weeklyDecisionCardModel";

type BriefImageHomepage = Parameters<typeof buildBriefImagePayload>[0];

describe("buildBriefImagePayload", () => {
  it("passes the weekly brief guardrail text and explicit tightness threshold", () => {
    const weeklyDecisionCardModel = buildWeeklyDecisionCardModel({
      decision: {
        guardrailThreshold: "Pause net-new hiring if tightness rises above 73.",
      },
      diagnostics: {
        regimeDistance: {
          dimensionLabel: "Tightness",
          dimensionKey: "tightness",
          currentValue: 68,
          thresholdValue: 73,
          pointsToFlip: 5,
          thresholdDirection: "riseAbove",
        },
        currentScores: {
          tightness: 68,
          riskAppetite: 52,
        },
      },
    });
    const homepage = {
      weeklyDecisionCardModel,
      reportShell: {
        regime: "DEFENSIVE",
        recordDateLabel: "Mar 6, 2026",
      },
    } as BriefImageHomepage;

    const payload = buildBriefImagePayload(homepage);

    assert.equal(payload.guardrail, weeklyDecisionCardModel.decision.guardrail);
    assert.equal(payload.pauseThreshold, weeklyDecisionCardModel.diagnostics.regimeDistance.thresholdValue);

    const exportedImageText = JSON.stringify(renderBriefImage(payload));
    assert.match(exportedImageText, /Pause net-new hiring if tightness rises above 73\./);
    assert.doesNotMatch(exportedImageText, /Until tightness reaches 80/);
  });
});
