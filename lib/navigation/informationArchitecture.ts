import type { Route } from "./routeType";

/*
 * The site in four groups, each with a hub, and the pages each group owns.
 *
 * Until 2026-10-08 the header drew six "loop" tabs — Brief, Plan, Evidence,
 * Resolve, Trust, History — and a nine-item More menu. Evidence had three names
 * (the tab, `/signals`, and "Why the weekly brief changed"), Plan and Resolve
 * both answered "what do I do about one decision", the track record sat on four
 * pages under three tabs, and Guides and About were reachable only from a
 * dropdown or another page. The four groups are the four questions a reader
 * brings: what is true this week, what do I decide, how has it held up, and
 * where is the longer answer.
 *
 * One name per URL. A group's hub page carries the group's label, so the header
 * tab, the group's first sub-tab, the breadcrumb and the footer heading all say
 * the same word for the same address.
 */

export type NavigationGroupKey = "this-week" | "decide" | "record" | "guides";

type NavigationPageKey =
  | "weekly-brief"
  | "signals"
  | "trust"
  | "planning"
  | "runway"
  | "scenarios"
  | "comps"
  | "history"
  | "compare"
  | "calibration"
  | "concepts"
  | "guides";

export type NavigationPage = {
  key: NavigationPageKey;
  group: NavigationGroupKey;
  href: Route;
  /** The page's one name: its sub-tab, breadcrumb, palette entry and footer link. */
  label: string;
  description: string;
  /**
   * `tab`: one of the group's sub-tabs. `secondary`: in the group (it lights the
   * group's header tab and starts its breadcrumb with the group) but listed after
   * the tabs, in lighter type — a page worth keeping that is off the core promise.
   */
  placement: "tab" | "secondary";
};

type NavigationLink = { href: Route; label: string };

export type NavigationGroup = {
  key: NavigationGroupKey;
  /** The hub. The page at this address carries the group's label. */
  href: Route;
  label: string;
  description: string;
  /** One-key jump. Rendered as a kbd hint on the header tab and in the palette; bound in KeyboardShortcuts. */
  shortcut: string;
  /**
   * Route families the group owns beyond its pages, prefix-matched: the frozen
   * weeks under Record, the answer and guide pages under Guides. They light the
   * group's tab and start their breadcrumb with it, and are not sub-tabs.
   */
  memberPrefixes: readonly Route[];
  /** Sections of another group's page that this group's sub-tab row also reaches. */
  crossLinks: readonly NavigationLink[];
  /** In-page sections of a one-page group, for its footer column. */
  footerLinks: readonly NavigationLink[];
};

export const navigationGroupByKey: Record<NavigationGroupKey, NavigationGroup> = {
  "this-week": {
    key: "this-week",
    href: "/",
    label: "This week",
    description: "What this week's guidance says, why it changed and how much to trust it.",
    shortcut: "w",
    memberPrefixes: [],
    crossLinks: [],
    footerLinks: [],
  },
  decide: {
    key: "decide",
    href: "/operate",
    label: "Decide",
    description: "Turn this week's guidance into decisions on hiring, roadmap, fundraising, spending and new bets.",
    shortcut: "d",
    memberPrefixes: [],
    crossLinks: [],
    footerLinks: [],
  },
  record: {
    key: "record",
    href: "/history",
    label: "Record",
    description: "The guidance for every past month and week, scored against what happened next.",
    shortcut: "r",
    memberPrefixes: ["/brief"],
    /* The sources and the score derivation stay on /trust, where they judge this
       week's reading; the record reaches them rather than holding a second copy. */
    crossLinks: [
      { href: "/trust#source-board", label: "Sources" },
      { href: "/trust#formula-reference", label: "How the scores are built" },
    ],
    footerLinks: [],
  },
  guides: {
    key: "guides",
    href: "/resources",
    label: "Guides",
    description: "Answers and guides for each decision area, and the frameworks behind them.",
    shortcut: "g",
    /* /resolve/<slug> (help by role and situation) and /toolkits/<slug> are the
       "More tools" at the foot of Guides; /answers/<slug> are its answers. */
    memberPrefixes: ["/answers", "/resources", "/resolve", "/toolkits"],
    crossLinks: [],
    footerLinks: [
      { href: "/resources#answers", label: "Answers by decision area" },
      { href: "/resources#more-tools", label: "More tools" },
    ],
  },
};

/** The four groups in header order. */
export const navigationGroups: readonly NavigationGroup[] = (["this-week", "decide", "record", "guides"] as const).map(
  (key) => navigationGroupByKey[key],
);

/*
 * Every grouped page, hub first within its group, groups in nav order. The
 * sub-tab rows, the footer columns, the mobile sheet and the palette read this
 * array; do not maintain a parallel ordering elsewhere.
 */
export const navigationPages: readonly NavigationPage[] = [
  {
    key: "weekly-brief",
    group: "this-week",
    href: "/",
    label: "This week",
    description: "See this week's guidance, the move it calls for, and a brief you can share.",
    placement: "tab",
  },
  {
    key: "signals",
    group: "this-week",
    href: "/signals",
    label: "Why it changed",
    description: "See what changed, what drove it and which lines are worth watching.",
    placement: "tab",
  },
  {
    key: "trust",
    group: "this-week",
    href: "/trust",
    label: "How much to trust this week",
    description: "Check freshness, the margin, source coverage and the lines that would change the brief.",
    placement: "tab",
  },
  {
    key: "planning",
    group: "decide",
    href: "/operate",
    label: "Decide",
    description: "Each area's rule this week, a test for one move, and the lines you set for your own plan.",
    placement: "tab",
  },
  {
    key: "runway",
    group: "decide",
    href: "/operate/financial",
    label: "Runway planner",
    description: "Work out runway, a raise window and a memo from your cash, burn and revenue.",
    placement: "tab",
  },
  {
    key: "scenarios",
    group: "decide",
    href: "/operate/scenarios",
    label: "Scenarios",
    description: "See what the guidance and the rules would be under different rates.",
    placement: "tab",
  },
  /* Decide rather than Record: the multiples are this month's market input to a
     raise (what a round may be priced against), read beside the runway planner.
     Record holds the product's own past calls; the basket is not one of them. */
  {
    key: "comps",
    group: "decide",
    href: "/comps",
    label: "SaaS multiples",
    description: "Median EV/Revenue multiple across a basket of public SaaS companies",
    placement: "tab",
  },
  {
    key: "history",
    group: "record",
    href: "/history",
    label: "Record",
    description: "See how funding pressure and risk appetite have changed over time and how the guidance held up.",
    placement: "tab",
  },
  {
    key: "compare",
    group: "record",
    href: "/history/compare",
    label: "Compare periods",
    description: "This week's scores against past downturns: 2001, 2008 and 2022",
    placement: "tab",
  },
  {
    key: "calibration",
    group: "record",
    href: "/calibration",
    label: "Calibration",
    description: "How often conditions held at each margin from the line, 2012–2026",
    placement: "tab",
  },
  {
    key: "concepts",
    group: "record",
    href: "/concepts",
    label: "Product writing",
    description: "Widely read product essays and investor memos, placed on the record since 2012",
    placement: "secondary",
  },
  {
    key: "guides",
    group: "guides",
    href: "/resources",
    label: "Guides",
    description: "Direct answers and long-form guides for each decision area, and the governance frameworks behind them.",
    placement: "tab",
  },
];

/** A group's pages in nav order, hub first. */
export const pagesInGroup = (group: NavigationGroupKey): NavigationPage[] =>
  navigationPages.filter((page) => page.group === group);

/** Page label by exact path: the breadcrumb's names. */
export const navigationLabelByPath = navigationPages.reduce<Record<string, string>>((acc, page) => {
  acc[page.href] = page.label;
  return acc;
}, {});

/**
 * Utility links: the product outside the four groups. Single source for the
 * header's utility row, the footer, the mobile sheet and the palette.
 *
 * "Single source" is load-bearing: the footer used to hand-list its own copy of
 * this row, and the copies drifted, so a page in here was missing from the
 * footer and reachable only from a header dropdown. Render this array; do not
 * restate it.
 *
 * `header`: the width from which the header draws it as a text link (every
 * one is in the mobile sheet and the footer). About sat in the More menu until
 * 2026-10-08, which is where a reader stops looking; Use it
 * elsewhere waits for `lg`, because at a tablet's width the three ran into the
 * search field. API & MCP is reached from /share, which hosts every way to use
 * the guidance elsewhere; Search is the ⌘K field.
 */
export const utilityLinks = [
  {
    // Carries the embed builder, the citation and the meeting snippet too: every
    // way the guidance leaves the site starts here.
    href: "/share",
    label: "Use it elsewhere",
    description: "Copy, cite or embed this week's guidance, or pull it through the API, MCP or RSS",
    header: "lg",
  },
  {
    href: "/api-docs",
    label: "API & MCP",
    description: "MCP server, REST endpoints, CLI, widget",
    header: null,
  },
  {
    href: "/about",
    label: "About",
    description: "Product philosophy & team",
    header: "md",
  },
  {
    href: "/search",
    label: "Search",
    description: "Find a decision, signal, or past guidance",
    header: null,
  },
] as const satisfies ReadonlyArray<{ href: Route; label: string; description: string; header: "md" | "lg" | null }>;

export const headerUtilityLinks = utilityLinks.flatMap((link) => (link.header ? [{ ...link, header: link.header }] : []));

/**
 * Route families that are neither a grouped page nor a utility link: the
 * programmatic corpus, the citable archive, and contact. They name the route
 * in the header's sublabel.
 *
 * They were a private fallback list inside `globalHeader.ts`, which is how the
 * header came to read "Whether · Page" on `/brief/<week>` — the most linkable
 * URL on the site — until someone noticed. Prefix-matched, longest first.
 */
export const contentSections = [
  { prefix: "/answers", label: "Answer" },
  { prefix: "/brief", label: "Published brief" },
  { prefix: "/resolve", label: "More tools" },
  { prefix: "/toolkits", label: "Toolkit" },
  { prefix: "/contact", label: "Contact" },
] as const;
