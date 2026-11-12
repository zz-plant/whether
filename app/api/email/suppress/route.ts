import { NextResponse } from "next/server";
import { requireCronAuth } from "../../../../lib/api/cronAuth";
import { getSubscriberStore } from "../../../../lib/email/subscriberStore";

export const runtime = "edge";

/**
 * POST /api/email/suppress — stop sending to one address without deleting it.
 *
 * A hard bounce or a complaint means the mailbox is gone or does not want the
 * mail; retrying it every Monday is how a sender reputation decays. The record
 * stays so the address can be un-suppressed by hand, and so the reason it left
 * is not lost.
 *
 * Bounces and complaints do not come through here. Cloudflare takes a bounce on
 * its own bounce domain and lists the address, so none reaches this Worker; the
 * next send to the address is refused, and two refusals a day apart suppress it
 * (`recordDeliveryRefusal` in lib/email/subscriberStore.ts). This route is for an
 * operator stopping an address by hand.
 */
export async function POST(request: Request) {
  const authError = requireCronAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email.trim() : "";
    if (!email || !email.includes("@")) {
      return NextResponse.json({ ok: false, error: "Valid email required." }, { status: 400 });
    }

    const suppressed = await getSubscriberStore().suppress(email);
    return NextResponse.json({ ok: true, suppressed, email });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
