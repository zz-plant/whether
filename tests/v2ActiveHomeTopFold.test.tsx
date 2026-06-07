import assert from "node:assert/strict";
import { describe, it, mock } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { buildWeeklyDecisionCardModel } from "./factories/weeklyDecisionCardModel";

const mockAny: any = mock;

mockAny.module("next/navigation", () => ({
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({
    push: () => {},
    replace: () => {},
    refresh: () => {},
    prefetch: () => {},
  }),
}));

mockAny.module("next/link", () => ({
  __esModule: true,
  default: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));

mockAny.module("next/headers", () => ({
  cookies: async () => ({ toString: () => "" }),
}));

mockAny.module("@base-ui/react/toast", () => ({
  Toast: {
    useToastManager: () => ({ add: () => {} }),
  },
}));

const weeklyDecisionCardModel = buildWeeklyDecisionCardModel({
  status: {
    postureWithStageLabel: "Expansion — Early",
    confidenceLabel: "HIGH",
    trendLabel: "Easing",
  },
  decision: {
    actionNowShort: "Advance reversible roadmap and revenue-linked hiring bets.",
    revisitDecisions: true,
    weeklyLeadershipSummary: {
      boldnessScore: 63,
      boldnessDelta: 4,
      notchShiftLabel: "+1 notch",
      shorthandLine: "We're +1 notch bold this week.",
      hiringWindow: "Open",
      expansionWindow: "Strong",
      raiseWindow: "Improving",
      netDeltaLabel: "Slightly more aggressive than last week.",
      stabilityWeeks: 3,
      last4Boldness: [58, 61, 59, 63],
      hiringTrend: "Strengthening",
      expansionTrend: "Cooling",
    },
  },
  diagnostics: {
    currentScores: {
      tightness: 52,
      riskAppetite: 68,
    },
  },
});

mockAny.module("../lib/report/homePageAssemblyLoader", () => ({
  loadHomePageAssembly: async () => ({
    homepage: {
      reportResult: { ok: true, data: {}, fallback: {} },
      reportShell: {
        regime: "EXPANSION",
        showOfflineBadge: false,
        degradedSourceRows: [],
        recordDateLabel: "Jun 7, 2026",
        fetchedAtLabel: "0h ago",
        treasurySource: "FRED",
      },
      weeklyDecisionCardModel,
    },
    regimeHistory: [
      { record_date: "2026-03-01", regime: "MIXED" },
      { record_date: "2026-04-01", regime: "EXPANSION" },
      { record_date: "2026-05-01", regime: "EXPANSION" },
      { record_date: "2026-06-01", regime: "EXPANSION" },
    ],
    operatorContext: { companyStage: "series-a" },
  }),
}));

mockAny.module("../lib/agentInterface", () => ({
  isAgentCadence: () => false,
  buildAgentInterfaceResponse: async () => null,
}));

describe("active home route v2 top fold", () => {
  it("renders the one-screen weekly brief labels in the required scan order", async () => {
    const [{ default: ActiveHomePage }, { default: V2Page, V2PageContent }] = await Promise.all([
      import("../app/page"),
      import("../app/v2/page"),
    ]);
    assert.equal(ActiveHomePage, V2Page);

    const html = renderToStaticMarkup(await V2PageContent({ searchParams: {} }));

    const labels = [
      "THIS WEEK",
      "Boldness budget:",
      "Hiring window:",
      "Expansion window:",
      "Raise window:",
      "Stability:",
      "Net delta:",
      "spoken shorthand",
      "bounded guardrails",
      "memory rail",
      "compact confidence strip",
    ];

    let lastIndex = -1;
    for (const label of labels) {
      const index = html.indexOf(label);
      assert.ok(index > lastIndex, `${label} should render after the previous required label`);
      lastIndex = index;
    }

    assert.match(html, /data-testid="weekly-top-fold"/);
    assert.match(html, /lg:grid-cols-12/);
    assert.match(html, /lg:grid-cols-4/);
    assert.match(html, /We’re \+1 notch bold this week\./);
    assert.match(html, /Revisit last week’s roadmap\/hiring decisions\?/);
    assert.match(html, /YES — Regime shift detected\./);
    assert.match(html, /Last 4 weeks: Boldness 58 → 61 → 59 → 63/);
    assert.match(html, /Data freshness:.*0h/);
    assert.match(html, /Inputs complete:.*Yes/);
  });
});
