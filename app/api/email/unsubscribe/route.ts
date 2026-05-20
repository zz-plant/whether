import { getSubscriberStore } from "../../../../lib/email/subscriberStore";

export const runtime = "edge";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (token) {
    const store = getSubscriberStore();
    await store.unsubscribe(token);
  }

  return new Response(
    [
      "<!DOCTYPE html><html><body style='font-family:sans-serif;max-width:480px;margin:40px auto;padding:20px;color:#1e293b;text-align:center;'>",
      "<h1 style='font-size:1.1rem;font-weight:600;'>Unsubscribed</h1>",
      "<p style='font-size:0.95rem;color:#64748b;'>You've been unsubscribed from the Whether weekly brief.</p>",
      "<a href='/' style='display:inline-block;margin-top:16px;padding:8px 16px;border-radius:6px;background:#0f172a;color:#fff;text-decoration:none;font-size:0.9rem;'>Return to Whether</a>",
      "</body></html>",
    ].join(""),
    {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    },
  );
}
