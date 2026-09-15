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
export type Workstream = {
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
    title: "Financial Strategy — Capital Posture This Week",
    description: "CFO and financial operating guardrails aligned with current interest rates and credit conditions.",
    imageAlt: "Whether financial strategy view",
    pageTitle: "Financial strategy",
    pageSummary: "CFO runway planning and capital efficiency settings for the current macro regime.",
  },
  scenarios: {
    slug: "scenarios",
    title: "Scenario Studio — Counterfactual Macro Simulator",
    description: "Interactive counterfactual simulation: test rate cuts, inversions, and stress scenarios against live posture.",
    imageAlt: "Whether scenario studio counterfactual simulator view",
    pageTitle: "Scenario studio",
    pageSummary: "Simulate counterfactual macro conditions, rate cuts, or deeper inversions to stress-test your operating plan.",
  },
};

export const workstreamSlugs = Object.keys(WORKSTREAMS) as Workstream["slug"][];

export const isWorkstream = (value: string): value is Workstream["slug"] => value in WORKSTREAMS;
