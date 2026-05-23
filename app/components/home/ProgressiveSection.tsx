"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";

type ProgressiveSectionProps = {
  id: string;
  label: string;
  description: string;
  children: ReactNode;
  defaultExpanded?: boolean;
};

function useHash() {
  const [hash, setHash] = useState("");

  useEffect(() => {
    setHash(window.location.hash);
    const handler = () => setHash(window.location.hash);
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);

  return hash;
}

export function ProgressiveSection({
  id,
  label,
  description,
  children,
  defaultExpanded = false,
}: ProgressiveSectionProps) {
  const hash = useHash();
  const targetHash = `#${id}`;
  const [expanded, setExpanded] = useState(defaultExpanded || hash === targetHash);

  useEffect(() => {
    if (hash === targetHash) setExpanded(true);
  }, [hash, targetHash]);

  const toggle = useCallback(() => {
    const next = !expanded;
    setExpanded(next);
    if (next) {
      window.history.pushState(null, "", targetHash);
    } else if (hash === targetHash) {
      window.history.pushState(null, "", window.location.pathname);
    }
  }, [expanded, targetHash, hash]);

  return (
    <div className="rounded-lg border border-slate-800/60 bg-slate-950/20 overflow-hidden">
      <button
        type="button"
        onClick={toggle}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-slate-900/30 transition-colors"
      >
        <div>
          <p className="text-sm font-semibold text-slate-200">{label}</p>
          <p className="mt-0.5 text-xs text-slate-500">{description}</p>
        </div>
        <span
          className={`text-slate-500 text-sm transition-transform duration-200 ${
            expanded ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        >
          ▾
        </span>
      </button>
      {expanded ? (
        <div className="px-5 pb-5 border-t border-slate-800/40">
          <div className="pt-4">{children}</div>
        </div>
      ) : null}
    </div>
  );
}
