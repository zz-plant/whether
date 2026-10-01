"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { requestSubscription } from "../../components/subscribeRequest";
import { trackActivationEvent } from "../../../lib/activationFunnel";
import { decisionAreaLabel, type DecisionArea } from "../../../lib/report/boundedDecisionRules";
import { DECISION_CONTRACT_LABELS } from "../../../lib/report/reportCopy";
import type { PlanLineCondition, PlanLines } from "../../../lib/alert/planLines";

/**
 * "Set this plan's lines": the step where a plan's pause and resume lines are
 * agreed once, and an email goes out the day one is crossed.
 *
 * The guidance moves a few times a year, so this is the use that fits it: lines
 * set when the plan is made, not a verdict read every Monday. The form starts
 * from the published rules (`planLinesFromRules`), so a reader moves a number
 * rather than writing a rule, and the metric, the direction and the join stay
 * the published ones — a pause on any of its lines, a resume on all of them.
 *
 * Nothing is kept in the browser. The lines travel with the email address to the
 * subscription, where they wait for the confirmation link (`pendingPlanLines`):
 * a request can name any inbox, so lines count only once that inbox says yes.
 */

const METRIC_LABEL: Record<PlanLineCondition["metric"], string> = {
  tightness: "Funding pressure",
  riskAppetite: "Risk appetite",
};

const clampLine = (raw: string): number | null => {
  const value = Number(raw);
  if (raw.trim() === "" || !Number.isFinite(value)) return null;
  return Math.min(100, Math.max(0, Math.round(value)));
};

function ConditionInputs({
  area,
  side,
  conditions,
  onChange,
}: {
  area: DecisionArea;
  side: "pause" | "resume";
  conditions: readonly PlanLineCondition[];
  onChange: (index: number, value: number) => void;
}) {
  const join = side === "pause" ? "or" : "and";
  return (
    <>
      {conditions.map((condition, index) => (
        <span key={`${condition.metric}${condition.operator}`} className="inline-flex flex-wrap items-center gap-1.5">
          {index > 0 ? <span className="text-slate-400">{join}</span> : null}
          <span>
            {METRIC_LABEL[condition.metric]} {condition.operator}
          </span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={100}
            step={1}
            defaultValue={condition.value}
            aria-label={`${decisionAreaLabel(area)}, ${side === "pause" ? "pause" : "resume"}: ${METRIC_LABEL[condition.metric]} ${condition.operator === ">" ? "above" : "below"}`}
            onChange={(event) => {
              const value = clampLine(event.target.value);
              if (value !== null) onChange(index, value);
            }}
            className="weather-input min-h-11 w-[4.5rem] px-2 py-1 text-base tabular-nums text-slate-100 sm:text-xs"
          />
        </span>
      ))}
    </>
  );
}

export function PlanLinesForm({ defaults }: { defaults: readonly PlanLines[] }) {
  const [lines, setLines] = useState<PlanLines[]>(() =>
    defaults.map((line) => ({ ...line, pause: [...line.pause], resume: [...line.resume] })),
  );
  const [watched, setWatched] = useState<ReadonlySet<DecisionArea>>(() => new Set(defaults.map((line) => line.area)));
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const updateCondition = (area: DecisionArea, side: "pause" | "resume", index: number, value: number) => {
    setLines((current) =>
      current.map((line) =>
        line.area === area
          ? { ...line, [side]: line[side].map((condition, at) => (at === index ? { ...condition, value } : condition)) }
          : line,
      ),
    );
  };

  const toggleArea = (area: DecisionArea) => {
    setWatched((current) => {
      const next = new Set(current);
      if (next.has(area)) next.delete(area);
      else next.add(area);
      return next;
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const planLines = lines.filter((line) => watched.has(line.area));
    setStatus("loading");
    const result = await requestSubscription(email, { alerts: true, planLines });
    setStatus(result.ok ? "success" : "error");
    setMessage(result.ok ? "Check your email to confirm. Your lines count from the moment you do." : result.message);
    if (result.ok) trackActivationEvent({ step: "committed", path: "/operate", commitment: "subscribed" });
  };

  if (defaults.length === 0) return null;

  return (
    <form onSubmit={handleSubmit} aria-labelledby="plan-lines-heading" data-testid="plan-lines-form" className="space-y-4">
      <p id="plan-lines-heading" className="max-w-[68ch] text-sm text-slate-300">
        These start at the published lines. Move the numbers your plan needs, for example releasing the second
        half of a hiring plan only once funding pressure falls below 60, and untick any area you are not
        planning. You get one email the day a line you set is crossed.
      </p>

      <ul className="space-y-3">
        {lines.map((line) => {
          const on = watched.has(line.area);
          return (
            <li key={line.area} className="space-y-2 border-t border-slate-800/70 pt-3">
              <label className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-slate-100">
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => toggleArea(line.area)}
                  className="size-4 accent-sky-500"
                />
                {decisionAreaLabel(line.area)}
              </label>
              <fieldset disabled={!on} className="space-y-2 text-xs text-slate-300 disabled:opacity-50">
                <legend className="sr-only">{decisionAreaLabel(line.area)} lines</legend>
                <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="text-slate-400">{DECISION_CONTRACT_LABELS.threshold.pauseIf}</span>
                  <ConditionInputs
                    area={line.area}
                    side="pause"
                    conditions={line.pause}
                    onChange={(index, value) => updateCondition(line.area, "pause", index, value)}
                  />
                </p>
                <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="text-slate-400">{DECISION_CONTRACT_LABELS.reversal.resumeWhen}</span>
                  <ConditionInputs
                    area={line.area}
                    side="resume"
                    conditions={line.resume}
                    onChange={(index, value) => updateCondition(line.area, "resume", index, value)}
                  />
                </p>
              </fieldset>
            </li>
          );
        })}
      </ul>

      {status === "success" ? (
        <output className="flex items-start gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2.5 text-xs text-emerald-200">
          <Check className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{message}</span>
        </output>
      ) : (
        <div className="space-y-2">
          <div className="flex flex-col gap-2 sm:flex-row">
            <label htmlFor="plan-lines-email" className="sr-only">Email address</label>
            <input
              id="plan-lines-email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              spellCheck={false}
              required
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                if (status === "error") setStatus("idle");
              }}
              placeholder="you@company.com"
              disabled={status === "loading"}
              aria-invalid={status === "error" ? true : undefined}
              aria-describedby={message ? "plan-lines-message" : undefined}
              className="weather-input min-h-11 flex-1 px-3 py-2 text-base text-slate-100 placeholder:text-slate-500 sm:text-xs"
            />
            <button
              type="submit"
              disabled={status === "loading" || watched.size === 0}
              className="weather-button weather-focus-ring weather-press-scale inline-flex min-h-11 items-center justify-center px-4 py-2 text-xs font-semibold disabled:opacity-50"
            >
              {status === "loading" ? "Sending…" : "Email me when a line is crossed"}
            </button>
          </div>
          {status === "error" ? (
            <p id="plan-lines-message" role="alert" className="text-xs text-rose-300">{message}</p>
          ) : null}
          <p className="max-w-[68ch] text-xs text-slate-400">
            Stored with your email address and nothing else: the numbers above, for the areas you tick. Sending the
            form again replaces them once you confirm. See{" "}
            <Link href="/privacy" className="weather-hit underline decoration-slate-600 underline-offset-4 hover:text-white">
              what is stored
            </Link>
            .
          </p>
        </div>
      )}
    </form>
  );
}
