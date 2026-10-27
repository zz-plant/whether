import { ScreenshotCaption } from "../../components/screenshotCaption";
import type { PaybackBar, ProjectPayback, SizedProjectPayback } from "../../../lib/report/projectPayback";

/**
 * The runway planner's projects against the payback bar: one row per project,
 * on one month scale. Each row is the time spent building, then the time the
 * saving takes to repay it, ending in a dot at the break-even month. The dot is
 * filled when the work breaks even inside the bar (or, with no bar, before the
 * cash runs out) and hollow when it does not, so the chart reads in greyscale.
 *
 * Two lines cross every row: the bar the rules set, and the month the cash runs
 * out. HTML positioned by percent, like the planner's `RangeBar`, so every word
 * is page text that wraps and zooms; nothing here is text inside a scaled SVG.
 * Decorative to a screen reader: the sentences under it say each row's facts.
 */

const pct = (months: number, domain: number) => `${Math.min(100, Math.max(0, (months / domain) * 100))}%`;

const breaksEvenWell = (project: SizedProjectPayback) =>
  (project.verdict === "clears" || project.verdict === "no-bar") && !project.afterCashOut;

function Strip({
  project,
  months,
  barMonths,
  cashOut,
}: {
  project: SizedProjectPayback;
  months: number;
  barMonths: number | null;
  cashOut: number | null;
}) {
  const ship = Math.min(project.shipMonth, months);
  const breakEven = project.breakEvenMonth;
  const beyond = breakEven !== null && breakEven > months;
  return (
    <div className="relative h-5" data-project-strip={project.name} data-verdict={project.verdict}>
      <span aria-hidden="true" className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-[var(--border-default)]" />
      <span
        aria-hidden="true"
        className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-sm"
        style={{ left: 0, width: pct(ship, months), background: "var(--app-text-muted)", opacity: 0.5 }}
        data-building-to={project.shipMonth.toFixed(2)}
      />
      {breakEven !== null ? (
        <span
          aria-hidden="true"
          className="absolute top-1/2 h-0.5 -translate-y-1/2 bg-[var(--app-text)]"
          style={{ left: pct(ship, months), width: `calc(${pct(Math.min(breakEven, months), months)} - ${pct(ship, months)})` }}
        />
      ) : null}
      {breakEven !== null && !beyond ? (
        <span
          aria-hidden="true"
          data-break-even={breakEven.toFixed(2)}
          data-filled={breaksEvenWell(project) ? "true" : "false"}
          className={`absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[var(--app-text)] ${
            breaksEvenWell(project) ? "bg-[var(--app-text)]" : "bg-[var(--bg-panel)]"
          }`}
          style={{ left: pct(breakEven, months) }}
        />
      ) : null}
      {barMonths !== null ? (
        <span
          aria-hidden="true"
          className="absolute inset-y-0 w-0.5 -translate-x-1/2 bg-[var(--phase-boundary)]"
          style={{ left: pct(barMonths, months) }}
        />
      ) : null}
      {cashOut !== null ? (
        <span
          aria-hidden="true"
          className="absolute inset-y-0 -translate-x-1/2 border-l-2 border-dashed border-[var(--line-crossed)]"
          style={{ left: pct(cashOut, months) }}
        />
      ) : null}
      {beyond ? (
        <span
          aria-hidden="true"
          data-break-even-beyond={breakEven?.toFixed(2)}
          className="absolute right-0 top-1/2 size-0 -translate-y-1/2 border-y-[5px] border-l-[8px] border-y-transparent border-l-[var(--app-text)]"
        />
      ) : null}
    </div>
  );
}

const rowNote = (project: SizedProjectPayback, months: number) => {
  if (project.breakEvenMonth === null) return "saves nothing";
  const month = Math.ceil(project.breakEvenMonth);
  return project.breakEvenMonth > months ? `month ${month} →` : `month ${month}`;
};

export function ProjectPaybackChart({
  projects,
  bar,
  runwayMonths,
  months,
}: {
  projects: readonly ProjectPayback[];
  bar: PaybackBar;
  runwayMonths: number;
  months: number;
}) {
  const sized = projects.filter((project): project is SizedProjectPayback => project.status === "sized");
  if (sized.length === 0) return null;

  const barMonths = bar.kind === "months" && bar.months <= months ? bar.months : null;
  const cashOut = runwayMonths <= months ? runwayMonths : null;
  const ticks = Array.from({ length: Math.floor(months / 6) + 1 }, (_, index) => index * 6);
  const drawsFilled = sized.some((project) => project.breakEvenMonth !== null && breaksEvenWell(project));
  const drawsHollow = sized.some((project) => project.breakEvenMonth !== null && !breaksEvenWell(project));
  const filledMeaning = bar.kind === "months" ? `breaks even inside the ${bar.months}-month bar` : "breaks even before the cash runs out";
  const hollowMeaning =
    bar.kind === "months" ? "breaks even past the bar or after the cash runs out" : bar.kind === "cash-gate" ? "held by the cash gate" : "breaks even after the cash runs out";

  return (
    <figure
      className="m-0 space-y-2"
      data-project-payback-chart
      data-payback-bar={barMonths ?? undefined}
      data-cash-out={cashOut ?? undefined}
    >
      {/* Each name sits over its own strip at full width, so it never truncates
          and no line crosses it; the bar and cash-out marks repeat in every
          strip at the same place, which reads as one line down the chart. */}
      <div aria-hidden="true" className="space-y-1.5">
        {sized.map((project, index) => (
          <div key={`${index}-${project.name}`}>
            <p className="flex items-baseline justify-between gap-3 text-xs">
              <span className="min-w-0 truncate text-slate-200" title={project.name}>
                {project.name}
              </span>
              <span className="shrink-0 tabular-nums text-slate-400">{rowNote(project, months)}</span>
            </p>
            <Strip project={project} months={months} barMonths={barMonths} cashOut={cashOut} />
          </div>
        ))}
        <div className="relative h-4 text-fluid-nano tabular-nums text-slate-500">
          {ticks.map((tick) => (
            <span
              key={tick}
              className={`absolute top-0 whitespace-nowrap ${tick === 0 ? "" : tick === months ? "-translate-x-full" : "-translate-x-1/2"}`}
              style={{ left: pct(tick, months) }}
            >
              {tick === 0 ? "now" : tick === months ? `${tick} mo` : tick}
            </span>
          ))}
        </div>
      </div>

      {/* The key lists only what the chart draws (ui-ux-standards §XVI). */}
      <ul aria-hidden="true" className="flex flex-wrap gap-x-4 gap-y-1 text-fluid-nano text-slate-400">
        <li className="flex items-center gap-1.5">
          <span className="inline-block h-1.5 w-4 rounded-sm" style={{ background: "var(--app-text-muted)", opacity: 0.5 }} />
          building
        </li>
        <li className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 bg-[var(--app-text)]" />
          paying back
        </li>
        {drawsFilled ? (
          <li className="flex items-center gap-1.5">
            <span className="inline-block size-2.5 rounded-full border-2 border-[var(--app-text)] bg-[var(--app-text)]" />
            {filledMeaning}
          </li>
        ) : null}
        {drawsHollow ? (
          <li className="flex items-center gap-1.5">
            <span className="inline-block size-2.5 rounded-full border-2 border-[var(--app-text)] bg-[var(--bg-panel)]" />
            {hollowMeaning}
          </li>
        ) : null}
        {barMonths !== null && bar.kind === "months" ? (
          <li className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-0.5 bg-[var(--phase-boundary)]" />
            {bar.basis === "tight-runway" ? `${bar.months}-month bar, set by your runway` : `${bar.months}-month bar, the roadmap rule`}
          </li>
        ) : null}
        {cashOut !== null ? (
          <li className="flex items-center gap-1.5">
            <span className="inline-block h-3 border-l-2 border-dashed border-[var(--line-crossed)]" />
            cash runs out, month {Math.round(cashOut * 10) / 10}
          </li>
        ) : null}
      </ul>
      <ScreenshotCaption detail="Runway planner, on your own figures" />
    </figure>
  );
}
