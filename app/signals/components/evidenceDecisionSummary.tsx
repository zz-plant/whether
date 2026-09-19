"use client";

import { BoundedValue } from "../../components/ui/boundedValue";
import { displaySignalLabel } from "./evidenceSectionShared";
import {
  MarketVectorBarometer,
  PressureDriverGauge,
  ThresholdGateGlyph,
} from "../../components/illustrations/SignalTelemetryGlyphs";

/**
 * The first task block on /signals: what the evidence means now, and what else
 * moved. Three things used to sit around it and are gone (2026-09-15):
 * - a one-line strip above it ("Use this evidence to confirm this week's call
 *   or change it now.", or the historical / cached variant), which restated
 *   the shell's status line and the historical banner;
 * - an h2 restating the regime the status line one screen above already names;
 * - a "What founders should do this week" playbook with live start and stop
 *   rules — the operating call, which app/signals/AGENTS.md says this directory
 *   must not own and which /operate prints by area.
 */
export const SignalsDecisionSummarySection = ({
  triggerCondition,
  reversalCondition,
  showMicroDecisionRows,
  actionNowShort,
  topDiagnosticCallouts,
}: {
  triggerCondition: string;
  reversalCondition: string;
  showMicroDecisionRows: boolean;
  actionNowShort?: string;
  topDiagnosticCallouts: Array<{ label: string; why: string }>;
}) => {
  const normalizedAction = (actionNowShort ?? "").toLowerCase();
  const vectorDirection: "tighten" | "ease" | "hold" = normalizedAction.includes("tighten")
    ? "tighten"
    : normalizedAction.includes("ease")
      ? "ease"
      : "hold";

  return (
  <section
    id="decision-summary"
    className="weather-panel space-y-6 px-6 py-5"
    aria-label="Decision summary"
  >
    <article className="weather-surface space-y-3 p-4">
      <p className="type-eyebrow">What this means now</p>
      <div className="grid gap-3 lg:grid-cols-3">
        <div className="rounded-md border border-slate-800/80 bg-slate-950/45 px-3 py-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-slate-400">
              Current outlook
            </p>
            <MarketVectorBarometer direction={vectorDirection} size={24} />
          </div>
          <p className="mt-2 text-sm font-semibold text-slate-100">
            {actionNowShort ??
              "Hold the current operating posture while thresholds hold."}
          </p>
        </div>
        <div className="rounded-md border border-slate-800/80 bg-slate-950/45 px-3 py-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-slate-400">
              Main pressure
            </p>
            <PressureDriverGauge intensity={topDiagnosticCallouts.length > 0 ? "high" : "mid"} size={24} />
          </div>
          {topDiagnosticCallouts[0] ? (
            <>
              {/* Names the driver as well as describing it — this cell is now the
                only place the top mover appears. */}
              <p className="mt-2 text-sm font-semibold text-slate-100">
                {displaySignalLabel(topDiagnosticCallouts[0].label)}
              </p>
              <p className="mt-1 text-sm text-slate-200">
                {topDiagnosticCallouts[0].why}
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm text-slate-200">
              Review the scorecard below to confirm the main driver before you
              change posture.
            </p>
          )}
        </div>
        <div className="rounded-md border border-slate-800/80 bg-slate-950/45 px-3 py-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-slate-400">
              What would change this
            </p>
            <ThresholdGateGlyph size={24} />
          </div>
          {showMicroDecisionRows ? (
            /* Was two tinted cards nested inside this card, inside the section
             card — three containment levels for two sentences. Labelled rows
             carry the same distinction with one level, and the hue now sits on
             the label rather than on a box around it. */
            <dl className="mt-2 space-y-1.5 text-sm text-slate-200">
              <div className="flex flex-wrap gap-x-2">
                <dt className="shrink-0 font-semibold text-semantic-caution-fg">
                  Wrong if:
                </dt>
                <dd className="min-w-0">
                  <BoundedValue>{triggerCondition}</BoundedValue>
                </dd>
              </div>
              <div className="flex flex-wrap gap-x-2">
                <dt className="shrink-0 font-semibold text-semantic-easing-fg">
                  Safe again when:
                </dt>
                <dd className="min-w-0">
                  <BoundedValue>{reversalCondition}</BoundedValue>
                </dd>
              </div>
            </dl>
          ) : (
            <dl className="mt-2 space-y-1.5 text-sm text-slate-200">
              <div className="flex flex-wrap gap-x-2">
                <dt className="shrink-0 font-semibold text-semantic-caution-fg">
                  Wrong if:
                </dt>
                <dd className="min-w-0">{triggerCondition}</dd>
              </div>
              <div className="flex flex-wrap gap-x-2">
                <dt className="shrink-0 font-semibold text-semantic-easing-fg">
                  Safe again when:
                </dt>
                <dd className="min-w-0">{reversalCondition}</dd>
              </div>
            </dl>
          )}
        </div>
      </div>
    </article>
    {/* Starts at the second callout. The first one's `why` is already the
      Main pressure cell in the summary above, word for word, so listing it
      again here was the same sentence twice on one screen.

      The per-item rank label is gone. It was truthful — "Top mover 2" really
      was the second — but the first never appears under that name, so a list
      opening at 2 reads to the reader as one with an item missing. The card
      is titled "Also moved" and its items are in rank order, which carries
      the same information without implying an absent row. */}
    {topDiagnosticCallouts.length > 1 ? (
      <article className="weather-surface flex flex-col justify-between p-5">
        <div className="space-y-3">
          <p className="type-eyebrow">Also moved</p>
          <ul className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0" aria-label="Top mover callouts">
            {topDiagnosticCallouts.slice(1).map((item) => (
              <li
                key={item.label}
                className="rounded-md border border-slate-800/80 bg-slate-950/40 p-3"
              >
                <p className="text-sm font-semibold text-slate-100">
                  {displaySignalLabel(item.label)}
                </p>
                <p className="mt-1 text-sm text-slate-200">{item.why}</p>
              </li>
            ))}
          </ul>
        </div>
        <p className="mt-4 border-t border-slate-800/60 pt-3 text-xs text-slate-400">
          Check the scorecard below for watch lines and historical distance on each signal.
        </p>
      </article>
    ) : null}
  </section>
  );
};
