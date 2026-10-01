import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { FrameworkSection } from "../app/trust/frameworkSection";
import { TrackRecordTiles } from "../app/components/history/TrackRecord";
import { TRACK_RECORD_MIN_MONTHS, buildTrackRecord } from "../lib/report/trackRecord";
import type { TimeMachineRegimeEntry } from "../lib/timeMachine/timeMachineCache";
import { pricingPlans } from "../lib/pricing";
import { FormulaReference } from "../app/trust/formulaReference";
import { RISK_GAP_TO_TIGHTNESS_EQUIVALENT } from "../lib/regimeEngine";
import { buildLlmsTxt } from "../lib/seo/llmsTxt";
import { buildLlmsFullCorpus } from "../lib/seo/llmsFullCorpus";
import { canonicalPositioningLine } from "../lib/seo";

/*
 * Four surfaces told a reader something the rest of the site contradicted.
 *
 * The audit that found them looked at rendered pages rather than at source,
 * which is how they had survived every ratchet: none is a lint finding, a type
 * error, a failing test or a dead export. Each assertion below is the property
 * that was false, so a later edit that reintroduces it fails here.
 */

const repoFile = (path: string) => readFileSync(join(import.meta.dirname ?? __dirname, "..", path), "utf8");

describe("/trust says each thing once", () => {
  /*
   * The section description and the paragraph that opened its body were the
   * same sentence, so a reader met it twice in a row before reaching anything
   * new.
   */
  it("does not restate its own section description in the body", () => {
    const html = renderToStaticMarkup(<FrameworkSection />);
    const sentence = "Each decision here has three parts";
    const occurrences = html.split(sentence).length - 1;

    assert.equal(occurrences, 1, "the three-parts sentence is rendered more than once");
  });
});

describe("/trust's section rail names the sections it points at", () => {
  /*
   * The rail offered "Sources" and "Sources & freshness" as neighbours, and the
   * second went to a section headed "Cite this call" — a label naming neither
   * the destination nor anything a reader could tell from the one above it.
   */
  /* Deliberately only the distinguishability rule. A first attempt also
     required each label to share a word with its section title, and it failed
     on "Revisit triggers" → "What would make this recommendation wrong?" — a
     good short name for a long heading. A test that fails on a correct label is
     answering a different question from the one in its name. */
  it("gives no two rail entries the same opening word", () => {
    const model = repoFile("app/trust/trustPageModel.ts");
    const labels = [...model.matchAll(/\{ href: "#[a-z-]+", label: "([^"]+)" \}/g)].map(([, label]) => label);
    const firstWords = labels.map((label) => label.split(" ")[0].toLowerCase());

    assert.equal(
      new Set(firstWords).size,
      firstWords.length,
      `two rail entries start with the same word and cannot be told apart: ${labels.join(", ")}`,
    );
  });
});

describe("/history dates what it is showing", () => {
  /*
   * Every figure on this page comes from the month-end series, and the panel
   * beside the chart was headed "Reading now". On a week the brief was calling
   * Freezing, the page a reader visits to check the record said the call was
   * Sunny — the last completed month, presented in the present tense.
   */
  const series: TimeMachineRegimeEntry[] = Array.from(
    { length: TRACK_RECORD_MIN_MONTHS + 6 },
    (_unused, index) => {
      const month = String((index % 12) + 1).padStart(2, "0");
      const year = 2024 + Math.floor(index / 12);
      return {
        year,
        month: Number(month),
        recordDate: `${year}-${month}-28`,
        regime: "EXPANSION" as const,
        summary: "",
        tightness: 40,
        riskAppetite: 60,
      };
    },
  );
  const record = buildTrackRecord(series);
  assert.ok(record, "expected the fixture window to be long enough for a record");

  it("does not present a month-end reading as the current conditions", () => {
    const html = renderToStaticMarkup(<TrackRecordTiles record={record} />);

    assert.doesNotMatch(html, /Reading now/i);
    assert.doesNotMatch(
      html,
      /The call has been|Conditions have been/i,
      "a present-perfect claim about conditions reads as this week's reading, not the month-end series",
    );
  });

  it("stamps the period the record runs through", () => {
    const html = renderToStaticMarkup(<TrackRecordTiles record={record} />);

    assert.match(html, /month-end conditions/i);
    assert.match(html, /Through /);
  });

  it("keeps the phase map's panel and caveat on the same fact", () => {
    const source = repoFile("app/components/history/RegimePhaseMap.tsx");

    /* Source-level: this panel is inside an SVG figure built from a model the
       suite has no fixture for, and the claim is about the label itself. */
    assert.ok(!source.includes(">Reading now<"), "the phase map still labels a month-end point 'Reading now'");
    assert.ok(
      source.includes("last completed"),
      "the phase map no longer says which period its latest point covers",
    );
  });
});

describe("/pricing agrees with /privacy about where a reader's data goes", () => {
  /*
   * /privacy 2.4 tells a reader that recorded decisions are held in Cloudflare
   * KV against their browser identifier, and everything else stays local. The
   * free tier's bullet said decision memory was "saved in this browser", which
   * understates where it goes — the direction that costs trust.
   */
  const freePlan = pricingPlans.find((plan) => plan.id === "free");

  it("does not claim recorded decisions stay in the browser", () => {
    assert.ok(freePlan, "expected a free plan");
    const decisionBullets = freePlan.features.filter((feature) => /decision/i.test(feature));

    assert.ok(decisionBullets.length > 0, "expected the free tier to describe decision memory");
    for (const bullet of decisionBullets) {
      assert.doesNotMatch(
        bullet,
        /saved in this browser/i,
        `"${bullet}" contradicts /privacy 2.4, which puts recorded decisions in KV`,
      );
    }
  });
});

describe("a sample brief says it is one", () => {
  /*
   * The mockup route is gated off production, but what its copy button put on
   * the clipboard was not: branded "Whether", with a posture, an action and a
   * pause condition, it read exactly like the Monday brief once it was in a
   * channel. Same rule as the downloadable artifacts — a thing that looks like
   * the product says in itself that its figures are illustrative.
   */
  it("marks the mockup's copyable brief as a concept", () => {
    const source = repoFile("app/mockups/operator-brief/page.tsx");
    const copyBlock = /const copyBriefText = \[([\s\S]*?)\]\.join/.exec(source);

    assert.ok(copyBlock, "expected the mockup to build its copyable text from a list");
    assert.match(copyBlock[1], /SAMPLE/, "the copied brief carries no marker that it is not a reading");
  });
});

describe("the site gives one account of what is new and what the scores read", () => {
  /*
   * Found 2026-10-01 by reading the live routes for what each claimed as the
   * product's contribution. /about named six signal families "scored into" the
   * conditions, two of which (inflation, labor) enter neither score and a third
   * (public software valuations) enters nothing. /trust sourced the
   * act/pause/resume method to healthcare work without saying whose, called
   * operating latitude "the large number on the homepage" after the homepage
   * stopped drawing it, and defined confidence in raw points while the label
   * counts a risk-appetite point as 4.5 — so a reader saw risk appetite 6 points
   * from its line beside "High" and a ladder whose Medium band ends at 12.
   */
  const aboutText = async () => {
    const { default: AboutPage } = await import("../app/about/page");
    return renderToStaticMarkup(<AboutPage />).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  };

  it("/about names no score input the published formula does not use", async () => {
    const text = await aboutText();
    const builtFrom = text.slice(text.indexOf("What it is built from"), text.indexOf("Corrections and questions"));

    assert.ok(builtFrom.length > 0, "expected a 'What it is built from' section");
    assert.doesNotMatch(builtFrom, /software valuation/i, "public software valuations enter neither score");
    const conditionsSentence = builtFrom.split(/(?<=\.)\s/).find((sentence) => /Sunny, Cloudy, Stormy or Freezing/.test(sentence));
    assert.ok(conditionsSentence, "expected the sentence that names the four conditions");
    assert.doesNotMatch(conditionsSentence, /inflation|labor|unemployment/i, "inflation and labor do not set the conditions");
    assert.match(builtFrom, /Inflation and unemployment[^.]*neither score/, "the page should say what it reads but does not score");
  });

  it("/about says what is new, and links the record that backs the second claim", async () => {
    const { default: AboutPage } = await import("../app/about/page");
    const html = renderToStaticMarkup(<AboutPage />);

    assert.match(html, /What is new here/);
    assert.match(html, /href="\/history#track-record"/);
    assert.match(html, /href="\/calibration"/);
  });

  it("/trust ties the method's origin to someone a reader can look up", () => {
    const html = renderToStaticMarkup(<FrameworkSection />);
    const origin = html.split("<p").find((paragraph) => paragraph.includes("clinical workflows"));

    assert.ok(origin, "expected the paragraph that says where the method comes from");
    assert.match(origin, /href="\/about"/, "an origin claim with no one behind it reads as invented");
  });

  it("/trust puts operating latitude where it is drawn, and defines confidence the way the label counts it", () => {
    const html = renderToStaticMarkup(<FormulaReference />).replace(/<!-- -->/g, "");

    assert.doesNotMatch(html, /on the homepage/i, "the homepage does not draw operating latitude");
    assert.match(html, new RegExp(`risk-appetite point counts as ${Number(RISK_GAP_TO_TIGHTNESS_EQUIVALENT.toFixed(1))}`));
  });

  it("llms.txt and the full corpus lead with the category line, not a third noun", () => {
    for (const text of [buildLlmsTxt("https://whether.work"), buildLlmsFullCorpus("https://whether.work")]) {
      assert.ok(text.includes(`Whether is weekly operating guidance for startup leaders. ${canonicalPositioningLine}`));
      assert.doesNotMatch(text, /weekly operating (posture|call)/i);
    }
  });
});
