import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "bun:test";
import { buildBriefEmbedHtml, buildWhetherBriefUrl } from "../app/api/embed/route";
import { OPERATOR_STAGE_OPTIONS, parseOperatorStageParam } from "../lib/report/operatorStage";
import { siteUrl } from "../lib/siteUrl";

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
      `${siteUrl}/?ref=newsletter+embed`,
    );

    assert.equal(
      buildWhetherBriefUrl({ ticker: "BRK.B", ref: "a&b=c" }),
      `${siteUrl}/?ticker=BRK.B&ref=a%26b%3Dc`,
    );

    assert.equal(buildWhetherBriefUrl({ ticker: "", ref: "" }), `${siteUrl}/`);
  });

  /*
   * Source reads, for the reason tests/feedRoute.test.ts gives: the hardcoded
   * origin and the configured default are the same string on production, so no
   * rendered assertion can tell them apart — and the lane where they differ is
   * the one this suite never runs in.
   *
   * What it protects: every link and script tag an embed carries goes into
   * somebody else's page. With a literal, the preview lane's embeds advertised
   * production, so the one surface preview exists to check was the one it could
   * not check.
   */
  it("resolves the embed origin instead of writing it in", async () => {
    for (const path of ["app/api/embed/route.ts", "app/share/embedBuilder.tsx"]) {
      const source = await readFile(path, "utf8");
      assert.doesNotMatch(
        source,
        /["'`]https:\/\/whether\.work/,
        `${path} hardcodes the production origin; resolve it through lib/siteUrl`,
      );
      assert.match(source, /siteUrl/, `${path} no longer resolves the site URL`);
    }
  });

  /*
   * `reversalCondition` is returned only by `format=json`, so no render can
   * reach it — its one consumer is an integrator treating it as a fact about
   * this week's call. It was the literal "Two consecutive weeks of confirming
   * signals": the same sentence every week, in every regime, for a field whose
   * real value sits on the action strip the route already reads.
   */
  it("publishes no invented decision copy", async () => {
    const source = await readFile("app/api/embed/route.ts", "utf8");
    // Matched as an assignment, not an occurrence: the comment at the site names
    // both strings, which is where the reason for this test lives.
    assert.doesNotMatch(source, /=\s*"Two consecutive weeks of confirming signals"/);
    assert.doesNotMatch(source, /\|\|\s*"Monitor economic indicators"/);
    assert.match(source, /primaryAction\?\.reversalCondition/);
    assert.match(source, /primaryAction\?\.triggerThreshold/);
  });

  it("has the distributed script call the origin it was served from", async () => {
    const script = await readFile("public/embed.js", "utf8");
    // Third parties paste this tag, so the script cannot import anything — it
    // reads its own <script src> instead, and keeps production as the fallback.
    assert.match(script, /document\.currentScript/);
    assert.match(script, /var EMBED_API_BASE = origin \+ ["']\/api\/embed["']/);
    assert.match(script, /var PRODUCTION_ORIGIN = ["']https:\/\/whether\.work["']/);
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
