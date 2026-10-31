import { ScreenshotCaption } from "../components/screenshotCaption";
import { FindingCard } from "../components/ui/findingCard";
import monthly from "../../data/advice-corpus/monthly.json";
import { ADVICE_STANCE_DEFINITIONS } from "../../lib/adviceStance";
import { getRegimePublicLabel } from "../../lib/regimePresentation";
import { getTimeMachineRegimeSeries } from "../../lib/timeMachine/timeMachineCache";
import { SecondaryPageSection } from "../components/secondaryPageShell";

/*
 * The advice corpus on /concepts: every dated post from ten investors' archives, labelled
 * by a rule registered before any was read, drawn quarter by quarter against funding
 * pressure. The curated list above it picks famous writing; this counts all of it.
 *
 * Shares come from data/advice-corpus/monthly.json (generated from the committed labels,
 * held to them by tests/adviceCorpusData.test.ts); funding pressure and the changes in
 * conditions come from the month-end record, so the chart cannot disagree with /history.
 * The method, the hypotheses and every number with its interval live in the two documents
 * linked at the end, not here.
 */

/* Served from this site (app/research/), because the repository is private. */
const REGISTRATION_URL = "/research/advice-corpus-preregistration.md";
const RESULTS_URL = "/research/advice-corpus-results.md";
const NULL_RESULT_URL = "/research/advice-corpus-null-result.md";
const FUNDING_LINE = 70;
/** A quarter with fewer eligible posts than this draws no point: one post is not a share. */
const MIN_POSTS = 3;

type Quarter = {
  period: string;
  posts: number;
  firms: number;
  expand: number | null;
  conserve: number | null;
  craft: number | null;
  fundingPressure: number | null;
};

const quarterOfMonth = (month: string) => `${month.slice(0, 4)}Q${Math.floor((Number(month.slice(5, 7)) - 1) / 3) + 1}`;
const quarterLabel = (period: string) => `${period.slice(0, 4)} Q${period.slice(5)}`;
const percent = (share: number | null) => (share === null ? "–" : `${Math.round(share * 100)}%`);

function buildModel() {
  const series = getTimeMachineRegimeSeries(Number.MAX_SAFE_INTEGER);
  const pressureByQuarter = new Map<string, number[]>();
  for (const entry of series) {
    const quarter = quarterOfMonth(entry.recordDate.slice(0, 7));
    pressureByQuarter.set(quarter, [...(pressureByQuarter.get(quarter) ?? []), entry.tightness]);
  }
  const quarters: Quarter[] = monthly.quarters.map((row) => {
    const pressure = pressureByQuarter.get(row.period) ?? [];
    const enough = row.posts >= MIN_POSTS;
    return {
      period: row.period,
      posts: row.posts,
      firms: row.firms,
      expand: enough ? row.expand : null,
      conserve: enough ? row.conserve : null,
      craft: enough ? row.craft : null,
      fundingPressure: pressure.length > 0 ? Math.round(pressure.reduce((sum, value) => sum + value, 0) / pressure.length) : null,
    };
  });
  const first = monthly.quarters[0]?.period ?? "";
  const last = monthly.quarters.at(-1)?.period ?? "";
  const changes = series.flatMap((entry, index) => {
    const previous = series[index - 1];
    const month = entry.recordDate.slice(0, 7);
    if (!previous || previous.regime === entry.regime || quarterOfMonth(month) < first || quarterOfMonth(month) > last) return [];
    return [{ month, from: getRegimePublicLabel(previous.regime), to: getRegimePublicLabel(entry.regime) }];
  });
  /* The first era above the line is the crossing the study registered. The delta is the
     difference between the two era shares the finding prints, so the chart annotation and
     the sentence cannot disagree. */
  const [below, above] = monthly.eras;
  const delta = below && above ? Math.round((above.expand - below.expand) * 100) : null;
  return { quarters, changes, crossingMonth: above?.from ?? null, delta };
}

/*
 * Two drawings of one chart (2026-10-27). In one 680-unit drawing a phone scaled the
 * labels to about 5px; no single font size reads at both widths, because SVG text scales
 * with its box. The phone drawing is 360 units wide, drawn at about 1:1, with 11px labels
 * and a year every four years; from `sm` the wide one, as before.
 */
type ChartLayout = { viewW: number; plotLeft: number; plotRight: number; label: number; tick: number; yearEvery: number };
const WIDE: ChartLayout = { viewW: 680, plotLeft: 40, plotRight: 600, label: 11, tick: 10, yearEvery: 2 };
const NARROW: ChartLayout = { viewW: 360, plotLeft: 40, plotRight: 298, label: 11, tick: 11, yearEvery: 4 };
const TOP_Y = 18;
const TOP_H = 64;
const BOTTOM_Y = 112;
const BOTTOM_H = 150;
const AXIS_Y = BOTTOM_Y + BOTTOM_H;
const VIEW_H = AXIS_Y + 26;

const monthLabel = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
const formatMonth = (month: string) => monthLabel.format(new Date(`${month}-15T00:00:00Z`));

/** One path per unbroken run of points; a quarter with no share breaks the line. */
function linePath(values: readonly (number | null)[], x: (index: number) => number, y: (value: number) => number) {
  let path = "";
  let drawing = false;
  values.forEach((value, index) => {
    if (value === null) {
      drawing = false;
      return;
    }
    path += `${drawing ? "L" : "M"}${x(index).toFixed(1)} ${y(value).toFixed(1)}`;
    drawing = true;
  });
  return path;
}

/** Agreement of the local model's stance labels with the reviewer's, from the results document §3. */
const STANCE_KAPPA = "0.52";

const monthsBetween = (from: string, to: string) =>
  (Number(to.slice(0, 4)) - Number(from.slice(0, 4))) * 12 + Number(to.slice(5, 7)) - Number(from.slice(5, 7)) + 1;

/**
 * The measured result, stated as the finding it is: the registered prediction, the
 * observed move, and the limits that travel with it. Numbers come from the committed
 * eras; the direction and the kappa are the results document's.
 */
function buildFinding() {
  const [below, above] = monthly.eras;
  if (!below || !above) return null;
  const pct = (share: number) => `${Math.round(share * 100)}%`;
  const signed = (points: number) => `${points >= 0 ? "+" : "−"}${Math.abs(points)}`;
  const expandDelta = Math.round((above.expand - below.expand) * 100);
  const conserveDelta = Math.round((above.conserve - below.conserve) * 100);
  return {
    claim: "Investor advice did not turn conservative when money got expensive.",
    evidence: [
      `From the decade below funding pressure's line to the months above it, the share telling founders to expand moved ${signed(expandDelta)} points and the share telling them to conserve moved ${signed(conserveDelta)}.`,
      `Before July 2022, ${pct(below.expand)} told founders to expand and ${pct(below.conserve)} to conserve. In the ${monthsBetween(above.from, above.to)} months funding pressure then stayed above its line, the shares were ${pct(above.expand)} and ${pct(above.conserve)}.`,
      "What moved instead was the scoreboard: efficiency measures entered the vocabulary in 2022 while the advice kept pointing the same way.",
    ],
    limit: `The study predicted the opposite in advance, and its registered tests count the result against that prediction. The labels are a local model's, agreeing with a careful reader on about two posts in three (kappa ${STANCE_KAPPA}, below the 0.6 the study set itself). One crossing cannot separate funding pressure from everything else that changed that year.`,
  };
}

function CorpusChart({
  layout,
  quarters,
  changes,
  crossingMonth,
  delta,
  className,
}: {
  layout: ChartLayout;
  quarters: ReturnType<typeof buildModel>["quarters"];
  changes: ReturnType<typeof buildModel>["changes"];
  crossingMonth: ReturnType<typeof buildModel>["crossingMonth"];
  delta: ReturnType<typeof buildModel>["delta"];
  className: string;
}) {
  const firstQuarter = quarters.at(0);
  if (!firstQuarter) return null;
  const step = (layout.plotRight - layout.plotLeft) / (quarters.length - 1);
  const xOf = (index: number) => layout.plotLeft + index * step;
  const firstYear = Number(firstQuarter.period.slice(0, 4));
  /* A change is drawn at its month, inside its quarter, so two changes in one year stay apart. */
  const xOfMonth = (month: string) => {
    const offset = (Number(month.slice(0, 4)) - firstYear) * 4 + (Number(month.slice(5, 7)) - 1) / 3;
    return layout.plotLeft + offset * step;
  };
  const shareY = (share: number) => BOTTOM_Y + BOTTOM_H - share * BOTTOM_H;
  const pressureY = (value: number) => TOP_Y + TOP_H - (value / 100) * TOP_H;
  const pressure = quarters.map((quarter) => quarter.fundingPressure);
  const pressureArea = `${linePath(pressure, xOf, pressureY)}L${xOf(quarters.length - 1)} ${TOP_Y + TOP_H}L${layout.plotLeft} ${TOP_Y + TOP_H}Z`;
  const years = quarters.flatMap((quarter, index) => (quarter.period.endsWith("Q1") && Number(quarter.period.slice(0, 4)) % layout.yearEvery === 0 ? [{ year: quarter.period.slice(0, 4), x: xOf(index) }] : []));
  const lastExpand = [...quarters].reverse().find((quarter) => quarter.expand !== null);
  const lastIndex = lastExpand ? quarters.indexOf(lastExpand) : -1;
  const expandLabel = ADVICE_STANCE_DEFINITIONS.expand.label;
  const conserveLabel = ADVICE_STANCE_DEFINITIONS.conserve.label;
  const craftLabel = ADVICE_STANCE_DEFINITIONS.craft.label;
  return (
    <svg viewBox={`0 0 ${layout.viewW} ${VIEW_H}`} className={className} aria-hidden="true">
      <text x={layout.plotLeft} y={TOP_Y - 6} fontSize={layout.label} fill="var(--app-text-muted)">
        Funding pressure (0–100), quarter average
      </text>
      <path d={pressureArea} fill="var(--phase-trace)" opacity="0.28" />
      <path d={linePath(pressure, xOf, pressureY)} fill="none" stroke="var(--phase-trace)" strokeWidth="1.5" />
      <line x1={layout.plotLeft} x2={layout.plotRight} y1={pressureY(FUNDING_LINE)} y2={pressureY(FUNDING_LINE)} stroke="var(--phase-boundary)" strokeDasharray="3 3" />
      <text x={layout.plotRight + 4} y={pressureY(FUNDING_LINE) + 4} fontSize={layout.tick} fill="var(--app-text-muted)">
        {FUNDING_LINE}
      </text>

      <text x={layout.plotLeft} y={BOTTOM_Y - 8} fontSize={layout.label} fill="var(--app-text-muted)">
        Share of posts, firms weighted equally
      </text>
      {[0, 0.25, 0.5, 0.75, 1].map((tick) => (
        <g key={tick}>
          <line x1={layout.plotLeft} x2={layout.plotRight} y1={shareY(tick)} y2={shareY(tick)} stroke="var(--phase-grid)" />
          <text x={layout.plotLeft - 6} y={shareY(tick) + 3.5} textAnchor="end" fontSize={layout.tick} fill="var(--app-text-muted)">
            {`${tick * 100}%`}
          </text>
        </g>
      ))}
      {changes.map((change) => (
        <line
          key={change.month}
          data-change={change.month}
          x1={xOfMonth(change.month)}
          x2={xOfMonth(change.month)}
          y1={TOP_Y}
          y2={AXIS_Y}
          stroke="var(--phase-boundary)"
          strokeWidth="1"
        />
      ))}
      {/* Ink and dash, not hue: every hue on this site already names a set of conditions or a
          line state, and the two series are neither. */}
      <path d={linePath(quarters.map((quarter) => quarter.expand), xOf, shareY)} fill="none" stroke="var(--app-text)" strokeWidth="2" strokeLinejoin="round" />
      <path
        d={linePath(quarters.map((quarter) => quarter.conserve), xOf, shareY)}
        fill="none"
        stroke="var(--app-text-secondary)"
        strokeWidth="2"
        strokeDasharray="5 3"
        strokeLinejoin="round"
      />
      {/* The third stance, and the point of the chart: method advice barely moved across the
          line. It drew nothing before 2026-10-31, so the sentence "the advice kept pointing
          the same way" had no picture. */}
      <path
        d={linePath(quarters.map((quarter) => quarter.craft), xOf, shareY)}
        fill="none"
        stroke="var(--app-text-muted)"
        strokeWidth="1.5"
        strokeDasharray="1.5 2.5"
        strokeLinejoin="round"
      />
      {lastExpand && lastIndex >= 0 ? (
        <g fontSize={layout.label} fontWeight="600" fill="var(--app-text-secondary)">
          <text x={xOf(lastIndex) + 6} y={shareY(lastExpand.expand ?? 0) + 4}>
            {expandLabel}
          </text>
          <text x={xOf(lastIndex) + 6} y={shareY(lastExpand.conserve ?? 0) + 4}>
            {conserveLabel}
          </text>
        </g>
      ) : null}
      {/* The registered crossing, drawn where it happened and labelled with the move the
          study did not predict. Without it the reader has to read three sentences to learn
          that the two lines moved the wrong way; the chart itself said nothing about it. */}
      {crossingMonth && delta !== null ? (
        <g data-funding-crossing={crossingMonth}>
          <line
            x1={xOfMonth(crossingMonth)}
            x2={xOfMonth(crossingMonth)}
            y1={BOTTOM_Y}
            y2={AXIS_Y}
            stroke="var(--app-text-muted)"
            strokeWidth="1"
            strokeDasharray="2 3"
          />
          <text
            x={xOfMonth(crossingMonth) - 5}
            y={BOTTOM_Y + 13}
            textAnchor="end"
            fontSize={layout.tick}
            fill="var(--app-text-secondary)"
          >
            <tspan x={xOfMonth(crossingMonth) - 5}>Funding pressure above {FUNDING_LINE}</tspan>
            <tspan x={xOfMonth(crossingMonth) - 5} dy={12}>
              {expandLabel} {delta >= 0 ? "+" : "−"}
              {Math.abs(delta)} pts after
            </tspan>
          </text>
        </g>
      ) : null}
      {years.map((tick) => (
        <text key={tick.year} x={tick.x} y={AXIS_Y + 16} textAnchor="middle" fontSize={layout.tick} fill="var(--app-text-muted)">
          {tick.year}
        </text>
      ))}
      {/* Hover: one band per quarter, its values in the native tooltip. */}
      {quarters.map((quarter, index) => (
        <rect key={quarter.period} x={xOf(index) - step / 2} y={TOP_Y} width={step} height={AXIS_Y - TOP_Y} fill="transparent">
          <title>
            {`${quarterLabel(quarter.period)}: ${expandLabel.toLowerCase()} ${percent(quarter.expand)}, ${conserveLabel.toLowerCase()} ${percent(quarter.conserve)}, ${craftLabel.toLowerCase()} ${percent(quarter.craft)} of ${quarter.posts} posts from ${quarter.firms} firms; funding pressure ${quarter.fundingPressure ?? "–"}`}
          </title>
        </rect>
      ))}
    </svg>
  );
}

export function AdviceCorpusSection() {
  const { quarters, changes, crossingMonth, delta } = buildModel();
  const finding = buildFinding();
  const firstQuarter = quarters[0];
  if (!firstQuarter || quarters.length < 2 || !finding) return null;
  const expandLabel = ADVICE_STANCE_DEFINITIONS.expand.label;
  const conserveLabel = ADVICE_STANCE_DEFINITIONS.conserve.label;
  const craftLabel = ADVICE_STANCE_DEFINITIONS.craft.label;
  const largestFirm = monthly.firmPosts[0];
  const largestShare = largestFirm ? Math.round((largestFirm.posts / monthly.eligiblePosts) * 100) : null;

  return (
    <SecondaryPageSection
      title="The advice gap"
      description={`${monthly.eligiblePosts.toLocaleString("en-US")} posts about money addressed to founders, from ${monthly.firms.length} firms' archives, each labelled by a rule written down before any was read.`}
    >
      {/* The finding leads, the chart is its evidence (2026-10-31). The section used to
          open with the drawing and reach the result three paragraphs later, which is the
          opposite of the brief's own delta-first rule. */}
      <div data-advice-corpus-finding>
        <FindingCard
          claim={finding.claim}
          evidence={
            <>
              {finding.evidence.map((sentence) => (
                <p key={sentence}>{sentence}</p>
              ))}
            </>
          }
          limit={finding.limit}
          source={{ label: "The results", href: RESULTS_URL, note: "§3 and §4" }}
        />
        <p className="mt-2 max-w-prose text-fluid-nano text-slate-400">
          What would change this: a second crossing with more posts after it, or labels that clear the study&apos;s
          agreement bar. The corpus is dated, so a later run can.
        </p>
      </div>
      <figure className="mt-4 space-y-3" data-advice-corpus-chart>
        {/* The chart is for sighted readers; the sentence and the table below carry the same values. */}
        <p className="sr-only">
          {`Share of posts prescribing expansion and conservation each quarter, ${quarterLabel(firstQuarter.period)} to ${quarterLabel(quarters.at(-1)?.period ?? "")}, with funding pressure on the same dates. The table below has every value.`}
        </p>
        <CorpusChart layout={NARROW} quarters={quarters} changes={changes} crossingMonth={crossingMonth} delta={delta} className="block h-auto w-full sm:hidden" />
        <CorpusChart layout={WIDE} quarters={quarters} changes={changes} crossingMonth={crossingMonth} delta={delta} className="block h-auto w-full max-w-3xl max-sm:hidden" />
        <ul aria-hidden="true" className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-300">
          <li className="flex items-center gap-1.5">
            <svg aria-hidden="true" width="18" height="4" className="shrink-0">
              <line x1="0" x2="18" y1="2" y2="2" stroke="var(--app-text)" strokeWidth="2" />
            </svg>
            {expandLabel}: {ADVICE_STANCE_DEFINITIONS.expand.question}
          </li>
          <li className="flex items-center gap-1.5">
            <svg aria-hidden="true" width="18" height="4" className="shrink-0">
              <line x1="0" x2="18" y1="2" y2="2" stroke="var(--app-text-secondary)" strokeWidth="2" strokeDasharray="5 3" />
            </svg>
            {conserveLabel}: {ADVICE_STANCE_DEFINITIONS.conserve.question}
          </li>
          <li className="flex items-center gap-1.5">
            <svg aria-hidden="true" width="18" height="4" className="shrink-0">
              <line x1="0" x2="18" y1="2" y2="2" stroke="var(--app-text-muted)" strokeWidth="1.5" strokeDasharray="1.5 2.5" />
            </svg>
            {craftLabel}: {ADVICE_STANCE_DEFINITIONS.craft.question}
          </li>
          <li className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-px bg-[var(--phase-boundary)]" />A change in conditions
          </li>
        </ul>
        <figcaption className="max-w-prose text-fluid-nano text-slate-400">
          {`Quarters with fewer than ${MIN_POSTS} posts aren't plotted. Changes in conditions: ${changes.map((change) => `${formatMonth(change.month)}, ${change.from} to ${change.to}`).join("; ")}.`}
        </figcaption>
        <ScreenshotCaption />
        {/* The wrapper hides it, not the table: a table cannot shrink below its content,
            so a 1px sr-only table laid out at 636px and pushed a 390px phone page to
            651px (2026-10-27), the trap advicePlane.tsx already notes. */}
        <div className="sr-only">
          <table>
            <caption>Share of posts prescribing expansion and conservation each quarter, with funding pressure</caption>
            <thead>
              <tr>
                <th scope="col">Quarter</th>
                <th scope="col">Expand</th>
                <th scope="col">Conserve</th>
                <th scope="col">Craft</th>
                <th scope="col">Posts</th>
                <th scope="col">Funding pressure</th>
              </tr>
            </thead>
            <tbody>
              {quarters.map((quarter) => (
                <tr key={quarter.period}>
                  <th scope="row">{quarterLabel(quarter.period)}</th>
                  <td>{percent(quarter.expand)}</td>
                  <td>{percent(quarter.conserve)}</td>
                  <td>{percent(quarter.craft)}</td>
                  <td>{quarter.posts}</td>
                  <td>{quarter.fundingPressure ?? "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </figure>
      <div className="mt-5 max-w-prose" data-advice-corpus-sample>
        <p className="text-fluid-nano text-slate-400">
          Who is in the sample. Each firm weighs equally in the shares
          {largestFirm && largestShare !== null
            ? `, and the largest archive, ${largestFirm.firm}, is ${largestShare}% of the ${monthly.eligiblePosts} eligible posts.`
            : "."}
        </p>
        <ul className="mt-2 grid gap-x-6 gap-y-1 text-fluid-nano text-slate-300 sm:grid-cols-2">
          {monthly.firmPosts.map((firm) => (
            <li key={firm.firm} className="flex justify-between gap-3 border-b border-[color:var(--border-subtle)] py-1 last:border-0 sm:last:border-b">
              <span className="min-w-0 break-words">{firm.firm}</span>
              <span className="shrink-0 tabular-nums text-slate-400">{firm.posts}</span>
            </li>
          ))}
        </ul>
      </div>
      <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <a href={REGISTRATION_URL} className="py-3 font-semibold text-sky-200 underline decoration-slate-600 underline-offset-4 hover:text-slate-100">
          The study, registered in advance →
        </a>
        <a href={RESULTS_URL} className="py-3 font-semibold text-sky-200 underline decoration-slate-600 underline-offset-4 hover:text-slate-100">
          Every number, with its interval →
        </a>
        <a href={NULL_RESULT_URL} className="py-3 font-semibold text-sky-200 underline decoration-slate-600 underline-offset-4 hover:text-slate-100">
          The null result, dated →
        </a>
      </p>
    </SecondaryPageSection>
  );
}
