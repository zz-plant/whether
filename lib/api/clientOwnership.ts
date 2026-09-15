import { NextResponse } from "next/server";
import { constantTimeCompare } from "../constantTimeCompare";

const CLIENT_ID_HEADER = "x-whether-client-id";

export const requireClientOwner = (request: Request, claimedClientId?: unknown) => {
  const ownerId = request.headers.get(CLIENT_ID_HEADER)?.trim();
  if (!ownerId || ownerId.length < 3 || ownerId.length > 128) {
    return { ownerId: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  if (typeof claimedClientId === "string" && !constantTimeCompare(ownerId, claimedClientId)) {
    return { ownerId: null, error: NextResponse.json({ error: "owner_mismatch" }, { status: 403 }) };
  }

  return { ownerId, error: null };
};
