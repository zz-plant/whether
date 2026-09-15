import { NextResponse } from "next/server";

type VersionedApiEnvelope = {
  generatedAt: string;
  version: string;
  degraded?: boolean;
} & Record<string, unknown>;

export const jsonResponse = <TBody>(
  body: TBody,
  init?: number | ResponseInit,
): NextResponse<TBody> =>
  typeof init === "number" ? NextResponse.json(body, { status: init }) : NextResponse.json(body, init);

export const buildVersionedApiEnvelope = <
  TBody extends VersionedApiEnvelope,
>(
  body: TBody,
): TBody => body;
