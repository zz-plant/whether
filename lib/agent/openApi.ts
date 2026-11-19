import { agentStateSchema } from "../agentState";
import { supportedAgentCadences } from "../agentInterface";
import { DECISION_MODELS } from "../jev/jevClient";
import { MCP_SERVER_INFO } from "../mcp/serverIdentity";
import { AGENT_VIEWS, API_DOCS_PATH, DEFAULT_AGENT_VIEW, WHETHER_AGENT_MANIFEST_PATH } from "./discovery";
import { toPublishedJsonSchema } from "./jsonSchema";
import { describeAgentTools } from "./tools";

/**
 * The OpenAPI 3.1 description of Whether's public HTTP reads: the `service-desc` the API catalog
 * (`/.well-known/api-catalog`) points an agent to.
 *
 * Only the routes the agent manifest and `/api-docs` already advertise as public reads are here,
 * so robots.txt opens every path this lists (`tests/apiCatalog.test.ts`). The views, cadences,
 * decision models and MCP tool names are read from the constants the routes check, and the
 * compact state's schema is the one `get_state` returns, so a value this lists is one the route
 * accepts. Response bodies other than the state are described as objects, not invented shapes:
 * `/api-docs` and `docs/developer/api-reference.md` describe their fields.
 */

const json = (description: string, schema: Record<string, unknown> = { type: "object" }) => ({
  description,
  content: { "application/json": { schema } },
});

const refusal = (description: string) => json(description, { $ref: "#/components/schemas/Refusal" });

const read = (operationId: string, summary: string, extra: Record<string, unknown> = {}) => ({
  get: {
    operationId,
    summary,
    responses: { "200": json(summary) },
    ...extra,
  },
});

const cadenceParam = {
  name: "cadence",
  in: "query",
  required: false,
  description: "The horizon of the brief. Only weekly is published as a call; the others are context.",
  schema: { type: "string", enum: [...supportedAgentCadences], default: "weekly" },
};

export const buildOpenApiDocument = (baseUrl: string) => {
  const getTools = ["get_actions", ...describeAgentTools("http").map((tool) => tool.name)];

  return {
    openapi: "3.1.0",
    info: {
      title: "Whether API",
      version: "v1",
      summary: "Weekly operating guidance for startup leaders.",
      description:
        "Public, read-only JSON. No account, key or OAuth; every operation here answers a plain GET. " +
        `Start with GET /api/agent?view=state and read automation.ready before acting on a reading without a person looking. ` +
        `The agent manifest (${baseUrl}${WHETHER_AGENT_MANIFEST_PATH}) lists the same endpoints with the MCP tools and their arguments.`,
      license: { name: "MIT", identifier: "MIT" },
    },
    externalDocs: { description: "API reference", url: `${baseUrl}${API_DOCS_PATH}` },
    servers: [{ url: baseUrl }],
    // No operation takes credentials; stated, so a client does not look for a scheme.
    security: [],
    paths: {
      "/api/agent": {
        get: {
          operationId: "getAgentBrief",
          summary: "The brief for an agent: the full report, the compact state, or what changed since a week.",
          parameters: [
            cadenceParam,
            {
              name: "view",
              in: "query",
              required: false,
              description: "full is the whole brief; state is the compact answer to decide from (weekly only); changes is whether the published call changed since a week.",
              schema: { type: "string", enum: [...AGENT_VIEWS], default: DEFAULT_AGENT_VIEW },
            },
            { name: "since", in: "query", required: false, description: "With view=changes: the published week to compare from, as 2026-w41.", schema: { type: "string" } },
            { name: "week", in: "query", required: false, description: "A frozen published week, as 2026-w41. Not combined with another view.", schema: { type: "string" } },
            { name: "period", in: "query", required: false, description: "An archive quarter or year, as 2024-q1 or 2023. Not combined with another view.", schema: { type: "string" } },
            { name: "format", in: "query", required: false, description: "jev returns this week's call as a typesafe Jev request.", schema: { type: "string", enum: ["jev"] } },
            { name: "model", in: "query", required: false, description: "With format=jev: the decision model.", schema: { type: "string", enum: Object.keys(DECISION_MODELS), default: "jev" } },
            { name: "input", in: "query", required: false, description: "With format=jev: the input type. Audio and video need clef-omni.", schema: { type: "string", enum: ["text", "audio", "video"], default: "text" } },
          ],
          responses: {
            "200": {
              description: "The brief. With view=state, the compact state.",
              content: {
                "application/json": {
                  schema: { oneOf: [{ $ref: "#/components/schemas/AgentState" }, { type: "object" }] },
                },
              },
            },
            "400": refusal("An unknown cadence, view or format, or a combination the route does not answer; the body lists what it accepts."),
            "404": refusal("An unknown week or period; the body lists the ones on record."),
          },
        },
      },
      "/api/mcp": {
        get: {
          operationId: "callAgentTool",
          summary: "The MCP tools as a plain GET, for an agent with no MCP client.",
          description: "tool=get_actions lists every tool with its arguments and a call that works. A tool's arguments are passed as further query parameters.",
          parameters: [
            { name: "tool", in: "query", required: true, schema: { type: "string", enum: getTools } },
          ],
          responses: {
            "200": json("The tool's result."),
            "400": refusal("An unknown tool or argument; the body says what would have worked."),
          },
        },
        post: {
          operationId: "mcpJsonRpc",
          summary: `The MCP server (${MCP_SERVER_INFO.name}), streamable HTTP transport, JSON-RPC 2.0.`,
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["jsonrpc", "method"],
                  properties: {
                    jsonrpc: { const: "2.0" },
                    id: { type: ["string", "integer"] },
                    method: { type: "string", examples: ["initialize", "tools/list", "tools/call"] },
                    params: { type: "object" },
                  },
                },
              },
            },
          },
          responses: { "200": json("The JSON-RPC response.") },
        },
      },
      "/api/weekly": read("getWeeklySummary", "The weekly summary with structured fields and a summary hash."),
      "/api/monthly": read("getMonthlySummary", "The monthly summary with structured fields and a summary hash."),
      "/api/quarterly": read("getQuarterlySummary", "The quarterly summary with provenance."),
      "/api/yearly": read("getYearlySummary", "The yearly summary with provenance."),
      "/api/cadence": read("getCadenceAlignment", "Whether the weekly and monthly readings agree, with the mismatches."),
      "/api/treasury": read("getTreasuryYields", "The Treasury yields the scores read, with live or fallback metadata."),
      "/api/posture/current": read("getCurrentPosture", "The current guidance as a small stable object."),
      "/api/scores": read("getScores", "Both scores, their deltas, and the distance to the change line."),
      "/api/decision": read("getDecision", "The week's guidance: the action, each area's pause and restart lines, and what would change it."),
      "/api/comps": read("getComps", "The SaaS basket's median EV/Revenue, with the source that answered.", {
        responses: { "200": json("The basket median and its source."), "503": refusal("No source answered.") },
      }),
    },
    components: {
      schemas: {
        AgentState: toPublishedJsonSchema(agentStateSchema),
        Refusal: {
          type: "object",
          required: ["error"],
          properties: { error: { type: "string" } },
          description: "Carries the values the route accepts, under a name such as allowedViews or allowedCadences.",
        },
      },
    },
  };
};
