import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ScoreLadder, buildLadderLines, describeLadderPosition, layoutLadderLabels, nearestLadderLine, type LadderLine } from "../app/components/ui/scoreLadder";
import { ScoreCell, formatScoreReference } from "../app/components/ui/scoreCell";
import { AreaTable } from "../app/components/ui/areaTable";
import { TrustStrip } from "../app/components/trustStrip";
import { MonthStrip, describeCurrentRun } from "../app/components/history/monthStrip";
import { RecordSection } from "../app/components/home/RecordSection";
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

  it("prefixes score links with signalLinkBase so tables off the homepage link back to it", () => {
    const html = renderToStaticMarkup(
      <AreaTable
        caption="test"
        signalLinkBase="/"
        rows={[{ area: "hiring", rule: "Backfills only." }]}
      />,
    );
    assert.match(html, /href="\/#signal-funding-pressure"/);
  });
});

describe("AreaTable moved rows", () => {
  it("marks the area the week moved, and only that one", () => {
    const html = renderToStaticMarkup(
      <AreaTable
        caption="test"
        rows={[
          { area: "hiring", rule: "Backfills only.", changed: "Pause still applies: no line crossed since Sep 30." },
          { area: "product-tempo", rule: "Keep the roadmap.", changed: "Resume line no longer met: risk appetite fell below 54.", moved: true },
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
            pause: { line: "Funding pressure > 76", distance: "crossed", state: "crossed" },
            resume: { line: "Funding pressure < 66", distance: "24 pts away" },
          },
          {
            area: "product-tempo",
            rule: "Keep the roadmap.",
            pause: { line: "Risk appetite < 44", distance: "4 pts away", state: "near" },
            resume: { line: "Risk appetite > 54", distance: "already met", state: "clear" },
          },
          {
            area: "burn-discipline",
            rule: "Payback on every line.",
            pause: { line: "Funding pressure > 76", distance: "crossed", state: "crossed" },
            resume: { line: "Funding pressure < 66", distance: "already met", state: "clear" },
          },
        ]}
      />,
    );
    const badge = (state: string) => new RegExp(`<span data-line-state-badge="${state}" class="([^"]*)">([\\s\\S]*?)</span></span>`);
    const crossed = badge("crossed").exec(html);
    assert.ok(crossed, "a crossed pause line is the state badge");
    assert.match(crossed[1], /rounded-sm border/, "in force, so a stamp");
    /* The line states' own tokens, not a condition's (2026-10-09). */
    assert.match(crossed[1], /text-line-crossed-fg/);
    assert.match(crossed[2], /lucide-pause[\s\S]*<span>crossed$/, "the pause glyph beside the word");
    const near = badge("near").exec(html);
    assert.ok(near, "a pause line close to the reading is the state badge");
    assert.doesNotMatch(near[1], /border/, "a distance still to go is not framed");
    assert.match(near[2], /lucide-circle-dashed/);
    const met = badge("clear").exec(html);
    assert.ok(met, "a resume line met is the state badge");
    assert.match(met[1], /rounded-sm border[^"]*text-line-clear-fg|text-line-clear-fg[^"]*rounded-sm border/);
    assert.match(met[2], /lucide-play/);
    // An area that is not on hold has no hold to lift: its met resume line is
    // not a restart (2026-10-14).
    assert.match(html, /Risk appetite &gt; 54<span class="block text-xs text-slate-400">nothing to resume<\/span>/);
    assert.match(html, /<span class="block text-xs text-slate-400">24 pts away<\/span>/, "a resume line still to reach is plain text, with no glyph");
  });
});

describe("TrustStrip", () => {
  const onRecord = { key: "record" as const, value: "The record's inputs", warning: null };

  it("is four facts and, off /trust, a link", () => {
    const html = renderToStaticMarkup(
      <TrustStrip recordDateLabel="Sep 18, 2026" sourcesLive sourcesLabel="All sources live" confidenceLabel="HIGH" couldChangeNextWeek={false} basis={onRecord} href="/trust" />,
    );
    assert.deepEqual([...html.matchAll(/<dt[^>]*>([^<]+)<\/dt>/g)].map((match) => match[1]), ["Data as of", "Sources", "Margin", "Scored on"]);
    assert.match(html, /The record(&#x27;|')s inputs/, "the call states its basis");
    assert.match(html, /Not expected to change next week/, "the margin cell says whether the call could change");
    assert.match(html, /href="\/trust"/);
    assert.doesNotMatch(html, /HIGH|MED|LOW/, "the engine's confidence key must not reach the reader");
    assert.doesNotMatch(html, /Confidence/, "the margin is not called confidence on a page");
  });

  /* The margin cell prints the distance in the nearer score's own points, then whether
     the call could change next week: one cell, where a fourth answered "Yes" beside
     the distance it restated (2026-10-09). */
  it("prints the margin in points and says in the same cell whether the call could change", () => {
    const html = renderToStaticMarkup(
      <TrustStrip
        recordDateLabel="Oct 5, 2026"
        sourcesLive
        sourcesLabel="All sources live"
        confidenceLabel="LOW"
        margin={{ signal: "riskAppetite", points: 1 }}
        couldChangeNextWeek
        basis={onRecord}
      />,
    );
    assert.match(html, />Risk appetite 1 pt from its change line<span[^>]*data-next-week[^>]*> · Could change next week<\/span>/);
    assert.doesNotMatch(html, />Yes</);
    assert.doesNotMatch(html, /<dt[^>]*>Could change next week<\/dt>/, "no fourth cell");
    assert.equal((html.match(/1 pt/g) ?? []).length, 1, "the distance prints once");
    /* With the regime, the line is named by what is on its other side (2026-10-27). */
    const named = renderToStaticMarkup(
      <TrustStrip
        recordDateLabel="Oct 5, 2026"
        sourcesLive
        sourcesLabel="All sources live"
        confidenceLabel="LOW"
        margin={{ signal: "riskAppetite", points: 1 }}
        couldChangeNextWeek
        basis={onRecord}
        regime="DEFENSIVE"
      />,
    );
    assert.match(named, />Risk appetite 1 pt from Freezing<span[^>]*data-next-week/);
    const waiting = renderToStaticMarkup(
      <TrustStrip recordDateLabel="Oct 5, 2026" sourcesLive sourcesLabel="All sources live" confidenceLabel="MED" margin={{ signal: "tightness", points: 9 }} couldChangeNextWeek changeReason="a change is waiting on a second reading" basis={onRecord} />,
    );
    assert.match(waiting, /Could change next week: a change is waiting on a second reading/);
    const imputed = renderToStaticMarkup(
      <TrustStrip recordDateLabel="Oct 5, 2026" sourcesLive sourcesLabel="All sources live" confidenceLabel="LOW" margin={null} couldChangeNextWeek={false} basis={onRecord} />,
    );
    assert.match(imputed, /Not measured: an input is missing/);
  });

  /* The report intro's phone line (ui-ux-standards §XI): the record date and
     the margin cell, which says whether the call could change, always print;
     live sources fold behind the link to /trust, and cached ones never do. */
  it("folds only the routine facts on a phone, and only when it links to /trust", () => {
    const cellClass = (html: string, label: string) =>
      new RegExp(`<div class="([^"]*)"><dt[^>]*>${label}</dt>`).exec(html)?.[1] ?? "";
    const base = { recordDateLabel: "Oct 5, 2026", sourcesLabel: "All sources live", couldChangeNextWeek: true, basis: onRecord };

    const routine = renderToStaticMarkup(<TrustStrip {...base} sourcesLive confidenceLabel="MED" href="/trust" phoneLayout="line" />);
    assert.match(cellClass(routine, "Sources"), /max-sm:hidden/);
    assert.doesNotMatch(cellClass(routine, "Margin"), /max-sm:hidden/, "whether the call could change always prints");
    assert.doesNotMatch(cellClass(routine, "Data as of"), /max-sm:hidden/);

    const exceptions = renderToStaticMarkup(
      <TrustStrip {...base} sourcesLive={false} sourcesLabel="Cached snapshot" confidenceLabel="LOW" href="/trust" phoneLayout="line" />,
    );
    assert.doesNotMatch(cellClass(exceptions, "Sources"), /max-sm:hidden/, "cached sources always print");
    assert.doesNotMatch(cellClass(exceptions, "Margin"), /max-sm:hidden/, "a margin close to the line always prints");

    assert.match(cellClass(routine, "Scored on"), /max-sm:hidden/, "the record's own inputs fold like live sources");
    const warned = renderToStaticMarkup(
      <TrustStrip
        {...base}
        sourcesLive
        confidenceLabel="MED"
        href="/trust"
        phoneLayout="line"
        basis={{ ...onRecord, warning: "Startup-market inputs would put risk appetite at 49, below its change line." }}
      />,
    );
    assert.doesNotMatch(cellClass(warned, "Scored on"), /max-sm:hidden/, "a warning always prints");
    const extended = renderToStaticMarkup(
      <TrustStrip {...base} sourcesLive confidenceLabel="MED" href="/trust" phoneLayout="line" basis={{ key: "extended", value: "More inputs than the record", warning: null }} />,
    );
    assert.doesNotMatch(cellClass(extended, "Scored on"), /max-sm:hidden/, "a reading scored on more than the record always says so");

    /* /trust has no link to fold behind: the strip is its System status. */
    const onTrust = renderToStaticMarkup(<TrustStrip {...base} sourcesLive confidenceLabel="MED" phoneLayout="line" />);
    assert.doesNotMatch(onTrust, /max-sm:hidden/);
  });

  /* The record basis (2026-10-09): the inputs the record cannot test move no line, and
     where they would, the cell says so after the basis, with the published week's note. */
  it("prints what the inputs left out would do to a line, and the published week's note, in the basis cell", () => {
    const html = renderToStaticMarkup(
      <TrustStrip
        recordDateLabel="Oct 9, 2026"
        sourcesLive
        sourcesLabel="All sources live"
        confidenceLabel="MED"
        couldChangeNextWeek={false}
        basis={{
          ...onRecord,
          warning: "Startup-market inputs would put risk appetite at 49, below its change line.",
          note: "The brief for the week of Oct 6 read Freezing.",
        }}
      />,
    );
    assert.match(
      html,
      /<dt[^>]*>Scored on<\/dt><dd[^>]*>The record(&#x27;|')s inputs<span[^>]*data-basis-warning[^>]*> · Startup-market inputs would put risk appetite at 49, below its change line\. They are left out because they can(&#x27;|')t be scored against past month-ends\. The brief for the week of Oct 6 read Freezing\.<\/span>/,
    );
  });
});

describe("MonthStrip", () => {
  it("names both scores in a month's hover title when it has them", () => {
    const html = renderToStaticMarkup(
      <MonthStrip
        entries={[
          { recordDate: "2026-08-31", regime: "EXPANSION", tightness: 63, riskAppetite: 56 },
          { recordDate: "2026-09-30", regime: "DEFENSIVE", tightness: 90, riskAppetite: 56 },
        ]}
      />,
    );
    assert.match(html, /title="Sep 2026: Cloudy · Funding pressure 90, Risk appetite 56"/);
    const bare = renderToStaticMarkup(<MonthStrip entries={[{ recordDate: "2026-09-30", regime: "DEFENSIVE" }]} />);
    assert.match(bare, /title="Sep 2026: Cloudy"/);
  });

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
    /* The count and the run are /history's tiles and stamp; the band keeps them only
       in its text alternative, and its caption is its domain (2026-10-09). */
    const srOnly = /<p class="sr-only">([\s\S]*?)<\/p>/.exec(html)?.[1]?.replace(/<!--[\s\S]*?-->/g, "") ?? "";
    assert.match(srOnly, /1 change; Cloudy held 3 months\./);
    const caption = /<figcaption[^>]*>([\s\S]*?)<\/figcaption>/.exec(html)?.[1]?.replace(/<[^>]+>/g, "") ?? "";
    assert.equal(caption.replace(/\s+/g, " ").trim(), "Mar 2026 – Jul 2026");
    const visible = html.replace(/<p class="sr-only">[\s\S]*?<\/p>/, "").replace(/<[^>]+>/g, " ");
    assert.doesNotMatch(visible, /change in conditions|held 3 months/, "no visible restatement of the tiles or the stamp");
    assert.doesNotMatch(visible, /EXPANSION|DEFENSIVE/, "the strip must not print engine keys (the data-regime attribute is how it gets its colour)");
    /* Five month segments, one glyph per condition in the key, and one per run
       long enough to carry it (both runs here), so the band reads in greyscale. */
    assert.equal((html.match(/data-regime=/g) ?? []).length, 5 + 2 + 2);
    assert.equal((html.match(/data-strip-run-glyph/g) ?? []).length, 2);
    assert.match(html, /lucide-sun[\s\S]*lucide-cloud/, "each run draws its own condition's glyph");
    assert.match(visible, /Sunny\s+2 months/, "the legend names each colour and its months");
  });

  it("stacks markers by their computed month slot, so same-month decisions do not overlap", () => {
    /* Two decisions recorded on different days of the same month both land on
       the June month-end: stacking by exact date would give both stack 0 and
       the diamonds would draw on top of each other. */
    const html = renderToStaticMarkup(
      <MonthStrip
        entries={entries}
        markers={[
          { recordDate: "2026-06-03", label: "First decision", fillClassName: "bg-sky-600" },
          { recordDate: "2026-06-24", label: "Second decision", fillClassName: "bg-amber-500" },
        ]}
      />,
    );
    const tops = [...html.matchAll(/top:\s*(-?\d+(?:\.\d+)?)px/g)].map((match) => Number(match[1]));
    assert.equal(tops.length, 2);
    assert.equal(tops[0], -11, "the first marker in a slot sits on the band");
    assert.equal(tops[1], -22, "the second marker in the same slot stacks above it");
    // Different months still don't stack with each other.
    const separate = renderToStaticMarkup(
      <MonthStrip
        entries={entries}
        markers={[
          { recordDate: "2026-05-02", label: "May decision", fillClassName: "bg-sky-600" },
          { recordDate: "2026-06-24", label: "June decision", fillClassName: "bg-amber-500" },
        ]}
      />,
    );
    const separateTops = [...separate.matchAll(/top:\s*(-?\d+(?:\.\d+)?)px/g)].map((match) => Number(match[1]));
    assert.deepEqual(separateTops, [-11, -11], "markers in different slots sit on the band");
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

  /* The alert is its own section now, directly under "What would change this
     guidance" (2026-10-09), so the link to it that closed that section is gone
     and the section's heading says what the form is for. */
  it("puts the alert under the lines it watches, headed by what it does", () => {
    const { AlertSection } = require("../app/components/home/AlertSection");
    const html = renderToStaticMarkup(<AlertSection />);
    assert.match(html, /^<section id="subscribe"/);
    assert.match(html, /<h2[^>]*>Get notified when something changes<\/h2>/);
    assert.match(html, /Every Monday too/, "the Monday email stays one choice away");
    assert.doesNotMatch(html, /Tell me when the guidance changes/, "the form does not restate the heading");
    const { WhatWouldChangeSection } = require("../app/components/home/WhatWouldChangeSection");
    const watch = renderToStaticMarkup(
      <WhatWouldChangeSection ladders={[]} flipProximity={[]} reversalTrigger="Risk appetite crossing 50" callChangeLines={{ tightness: 70, riskAppetite: 50 }} />,
    );
    assert.doesNotMatch(watch, /href="#subscribe"/);
  });

  /* Sharing is the page's last line: the way out to /share and the published brief,
     with no heading over them (2026-10-09). The plan link closes the areas section,
     and the decision record is in the footer ("Your decisions"). */
  it("keeps the closing line to the share link and the published brief", () => {
    const { ShareLinks } = require("../app/components/home/ShareLinks");
    const html = renderToStaticMarkup(<ShareLinks currentRecordDate="2026-09-28" />);
    assert.doesNotMatch(html, /<h2/, "no section heading over two links");
    assert.doesNotMatch(html, /href="\/operate"/, "the plan link is the areas section's");
    assert.doesNotMatch(html, /Track your decision record|Stress-test a plan|Connect an AI assistant|Subscribe/);
    const layout = require("node:fs").readFileSync("app/layout.tsx", "utf8");
    assert.match(layout, /href="\/decisions"[^>]*>Your decisions</, "the decision record stays one click away, in the footer");
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

describe("RecordSection", () => {
  const record = [
    { recordDate: "2026-07-31", regime: "EXPANSION" },
    { recordDate: "2026-08-31", regime: "EXPANSION" },
    { recordDate: "2026-09-30", regime: "DEFENSIVE" },
  ];
  const lines = { tightness: 70, riskAppetite: 50 };
  it("leads with the answer, then draws the record as the month strip, then the sentences that count it", () => {
    /* "Has this happened before?" answered in sentences only until 2026-10-21; the
       answer moved above its band on 2026-10-27, so a frame of the section leads with it. */
    const html = renderToStaticMarkup(
      <RecordSection
        lastTime={null}
        callChangeLines={lines}
        turningPoints={[]}
        spellLengths={{ lead: "This spell has run 1 month-end so far.", rest: "A count from the record." }}
        record={record}
      />,
    );
    assert.match(html, /data-section-lead[^>]*>This spell has run 1 month-end so far\.[\s\S]*data-month-strip[\s\S]*A count from the record\./);
  });

  it("leaves the band out of an archived view, which passes no record", () => {
    const html = renderToStaticMarkup(
      <RecordSection lastTime={null} callChangeLines={lines} turningPoints={[{ label: "Sep 2026, Sunny to Cloudy", href: "/?month=9&year=2026" }]} />,
    );
    assert.doesNotMatch(html, /data-month-strip/);
  });
});
