"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { decisionAreaLabel, type DecisionArea } from "../../../lib/report/boundedDecisionRules";
import {
  HOME_SECTIONS,
  describeAreaPauseStatus,
  describePauseLineCount,
  type HomeAreaRow,
} from "../../../lib/report/home/homeSectionModel";
import type { LastTimeCallChanged } from "../../../lib/report/lastTimeCallChanged";
import { SegmentedControl, type SegmentedOption } from "../ui/segmentedControl";
import { ActionLink } from "../ui/actionLink";
import { SignalReading } from "../ui/plainLanguage";
import { SubscribeForm } from "../SubscribeForm";
import { CommitmentTest } from "./CommitmentTest";
import { LastTimeCallChangedCard } from "./LastTimeCallChangedCard";
import type { RegimeKey } from "../../../lib/regimeEngine";
import { RUNWAY_CHANGED_EVENT } from "../useOperatorRunway";
import { DECISION_CONTRACT_LABELS } from "../../../lib/report/reportCopy";

/**
 * "What are you deciding?": one question under the call, for every reader.
 *
 * It was first-visit only, so the page was two products at one URL: a first
 * visit got the question and no evidence, and a returning reader got the
 * evidence and lost the question. The question now shows on every live weekly
 * brief. What stays first-visit only is the fold: the alert form, the record
 * line and the button that opens the rest of the brief, which a returning
 * reader already has open below.
 *
 * A first-time reader meets a call about the market — "freeze new commitments"
 * — and five sections of evidence for it, and nothing that says what it means
 * for the decision they came with. So on a first visit the brief below the
 * call is folded away (`data-first-visit-collapsible`, hidden pre-paint by the
 * layout bootstrap) and this asks the one question the page can answer for
 * anyone: what are you deciding? Each answer is that area's row of the same
 * table the full brief prints, so the two cannot disagree.
 *
 * Everything is server-rendered and the fold is CSS keyed on an attribute the
 * layout sets before paint, so crawlers, readers without scripts and every
 * returning browser get the full brief exactly as before. "First visit" means
 * this browser has never rendered the brief: `ActivationTracker` stores the
 * week on every visit, and the bootstrap reads that key.
 */

const QUESTION_BY_AREA: Record<DecisionArea, string> = {
  hiring: "Hire someone",
  "product-tempo": "Change the roadmap",
  "capital-raising": "Raise money",
  "burn-discipline": "Approve new spend",
  "expansion-bets": "Start something new",
};

export type DecisionPickerOption = HomeAreaRow & {
  /** The answer page that argues this area at length, when one exists. */
  answer?: { href: string; title: string };
};

/* Module-level on purpose, as in `homeFirstRunOrientation.tsx`: the React
   compiler's immutability rule refuses a write to the document inside a
   component body. */
const revealFullBrief = ({ scroll }: { scroll: boolean }) => {
  document.documentElement.dataset.homeFirstVisit = "false";
  if (!scroll) return;
  const target = document.getElementById(HOME_SECTIONS.changed.id);
  target?.scrollIntoView({ block: "start" });
  target?.focus({ preventScroll: true });
};

/** A link to a folded section (the sticky strip, a shared `#what-would-change`) unfolds the brief. */
const hashTargetsFoldedBrief = () => {
  const id = window.location.hash.slice(1);
  if (!id) return false;
  return Boolean(document.getElementById(id)?.closest("[data-first-visit-collapsible]"));
};

export function DecisionPicker({
  options,
  regime,
  scores,
  flipCondition,
  lastTime,
  turningPoints,
  calibration,
}: {
  options: readonly DecisionPickerOption[];
  /** This week's conditions, which pick the runway note the runway test quotes. */
  regime: RegimeKey;
  /** This week's two scores, printed with what they mean before any line that quotes them. */
  scores: { tightness: number; riskAppetite: number };
  flipCondition?: string;
  /**
   * On a week conditions changed, the last time they moved the same way and the
   * lines they turn on: drawn as the same card the folded brief carries, so a
   * first visit sees the two earlier scores rather than reading them in a
   * paragraph. Absent on every other week.
   */
  lastTime?: { record: LastTimeCallChanged; callChangeLines: { tightness: number; riskAppetite: number } };
  turningPoints: readonly { label: string; href: string }[];
  /** Who the lines below are scaled for. The controls that set it sit in the brief, under "What that changes for you". */
  calibration?: { stageLabel: string; runwayPhrase: string; chosen: boolean };
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<DecisionArea | undefined>(undefined);
  // A runway typed into the test below moves the band the folded rules are
  // scaled to without re-rendering them (that would close this card). The
  // reveal is when they are next seen, so that is when they catch up.
  const runwayBandMoved = useRef(false);

  useEffect(() => {
    const onRunwayChanged = (event: Event) => {
      if (event instanceof CustomEvent && Reflect.get(Object(event.detail), "bandChanged") === true) {
        runwayBandMoved.current = true;
      }
    };
    window.addEventListener(RUNWAY_CHANGED_EVENT, onRunwayChanged);
    return () => window.removeEventListener(RUNWAY_CHANGED_EVENT, onRunwayChanged);
  }, []);
  const active = options.find((option) => option.area === selected);

  useEffect(() => {
    const unfoldForHash = () => {
      if (hashTargetsFoldedBrief()) revealFullBrief({ scroll: false });
    };
    unfoldForHash();
    window.addEventListener("hashchange", unfoldForHash);
    return () => window.removeEventListener("hashchange", unfoldForHash);
  }, []);

  /* Each choice carries where its area stands against its pause line, so the
     five answers are on the page before any is picked; the click opens the
     rule and its lines. The count over them is the same rows, summed. */
  const segmentedOptions: SegmentedOption<DecisionArea>[] = options.map((option) => {
    const status = describeAreaPauseStatus(option);
    return {
      key: option.area,
      label: QUESTION_BY_AREA[option.area],
      sublabel: status?.text,
      sublabelTone: status?.crossed ? "caution" : undefined,
    };
  });
  const pauseLineCount = describePauseLineCount(options);

  /* Picking a decision is the first deliberate act this block exists to raise.
     `ActivationTracker` records it as `oriented`, the same as any other control
     on the page, so nothing here sends it a second time. */
  const handleReveal = () => {
    revealFullBrief({ scroll: true });
    if (runwayBandMoved.current) router.refresh();
  };

  return (
    <section
      data-testid="decision-picker"
      aria-labelledby="first-visit-decision-heading"
      className="order-1 flex flex-col gap-8 border-t border-slate-800/70 pt-5"
    >
      {/* Three groups, spaced apart more than anything inside them: the decision,
          the alert, and the record. One even gap through all of it left the score
          lines between the choices and the alert card belonging to neither, and
          the record reading as more of the alert's copy. */}
      <div className="space-y-4">
        <div className="space-y-1">
          <h2 id="first-visit-decision-heading" className="text-base font-semibold tracking-[-0.02em] text-slate-100 sm:text-lg">
            What are you deciding?
          </h2>
          {pauseLineCount ? (
            <p data-pause-line-count className="text-fluid-sm font-medium text-slate-200">
              {pauseLineCount}
            </p>
          ) : null}
          <p className="text-fluid-xs text-slate-400">
            Pick one. Its answer holds until a score crosses one of its lines, and most weeks none does.
          </p>
          {/* The answers are scaled to a stage and a runway, and the controls
              that set them sat mid-page under the content they change. This
              says whose lines these are where the reader first meets them. */}
          {calibration ? (
            <p className="text-fluid-xs text-slate-400" data-calibration-note>
              Lines set for {calibration.stageLabel} with {calibration.runwayPhrase} of runway
              {calibration.chosen ? "" : " (the defaults)"}.{" "}
              <a
                href="#company-calibration"
                className="weather-hit text-sky-300 underline decoration-sky-700 underline-offset-4 hover:text-sky-200 max-sm:hidden"
              >
                Change
              </a>
            </p>
          ) : null}
        </div>

        <SegmentedControl
          options={segmentedOptions}
          value={selected}
          onSelect={setSelected}
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
          <div aria-live="polite" className="space-y-2 border-l-2 border-sky-500/50 pl-4">
            <p className="type-eyebrow">{decisionAreaLabel(active.area)}</p>
            <p className="max-w-[64ch] text-fluid-sm font-semibold leading-snug text-white">{active.rule}</p>
            {active.changed ? (
              /* Amber for an area the week moved, slate for one it did not: the
                 same table cell says "No line crossed" for both. */
              <p className={`max-w-[64ch] text-fluid-xs ${active.changedKind === "held" ? "text-slate-400" : "text-amber-200/90"}`}>
                {active.changed}
              </p>
            ) : null}
            <dl className="grid max-w-[64ch] gap-1 text-fluid-xs text-slate-300 sm:grid-cols-[auto_1fr] sm:gap-x-4">
              {active.pause ? (
                <>
                  <dt className="text-slate-400">{DECISION_CONTRACT_LABELS.threshold.pauseIf}</dt>
                  <dd>
                    {active.pause.line} <span className="text-slate-400">· {active.pause.distance}</span>
                  </dd>
                </>
              ) : null}
              {active.resume ? (
                <>
                  <dt className="text-slate-400">{DECISION_CONTRACT_LABELS.reversal.resumeWhen}</dt>
                  <dd>
                    {active.resume.line} <span className="text-slate-400">· {active.resume.distance}</span>
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

      {/* First visit only: the alert, the record line and the button that opens
          the brief. A returning reader has all three in the brief below. */}
      <div data-first-visit-only="true" className="space-y-8">
        <SubscribeForm compact defaultFrequency="alerts" condition={flipCondition} />

        {/* The answer to "has this happened before", on the page: the last
            time conditions moved this way, as the card the folded brief draws,
            and the turning points as links. A sceptical first visit had to
            leave to check. */}
        {lastTime ? <LastTimeCallChangedCard record={lastTime.record} callChangeLines={lastTime.callChangeLines} /> : null}

        {turningPoints.length > 0 ? (
          <div className="space-y-2">
            <h3 className="type-eyebrow">Has this happened before?</h3>
            <p className="max-w-[72ch] text-fluid-xs leading-relaxed text-slate-400">
              Check it against the record. What the guidance said at the last turns:{" "}
              {turningPoints.map((point, index) => (
                <span key={point.href}>
                  {index > 0 ? " · " : null}
                  <Link href={point.href} className="weather-hit text-sky-300 underline decoration-sky-700 underline-offset-4 hover:text-sky-200">
                    {point.label}
                  </Link>
                </span>
              ))}
            </p>
          </div>
        ) : null}

        <button
          type="button"
          onClick={handleReveal}
          className="weather-button weather-focus-ring weather-press-scale inline-flex min-h-[44px] items-center px-4 py-2 text-xs font-semibold"
        >
          Show the full brief
        </button>
      </div>
    </section>
  );
}
