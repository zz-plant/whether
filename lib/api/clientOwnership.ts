import { NextResponse } from "next/server";
import { constantTimeCompare } from "../constantTimeCompare";
import { CLIENT_ID_HEADER } from "./clientIdHeader";
import { CLIENT_TOKEN_HEADER, verifyClientToken } from "./clientToken";

type ClientOwner = {
  ownerId: string | null;
  /**
   * Whether the server can vouch for the id, rather than having been handed it.
   *
   * The check below proves the header and the body agree, which they always do:
   * one caller wrote both. Only a valid signed token makes the id mean anything,
   * and callers that predate tokens — the CLI, an agent, a curl from the docs —
   * still work, unverified. What changes is that nothing downstream may treat an
   * unverified write as an attested human act.
   */
  verified: boolean;
  error: NextResponse | null;
};

export const requireClientOwner = async (
  request: Request,
  claimedClientId?: unknown,
): Promise<ClientOwner> => {
  const ownerId = request.headers.get(CLIENT_ID_HEADER)?.trim();
  if (!ownerId || ownerId.length < 3 || ownerId.length > 128) {
    return {
      ownerId: null,
      verified: false,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  if (typeof claimedClientId === "string" && !constantTimeCompare(ownerId, claimedClientId)) {
    return {
      ownerId: null,
      verified: false,
      error: NextResponse.json({ error: "owner_mismatch" }, { status: 403 }),
    };
  }

  const verified = await verifyClientToken(ownerId, request.headers.get(CLIENT_TOKEN_HEADER));

  return { ownerId, verified, error: null };
};
