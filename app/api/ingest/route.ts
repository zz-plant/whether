import { NextResponse } from "next/server";
import { requireCronAuth } from "../../../lib/api/cronAuth";
import { executeIngest } from "../../../lib/ingestion/executeIngest";

export const runtime = "edge";

export async function POST(request: Request) {
  const authError = requireCronAuth(request);
  if (authError) return authError;

  const result = await executeIngest();
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 502 });
  }
  return NextResponse.json(result);
}
