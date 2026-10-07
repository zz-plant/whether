import { NextResponse } from "next/server";
import { assembleHomePage } from "../../../lib/report/homePageAssembler";
import { buildDecisionMemo } from "../../../lib/report/homeBrief/briefArtifactBuilder";

export const runtime = "edge";
export const revalidate = 300;

export async function GET() {
  return NextResponse.json(buildDecisionMemo(await assembleHomePage({})));
}
