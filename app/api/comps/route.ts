import { NextResponse } from "next/server";
import { fetchSaaSValuations, QuoteSourceUnavailableError } from "../../../lib/saasMultiples";

export const runtime = "edge";

/* GET /api/comps — returns current SaaS valuation multiples */
export async function GET() {
  try {
    const comps = await fetchSaaSValuations();
    return NextResponse.json({ ok: true, ...comps });
  } catch (error) {
    // An unreachable source is not an empty basket. Reporting ok:true with
    // companyCount 0 told every caller the multiples were genuinely absent.
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
