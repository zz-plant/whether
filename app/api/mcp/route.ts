import { NextResponse } from "next/server";
import { AgentInputError, describeToolParams } from "../../../lib/agent/registry";
import { checkAgentToolArguments, describeAgentTools, runAgentTool } from "../../../lib/agent/tools";
import { mcpApiCorsHeaders } from "../../../lib/agentApiCors";
import { buildAgentInterfaceResponse, supportedAgentCadences } from "../../../lib/agentInterface";
import { subscribeAndSendVerification } from "../../../lib/email/subscriptionFlow";
import { handleMcpRequest, isMcpStreamOpenRequest } from "../../../lib/mcp/httpMcpServer";
import { RateLimitedError, rateLimitedResponse } from "../../../lib/runtime/rateLimit";
import { siteUrl } from "../../../lib/siteUrl";
import { QuoteSourceUnavailableError } from "../../../lib/saasMultiples";
import { buildUseConstraint } from "../../../lib/report/useConstraint";

export const runtime = "edge";

/* Two transports share this route:

   1. MCP streamable HTTP (JSON-RPC 2.0): POST /api/mcp with an `initialize` /
      `tools/list` / `tools/call` message — standard MCP clients connect here.
      See lib/mcp/httpMcpServer.ts.

   2. A plain-GET shim, for an agent with no MCP client: every MCP tool answers
      GET /api/mcp?tool=<name>&<argument>=<value>, and GET /api/mcp?tool=get_actions lists
      them with their arguments. The tools are lib/agent/tools.ts, the same definitions the
      MCP transports serve, so a tool added there is here without touching this file.
      Four keep the answer shape they had before there was a registry (`context`,
      `projection`, a bare `coverage`, the comps): callers depend on those.
   POST /api/mcp?tool=subscribe (body: { email }) — subscribe to weekly brief
*/

const wrapLegacy = (tool: string, result: Record<string, unknown>) => {
  switch (tool) {
    case "get_context":
      return { ok: true, context: result };
    case "get_projection":
      return { ok: true, projection: result };
    case "get_comps":
    case "get_signals":
      return { ok: true, ...result };
    default:
      // Any other tool carries its answer under `result`, with the use limits it would carry anywhere.
      return { ok: true, tool, result, use: buildUseConstraint() };
  }
};

const refusalResponse = (error: AgentInputError) =>
  NextResponse.json(
    {
      ok: false,
      error: error.code,
      message: error.message,
      problems: error.problems,
      ...(error.code === "unknown_tool" ? { available: error.problems[0]?.allowed ?? [] } : {}),
    },
    { status: 400 },
  );

const withMcpCors = (response: Response) => {
  for (const [name, value] of Object.entries(mcpApiCorsHeaders)) response.headers.set(name, value);
  return response;
};

export async function GET(request: Request) {
  return withMcpCors(await handleGet(request));
}

async function handleGet(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tool = searchParams.get("tool");

    /* MCP clients open a server SSE stream with GET + Accept: text/event-stream.
       This server has no server-initiated messages, so it declines per spec. */
    if (!tool && isMcpStreamOpenRequest(request)) {
      return new Response(null, { status: 405, headers: { allow: "POST" } });
    }

    if (tool === "get_actions") {
      return NextResponse.json({
        ok: true,
        tools: [
          ...describeAgentTools("http").map((entry) => ({
            name: entry.name,
            params: describeToolParams(entry.arguments),
            description: entry.plainGetNote ? `${entry.description} ${entry.plainGetNote}` : entry.description,
            example: `${siteUrl}/api/mcp?${new URLSearchParams({ tool: entry.name, ...Object.fromEntries(Object.entries(entry.example).map(([key, value]) => [key, String(value)])) })}`,
          })),
          { name: "subscribe", params: "email (POST body)", description: "Subscribe an email to the weekly brief" },
        ],
        /* On the catalogue, so a caller wiring up the tools meets the
           constraint before it calls one of them. */
        use: buildUseConstraint(),
        _links: {
          full_brief: siteUrl,
          history: `${siteUrl}/history`,
          trust: `${siteUrl}/trust`,
        },
        mcp: {
          transport: "streamable-http",
          endpoint: `${siteUrl}/api/mcp`,
          note: "POST JSON-RPC 2.0 (initialize / tools/list / tools/call) to this URL with no ?tool param.",
        },
      });
    }

    if (tool === "subscribe") {
      return NextResponse.json(
        { ok: false, error: "method_not_allowed", message: 'subscribe takes a POST with a JSON body: { "email": "you@example.com" }.' },
        { status: 405, headers: { allow: "POST" } },
      );
    }

    if (tool && tool !== "get_brief") {
      const args = Object.fromEntries([...searchParams].filter(([key]) => key !== "tool"));
      return NextResponse.json(wrapLegacy(tool, await runAgentTool(tool, args, "http")));
    }

    /* Default: get the brief */
    /* The cadence arrived from the query string and was cast straight into the
       union, so `?cadence=bogus` fell through every branch of the builder to the
       yearly summary and came back labelled with whatever the caller sent. It is
       checked by the same definition the MCP tool uses, so it is refused the same
       way, with the cadences there are.

       Fields are then read with `in` narrowing rather than `as any`: only the
       weekly and monthly summaries carry an action or a record date, and the
       cast was reporting them as null for the cadences that do have them under
       a different name. */
    const args = Object.fromEntries([...searchParams].filter(([key]) => key !== "tool"));
    checkAgentToolArguments("get_brief", args, "http");
    const requestedCadence = (searchParams.get("cadence") ?? "weekly").trim().toLowerCase();
    const cadence = supportedAgentCadences.find((candidate) => candidate === requestedCadence) ?? "weekly";
    const brief = await buildAgentInterfaceResponse(cadence);
    const summary = brief.summary;

    return NextResponse.json({
      ok: true,
      tool: "get_brief",
      cadence,
      regime: "regime" in summary ? summary.regime : null,
      action: "guidance" in summary ? summary.guidance : null,
      recordDate: "recordDateLabel" in summary ? summary.recordDateLabel : null,
      /* The published confidence, the one the page and `/api/scores` carry: this read the
         summary's `confidence`, the engine's own label, and said MEDIUM against a page that
         said High. `confidencePercent` beside it is the same reading as a number. */
      confidence: brief.confidence.label,
      confidencePercent: brief.confidence.percent,
      posture: "regimeLabel" in summary ? summary.regimeLabel : null,
      /* This is the response that carries an action against a decision area
         named `hiring`, returned to a caller with no person in the loop. */
      use: buildUseConstraint(),
      links: {
        full_brief: siteUrl,
        history: `${siteUrl}/history`,
        trust: `${siteUrl}/trust`,
        api_docs: `${siteUrl}/api/agent`,
      },
    });
  } catch (error) {
    /* A caller's wrong tool or argument is theirs to fix and is told how, not a 500. */
    if (error instanceof AgentInputError) {
      return refusalResponse(error);
    }

    /* An unreachable quote source is not a fault in this server. `/api/comps` has
       answered 503 for exactly this since the "not an empty basket" fix; the MCP tool
       wrapping the same call fell through to the generic catch and answered 500, so an
       agent following the tool advertised in /llms.txt was told the server had broken
       rather than that an upstream was down and the call is worth retrying. */
    if (error instanceof QuoteSourceUnavailableError) {
      return NextResponse.json({
        ok: false,
        error: "quote_source_unavailable",
        detail: error.message,
      }, { status: 503 });
    }

    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const response = await handlePost(request);
  // Only the JSON-RPC transport is open to a browser; `?tool=subscribe` sends an email.
  return new URL(request.url).searchParams.get("tool") ? response : withMcpCors(response);
}

export async function OPTIONS(request: Request) {
  const preflight = new Response(null, { status: 204 });
  return new URL(request.url).searchParams.get("tool") === "subscribe" ? preflight : withMcpCors(preflight);
}

async function handlePost(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tool = searchParams.get("tool");

    /* No ?tool param → MCP streamable-HTTP transport (JSON-RPC 2.0). */
    if (!tool) {
      return handleMcpRequest(request);
    }

    if (tool === "subscribe") {
      const body = await request.json().catch(() => ({}));
      const email = body.email;
      if (!email || !email.includes("@")) {
        return NextResponse.json({ error: "Invalid email" }, { status: 400 });
      }
      const { subscriber } = await subscribeAndSendVerification({ email, request });
      return NextResponse.json({ ok: true, subscribed: true, email: subscriber.email, message: "Check your email to confirm." });
    }

    return NextResponse.json({ error: `Unknown tool: ${tool}`, available: ["subscribe"] }, { status: 400 });
  } catch (error) {
    if (error instanceof RateLimitedError) {
      return rateLimitedResponse(error.retryAfterSeconds);
    }
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
