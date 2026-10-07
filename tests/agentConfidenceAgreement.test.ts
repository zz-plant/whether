import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { GET as getAgent } from "../app/api/agent/route";
import { GET as getCliStatus } from "../app/api/cli/status/route";
import { GET as getMcpShim } from "../app/api/mcp/route";
import { GET as getFeed } from "../app/feed.xml/route";
import { buildAgentInterfaceFromContext, loadAgentInterfaceContext } from "../lib/agentInterface";
import { resolvePublishedConfidence } from "../lib/report/confidence";
import { formatConfidenceChipLabel } from "../lib/report/reportFormatting";
import { formatConfidenceSentence } from "../lib/summary/summaryFormatting";
import { NextRequest } from "next/server";

/*
 * An agent gating on confidence asks whichever endpoint it happens to know, so
 * they have to give the same answer as the page. `summary.confidence` was the
 * engine's own label (its confirmation gate, not a published fact): on the Sep 25
 * read `/api/agent`, the legacy `get_brief` tool and the RSS item said MEDIUM
 * while the page, `/api/scores` and the CLI said HIGH.
 */
describe("the agent interface's confidence", () => {
  it("is the published one, in the field and in the sentence beside it, whatever the engine's gate says", async () => {
    const context = await loadAgentInterfaceContext("test");
    const published = context.postureState.currentState;
    // The engine's own label, made to disagree with the published one.
    const engineLabel = published.confidenceLabel === "LOW" ? "HIGH" : "LOW";
    const disagreeing = {
      ...context,
      reportData: {
        ...context.reportData,
        assessment: {
          ...context.reportData.assessment,
          diagnostics: { ...context.reportData.assessment.diagnostics, confidence: engineLabel },
        },
      },
    } satisfies typeof context;

    const brief = buildAgentInterfaceFromContext("weekly", disagreeing);
    const publishedInEngineWords = published.confidenceLabel === "MED" ? "MEDIUM" : published.confidenceLabel;

    assert.deepEqual(brief.confidence, { label: published.confidenceLabel, percent: published.confidencePercent });
    assert.equal(brief.summary.confidence, publishedInEngineWords);
    assert.ok(
      brief.summary.summary.includes(formatConfidenceSentence(publishedInEngineWords)),
      "the prose says what the field says",
    );
    assert.ok(
      !brief.summary.summary.includes(formatConfidenceSentence(engineLabel === "LOW" ? "LOW" : "HIGH")),
      "and not what the engine's gate says",
    );
  });

  it("agrees across every surface an agent might ask, for the same week", async () => {
    // The function every page reads its confidence from, off the same week's record.
    const { assessment, treasury } = (await loadAgentInterfaceContext("test")).reportData;
    const expected = resolvePublishedConfidence({ assessment, record: treasury });

    const agent = await (await getAgent(new Request("https://whether.work/api/agent"))).json();
    const cli = await (await getCliStatus(new NextRequest("https://whether.work/api/cli/status"))).json();
    const shim = await (await getMcpShim(new Request("https://whether.work/api/mcp?tool=get_brief"))).json();

    assert.deepEqual(agent.confidence, expected, "/api/agent");
    assert.equal(agent.summary.confidence === "MEDIUM" ? "MED" : agent.summary.confidence, expected.label, "/api/agent summary");
    assert.equal(cli.confidence.label, expected.label, "/api/cli/status");
    assert.equal(cli.confidence.score, expected.percent, "/api/cli/status percent");
    assert.equal(shim.confidence, expected.label, "/api/mcp?tool=get_brief");
    assert.equal(shim.confidencePercent, expected.percent, "/api/mcp?tool=get_brief percent");
  });

  it("is worded as the archive items word theirs in the live RSS item", async () => {
    const { assessment, treasury } = (await loadAgentInterfaceContext("test")).reportData;
    const expected = resolvePublishedConfidence({ assessment, record: treasury });
    const feed = await (await getFeed()).text();

    assert.ok(
      feed.includes(`. ${formatConfidenceChipLabel(expected.label)}.</description>`),
      "the live item carries the published confidence, not the engine's code",
    );
    assert.doesNotMatch(feed, /Confidence: (LOW|MEDIUM|HIGH)\b/);
    // The phrase names itself; under a label it read "Confidence: Medium confidence."
    assert.doesNotMatch(feed, /Confidence:(<\/strong>)? (High|Medium|Low) confidence/);
  });
});
