import { NextResponse } from "next/server";
import {
  defaultDeliveryPreferences,
  getDeliveryPreferences,
  setDeliveryPreferences,
  type DeliveryPreferences,
} from "../../../lib/alertPreferencesStore";

export const runtime = "edge";

const getClientIdFromRequest = (request: Request) => {
  const url = new URL(request.url);
  return url.searchParams.get("clientId")?.trim() ?? "";
};

export async function GET(request: Request) {
  const clientId = getClientIdFromRequest(request);
  if (!clientId) {
    return NextResponse.json({ preferences: defaultDeliveryPreferences() });
  }
  return NextResponse.json({ preferences: getDeliveryPreferences(clientId) });
}

export async function POST(request: Request) {
  const payload = (await request.json()) as {
    clientId?: string;
    preferences?: Partial<DeliveryPreferences>;
  };
  const clientId = payload.clientId?.trim();
  if (!clientId) {
    return NextResponse.json(
      { error: "clientId is required" },
      { status: 400 },
    );
  }

  const nextPreferences: DeliveryPreferences = {
    ...defaultDeliveryPreferences(),
    ...payload.preferences,
  };
  setDeliveryPreferences(clientId, nextPreferences);
  return NextResponse.json({ preferences: nextPreferences });
}
