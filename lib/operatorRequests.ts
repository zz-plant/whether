/**
 * Curated list of post-MVP operator requests for the Market Climate Station flow.
 * Captures expected expansion demand while preserving traceability and plain-English framing.
 */

export type OperatorRequestStatus = "DELIVERED" | "BACKLOG";

export const operatorRequests: Array<{
  title: string;
  description: string;
  status: OperatorRequestStatus;
}> = [
  {
    title: "Broaden macro inputs",
    description:
      "Add inflation, unemployment, and credit spreads alongside the yield curve with explicit source URLs.",
    status: "DELIVERED",
  },
  {
    title: "Adjustable market climate thresholds",
    description:
      "Let operators tune thresholds with an audit trail and defaults for transparent overrides.",
    status: "DELIVERED",
  },
  {
    title: "Expanded Decision Shield actions",
    description:
      "Cover M&A, infrastructure spend, geographic expansion, and restructuring decisions.",
    status: "DELIVERED",
  },
  {
    title: "Export-ready briefs",
    description: "Offer PDF, slide-ready, and scheduled email/Slack summaries.",
    status: "DELIVERED",
  },
  {
    title: "Insight Database",
    description:
      "Attach citations and historical precedent to the playbook guidance for defensibility.",
    status: "DELIVERED",
  },
  {
    title: "Historical comparisons",
    description: "Show then-vs-now market climate diffs with clear deltas and context.",
    status: "BACKLOG",
  },
  {
    title: "Market climate change alerts",
    description: "Notify teams with reason codes when the market climate flips.",
    status: "DELIVERED",
  },
  {
    title: "Saved scenarios",
    description: "Persist Decision Shield inputs as team presets and templates.",
    status: "DELIVERED",
  },
  {
    title: "Deep provenance",
    description: "Expose source URLs, formulas, and timestamps for every sensor.",
    status: "DELIVERED",
  },
  {
    title: "API access",
    description: "Provide an embedding/export endpoint for internal dashboards.",
    status: "BACKLOG",
  },
];
