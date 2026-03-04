export type StartupRegimePage = {
  slug: "expansion" | "defensive" | "volatile" | "scarcity";
  title: string;
  summary: string;
  hiring: string;
  product: string;
  finance: string;
  flipSignal: string;
};

export const startupMacroPostureIndexName = "Whether Startup Macro Posture Index (SMPI)";

export const regimePages: StartupRegimePage[] = [
  {
    slug: "expansion",
    title: "Expansion posture",
    summary: "Risk appetite is supportive, tightness is contained, and long-cycle bets are allowed with milestones.",
    hiring: "Add targeted capacity tied to validated growth levers.",
    product: "Scale proven roadmap bets with release and ROI guardrails.",
    finance: "Increase investment pace while protecting payback discipline.",
    flipSignal: "Flip out if risk appetite drops below threshold or tightness rises above constraint trigger.",
  },
  {
    slug: "defensive",
    title: "Defensive posture",
    summary: "Conditions remain investable but fragile, requiring staged approvals and strict sequencing.",
    hiring: "Backfill mission-critical roles and defer speculative openings.",
    product: "Prioritize retention, reliability, and near-term revenue support.",
    finance: "Preserve cash flexibility and gate discretionary programs.",
    flipSignal: "Flip out if two weaker reads stack and thresholds are crossed.",
  },
  {
    slug: "volatile",
    title: "Volatile posture",
    summary: "Signals are mixed, so optionality is the operating default.",
    hiring: "Stay selective and tie approvals to 1–2 quarter payback.",
    product: "Run milestone-gated launches with rollback ownership.",
    finance: "Fund reversible bets and avoid long lock-in commitments.",
    flipSignal: "Flip out when risk/tightness proximity narrows around boundaries.",
  },
  {
    slug: "scarcity",
    title: "Scarcity posture",
    summary: "Capital conditions are constrained, forcing efficiency-first execution.",
    hiring: "Freeze non-critical hiring and protect reliability delivery.",
    product: "Cut scope to must-win commitments and PMF protection.",
    finance: "Preserve runway and require immediate payback on spend.",
    flipSignal: "Flip out only after sustained improvement above risk thresholds and below tightness triggers.",
  },
];

export const findRegimePage = (slug: string) => regimePages.find((page) => page.slug === slug);

export const signalTranslationPages = [
  { slug: "yield-curve-and-startups", title: "Yield curve and startups", href: "/signals" },
  { slug: "bbb-spread-and-startup-risk", title: "BBB spread and startup risk", href: "/signals" },
  { slug: "treasury-rates-and-saas-valuations", title: "Treasury rates and SaaS valuations", href: "/signals" },
  { slug: "venture-capital-risk-appetite-indicator", title: "VC risk appetite indicator", href: "/signals" },
];
