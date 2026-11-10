"use client";

import { useCallback, useState, type ReactNode } from "react";
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
  describePauseLineCount,
  type AreaGroup,
  type HomeAreaRow,
} from "../../../lib/report/home/homeSectionModel";
import {
  runwayBandLabel,
  type RunwayBand,
} from "../../../lib/report/operatorRunway";
import { buildPlanTestHref } from "../../../lib/navigation/planningNavigation";
import { ActionLink, PlainActionLink } from "../ui/actionLink";
import { CommitmentTest } from "./CommitmentTest";
import { AreaGroups } from "./AreaGroups";
import { RunwayAreaNote } from "../RunwayConditionedNotes";
import type { RegimeKey } from "../../../lib/regimeEngine";
import { useClipboardCopy } from "../useClipboardCopy";
import { CheckIcon, ShareIcon } from "../uiIcons";

/**
 * "Your decisions this week": the five areas, third on the page, after the verdict
 * and the stage and runway the lines are scaled to (2026-10-09).
 *
 * The five answers are on the page before any is picked: every area's rule, grouped by
 * the condition that changes it (`AreaGroups`). An area's name opens, under its own
 * rule, why the rule matters, a test against the reader's cash and the links to share
 * or argue it (2026-11-03). A strip of five choices under the groups did that, and
 * printed the five names a second time; the open card restated the rule and lines the
 * group had just said.
 *
 * It used to fold the rest of the brief away on a first visit and carry the alert,
 * the record and a "Show the full brief" button for that visit. The order does
 * that job for every reader now: the areas, what would change them, and the alert
 * come before the evidence, so nothing is hidden and nothing is printed twice.
 */

export type DecisionPickerOption = HomeAreaRow & {
  /** The answer page that argues this area at length, when one exists. */
  answer?: { href: string; title: string };
};

/* The choice rides in the URL (`/?decision=hiring`), so a link copied after
   picking opens on the same answer, server-rendered. Replace, not push: picking
   another decision is not a step Back should retrace. The router's own state
   object is passed through so the app router keeps its entry. Closing the area
   takes it out of the URL and forgets it. */
const recordDecisionInUrl = (area: DecisionArea | null) => {
  const url = new URL(window.location.href);
  if (area) url.searchParams.set(HOME_DECISION_PARAM, area);
  else url.searchParams.delete(HOME_DECISION_PARAM);
  window.history.replaceState(window.history.state, "", url);
  /* And for the next visit, so a reader with one decision in flight opens on it. */
  document.cookie = buildHomeDecisionCookie(area);
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
  /** The guidance block prints each area's action from `lg` up, so the groups give theirs up there (AreaGroups). */
  rulesAbove?: boolean;
  /** What follows the groups inside the section: the fold behind the rules, and the plan link. */
  children?: ReactNode;
}) {
  const [selected, setSelected] = useState<DecisionArea | undefined>(initialSelected);
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

    const bullets: string[] = [];
    if (active.rule) bullets.push(`• *Guidance:* ${active.rule}`);
    if (activePause?.line) bullets.push(`• *Pause if:* ${activePause.line}${activePause.distance ? ` (${activePause.distance})` : ""}`);
    if (activeResume?.line) bullets.push(`• *Restart when:* ${activeResume.line}${activeResume.distance ? ` (${activeResume.distance})` : ""}`);
    if (activeTransmission?.whyLineMatters) bullets.push(`• *Why it matters:* ${activeTransmission.whyLineMatters}`);
    if (activeTransmission?.ruleOfThumb) bullets.push(`• *Rule of thumb:* ${activeTransmission.ruleOfThumb}`);
    if (activeTransmission?.startupMath) bullets.push(`• *Startup math:* ${activeTransmission.startupMath}`);

    const message = `*Whether: ${label} Takeaway${calibrationHeader}*\n${bullets.join("\n")}\n\n*Full brief:* https://whether.work/?decision=${active.area}`;
    void copyToClipboard(message, `slack-takeaway-${active.area}`);
  }, [active, activePause, activeResume, activeRunway, activeTransmission, copyToClipboard, stageLabel]);
  const pauseLineCount = describePauseLineCount(options, savedReadingDate);

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
          <div data-transmission-note className="max-w-[60ch] space-y-1.5 text-fluid-sm">
            <p className="leading-relaxed text-slate-300">
              <span className="font-semibold text-slate-100">Why this matters for {decisionAreaLabel(area).toLowerCase()}:</span>{" "}
              {activeTransmission.transmission} {activeTransmission.whyLineMatters}
            </p>
            <p className="text-fluid-nano text-slate-400">
              <span className="font-medium text-slate-200">Shared rule of thumb:</span> {activeTransmission.ruleOfThumb}
            </p>
            {activeTransmission.startupMath ? (
              <p className="text-fluid-nano text-slate-400">
                <span className="font-medium text-slate-200">Startup math:</span> {activeTransmission.startupMath}
              </p>
            ) : null}
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
            Set your own rules →
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
              {HOME_SECTIONS.areas.heading}
            </h2>
          </div>
          {/* A saved copy only (2026-11-03): on a live week the card's "On hold …" line
              and the groups below say the same count. */}
          {pauseLineCount && savedReadingDate ? (
            <p data-pause-line-count className="text-fluid-sm font-medium text-slate-200">
              {pauseLineCount}
            </p>
          ) : null}
        </div>

        {/* No "This week's scores" list here (2026-10-09). It printed both scores
            and what they mean, which the conditions map's header and the bars in
            "What changed" print at every width; each group says the score its
            condition reads. */}
        <AreaGroups
          groups={groups}
          rulesAbove={rulesAbove}
          selected={selected}
          onToggle={(area) => {
            const next = area === selected ? undefined : area;
            setSelected(next);
            recordDecisionInUrl(next ?? null);
          }}
          detail={renderDetail}
          note={isHistorical ? undefined : (area) => <RunwayAreaNote regime={regime} area={area} />}
          alerts={!isHistorical}
        />
      </div>

      {children}
    </section>
  );
}
