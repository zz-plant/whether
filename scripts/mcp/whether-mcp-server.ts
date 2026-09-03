import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  buildAgentInterfaceResponse,
  pullRecentSiteInfo,
  supportedAgentCadences,
  type AgentCadence,
} from "../../lib/agentInterface.js";
import { agentSkills } from "../../lib/agentSkills.js";
import {
  buildCanonicalBoundedDecisionRules,
  formatBoundedDecisionTriplet,
} from "../../lib/report/boundedDecisionRules.js";
import { DEFAULT_THRESHOLDS, type RegimeKey } from "../../lib/regimeEngineCore.js";
import { loadCanonicalReportInputs } from "../../lib/ingestion/materialized.js";
import type { SignalKey } from "../../lib/ingestion/types.js";

const cadenceSchema = z.enum(supportedAgentCadences);
const defaultCadence: AgentCadence = "weekly";

const server = new McpServer({
  name: "whether-agent-interface",
  version: "1.0.0",
});

server.registerTool("get_agent_brief", {
  description: "Fetch a cadence-specific Whether summary with structured agent handoff payload and prompt.",
  inputSchema: {
    cadence: cadenceSchema.optional(),
  },
}, async ({ cadence }: { cadence?: AgentCadence }) => {
  try {
    const resolvedCadence = cadence ?? defaultCadence;
    const response = await buildAgentInterfaceResponse(resolvedCadence);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(response, null, 2) }],
    };
  } catch (error) {
    return {
      content: [{ type: "text" as const, text: JSON.stringify({
        error: "Failed to fetch agent brief",
        message: error instanceof Error ? error.message : String(error),
        cadence: cadence ?? "weekly",
      }, null, 2) }],
      isError: true,
    };
  }
});

server.registerTool("list_agent_skills", {
  description: "List Whether agent skills expected by the agent handoff payload.",
  inputSchema: {},
}, async () => {
  try {
    return {
      content: [{ type: "text" as const, text: JSON.stringify({ skills: agentSkills }, null, 2) }],
    };
  } catch (error) {
    return {
      content: [{ type: "text" as const, text: JSON.stringify({
        error: "Failed to list skills",
        message: error instanceof Error ? error.message : String(error),
      }, null, 2) }],
      isError: true,
    };
  }
});

server.registerTool("pull_recent_site_info", {
  description: "Pull the latest Whether site agent brief from /api/agent so downstream agents can use fresh site context.",
  inputSchema: {
    cadence: cadenceSchema.optional(),
    siteUrl: z.string().optional(),
  },
}, async ({ cadence, siteUrl }: { cadence?: AgentCadence; siteUrl?: string }) => {
  try {
    const recentInfo = await pullRecentSiteInfo({
      cadence: cadence ?? defaultCadence,
      siteBaseUrl: siteUrl,
    });
    return {
      content: [{ type: "text" as const, text: JSON.stringify(recentInfo, null, 2) }],
    };
  } catch (error) {
    return {
      content: [{ type: "text" as const, text: JSON.stringify({
        error: "Failed to pull site info",
        message: error instanceof Error ? error.message : String(error),
        cadence: cadence ?? "weekly",
      }, null, 2) }],
      isError: true,
    };
  }
});

const isRegimeKey = (value: string): value is RegimeKey =>
  value === "SCARCITY" || value === "DEFENSIVE" || value === "VOLATILE" || value === "EXPANSION";

const isSignalKey = (key: string): key is SignalKey =>
  key === "TREASURY_1M" || key === "TREASURY_3M" || key === "TREASURY_2Y" || key === "TREASURY_10Y" ||
  key === "BBB_CREDIT_SPREAD" || key === "HY_CREDIT_SPREAD" || key === "UNEMPLOYMENT_RATE" ||
  key === "CPI_YOY" || key === "CHICAGO_FCI" || key === "VIX_INDEX";

server.registerTool("get_decision_rules", {
  description: "Returns the set of bounded decision rules (action, threshold, reversal) for a given regime or all regimes if none specified.",
  inputSchema: {
    regime: z.string().optional(),
  },
}, async ({ regime }) => {
  try {
    let targetRegime: RegimeKey | undefined;
    if (regime) {
      if (!isRegimeKey(regime)) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ error: `Invalid regime: ${regime}` }, null, 2) }],
          isError: true,
        };
      }
      targetRegime = regime;
    }

    const ALL_REGIMES: RegimeKey[] = ["SCARCITY", "DEFENSIVE", "VOLATILE", "EXPANSION"];
    const regimesToProcess: RegimeKey[] = targetRegime ? [targetRegime] : ALL_REGIMES;

    const results: Record<string, unknown> = {};

    for (const r of regimesToProcess) {
      const rules = buildCanonicalBoundedDecisionRules({
        regime: r,
        thresholds: DEFAULT_THRESHOLDS,
        scores: { tightness: 50, riskAppetite: 50 },
      });

      const summaries = rules.map((rule) => ({
        area: rule.area,
        ...formatBoundedDecisionTriplet(rule),
      }));

      if (regime) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify(summaries, null, 2) }],
        };
      }
      results[r] = summaries;
    }

    return {
      content: [{ type: "text" as const, text: JSON.stringify(results, null, 2) }],
    };
  } catch (error) {
    return {
      content: [{ type: "text" as const, text: JSON.stringify({
        error: "Failed to fetch decision rules",
        message: error instanceof Error ? error.message : String(error),
      }, null, 2) }],
      isError: true,
    };
  }
});

server.registerTool("get_recent_history", {
  description: "Returns the trailing 92-day history for a specific signal key, allowing agents to perform temporal analysis without parsing the entire report.",
  inputSchema: {
    signal_key: z.string(),
  },
}, async ({ signal_key }) => {
  try {
    if (!isSignalKey(signal_key)) {
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ error: `Invalid signal key: ${signal_key}` }, null, 2) }],
        isError: true,
      };
    }

    const inputs = await loadCanonicalReportInputs();
    if (!inputs) {
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ error: "Failed to load canonical report inputs" }, null, 2) }],
        isError: true,
      };
    }
    const history = inputs.materializedSignals.recentHistory?.[signal_key];

    if (!history) {
      return {
        content: [{ type: "text" as const, text: JSON.stringify({
          error: "No history found for the specified signal key",
          signal_key,
        }, null, 2) }],
        isError: true,
      };
    }

    return {
      content: [{ type: "text" as const, text: JSON.stringify(history, null, 2) }],
    };
  } catch (error) {
    return {
      content: [{ type: "text" as const, text: JSON.stringify({
        error: "Failed to fetch recent history",
        message: error instanceof Error ? error.message : String(error),
      }, null, 2) }],
      isError: true,
    };
  }
});

/* Start stdio transport for local MCP integration (e.g., Claude Desktop, AI IDEs).
   For remote/HTTP access, use the /api/agent endpoint directly or expose the MCP server
   via the app router with the StreamableHTTP transport. */
const transport = new StdioServerTransport();
await server.connect(transport);

