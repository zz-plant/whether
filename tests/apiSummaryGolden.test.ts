import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { GET as getWeeklyRoute } from "../app/api/weekly/route";
import { GET as getMonthlyRoute } from "../app/api/monthly/route";
import { GET as getCadenceRoute } from "../app/api/cadence/route";
import { GET as getSummaryDeltaRoute } from "../app/api/summary-delta/route";
import goldenFixture from "./fixtures/apiSummary.golden.json";

const FETCH_DISABLED_ERROR = "Network disabled for summary golden tests";
const originalFetch = globalThis.fetch;

before(() => {
  globalThis.fetch = (async () => {
    throw new Error(FETCH_DISABLED_ERROR);
  }) as typeof fetch;
});

after(() => {
  globalThis.fetch = originalFetch;
});

const projectSummaryResponse = (body: Record<string, any>) => {
  const structured =
    body.summary.regime === "SCARCITY" ||
    body.summary.regime === "DEFENSIVE" ||
    body.summary.regime === "VOLATILE" ||
    body.summary.regime === "EXPANSION"
      ? body.summary.structured
      : null;

  const normalizedStructured =
    structured &&
    "provenance" in structured &&
    structured.provenance &&
    typeof structured.provenance === "object"
      ? {
          ...structured,
          provenance: {
            source: (structured.provenance as { source?: string }).source,
          },
        }
      : structured;

  return {
    version: body.version,
    summary: {
      title: body.summary.title,
      regime: body.summary.regime,
      confidence: body.summary.confidence,
      transitionWatch: body.summary.transitionWatch,
      intensity: body.summary.intensity,
      constraints: body.summary.constraints,
      recordDateLabel: body.summary.recordDateLabel,
      structured: normalizedStructured,
    },
    provenance: {
      sourceLabel: body.provenance.sourceLabel,
      sourceUrl: body.provenance.sourceUrl,
      statusLabel: body.provenance.statusLabel,
      recordDateLabel: body.provenance.recordDateLabel,
    },
    recordDateLabel: body.recordDateLabel,
    summaryHash: body.summaryHash,
    agentHandoff: {
      promptPrefix: String(body.agentHandoff.prompt).split("\n")[0],
      skills: body.agentHandoff.payload.skills.map((skill: { id: string }) => skill.id),
      regimeKey: body.agentHandoff.payload.regime.key,
    },
  };
};

const projectCadenceResponse = (body: Record<string, any>) => ({
  version: body.version,
  alignmentStatus: body.alignmentStatus,
  mismatchedConstraints: body.mismatchedConstraints,
  weekly: {
    regime: body.weeklySummary.regime,
    constraints: body.weeklySummary.constraints,
    recordDateLabel: body.weeklySummary.recordDateLabel,
  },
  monthly: {
    regime: body.monthlySummary.regime,
    constraints: body.monthlySummary.constraints,
    recordDateLabel: body.monthlySummary.recordDateLabel,
  },
});

const projectSummaryDeltaResponse = (body: Record<string, any>) => ({
  version: body.version,
  delta: {
    regime: body.delta.regime,
    constraints: body.delta.constraints,
    provenance: {
      weeklyStatusLabel: body.delta.provenance.weeklyStatusLabel,
      monthlyStatusLabel: body.delta.provenance.monthlyStatusLabel,
      statusChanged: body.delta.provenance.statusChanged,
    },
  },
  summaries: {
    weekly: {
      regime: body.summaries.weekly.regime,
      constraints: body.summaries.weekly.constraints,
      recordDateLabel: body.summaries.weekly.recordDateLabel,
    },
    monthly: {
      regime: body.summaries.monthly.regime,
      constraints: body.summaries.monthly.constraints,
      recordDateLabel: body.summaries.monthly.recordDateLabel,
    },
  },
});

describe("summary API golden contracts", () => {
  it("keeps /api/weekly projection stable", async () => {
    const response = await getWeeklyRoute();
    assert.equal(response.status, 200);
    const body = (await response.json()) as Record<string, any>;
    assert.deepEqual(projectSummaryResponse(body), goldenFixture.weekly);
  });

  it("keeps /api/monthly projection stable", async () => {
    const response = await getMonthlyRoute();
    assert.equal(response.status, 200);
    const body = (await response.json()) as Record<string, any>;
    assert.deepEqual(projectSummaryResponse(body), goldenFixture.monthly);
  });

  it("keeps /api/cadence projection stable", async () => {
    const response = await getCadenceRoute();
    assert.equal(response.status, 200);
    const body = (await response.json()) as Record<string, any>;
    assert.deepEqual(projectCadenceResponse(body), goldenFixture.cadence);
  });

  it("keeps /api/summary-delta projection stable", async () => {
    const response = await getSummaryDeltaRoute();
    assert.equal(response.status, 200);
    const body = (await response.json()) as Record<string, any>;
    assert.deepEqual(projectSummaryDeltaResponse(body), goldenFixture.summaryDelta);
  });
});
