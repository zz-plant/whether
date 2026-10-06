import { NextResponse } from "next/server";
import { constantTimeCompare } from "../constantTimeCompare";
import { readSetting } from "../runtime/settings";

export const requireCronAuth = (request: Request) => {
  const secret = readSetting("WHETHER_CRON_SECRET", { trim: false });

  if (!secret) {
    return NextResponse.json({ error: "cron_secret_not_configured" }, { status: 503 });
  }

  const authToken = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!authToken || !constantTimeCompare(authToken, secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
};
