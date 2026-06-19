import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { buildBriefEmbedHtml, buildWhetherBriefUrl } from "../app/api/embed/route";

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
});
