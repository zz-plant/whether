"use client";

import { useEffect, useState } from "react";
import { HelpModal } from "./home/HelpModal";

const SHORTCUTS: Record<string, string> = {
  "e": "/signals",
  "p": "/operate",
  "h": "/history",
  "t": "/trust",
  "r": "/answer",
  "/": "/search",
};

export function KeyboardShortcuts() {
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        document.dispatchEvent(new CustomEvent("whether-open-command-palette"));
        return;
      }

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

  const openHelp = () => {
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "?" }));
  };

  return (
    <>
      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
      <p className="flex flex-wrap items-center justify-center gap-2 text-center text-fluid-micro text-[var(--app-text-muted)] py-2">
        <span className="hidden sm:inline-flex items-center gap-1">
          <kbd className="rounded border border-[var(--app-border-strong)] px-1.5 py-0.5 text-[var(--app-text-muted)] font-mono">J</kbd>
          <kbd className="rounded border border-[var(--app-border-strong)] px-1.5 py-0.5 text-[var(--app-text-muted)] font-mono">K</kbd>
          <span className="ml-1">Navigate sections</span>
        </span>
        <button
          type="button"
          onClick={openHelp}
          className="inline-flex items-center gap-1 rounded border border-[var(--app-border-strong)] px-2 py-0.5 font-medium text-[var(--app-text-muted)] hover:bg-[var(--app-border-strong)] hover:text-[var(--app-text)] transition-colors focus-visible:outline-2 focus-visible:outline-sky-400"
        >
          <kbd className="font-mono">?</kbd>
          <span>Shortcuts</span>
        </button>
      </p>
    </>
  );
}

