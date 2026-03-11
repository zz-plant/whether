import { NextResponse } from "next/server";
import { loadReportData } from "../../../lib/report/reportData";

export async function GET() {
  const data = await loadReportData();
  return NextResponse.json(data.currentStateContract, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
