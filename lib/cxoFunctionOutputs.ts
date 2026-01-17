/**
 * CXO-level output catalog for the Market Climate Station UX.
 * Captures how market climate signals map into executive decision artifacts.
 */

export type CxoFunctionOutput = {
  role: string;
  focus: string;
  outputs: string[];
};

export const cxoFunctionOutputs: CxoFunctionOutput[] = [
  {
    role: "CFO / Finance Strategy",
    focus: "Capital posture and runway constraints tied to macro climates.",
    outputs: [
      "Runway, burn, and capital efficiency guardrails sourced to Treasury signals.",
      "Budget planning export with market climate narrative and citation-ready sources.",
      "Capital availability watchlist with reversal triggers and risk flags.",
    ],
  },
  {
    role: "COO / Operating Strategy",
    focus: "Company-wide execution posture and operating cadence shifts.",
    outputs: [
      "Operating constraint board aligned to climate shifts.",
      "Cross-functional planning checklist to enforce guardrails.",
      "Cadence guidance for launch timing, vendor spend, and scaling pace.",
    ],
  },
  {
    role: "CTO & CPO / Strategic Planning",
    focus: "Product and engineering posture aligned to macro physics.",
    outputs: [
      "Roadmap posture toggles (growth vs. efficiency) with market climate guidance.",
      "Hiring and pricing decision templates tied to live sensors.",
      "Infrastructure spend guardrails and migration timing signals.",
    ],
  },
  {
    role: "Head of Strategy",
    focus: "Executive briefing and narrative alignment across leadership.",
    outputs: [
      "One-page executive brief with market climate summary, risks, and reversal triggers.",
      "Planning memo generator for leadership syncs with copy-ready language.",
      "Historical context pack to explain why posture changed over time.",
    ],
  },
];
