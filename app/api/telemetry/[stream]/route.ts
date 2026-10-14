import { NextResponse } from "next/server";
import { writeAnalytics, type TelemetryStream } from "../../../../lib/telemetry/analyticsEngine";
import { isWebVitalMetric } from "../../../../lib/webVitalsTelemetry";
import { isOperatorWorkflowEvent } from "../../../../lib/operatorWorkflowTelemetry";
import { isActivationEvent } from "../../../../lib/activationFunnel";
import { isContentMeasurementEvent } from "../../../../lib/contentMeasurement";
import { isSearchTelemetryEvent } from "../../../../lib/searchTelemetry";
import { checkRateLimit, clientKeyFor, rateLimitedResponse } from "../../../../lib/runtime/rateLimit";

export const runtime = "edge";

/**
 * What a browser may write here, and the validator each one is checked against.
 *
 * The accepted set is this map's keys, which is the point. It used to be a
 * separate list of ten names checked against a chain of `if`s, and five of the
 * ten had no validator in that chain — so they were accepted, unexamined, and
 * written straight through. Two of those five (`ingest-pipeline`, `cron-step`)
 * are authored by the Worker and by nothing else, and `cron-step` is read back
 * and rendered on `/trust` as "Scheduled runs": anyone could have posted a run
 * that never happened onto the page whose job is to be trustworthy. A third
 * had a dedicated route of its own, which shadowed this one for that path
 * anyway, so its entry here was a weaker door that Next never opened. The last
 * two were written by nothing at all.
 *
 * Deriving the set from the validators makes the missing-validator case
 * unreachable rather than merely noticed: a stream with no entry cannot be
 * posted, and adding one without a validator does not typecheck.
 */
const STREAM_VALIDATORS = {
  "web-vitals": isWebVitalMetric,
  "operator-workflow": isOperatorWorkflowEvent,
  activation: isActivationEvent,
  "content-measurement": isContentMeasurementEvent,
  search: isSearchTelemetryEvent,
} satisfies Partial<Record<TelemetryStream, (input: unknown) => boolean>>;

type BrowserWritableStream = keyof typeof STREAM_VALIDATORS;

const isBrowserWritableStream = (value: string): value is BrowserWritableStream =>
  Object.hasOwn(STREAM_VALIDATORS, value);

export async function POST(
  request: Request,
  context: { params: Promise<{ stream: string }> | { stream: string } },
) {
  const params = await Promise.resolve(context.params);
  const stream = params?.stream;

  if (!stream || !isBrowserWritableStream(stream)) {
    return NextResponse.json({ ok: false, error: "invalid_stream" }, { status: 400 });
  }

  /* Public by necessity (browser telemetry), so per-address volume is the only guard the
     intake has. The limiter is a Workers binding; absent, the check allows. */
  const limit = await checkRateLimit("WHETHER_PUBLIC_WRITE_RATE_LIMITER", clientKeyFor(request));
  if (!limit.allowed) {
    return rateLimitedResponse();
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  /* Every accepted stream has one, by construction. The search and content
     validators are strict about extra keys as well as shape: those streams
     promise to carry no query text and no referrer, so an unexpected key is
     refused rather than stored with the key ignored. */
  if (!STREAM_VALIDATORS[stream](payload)) {
    return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });
  }

  const doubles =
    stream === "web-vitals" && isWebVitalMetric(payload)
      ? [payload.value, payload.delta]
      : undefined;

  writeAnalytics(stream, payload, { doubles });

  return NextResponse.json({ ok: true }, { status: 202 });
}
