"use client";

import { useState, type ReactNode } from "react";
import { decisionAreaLabel, type DecisionArea } from "../../../lib/report/boundedDecisionRules";
import {
  HOME_DECISION_PARAM,
  HOME_SECTIONS,
  describeAreaPauseStatus,
  describePauseLineCount,
  type HomeAreaRow,
} from "../../../lib/report/home/homeSectionModel";
import { SegmentedControl, type SegmentedOption } from "../ui/segmentedControl";
import { ActionLink } from "../ui/actionLink";
import { SignalReading } from "../ui/plainLanguage";
import { CommitmentTest } from "./CommitmentTest";
import type { RegimeKey } from "../../../lib/regimeEngine";
import { DECISION_CONTRACT_LABELS } from "../../../lib/report/reportCopy";

/**
 * "What are you deciding?": the five areas, third on the page, after the verdict
 * and the stage and runway the lines are scaled to (2026-10-09).
 *
 * Each choice carries the area's name and where it stands against its pause line,
 * so the five answers are on the page before any is picked; the click opens that
 * area's rule and lines. The folded table under it (`AllAreaRules`, passed as
 * children) prints all five side by side, and keeps every rule in the server HTML.
 *
 * It used to fold the rest of the brief away on a first visit and carry the alert,
 * the record and a "Show the full brief" button for that visit. The order does
 * that job for every reader now: the areas, what would change them, and the alert
 * come before the evidence, so nothing is hidden and nothing is printed twice.
 */

/**
 * How far the reading is from a line, as a stamp: a status, so sharp (§XIV).
 * A pause line in force takes the caution ink and a resume line that is met
 * the easing ink, the two inks their columns carry in the area table; a line
 * not yet reached stays neutral.
 */
function LineDistance({ distance, met, kind }: { distance: string; met: boolean; kind: "pause" | "resume" }) {
  const tone = !met
    ? "border-[color:var(--border-strong)] text-slate-300"
    : kind === "pause"
      ? "border-semantic-caution-border/50 bg-semantic-caution-border/10 text-semantic-caution-fg"
      : "border-semantic-easing-border/50 bg-semantic-easing-border/10 text-semantic-easing-fg";
  return (
    <span className={`inline-block whitespace-nowrap rounded-sm border px-1.5 py-px align-baseline text-fluid-nano font-semibold tabular-nums ${tone}`}>
      {distance}
    </span>
  );
}

export type DecisionPickerOption = HomeAreaRow & {
  /** The answer page that argues this area at length, when one exists. */
  answer?: { href: string; title: string };
};

/* The choice rides in the URL (`/?decision=hiring`), so a link copied after
   picking opens on the same answer, server-rendered. Replace, not push: picking
   another decision is not a step Back should retrace. The router's own state
   object is passed through so the app router keeps its entry. */
const recordDecisionInUrl = (area: DecisionArea) => {
  const url = new URL(window.location.href);
  url.searchParams.set(HOME_DECISION_PARAM, area);
  window.history.replaceState(window.history.state, "", url);
};

export function DecisionPicker({
  options,
  regime,
  scores,
  initialSelected,
  children,
}: {
  options: readonly DecisionPickerOption[];
  /** This week's conditions, which pick the runway note the runway test quotes. */
  regime: RegimeKey;
  /** This week's two scores, printed with what they mean before any line that quotes them. */
  scores: { tightness: number; riskAppetite: number };
  /** The decision the URL names (`?decision=`), open on first paint. */
  initialSelected?: DecisionArea;
  /** What follows the choices inside the section: the folded table of all five, and the plan link. */
  children?: ReactNode;
}) {
  const [selected, setSelected] = useState<DecisionArea | undefined>(initialSelected);
  const active = options.find((option) => option.area === selected);

  /* Each choice carries where its area stands against its pause line, so the
     five answers are on the page before any is picked; the click opens the
     rule and its lines. The count over them is the same rows, summed. */
  const segmentedOptions: SegmentedOption<DecisionArea>[] = options.map((option) => {
    const status = describeAreaPauseStatus(option);
    return {
      key: option.area,
      /* The area's own name, the one every table and paste uses. The choices
         were verb phrases ("Raise money", "Approve new spend") that named no
         area, so a reader met two names for each of the five. */
      label: decisionAreaLabel(option.area),
      sublabel: status?.text,
      sublabelTone: status?.crossed ? "caution" : undefined,
    };
  });
  const pauseLineCount = describePauseLineCount(options);

  return (
    <section
      id={HOME_SECTIONS.areas.id}
      data-page-section={HOME_SECTIONS.areas.id}
      data-testid="decision-picker"
      tabIndex={-1}
      aria-labelledby={`${HOME_SECTIONS.areas.id}-heading`}
      className="weather-section-stack weather-home-section border-t border-slate-800/70 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-400"
    >
      <div className="space-y-4">
        <div className="space-y-1">
          <h2 id={`${HOME_SECTIONS.areas.id}-heading`} className="text-fluid-xl font-semibold tracking-[-0.015em] text-slate-100">
            {HOME_SECTIONS.areas.heading}
          </h2>
          {pauseLineCount ? (
            <p data-pause-line-count className="text-fluid-sm font-medium text-slate-200">
              {pauseLineCount}
            </p>
          ) : null}
          <p className="text-fluid-xs text-slate-400">
            Pick one. Its answer holds until a score crosses one of its lines, and most weeks none does.
          </p>
        </div>

        <SegmentedControl
          options={segmentedOptions}
          value={selected}
          onSelect={(area) => {
            setSelected(area);
            recordDecisionInUrl(area);
          }}
          ariaLabel="What are you deciding?"
          layout="choices"
        />

        {/* What the numbers below are measured against. Every line under the
            choices quotes a score ("Funding pressure > 76", "90 today"), and what
            100 means was printed only in the folded "What changed" table, so a
            first visit met numbers it had no way to read. */}
        <div className="space-y-1">
          <p id="first-visit-scores-label" className="type-eyebrow">This week&apos;s scores</p>
          <ul aria-labelledby="first-visit-scores-label" className="space-y-0.5 text-fluid-xs text-slate-400">
            <li><SignalReading signalKey="tightness" score={scores.tightness} /></li>
            <li><SignalReading signalKey="riskAppetite" score={scores.riskAppetite} /></li>
          </ul>
        </div>

        {active ? (
          /* A card, not a sky rule down its left edge: sky is the colour of a
             link, and the rule read as a quote rather than as the answer. */
          <div
            aria-live="polite"
            className="space-y-3 rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-panel)] px-4 py-4 sm:px-5"
          >
            <p className="type-eyebrow">{decisionAreaLabel(active.area)}</p>
            <p className="max-w-[56ch] text-fluid-lg font-semibold leading-snug text-white">{active.rule}</p>
            {active.changed ? (
              /* Amber for an area the week moved, slate for one it did not: the
                 same table cell says "No line crossed" for both. */
              <p className={`max-w-[64ch] text-fluid-xs ${active.changedKind === "held" ? "text-slate-400" : "text-amber-200/90"}`}>
                {active.changed}
              </p>
            ) : null}
            <dl className="grid max-w-[64ch] gap-x-4 gap-y-2 text-fluid-xs text-slate-200 sm:grid-cols-[auto_1fr] sm:items-baseline">
              {active.pause ? (
                <>
                  <dt className="text-slate-400">{DECISION_CONTRACT_LABELS.threshold.pauseIf}</dt>
                  <dd>
                    <span className="tabular-nums">{active.pause.line}</span>{" "}
                    <LineDistance distance={active.pause.distance} met={active.pause.met} kind="pause" />
                  </dd>
                </>
              ) : null}
              {active.resume ? (
                <>
                  <dt className="text-slate-400">{DECISION_CONTRACT_LABELS.reversal.resumeWhen}</dt>
                  <dd>
                    <span className="tabular-nums">{active.resume.line}</span>{" "}
                    <LineDistance distance={active.resume.distance} met={active.resume.met} kind="resume" />
                  </dd>
                </>
              ) : null}
            </dl>
            {/* The lines above are the published ones. A plan that needs its own —
                a hiring plan released at 60 rather than 66 — sets them once on the
                planning page and hears the day one is crossed. */}
            <ActionLink href="/operate#ops-plan-lines" variant="inline">
              Move these lines for your plan →
            </ActionLink>
            <CommitmentTest regime={regime} area={active.area} />
            {active.answer ? (
              <ActionLink href={active.answer.href} variant="inline">
                {active.answer.title} →
              </ActionLink>
            ) : null}
          </div>
        ) : null}
      </div>

      {children}
    </section>
  );
}
