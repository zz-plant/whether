import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { isValidElement, type ReactNode } from "react";
import { buildBriefImagePayload } from "../app/api/image/brief/route";
import { renderBriefImage } from "../lib/image/briefImageTemplate";
import { buildWeeklyDecisionCardModel } from "./factories/weeklyDecisionCardModel";

const collectText = (node: ReactNode): string => {
  if (node === null || node === undefined || typeof node === "boolean") {
    return "";
  }
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map(collectText).join("");
  }
  if (isValidElement<{ children?: ReactNode }>(node)) {
    return collectText(node.props.children);
  }
  return "";
};

type BriefImageHomepage = Parameters<typeof buildBriefImagePayload>[0];

describe("buildBriefImagePayload", () => {
  it("passes weekly guardrail text and model tightness pause threshold to the image template", () => {
    const weeklyDecisionCardModel = buildWeeklyDecisionCardModel({
      decision: {
        guardrailThreshold: "Pause net-new hiring if tightness rises above 73.",
      },
      diagnostics: {
        currentScores: {
          tightness: 68,
          riskAppetite: 52,
        },
        postureTrajectory: {
          current: { tightness: 68, riskAppetite: 52 },
          previous: { tightness: 66, riskAppetite: 54 },
          weeklyDelta: { tightness: 2, riskAppetite: -2 },
          thresholds: { tightness: 73, riskAppetite: 50 },
        },
        regimeDistance: {
          dimensionLabel: "Tightness",
          dimensionKey: "tightness",
          currentValue: 68,
          thresholdValue: 73,
          pointsToFlip: 5,
          thresholdDirection: "riseAbove",
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

    assert.equal(payload.guardrail, "Pause net-new hiring if tightness rises above 73.");
    assert.equal(payload.pauseThreshold, 73);

    const imageText = collectText(renderBriefImage(payload));
    assert.match(imageText, /Pause net-new hiring if tightness rises above 73\./);
    assert.doesNotMatch(imageText, /Until tightness reaches 80/);
    assert.doesNotMatch(imageText, /80/);
  });
});
