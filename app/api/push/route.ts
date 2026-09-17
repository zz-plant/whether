import { NextResponse } from "next/server";
import { requireClientOwner } from "../../../lib/api/clientOwnership";
import { resolveVapidConfig } from "../../../lib/push/vapid";
import {
  deletePushSubscription,
  parsePushSubscription,
  readPushSubscription,
  savePushSubscription,
} from "../../../lib/push/pushSubscriptions";

export const runtime = "edge";
/** Owned, per-browser state. A cached answer here would be another browser's. */
export const revalidate = 0;

/**
 * The browser's end of regime-change notifications.
 *
 * Owned exactly like the decision ledger: `x-whether-client-id` decides whose
 * subscription this is, so nobody can enumerate, replace or cancel anyone
 * else's. The record itself is three fields the push protocol needs and
 * nothing more — no email address, no reading, no history of what was sent.
 *
 * GET answers whether push is available at all, which is what lets the UI
 * decline to offer a control that cannot work: the keys are an operator action
 * and are set on no developer machine.
 */
export async function GET(request: Request) {
  const config = resolveVapidConfig();
  if (!config) {
    return NextResponse.json({ configured: false, subscribed: false, publicKey: null });
  }

  const owner = await requireClientOwner(request);
  /* Unauthenticated is not an error here: a page asking "can I offer this?"
     before it has an id is the normal first call. */
  if (owner.error || !owner.ownerId) {
    return NextResponse.json({ configured: true, subscribed: false, publicKey: config.publicKey });
  }

  const existing = await readPushSubscription(owner.ownerId);
  return NextResponse.json({ configured: true, subscribed: Boolean(existing), publicKey: config.publicKey });
}

export async function POST(request: Request) {
  if (!resolveVapidConfig()) {
    return NextResponse.json({ error: "push_not_configured" }, { status: 503 });
  }

  const owner = await requireClientOwner(request);
  if (owner.error || !owner.ownerId) return owner.error ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const subscription = parsePushSubscription(body, owner.ownerId);
  if (!subscription) return NextResponse.json({ error: "invalid_subscription" }, { status: 400 });

  const stored = await savePushSubscription(subscription);
  if (!stored) return NextResponse.json({ error: "storage_unavailable" }, { status: 503 });

  return NextResponse.json({ subscribed: true });
}

/*
 * Reports failure when the store cannot delete, rather than a cheerful 200.
 * "Stop sending me these" is the one request where claiming success you did not
 * achieve keeps a notification arriving at someone who asked it to stop.
 */
export async function DELETE(request: Request) {
  const owner = await requireClientOwner(request);
  if (owner.error || !owner.ownerId) return owner.error ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const removed = await deletePushSubscription(owner.ownerId);
  if (!removed) return NextResponse.json({ error: "storage_unavailable" }, { status: 503 });

  return NextResponse.json({ subscribed: false });
}
