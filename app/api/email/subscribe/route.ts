import { NextResponse } from "next/server";
import { getSubscriberStore } from "../../../../lib/email/subscriberStore";
import { createCloudflareEmailAdapter } from "../../../../lib/email/emailDelivery";

export const runtime = "edge";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email.trim() : "";

    if (!email || !email.includes("@")) {
      return NextResponse.json({ ok: false, error: "Valid email required." }, { status: 400 });
    }

    const store = getSubscriberStore();
    const subscriber = await store.subscribe(email);

    const verifyUrl = `https://whether.work/api/email/verify?token=${encodeURIComponent(subscriber.token)}`;

    const adapter = createCloudflareEmailAdapter();
    await adapter.send({
      to: { email: subscriber.email },
      subject: "Confirm your Whether subscription",
      html: [
        "<!DOCTYPE html><html><body style='font-family:sans-serif;max-width:480px;margin:0 auto;padding:20px;color:#1e293b;'>",
        "<h1 style='font-size:1.1rem;font-weight:600;'>Confirm your subscription</h1>",
        "<p style='font-size:0.95rem;'>Click the button to confirm you want the Whether weekly brief.</p>",
        `<a href='${verifyUrl}' style='display:inline-block;padding:10px 20px;border-radius:6px;background:#0f172a;color:#fff;text-decoration:none;font-weight:600;'>Confirm subscription</a>`,
        "<p style='font-size:0.8rem;color:#64748b;margin-top:20px;'>If you didn't request this, ignore this email.</p>",
        "</body></html>",
      ].join(""),
      text: `Confirm your Whether subscription: ${verifyUrl}`,
    });

    return NextResponse.json({ ok: true, message: "Check your email to confirm." });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
