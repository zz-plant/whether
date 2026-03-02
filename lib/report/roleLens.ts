export const ROLE_LENS_PARAM_KEY = "lens";
export const ROLE_LENS_STORAGE_KEY = "whether-role-lens";

export const roleLensOptions = [
  { key: "pm", label: "PM" },
  { key: "engineering", label: "Engineering" },
  { key: "finance", label: "Finance" },
  { key: "exec", label: "Exec" },
] as const;

export type RoleLensKey = (typeof roleLensOptions)[number]["key"];

export type RoleLensCopy = {
  home: {
    pageSummary: string;
    decision: string;
    sequence: Array<{ title: string; detail: string }>;
  };
  operations: {
    pageSummary: string;
    decision: string;
    sequence: Array<{ title: string; detail: string }>;
  };
};

const defaultRoleLens: RoleLensKey = "pm";

const roleLensCopyMap: Record<RoleLensKey, RoleLensCopy> = {
  pm: {
    home: {
      pageSummary: "Verdict and immediate product prioritization call for this planning cycle.",
      decision: "Translate the macro regime into product sequencing, retention focus, and launch risk posture.",
      sequence: [
        {
          title: "Review weekly product posture",
          detail: "Confirm whether roadmap scope should contract, hold, or expand this cycle.",
        },
        {
          title: "Re-rank roadmap bets",
          detail: "Shift investment toward retention and proven ROI when constraints tighten.",
        },
        {
          title: "Set launch guardrails",
          detail: "Define kill criteria and reversible rollout conditions for near-term launches.",
        },
      ],
    },
    operations: {
      pageSummary: "Run weekly product execution decisions and align roadmap priorities for this cycle.",
      decision: "Turn the regime into product plan calls: what to ship, pause, and instrument this month.",
      sequence: [
        {
          title: "Review product monthly summary",
          detail: "Confirm roadmap commitments and team focus for the month.",
        },
        {
          title: "Apply product playbook",
          detail: "Choose which bets to start, stop, and fence based on macro posture.",
        },
        {
          title: "Sync finance dependencies",
          detail: "Validate spend and expected payback before locking roadmap commitments.",
        },
      ],
    },
  },
  engineering: {
    home: {
      pageSummary: "Verdict and immediate engineering capacity call for this planning cycle.",
      decision: "Translate the macro regime into engineering staffing, reliability load, and delivery risk posture.",
      sequence: [
        {
          title: "Review weekly capacity posture",
          detail: "Decide whether to protect core reliability or scale build throughput this cycle.",
        },
        {
          title: "Re-rank technical work",
          detail: "Prioritize reliability and efficiency work before long-cycle platform expansions.",
        },
        {
          title: "Set delivery guardrails",
          detail: "Define staffing and scope limits for launches that require sustained investment.",
        },
      ],
    },
    operations: {
      pageSummary: "Run weekly engineering execution decisions and align delivery priorities for this cycle.",
      decision: "Turn the regime into engineering calls: where to deploy capacity, defer debt, and enforce guardrails.",
      sequence: [
        {
          title: "Review engineering monthly summary",
          detail: "Confirm reliability, platform, and feature capacity allocations for the month.",
        },
        {
          title: "Apply engineering playbook",
          detail: "Choose which initiatives to start, stop, and fence based on delivery risk.",
        },
        {
          title: "Sync finance constraints",
          detail: "Validate headcount and infrastructure spend limits before execution commitments.",
        },
      ],
    },
  },
  finance: {
    home: {
      pageSummary: "Verdict and immediate capital allocation call for this planning cycle.",
      decision: "Translate the macro regime into runway protection, payback discipline, and commitment pacing.",
      sequence: [
        {
          title: "Review weekly capital posture",
          detail: "Confirm near-term liquidity stance and tolerance for new commitments.",
        },
        {
          title: "Re-rank spend priorities",
          detail: "Shift budget toward fast-payback programs when funding tightness rises.",
        },
        {
          title: "Set commitment guardrails",
          detail: "Define approval thresholds and trigger points for discretionary investments.",
        },
      ],
    },
    operations: {
      pageSummary: "Run weekly capital decisions and align budget guardrails for this cycle.",
      decision: "Turn the regime into finance calls: preserve runway, gate spend, and phase investment timing.",
      sequence: [
        {
          title: "Review finance monthly summary",
          detail: "Confirm cash posture and commitment envelope for the month.",
        },
        {
          title: "Apply finance playbook",
          detail: "Choose where to start, stop, and fence investments against payback targets.",
        },
        {
          title: "Sync operating leaders",
          detail: "Align product and engineering plans to approved budget posture.",
        },
      ],
    },
  },
  exec: {
    home: {
      pageSummary: "Verdict and immediate company-level operating call for this planning cycle.",
      decision: "Translate the macro regime into enterprise priorities, risk posture, and cross-functional trade-offs.",
      sequence: [
        {
          title: "Review weekly operating posture",
          detail: "Confirm if the business should defend core outcomes or press selective expansion.",
        },
        {
          title: "Re-rank company bets",
          detail: "Concentrate leadership focus on initiatives with the clearest strategic return.",
        },
        {
          title: "Set governance guardrails",
          detail: "Define escalation rules for hiring, spend, and launch commitments.",
        },
      ],
    },
    operations: {
      pageSummary: "Run weekly executive decisions and align cross-functional priorities for this cycle.",
      decision: "Turn the regime into executive calls: sequence company bets, set guardrails, and align operators.",
      sequence: [
        {
          title: "Review executive monthly summary",
          detail: "Confirm enterprise priorities and operating constraints for the month.",
        },
        {
          title: "Apply executive playbook",
          detail: "Choose where to start, stop, and fence strategic commitments.",
        },
        {
          title: "Sync finance strategy",
          detail: "Validate funding posture before approving irreversible commitments.",
        },
      ],
    },
  },
};

export const parseRoleLens = (
  searchParams?: Record<string, string | string[] | undefined>
): RoleLensKey => {
  const candidate = searchParams?.[ROLE_LENS_PARAM_KEY];
  const normalizedCandidate = Array.isArray(candidate) ? candidate[0] : candidate;

  if (!normalizedCandidate || typeof normalizedCandidate !== "string") {
    return defaultRoleLens;
  }

  const normalized = normalizedCandidate.toLowerCase();
  if (roleLensOptions.some((lens) => lens.key === normalized)) {
    return normalized as RoleLensKey;
  }

  return defaultRoleLens;
};

export const getRoleLensCopy = (lens: RoleLensKey): RoleLensCopy => roleLensCopyMap[lens];
