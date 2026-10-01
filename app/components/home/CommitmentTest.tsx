"use client";

import { useId, useMemo, useState } from "react";
import type { RegimeKey } from "../../../lib/regimeEngine";
import { decisionAreaLabel, decisionAreaOrder, isDecisionArea, type DecisionArea } from "../../../lib/report/boundedDecisionRules";
import { buildCommitmentImpact, describeProfileRunway } from "../../../lib/report/runwayConditionedNotes";
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
    <div data-testid="commitment-test" className="space-y-2 rounded-lg border border-[color:var(--border-subtle)] bg-[color:var(--bg-nested)] px-3 py-3">
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
        <div aria-live="polite" className="space-y-1 text-fluid-xs">
          <p className={impact.bandChange ? "text-amber-200" : "text-slate-200"}>{impact.summary}</p>
          {impact.noteAfter ? <p className="text-slate-300">{impact.noteAfter}</p> : null}
        </div>
      ) : (
        <p className="text-fluid-nano text-slate-500">
          Enter your cash, spend and the decision&apos;s monthly cost to see where your runway lands. Leave
          revenue blank if there is none yet. Your figures stay in this browser.
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
