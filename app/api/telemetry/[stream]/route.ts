import { NextResponse } from "next/server";
import { writeAnalytics, type TelemetryStream } from "../../../../lib/telemetry/analyticsEngine";
import { isWebVitalMetric } from "../../../../lib/webVitalsTelemetry";
import { isOperatorWorkflowEvent } from "../../../../lib/operatorWorkflowTelemetry";
import { isActivationEvent } from "../../../../lib/activationFunnel";
import { isContentMeasurementEvent } from "../../../../lib/contentMeasurement";

export const runtime = "edge";

const VALID_STREAMS = new Set<string>([
  "web-vitals",
  "operator-workflow",
  "activation",
  "content-measurement",
  "premium-funnel",
  "ingest-pipeline",
  "cron-step",
  "regime-transition",
  "degraded-state",
]);

const isTelemetryStream = (value: string): value is TelemetryStream => VALID_STREAMS.has(value);

export async function POST(
  request: Request,
  context: { params: Promise<{ stream: string }> | { stream: string } },
) {
  const params = await Promise.resolve(context.params);
  const stream = params?.stream;

  if (!stream || !isTelemetryStream(stream)) {
    return NextResponse.json({ ok: false, error: "invalid_stream" }, { status: 400 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  // Optional validator checks per stream
  if (stream === "web-vitals" && !isWebVitalMetric(payload)) {
    return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });
  }
  if (stream === "operator-workflow" && !isOperatorWorkflowEvent(payload)) {
    return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });
  }
  if (stream === "activation" && !isActivationEvent(payload)) {
    return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });
  }
  if (stream === "content-measurement" && !isContentMeasurementEvent(payload)) {
    return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });
  }

  const doubles =
    stream === "web-vitals" && isWebVitalMetric(payload)
      ? [payload.value, payload.delta]
      : undefined;

  writeAnalytics(stream, payload, { doubles });

  return NextResponse.json({ ok: true }, { status: 202 });
}
