"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { HelpModal } from "./home/HelpModal";
import { scrollBehaviorFor } from "./scrollRowToItem";
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
 * disclosures and expose one apiece. The help dialog lists J and K on *every* page
 * regardless, so on those routes the app advertised a key that did nothing — the same
 * defect this shortcut was fixed for in the first place.
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
          // focus() scrolls on its own, instantly, and the smooth scroll after it then
          // started from wherever that jump landed: two movements per key. Focus without
          // scrolling, then make the one scroll — to the section's start, under the sticky
          // stack the html scroll-padding describes, the way a hash link lands it.
          target.focus({ preventScroll: true });
          target.scrollIntoView({ behavior: scrollBehaviorFor(true), block: "start" });
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

  /* The setter, not a synthetic "?" keydown dispatched at the window for the
     handler above to catch — a click that impersonates a keypress toggles
     rather than opens, and depends on nothing else having claimed the key. */
  const openHelp = () => setHelpOpen(true);

  /* One button. The strip used to announce "J K Navigate sections" on every
     route beside it; the palette footer and the help dialog both list the
     keys, so the footer's job is to open the list, not to be a third copy. */
  return (
    <>
      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
      <p className="flex items-center justify-center py-2 text-center text-fluid-micro text-[var(--app-text-muted)]">
        <button
          type="button"
          onClick={openHelp}
          className="weather-focus-ring inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 font-medium text-[var(--app-text-muted)] transition-colors hover:text-[var(--app-text)]"
        >
          <kbd className="weather-kbd">?</kbd>
          <span>Shortcuts</span>
        </button>
      </p>
    </>
  );
}

