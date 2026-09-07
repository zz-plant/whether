import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { buildBriefEmbedHtml, buildWhetherBriefUrl } from "../app/api/embed/route";
import { OPERATOR_STAGE_OPTIONS, parseOperatorStageParam } from "../lib/report/operatorStage";

const briefData = {
  operatingCall: `Tighten <script>alert("call")</script> approvals`,
  actionNow: `Review "runway" & defer <b>nice-to-have</b> spend`,
  doNowItems: [`Cut <img src=x onerror=alert(1)>`, `Keep R&D's reversible bets`],
  flipTrigger: `Risk appetite > 54 && "<script>" appears`,
  reversalCondition: "Two confirming weeks",
  dataFreshness: "Fresh",
  postureLabel: "Tight",
  confidenceLabel: "High",
  regimeLabel: "Tight",
  recordDate: "2026-06-09",
  tickerLabel: `"><script>alert("ticker")</script>`,
  stageLabel: null,
  sourceLabel: "Treasury",
  briefUrl: buildWhetherBriefUrl({
    ticker: `"><script>alert("ticker")</script>`,
    ref: `"><script>alert("ref")</script>`,
  }),
  attributionUrl: buildWhetherBriefUrl({
    ref: `"><script>alert("ref")</script>`,
  }),
};

describe("embed route helpers", () => {
  it("builds URL-safe brief URLs without malformed separators", () => {
    assert.equal(
      buildWhetherBriefUrl({ ref: "newsletter embed" }),
      "https://whether.work/?ref=newsletter+embed",
    );

    assert.equal(
      buildWhetherBriefUrl({ ticker: "BRK.B", ref: "a&b=c" }),
      "https://whether.work/?ticker=BRK.B&ref=a%26b%3Dc",
    );

    assert.equal(buildWhetherBriefUrl({ ticker: "", ref: "" }), "https://whether.work/");
  });

  it("escapes embed HTML text and href interpolations", () => {
    const html = buildBriefEmbedHtml(briefData);

    assert.doesNotMatch(html, /<script/i);
    assert.doesNotMatch(html, /<img/i);
    assert.doesNotMatch(html, /<[^>]+\sonerror=/i);
    assert.doesNotMatch(html, /href="[^"]*"><script/i);
    assert.match(html, /&quot;&gt;&lt;script&gt;alert\(&quot;ticker&quot;\)&lt;\/script&gt;/);
    assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
    assert.match(html, /https:\/\/whether\.work\/\?ref=%22%3E%3Cscript%3Ealert%28%22ref%22%29%3C%2Fscript%3E/);
  });

  it("renders the calibrated stage in the meta line, and nothing when there is none", () => {
    assert.match(buildBriefEmbedHtml({ ...briefData, stageLabel: "Series B+" }), /Series B\+/);
    assert.doesNotMatch(buildBriefEmbedHtml(briefData), /Series|Seed|Bootstrapped/);
  });
});

describe("embed stage parameter", () => {
  it("accepts every stage the /embed picker offers", () => {
    // The picker used to offer `growth` and `public`, which the route rejected —
    // both produced a stage-agnostic brief while the widget still showed the word.
    for (const option of OPERATOR_STAGE_OPTIONS) {
      assert.equal(parseOperatorStageParam(option.key), option.key);
    }
  });

  it("folds the legacy values published in older snippets into Series B+", () => {
    assert.equal(parseOperatorStageParam("growth"), "series-b");
    assert.equal(parseOperatorStageParam("public"), "series-b");
  });

  it("reads an absent or unrecognized stage as unset rather than a default", () => {
    for (const value of [null, undefined, "", "   ", "pre-seed", "SEED"]) {
      assert.equal(parseOperatorStageParam(value), null);
    }
  });
});
