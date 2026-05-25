"use client";

import { useEffect, useState } from "react";
import { HelpModal } from "./home/HelpModal";

const SHORTCUTS: Record<string, string> = {
  "e": "/evidence",
  "p": "/planning",
  "h": "/history",
  "t": "/trust",
  "r": "/resolve",
  "/": "/search",
};

export function KeyboardShortcuts() {
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === "?") {
        e.preventDefault();
        setHelpOpen((v) => !v);
        return;
      }

      if (e.key === "Escape") {
        setHelpOpen(false);
        return;
      }

      if (e.key === "j" || e.key === "k") {
        e.preventDefault();
        const sections = document.querySelectorAll<HTMLElement>("[data-page-section]");
        if (!sections.length) return;
        const current = Array.from(sections).findIndex((s) =>
          s.contains(document.activeElement) || s === document.activeElement);
        const next = e.key === "j"
          ? (current < 0 ? 0 : Math.min(current + 1, sections.length - 1))
          : Math.max(0, current - 1);
        if (sections[next]) {
          (sections[next] as HTMLElement).focus({ preventScroll: false });
          sections[next].scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
        return;
      }

      const href = SHORTCUTS[e.key.toLowerCase()];
      if (href && document.activeElement === document.body) {
        window.location.href = href;
      }
    };

    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, []);

  return (
    <>
      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
      <p className="hidden sm:block text-center text-fluid-micro text-slate-700 py-2">
        <kbd className="rounded border border-slate-600 px-1.5 py-0.5 text-slate-400 font-mono">J</kbd>
        <kbd className="rounded border border-slate-600 px-1.5 py-0.5 text-slate-400 font-mono ml-0.5">K</kbd>{" "}
        Navigate sections{"    "}
        <kbd className="rounded border border-slate-600 px-1.5 py-0.5 text-slate-400 font-mono">?</kbd>{" "}
        Keyboard shortcuts
      </p>
    </>
  );
}

