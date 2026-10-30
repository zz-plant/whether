import assert from "node:assert/strict";
import { describe, it } from "bun:test";

import { evaluateAlert, publishedScoreLines, type AlertConditions, type LastAlertState } from "../lib/alert/alertEvaluator";
import { thresholdCrossingEmail } from "../lib/alert/alertTemplates";

const conditions = (over: Partial<AlertConditions> = {}): AlertConditions => ({
  regime: "DEFENSIVE",
  tightness: 78,
  riskAppetite: 42,
  actionNow: "Stage approvals",
  callChangesIf: "Funding pressure falls 8 pts from 78 to 70 or below.",
  recordDate: "2026-08-18",
  ...over,
});

const lastKnown = (over: Partial<LastAlertState> = {}): LastAlertState => ({
  regime: "DEFENSIVE",
  tightness: 60,
  riskAppetite: 60,
  // Old enough to clear the one-week cooldown.
  lastSentAt: "2020-01-01T00:00:00.000Z",
  ...over,
});

describe("alert routing", () => {
  it("tags each threshold alert with the score that crossed", () => {
    const decisions = evaluateAlert(conditions(), lastKnown());
    const thresholds = decisions.filter((d) => d.type === "threshold");
    assert.ok(thresholds.length > 0, "expected at least one threshold alert");

    for (const decision of thresholds) {
      // Delivery picks the email template from `metric`. It used to substring-match
      // the headline for "tightness", so renaming the label silently routed every
      // funding-pressure alert down the risk-appetite branch — wrong metric, wrong
      // score, no error.
      assert.ok(
        decision.metric === "credit" || decision.metric === "sentiment",
        `threshold alert is missing a metric: ${decision.headline}`,
      );
    }
  });

  it("routes a funding-pressure crossing to the credit metric and Finance/CFO role", () => {
    const decisions = evaluateAlert(
      conditions({ riskAppetite: 60 }),
      lastKnown({ riskAppetite: 60 }),
    );
    const thresholds = decisions.filter((d) => d.type === "threshold");
    assert.ok(thresholds.length > 0);
    assert.ok(thresholds.every((d) => d.metric === "credit"));
    assert.ok(thresholds.every((d) => d.department === "Finance"));
    assert.ok(thresholds.every((d) => d.rolePreset === "CFO"));
    assert.ok(thresholds.every((d) => d.headline.startsWith("Funding pressure")));
  });

  it("routes a risk-appetite crossing to the sentiment metric and Operations/COO role", () => {
    const decisions = evaluateAlert(
      conditions({ tightness: 60, riskAppetite: 42 }),
      lastKnown({ tightness: 60, riskAppetite: 60 }),
    );
    const thresholds = decisions.filter((d) => d.type === "threshold");
    assert.ok(thresholds.length > 0);
    assert.ok(thresholds.every((d) => d.metric === "sentiment"));
    assert.ok(thresholds.every((d) => d.department === "Operations"));
    assert.ok(thresholds.every((d) => d.rolePreset === "COO"));
    assert.ok(thresholds.every((d) => d.headline.startsWith("Risk appetite")));
  });

  it("leaves regime-change alerts without a metric", () => {
    const decisions = evaluateAlert(
      conditions({ regime: "SCARCITY" }),
      lastKnown({ regime: "DEFENSIVE" }),
    );
    const regimeChange = decisions.find((d) => d.type === "regime_change");
    assert.ok(regimeChange);
    assert.equal(regimeChange?.metric, undefined);
  });
});

describe("which line a move names", () => {
  const crossing = (metric: "tightness" | "riskAppetite", from: number, to: number) => {
    const other = metric === "tightness" ? { riskAppetite: 60 } : { tightness: 60 };
    return evaluateAlert(
      conditions({ [metric]: to, ...other }),
      lastKnown({ [metric]: from, ...other }),
    ).find((d) => d.type === "threshold");
  };

  // A rise from 63 to 90 passes 66, 70 and 76; the pause line is where it stopped.
  it("names the pause line on a rise through all three funding-pressure lines", () => {
    assert.deepEqual(crossing("tightness", 63, 90)?.line, publishedScoreLines()[0]);
  });

  // The same three lines the other way. Ranked pause first whatever the direction, this
  // named 76 and the email said held work resumes "once each area's restart line is met"
  // with the score already under 66, and no resume alert followed: one per score.
  it("names the restart line on a fall through all three funding-pressure lines", () => {
    const decision = crossing("tightness", 80, 60);
    const line = decision?.line;
    assert.ok(line, "the fall crossed a line");
    assert.equal(line.kind, "resume");
    assert.equal(line.value, 66);
    assert.equal(decision?.severity, "info");

    const mail = thresholdCrossingEmail(line, 60, null);
    assert.match(mail.text, /It crossed below that line since the last alert\. Work held on this line can resume/);
    assert.doesNotMatch(mail.text, /pause on this line no longer holds/);
  });

  it("names the line a partial move stopped past", () => {
    assert.equal(crossing("tightness", 80, 68)?.line?.kind, "change");
    assert.equal(crossing("tightness", 80, 72)?.line?.kind, "pause");
    assert.equal(crossing("riskAppetite", 40, 60)?.line?.kind, "resume");
    assert.equal(crossing("riskAppetite", 60, 40)?.line?.kind, "pause");
  });
});

/*
 * A score exactly on a line is on the side where the line does not hold: past the change
 * line only above it, as `classifyRegime` reads equality, and past a pause or restart line
 * only strictly beyond it, as the rules state them ("> 76", "< 66"). Comparing `>=` and
 * `<=` missed a score landing on the line and fired on one leaving it for the same side.
 */
describe("a score on the line", () => {
  const thresholdFor = (from: number, to: number) =>
    evaluateAlert(conditions({ tightness: to, riskAppetite: 60 }), lastKnown({ tightness: from, riskAppetite: 60 })).find(
      (d) => d.type === "threshold",
    );

  it("crosses the change line by landing on it from above", () => {
    assert.equal(thresholdFor(73, 70)?.line?.kind, "change");
  });

  it("does not cross it again by leaving it downward", () => {
    assert.equal(thresholdFor(70, 68), undefined);
  });

  it("does not cross the change line by rising onto it", () => {
    assert.equal(thresholdFor(68, 70), undefined);
  });

  it("leaves the restart line unmet at its own number, as the rule reads it", () => {
    const line = thresholdFor(64, 66)?.line;
    assert.ok(line, "landing on 66 from below crossed a line");
    assert.equal(line.kind, "resume");
    const mail = thresholdCrossingEmail(line, 66, null);
    assert.match(mail.text, /It crossed above that line since the last alert\. This restart line is no longer met/);
  });
});

describe("alert email copy", () => {
  it("names the metrics the way every other surface does", () => {
    const [tightnessPause, , , , riskChange] = publishedScoreLines();
    const credit = thresholdCrossingEmail(tightnessPause, 78, null);
    assert.match(credit.subject, /Funding pressure crossed the pause line \(76\)/);
    assert.ok(!/tightness/i.test(credit.text), "alert text still says tightness");
    assert.ok(!/tightness/i.test(credit.html), "alert html still says tightness");

    const sentiment = thresholdCrossingEmail(riskChange, 42, null);
    assert.match(sentiment.subject, /Risk appetite crossed the line where conditions change \(50\)/);
    assert.ok(!/investor appetite/i.test(sentiment.text));
  });

  /* "Funding pressure is 90.0; the pause line is 76." and "90.0 / 76": every
     other surface prints a score in whole points. */
  it("prints the score in whole points, as the brief does", () => {
    const [tightnessPause] = publishedScoreLines();
    const mail = thresholdCrossingEmail(tightnessPause, 90, null);
    assert.match(mail.text, /^Funding pressure is 90; the pause line is 76\.$/m);
    assert.match(mail.html, />90 \/ 76</);
    assert.doesNotMatch(mail.text + mail.html, /\b90\.0\b/);

    const [decision] = evaluateAlert(conditions({ tightness: 90 }), lastKnown({ tightness: 63 })).filter(
      (d) => d.type === "threshold",
    );
    assert.equal(decision?.headline, "Funding pressure crossed 76 (now 90)");
  });
});
