"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  formatOperatorProfileValue,
  OPERATOR_PROFILE_LIMITS,
  parsePlainNumberInput,
  profileFieldTextOnBlur,
  type OperatorProfileNumberKey,
} from "../../lib/operatorProfile";
import { parseMoneyInput } from "../../lib/planCommitment";

type NumberFieldProps = {
  label: string;
  /** Shown under the label; says the unit and what a blank means. */
  hint?: string;
  placeholder: string;
  value: number | undefined;
  onCommit: (value: number | undefined) => void;
  optional?: boolean;
  className?: string;
  labelClassName?: string;
};

type ProfileNumberFieldProps = NumberFieldProps & { field: OperatorProfileNumberKey };

/** Money where zero is a real answer (revenue, a saving), which `parseMoneyInput` rejects for a burn box. */
export const parseMoneyOrZeroInput = (raw: string): number | null => {
  const text = raw.trim();
  return /^\$?\s*0+(?:\.0+)?$/.test(text) ? 0 : parseMoneyInput(text);
};

const PARSERS: Record<OperatorProfileNumberKey, (raw: string) => number | null> = {
  cashUsd: parseMoneyInput,
  runwayMonths: parsePlainNumberInput,
  monthlyBurnUsd: parseMoneyInput,
  monthlyRevenueUsd: parseMoneyOrZeroInput,
  monthlyGrowthPct: parsePlainNumberInput,
  grossMarginPct: parsePlainNumberInput,
  raiseAtRunwayMonths: parsePlainNumberInput,
  hiringPauseAtRunwayMonths: parsePlainNumberInput,
  engineerWeekCostUsd: parseMoneyInput,
};

const UNIT_HINTS: Record<OperatorProfileNumberKey, string> = {
  cashUsd: "Enter dollars, like $1.2M or 1200000.",
  runwayMonths: "Enter months, like 14.",
  monthlyBurnUsd: "Enter dollars, like $150k or 150000.",
  monthlyRevenueUsd: "Enter dollars, like $80k, or 0 before revenue.",
  monthlyGrowthPct: "Enter a percentage, like 6.",
  grossMarginPct: "Enter a percentage, like 75.",
  raiseAtRunwayMonths: "Enter months of runway, like 12.",
  hiringPauseAtRunwayMonths: "Enter months of runway, like 9.",
  engineerWeekCostUsd: "Enter dollars, like $4,500.",
};

const withinLimits = (field: OperatorProfileNumberKey, value: number) =>
  value >= OPERATOR_PROFILE_LIMITS[field].min && value <= OPERATOR_PROFILE_LIMITS[field].max;

/**
 * One number the operator has told us, bound to the shared profile.
 *
 * The field keeps its own text while the operator types, commits the parsed
 * number on every keystroke that parses, and reports an error only on blur —
 * half-typed input is not wrong yet. A cleared field commits `undefined`,
 * which is the whole point: blank means "not given", and the engines say so
 * rather than dividing by zero.
 */
export function OperatorProfileNumberField({ field, ...props }: ProfileNumberFieldProps) {
  return (
    <NumberDraftField
      {...props}
      parse={PARSERS[field]}
      allows={(value) => withinLimits(field, value)}
      format={(value) => formatOperatorProfileValue(field, value)}
      settle={(draft, value) => profileFieldTextOnBlur(field, draft, value)}
      unitHint={UNIT_HINTS[field]}
    />
  );
}

/**
 * The draft-and-commit behaviour behind every number box the operator types
 * into, whatever stores the number: the profile, or a row of the runway
 * planner's project list (`app/operate/components/projectPaybackSection.tsx`).
 */
export function NumberDraftField({
  label,
  hint,
  placeholder,
  value,
  onCommit,
  optional = false,
  className = "",
  labelClassName = "block text-fluid-nano text-slate-400",
  parse,
  allows,
  format,
  settle,
  unitHint,
}: NumberFieldProps & {
  parse: (raw: string) => number | null;
  allows: (value: number) => boolean;
  format: (value: number | undefined) => string;
  /** The text to show on blur when there is nothing new to check, or null to validate the draft. */
  settle: (draft: string, value: number | undefined) => string | null;
  /** The error a draft that will not parse gets. */
  unitHint: string;
}) {
  const id = useId();
  const [draft, setDraft] = useState(() => format(value));
  const [error, setError] = useState<string | null>(null);
  const lastCommitted = useRef<number | undefined>(value);

  // The stored value can change under the field: localStorage hydrating after
  // the first paint, or another panel on the page committing the same figure.
  // Only then does the text reset, so typing is never overwritten mid-keystroke.
  useEffect(() => {
    if (Object.is(value, lastCommitted.current)) return;
    lastCommitted.current = value;
    setDraft(format(value));
    setError(null);
  }, [format, value]);

  const commit = (next: number | undefined) => {
    lastCommitted.current = next;
    onCommit(next);
  };

  const handleChange = (raw: string) => {
    setDraft(raw);
    if (error) setError(null);
    if (raw.trim() === "") {
      commit(undefined);
      return;
    }
    const parsed = parse(raw);
    if (parsed !== null && allows(parsed)) commit(parsed);
  };

  const handleBlur = () => {
    // Emptied over a value the profile still works out, or showing one: nothing typed to check.
    const settled = settle(draft, value);
    if (settled !== null) {
      lastCommitted.current = value;
      setDraft(settled);
      return;
    }
    const parsed = parse(draft);
    if (parsed === null || !allows(parsed)) {
      setError(unitHint);
      return;
    }
    setDraft(format(parsed));
  };

  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null]
    .filter((part): part is string => part !== null)
    .join(" ");

  return (
    <div className={className}>
      <label htmlFor={id} className={labelClassName}>
        {label}
        {optional ? <span className="text-slate-500"> (optional)</span> : null}
      </label>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={draft}
        placeholder={placeholder}
        onChange={(event) => handleChange(event.target.value)}
        onBlur={handleBlur}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className="weather-input mt-1 w-full px-3.5 py-2.5"
      />
      {hint ? (
        <p id={`${id}-hint`} className="mt-1 text-fluid-nano text-slate-500">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1 text-fluid-xs text-amber-300">
          {error}
        </p>
      ) : null}
    </div>
  );
}
