"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { trackActivationEvent } from "../../../lib/activationFunnel";
import { decisionAreaLabel, type DecisionArea } from "../../../lib/report/boundedDecisionRules";
import { HOME_SECTIONS, type HomeAreaRow } from "../../../lib/report/home/homeSectionModel";
import { SegmentedControl, type SegmentedOption } from "../ui/segmentedControl";
import { ActionLink } from "../ui/actionLink";
import { FlipAlertForm } from "./FlipAlertForm";
import { CommitmentTest } from "./CommitmentTest";
import type { RegimeKey } from "../../../lib/regimeEngine";
import { RUNWAY_CHANGED_EVENT } from "../useOperatorRunway";
import { DECISION_CONTRACT_LABELS } from "../../../lib/report/reportCopy";

/**
 * The first-visit front door: one question under the call, instead of the
 * whole brief.
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

export function FirstVisitDecisionPicker({
  options,
  regime,
  flipCondition,
  turningPoints,
}: {
  options: readonly DecisionPickerOption[];
  /** This week's conditions, which pick the runway note the runway test quotes. */
  regime: RegimeKey;
  flipCondition?: string;
  turningPoints: readonly { label: string; href: string }[];
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

  const segmentedOptions: SegmentedOption<DecisionArea>[] = options.map((option) => ({
    key: option.area,
    label: QUESTION_BY_AREA[option.area],
  }));

  const handleSelect = (area: DecisionArea) => {
    // Picking a decision is the first deliberate act on the page; it is the
    // same funnel step as dismissing the explainer, and the one this block
    // exists to raise.
    if (!selected) trackActivationEvent({ step: "oriented", path: "/" });
    setSelected(area);
  };

  const handleReveal = () => {
    trackActivationEvent({ step: "oriented", path: "/" });
    revealFullBrief({ scroll: true });
    if (runwayBandMoved.current) router.refresh();
  };

  return (
    <section
      data-first-visit-only="true"
      data-testid="first-visit-decision-picker"
      aria-labelledby="first-visit-decision-heading"
      className="order-1 space-y-4 border-t border-slate-800/70 pt-5"
    >
      <div className="space-y-1">
        <h2 id="first-visit-decision-heading" className="text-base font-semibold tracking-[-0.02em] text-slate-100 sm:text-lg">
          What are you deciding this week?
        </h2>
        <p className="text-fluid-xs text-slate-400">Pick one. The answer uses this week&apos;s scores.</p>
      </div>

      <SegmentedControl
        options={segmentedOptions}
        value={selected}
        onSelect={handleSelect}
        ariaLabel="What are you deciding this week?"
      />

      {active ? (
        <div aria-live="polite" className="space-y-2 border-l-2 border-sky-500/50 pl-4">
          <p className="type-eyebrow">{decisionAreaLabel(active.area)}</p>
          <p className="max-w-[64ch] text-fluid-sm font-semibold leading-snug text-white">{active.rule}</p>
          {active.changed ? <p className="max-w-[64ch] text-fluid-xs text-amber-200/90">{active.changed}</p> : null}
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
          <CommitmentTest regime={regime} area={active.area} />
          {active.answer ? (
            <ActionLink href={active.answer.href} variant="inline">
              {active.answer.title} →
            </ActionLink>
          ) : null}
        </div>
      ) : null}

      <FlipAlertForm condition={flipCondition} />

      {turningPoints.length > 0 ? (
        <p className="max-w-[72ch] text-fluid-xs leading-relaxed text-slate-400">
          Check it against the record. What the guidance said at the last turns:{" "}
          {turningPoints.map((point, index) => (
            <span key={point.href}>
              {index > 0 ? " · " : null}
              <Link href={point.href} className="text-sky-300 underline decoration-sky-700 underline-offset-4 hover:text-sky-200">
                {point.label}
              </Link>
            </span>
          ))}
        </p>
      ) : null}

      <button
        type="button"
        onClick={handleReveal}
        className="weather-button weather-focus-ring weather-press-scale inline-flex min-h-[44px] items-center px-4 py-2 text-xs font-semibold"
      >
        Show the full brief: what changed, by area, and what would change it
      </button>
    </section>
  );
}
