import Link from "next/link";
import { Shell } from "../../components/Shell";
import { DecisionHero } from "../../components/DecisionHero";
import { RegimeRadar } from "../../components/home/RegimeRadar";
import { DecisionPicker } from "../../components/home/DecisionPicker";
import { AllAreaRules } from "../../components/home/AllAreaRules";
import { AreaTable } from "../../components/ui/areaTable";
import { MonthStrip } from "../../components/history/monthStrip";
import { buildAreaRows } from "../../operate/areaRows";
import { loadHomePageAssembly } from "../../../lib/report/homePageAssemblyLoader";
import { deriveBriefCallFields } from "../../../lib/report/homeBrief/briefArtifactBuilder";
import { buildHomeAreaRows, describeConditionsTrail } from "../../../lib/report/home/homeSectionModel";
import { buildTrustStripProps } from "../../../lib/report/evidenceReaderModel";
import { previousScoresFromDynamics } from "../../../lib/export/scoreReference";
import { describeMovementCause } from "../../../lib/report/decisionMovement";
import { decisionAreaOrder } from "../../../lib/report/boundedDecisionRules";
import { getMonthlyRegimeHistory } from "../../../lib/summary/monthlyRegimeHistory";
import { getTimeMachineRegimeSeries } from "../../../lib/timeMachine/timeMachineCache";
import { formatDateUTC } from "../../../lib/formatters";

/**
 * One palette direction drawn over the real components and this week's reading.
 *
 * Nothing here forks a component. Each direction is a stylesheet beside its
 * page (`<direction>/tokens.css`) that redefines the theme's custom properties
 * on `:root` only while this page's `data-palette` element is mounted, so the
 * hero, the conditions chart, the area cards, the Decide table and the record
 * band below are the shipped ones, reading the direction's values. The live
 * routes never mount the attribute, so they never match.
 *
 * Preview only: the layout under /mockups 404s in production
 * (`app/mockups/layout.tsx`), and docs/design/palette-directions.md holds the
 * plans, the critique and the measurements.
 */
type DirectionSlug = "instrument" | "synoptic" | "warning-card";

const directions: ReadonlyArray<{ slug: DirectionSlug; name: string; line: string }> = [
  { slug: "instrument", name: "Instrument", line: "The current dark identity, refined: one colour system, the regime." },
  { slug: "synoptic", name: "Synoptic", line: "A daylight weather chart: conditions coloured by the weather they name." },
  { slug: "warning-card", name: "Warning card", line: "A quiet page and a call card printed in the week's colour." },
];

const CONDITIONS_TRAIL_MONTHS = 6;

export async function PaletteSpecimen({ direction }: { direction: DirectionSlug }) {
  const current = directions.find((candidate) => candidate.slug === direction) ?? directions[0];
  const { homepage, reportData } = await loadHomePageAssembly(undefined);
  const model = homepage.weeklyDecisionCardModel;
  const regime = homepage.reportShell.regime;
  const scores = model.diagnostics.currentScores;
  const previousScores = previousScoresFromDynamics(model.decision.reportDynamics, {
    tightness: reportData.assessment.scores.tightness,
    riskAppetite: reportData.assessment.scores.riskAppetite,
  });
  const { headline } = deriveBriefCallFields(model, homepage.weeklyCall);
  const thresholds = reportData.assessment.thresholds;

  const currentMonthKey = reportData.treasury.record_date.slice(0, 7);
  const trailEntries = getMonthlyRegimeHistory()
    .filter((entry) => entry.record_date.slice(0, 7) < currentMonthKey)
    .flatMap((entry) =>
      typeof entry.tightness === "number" && typeof entry.riskAppetite === "number"
        ? [{ recordDate: entry.record_date, tightness: entry.tightness, riskAppetite: entry.riskAppetite }]
        : [],
    )
    .slice(-CONDITIONS_TRAIL_MONTHS);
  const trail = trailEntries.map((entry) => ({
    tightness: entry.tightness,
    riskAppetite: entry.riskAppetite,
    label: formatDateUTC(entry.recordDate),
  }));
  const trailCaption = describeConditionsTrail(trailEntries.map((entry) => entry.recordDate));

  const radar = (className: string) => (
    <RegimeRadar
      tightness={scores.tightness}
      riskAppetite={scores.riskAppetite}
      previousTightness={previousScores?.tightness ?? null}
      previousRiskAppetite={previousScores?.riskAppetite ?? null}
      tightnessThreshold={thresholds.tightnessRegime}
      riskAppetiteThreshold={thresholds.riskAppetiteRegime}
      currentRegime={regime}
      trail={trail}
      trailCaption={trailCaption}
      className={className}
    />
  );

  const trust = buildTrustStripProps({
    recordDateLabel: homepage.reportShell.recordDateLabel,
    isFallback: homepage.reportShell.showOfflineBadge,
    isHistorical: false,
    degradedSourceCount: homepage.reportShell.degradedSourceRows?.length ?? 0,
    confidenceLabel: model.status.confidenceLabel ?? "HIGH",
    scoringBasis: reportData.scoringBasis,
    assessment: reportData.assessment,
  });

  const actionStripItems = model.decision.actionStripItems ?? [];
  const areaRows = buildHomeAreaRows({
    actionStripItems,
    decisionRules: model.decision.decisionRules ?? [],
    movement: model.decision.decisionMovement,
    scores: { tightness: scores.tightness, riskAppetite: scores.riskAppetite },
  });
  const pickerOptions = decisionAreaOrder.flatMap((area) => areaRows.filter((row) => row.area === area));

  return (
    <Shell regime={regime}>
      <div data-palette={direction} className="mx-auto max-w-[64rem] space-y-8 sm:space-y-10">
        <header className="space-y-3 border-b border-[color:var(--border-default)] pb-4">
          <p className="type-eyebrow">Palette direction, preview only. Live routes are unchanged.</p>
          <h1 className="text-fluid-2xl font-semibold text-slate-100">{current.name}</h1>
          <p className="max-w-[60ch] text-fluid-sm text-slate-300">{current.line}</p>
          <nav aria-label="Palette directions">
            <ul className="flex flex-wrap gap-2">
              {directions.map((candidate) => (
                <li key={candidate.slug}>
                  <Link
                    href={`/mockups/palette/${candidate.slug}`}
                    aria-current={candidate.slug === direction ? "page" : undefined}
                    className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold text-slate-100"
                  >
                    {candidate.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </header>

        <section aria-labelledby="specimen-hero" className="space-y-4">
          <h2 id="specimen-hero" className="type-eyebrow">The call card, as the brief draws it</h2>
          <DecisionHero
            titleLevel="h2"
            weeklyCall={headline.action}
            callDetail={model.decision.decisionMovement ? describeMovementCause(model.decision.decisionMovement) : undefined}
            regime={regime}
            direction={headline.directionLabel}
            aside={radar("ml-auto w-full max-w-[288px]")}
            trust={trust}
          />
          {/* The card hides its map below `md`; the phone capture still needs the
              chart in this direction's colours. */}
          <div className="md:hidden">{radar("mx-auto w-full max-w-[320px]")}</div>
        </section>

        <DecisionPicker options={pickerOptions} initialSelected={pickerOptions[0]?.area} regime={regime}>
          <AllAreaRules rows={areaRows} regime={regime} planHref="/operate" isHistorical={false} />
        </DecisionPicker>

        <section aria-labelledby="specimen-decide" className="weather-section-stack">
          <h2 id="specimen-decide" className="text-fluid-xl font-semibold text-slate-100">Decide: this week&rsquo;s rule for each area</h2>
          <AreaTable rows={buildAreaRows(actionStripItems)} caption="This week's rule for each decision area" signalLinkBase="/" />
        </section>

        <section aria-labelledby="specimen-record" className="weather-section-stack">
          <h2 id="specimen-record" className="text-fluid-xl font-semibold text-slate-100">Record: conditions by month</h2>
          <MonthStrip entries={getTimeMachineRegimeSeries(Number.MAX_SAFE_INTEGER)} />
        </section>
      </div>
    </Shell>
  );
}
