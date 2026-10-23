import { NextResponse } from "next/server";
import {
  buildDecisionMemoryEntry,
  buildDecisionMemorySnapshotEntry,
  type DecisionMemoryPayload,
  type DecisionMemorySnapshotPayload,
  toDecisionMemoryCsv,
} from "../../../lib/decisionMemory";
import {
  buildDecisionFollowUpRecord,
  parseDecisionFollowUpPayload,
} from "../../../lib/decisionFollowUp";
import { getDecisionMemoryRepository } from "../../../lib/storage/decisionMemoryRepository";
import { requireClientOwner } from "../../../lib/api/clientOwnership";
import {
  REVISABLE_DELEGATION_SCHEMA_URL,
  toRevisableDelegationNdjson,
  toRevisableDelegationRecords,
} from "../../../lib/export/revisableDelegationRecord";
import { resolveSiteUrl } from "../../../lib/siteUrl";

export const runtime = "edge";

const asDecisionPayload = (value: unknown): DecisionMemoryPayload | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const payload = value as Partial<DecisionMemoryPayload>;
  if (
    typeof payload.recordDate !== "string"
    || !payload.decision
    || !payload.outcome
    || !payload.assessment
  ) {
    return null;
  }

  return payload as DecisionMemoryPayload;
};

/**
 * The weekly brief logs a standing posture, not a decision-shield verdict, so it
 * posts a lighter shape than DecisionMemoryPayload.
 */
const asSnapshotPayload = (value: unknown): DecisionMemorySnapshotPayload | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const payload = value as Partial<DecisionMemorySnapshotPayload>;
  if (
    payload.kind !== "posture-snapshot"
    || typeof payload.recordDate !== "string"
    || typeof payload.regime !== "string"
    || typeof payload.primaryCall !== "string"
    || payload.primaryCall.trim() === ""
  ) {
    return null;
  }

  return payload as DecisionMemorySnapshotPayload;
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const format = url.searchParams.get("format");
  const clientId = url.searchParams.get("clientId") ?? undefined;
  const owner = await requireClientOwner(request, clientId);
  if (owner.error) return owner.error;
  const repository = getDecisionMemoryRepository();
  const listed = await repository.list({ limit: 64, clientId: owner.ownerId! });
  const followUps = await repository.listFollowUps({ clientId: owner.ownerId! });
  const degraded = repository.backendStatus() === "local-fallback";

  if (format === "csv") {
    const csv = toDecisionMemoryCsv(listed.entries);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": "attachment; filename=decision-memory.csv",
        "x-whether-storage": repository.backendStatus(),
      },
    });
  }

  if (format === "records") {
    const records = await toRevisableDelegationRecords(listed.entries, { baseUrl: resolveSiteUrl() });
    return new NextResponse(toRevisableDelegationNdjson(records), {
      status: 200,
      headers: {
        "content-type": "application/x-ndjson; charset=utf-8",
        "content-disposition": "attachment; filename=decision-memory.records.ndjson",
        "x-whether-record-schema": REVISABLE_DELEGATION_SCHEMA_URL,
        "x-whether-storage": repository.backendStatus(),
      },
    });
  }

  return NextResponse.json({
    entries: listed.entries,
    followUps: followUps.followUps,
    count: listed.entries.length,
    degraded,
    backend: repository.backendStatus(),
  });
}

export async function POST(request: Request) {
  const repository = getDecisionMemoryRepository();
  const degraded = repository.backendStatus() === "local-fallback";

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ entries: [], count: 0, error: "invalid-json", degraded, backend: repository.backendStatus() }, { status: 400 });
  }

  const followUp = parseDecisionFollowUpPayload(payload);
  const snapshot = followUp ? null : asSnapshotPayload(payload);
  const parsed = followUp || snapshot ? null : asDecisionPayload(payload);
  if (!followUp && !snapshot && !parsed) {
    return NextResponse.json({ entries: [], count: 0, error: "invalid-payload", degraded, backend: repository.backendStatus() }, { status: 400 });
  }
  const claimedClientId = followUp?.clientId ?? snapshot?.clientId ?? parsed?.clientId;
  const owner = await requireClientOwner(request, claimedClientId);
  if (owner.error) return owner.error;
  if (followUp) followUp.clientId = owner.ownerId!;
  if (snapshot) snapshot.clientId = owner.ownerId!;
  if (parsed) parsed.clientId = owner.ownerId!;

  if (followUp) {
    /* A follow-up attaches to one of this browser's own entries; one aimed at
       a record that is not on the record must not silently become invisible
       junk that never renders (the view joins by entry id). */
    const listed = await repository.list({ limit: 64, clientId: owner.ownerId! });
    if (!listed.entries.some((entry) => entry.id === followUp.entryId)) {
      return NextResponse.json({ created: false, error: "unknown-entry", degraded, backend: repository.backendStatus() }, { status: 400 });
    }
    const record = buildDecisionFollowUpRecord(followUp);
    await repository.appendFollowUp(record);
    return NextResponse.json({
      created: true,
      followUp: record,
      degraded,
      backend: repository.backendStatus(),
    });
  }

  const entry = snapshot
    ? buildDecisionMemorySnapshotEntry(snapshot)
    : buildDecisionMemoryEntry(parsed as DecisionMemoryPayload);

  /* An idempotency key means a retried or replayed write of the same decision:
     the server may have already appended it before the response was lost. Serve
     the existing entry instead of appending a second, duplicate row. */
  if (!snapshot && entry.writeId) {
    const existing = await repository.findByWriteId(entry.context.clientId, entry.writeId);
    if (existing) {
      return NextResponse.json({
        created: false,
        duplicate: true,
        entry: existing,
        count: (await repository.list({ limit: 64, clientId: entry.context.clientId })).entries.length,
        degraded,
        backend: repository.backendStatus(),
      });
    }
  }

  /* The route is the only place that knows whether the request was vouched for,
     so it is the only place that may promote an owner claim to a verified one.
     Everything downstream reads `verifiedOwner` and cannot manufacture it. */
  if (owner.verified && entry.owner) {
    entry.verifiedOwner = entry.owner;
  }
  await repository.append(entry);
  const listed = await repository.list({ limit: 64, clientId: entry.context.clientId });

  return NextResponse.json({
    created: true,
    entry,
    entries: listed.entries,
    count: listed.entries.length,
    degraded,
    backend: repository.backendStatus(),
  });
}
