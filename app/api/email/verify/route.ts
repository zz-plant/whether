import { getSubscriberStore } from "../../../../lib/email/subscriberStore";
import {
  confirmationLead,
  describeConfirmation,
  describeSubscription,
  escapeHtml,
} from "../../../../lib/email/subscriptionFlow";

export const runtime = "edge";

/*
 * Opening the link shows what it would change; only the button changes it.
 *
 * Until 2026-10-02 a GET applied the change. Mail filters that open every link to
 * scan it (Outlook Safe Links, Proofpoint) would then confirm a change on behalf of
 * a reader who never saw it, which defeats holding a change for the inbox at all.
 */

const DEAD_LINK =
  "This link has expired, was already used, or was replaced by a newer request for this address. Ask again from whether.work and use the newest email.";

const page = (title: string, body: string, status = 200) =>
  new Response(
    [
      "<!DOCTYPE html><html lang='en'><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'>",
      `<meta name='robots' content='noindex'><title>${escapeHtml(title)} · Whether</title></head>`,
      "<body style='font-family:sans-serif;max-width:480px;margin:40px auto;padding:20px;color:#1e293b;text-align:center;'>",
      "<main>",
      `<h1 style='font-size:1.1rem;font-weight:600;'>${escapeHtml(title)}</h1>`,
      body,
      "</main>",
      "</body></html>",
    ].join(""),
    {
      status,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        // The token is in this page's URL; nothing it links to needs to see it.
        "Referrer-Policy": "no-referrer",
      },
    },
  );

const paragraph = (text: string) => `<p style='font-size:0.95rem;color:#475569;'>${escapeHtml(text)}</p>`;

const homeLink =
  "<a href='/' style='display:inline-block;margin-top:16px;padding:8px 16px;border-radius:6px;background:#0f172a;color:#fff;text-decoration:none;font-size:0.9rem;'>Return to Whether</a>";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  if (!token) return page("Link incomplete", paragraph("This confirmation link is missing its code. Open it from the email again."), 400);

  const pending = await getSubscriberStore().getPendingConfirmation(token);
  const confirmation = pending ? describeConfirmation(pending) : null;
  if (!confirmation) return page("Link no longer works", paragraph(DEAD_LINK) + homeLink, 410);

  return page(
    confirmation.kind === "subscribe" ? "Confirm your subscription" : "Confirm a change",
    [
      paragraph(confirmationLead(confirmation)),
      "<form method='post' action='/api/email/verify'>",
      `<input type='hidden' name='token' value='${escapeHtml(token)}'>`,
      "<button type='submit' style='margin-top:8px;padding:10px 20px;border:0;border-radius:6px;background:#0f172a;color:#fff;font-weight:600;font-size:0.95rem;cursor:pointer;'>Confirm</button>",
      "</form>",
    ].join(""),
  );
}

export async function POST(request: Request) {
  let token: string | null = null;
  try {
    const value = (await request.formData()).get("token");
    token = typeof value === "string" ? value : null;
  } catch {
    token = null;
  }
  if (!token) return page("Link incomplete", paragraph("This confirmation is missing its code. Open the link from the email again."), 400);

  try {
    const confirmed = await getSubscriberStore().verifyEmail(token);
    if (!confirmed) return page("Link no longer works", paragraph(DEAD_LINK) + homeLink, 410);
    const standing = confirmed.active
      ? `This address now gets ${describeSubscription({ ...confirmed, pendingPlanLines: confirmed.planLines })}.`
      : "Nothing is sent to this address.";
    return page("Confirmed", paragraph(`${standing} Every email carries a link to unsubscribe.`) + homeLink);
  } catch {
    return page("Something went wrong", paragraph("The confirmation did not go through. Try the link again in a minute.") + homeLink, 500);
  }
}
