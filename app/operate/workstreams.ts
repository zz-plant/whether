/*
 * /operate/financial and /operate/scenarios were two files that differed in
 * the imported panel, the metadata, and the banner — everything else (the
 * snapshot load, the shell model, the workstream nav) was copied line for
 * line. One route, one map.
 *
 * The map lives outside the page file so the sitemap can read it: a page file
 * may only export what Next.js expects, and until 2026-09-15 these two
 * indexable routes were submitted nowhere because nothing else could see them.
 */
type Workstream = {
  slug: "financial" | "scenarios";
  title: string;
  description: string;
  imageAlt: string;
  pageTitle: string;
  pageSummary: string;
};

export const WORKSTREAMS: Record<Workstream["slug"], Workstream> = {
  financial: {
    slug: "financial",
    /* The title in the words people search; the heading keeps the tool's name, which the nav,
       the breadcrumb and every link into this page use. */
    title: "Startup runway calculator: burn, raise timing and a memo",
    description: "Enter cash, monthly spend and revenue to work out your runway, a safe runway band, a raise window and a memo sized to this week's guidance.",
    imageAlt: "Whether startup runway calculator",
    pageTitle: "Runway planner",
    pageSummary: "A startup runway calculator: burn, raise timing and a memo, sized to this week's guidance.",
  },
  scenarios: {
    slug: "scenarios",
    title: "What If Rates Change? Test This Week's Guidance",
    description: "Set a different short-term rate and yield curve and see what the guidance and the rules would be.",
    imageAlt: "Whether scenario studio view",
    pageTitle: "Scenarios",
    pageSummary: "Move two sliders to see what the guidance would be in a different week.",
  },
};

export const workstreamSlugs = Object.keys(WORKSTREAMS) as Workstream["slug"][];

export const isWorkstream = (value: string): value is Workstream["slug"] => value in WORKSTREAMS;
