import { isRegimeKey } from "../regimePresentation";
import type { RegimeKey } from "../types";

/**
 * What the running head (`app/components/runningHead.tsx`) prints, and how a page hands
 * it over. The head is mounted once, in the layout, so it cannot take a page's props;
 * the page marks its intro block with these attributes instead, and the head reads them
 * when that block leaves the screen. One builder writes them and one reader reads them,
 * so the two cannot disagree about a name.
 */
export type FrameFacts = {
  /** The reading's regime, for the condition word's ink (`[data-regime]` sets `--regime-ink`). */
  regime: RegimeKey | null;
  /** The condition word as the page prints it: "Cloudy". */
  condition: string | null;
  /** The date the page's reading is from, in its own words: "Week of Oct 19, 2026". */
  date: string | null;
  /** The page, for a desktop frame that has room to name it beside the section. */
  title: string | null;
  /** The brief's call, which its phone frames lead with. Only the brief sets it. */
  call: string | null;
  /** One jump the head offers beside the call (the brief's "By area"). */
  jump: { href: string; label: string } | null;
};

type FrameFactsInput = {
  regime?: string | null;
  condition?: string | null;
  date?: string | null;
  title?: string | null;
  call?: string | null;
  jump?: { href: string; label: string } | null;
};

/** The attributes a page spreads onto its intro block. Absent facts are left off. */
export const frameFactsAttributes = (facts: FrameFactsInput): Record<string, string> => {
  const attributes: Record<string, string> = { "data-frame-facts": "" };
  if (facts.regime && isRegimeKey(facts.regime)) attributes["data-frame-regime"] = facts.regime;
  if (facts.condition) attributes["data-frame-condition"] = facts.condition;
  if (facts.date) attributes["data-frame-date"] = facts.date;
  if (facts.title) attributes["data-frame-title"] = facts.title;
  if (facts.call) attributes["data-frame-call"] = facts.call;
  if (facts.jump) {
    attributes["data-frame-jump-href"] = facts.jump.href;
    attributes["data-frame-jump-label"] = facts.jump.label;
  }
  return attributes;
};

const text = (value: string | undefined) => (value && value.trim() ? value.trim() : null);

/**
 * The facts a marked block carries, or only the page's title when nothing is marked:
 * every page still gets the site's name and its own, which is what makes a screenshot
 * of it findable.
 */
export const readFrameFacts = (element: { dataset: DOMStringMap } | null, fallbackTitle: string | null): FrameFacts => {
  const data = element?.dataset ?? {};
  const regime = text(data.frameRegime);
  const jumpHref = text(data.frameJumpHref);
  const jumpLabel = text(data.frameJumpLabel);
  return {
    regime: regime && isRegimeKey(regime) ? regime : null,
    condition: text(data.frameCondition),
    date: text(data.frameDate),
    title: text(data.frameTitle) ?? text(fallbackTitle ?? undefined),
    call: text(data.frameCall),
    jump: jumpHref && jumpLabel ? { href: jumpHref, label: jumpLabel } : null,
  };
};

/**
 * The section a frame is in: the last heading that has reached the line under the head.
 * Null above the first one, where the page's title says enough.
 */
export const runningHeadSection = (headings: readonly { label: string; top: number }[], line: number): string | null => {
  let current: string | null = null;
  for (const heading of headings) {
    if (heading.top > line) break;
    if (heading.label) current = heading.label;
  }
  return current;
};
