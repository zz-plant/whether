import { NextResponse } from "next/server";
import {
  DEFAULT_ALERT_PREFERENCES,
  getAlertPreferenceRepository,
  type AlertPreferences,
} from "../../../lib/storage/alertPreferenceRepository";

export const runtime = "edge";

const isAlertPreferences = (value: unknown): value is AlertPreferences => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const asRecord = value as Record<string, unknown>;
  return ["slack", "email", "webhook"].every((channel) => typeof asRecord[channel] === "boolean");
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const clientId = url.searchParams.get("clientId");
  const repository = getAlertPreferenceRepository();
  const degraded = repository.backendStatus() === "local-fallback";

  if (!clientId) {
    return NextResponse.json({ preferences: DEFAULT_ALERT_PREFERENCES, error: "clientId-required", degraded, backend: repository.backendStatus() }, { status: 400 });
  }

  const stored = await repository.get(clientId);

  return NextResponse.json({
    preferences: stored ?? DEFAULT_ALERT_PREFERENCES,
    degraded,
    backend: repository.backendStatus(),
  });
}

export async function POST(request: Request) {
  const repository = getAlertPreferenceRepository();
  const degraded = repository.backendStatus() === "local-fallback";

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ preferences: DEFAULT_ALERT_PREFERENCES, error: "invalid-json", degraded, backend: repository.backendStatus() }, { status: 400 });
  }

  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ preferences: DEFAULT_ALERT_PREFERENCES, error: "invalid-payload", degraded, backend: repository.backendStatus() }, { status: 400 });
  }

  const candidate = payload as { clientId?: unknown; preferences?: unknown };
  if (typeof candidate.clientId !== "string" || !candidate.clientId || !isAlertPreferences(candidate.preferences)) {
    return NextResponse.json({ preferences: DEFAULT_ALERT_PREFERENCES, error: "invalid-payload", degraded, backend: repository.backendStatus() }, { status: 400 });
  }

  const preferences = await repository.upsert(candidate.clientId, candidate.preferences);
  return NextResponse.json({ preferences, degraded, backend: repository.backendStatus() });
}
