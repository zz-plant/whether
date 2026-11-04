import { NextResponse } from "next/server";
import { fetchSecCompanyFiling } from "../../../lib/marketData/secEdgar";
import type { CompanyFilingFailure } from "../../../lib/report/companyFiling";
import { getWhetherKv } from "../../../lib/runtime/kv";
import { checkRateLimit, clientKeyFor } from "../../../lib/runtime/rateLimit";

export const runtime = "edge";

const failed = (failure: CompanyFilingFailure, status: number) =>
  NextResponse.json({ ok: false, failure }, { status, headers: { "cache-control": "no-store" } });

/**
 * GET /api/company-filing?ticker=DOCU — one company's latest figures as filed with the SEC.
 *
 * Filed numbers and no reading of them. It runs when a reader asks, never on the read path, and
 * it is rate limited because each new ticker costs a read of the SEC, which limits this Worker as
 * a whole. Each company-facts file is a few megabytes of JSON, so one is read per call.
 */
export async function GET(request: Request) {
  const decision = await checkRateLimit("WHETHER_PUBLIC_WRITE_RATE_LIMITER", clientKeyFor(request));
  if (!decision.allowed) return failed("rate-limited", 429);

  const ticker = new URL(request.url).searchParams.get("ticker") ?? "";
  const result = await fetchSecCompanyFiling(ticker, { cache: getWhetherKv() });
  if (result.status === "unavailable") return failed("unavailable", 503);
  if (result.status === "refused") return failed(result.refusal, result.refusal === "unknown-ticker" ? 404 : 422);
  return NextResponse.json({ ok: true, filing: result.value }, { headers: { "cache-control": "no-store" } });
}
