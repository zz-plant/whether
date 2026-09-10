"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { HelpModal } from "./home/HelpModal";
import { shortcutNavigationLayers } from "../../lib/navigation/informationArchitecture";

/* One source: the IA declares each layer's key, the header tabs show it on
   hover, the palette lists it, and this binds it. */
const SHORTCUTS: Record<string, string> = Object.fromEntries([
  ...shortcutNavigationLayers.map((layer) => [layer.shortcut, layer.href]),
  ["/", "/search"],
]);

/**
 * Whether a global single-key shortcut may act, given what currently has focus.
 *
 * Exported so the rule is testable without a DOM: the regression it encodes was
 * invisible until J/K started working.
 *
 * Route shortcuts used to require `document.activeElement === document.body`, which was
 * true only because nothing on the page ever took focus — `[data-page-section]` was set
 * nowhere, so J and K did nothing. Once J and K began focusing sections, one press moved
 * focus off `body` and silently killed E, P, H, T, R and `/` until the reader clicked
 * somewhere else. The fix is to ask what has focus rather than to insist on `body`: a
 * section is a passive container that consumes no keys, so shortcuts still belong to the
 * page while one is focused.
 */
export const shortcutTargetIsNeutral = (active: Element | null): boolean => {
  if (!active || active === document.body) return true;
  if (active instanceof HTMLElement && active.isContentEditable) return false;
  if (
    active instanceof HTMLInputElement
    || active instanceof HTMLTextAreaElement
    || active instanceof HTMLSelectElement
  ) {
    return false;
  }
  // A section J/K parked focus on. It has no key behaviour of its own.
  if (active instanceof HTMLElement && active.hasAttribute("data-page-section")) return true;
  return false;
};

/**
 * What J and K move between, on any page.
 *
 * Sections are the intended stops, but only some routes declare them: `/` and `/trust`
 * carry six and eight, while `/signals` and `/resolve` render most of theirs inside
 * disclosures and expose one apiece. The shortcut bar sits in the footer of *every* page
 * and says "J K Navigate sections" regardless, so on those routes the app advertised a
 * key that did nothing — the same defect this shortcut was fixed for in the first place.
 *
 * Falling back to the page's own headings keeps the advertisement true everywhere, and is
 * the better stop anyway for a screen reader: focusing a heading announces it.
 */
const sectionTargets = (): HTMLElement[] => {
  const declared = Array.from(document.querySelectorAll<HTMLElement>("[data-page-section]"));
  if (declared.length >= 2) return declared;

  const main = document.getElementById("main-content") ?? document.body;
  return Array.from(main.querySelectorAll<HTMLElement>("h2")).filter(
    // Skip headings that are hidden or collapsed inside a closed disclosure.
    (heading) => heading.offsetParent !== null || heading.getClientRects().length > 0,
  );
};

export function KeyboardShortcuts() {
  const router = useRouter();
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      const typingTarget =
        e.target instanceof HTMLInputElement
        || e.target instanceof HTMLTextAreaElement
        || e.target instanceof HTMLSelectElement
        || (e.target instanceof HTMLElement && e.target.isContentEditable);
      if (typingTarget) return;

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
        const sections = sectionTargets();
        // Nothing to move between: leave the key to the page rather than swallowing it.
        if (sections.length < 2) return;
        e.preventDefault();
        const current = sections.findIndex((s) =>
          s.contains(document.activeElement) || s === document.activeElement);
        const next = e.key === "j"
          ? (current < 0 ? 0 : Math.min(current + 1, sections.length - 1))
          : Math.max(0, current - 1);
        const target = sections[next];
        if (target) {
          // A heading picked up by the fallback is not focusable on its own.
          if (!target.hasAttribute("tabindex")) target.tabIndex = -1;
          target.focus({ preventScroll: false });
          target.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
        return;
      }

      if (e.key === "c" || e.key === "C") {
        const copyBtn = document.querySelector<HTMLButtonElement>('[data-testid="copy-slack-brief-button"]');
        if (copyBtn) {
          e.preventDefault();
          copyBtn.click();
          return;
        }
      }

      const href = SHORTCUTS[e.key.toLowerCase()];
      if (href && shortcutTargetIsNeutral(document.activeElement)) {
        router.push(href);
      }
    };

    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [router]);

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

