import { NextResponse } from "next/server";
import { fetchTreasuryData } from "../../../lib/treasury/treasuryClient";
import { snapshotData } from "../../../lib/snapshot";

export { edgeRuntime as runtime } from "../../../lib/next-runtime";
export const revalidate = 86400;
export const dynamic = "force-dynamic";

export async function GET() {
  const data = await fetchTreasuryData({ snapshotFallback: snapshotData });
  return NextResponse.json(data);
}
