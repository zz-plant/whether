"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useLocalStorageState } from "../../../lib/hooks/useLocalStorageState";

const VISIT_COUNT_KEY = "whether_visit_count";
const BLOCK_OPEN_KEY = "whether_verify_block_open";
const BLOCK_TOGGLED_KEY = "whether_verify_block_toggled";

export type VerificationBlockProps = {
  recordDate?: string;
  generatedAt?: string;
  fetchedAt?: string;
  sourceCadence?: string;
  systemCadence?: string;
  sourceLabel?: string;
  children?: ReactNode;
};

export function VerificationBlock({
  recordDate,
  generatedAt,
  fetchedAt,
  sourceCadence,
  systemCadence,
  sourceLabel,
  children,
}: VerificationBlockProps) {
  const [visitCount] = useLocalStorageState<number>(VISIT_COUNT_KEY, 0);
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    setMobile(window.innerWidth < 1024);
  }, []);

  const defaultOpen = visitCount <= 2;

  const [storedOpen, setStoredOpen] = useLocalStorageState<string>(
    BLOCK_OPEN_KEY,
    defaultOpen ? "1" : "0",
  );
  const [toggled, setToggled] = useLocalStorageState<boolean>(
    BLOCK_TOGGLED_KEY,
    false,
  );

  // Auto-sync open state to visit-count default when user hasn't toggled
  useEffect(() => {
    if (!toggled) {
      const desired = defaultOpen ? "1" : "0";
      if (storedOpen !== desired) {
        setStoredOpen(desired);
      }
    }
  }, [visitCount, toggled, defaultOpen, storedOpen, setStoredOpen]);

  const isOpen = mobile ? storedOpen === "1" : storedOpen !== "0";

  const toggle = () => {
    setToggled(true);
    setStoredOpen(isOpen ? "0" : "1");
  };

  const hasFreshness =
    recordDate || generatedAt || fetchedAt || sourceCadence || systemCadence;

  return (
    <div
      className={`weather-card space-y-3 ${isOpen ? "" : "bg-slate-950/20"}`}
    >
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <span className="text-fluid-micro font-semibold uppercase tracking-[0.1em] text-slate-400">
          How to verify this read
        </span>
        <span
          className={`text-fluid-micro text-slate-500 transition-transform flex-shrink-0 ${
            isOpen ? "rotate-180" : ""
          }`}
        >
          ▾
        </span>
      </button>

      {isOpen ? (
        <div className="space-y-3">
          {hasFreshness ? (
            <div className="space-y-1.5">
              {recordDate ? (
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-fluid-micro text-slate-500">
                    Decision period
                  </span>
                  <span className="text-fluid-micro text-slate-300 tabular-nums">
                    {recordDate}
                  </span>
                </div>
              ) : null}
              {generatedAt ? (
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-fluid-micro text-slate-500">
                    Decision generated
                  </span>
                  <span className="text-fluid-micro text-slate-300 tabular-nums">
                    {generatedAt}
                  </span>
                </div>
              ) : null}
              {fetchedAt ? (
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-fluid-micro text-slate-500">
                    Source data
                  </span>
                  <span className="text-fluid-micro text-slate-300 tabular-nums">
                    {fetchedAt}
                  </span>
                </div>
              ) : null}
              {sourceCadence ? (
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-fluid-micro text-slate-500">
                    Source cadence
                  </span>
                  <span className="text-fluid-micro text-slate-300">
                    {sourceCadence}
                  </span>
                </div>
              ) : null}
              {systemCadence ? (
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-fluid-micro text-slate-500">
                    System checks
                  </span>
                  <span className="text-fluid-micro text-slate-300">
                    {systemCadence}
                  </span>
                </div>
              ) : null}
            </div>
          ) : null}

          {sourceLabel ? (
            <p className="text-fluid-micro text-slate-500">
              Data:{" "}
              <span className="text-slate-300">{sourceLabel}</span>
            </p>
          ) : null}

          <p className="text-fluid-micro text-slate-500">
            <a
              href="/methodology"
              className="text-sky-300 hover:text-sky-200 underline decoration-slate-700 hover:decoration-sky-400"
            >
              Methodology
            </a>
            {" · "}
            <a
              href="/readiness"
              className="text-sky-300 hover:text-sky-200 underline decoration-slate-700 hover:decoration-sky-400"
            >
              Readiness
            </a>
            {" · "}
            <a
              href="/trust"
              className="text-sky-300 hover:text-sky-200 underline decoration-slate-700 hover:decoration-sky-400"
            >
              Source board
            </a>
          </p>

          <p className="text-fluid-micro text-slate-400 leading-relaxed">
            Whether is decision-support, not authority. Verify source data and
            combine with your own company metrics before acting on irreversible
            hiring, fundraising, or budget decisions.
          </p>

          {children}
        </div>
      ) : null}
    </div>
  );
}
