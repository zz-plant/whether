"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import { decisionAreaLabel, type DecisionArea } from "../../../lib/report/boundedDecisionRules";
import { buildHomeDecisionCookie } from "../../../lib/report/home/homeSectionModel";
import { buildPlanLinesWatchHref } from "../../../lib/navigation/planningNavigation";
import { DECISION_CONTRACT_LABELS } from "../../../lib/report/reportCopy";
import {
  RULE_CHART_AREA_PARAM,
  RULE_CHART_COUNTED_PARAM,
  RULE_CHART_DECISION_PARAM,
  RULE_CHART_READING_PARAM,
  buildRuleChartHref,
  describeRuleChartWhere,
  type RuleChartReadingKey,
} from "../../../lib/report/ruleChartParams";
import { formatShortRate } from "../../../lib/report/fedSteps";
import type { RuleChartArea, RuleChartModel, RuleChartReading } from "../../../lib/report/ruleRegions";
import { ClipboardActionRow } from "../clipboardActionRow";
import { getClipboardUiState, useClipboardCopy } from "../useClipboardCopy";
import { ActionLink, PlainActionLink } from "../ui/actionLink";
import { BoundedValue } from "../ui/boundedValue";
import { AreaIcon, LineStateIcon } from "../ui/conceptIcons";
import { RegimeRadar, type RegimeRadarProps } from "./RegimeRadar";

/**
 * What the brief's conditions chart can be asked (2026-11-18): which area's rule it shades,
 * and which reading it plots. Pick an area and its pause and restart are shaded, so the
 * week's reading visibly sits where the area pauses, where it restarts, or between the two
 * where nothing changes. Pick a reading and the filled marker moves to it, this week's
 * stays as the hollow one, and one sentence under the chart says which areas would pause
 * or restart: the reading with the left-out startup-market inputs counted, or this week's
 * after one, two or three quarter-point Fed cuts or one hike (`rateScenario.ts`). The
 * guidance beside the chart never changes.
 *
 * Small pieces share one state, so the section's own layout stays where it was
 * (`WhatWouldChangeSection`): the two rows of choices over the chart, the chart, and the
 * "Pause if" / "Restart when" lines beside it, which follow the chosen area. Every word,
 * region and score comes from the server (`buildRuleChartModel`); nothing here judges a
 * reading.
 *
 * The state is the URL's (§V): `?decision=` names the area, as the decision picker's
 * does, and `?reading=` the reading (`ruleChartParams.ts`; `?rule=` and `?counted=1` still
 * open theirs). The choices are links to those URLs, as the phase map's window chooser on
 * /history is (`.weather-pill[aria-current="page"]`): each works before the script loads
 * and copies as the picture it shows, and the brief's load budget counts no field for
 * them. Once the page is live a plain click is taken here and the URL replaced rather
 * than pushed, as the decision picker does: changing the picture is not a step Back
 * should retrace. Choosing an area is choosing the brief's decision, so it is remembered
 * in the picker's cookie and announced to the page as a `whether:decision` event, which
 * this chart also hears.
 */

/** The page event an area choice is announced with, and heard on: `detail: { area, source }`. */
const DECISION_EVENT = "whether:decision";
const SOURCE = "conditions-chart";

type RuleChartState = {
  selected: DecisionArea | null;
  /** What the chart shades: an option under the pointer or focus, else the chosen one. */
  shown: DecisionArea | null;
  select: (area: DecisionArea) => void;
  preview: (area: DecisionArea | null) => void;
  reading: RuleChartReadingKey | null;
  setReading: (reading: RuleChartReadingKey | null) => void;
  /** The link to a state of the chart, keeping the rest of the page's query. */
  hrefFor: (next: { area?: DecisionArea; reading?: RuleChartReadingKey | null }) => string;
};

const RuleChartContext = createContext<RuleChartState | null>(null);

const useRuleChart = () => useContext(RuleChartContext);

const writeParams = (updates: Record<string, string | null>) => {
  const url = new URL(window.location.href);
  for (const [key, value] of Object.entries(updates)) {
    if (value) url.searchParams.set(key, value);
    else url.searchParams.delete(key);
  }
  window.history.replaceState(window.history.state, "", url);
};

/* A click that asks for a new tab or window, or a download, is the browser's to follow. */
const isPlainClick = (event: MouseEvent<HTMLAnchorElement>) =>
  event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;

const isAreaDetail = (detail: unknown): detail is { area: DecisionArea; source?: string } =>
  typeof detail === "object" && detail !== null && "area" in detail && typeof detail.area === "string";

export function RuleChartProvider({
  defaultArea,
  initialArea,
  initialReading,
  areas,
  query,
  children,
}: {
  defaultArea: DecisionArea | null;
  /** The area the URL or the remembered decision names, read on the server so the first paint shades it. */
  initialArea?: DecisionArea;
  /** The reading the URL names, null for this week's. */
  initialReading: RuleChartReadingKey | null;
  /** The areas the chart can shade: an announced area outside them is ignored. */
  areas: readonly DecisionArea[];
  /** The page's query, which every link the chart draws keeps. */
  query?: Record<string, string | undefined>;
  children: ReactNode;
}) {
  const [selected, setSelected] = useState<DecisionArea | null>(initialArea ?? defaultArea);
  /* Whether a reader chose the area: until then a reading's link leaves the decision out. */
  const [chosen, setChosen] = useState(Boolean(initialArea));
  const [previewed, setPreviewed] = useState<DecisionArea | null>(null);
  const [reading, setReadingState] = useState(initialReading);
  const select = useCallback((area: DecisionArea) => {
    setSelected(area);
    setChosen(true);
    setPreviewed(null);
    writeParams({ [RULE_CHART_DECISION_PARAM]: area, [RULE_CHART_AREA_PARAM]: null });
    document.cookie = buildHomeDecisionCookie(area);
    document.dispatchEvent(new CustomEvent(DECISION_EVENT, { detail: { area, source: SOURCE } }));
  }, []);
  /* Another part of the page choosing the decision moves the chart with it. */
  useEffect(() => {
    const follow = (event: Event) => {
      if (!(event instanceof CustomEvent) || !isAreaDetail(event.detail) || event.detail.source === SOURCE) return;
      const { area } = event.detail;
      if (!areas.includes(area)) return;
      setSelected(area);
      setChosen(true);
    };
    document.addEventListener(DECISION_EVENT, follow);
    return () => document.removeEventListener(DECISION_EVENT, follow);
  }, [areas]);
  const setReading = useCallback((next: RuleChartReadingKey | null) => {
    setReadingState(next);
    writeParams({ [RULE_CHART_READING_PARAM]: next, [RULE_CHART_COUNTED_PARAM]: null });
  }, []);
  const hrefFor = useCallback(
    (next: { area?: DecisionArea; reading?: RuleChartReadingKey | null }) =>
      buildRuleChartHref(query, {
        area: next.area ?? (chosen ? selected : null),
        reading: next.reading === undefined ? reading : next.reading,
      }),
    [query, selected, chosen, reading],
  );
  const value = useMemo<RuleChartState>(
    () => ({ selected, shown: previewed ?? selected, select, preview: setPreviewed, reading, setReading, hrefFor }),
    [selected, previewed, select, reading, setReading, hrefFor],
  );
  return <RuleChartContext.Provider value={value}>{children}</RuleChartContext.Provider>;
}

/* A row of choices: its question, then the choices as links, the current one marked. */
function ChoiceRow({ id, question, children }: { id: string; question: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <p className="text-fluid-sm font-semibold text-slate-200" id={id}>
        {question}
      </p>
      {/* A control, not navigation, but it changes the URL, so a shared link opens on the
          picture the sender was reading (the phase map's window chooser does the same). */}
      <nav aria-labelledby={id} className="flex flex-wrap gap-1.5">
        {children}
      </nav>
    </div>
  );
}

/**
 * The five areas, each with its glyph and name. Pointing at or focusing one previews its
 * pause and restart; choosing one keeps them. On a touch screen, where there is no
 * pointing, a tap chooses.
 */
export function RuleChartChooser({ areas }: { areas: readonly DecisionArea[] }) {
  const state = useRuleChart();
  if (!state || areas.length === 0) return null;
  /* Leaving one option ends its preview; arriving at the next starts that one's, in the same
     task, so the chart does not flash the chosen area between two neighbours. */
  const leave = () => state.preview(null);
  return (
    <div data-rule-chooser="">
      <ChoiceRow id="rule-chart-chooser-label" question="Which area?">
        {areas.map((area) => {
          const active = area === state.selected;
          return (
            <PlainActionLink
              key={area}
              href={state.hrefFor({ area })}
              variant="pill"
              aria-current={active ? "page" : undefined}
              className={`gap-1.5 ${active ? "" : "text-slate-300"}`.trim()}
              data-rule-area={area}
              onMouseEnter={() => state.preview(area)}
              onFocus={() => state.preview(area)}
              onMouseLeave={leave}
              onBlur={leave}
              onClick={(event) => {
                if (!isPlainClick(event)) return;
                event.preventDefault();
                state.select(area);
              }}
            >
              <AreaIcon area={area} />
              {decisionAreaLabel(area)}
            </PlainActionLink>
          );
        })}
      </ChoiceRow>
    </div>
  );
}

/**
 * Which reading the chart plots: this week's, or one of the others the server scored
 * (`RuleChartReading`). Only where there is another to plot.
 */
export function RuleChartReadings({ readings }: { readings: readonly Pick<RuleChartReading, "key" | "label" | "name">[] }) {
  const state = useRuleChart();
  if (!state || readings.length === 0) return null;
  const choices: Array<{ key: RuleChartReadingKey | null; label: string; name?: string }> = [
    { key: null, label: "This week's" },
    ...readings,
  ];
  return (
    <div data-reading-choices="">
      <ChoiceRow id="rule-chart-reading-label" question="Which reading?">
        {choices.map((choice) => (
          <PlainActionLink
            key={choice.key ?? "this-week"}
            href={state.hrefFor({ reading: choice.key })}
            variant="pill"
            aria-current={choice.key === state.reading ? "page" : undefined}
            /* "After two" in full for a listener who meets it alone; only where the full name
               starts with the words shown, so a spoken "After two" still finds it (WCAG 2.5.3). */
            aria-label={choice.name && choice.name !== choice.label && choice.name.startsWith(choice.label) ? choice.name : undefined}
            className={choice.key === state.reading ? undefined : "text-slate-300"}
            data-reading={choice.key ?? "this-week"}
            onClick={(event) => {
              if (!isPlainClick(event)) return;
              event.preventDefault();
              state.setReading(choice.key);
            }}
          >
            {choice.label}
          </PlainActionLink>
        ))}
      </ChoiceRow>
    </div>
  );
}

/* A key swatch drawn as the region is: the pause's faint fill and hatch, the restart's
   fill, and the bare ground between. 14px, the size of the words beside it. */
function RegionSwatch({ kind }: { kind: "pause" | "resume" | "between" }) {
  return (
    <svg viewBox="0 0 14 14" className="size-3.5 shrink-0" aria-hidden="true" focusable="false">
      {kind === "pause" ? (
        <>
          <rect x="0.5" y="0.5" width="13" height="13" fill="var(--line-crossed)" fillOpacity="0.1" />
          <path d="M-2 6 L6 -2 M-2 13 L13 -2 M5 15 L15 5" stroke="var(--line-crossed)" strokeOpacity="0.45" strokeWidth="1" />
          <rect x="0.5" y="0.5" width="13" height="13" fill="none" stroke="var(--line-crossed)" strokeWidth="1" />
        </>
      ) : kind === "resume" ? (
        <rect x="0.5" y="0.5" width="13" height="13" fill="var(--line-clear)" fillOpacity="0.12" stroke="var(--line-clear-ink)" strokeOpacity="0.6" strokeWidth="1" />
      ) : (
        <rect x="0.5" y="0.5" width="13" height="13" fill="none" stroke="var(--border-strong)" strokeWidth="1" strokeDasharray="2 2" />
      )}
    </svg>
  );
}

/* The funding-pressure lines that matter for the shown area, with the rate each comes with. */
const rateTicksFor = (
  shown: Pick<RuleChartArea, "regions"> | null,
  changeLine: number,
  rates: NonNullable<RuleChartModel["fundingPressureRates"]>,
) => {
  const rateAt = new Map(rates.values.map((entry) => [entry.value, entry.rate]));
  const lines = [
    { value: changeLine, kind: "change" as const },
    ...(shown?.regions.pause.edges ?? []).filter((edge) => edge.metric === "tightness").map((edge) => ({ value: edge.value, kind: "pause" as const })),
    ...(shown?.regions.resume.edges ?? []).filter((edge) => edge.metric === "tightness").map((edge) => ({ value: edge.value, kind: "restart" as const })),
  ];
  const seen = new Set<number>();
  return lines.flatMap((line) => {
    const rate = rateAt.get(line.value);
    if (rate === undefined || seen.has(line.value)) return [];
    seen.add(line.value);
    return [{ ...line, rate }];
  });
};

/**
 * The chart with the shown area's regions, its key and the conditions no region can draw,
 * the plotted reading's answer under it, and a copy of the link to this picture. `radar` is
 * this week's chart as the section has always drawn it; with another reading chosen, that
 * reading becomes the filled marker and this week's the hollow one, and the month-end path,
 * which led to this week's reading, steps aside.
 */
export function RuleChartFigure({
  radar,
  areas,
  readings,
  fundingPressureRates,
  className = "",
}: {
  radar: RegimeRadarProps;
  areas: readonly RuleChartArea[];
  readings: readonly RuleChartReading[];
  fundingPressureRates: RuleChartModel["fundingPressureRates"];
  className?: string;
}) {
  const state = useRuleChart();
  const { status, error, activeTarget, copiedTarget, copyToClipboard } = useClipboardCopy({ commitment: null });
  const shown = areas.find((candidate) => candidate.area === state?.shown) ?? null;
  const plotted = readings.find((reading) => reading.key === state?.reading) ?? null;
  const drawn: RegimeRadarProps = plotted
    ? {
        ...radar,
        tightness: plotted.tightness,
        riskAppetite: plotted.riskAppetite,
        currentRegime: plotted.regime,
        previousTightness: radar.tightness,
        previousRiskAppetite: radar.riskAppetite,
        primaryLabel: plotted.name,
        previousLabel: "This week's reading",
        readoutLabel: plotted.label,
        trail: undefined,
        trailCaption: null,
        caveat: null,
        feelsLike: null,
        travelFrom: null,
      }
    : radar;
  const rateTicks = fundingPressureRates ? rateTicksFor(shown, radar.tightnessThreshold, fundingPressureRates) : [];
  /* The figure's text alternative: where the reading sits against the shown area's rule,
     and the rate at each labelled line, so the picture's numbers are in the page's text. */
  const where = shown ? (plotted ? plotted.where[shown.area] : shown.where) : undefined;
  const description = [
    shown && where ? `${shown.rule} ${plotted ? plotted.name : "This week's reading"} is ${describeRuleChartWhere(shown.area, where)}.` : null,
    rateTicks.length > 0 && fundingPressureRates
      ? `${fundingPressureRates.name}: ${rateTicks.map((tick) => `funding pressure ${tick.value} at ${formatShortRate(tick.rate)}`).join(", ")}.`
      : null,
  ].filter(Boolean).join(" ") || undefined;
  const label = shown ? decisionAreaLabel(shown.area) : null;
  const key = shown ? (
    <span className="block space-y-0.5" data-rule-key="">
      <span className="flex flex-wrap justify-center gap-x-3 gap-y-0.5 text-slate-300">
        <span className="inline-flex items-center gap-1">
          <RegionSwatch kind="pause" />
          <LineStateIcon state="crossed" className="size-3.5" />
          {label} pauses
        </span>
        <span className="inline-flex items-center gap-1">
          <RegionSwatch kind="resume" />
          <LineStateIcon state="clear" className="size-3.5" />
          restarts
        </span>
        <span className="inline-flex items-center gap-1">
          <RegionSwatch kind="between" />
          between them, nothing changes
        </span>
      </span>
      {shown.note ? <span className="block" data-rule-note="">{shown.note}</span> : null}
      {/* An area on hold this week: the email the day it restarts, as the area groups offer. */}
      {shown.held ? (
        <span className="block pt-0.5" data-restart-email="">
          <ActionLink href={buildPlanLinesWatchHref([shown.area])} variant="inline">
            {`Email me when ${label} restarts →`}
          </ActionLink>
        </span>
      ) : null}
    </span>
  ) : null;
  const copyState = getClipboardUiState("chart-link", { status, error, activeTarget, copiedTarget });
  return (
    <div className={className} data-rule-chart="" data-reading={plotted?.key}>
      {/* Another reading's marker takes its own conditions, so the dot and the lit quadrant say one thing. */}
      <div data-regime={plotted ? plotted.regime : undefined}>
        <RegimeRadar
          {...drawn}
          ruleRegions={shown?.regions ?? null}
          description={description}
          legend={key}
          rateTicks={rateTicks}
          rateTicksLabel={fundingPressureRates?.name}
          className="w-full"
        />
      </div>
      {/* What the plotted reading would change, under the chart it is plotted on. */}
      {readings.length > 0 ? (
        <p className="mt-2 text-fluid-sm text-slate-300" data-reading-answer="" aria-live="polite">
          {plotted ? plotted.answer : null}
        </p>
      ) : null}
      {state ? (
        <ClipboardActionRow
          className="mt-2"
          label="Copy link"
          state={copyState}
          buttonVariant="pill"
          compact
          onClick={() => {
            void copyToClipboard(new URL(state.hrefFor({}), window.location.origin).toString(), "chart-link");
          }}
          showStatus
          statusClassName="sr-only"
          statusMessages={{ copied: "Link to this chart copied" }}
          buttonProps={{ "aria-label": "Copy link to this chart", "data-copy-chart-link": "" }}
        />
      ) : null}
    </div>
  );
}

/** The guidance's pause or restart line, or both, as the section has always printed them. */
export function RuleLines({
  pauseLine,
  resumeLine,
  area,
}: {
  pauseLine?: string;
  resumeLine?: string;
  /** Names the area in each label when the lines are not the guidance's lead rule's. */
  area?: DecisionArea;
}) {
  if (!pauseLine && !resumeLine) return null;
  const areaName = area ? decisionAreaLabel(area) : null;
  return (
    <div className="space-y-2" data-rule-lines={area ?? "lead"}>
      <dl className="space-y-3 text-fluid-sm">
        {pauseLine ? (
          <div className="space-y-0.5">
            <dt className="font-semibold text-slate-200">{areaName ? `${areaName} pauses if` : DECISION_CONTRACT_LABELS.threshold.pauseIf}</dt>
            <dd className="text-slate-300"><BoundedValue>{pauseLine}</BoundedValue></dd>
          </div>
        ) : null}
        {resumeLine ? (
          <div className="space-y-0.5">
            <dt className="font-semibold text-slate-200">{areaName ? `${areaName} restarts when` : DECISION_CONTRACT_LABELS.reversal.resumeWhen}</dt>
            <dd className="text-slate-300"><BoundedValue>{resumeLine}</BoundedValue></dd>
          </div>
        ) : null}
      </dl>
    </div>
  );
}

/**
 * The lines beside the chart, for the chosen area: the guidance's own sentences for its
 * lead area, as before; another area's own rule otherwise, on the side that can change it
 * (its restart while it is paused, its pause otherwise), as the rules table prints it.
 */
export function RuleChartLines({
  areas,
  defaultArea,
  pauseLine,
  resumeLine,
}: {
  areas: readonly Pick<RuleChartArea, "area" | "pauseLine" | "resumeLine" | "held">[];
  defaultArea: DecisionArea | null;
  /** The guidance's lines, as the section printed them before the chart could choose. */
  pauseLine?: string;
  resumeLine?: string;
}) {
  const state = useRuleChart();
  const chosen = state?.selected && state.selected !== defaultArea
    ? areas.find((candidate) => candidate.area === state.selected)
    : undefined;
  if (!chosen) return <RuleLines pauseLine={pauseLine} resumeLine={resumeLine} />;
  return (
    <RuleLines
      area={chosen.area}
      pauseLine={chosen.held ? undefined : chosen.pauseLine}
      resumeLine={chosen.held ? chosen.resumeLine : undefined}
    />
  );
}
