import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { buildBriefMarkdown } from "../app/brief.md/route";
import { MethodSection } from "../app/about/methodSection";
import { TrackRecordTable, TrackRecordTiles } from "../app/components/history/TrackRecord";
import { RegimePhaseMap } from "../app/components/history/RegimePhaseMap";
import type { RegimeKey } from "../lib/types";
import { TrustStrip } from "../app/components/trustStrip";
import { computeDiagnostics } from "../lib/regimeEngineDiagnostics";
import { buildTrustStripProps } from "../lib/report/evidenceReaderModel";
import { assembleHomePage } from "../lib/report/homePageAssembler";
import { DECISION_CONTRACT_LABELS } from "../lib/report/reportCopy";
import { TRACK_RECORD_MIN_MONTHS, buildTrackRecord } from "../lib/report/trackRecord";
import type { TimeMachineRegimeEntry } from "../lib/timeMachine/timeMachineCache";
import { pricingPlans } from "../lib/pricing";
import { FormulaReference } from "../app/trust/formulaReference";
import { RISK_GAP_TO_TIGHTNESS_EQUIVALENT } from "../lib/regimeEngine";
import { buildLlmsTxt } from "../lib/seo/llmsTxt";
import { buildLlmsFullCorpus } from "../lib/seo/llmsFullCorpus";
import { canonicalPositioningLine } from "../lib/seo";
import { buildReportDataFixture } from "./fixtures/reportFixtures";

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
  /* The method moved to /about beside "What is new here", which already says what
     the three parts are, so the section opens on them filled in. */
  it("does not restate what /about's 'What is new here' already says", async () => {
    const { default: AboutPage } = await import("../app/about/page");
    const html = renderToStaticMarkup(<AboutPage />);
    assert.equal((html.match(/an action, a pause line and a resume line/g) ?? []).length, 1);
    assert.ok(html.indexOf("What is new here") < html.indexOf('id="method"'), "the method follows What is new here");
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

  /* The period is the page intro's stamp ("Last completed month", "Data as of"),
     not a sentence under the tiles restating the held tile (2026-10-09). The tiles
     carry their window, and the held figure prints once. */
  it("leaves the period to the intro's stamp and prints the held months once", () => {
    const html = renderToStaticMarkup(<TrackRecordTiles record={record} />);

    assert.doesNotMatch(html, /Through |month-end conditions had been/i);
    assert.doesNotMatch(html, /Record starts/, "the start date is the count tiles' window");
    const text = html.replace(/<!--[\s\S]*?-->/g, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
    assert.equal((text.match(/Current conditions held/g) ?? []).length, 1);
    assert.match(text, /since Jan 2024/);
  });

  /*
   * The disclosure's second table was headed "Earlier months (164) · Jan 31,
   * 2012 to Sep 30, 2025" over rows that start at Aug 29, 2025: the range ended
   * at the oldest row of the twelve-row table above it, so Sep 2025 was claimed
   * by both.
   */
  it("dates the earlier-months table by its own first and last rows", () => {
    const fifteenMonths: TimeMachineRegimeEntry[] = Array.from({ length: 15 }, (_unused, index) => {
      const year = 2024 + Math.floor(index / 12);
      const month = (index % 12) + 1;
      return {
        year,
        month,
        recordDate: `${year}-${String(month).padStart(2, "0")}-28`,
        regime: "EXPANSION" as const,
        summary: "",
        tightness: 40,
        riskAppetite: 60,
      };
    });
    const longRecord = buildTrackRecord(fifteenMonths);
    assert.ok(longRecord);
    const text = renderToStaticMarkup(<TrackRecordTable record={longRecord} allMonthsOpen />)
      .replace(/<!-- -->/g, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ");
    const recentOldest = longRecord.rows[longRecord.rows.length - 1]!.recordDate;
    assert.equal(recentOldest, "2024-04-28", "the recent table's oldest row");
    assert.match(text, /Earlier months \(3\) · Jan 28, 2024 to Mar 28, 2024/);
    assert.doesNotMatch(text, /Earlier months[^·]*· [^ ]+ \d+, \d{4} to Apr 28, 2024/, "the range reaches into the table above");
  });

  /*
   * "Months in each quadrant" counted the conditions each month published,
   * which trail a dot that has crossed a line: Apr 2025, at 90/55 in the Cloudy
   * quadrant, was counted as Freezing. The heading says what is counted now,
   * and the line under it says how many months the two disagree on.
   */
  it("heads the phase map's month count with what it counts", () => {
    const point = (recordDate: string, tightness: number, riskAppetite: number, regime: RegimeKey) => ({
      recordDate,
      tightness,
      riskAppetite,
      regime,
    });
    const html = renderToStaticMarkup(
      <RegimePhaseMap
        series={[
          point("2025-02-28", 90, 45, "SCARCITY"),
          point("2025-03-31", 90, 51, "SCARCITY"),
          point("2025-04-30", 90, 55, "SCARCITY"),
          point("2025-05-30", 90, 58, "DEFENSIVE"),
        ]}
        activeSpan="5y"
        spanHref={(span) => `/history?span=${span}`}
        totalMonths={4}
        open
      />,
    );
    const text = html.replace(/<!-- -->/g, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

    assert.doesNotMatch(text, /Months in each quadrant/);
    assert.match(text, /Months under each set of conditions/);
    assert.match(text, /not the quadrant its dot sits in: the two differ in 2 of these 4 months/);
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

  it("/about ties the method's origin to someone a reader can look up", () => {
    const html = renderToStaticMarkup(<MethodSection />);
    const origin = html.split("<p").find((paragraph) => paragraph.includes("clinical workflows"));

    assert.ok(origin, "expected the paragraph that says where the method comes from");
    assert.match(origin, /href="\/about"/, "an origin claim with no one behind it reads as invented");
  });

  it("/trust puts operating latitude where it is drawn, and defines confidence the way the label counts it", () => {
    const html = renderToStaticMarkup(<FormulaReference />).replace(/<!-- -->/g, "");

    assert.doesNotMatch(html, /on the homepage/i, "the homepage does not draw operating latitude");
    assert.match(html, new RegExp(`risk-appetite point is worth ${Number(RISK_GAP_TO_TIGHTNESS_EQUIVALENT.toFixed(1))}`));
  });

  it("llms.txt and the full corpus lead with the category line, not a third noun", () => {
    for (const text of [buildLlmsTxt("https://whether.work"), buildLlmsFullCorpus("https://whether.work")]) {
      assert.ok(text.includes(`Whether is weekly operating guidance for startup leaders. ${canonicalPositioningLine}`));
      assert.doesNotMatch(text, /weekly operating (posture|call)/i);
    }
  });
});

describe("/about says how often the guidance moves, from the record", () => {
  /*
   * The product is delivered weekly and moves a few times a year: 6 changes in
   * conditions and 22 line-crossing months across 176 month-ends at the Aug 2026
   * close. A reader deciding whether it fits their decision needs the second
   * number, so the page derives it from the archive rather than stating it.
   */
  it("prints the record's own counts, not figures typed into the page", async () => {
    const { default: AboutPage } = await import("../app/about/page");
    const { getTimeMachineRegimeSeries } = await import("../lib/timeMachine/timeMachineCache");
    const record = buildTrackRecord(getTimeMachineRegimeSeries(Number.MAX_SAFE_INTEGER));
    assert.ok(record, "expected the bundled archive to be long enough for a record");
    const text = renderToStaticMarkup(<AboutPage />).replace(/<!-- -->/g, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

    assert.match(text, /Where it fits and where it does not/);
    assert.ok(text.includes(`changed ${record.regimeChanges} times in ${record.monthsCovered} months`));
    assert.ok(text.includes(`lines in ${record.lineCrossingMonths} of them`));
  });
});

describe("/ and /brief.md agree on whether conditions could change next week", () => {
  /*
   * Week of Sep 29, 2026: Freezing, funding pressure 90, risk appetite 44. The
   * homepage strip said "Could change next week: Not expected"; line 4 of
   * /brief.md said "Conditions could change next week". The strip read the
   * engine (a score within its near band, or a change held for its confirming
   * reading); the brief read a second flag on the homepage model that also
   * switched on for the whole month after any change of conditions, and drew
   * its near band on a different scale. Risk appetite sat 6 points from 50,
   * outside the engine's band, with nothing pending — so the strip was right.
   *
   * /brief.md is built from the assembled homepage and renders here. `/` itself
   * suspends at its data boundary offline, so its strip is rendered from the
   * same props `app/page.tsx` builds for it, from the same reading.
   */
  const thresholds = { baseRateTightness: 5, tightnessRegime: 70, riskAppetiteRegime: 50 };
  const freezingReading = ({ riskAppetite, pending, changedSinceMonthEnd = true }: { riskAppetite: number; pending: boolean; changedSinceMonthEnd?: boolean }) =>
    buildReportDataFixture({
      assessment: {
        regime: "SCARCITY",
        scores: { tightness: 90, riskAppetite },
        thresholds,
        diagnostics: computeDiagnostics(90, riskAppetite, thresholds),
        regimeTransition: {
          nextState: "SCARCITY",
          candidateState: pending ? "DEFENSIVE" : "SCARCITY",
          committed: false,
          pending,
          snapshot: { committedState: "SCARCITY", pendingState: pending ? "DEFENSIVE" : null, pendingCount: pending ? 1 : 0 },
        },
      },
      /* Conditions were Sunny at the last month-end, as they were before Sep 29. */
      regimeAlert: changedSinceMonthEnd
        ? {
            changed: true,
            currentRegime: "SCARCITY",
            previousRegime: "EXPANSION",
            currentRecordDate: "2026-09-29",
            previousRecordDate: "2026-08-31",
            reasons: ["Funding pressure moved above 70."],
            summary: "Conditions moved from Sunny to Freezing.",
          }
        : null,
    });

  const surfaces = async (reportData: ReturnType<typeof buildReportDataFixture>) => {
    const homepage = await assembleHomePage(
      { searchParams: undefined },
      { loadHomePageReportData: async () => ({ ok: true, data: reportData }) },
    );
    const strip = renderToStaticMarkup(
      <TrustStrip
        {...buildTrustStripProps({
          recordDateLabel: homepage.reportShell.recordDateLabel,
          isFallback: homepage.reportShell.showOfflineBadge,
          confidenceLabel: homepage.weeklyDecisionCardModel.status.confidenceLabel,
          assessment: reportData.assessment,
        })}
      />,
    );
    const brief = buildBriefMarkdown(homepage);
    /* The margin cell's second half (2026-10-09): "Could change next week", with a reason
       when one applies, or "Not expected to change next week". */
    const stripValue = /data-next-week[^>]*>([\s\S]*?)<\/span>/.exec(strip)?.[1]?.replace(/<!--[\s\S]*?-->/g, "").replace(/^\s*·\s*/, "").trim();
    const briefTrustLine = brief.split("\n").find((line) => line.startsWith("> **Trust:**"));
    assert.ok(stripValue, "expected the strip to state whether conditions could change next week");
    assert.ok(briefTrustLine, "expected /brief.md to open with its confidence line");
    // "Could change next week", with or without a reason, is the yes; "Not expected to change next week" is the no.
    return { stripSaysYes: stripValue !== undefined && stripValue.startsWith("Could change next week"), briefSaysYes: /could change next week/i.test(briefTrustLine), stripValue, briefTrustLine, brief };
  };

  it("says not expected on the week of Sep 29, on both", async () => {
    const { stripSaysYes, briefSaysYes, stripValue, briefTrustLine } = await surfaces(
      freezingReading({ riskAppetite: 44, pending: false }),
    );

    assert.equal(stripSaysYes, false, `the strip said "${stripValue}" 6 points from the line with nothing pending`);
    assert.equal(briefSaysYes, false, `/brief.md said "${briefTrustLine}" 6 points from the line with nothing pending`);
  });

  it("agrees when a score is inside the near band, and when a change waits on its confirming reading", async () => {
    /* No change since the month-end here, so the old second flag fell back to
       its own near band — 8 points on a scale where a risk-appetite point
       counts 4.5 times — and said No to both. */
    for (const reading of [
      { riskAppetite: 47, pending: false, changedSinceMonthEnd: false, why: "risk appetite 3 points from its line" },
      { riskAppetite: 58, pending: true, changedSinceMonthEnd: false, why: "a change held for its confirming reading" },
    ]) {
      const { stripSaysYes, briefSaysYes, briefTrustLine } = await surfaces(freezingReading(reading));

      assert.equal(stripSaysYes, true, `${reading.why}: the strip should say Yes`);
      assert.equal(briefSaysYes, stripSaysYes, `${reading.why}: /brief.md said "${briefTrustLine}"`);
    }
  });

  /*
   * The same brief's Provenance section printed "**Action:** Safe to use for
   * near-term planning; proceed with normal approval flow." under guidance that
   * read "Freeze new commitments and protect runway". The line describes the
   * data, and it was labelled with the decision contract's own word for the
   * operating action.
   */
  it("does not state a data-status line as the operating action", async () => {
    const { brief } = await surfaces(freezingReading({ riskAppetite: 44, pending: false }));
    const provenance = brief.split("## Provenance")[1]?.split("\n---")[0];
    assert.ok(provenance, "expected /brief.md to publish a Provenance section");

    for (const label of [DECISION_CONTRACT_LABELS.slot.action, DECISION_CONTRACT_LABELS.action.doNow, DECISION_CONTRACT_LABELS.action.actionNow]) {
      assert.ok(!provenance.includes(`**${label}:**`), `Provenance labels a data-status line "${label}"`);
    }
    assert.doesNotMatch(
      provenance,
      /approval flow|proceed|holding back|hold back/i,
      "Provenance tells a reader in a Freezing week how to approve",
    );
  });
});

describe("an area row prints the line that explains its state", () => {
  /*
   * Week of Sep 29, 2026: funding pressure 90, risk appetite 44. Each row took
   * its nearest line, so fundraising's pause read "Risk appetite < 44 · at the
   * line" beside "Pause now applies: funding pressure rose through 76", and
   * hiring's resume read "Risk appetite > 54 · 10 pts away" while funding
   * pressure, 24 points from its resume line, was what kept hiring paused.
   */
  it("shows a crossed pause line, and the furthest unmet resume line", async () => {
    const { buildHomeAreaRows } = await import("../lib/report/home/homeSectionModel");
    const { buildCanonicalBoundedDecisionRules } = await import("../lib/report/boundedDecisionRules");
    const scores = { tightness: 90, riskAppetite: 44 };
    const rows = buildHomeAreaRows({
      decisionRules: buildCanonicalBoundedDecisionRules({ regime: "SCARCITY", thresholds: { tightnessRegime: 70, riskAppetiteRegime: 50 }, scores }),
      movement: null,
      scores,
    });
    const row = (area: string) => rows.find((candidate) => candidate.area === area);

    assert.equal(row("capital-raising")?.pause?.line, "Funding pressure > 76");
    assert.equal(row("capital-raising")?.pause?.distance, "crossed");
    assert.equal(row("hiring")?.resume?.line, "Funding pressure < 66");
    assert.equal(row("hiring")?.resume?.distance, "24 pts away");
  });
});
