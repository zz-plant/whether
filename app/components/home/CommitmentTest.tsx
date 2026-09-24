"use client";

import { useId, useMemo, useState } from "react";
import type { RegimeKey } from "../../../lib/regimeEngine";
import type { DecisionArea } from "../../../lib/report/boundedDecisionRules";
import { buildCommitmentImpact } from "../../../lib/report/runwayConditionedNotes";
import { parseMoneyInput } from "../../../lib/planCommitment";
import { OperatorProfileNumberField } from "../operatorProfileFields";
import { useOperatorProfile } from "../useOperatorProfile";

/**
 * "Test it against your runway": the step from this week's guidance to the
 * reader's own company.
 *
 * The guidance is about the market, and a reader who came with a decision
 * leaves when nothing on the page is about theirs. Two figures they know —
 * runway and monthly burn — and the monthly cost of the decision are enough to
 * say what it does to their cash and which of the runway notes this week's
 * guidance already carries applies after it (`buildCommitmentImpact`).
 *
 * Runway and burn are the shared operator profile: the same browser-only
 * figures `/operate` and the runway notes read, so entering them once reaches
 * every surface and nothing leaves the browser. The decision's cost is not
 * stored; it belongs to one question.
 */
export function CommitmentTest({ regime, area }: { regime: RegimeKey; area: DecisionArea }) {
  const { profile, setProfileField } = useOperatorProfile();
  const costId = useId();
  const [costDraft, setCostDraft] = useState("");
  const cost = parseMoneyInput(costDraft) ?? undefined;

  const impact = useMemo(
    () =>
      buildCommitmentImpact({
        regime,
        area,
        runwayMonths: profile.runwayMonths,
        monthlyBurnUsd: profile.monthlyBurnUsd,
        newMonthlyCostUsd: cost,
      }),
    [regime, area, profile.runwayMonths, profile.monthlyBurnUsd, cost],
  );

  return (
    <div data-testid="commitment-test" className="space-y-2 rounded-lg border border-[color:var(--border-subtle)] bg-[color:var(--bg-nested)] px-3 py-3">
      <p className="text-fluid-xs font-medium text-slate-200">Test it against your runway</p>
      <div className="grid gap-2 sm:grid-cols-3">
        <OperatorProfileNumberField
          field="runwayMonths"
          label="Runway (months)"
          placeholder="14"
          value={profile.runwayMonths}
          onCommit={(value) => setProfileField("runwayMonths", value)}
        />
        <OperatorProfileNumberField
          field="monthlyBurnUsd"
          label="Monthly burn"
          placeholder="$150k"
          value={profile.monthlyBurnUsd}
          onCommit={(value) => setProfileField("monthlyBurnUsd", value)}
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
        </div>
      </div>
      {impact ? (
        <div aria-live="polite" className="space-y-1 text-fluid-xs">
          <p className={impact.bandChange ? "text-amber-200" : "text-slate-200"}>{impact.summary}</p>
          {impact.noteAfter ? <p className="text-slate-300">{impact.noteAfter}</p> : null}
        </div>
      ) : (
        <p className="text-fluid-nano text-slate-500">
          Enter all three to see where your runway lands. Your figures stay in this browser.
        </p>
      )}
    </div>
  );
}
