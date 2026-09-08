/**
 * Multi-Stakeholder Transmission Synthesizer for Whether.
 * Generates role-specific, copy-ready transmission briefs from the canonical weekly brief data.
 */
import type { WeeklyOperatorBriefPayload } from "./weeklyOperatorBrief";

export type StakeholderRole = "board" | "engineering" | "sales" | "allHands" | "cfo";

export interface StakeholderBrief {
  role: StakeholderRole;
  title: string;
  recipientLabel: string;
  summaryText: string;
  bullets: string[];
  plainText: string;
}

export interface MultiStakeholderBriefs {
  board: StakeholderBrief;
  engineering: StakeholderBrief;
  sales: StakeholderBrief;
  allHands: StakeholderBrief;
  cfo: StakeholderBrief;
}

export function buildStakeholderBriefs(payload: WeeklyOperatorBriefPayload): MultiStakeholderBriefs {
  const date = payload.date;
  const regime = payload.regimeStage;
  const call = payload.currentCall;
  const action = payload.actionNow;
  const guardrail = payload.pauseIf;
  const flip = payload.changeCourseIf || payload.flipTrigger;
  const customNote = payload.customTeamNote?.trim();

  // 1. Board & Investors
  const boardBullets = [
    `Macro Context: Operating under ${regime} conditions with ${payload.confidence.toLowerCase()} signal confidence.`,
    `Executive Call: ${call}.`,
    `Capital Preservation: ${guardrail ? `Guardrail enforced: ${guardrail}.` : `Maintaining strict pacing on fixed outlays.`}`,
    `Reversal Criteria: ${flip}.`,
    `Data Grounding: Provenance verified via live US Treasury & St. Louis FRED feeds as of ${date}.`,
  ];
  if (customNote) {
    boardBullets.splice(2, 0, `Company Context: ${customNote}`);
  }
  const boardText = [
    `**Executive Macro & Capital Posture Update (${date})**`,
    "",
    ...boardBullets.map((b) => `• ${b}`),
  ].join("\n");

  // 2. Engineering Leadership
  const engBullets = [
    `Operational Stance: ${call}.`,
    `Architecture & Infra: Avoid multi-year cloud/cluster reservations; maintain on-demand or convertible tiers for 100% architectural reversibility.`,
    `Headcount & Hiring: ${action}. Priority on core technical infrastructure over speculative features.`,
    `Tripwire: ${guardrail ? `Pause major commitments if: ${guardrail}` : `Maintain reversibility on all commitments.`}`,
  ];
  if (customNote) {
    engBullets.splice(1, 0, `Team Note: ${customNote}`);
  }
  const engText = [
    `**Engineering & Product Operational Brief (${date})**`,
    "",
    ...engBullets.map((b) => `• ${b}`),
  ].join("\n");

  // 3. Sales & GTM
  const salesBullets = [
    `Commercial Posture: Macro conditions are ${regime}. Buyer procurement cycles are actively factoring in capital tightness.`,
    `Discounting Rule: GTM discounts are capped and strictly conditioned on 100% upfront annual cash collection to accelerate working capital.`,
    `Payment Terms: Standard Net-30; payment extensions beyond Net-45 require finance review.`,
    `Current Directive: ${action}`,
  ];
  if (customNote) {
    salesBullets.splice(1, 0, `GTM Context: ${customNote}`);
  }
  const salesText = [
    `**GTM & Commercial Policy Update (${date})**`,
    "",
    ...salesBullets.map((b) => `• ${b}`),
  ].join("\n");

  // 4. Company All-Hands
  const allHandsBullets = [
    `Our focus this week is execution and customer activation. Macro environment is ${regime}, and our capital position remains disciplined and strong.`,
    `Operating Priority: ${action}`,
    `Hiring & Resourcing: Moving steadily on prioritized, high-conviction goals.`,
  ];
  if (customNote) {
    allHandsBullets.splice(1, 0, `Note for the Team: ${customNote}`);
  }
  const allHandsText = [
    `**Team Weekly Focus & Operating Call (${date})**`,
    "",
    `Hey team — here is our operational focus for the week:`,
    "",
    ...allHandsBullets.map((b) => `• ${b}`),
  ].join("\n");

  // 5. CFO & Finance
  const cfoBullets = [
    `Regime & funding pressure: ${regime}. Baseline funding pressure requires proactive runway defense.`,
    `Runway Buffer: Maintain minimum target cash runway buffer; gate unbudgeted OPEX.`,
    `Contract Approvals: Enforce break clauses on vendor contracts >$25k. ${guardrail}`,
    `Reversal Threshold: ${flip}`,
  ];
  if (customNote) {
    cfoBullets.splice(1, 0, `Finance Context: ${customNote}`);
  }
  const cfoText = [
    `**Finance & Treasury Control Directive (${date})**`,
    "",
    ...cfoBullets.map((b) => `• ${b}`),
  ].join("\n");

  return {
    board: {
      role: "board",
      title: "Board & Investor Memo",
      recipientLabel: "Board of Directors & Investors",
      summaryText: `Fiduciary summary dated ${date} under ${regime} conditions.`,
      bullets: boardBullets,
      plainText: boardText,
    },
    engineering: {
      role: "engineering",
      title: "Engineering Leadership Brief",
      recipientLabel: "VP Eng, Tech Leads & Staff Engineers",
      summaryText: "Roadmap reversibility, technical debt pacing, and infra rules.",
      bullets: engBullets,
      plainText: engText,
    },
    sales: {
      role: "sales",
      title: "Sales & Commercial Policy",
      recipientLabel: "Head of Sales, GTM Leads & AEs",
      summaryText: "Discount caps, cash collection rules, and customer credit posture.",
      bullets: salesBullets,
      plainText: salesText,
    },
    allHands: {
      role: "allHands",
      title: "Company All-Hands Update",
      recipientLabel: "All Company Slack / All-Hands Email",
      summaryText: "Jargon-free, calm execution narrative for the entire team.",
      bullets: allHandsBullets,
      plainText: allHandsText,
    },
    cfo: {
      role: "cfo",
      title: "Finance & Treasury Directive",
      recipientLabel: "CFO, VP Finance & Controllers",
      summaryText: "Runway protection, vendor break clauses, and liquidity gates.",
      bullets: cfoBullets,
      plainText: cfoText,
    },
  };
}
