import { NextResponse } from "next/server";
import { constantTimeCompare } from "../constantTimeCompare";

export const requireCronAuth = (request: Request) => {
  const secret = (globalThis as { WHETHER_CRON_SECRET?: string }).WHETHER_CRON_SECRET
    ?? process.env.WHETHER_CRON_SECRET;

  if (!secret) {
    return NextResponse.json({ error: "cron_secret_not_configured" }, { status: 503 });
  }

  const authToken = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!authToken || !constantTimeCompare(authToken, secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
};
