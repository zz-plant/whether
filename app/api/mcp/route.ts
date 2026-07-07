import { NextResponse } from "next/server";
import { buildAgentInterfaceResponse } from "../../../lib/agentInterface";
import { getRegimeContext, getRegimeProjection } from "../../../lib/report/regimeContext";
import { subscribeAndSendVerification } from "../../../lib/email/subscriptionFlow";
import { getTimeMachineMonthsByYear } from "../../../lib/timeMachine/timeMachineCache";
import { fetchSaaSValuations } from "../../../lib/saasMultiples";

export const runtime = "edge";

/* MCP tools for AI agents:
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
        _links: {
          full_brief: "https://whether.work",
          history: "https://whether.work/history",
          trust: "https://whether.work/trust",
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
    const cadence = searchParams.get("cadence") ?? "weekly";
    const brief = await buildAgentInterfaceResponse(cadence as "weekly" | "monthly" | "quarterly" | "yearly");
    const summary = (brief as any).summary ?? {};

    return NextResponse.json({
      ok: true,
      tool: "get_brief",
      cadence,
      regime: summary.regime ?? null,
      action: summary.action ?? null,
      recordDate: summary.recordDate ?? null,
      confidence: summary.confidence ?? null,
      posture: summary.postureLabel ?? null,
      links: {
        full_brief: "https://whether.work",
        history: "https://whether.work/history",
        trust: "https://whether.work/trust",
        api_docs: "https://whether.work/api/agent",
      },
    });
  } catch (error) {
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
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
