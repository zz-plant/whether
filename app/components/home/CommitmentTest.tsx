"use client";

import { useId, useMemo, useState } from "react";
import type { RegimeKey } from "../../../lib/regimeEngine";
import { decisionAreaLabel, decisionAreaOrder, isDecisionArea, type DecisionArea } from "../../../lib/report/boundedDecisionRules";
import { buildCommitmentImpact, describeProfileRunway } from "../../../lib/report/runwayConditionedNotes";
import { RUNWAY_BAND_OPTIONS } from "../../../lib/report/operatorRunway";
import { parseMoneyInput } from "../../../lib/planCommitment";
import { netMonthlyBurnUsd, resolveProfileRunway } from "../../../lib/operatorProfile";
import { OperatorProfileNumberField } from "../operatorProfileFields";
import { useOperatorProfile } from "../useOperatorProfile";

/**
 * "Test it against your runway": the step from this week's guidance to the
 * reader's own company.
 *
 * The guidance is about the market, and a reader who came with a decision
 * leaves when nothing on the page is about theirs. Figures they know without a
 * finance lead — cash in the bank, what they spend and what comes in a month —
 * and the monthly cost of the decision are enough to say how long the cash
 * lasts, what the decision does to that, and which of the runway notes this
 * week's guidance already carries applies after it (`buildCommitmentImpact`).
 * It asked for runway and burn until 2026-10-01: runway is the figure somebody
 * has to work out, and "burn" was read as spend on /operate and as net burn here.
 *
 * Cash, spend and revenue are the shared operator profile: the same
 * browser-only figures `/operate` and the runway notes read, so entering them
 * once reaches every surface and nothing leaves the browser. A runway typed on
 * /operate still counts until cash replaces it. The decision's cost is not
 * stored; it belongs to one question.
 */
/**
 * The runway chart's scale ends at 36 months; the band boundaries are the
 * canonical ones (6 / 12 / 24), not a local 12/18 mapping, so a reader sees the
 * same bands the guidance and `buildCommitmentImpact` use.
 */
const RUNWAY_BAND_CEILINGS = RUNWAY_BAND_OPTIONS
  .map((option) => option.maxMonths)
  .filter((months): months is number => months !== null);

export function CommitmentTest({
  regime,
  area,
  showTitle = true,
}: {
  regime: RegimeKey;
  area: DecisionArea;
  /** False where a disclosure's summary already names it. */
  showTitle?: boolean;
}) {
  const { profile, setProfileField } = useOperatorProfile();
  const costId = useId();
  const [costDraft, setCostDraft] = useState("");
  const cost = parseMoneyInput(costDraft) ?? undefined;

  const runway = useMemo(() => resolveProfileRunway(profile), [profile]);
  const impact = useMemo(
    () =>
      buildCommitmentImpact({
        regime,
        area,
        runwayMonths: runway && runway.basis !== "cash-flow-positive" ? runway.months : undefined,
        netMonthlyBurnUsd: netMonthlyBurnUsd(profile),
        cashUsd: profile.cashUsd,
        newMonthlyCostUsd: cost,
      }),
    [regime, area, runway, profile, cost],
  );

  return (
    <div data-testid="commitment-test" className="space-y-2 border-t border-[color:var(--border-faint)] pt-3">
      {showTitle ? <p className="text-fluid-xs font-medium text-slate-200">Test it against your runway</p> : null}
      <div className="grid gap-2 sm:grid-cols-2">
        <OperatorProfileNumberField
          field="cashUsd"
          label="Cash in the bank"
          placeholder="$2.1M"
          value={profile.cashUsd}
          onCommit={(value) => setProfileField("cashUsd", value)}
        />
        <OperatorProfileNumberField
          field="monthlyBurnUsd"
          label="Monthly spend"
          placeholder="$200k"
          value={profile.monthlyBurnUsd}
          onCommit={(value) => setProfileField("monthlyBurnUsd", value)}
        />
        <OperatorProfileNumberField
          field="monthlyRevenueUsd"
          label="Monthly revenue"
          placeholder="$50k, or 0"
          value={profile.monthlyRevenueUsd}
          onCommit={(value) => setProfileField("monthlyRevenueUsd", value)}
          optional
        />
        <div>
          <label htmlFor={costId} className="block text-fluid-nano text-slate-400">
            This decision adds, per month
          </label>
          <input
            id={costId}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder="$20k"
            value={costDraft}
            onChange={(event) => setCostDraft(event.target.value)}
            className="weather-input mt-1 w-full px-3.5 py-2.5"
          />
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className="text-fluid-nano text-slate-500">Quick:</span>
            {[
              { label: "+$15k", value: "$15k" },
              { label: "+$30k", value: "$30k" },
              { label: "+$50k", value: "$50k" },
              { label: "+$100k", value: "$100k" },
            ].map((preset) => (
              <button
                key={preset.value}
                type="button"
                onClick={() => setCostDraft(preset.value)}
                className="weather-hit rounded-md border border-[color:var(--border-default)] bg-[color:var(--bg-raised)] px-2 py-0.5 text-[11px] font-medium text-slate-300 transition-colors hover:border-[color:var(--border-strong)] hover:text-slate-50"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      {/* The profile is browser-only, so this never renders on the server and
          today's date cannot disagree with a server-rendered one. */}
      {runway ? (
        <p data-testid="commitment-runway" className="text-fluid-xs text-slate-300">
          {describeProfileRunway(runway, new Date())}
        </p>
      ) : null}
      {impact ? (
        <div aria-live="polite" className="space-y-2 text-fluid-xs">
          {typeof impact.runwayBefore === "number" && typeof impact.runwayAfter === "number" ? (
            <div className="space-y-1.5 rounded-lg border border-[color:var(--border-subtle)] bg-[color:var(--bg-nested)] p-2.5">
              <div className="flex items-center justify-between text-fluid-nano text-slate-300">
                <span className="font-medium text-slate-400">Runway projection</span>
                <span className="tabular-nums font-semibold">
                  <span className="text-slate-400">{impact.runwayBefore} mo</span>
                  <span className="mx-1 text-slate-500">→</span>
                  <span className={impact.bandChange ? "font-bold text-amber-300" : "text-slate-100"}>
                    {impact.runwayAfter} mo
                  </span>
                  <span className="ml-1.5 font-normal text-slate-400">
                    ({impact.runwayAfter - impact.runwayBefore >= 0 ? "+" : ""}
                    {(impact.runwayAfter - impact.runwayBefore).toFixed(1)} mo)
                  </span>
                </span>
              </div>
              <div className="relative h-2 w-full overflow-hidden rounded-full bg-[color:var(--bg-raised)]">
                {/* Canonical band boundaries (6 / 12 / 24 mo), drawn as light rules. */}
                {RUNWAY_BAND_CEILINGS.map((months) => (
                  <div
                    key={months}
                    className="absolute bottom-0 top-0 z-10 w-0.5 bg-slate-500/40"
                    style={{ left: `${(months / 36) * 100}%` }}
                    title={`${months}-month runway band boundary`}
                  />
                ))}
                {/* Previous runway bar */}
                <div
                  className="absolute bottom-0 top-0 rounded-full bg-slate-600/40 transition-[width] duration-300 motion-reduce:transition-none"
                  style={{ width: `${Math.min(100, Math.max(0, (impact.runwayBefore / 36) * 100))}%` }}
                />
                {/* New runway bar, colored by the canonical band the runway lands in: critical, tight, or balanced-and-up. */}
                <div
                  className={`absolute bottom-0 top-0 rounded-full transition-[width] duration-300 motion-reduce:transition-none ${
                    impact.runwayAfter < 6
                      ? "bg-rose-500"
                      : impact.runwayAfter < 12
                        ? "bg-amber-400"
                        : "bg-emerald-400"
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, (impact.runwayAfter / 36) * 100))}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] tabular-nums text-slate-500">
                <span>0 mo</span>
                <span className="text-rose-400/80">6 mo</span>
                <span className="text-amber-400/80">12 mo</span>
                <span className="text-emerald-400/80">24 mo</span>
                <span>36+ mo</span>
              </div>
            </div>
          ) : null}
          <p className={impact.bandChange ? "text-amber-200" : "text-slate-200"}>{impact.summary}</p>
          {impact.noteAfter ? <p className="text-slate-300">{impact.noteAfter}</p> : null}
        </div>
      ) : (
        <p className="text-fluid-nano text-slate-500">
          Leave revenue blank if there is none yet. Your figures stay in this browser.
        </p>
      )}
    </div>
  );
}

/**
 * The same test for a returning reader, under the full brief's area table.
 *
 * It lived only in the first-visit picker, so a founder who came back with the
 * next hire to weigh had nowhere on the brief to weigh it: the picker is gone
 * once the brief has been read, and the stress test is a page away on /operate.
 * Folded by default, because the table is what this section is for; the area
 * picks which runway note follows the result. The section folds on a first
 * visit, so this and the picker's copy are never on screen together.
 */
export function CommitmentTestDisclosure({ regime }: { regime: RegimeKey }) {
  const areaId = useId();
  const [area, setArea] = useState<DecisionArea>("hiring");
  return (
    <details data-testid="commitment-test-disclosure" className="weather-auto-chevron">
      <summary className="text-fluid-xs font-semibold text-slate-200">Test a decision against your runway</summary>
      <div className="mt-2 space-y-2">
        <div className="sm:max-w-xs">
          <label htmlFor={areaId} className="block text-fluid-nano text-slate-400">
            What it is
          </label>
          <select
            id={areaId}
            value={area}
            onChange={(event) => {
              if (isDecisionArea(event.target.value)) setArea(event.target.value);
            }}
            className="weather-control mt-1"
          >
            {decisionAreaOrder.map((option) => (
              <option key={option} value={option}>
                {decisionAreaLabel(option)}
              </option>
            ))}
          </select>
        </div>
        <CommitmentTest regime={regime} area={area} showTitle={false} />
      </div>
    </details>
  );
}
