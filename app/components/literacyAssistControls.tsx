"use client";

import { startTransition, useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  literacyAssistOptions,
  literacyAssistStorageKeys,
  literacyFocusLabels,
  type LiteracyAssistMode,
} from "../../lib/literacyAssist";
import { trackOperatorWorkflowEvent } from "../../lib/operatorWorkflowTelemetry";

const sectionToneClass = {
  decision: "border-emerald-400/25 bg-emerald-500/8 text-emerald-100",
  evidence: "border-sky-400/25 bg-sky-500/8 text-sky-100",
  trust: "border-amber-400/25 bg-amber-500/8 text-amber-100",
  share: "border-violet-400/25 bg-violet-500/8 text-violet-100",
} satisfies Record<LiteracyAssistMode, string>;

const readBoolPreference = (key: string) => {
  try {
    return window.localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
};

const writeBoolPreference = (key: string, value: boolean) => {
  try {
    window.localStorage.setItem(key, value ? "1" : "0");
  } catch {
    // Ignore storage errors.
  }
};

type LiteracyAssistRouterProps = {
  title: string;
  description: string;
  targets: Record<LiteracyAssistMode, { href: string }>;
};

export function LiteracyAssistRouter({
  title,
  description,
  targets,
}: LiteracyAssistRouterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeMode, setActiveMode] = useState<LiteracyAssistMode>("decision");

  useEffect(() => {
    const assist = searchParams.get("assist");
    if (assist && literacyAssistOptions.some((option) => option.id === assist)) {
      setActiveMode(assist as LiteracyAssistMode);
      try {
        window.localStorage.setItem(literacyAssistStorageKeys.focus, assist);
      } catch {
        // Ignore storage errors.
      }
      return;
    }

    try {
      const storedFocus = window.localStorage.getItem(literacyAssistStorageKeys.focus);
      if (storedFocus && literacyAssistOptions.some((option) => option.id === storedFocus)) {
        setActiveMode(storedFocus as LiteracyAssistMode);
      }
    } catch {
      // Ignore storage errors.
    }
  }, [searchParams]);

  const setMode = (mode: LiteracyAssistMode) => {
    setActiveMode(mode);
    try {
      window.localStorage.setItem(literacyAssistStorageKeys.focus, mode);
      window.localStorage.setItem(literacyAssistStorageKeys[mode], "1");
    } catch {
      // Ignore storage errors.
    }
    startTransition(() => {
      router.push(targets[mode].href);
    });
  };

  return (
    <section className="weather-panel space-y-3 px-4 py-4 sm:px-5" aria-label="Need help with this page">
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Need help?</p>
        <h2 className="text-base font-semibold text-slate-100">{title}</h2>
        <p className="text-sm text-slate-300">{description}</p>
      </div>
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        {literacyAssistOptions.map((option) => {
          const isActive = option.id === activeMode;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => setMode(option.id)}
              aria-pressed={isActive}
              className={`rounded-xl border px-3 py-3 text-left transition-colors touch-manipulation focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 ${
                isActive
                  ? `${sectionToneClass[option.id]}`
                  : "border-slate-700/80 bg-slate-950/60 text-slate-200 hover:border-sky-400/70 hover:text-slate-100"
              }`}
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em]">{option.label}</p>
              <p className="mt-2 text-xs leading-5 text-slate-200">{option.description}</p>
            </button>
          );
        })}
      </div>
    </section>
  );
}

type PersistedAssistPanelProps = {
  assistMode: LiteracyAssistMode;
  buttonLabel: string;
  title: string;
  summary: string;
  children: ReactNode;
};

export function PersistedAssistPanel({
  assistMode,
  buttonLabel,
  title,
  summary,
  children,
}: PersistedAssistPanelProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const storageKey = literacyAssistStorageKeys[assistMode];

  useEffect(() => {
    const assist = searchParams.get("assist");
    const shouldOpenFromQuery = assist === assistMode;
    const shouldOpenFromStorage = readBoolPreference(storageKey);
    const nextOpen = shouldOpenFromQuery || shouldOpenFromStorage;

    if (!open && nextOpen) {
      setOpen(true);
      trackOperatorWorkflowEvent({
        type: "assist_panel_opened",
        path: pathname,
        assistMode,
        source: shouldOpenFromQuery ? "query" : "stored_preference",
      });
    }

    if (shouldOpenFromQuery) {
      writeBoolPreference(storageKey, true);
    }
  }, [assistMode, open, pathname, searchParams, storageKey]);

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => {
          const nextValue = !open;
          setOpen(nextValue);
          writeBoolPreference(storageKey, nextValue);
          if (nextValue) {
            trackOperatorWorkflowEvent({
              type: "assist_panel_opened",
              path: pathname,
              assistMode,
              source: "click",
            });
          }
        }}
        aria-expanded={open}
        className="weather-pill inline-flex min-h-[44px] items-center gap-2 px-3 py-2 text-xs font-semibold tracking-[0.12em] text-slate-100"
      >
        <span>{buttonLabel}</span>
        <span aria-hidden="true" className={`transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
      </button>
      {open ? (
        <div className={`rounded-xl border px-3 py-3 ${sectionToneClass[assistMode]}`}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em]">
            {literacyFocusLabels[assistMode]}
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-50">{title}</p>
          <p className="mt-2 text-xs leading-5 text-slate-200">{summary}</p>
          <div className="mt-3 space-y-2 text-xs leading-5 text-slate-100">
            {children}
          </div>
        </div>
      ) : null}
    </div>
  );
}
