"use client";

import { useCallback, type ReactNode } from "react";
import { announceDecision, showHomeView, useHomeView } from "./homeView";
import {
  decisionAreaCorporateTransmission,
  decisionAreaLabel,
  type DecisionArea,
  type DecisionAreaCorporateTransmission,
} from "../../../lib/report/boundedDecisionRules";
import {
  AREA_TEST_PLANS,
  HOME_DECISION_PARAM,
  HOME_SECTIONS,
  buildHomeDecisionCookie,
  describeHeldAreas,
  parseHomeDecision,
  type AreaGroup,
  type HomeAreaRow,
  type HomeQuestion,
} from "../../../lib/report/home/homeSectionModel";
import {
  runwayBandLabel,
  type RunwayBand,
} from "../../../lib/report/operatorRunway";
import { buildPlanTestHref } from "../../../lib/navigation/planningNavigation";
import { ActionLink, PlainActionLink } from "../ui/actionLink";
import { CommitmentTest } from "./CommitmentTest";
import { AreaGroups } from "./AreaGroups";
import type { KnownDate } from "../ui/datedText";
import { asClause } from "../../../lib/report/briefArtifact";
import { RunwayAreaNote } from "../RunwayConditionedNotes";
import type { RegimeKey } from "../../../lib/regimeEngine";
import { useClipboardCopy } from "../useClipboardCopy";
import { CheckIcon, ShareIcon } from "../uiIcons";

/**
 * "What’s on hold?" (2026-11-18; "Your decisions this week" until then): the five areas' rules, third on the page, after the verdict
 * and the stage and runway the lines are scaled to (2026-10-09).
 *
 * The five answers lead in the brief above (`AreaStrip`), each with its action and line.
 * This section is the optional exploration, folded behind one disclosure since 2026-11-21:
 * every area's rule grouped by the condition that changes it (`AreaGroups`), the cash test
 * and the links. An area's name opens, under its own group, why the rule matters, a test
 * against the reader's cash and the links to share or argue it (2026-11-03). A `?decision=`
 * link or an area row's hash opens the fold on the area the reader meant.
 */

export type DecisionPickerOption = HomeAreaRow & {
  /** The answer page that argues this area at length, when one exists. */
  answer?: { href: string; title: string };
};

/* The choice rides in the URL (`/?decision=hiring`), so a link copied after
   picking opens on the same answer, server-rendered. Replace, not push: picking
   another decision is not a step Back should retrace. Closing the area takes it
   out of the URL and forgets it.

   Since 2026-11-18 the area runs through the page below the card: "What changed"
   marks the rows that move it, the one-month bars mark its move, and Copy brief's
   link opens on it. They follow the choice in place (`showHomeView`). The conditions
   chart hears a picked area through `whether:decision`, and the picker hears the
   chart's the same way (`homeView.tsx`). Closing an area sends nothing: the chart
   always shades one, and keeps the one it has. */
const recordDecision = (area: DecisionArea | null) => {
  /* For the next visit, so a reader with one decision in flight opens on it. */
  document.cookie = buildHomeDecisionCookie(area);
  showHomeView(HOME_DECISION_PARAM, area);
  if (area) announceDecision(area);
};

export function DecisionPicker({
  options,
  groups,
  regime,
  initialSelected,
  stageLabel,
  activeRunway,
  savedReadingDate,
  isHistorical = false,
  rulesAbove = false,
  children,
  question: questionProp,
  dates,
}: {
  options: readonly DecisionPickerOption[];
  /** Every area's rule, grouped by the condition that changes it (`buildAreaGroups`). */
  groups: readonly AreaGroup[];
  /** This week's conditions, which pick the runway note the runway test quotes. */
  regime: RegimeKey;
  /** The decision the URL names (`?decision=`), open on first paint. */
  initialSelected?: DecisionArea;
  /** The stage the company rules are calibrated for. */
  stageLabel?: string;
  /** The runway band the rules are calibrated for. */
  activeRunway?: RunwayBand;
  /** The reading's date when the page shows a saved copy: the count over the groups is that reading's. */
  savedReadingDate?: string;
  /** An archived month: no runway notes, no restart emails, since both read today. */
  isHistorical?: boolean;
  /** The brief above prints each area's action in its row, so the groups do not reprint it (AreaGroups). */
  rulesAbove?: boolean;
  /** What follows the groups inside the section: the fold behind the rules, and the plan link. */
  children?: ReactNode;
  /** "What’s on hold?" and its answer, as the page marks them up (`buildHomeQuestions`); null keeps the label. */
  question?: HomeQuestion | null;
  /** The comparison reading's date as the groups print it, with its ISO date, for `<time>`. */
  dates?: readonly KnownDate[];
}) {
  /* The URL's area, or the remembered one the server opened on (2026-11-18). */
  const selected = parseHomeDecision(useHomeView(HOME_DECISION_PARAM, initialSelected ?? null) ?? undefined);
  const active = options.find((option) => option.area === selected);
  /* One side of the rule, the one that can change the area's state (2026-11-03), as the
     rules table and every paste print it: an area on hold shows when it restarts, any
     other area when it pauses. "Nothing to resume" beside a running area is gone. */
  const activeHeld = Boolean(active?.pause?.met);
  const activePause = active?.pause && (!activeHeld || !active.resume) ? active.pause : undefined;
  const activeResume = active?.resume && (activeHeld || !active.pause) ? active.resume : undefined;
  const activeTransmission: DecisionAreaCorporateTransmission | undefined = active
    ? decisionAreaCorporateTransmission[active.area]
    : undefined;

  const { status: copyStatus, copyToClipboard } = useClipboardCopy({ commitment: "copied_slack" });

  const handleCopySlackTakeaway = useCallback(() => {
    if (!active) return;
    const label = decisionAreaLabel(active.area);
    const calibrationParts: string[] = [];
    if (stageLabel) calibrationParts.push(stageLabel);
    if (activeRunway) calibrationParts.push(`${runwayBandLabel(activeRunway)} runway`);
    const calibrationHeader = calibrationParts.length > 0 ? ` (${calibrationParts.join(" · ")})` : "";

    /* A message, answer first (2026-11-18): the area's rule as the line a person would type,
       then the lines it is bounded by. It opened on "Whether: Hiring Takeaway" and a
       "Guidance:" bullet. */
    const bullets: string[] = [];
    if (activePause?.line) bullets.push(`• *Pause if:* ${activePause.line}${activePause.distance ? ` (${activePause.distance})` : ""}`);
    if (activeResume?.line) bullets.push(`• *Restart when:* ${activeResume.line}${activeResume.distance ? ` (${activeResume.distance})` : ""}`);
    if (activeTransmission?.ruleOfThumb) bullets.push(`• *Rule of thumb:* ${activeTransmission.ruleOfThumb}`);
    if (activeTransmission?.startupMath) bullets.push(`• *Startup math:* ${activeTransmission.startupMath}`);

    const rule = /[.!?]$/.test(active.rule) ? active.rule : `${active.rule}.`;
    const message = `*${label} this week${calibrationHeader}: ${asClause(rule)}*\n${bullets.join("\n")}\n\n*Full brief:* https://whether.work/?decision=${active.area}`;
    void copyToClipboard(message, `slack-takeaway-${active.area}`);
  }, [active, activePause, activeResume, activeRunway, activeTransmission, copyToClipboard, stageLabel]);
  /* The heading's answer: the page passes the one it marks up; without it, the same builder. */
  const heldAnswer = describeHeldAreas(options, savedReadingDate);
  const question = questionProp !== undefined
    ? questionProp
    : heldAnswer
      ? { id: HOME_SECTIONS.areas.id, question: HOME_SECTIONS.areas.heading, answer: heldAnswer }
      : null;

  /* Under the area's own rule: what the rule and its condition, said in the group, do
     not — why it matters, the test against the reader's cash, and the links. */
  const renderDetail = (area: DecisionArea) => {
    const testPlan = isHistorical ? undefined : AREA_TEST_PLANS[area];
    return active && active.area === area ? (
      <div className="mt-2 space-y-3 border-t border-[color:var(--border-faint)] pt-3 text-fluid-sm animate-in fade-in-50 duration-200 motion-reduce:animate-none">
        {/* The question in the reader's words: the answer page's own heading, so the
            short answer here and the long one there cannot diverge. */}
        {active.answer ? (
          <p data-decision-question className="max-w-[56ch] text-pretty font-semibold leading-snug text-slate-300">
            {active.answer.title}
          </p>
        ) : null}
        {activeTransmission ? (
          <div data-transmission-note className="max-w-[60ch] space-y-2 text-fluid-sm">
            {activeTransmission.startupMath ? (
              <p className="leading-snug text-slate-200">
                <span className="font-semibold text-slate-100">Startup math:</span> {activeTransmission.startupMath}
              </p>
            ) : null}
            <p className="leading-snug text-slate-200">
              <span className="font-semibold text-slate-100">Shared rule of thumb:</span> {activeTransmission.ruleOfThumb}
            </p>
            <p className="text-xs leading-relaxed text-slate-400">
              <span className="font-medium text-slate-300">Why this matters for {decisionAreaLabel(area).toLowerCase()}:</span>{" "}
              {activeTransmission.transmission} {activeTransmission.whyLineMatters}
            </p>
          </div>
        ) : null}
        <details className="weather-auto-chevron" data-commitment-disclosure>
          <summary className="cursor-pointer select-none text-fluid-sm font-medium text-slate-300 hover:text-slate-100">
            Test against your cash and runway (optional)
          </summary>
          <div className="pt-2">
            <CommitmentTest regime={regime} area={area} showTitle={false} />
          </div>
        </details>
        {/* The lines in the group are the published ones. A plan that needs its own —
            a hiring plan released at 60 rather than 66 — sets them once on the
            planning page and hears the day one is crossed. */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {/* Not on an archived month: the stress test grades against today's reading. */}
          {testPlan ? (
            <PlainActionLink href={buildPlanTestHref(testPlan)} data-area-test-link>
              {`Test “${testPlan}” →`}
            </PlainActionLink>
          ) : null}
          <ActionLink href="/operate#ops-plan-lines" variant="inline">
            Want your own numbers? →
          </ActionLink>
          <button
            type="button"
            onClick={handleCopySlackTakeaway}
            data-testid="copy-slack-takeaway"
            className="weather-hit inline-flex items-center gap-1.5 text-fluid-sm font-medium text-slate-300 hover:text-slate-100 transition-colors"
            title="Copy a summary of this decision to paste into Slack or a meeting note"
          >
            {copyStatus === "copied" ? (
              <CheckIcon className="size-3.5 text-emerald-400" />
            ) : (
              <ShareIcon className="size-3.5 text-slate-400" />
            )}
            <span>
              {copyStatus === "copied"
                ? "Copied takeaway for Slack"
                : copyStatus === "copying"
                  ? "Copying…"
                  : "Copy takeaway for Slack"}
            </span>
          </button>
          {active.answer ? (
            <ActionLink href={active.answer.href} variant="inline">
              Read the citable defense →
            </ActionLink>
          ) : null}
        </div>
      </div>
    ) : null;
  };

  return (
    <section
      id={HOME_SECTIONS.areas.id}
      data-page-section={HOME_SECTIONS.areas.id}
      data-testid="decision-picker"
      tabIndex={-1}
      aria-labelledby={`${HOME_SECTIONS.areas.id}-heading`}
      className="weather-section-stack weather-home-section border-t border-[color:var(--border-subtle)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-400"
    >
      <div className="space-y-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id={`${HOME_SECTIONS.areas.id}-heading`} className="type-section">
              {question?.question ?? HOME_SECTIONS.areas.fallback}
            </h2>
          </div>
          {/* "What’s on hold?", answered with the held areas by name (2026-11-18), or on a
              saved copy the old reading's count with its date. It took the place of the
              count a saved copy alone printed here. */}
          {question ? (
            <p data-section-lead data-pause-line-count className="text-fluid-lg font-medium leading-snug text-slate-50">
              {question.answer}
            </p>
          ) : null}
        </div>

        {/* The five answers are in the brief above (`AreaStrip`), each with its action
            and its line. This section is the optional exploration: the condition each
            group of areas waits on, the cash test, and the links. It folds by default
            (2026-11-21) so the first screen is the brief, and a `?decision=` link or a
            row's "View lines" opens it on the area the reader meant (`AnchorFeedback`
            opens a disclosure around a hash target). */}
        <details
          className="weather-auto-chevron"
          data-decision-explore
          /* A saved copy or an archived month has no area strip above, so the groups
             stay open: they are the five answers there, not optional exploration. */
          open={initialSelected || !rulesAbove ? true : undefined}
        >
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-sm font-semibold text-sky-200 hover:text-slate-100">
            {rulesAbove ? "Each area’s rule, decision test and links" : "Every area’s rule, decision test and links"}
          </summary>
          <div className="pt-3">
            <AreaGroups
              groups={groups}
              rulesAbove={rulesAbove}
              dates={dates}
              selected={selected}
              onToggle={(area) => recordDecision(area === selected ? null : area)}
              detail={renderDetail}
              note={isHistorical ? undefined : (area) => <RunwayAreaNote regime={regime} area={area} />}
              alerts={!isHistorical}
            />
          </div>
        </details>
      </div>

      {children}
    </section>
  );
}
