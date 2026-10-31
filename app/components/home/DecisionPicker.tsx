"use client";

import { useCallback, useState, type ReactNode } from "react";
import {
  decisionAreaCorporateTransmission,
  decisionAreaLabel,
  type DecisionArea,
  type DecisionAreaCorporateTransmission,
} from "../../../lib/report/boundedDecisionRules";
import {
  HOME_DECISION_PARAM,
  HOME_SECTIONS,
  describeAreaPauseStatus,
  describePauseLineCount,
  type HomeAreaLineSlot,
  type HomeAreaRow,
} from "../../../lib/report/home/homeSectionModel";
import { resolveLineState } from "../../../lib/report/operatingCalls";
import { AreaIcon, AreaLabel, LineStateBadge } from "../ui/conceptIcons";
import { SegmentedControl, type SegmentedOption } from "../ui/segmentedControl";
import { ActionLink } from "../ui/actionLink";
import { CommitmentTest } from "./CommitmentTest";
import type { RegimeKey } from "../../../lib/regimeEngine";
import { DECISION_CONTRACT_LABELS } from "../../../lib/report/reportCopy";
import { useClipboardCopy } from "../useClipboardCopy";
import { CheckIcon, ShareIcon } from "../uiIcons";

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
 * The state badge carries the pause line's three states and a restart line that
 * is met, in the inks their columns carry in the area table; a restart line not
 * yet reached stays a neutral stamp with no glyph, because it is not a pause.
 */
function LineDistance({ slot, kind }: { slot: HomeAreaLineSlot; kind: "pause" | "resume" }) {
  const state = resolveLineState(slot.points, kind, slot.met);
  if (state) {
    return (
      <LineStateBadge state={state} stamp className="whitespace-nowrap align-middle text-fluid-nano">
        {slot.distance}
      </LineStateBadge>
    );
  }
  return (
    <span className="inline-block whitespace-nowrap rounded-sm border border-[color:var(--border-strong)] px-1.5 py-px align-baseline text-fluid-nano font-semibold tabular-nums text-slate-300">
      {slot.distance}
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
  initialSelected,
  children,
}: {
  options: readonly DecisionPickerOption[];
  /** This week's conditions, which pick the runway note the runway test quotes. */
  regime: RegimeKey;
  /** The decision the URL names (`?decision=`), open on first paint. */
  initialSelected?: DecisionArea;
  /** What follows the choices inside the section: the folded table of all five, and the plan link. */
  children?: ReactNode;
}) {
  const [selected, setSelected] = useState<DecisionArea | undefined>(initialSelected);
  const active = options.find((option) => option.area === selected);
  const activeTransmission: DecisionAreaCorporateTransmission | undefined = active
    ? decisionAreaCorporateTransmission[active.area]
    : undefined;

  const { status: copyStatus, copyToClipboard } = useClipboardCopy({ commitment: "copied_slack" });

  const handleCopySlackTakeaway = useCallback(() => {
    if (!active) return;
    const label = decisionAreaLabel(active.area);
    const bullets: string[] = [];
    if (active.rule) bullets.push(`• *Guidance:* ${active.rule}`);
    if (active.pause?.line) bullets.push(`• *Pause if:* ${active.pause.line}${active.pause.distance ? ` (${active.pause.distance})` : ""}`);
    if (active.resume?.line) bullets.push(`• *Restart when:* ${active.resume.line}${active.resume.distance ? ` (${active.resume.distance})` : ""}`);
    if (activeTransmission?.ruleOfThumb) bullets.push(`• *Rule of thumb:* ${activeTransmission.ruleOfThumb}`);
    if (activeTransmission?.startupMath) bullets.push(`• *Startup math:* ${activeTransmission.startupMath}`);

    const message = `*Whether: ${label} Takeaway*\n${bullets.join("\n")}\n\n*Full brief:* https://whether.work/?decision=${active.area}`;
    void copyToClipboard(message, `slack-takeaway-${active.area}`);
  }, [active, activeTransmission, copyToClipboard]);

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
      /* The question the row answers, as the native tooltip. The five cards
         carry the noun a reader scans for; the question they typed into a
         search box is the same string the answer page leads with, so it rides
         here rather than in a third line the grid has no room for. */
      title: option.answer?.title,
      /* 20px: the choice is a card. */
      icon: <AreaIcon area={option.area} size="card" />,
      /* The state as glyph and words, so a crossed line and a close one differ
         in shape as well as ink. */
      sublabel: status ? <LineStateBadge state={status.state}>{status.text}</LineStateBadge> : undefined,
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
      className="weather-section-stack weather-home-section border-t border-[color:var(--border-subtle)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-400"
    >
      <div className="space-y-4">
        <div className="space-y-1">
          <h2 id={`${HOME_SECTIONS.areas.id}-heading`} className="text-[1.375rem] font-semibold leading-tight tracking-[-0.015em] text-slate-100 sm:text-fluid-xl">
            {HOME_SECTIONS.areas.heading}
          </h2>
          {pauseLineCount ? (
            <p data-pause-line-count className="text-fluid-sm font-medium text-slate-200">
              {pauseLineCount}
            </p>
          ) : null}
          <p className="text-fluid-xs text-slate-400">
            Each area holds past its pause line and restarts past its restart line.{" "}
            {/* "Most weeks neither happens" sat under a count saying four of five were
                held, so the page contradicted itself in consecutive lines. The
                expectation line prints only when it is true of this week. */}
            {options.some((option) => option.pause?.met)
              ? "Held means the call above already applies to that area."
              : "Most weeks neither happens."}
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

        {/* No "This week's scores" list here (2026-10-09). It printed both scores
            and what they mean, which the conditions map's header and the bars in
            "What changed" print at every width; each line below says how far the
            reading is from it in points. */}

        {active ? (
          /* A card, not a sky rule down its left edge: sky is the colour of a
             link, and the rule read as a quote rather than as the answer. */
          <div
            aria-live="polite"
            className="space-y-3 rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-panel)] px-4 py-4 sm:px-5 animate-in fade-in-50 duration-200 motion-reduce:animate-none"
          >
            <p className="type-eyebrow">
              <AreaLabel area={active.area} />
            </p>
            {/* The question first, in the reader's words, then this week's
                answer to it. The five cards scan by noun; a card that has been
                opened has the room to ask what the reader came to ask, and the
                string is the answer page's own heading, so the short answer
                here and the long answer there cannot diverge. */}
            {active.answer ? (
              <h3 data-decision-question className="max-w-[56ch] text-pretty text-fluid-sm font-semibold leading-snug text-slate-300">
                {active.answer.title}
              </h3>
            ) : null}
            <p className="max-w-[56ch] text-fluid-lg font-semibold leading-snug text-slate-50">{active.rule}</p>
            {active.changed ? (
              /* Amber for an area the week moved, slate for one it did not: the
                 same table cell says "No line crossed" for both. */
              <p className={`max-w-[64ch] text-fluid-xs ${active.changedKind === "held" ? "text-slate-400" : "text-amber-200/90"}`}>
                {active.changed}
              </p>
            ) : null}
            <dl className="grid max-w-[64ch] gap-x-4 gap-y-2 text-fluid-sm text-slate-200 sm:grid-cols-[auto_1fr] sm:items-baseline">
              {active.pause ? (
                <>
                  <dt className="text-slate-400">{DECISION_CONTRACT_LABELS.threshold.pauseIf}</dt>
                  <dd>
                    <span className="tabular-nums">{active.pause.line}</span>{" "}
                    <LineDistance slot={active.pause} kind="pause" />
                  </dd>
                </>
              ) : null}
              {active.resume ? (
                <>
                  <dt className="text-slate-400">{DECISION_CONTRACT_LABELS.reversal.resumeWhen}</dt>
                  <dd>
                    <span className="tabular-nums">{active.resume.line}</span>{" "}
                    <LineDistance slot={active.resume} kind="resume" />
                  </dd>
                </>
              ) : null}
            </dl>
            {activeTransmission ? (
              <div
                data-transmission-note
                className="space-y-1.5 rounded-lg border border-[color:var(--border-subtle)] bg-[color:var(--bg-nested)] p-3 text-fluid-xs"
              >
                <p className="font-semibold text-slate-100">
                  Why this line governs {decisionAreaLabel(active.area).toLowerCase()}:
                </p>
                <p className="leading-relaxed text-slate-300">
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
            <details className="weather-auto-chevron border-t border-[color:var(--border-faint)] pt-3" data-commitment-disclosure>
              <summary className="cursor-pointer select-none text-fluid-xs font-medium text-slate-300 hover:text-slate-100">
                Test against your cash and runway (optional)
              </summary>
              <div className="pt-2">
                <CommitmentTest regime={regime} area={active.area} showTitle={false} />
              </div>
            </details>
            {/* The lines above are the published ones. A plan that needs its own —
                a hiring plan released at 60 rather than 66 — sets them once on the
                planning page and hears the day one is crossed. */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[color:var(--border-faint)] pt-3">
              <div className="flex flex-wrap items-center gap-4">
                <ActionLink href="/operate#ops-plan-lines" variant="inline">
                  Move these lines for your plan →
                </ActionLink>
                <button
                  type="button"
                  onClick={handleCopySlackTakeaway}
                  data-testid="copy-slack-takeaway"
                  className="inline-flex items-center gap-1.5 text-fluid-xs font-medium text-slate-300 hover:text-slate-100 transition-colors"
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
              </div>
              {active.answer ? (
                <ActionLink href={active.answer.href} variant="inline">
                  Read the full answer →
                </ActionLink>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      {children}
    </section>
  );
}
