import { NextResponse } from "next/server";
import { buildAgentInterfaceResponse } from "../../../lib/agentInterface";
import { getRegimeContext, getRegimeProjection } from "../../../lib/report/regimeContext";
import { subscribeEmail } from "../../../lib/email/emailDelivery";
import { getTimeMachineMonthsByYear } from "../../../lib/timeMachine/timeMachineCache";


export const runtime = "edge";

/* GET /api/mcp?tool=get_brief[&cadence=weekly]
   GET /api/mcp?tool=get_signals
   GET /api/mcp?tool=get_context  
   POST /api/mcp?tool=subscribe (body: { email }) */

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tool = searchParams.get("tool");

    if (tool === "get_context") {
      const regimeKey = searchParams.get("regime");
      if (!regimeKey) {
        return NextResponse.json({ error: "Missing regime parameter" }, { status: 400 });
      }
      return NextResponse.json({ ok: true, context: getRegimeContext(regimeKey.toUpperCase()) });
    }

    if (tool === "get_signals") {
      return NextResponse.json({
        ok: true,
        coverage: getTimeMachineMonthsByYear(),
      });
    }

    if (tool === "get_comps") {
      const res = await fetch(`${request.url.replace(/\/api\/mcp.*$/, "")}/api/comps`);
      const data = await res.json();
      return NextResponse.json({ ok: true, ...data });
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
      _links: {
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
      await subscribeEmail({ email, name: email.split("@")[0] });
      return NextResponse.json({ ok: true, subscribed: true, email });
    }

    return NextResponse.json({ error: `Unknown tool: ${tool}` }, { status: 400 });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
