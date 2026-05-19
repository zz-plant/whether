"use client";

import { useEffect } from "react";

const SHORTCUTS: Record<string, string> = {
  "e": "/evidence",
  "p": "/planning",
  "h": "/history",
  "t": "/trust",
  "r": "/resolve",
  "/": "/search",
};

export function KeyboardShortcuts() {
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const href = SHORTCUTS[e.key.toLowerCase()];
      if (href && document.activeElement === document.body) {
        window.location.href = href;
      }
    };

    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, []);

  return (
    <p className="hidden sm:block text-center text-fluid-micro text-slate-700 py-2">
      Press <kbd className="rounded border border-slate-700 px-1 text-slate-600">E</kbd> Evidence <kbd className="rounded border border-slate-700 px-1 text-slate-600">P</kbd> Plan <kbd className="rounded border border-slate-700 px-1 text-slate-600">H</kbd> History <kbd className="rounded border border-slate-700 px-1 text-slate-600">/</kbd> Search
    </p>
  );
}
