"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import { decisionAreaLabel, type DecisionArea } from "../../../lib/report/boundedDecisionRules";
import { DECISION_CONTRACT_LABELS } from "../../../lib/report/reportCopy";
import { RULE_CHART_AREA_PARAM, RULE_CHART_COUNTED_PARAM, buildRuleChartHref } from "../../../lib/report/ruleChartParams";
import type { RuleChartArea, RuleChartModel } from "../../../lib/report/ruleRegions";
import { PlainActionLink } from "../ui/actionLink";
import { BoundedValue } from "../ui/boundedValue";
import { AreaIcon, LineStateIcon } from "../ui/conceptIcons";
import { RegimeRadar, type RegimeRadarProps } from "./RegimeRadar";

/**
 * The rule layer of the brief's conditions chart (2026-11-18): pick an area and its pause
 * region and restart region are shaded on the chart, so the week's reading visibly sits in
 * one, the other, or the band between where nothing changes; and, where the reading leaves
 * inputs out, a switch that plots the reading with them counted.
 *
 * Three small pieces share one state, so the section's own layout stays where it was
 * (`WhatWouldChangeSection`): the chooser over the chart, the chart, and the "Pause if" /
 * "Restart when" lines beside it, which follow the chosen area. Every word and region
 * comes from the server (`buildRuleChartModel`); nothing here judges a reading.
 *
 * The state is the URL's (§V): `?rule=` names a chosen area other than the guidance's
 * lead, `?counted=1` the switch. The chooser and the switch are links to those URLs, as the
 * phase map's window chooser on /history is (`.weather-pill[aria-current="page"]`): each
 * works before the script loads and copies as the picture it shows, and the brief's load
 * budget counts no field for them. Once the page is live a plain click is taken here and
 * the URL replaced rather than pushed, as the decision picker does: changing the picture
 * is not a step Back should retrace.
 */

type RuleChartState = {
  selected: DecisionArea | null;
  /** What the chart shades: an option under the pointer or focus, else the chosen one. */
  shown: DecisionArea | null;
  select: (area: DecisionArea) => void;
  preview: (area: DecisionArea | null) => void;
  counted: boolean;
  setCounted: (on: boolean) => void;
  /** The link to a state of the chart, keeping the rest of the page's query. */
  hrefFor: (next: { area?: DecisionArea | null; counted?: boolean }) => string;
};

const RuleChartContext = createContext<RuleChartState | null>(null);

const useRuleChart = () => useContext(RuleChartContext);

const writeParam = (key: string, value: string | null) => {
  const url = new URL(window.location.href);
  if (value) url.searchParams.set(key, value);
  else url.searchParams.delete(key);
  window.history.replaceState(window.history.state, "", url);
};

/* A click that asks for a new tab or window, or a download, is the browser's to follow. */
const isPlainClick = (event: MouseEvent<HTMLAnchorElement>) =>
  event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;

export function RuleChartProvider({
  defaultArea,
  initialArea,
  initialCounted,
  query,
  children,
}: {
  defaultArea: DecisionArea | null;
  /** The area the URL names, read on the server so the first paint shades it. */
  initialArea?: DecisionArea;
  initialCounted: boolean;
  /** The page's query, which every link the chart draws keeps. */
  query?: Record<string, string | undefined>;
  children: ReactNode;
}) {
  const [selected, setSelected] = useState<DecisionArea | null>(initialArea ?? defaultArea);
  const [previewed, setPreviewed] = useState<DecisionArea | null>(null);
  const [counted, setCountedState] = useState(initialCounted);
  const select = useCallback(
    (area: DecisionArea) => {
      setSelected(area);
      setPreviewed(null);
      /* The lead area is the chart's default, so its link carries no key. */
      writeParam(RULE_CHART_AREA_PARAM, area === defaultArea ? null : area);
    },
    [defaultArea],
  );
  const setCounted = useCallback((on: boolean) => {
    setCountedState(on);
    writeParam(RULE_CHART_COUNTED_PARAM, on ? "1" : null);
  }, []);
  const hrefFor = useCallback(
    (next: { area?: DecisionArea | null; counted?: boolean }) => {
      const area = next.area === undefined ? selected : next.area;
      return buildRuleChartHref(query, { area: area === defaultArea ? null : area, counted: next.counted ?? counted });
    },
    [query, selected, defaultArea, counted],
  );
  const value = useMemo<RuleChartState>(
    () => ({ selected, shown: previewed ?? selected, select, preview: setPreviewed, counted, setCounted, hrefFor }),
    [selected, previewed, select, counted, setCounted, hrefFor],
  );
  return <RuleChartContext.Provider value={value}>{children}</RuleChartContext.Provider>;
}

/**
 * The five areas, each with its glyph and name. Pointing at or focusing one previews its
 * regions; choosing one keeps them. On a touch screen, where there is no pointing, a tap
 * chooses.
 */
export function RuleChartChooser({ areas }: { areas: readonly DecisionArea[] }) {
  const state = useRuleChart();
  if (!state || areas.length === 0) return null;
  /* Leaving one option ends its preview; arriving at the next starts that one's, in the same
     task, so the chart does not flash the chosen area between two neighbours. */
  const leave = () => state.preview(null);
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2" data-rule-chooser="">
      <p className="text-fluid-sm font-semibold text-slate-200" id="rule-chart-chooser-label">
        Shade the lines for
      </p>
      {/* A control, not navigation, but it changes the URL, so a shared link opens on the
          area the sender was reading (the phase map's window chooser does the same). */}
      <nav aria-labelledby="rule-chart-chooser-label" className="flex flex-wrap gap-1.5">
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
      </nav>
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

/**
 * The chart with the shown area's regions, its key and the conditions no region can draw.
 * `radar` is the published chart as the section has always drawn it; with the left-out
 * inputs counted (`RuleChartCountedSwitch`), the counted reading becomes the filled marker
 * and the published one the hollow, the month-end path, which led to the published reading,
 * steps aside, and one line under the chart names the areas that would then move. The
 * guidance beside the chart does not change.
 */
export function RuleChartFigure({
  radar,
  areas,
  counted,
  className = "",
}: {
  radar: RegimeRadarProps;
  areas: readonly RuleChartArea[];
  counted: RuleChartModel["counted"];
  className?: string;
}) {
  const state = useRuleChart();
  const shown = areas.find((candidate) => candidate.area === state?.shown) ?? null;
  const on = Boolean(counted && state?.counted);
  const plotted: RegimeRadarProps =
    on && counted
      ? {
          ...radar,
          tightness: counted.tightness,
          riskAppetite: counted.riskAppetite,
          currentRegime: counted.regime,
          previousTightness: radar.tightness,
          previousRiskAppetite: radar.riskAppetite,
          primaryLabel: "Counted reading",
          previousLabel: "Published reading",
          readoutLabel: "Counted",
          trail: undefined,
          trailCaption: null,
          caveat: null,
          feelsLike: null,
          travelFrom: null,
        }
      : radar;
  const description = shown ? ((on ? shown.description.counted : shown.description.published) ?? undefined) : undefined;
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
    </span>
  ) : null;
  return (
    <div className={className} data-rule-chart="" data-counted={on ? "" : undefined}>
      {/* Counted, the marker takes the counted reading's conditions, so the dot and the lit
          quadrant say one thing. */}
      <div data-regime={on && counted ? counted.regime : undefined}>
        <RegimeRadar
          {...plotted}
          ruleRegions={shown?.regions ?? null}
          description={description}
          legend={key}
          className="w-full"
        />
      </div>
      {/* What the counted reading would change, under the chart it is plotted on. */}
      {counted ? (
        <p className="mt-2 text-fluid-sm text-slate-300" data-counted-difference="" aria-live="polite">
          {on ? counted.difference : null}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Which reading the chart plots: as published, or with the left-out startup-market inputs
 * counted. Two views of one chart, as links to each (see the chooser), in the row of
 * controls over it. Only where the reading leaves inputs out.
 */
export function RuleChartCountedSwitch({ available }: { available: boolean }) {
  const state = useRuleChart();
  if (!state || !available) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2" data-counted-switch="">
      <p className="text-fluid-sm font-semibold text-slate-200" id="rule-chart-reading-label">
        Plot the reading
      </p>
      <nav aria-labelledby="rule-chart-reading-label" className="flex flex-wrap gap-1.5">
        {([false, true] as const).map((countIt) => (
          <PlainActionLink
            key={String(countIt)}
            href={state.hrefFor({ counted: countIt })}
            variant="pill"
            aria-current={countIt === state.counted ? "page" : undefined}
            className={countIt === state.counted ? undefined : "text-slate-300"}
            onClick={(event) => {
              if (!isPlainClick(event)) return;
              event.preventDefault();
              state.setCounted(countIt);
            }}
          >
            {countIt ? "Count startup-market inputs" : "As published"}
          </PlainActionLink>
        ))}
      </nav>
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
