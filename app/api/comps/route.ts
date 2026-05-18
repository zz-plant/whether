import { NextResponse } from "next/server";
import { fetchSaaSValuations } from "../../../lib/saasMultiples";

export const runtime = "edge";

/* GET /api/comps — returns current SaaS valuation multiples */
export async function GET() {
  try {
    const comps = await fetchSaaSValuations();
    return NextResponse.json({ ok: true, ...comps });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
