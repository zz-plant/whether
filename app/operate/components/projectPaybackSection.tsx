"use client";

import { useId, useState } from "react";
import { NumberDraftField, OperatorProfileNumberField, parseMoneyOrZeroInput } from "../../components/operatorProfileFields";
import {
  isWithinPaybackProjectLimits,
  MAX_PAYBACK_PROJECTS,
  PAYBACK_PROJECT_NAME_MAX_LENGTH,
  parsePlainNumberInput,
  type PaybackProjectEntry,
  type PaybackProjectNumberKey,
} from "../../../lib/operatorProfile";
import { parseMoneyInput } from "../../../lib/planCommitment";
import { SPENDING_PAYBACK_BAR_MONTHS } from "../../../lib/report/boundedDecisionRules";
import { describePaybackBar, paybackChartMonths, type PaybackBar, type ProjectPayback } from "../../../lib/report/projectPayback";
import type { RegimeKey } from "../../../lib/regimeEngine";
import { ProjectPaybackChart } from "./projectPaybackChart";

const grouped = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

type ProjectField = {
  key: PaybackProjectNumberKey;
  label: string;
  placeholder: string;
  hint?: string;
  optional?: boolean;
  parse: (raw: string) => number | null;
  unitHint: string;
};

const PROJECT_FIELDS: readonly ProjectField[] = [
  { key: "weeksToShip", label: "Weeks to ship", placeholder: "e.g. 6", parse: parsePlainNumberInput, unitHint: "Enter weeks, like 6." },
  { key: "engineers", label: "Engineers on it", placeholder: "e.g. 2", parse: parsePlainNumberInput, unitHint: "Enter a headcount, like 2 or 0.5." },
  {
    key: "hoursSavedPerMonth",
    label: "Hours it saves a month",
    hint: "Support, onboarding or on-call hours. Count the ones that would otherwise mean a hire or a contractor bill.",
    placeholder: "e.g. 120",
    parse: parsePlainNumberInput,
    unitHint: "Enter hours, like 120.",
  },
  { key: "hourlyCostUsd", label: "What one of those hours costs ($)", placeholder: "e.g. $65", parse: parseMoneyInput, unitHint: "Enter dollars, like $65." },
  {
    key: "otherMonthlySavingsUsd",
    label: "Bills it cuts a month ($)",
    hint: "Compute, vendor or contractor spend it removes.",
    placeholder: "e.g. $2k, or 0",
    optional: true,
    parse: parseMoneyOrZeroInput,
    unitHint: "Enter dollars, like $2k, or 0.",
  },
];

const MONEY_FIELDS: ReadonlySet<PaybackProjectNumberKey> = new Set(["hourlyCostUsd", "otherMonthlySavingsUsd"]);

const formatProjectValue = (key: PaybackProjectNumberKey, value: number | undefined) =>
  value === undefined ? "" : MONEY_FIELDS.has(key) ? grouped.format(value) : String(value);

const withProjectField = <K extends keyof PaybackProjectEntry>(
  entry: PaybackProjectEntry,
  key: K,
  value: PaybackProjectEntry[K] | undefined,
): PaybackProjectEntry => {
  const next: PaybackProjectEntry = { ...entry };
  if (value === undefined) delete next[key];
  else next[key] = value;
  return next;
};

/**
 * The name commits on blur, not per keystroke: the stored name is trimmed, so
 * committing "Self " would hand back "Self" and eat the space being typed.
 */
function ProjectNameField({ value, onCommit }: { value: string | undefined; onCommit: (value: string | undefined) => void }) {
  const id = useId();
  const [draft, setDraft] = useState(value ?? "");
  // A stored name that changes under the field (a link followed, a row removed above) replaces the draft.
  const [shown, setShown] = useState(value);
  if (shown !== value) {
    setShown(value);
    setDraft(value ?? "");
  }
  const commit = () => {
    const name = draft.trim().slice(0, PAYBACK_PROJECT_NAME_MAX_LENGTH);
    if ((name || undefined) !== value) onCommit(name || undefined);
  };
  return (
    <div className="sm:col-span-3">
      <label htmlFor={id} className="block text-fluid-nano text-slate-400">
        What it is
      </label>
      <input
        id={id}
        type="text"
        autoComplete="off"
        maxLength={PAYBACK_PROJECT_NAME_MAX_LENGTH}
        value={draft}
        placeholder="e.g. Self-serve data importer"
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") commit();
        }}
        className="weather-input mt-1 w-full px-3.5 py-2.5"
      />
    </div>
  );
}

const BUTTON_CLASS =
  "weather-button inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold transition-colors hover:border-sky-400/70 hover:text-slate-100";

function ProjectRow({
  index,
  entry,
  onChange,
  onRemove,
}: {
  index: number;
  entry: PaybackProjectEntry;
  onChange: (next: PaybackProjectEntry) => void;
  /** Absent for the blank row shown before anything is entered: there is nothing to remove. */
  onRemove?: () => void;
}) {
  return (
    <fieldset className="space-y-3 border-t border-[var(--border-default)] pt-3">
      <legend className="sr-only">Project {index + 1}</legend>
      <div className="flex min-h-[44px] items-center justify-between gap-3">
        <p aria-hidden="true" className="text-xs font-semibold text-slate-300">
          Project {index + 1}
        </p>
        {onRemove ? (
          <button type="button" onClick={onRemove} aria-label={`Remove project ${index + 1}`} className={BUTTON_CLASS}>
            Remove
          </button>
        ) : null}
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <ProjectNameField value={entry.name} onCommit={(name) => onChange(withProjectField(entry, "name", name))} />
        {PROJECT_FIELDS.map((field) => (
          <NumberDraftField
            key={field.key}
            label={field.label}
            hint={field.hint}
            placeholder={field.placeholder}
            optional={field.optional}
            value={entry[field.key]}
            onCommit={(value) => onChange(withProjectField(entry, field.key, value))}
            parse={field.parse}
            allows={(value) => isWithinPaybackProjectLimits(field.key, value)}
            format={(value) => formatProjectValue(field.key, value)}
            settle={(draft, value) => {
              const shown = formatProjectValue(field.key, value);
              return draft.trim() === "" || draft === shown ? shown : null;
            }}
            unitHint={field.unitHint}
          />
        ))}
      </div>
    </fieldset>
  );
}

/**
 * Engineering work against the payback bar, inside the runway planner.
 *
 * The rows are the reader's; the bar is the published rules' (`resolvePaybackBar`),
 * so the section says which rule sets it before asking for anything. Projects
 * live in the operator profile and the plan link, like every figure above them,
 * and their sentences go into the copy block and the budget memo.
 */
export function ProjectPaybackSection({
  regime,
  bar,
  runwayMonths,
  engineerWeekCostUsd,
  entries,
  paybacks,
  onEngineerWeekCostChange,
  onEntriesChange,
}: {
  regime: RegimeKey;
  bar: PaybackBar;
  runwayMonths: number;
  engineerWeekCostUsd: number | undefined;
  entries: readonly PaybackProjectEntry[];
  paybacks: readonly ProjectPayback[];
  onEngineerWeekCostChange: (value: number | undefined) => void;
  onEntriesChange: (next: readonly PaybackProjectEntry[] | undefined) => void;
}) {
  const rows = entries.length > 0 ? entries : [{}];
  const commitRows = (next: readonly PaybackProjectEntry[]) => onEntriesChange(next.length > 0 ? next : undefined);
  const months = paybackChartMonths(paybacks, bar, runwayMonths);

  return (
    <section id="ops-project-payback" aria-labelledby="ops-project-payback-heading" className="weather-surface space-y-3 p-4">
      <div>
        <p id="ops-project-payback-heading" className="text-xs font-semibold text-slate-400">
          Engineering work against the payback bar
        </p>
        <p className="mt-1 text-sm text-slate-100">{describePaybackBar(bar, regime)}</p>
        <p className="mt-1 text-fluid-xs text-slate-400">
          Price each piece of work by what it saves: hours someone no longer spends, and bills it cuts.
        </p>
      </div>

      <OperatorProfileNumberField
        field="engineerWeekCostUsd"
        label="What an engineer-week costs ($)"
        hint="Salary, benefits and overhead for one engineer for one week."
        placeholder="e.g. $4,500"
        value={engineerWeekCostUsd}
        onCommit={onEngineerWeekCostChange}
        className="max-w-xs"
      />

      {rows.map((entry, index) => (
        <ProjectRow
          key={index}
          index={index}
          entry={entry}
          onChange={(next) => commitRows(rows.map((row, rowIndex) => (rowIndex === index ? next : row)))}
          onRemove={entries.length > 0 ? () => commitRows(rows.filter((_, rowIndex) => rowIndex !== index)) : undefined}
        />
      ))}
      {rows.length < MAX_PAYBACK_PROJECTS ? (
        <button
          type="button"
          onClick={() => commitRows([...rows, {}])}
          className={BUTTON_CLASS}
        >
          Add a project
        </button>
      ) : null}

      <ProjectPaybackChart projects={paybacks} bar={bar} runwayMonths={runwayMonths} months={months} />

      <ul data-testid="planner-project-payback" aria-live="polite" className="space-y-2 text-sm text-slate-100">
        {paybacks.map((payback, index) => (
          <li key={index}>
            {payback.status === "sized" ? (
              payback.sentence
            ) : (
              <span className="text-slate-400">
                {payback.name}: add {payback.missing.join(", ")} to size it.
              </span>
            )}
          </li>
        ))}
      </ul>
      <p className="text-fluid-xs text-slate-400">
        The payback counts engineer time at what a week costs; the runway does not, because the engineers are paid either
        way. The saving starts in full the week the work ships, and the runway it adds holds revenue flat. A contractor
        paid for the work is new spend, which answers to the Spending rule&apos;s {SPENDING_PAYBACK_BAR_MONTHS}-month bar
        instead.
      </p>
    </section>
  );
}
