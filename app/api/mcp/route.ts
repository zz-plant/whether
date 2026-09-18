import { NextResponse } from "next/server";
import { buildAgentInterfaceResponse, isAgentCadence } from "../../../lib/agentInterface";
import { getRegimeContext, getRegimeProjection } from "../../../lib/report/regimeContext";
import { subscribeAndSendVerification } from "../../../lib/email/subscriptionFlow";
import { getTimeMachineMonthsByYear } from "../../../lib/timeMachine/timeMachineCache";
import { fetchSaaSValuations, QuoteSourceUnavailableError } from "../../../lib/saasMultiples";
import { handleMcpRequest, isMcpStreamOpenRequest } from "../../../lib/mcp/httpMcpServer";
import { RateLimitedError, rateLimitedResponse } from "../../../lib/runtime/rateLimit";
import { siteUrl } from "../../../lib/siteUrl";
import { buildUseConstraint } from "../../../lib/report/useConstraint";

export const runtime = "edge";

/* Two transports share this route:

   1. MCP streamable HTTP (JSON-RPC 2.0): POST /api/mcp with an `initialize` /
      `tools/list` / `tools/call` message — standard MCP clients connect here.
      See lib/mcp/httpMcpServer.ts.

   2. Legacy `?tool=` REST API, kept for existing integrations:
   GET /api/mcp?tool=get_brief[&cadence=weekly] — current brief
   GET /api/mcp?tool=get_context&regime=DEFENSIVE — regime duration + trajectory
   GET /api/mcp?tool=get_projection&regime=DEFENSIVE&tightness=74&riskAppetite=32&tightnessDelta=4&riskAppetiteDelta=-2 — scenario projection
   GET /api/mcp?tool=get_comps — SaaS valuation multiples
   GET /api/mcp?tool=get_signals — available data coverage
   GET /api/mcp?tool=get_actions — discoverable action catalog
   POST /api/mcp?tool=subscribe (body: { email }) — subscribe to weekly brief
*/

export async function GET(request: Request) {
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
          { name: "get_brief", params: "cadence (optional: weekly/monthly/quarterly/yearly)", description: "Current regime, action, confidence" },
          { name: "get_context", params: "regime (required)", description: "How long this regime has been active, historical average, common next regime" },
          { name: "get_projection", params: "regime, tightness, riskAppetite, tightnessDelta, riskAppetiteDelta", description: "Weeks until threshold crossing at current velocity" },
          { name: "get_comps", params: "none", description: "Median SaaS EV/Revenue multiple from 15 public companies" },
          { name: "get_signals", params: "none", description: "Available historical data coverage by year/month" },
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

    if (tool === "get_context") {
      const regimeKey = searchParams.get("regime");
      if (!regimeKey) {
        return NextResponse.json({ error: "Missing regime parameter" }, { status: 400 });
      }
      return NextResponse.json({ ok: true, context: getRegimeContext(regimeKey.toUpperCase()) });
    }

    if (tool === "get_projection") {
      const regime = searchParams.get("regime");
      const tightness = Number(searchParams.get("tightness"));
      const riskAppetite = Number(searchParams.get("riskAppetite"));
      const tightnessDelta = Number(searchParams.get("tightnessDelta") ?? 0);
      const riskAppetiteDelta = Number(searchParams.get("riskAppetiteDelta") ?? 0);
      if (!regime || !tightness || !riskAppetite) {
        return NextResponse.json({ error: "Missing required parameters: regime, tightness, riskAppetite" }, { status: 400 });
      }
      const projection = getRegimeProjection(
        regime.toUpperCase(), tightness, riskAppetite,
        tightnessDelta, riskAppetiteDelta
      );
      return NextResponse.json({ ok: true, projection });
    }

    if (tool === "get_comps") {
      const comps = await fetchSaaSValuations();
      return NextResponse.json({ ok: true, ...comps });
    }

    if (tool === "get_signals") {
      return NextResponse.json({
        ok: true,
        coverage: getTimeMachineMonthsByYear(),
      });
    }

    /* Default: get the brief */
    /* The cadence arrived from the query string and was cast straight into the
       union, so `?cadence=bogus` fell through every branch of the builder to the
       yearly summary and came back labelled with whatever the caller sent. Use
       the same guard `/api/agent` and the stdio MCP server already use.

       Fields are then read with `in` narrowing rather than `as any`: only the
       weekly and monthly summaries carry an action or a record date, and the
       cast was reporting them as null for the cadences that do have them under
       a different name. */
    const requestedCadence = searchParams.get("cadence") ?? "weekly";
    const cadence = isAgentCadence(requestedCadence) ? requestedCadence : "weekly";
    const brief = await buildAgentInterfaceResponse(cadence);
    const summary = brief.summary;

    return NextResponse.json({
      ok: true,
      tool: "get_brief",
      cadence,
      regime: "regime" in summary ? summary.regime : null,
      action: "guidance" in summary ? summary.guidance : null,
      recordDate: "recordDateLabel" in summary ? summary.recordDateLabel : null,
      confidence: "confidence" in summary ? summary.confidence : null,
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
