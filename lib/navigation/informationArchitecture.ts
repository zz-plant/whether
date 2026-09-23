import type { Route } from "./routeType";

export type NavigationLayerKey =
  | "weekly-brief"
  | "signals"
  | "planning"
  | "resolve"
  | "trust"
  | "history"
  | "compare";

export type NavigationLayer = {
  key: NavigationLayerKey;
  href: Route;
  label: string;
  navLabel?: string;
  description: string;
  boundary: string;
  tier: "primary" | "supporting";
  parentKey?: NavigationLayerKey;
  /** One-key jump. Rendered as a kbd hint in the header tabs and the palette; bound in KeyboardShortcuts. */
  shortcut?: string;
};

// Primary layers are listed in operator-loop order: brief → plan → evidence →
// resolve → readiness. Header next-step cues and nav ordering derive from this
// array — do not maintain a parallel ordering elsewhere.
export const navigationLayers: NavigationLayer[] = [
  {
    key: "weekly-brief",
    href: "/",
    label: "Weekly Brief",
    navLabel: "Brief",
    description: "See this week's call, what to do now, and a brief you can share.",
    boundary: "Use this first to see the current call and the next move.",
    tier: "primary",
  },
  {
    key: "planning",
    shortcut: "p",
    href: "/operate",
    label: "Plan",
    navLabel: "Plan",
    description: "Turn this week's brief into decisions on hiring, spend, roadmap, and what to share.",
    boundary: "Use this when you want to act on the brief.",
    tier: "supporting",
    parentKey: "weekly-brief",
  },
  {
    key: "signals",
    shortcut: "e",
    href: "/signals",
    label: "Evidence",
    navLabel: "Evidence",
    description: "See what changed, what drove it, and the thresholds worth watching.",
    boundary: "Use this when you want the proof behind the call.",
    tier: "supporting",
    parentKey: "weekly-brief",
  },
  {
    key: "resolve",
    shortcut: "r",
    href: "/resolve",
    label: "Resolve",
    navLabel: "Resolve",
    description: "Find the right answer or tool for one remaining question.",
    boundary: "Use this page when the brief is clear but one question still needs an answer.",
    tier: "supporting",
    parentKey: "weekly-brief",
  },
  {
    key: "trust",
    shortcut: "t",
    href: "/trust",
    label: "Trust",
    navLabel: "Trust",
    description: "Check freshness, confidence, source coverage, and what would change the brief.",
    boundary: "Use this when you want to sanity-check the brief before a big decision.",
    tier: "supporting",
    parentKey: "weekly-brief",
  },
  {
    key: "history",
    shortcut: "h",
    href: "/history",
    label: "History",
    navLabel: "History",
    description: "See how funding pressure and risk appetite have changed over time.",
    boundary: "Use this to see when the call changed and to compare this week to past months.",
    tier: "supporting",
    parentKey: "signals",
  },
  {
    key: "compare",
    href: "/history/compare",
    label: "Compare periods",
    navLabel: "Compare",
    description: "Compare signals and operating calls between any two past months.",
    boundary: "Use this to set this week's scores against past months.",
    tier: "supporting",
    parentKey: "history",
  },
] as const;

export const primaryNavigationLayers = navigationLayers.filter((layer) => layer.tier === "primary");

/**
 * The loop as the header shows it: every layer but the deepest nested one
 * (compare, under history), in IA order. Desktop renders these as tabs; the
 * mobile tab bar takes the first three and puts the rest behind More.
 */
export const loopNavigationLayers = navigationLayers.filter((layer) => layer.key !== "compare");

/** The loop layers that declare a one-key jump, with the key narrowed for callers. */
export const shortcutNavigationLayers: Array<NavigationLayer & { shortcut: string }> = loopNavigationLayers.flatMap((layer) =>
  typeof layer.shortcut === "string" ? [{ ...layer, shortcut: layer.shortcut }] : [],
);

/** The three loop layers that fit a phone's bottom bar beside Search and More. */
const mobileTabLayerKeys: readonly NavigationLayerKey[] = ["weekly-brief", "planning", "signals"];
export const mobileTabLayers = loopNavigationLayers.filter((layer) => mobileTabLayerKeys.includes(layer.key));

// Routes that render the condensed report shell header. Supporting layers are
// nested under primary hrefs, so listing every layer href is safe and keeps
// this in lockstep with the IA.
export const reportShellPaths: Route[] = navigationLayers.map((layer) => layer.href);

export const navigationLayerByKey = navigationLayers.reduce<Record<NavigationLayerKey, NavigationLayer>>((acc, layer) => {
  acc[layer.key] = layer;
  return acc;
}, {} as Record<NavigationLayerKey, NavigationLayer>);

export const navigationLabelByPath = navigationLayers.reduce<Record<string, string>>((acc, layer) => {
  acc[layer.href] = layer.label;
  return acc;
}, {});

/**
 * Utility links — framework, template, API docs, about.
 * These sit outside the operator loop. Single source for mobile sheet, footer, header dropdown.
 *
 * "Single source" is load-bearing: the footer used to hand-list its own copy of
 * this row, and the copies drifted. /pricing was in here and not in the footer,
 * so the one page that explains what costs money was reachable only from a
 * header dropdown. Render this array; do not restate it.
 */
export const utilityLinks = [
  {
    href: "/comps",
    label: "SaaS Multiples",
    description: "Median EV/Revenue multiples across 15 public SaaS comps",
  },
  {
    href: "/history/compare",
    /* Was "Macro Analogs" here and "Compare periods" in the navigation layer above —
       one URL under two names, in two menus, on the same site. */
    label: "Compare periods",
    description: "This week's scores against past downturns: 2001, 2008 and 2022",
  },
  {
    // Carries the embed builder too: same artifact in a different container,
    // and it used to be a second door that said nothing about this one.
    href: "/share",
    label: "Share",
    description: "Copy the brief for Slack, a slide or a citation, or embed it live",
  },
  {
    href: "/api-docs",
    label: "API & MCP",
    description: "MCP server, REST endpoints, CLI, widget",
  },
  {
    href: "/pricing",
    label: "Pricing",
    description: "What is free forever, and what Pro and Team add",
  },
  {
    href: "/calibration",
    label: "Calibration",
    description: "How often the confidence label has been right, 2012–2026",
  },
  {
    href: "/concepts",
    label: "Product writing",
    description: "Widely read product essays, placed on the record since 2012",
  },
  {
    href: "/search",
    label: "Search",
    description: "Find a decision, signal, or past call",
  },
  {
    href: "/about",
    label: "About",
    description: "Product philosophy & team",
  },
] as const;

export type UtilityLink = typeof utilityLinks[number];

/**
 * Route families that are neither a navigation layer nor a utility link: the
 * programmatic corpus, the citable archive, and contact.
 *
 * They were a private fallback list inside `globalHeader.ts`, which is how the
 * header came to read "Whether · Page" on `/brief/<week>` — the most linkable
 * URL on the site — until someone noticed. A third list living outside the IA
 * module meant the IA module did not describe the site. Prefix-matched, longest
 * first, so a future exact entry can still win.
 *
 * `/answers` is the direct-answer pages, a distinct set from the `/resolve`
 * Resolve hub one letter away. The two share nothing but a prefix, and this is
 * the one place that says so in the IA rather than in a comment beside a regex.
 */
export const contentSections = [
  { prefix: "/answers", label: "Answer" },
  { prefix: "/brief", label: "Published brief" },
  { prefix: "/resources", label: "Resource" },
  { prefix: "/toolkits", label: "Toolkit" },
  { prefix: "/contact", label: "Contact" },
] as const;
