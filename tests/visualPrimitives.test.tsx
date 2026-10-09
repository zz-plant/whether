import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ScoreLadder, buildLadderLines, describeLadderPosition, layoutLadderLabels, nearestLadderLine, type LadderLine } from "../app/components/ui/scoreLadder";
import { ScoreCell, formatScoreReference } from "../app/components/ui/scoreCell";
import { AreaTable } from "../app/components/ui/areaTable";
import { TrustStrip } from "../app/components/trustStrip";
import { MonthStrip, describeCurrentRun } from "../app/components/history/monthStrip";
import { decisionAreaOrder } from "../lib/report/boundedDecisionRules";

/*
 * The five primitives the visual-organization pass converges on. Each is judged
 * on the property that made it worth having: the ladder names the nearest line
 * and the distance; a score never prints without its reference; the area table
 * keeps one order whatever order it is given; the trust strip is four facts and
 * a link; the month strip counts changes and the current run from the data.
 */
const lines = [
  { kind: "resume" as const, value: 66 },
  { kind: "callChange" as const, value: 70 },
  { kind: "pause" as const, value: 76 },
];

describe("ScoreLadder", () => {
  it("names the nearest line and the distance to it", () => {
    assert.equal(nearestLadderLine(72, lines)?.line.kind, "callChange");
    assert.equal(describeLadderPosition(72, lines), "72 of 100 · 2 pts above the change line");
    assert.equal(describeLadderPosition(76, lines), "76 of 100 · at the pause line");
    assert.equal(describeLadderPosition(60, lines), "60 of 100 · 6 pts below the resume line");
  });

  it("draws last week hollow only when there is a last week", () => {
    const withPrevious = renderToStaticMarkup(<ScoreLadder label="Funding pressure" value={72} previous={68} lines={lines} />);
    assert.match(withPrevious, /Last week: 68/);
    const without = renderToStaticMarkup(<ScoreLadder label="Funding pressure" value={72} previous={null} lines={lines} />);
    assert.doesNotMatch(without, /Last week/);
    assert.doesNotMatch(without, /role="img"/);
  });

  it("paints every tick before any label, so no tick crosses a label", () => {
    /* Each line used to be one translated wrapper holding its tick and label.
       A transform makes a stacking context, so a later line's tick painted
       over an earlier line's label ("Change line|70" on a phone). */
    const html = renderToStaticMarkup(<ScoreLadder label="Funding pressure" value={85} lines={lines} />);
    const lastTick = html.lastIndexOf("data-ladder-tick");
    const firstLabel = html.indexOf("data-ladder-row=");
    assert.ok(lastTick > 0 && firstLabel > 0);
    assert.ok(lastTick < firstLabel, "all ticks come before the first label in paint order");
  });

  it("names the hollow dot for what it is when it is not last week", () => {
    /* /history/compare draws period B against period A; a hollow dot captioned
       "last week" there would claim a comparison nobody made. */
    const html = renderToStaticMarkup(
      <ScoreLadder label="Funding pressure" value={72} previous={61} previousLabel="Period B" lines={lines} />,
    );
    assert.match(html, /Period B: 61/);
    assert.doesNotMatch(html, /Last week/);
  });

  it("names the hollow dot by the date of the reading it is drawn from", () => {
    /* The reading routes compare with the previous monthly snapshot, so the
       dot is "Aug 31", not "Last week" (`lib/report/comparisonBasis.ts`). */
    const html = renderToStaticMarkup(
      <ScoreLadder label="Funding pressure" value={72} previous={61} previousLabel="Aug 31" lines={lines} />,
    );
    assert.match(html, /Aug 31: 61/);
    assert.doesNotMatch(html, /Last week/);
  });

  it("labels ticks with their number and names the lines in a key, left to right", () => {
    /* A named tick label ("Change line 70") is ~80px of text, so the common
       66/70/76 lines stacked three rows deep at any width. Ticks carry the
       number; the key carries the names, in the order the ticks sit. */
    const html = renderToStaticMarkup(<ScoreLadder label="Funding pressure" value={85} lines={lines} />);
    assert.doesNotMatch(html, /data-ladder-row="\d+"[^>]*>[^<]*[A-Za-z]/, "a tick label carries no name");
    const key = html.slice(html.indexOf("data-ladder-key"));
    const order = ["Resume", "Change line", "Pause"].map((name) => key.indexOf(`>${name}<`));
    assert.ok(order.every((index) => index > 0), "the key names every line");
    assert.deepEqual([...order].sort((a, b) => a - b), order, "the key reads in tick order");
  });

  it("lays labels out per track width, and puts the common lines on one row on a wide track", () => {
    const rows = (values: LadderLine[], trackPx?: number) =>
      Object.fromEntries(layoutLadderLabels(values, 100, trackPx).map(({ line, row }) => [line.kind, row]));
    const common: LadderLine[] = [{ kind: "resume", value: 66 }, { kind: "callChange", value: 70 }, { kind: "pause", value: 76 }];
    assert.deepEqual(rows(common, 448), { resume: 0, callChange: 0, pause: 0 }, "one row from 28rem");
    assert.deepEqual(rows(common, 224), { resume: 0, callChange: 1, pause: 0 }, "two rows in the 14rem column");
    assert.deepEqual(rows([{ kind: "pause", value: 55 }, { kind: "callChange", value: 70 }]), { pause: 0, callChange: 0 });
    assert.deepEqual(rows([{ kind: "pause", value: 69 }, { kind: "callChange", value: 70 }], 448), { pause: 0, callChange: 1 });

    const html = renderToStaticMarkup(<ScoreLadder label="Funding pressure" value={85} lines={common} />);
    assert.match(html, /@container/, "the ladder is its own query container");
    assert.match(html, /--ladder-rows:1;--ladder-rows-wide:0/);
  });

  it("shades the range each line guards, on the side it faces", () => {
    /* Funding pressure pauses above its pause line and resumes below its
       resume line; risk appetite is the other way up. The side comes from the
       lines themselves, never from which score it is. */
    const zone = (html: string, kind: string) =>
      new RegExp(`data-ladder-zone="${kind}"[^>]*style="left:([\\d.]+)%;width:([\\d.]+)%"`).exec(html)?.slice(1).map(Number);
    const pressure = renderToStaticMarkup(<ScoreLadder label="Funding pressure" value={90} lines={lines} />);
    assert.deepEqual(zone(pressure, "pause"), [76, 24]);
    assert.deepEqual(zone(pressure, "resume"), [0, 66]);

    const appetite: LadderLine[] = [
      { kind: "pause", value: 44 },
      { kind: "callChange", value: 50 },
      { kind: "resume", value: 54 },
    ];
    const risk = renderToStaticMarkup(<ScoreLadder label="Risk appetite" value={48} lines={appetite} />);
    assert.deepEqual(zone(risk, "pause"), [0, 44]);
    assert.deepEqual(zone(risk, "resume"), [54, 46]);

    /* One of the pair, faced by the change line; none at all with no second line to face away from. */
    const pauseOnly = renderToStaticMarkup(
      <ScoreLadder label="Funding pressure" value={60} lines={[{ kind: "pause", value: 76 }, { kind: "callChange", value: 70 }]} />,
    );
    assert.deepEqual(zone(pauseOnly, "pause"), [76, 24]);
    const changeOnly = renderToStaticMarkup(<ScoreLadder label="Funding pressure" value={60} lines={[{ kind: "callChange", value: 70 }]} />);
    assert.doesNotMatch(changeOnly, /data-ladder-zone/);
  });

  it("draws the move between the two dots only when the reading moved", () => {
    const moved = renderToStaticMarkup(<ScoreLadder label="Risk appetite" value={48} previous={56} lines={lines} />);
    assert.match(moved, /data-ladder-move[^>]*style="left:48%;width:8%"/);
    const still = renderToStaticMarkup(<ScoreLadder label="Funding pressure" value={90} previous={90} lines={lines} />);
    assert.doesNotMatch(still, /data-ladder-move/);
  });

  it("builds the three lines from the numbers a surface has, drawing only the ones it states", () => {
    assert.deepEqual(buildLadderLines({ pause: 76, resume: 66, callChange: 70 }), [
      { kind: "pause", value: 76 },
      { kind: "resume", value: 66 },
      { kind: "callChange", value: 70 },
    ]);
    assert.deepEqual(buildLadderLines({ callChange: 70 }), [{ kind: "callChange", value: 70 }]);
  });
});

describe("ScoreCell", () => {
  it("prints value, line, distance and last week in that order", () => {
    assert.equal(
      formatScoreReference({ label: "Funding pressure", value: 12, line: { value: 76, label: "pause line" }, previous: 15 }),
      "Funding pressure 12 of 100 · pause line 76 · 64 pts below · last week 15",
    );
    const html = renderToStaticMarkup(<ScoreCell label="Risk appetite" value={68} line={{ value: 44, label: "Pause line" }} previous={64} />);
    assert.ok(html.indexOf("68") < html.indexOf("Pause line"));
    assert.ok(html.indexOf("Pause line") < html.indexOf("Last week"));
  });

  it("prints a dated earlier reading as \"was 63 on Aug 31\", not as a second number", () => {
    /* "aug 31 63" reads as two numbers, so the text form changes its words when it has a date. */
    assert.equal(
      formatScoreReference({
        label: "Funding pressure",
        value: 90,
        line: { value: 76, label: "pause line" },
        previous: 63,
        previousDate: "Aug 31",
      }),
      "Funding pressure 90 of 100 · pause line 76 · 14 pts above · was 63 on Aug 31",
    );
    const html = renderToStaticMarkup(
      <ScoreCell label="Funding pressure" value={90} line={{ value: 76, label: "Pause line" }} previous={63} previousLabel="Aug 31" />,
    );
    assert.match(html, /Aug 31/);
    assert.doesNotMatch(html, /Last week/);
  });

  it("carries a reading that is not a score in its own units", () => {
    /* The base rate is a percent and the curve a spread; both are judged
       against a line the same way, and neither is "of 100". */
    assert.equal(
      formatScoreReference({
        label: "Short-term borrowing rate",
        value: 4.2,
        line: { value: 3.5, label: "Pressure line" },
        previous: 4.1,
        units: { suffix: "%", scale: "", distance: "" },
      }),
      "Short-term borrowing rate 4.2% · Pressure line 3.5% · 0.7% above · last week 4.1%",
    );
    const html = renderToStaticMarkup(
      <ScoreCell label="Curve" value={0.3} line={{ value: 0, label: "Inversion line" }} units={{ suffix: "pp", scale: "", distance: "" }} />,
    );
    assert.doesNotMatch(html, /of 100/);
    assert.match(html, /0\.3pp/);
  });
});

describe("AreaTable", () => {
  it("keeps the canonical order whatever order the rows arrive in", () => {
    const html = renderToStaticMarkup(
      <AreaTable
        caption="test"
        rows={[
          { area: "expansion-bets", rule: "Hold." },
          { area: "hiring", rule: "Backfills only." },
          { area: "capital-raising", rule: "If you plan to raise, start now." },
        ]}
      />,
    );
    const positions = ["hiring", "capital-raising", "expansion-bets"].map((area) => html.indexOf(`data-area="${area}"`));
    assert.deepEqual([...positions].sort((a, b) => a - b), positions);
    assert.equal(decisionAreaOrder[0], "hiring");
    assert.match(html, /—/, "an empty slot renders a dash, not a reflow");
  });

  it("labels the pause and resume cells in every row, for the stacked phone layout", () => {
    /* Below sm the header row is not drawn and each row restacks, so a cell
       that did not name itself would leave two bare conditions side by side. */
    const html = renderToStaticMarkup(
      <AreaTable
        caption="test"
        rows={[
          { area: "hiring", rule: "Backfills only.", pause: { line: "Funding pressure > 76" }, resume: { line: "Risk appetite > 54" } },
          { area: "product-tempo", rule: "Keep the roadmap." },
        ]}
      />,
    );
    const rows = html.split("data-area=").slice(1);
    assert.equal(rows.length, 2);
    for (const row of rows) {
      assert.match(row, />Pause line</);
      assert.match(row, />Resume line</);
    }
    assert.doesNotMatch(html, /class="[^"]*(?<![:\w-])min-w-\[/, "no minimum width outside sm, or the table scrolls sideways on a phone");
  });
});

describe("AreaTable moved rows", () => {
  it("marks the area the week moved, and only that one", () => {
    const html = renderToStaticMarkup(
      <AreaTable
        caption="test"
        rows={[
          { area: "hiring", rule: "Backfills only.", changed: "Pause still applies: no line crossed since Sep 30." },
          { area: "product-tempo", rule: "Keep the roadmap.", changed: "Resume line no longer met: risk appetite fell through 54.", moved: true },
        ]}
      />,
    );
    const rows = html.split("data-area=").slice(1);
    assert.doesNotMatch(rows[0] ?? "", /data-moved/);
    assert.match(rows[1] ?? "", /data-moved="true"/);
  });

  it("draws a line in force as a stamp, and a distance still to go as text", () => {
    const html = renderToStaticMarkup(
      <AreaTable
        caption="test"
        rows={[
          {
            area: "hiring",
            rule: "Backfills only.",
            pause: { line: "Funding pressure > 76", distance: "crossed" },
            resume: { line: "Funding pressure < 66", distance: "24 pts away" },
          },
        ]}
      />,
    );
    assert.match(html, /class="[^"]*rounded-sm border[^"]*text-semantic-caution-fg[^"]*">crossed</);
    assert.doesNotMatch(html, /class="[^"]*rounded-sm[^"]*">24 pts away</);
  });
});

describe("TrustStrip", () => {
  it("is four facts and, off /trust, a link", () => {
    const html = renderToStaticMarkup(
      <TrustStrip recordDateLabel="Sep 18, 2026" sourcesLive sourcesLabel="All sources live" confidenceLabel="HIGH" couldChangeNextWeek={false} href="/trust" />,
    );
    for (const cell of ["Data as of", "Sources", "Margin", "Could change next week"]) assert.match(html, new RegExp(cell));
    assert.match(html, /href="\/trust"/);
    assert.doesNotMatch(html, /HIGH|MED|LOW/, "the engine's confidence key must not reach the reader");
    assert.doesNotMatch(html, /Confidence/, "the margin is not called confidence on a page");
  });

  /* The margin cell prints the distance in the nearer score's own points, and the
     could-change cell no longer restates it (2026-10-09). */
  it("prints the margin in points and does not repeat it beside could-change", () => {
    const html = renderToStaticMarkup(
      <TrustStrip
        recordDateLabel="Oct 5, 2026"
        sourcesLive
        sourcesLabel="All sources live"
        confidenceLabel="LOW"
        margin={{ signal: "riskAppetite", points: 1 }}
        couldChangeNextWeek
      />,
    );
    assert.match(html, />Risk appetite 1 pt from its change line</);
    assert.match(html, />Yes</);
    assert.equal((html.match(/1 pt/g) ?? []).length, 1, "the distance prints once");
    const imputed = renderToStaticMarkup(
      <TrustStrip recordDateLabel="Oct 5, 2026" sourcesLive sourcesLabel="All sources live" confidenceLabel="LOW" margin={null} couldChangeNextWeek={false} />,
    );
    assert.match(imputed, /Not measured: an input is missing/);
  });

  /* The report intro's phone line (ui-ux-standards §XI): the record date and
     the could-change fact always print; a fact in its routine state folds
     behind the link to /trust, and an exception never does. */
  it("folds only the routine facts on a phone, and only when it links to /trust", () => {
    const cellClass = (html: string, label: string) =>
      new RegExp(`<div class="([^"]*)"><dt[^>]*>${label}</dt>`).exec(html)?.[1] ?? "";
    const base = { recordDateLabel: "Oct 5, 2026", sourcesLabel: "All sources live", couldChangeNextWeek: true };

    const routine = renderToStaticMarkup(<TrustStrip {...base} sourcesLive confidenceLabel="MED" href="/trust" phoneLayout="line" />);
    assert.match(cellClass(routine, "Sources"), /max-sm:hidden/);
    assert.match(cellClass(routine, "Margin"), /max-sm:hidden/);
    assert.doesNotMatch(cellClass(routine, "Data as of"), /max-sm:hidden/);
    assert.doesNotMatch(cellClass(routine, "Could change next week"), /max-sm:hidden/);

    const exceptions = renderToStaticMarkup(
      <TrustStrip {...base} sourcesLive={false} sourcesLabel="Cached snapshot" confidenceLabel="LOW" href="/trust" phoneLayout="line" />,
    );
    assert.doesNotMatch(cellClass(exceptions, "Sources"), /max-sm:hidden/, "cached sources always print");
    assert.doesNotMatch(cellClass(exceptions, "Margin"), /max-sm:hidden/, "a margin close to the line always prints");

    /* /trust has no link to fold behind: the strip is its System status. */
    const onTrust = renderToStaticMarkup(<TrustStrip {...base} sourcesLive confidenceLabel="MED" phoneLayout="line" />);
    assert.doesNotMatch(onTrust, /max-sm:hidden/);
  });
});

describe("MonthStrip", () => {
  const entries = [
    { recordDate: "2026-03-31", regime: "EXPANSION" },
    { recordDate: "2026-04-30", regime: "EXPANSION" },
    { recordDate: "2026-05-31", regime: "DEFENSIVE" },
    { recordDate: "2026-06-30", regime: "DEFENSIVE" },
    { recordDate: "2026-07-31", regime: "DEFENSIVE" },
  ];
  it("counts changes and the current run from the data", () => {
    assert.deepEqual(describeCurrentRun(entries), { label: "Cloudy", held: 3, since: "2026-05-31", latest: "2026-07-31" });
    const html = renderToStaticMarkup(<MonthStrip entries={[...entries].reverse()} />);
    assert.match(html, /1 change in conditions/);
    assert.match(html, /Cloudy, held 3 months since May 2026/);
    const visible = html.replace(/<[^>]+>/g, " ");
    assert.doesNotMatch(visible, /EXPANSION|DEFENSIVE/, "the strip must not print engine keys (the data-regime attribute is how it gets its colour)");
    /* Five month segments and one legend swatch per condition that appears. */
    assert.equal((html.match(/data-regime=/g) ?? []).length, 5 + 2);
    assert.match(visible, /Sunny\s+2 months/, "the legend names each colour and its months");
  });
});

describe("BriefFormatPicker preview framing", () => {
  it("renders a channel format header bar with readiness indicator", () => {
    const { BriefFormatPicker } = require("../app/components/briefFormatPicker");
    const { BRIEF_FORMATS } = require("../lib/report/briefArtifact");
    const html = renderToStaticMarkup(
      <BriefFormatPicker
        format="slack"
        activeFormat={BRIEF_FORMATS[0]}
        briefText="*Whether Weekly Brief*"
        copiedTarget={null}
        onSelect={() => {}}
        onCopy={() => {}}
      />,
    );
    assert.match(html, /Slack format/);
    assert.match(html, /Ready to paste/);
    assert.match(html, /<pre[^>]*>\*Whether Weekly Brief\*<\/pre>/);
  });
});

describe("Wayfinding shortcuts and deep-links", () => {
  it("links signal rows on homepage to evidence anchors on /signals", () => {
    const { WhatChangedSection } = require("../app/components/home/WhatChangedSection");
    const html = renderToStaticMarkup(
      <WhatChangedSection
        rows={[
          {
            key: "tightness",
            label: "Funding pressure",
            previous: 68,
            value: 72,
            delta: 4,
            previousLabel: "68",
            valueLabel: "72",
            increaseIsPositive: false,
          },
        ]}
        lead="Funding pressure rose this week."
        comparisonUnavailable={false}
      />,
    );
    assert.match(html, /href="\/signals#tightness"/);
    assert.match(html, /Funding pressure/);
  });

  it("provides a direct jump to #subscribe beside the call-change line", () => {
    const { WhatWouldChangeSection } = require("../app/components/home/WhatWouldChangeSection");
    const html = renderToStaticMarkup(
      <WhatWouldChangeSection
        ladders={[]}
        flipProximity={[]}
        reversalTrigger="Risk appetite crossing 50"
        callChangeLines={{ tightness: 70, riskAppetite: 50 }}
      />,
    );
    assert.match(html, /href="#subscribe"/);
    assert.match(html, /Get an email the day a line is crossed/);
  });

  /* The plan link was a pill among two copy buttons, four arrow links and a
     subscribe form at one weight. It is the section's primary button now; the
     decision record is in the footer ("Your record"), with the other three. */
  it("leads DoAndShareSection with the plan as its one primary action", () => {
    const { DoAndShareSection } = require("../app/components/home/DoAndShareSection");
    const html = renderToStaticMarkup(
      <DoAndShareSection
        operateHref="/operate"
        currentRecordDate="2026-09-28"
        currentRecordDateLabel="Sep 28, 2026"
      />,
    );
    const plan = /<a[^>]*href="\/operate"[^>]*>/.exec(html)?.[0] ?? "";
    assert.match(plan, /weather-button-primary|weather-cta-primary/, "the plan link is the primary button");
    assert.doesNotMatch(html, /Track your decision record|Stress-test a plan|Connect an AI assistant/);
    const layout = require("node:fs").readFileSync("app/layout.tsx", "utf8");
    assert.match(layout, /href="\/decisions"[^>]*>Your record</, "the decision record stays one click away, in the footer");
  });

  it("deep-links AreaTable consequence rows to #ops-monthly-action-summary on /operate", () => {
    const { toRoute } = require("../lib/navigation/routeType");
    const html = renderToStaticMarkup(
      <AreaTable
        caption="test"
        rows={[
          {
            area: "hiring",
            rule: "Backfills only.",
            pause: { line: "Funding pressure > 76", distance: "4 pts to line" },
            resume: { line: "Risk appetite > 54", distance: "6 pts to line" },
            changed: null,
            href: toRoute("/operate#ops-monthly-action-summary"),
          },
        ]}
      />,
    );
    assert.match(html, /href="\/operate#ops-monthly-action-summary"/);
  });
});
