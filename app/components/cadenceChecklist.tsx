"use client";

import { useEffect, useMemo, useState } from "react";

type CadenceChecklistProps = {
  cadence: "weekly" | "monthly";
  title: string;
  subtitle: string;
  storageKey: string;
  items: Array<{ id: string; label: string; href: string }>;
};

type ChecklistState = Record<string, boolean>;

const getCadenceScopeId = (cadence: "weekly" | "monthly") => {
  const now = new Date();
  if (cadence === "monthly") {
    return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  }

  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
};

export const CadenceChecklist = ({
  cadence,
  title,
  subtitle,
  storageKey,
  items,
}: CadenceChecklistProps) => {
  const cadenceScope = useMemo(() => getCadenceScopeId(cadence), [cadence]);
  const [state, setState] = useState<ChecklistState>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (!stored) {
        setHydrated(true);
        return;
      }
      const parsed = JSON.parse(stored) as { cadenceScope?: string; checks?: ChecklistState };
      if (parsed.cadenceScope === cadenceScope && parsed.checks) {
        setState(parsed.checks);
      } else {
        window.localStorage.removeItem(storageKey);
      }
    } catch {
      window.localStorage.removeItem(storageKey);
    } finally {
      setHydrated(true);
    }
  }, [cadenceScope, storageKey]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({
        cadenceScope,
        checks: state,
      }),
    );
  }, [cadenceScope, hydrated, state, storageKey]);

  const completedCount = items.filter((item) => state[item.id]).length;
  const isComplete = completedCount === items.length;

  return (
    <section className="weather-panel space-y-4 px-6 py-5" aria-label={`${cadence} review checklist`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1">
          <p className="text-xs font-semibold tracking-[0.2em] text-slate-400">{title}</p>
          <h2 className="text-lg font-semibold text-slate-100 sm:text-xl">{subtitle}</h2>
        </div>
        <p className="text-xs font-semibold text-slate-300">
          {completedCount}/{items.length} complete
        </p>
      </div>

      <ol className="grid gap-3 md:grid-cols-3">
        {items.map((item, index) => {
          const done = Boolean(state[item.id]);
          return (
            <li key={item.id} className="weather-surface flex h-full flex-col gap-3 p-4">
              <div className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold ${
                    done ? "bg-emerald-500/20 text-emerald-200" : "bg-slate-800 text-slate-300"
                  }`}
                >
                  {done ? "✓" : index + 1}
                </span>
                <p className="text-sm font-semibold text-slate-100">{item.label}</p>
              </div>

              <div className="mt-auto flex flex-wrap gap-3">
                <a
                  href={item.href}
                  className="inline-flex min-h-[44px] items-center text-xs font-semibold tracking-[0.14em] text-sky-200 underline decoration-slate-500 underline-offset-4 transition-colors hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation"
                >
                  Open step →
                </a>
                <button
                  type="button"
                  className={`inline-flex min-h-[44px] items-center rounded-full border px-3 py-2 text-xs font-semibold tracking-[0.14em] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation ${
                    done
                      ? "border-emerald-400/60 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/20"
                      : "border-slate-700/80 text-slate-200 hover:border-sky-300/70 hover:text-slate-100"
                  }`}
                  onClick={() => {
                    setState((current) => ({
                      ...current,
                      [item.id]: !current[item.id],
                    }));
                  }}
                  aria-pressed={done}
                >
                  {done ? "Completed" : "Mark complete"}
                </button>
              </div>
            </li>
          );
        })}
      </ol>

      {isComplete ? (
        <p className="text-sm text-emerald-200">
          Great — this {cadence} review is complete. Share the brief and carry decisions forward.
        </p>
      ) : (
        <p className="text-sm text-slate-300">
          Complete each step to keep planning cadence consistent and reduce missed handoffs.
        </p>
      )}
    </section>
  );
};
