import { type NextRequest, NextResponse } from "next/server";
import { getDecisionEventStore, type RegimeDecisionEvent } from "../../../lib/events/decisionEventStore";
import type { RegimeKey } from "../../../lib/regimeEngine";
import { constantTimeCompare } from "../../../lib/constantTimeCompare";

export const runtime = "edge";
export const revalidate = 0;

const parseLimit = (value: string | null) => {
  if (!value) {
    return 50;
  }
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    return 50;
  }
  return Math.max(1, Math.min(parsed, 200));
};

const toRegimeKey = (value: string | null): RegimeKey | null => {
  if (value === "SCARCITY" || value === "DEFENSIVE" || value === "VOLATILE" || value === "EXPANSION") {
    return value;
  }
  return null;
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

export async function GET(request: NextRequest) {
  const authToken = request.headers?.get?.("authorization")?.replace("Bearer ", "");
  const expectedToken = process.env.WHETHER_CRON_SECRET;
  if (expectedToken && (!authToken || !constantTimeCompare(authToken, expectedToken))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const nextUrl = request.nextUrl;
  const params = nextUrl.searchParams;
  const cursor = params.get("cursor");
  const limit = parseLimit(params.get("limit"));
  const replay = params.get("replay") === "1";
  const initialState = toRegimeKey(params.get("initialState"));

  const store = getDecisionEventStore();
  const listed = await store.listSince(cursor, limit);
  const events = listed.events.slice(0, limit);
  const baseIndex = cursor ? Number.parseInt(cursor, 10) + 1 : 0;
  const nextCursor = events.length > 0 ? `${baseIndex + events.length - 1}` : cursor;
  const hasMore = listed.events.length > limit;

  const response: {
    events: RegimeDecisionEvent[];
    pagination: {
      cursor: string | null;
      nextCursor: string | null;
      limit: number;
      returned: number;
      hasMore: boolean;
    };
    replay?: {
      initialState: RegimeKey;
      finalState: RegimeKey;
      eventCount: number;
    };
  } = {
    events,
    pagination: {
      cursor,
      nextCursor,
      limit,
      returned: events.length,
      hasMore,
    },
  };

  if (replay) {
    if (!initialState) {
      return json({ error: "initialState is required when replay=1" }, 400);
    }

    response.replay = {
      initialState,
      finalState: store.replay(initialState, events),
      eventCount: events.length,
    };
  }

  return json(response);
}
