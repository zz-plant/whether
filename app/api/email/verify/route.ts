import { NextResponse } from "next/server";
import { getSubscriberStore } from "../../../../lib/email/subscriberStore";

export const runtime = "edge";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return NextResponse.redirect(new URL("/?subscribe=missing-token", request.url));
    }

    const store = getSubscriberStore();
    const ok = await store.verifyEmail(token);

    if (ok) {
      return NextResponse.redirect(new URL("/?subscribed=1", request.url));
    }
    return NextResponse.redirect(new URL("/?subscribe=invalid-token", request.url));
  } catch {
    return NextResponse.redirect(new URL("/?subscribe=error", request.url));
  }
}
