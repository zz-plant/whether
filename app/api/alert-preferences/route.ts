import { NextResponse } from "next/server";
import { serverStore, type AlertDeliveryPreferences } from "../../../lib/serverStore";

export const runtime = "edge";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const clientId = url.searchParams.get("clientId") ?? "anonymous";
  return NextResponse.json({ clientId, preferences: serverStore.getPreferences(clientId) });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    clientId?: string;
    preferences?: Partial<AlertDeliveryPreferences>;
  };

  const clientId = body.clientId ?? "anonymous";
  const preferences = serverStore.setPreferences(clientId, body.preferences ?? {});
  return NextResponse.json({ clientId, preferences });
}
